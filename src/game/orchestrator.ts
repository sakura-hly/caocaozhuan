import type { BattleState, Cell, Command, EngineError, Faction, GameEvent } from '../engine/types'
import type { GameData } from '../data'
import { gameData } from '../data'
import { apply, initBattle } from '../engine'
import { battles, battleOpeners } from '../data/battles'
import { runFactionTurn } from './aiRunner'

export type Intent =
  | { type: 'selectUnit'; unitId: string }
  /** 清除选中即提交未确认的移动（preMove 丢弃）——点空地视为确认 */
  | { type: 'deselect' }
  | { type: 'moveTo'; to: Cell }
  | { type: 'undoMove' }
  | { type: 'attack'; targetId: string }
  | { type: 'cast'; strategyId: string; target: Cell }
  /** 道具仅对自身使用（targetId 固定为选中单位） */
  | { type: 'useItem'; itemId: string }
  | { type: 'wait' }
  | { type: 'endTurn' }

export interface UiState { selectedUnitId: string | null; canUndo: boolean; dialogueQueue: string[] }
export interface OrchestratorCallbacks {
  onState: (state: BattleState, ui: UiState) => void
  onEvents: (events: GameEvent[]) => void
  onError: (error: EngineError) => void
}

/**
 * UI 意图 → 引擎指令的唯一翻译层。不持有动画 busy（画面职责）。
 * 回调内禁止同步 dispatch（重入会双重推进状态）。
 */
export class BattleOrchestrator {
  private st: BattleState
  private ui: UiState = { selectedUnitId: null, canUndo: false, dialogueQueue: [] }
  private preMove: BattleState | null = null

  constructor(battleId: string, seed: number, private cb: OrchestratorCallbacks, private data: GameData = gameData) {
    const def = battles[battleId]
    if (!def) throw new Error(`未知战役: ${battleId}`)
    this.st = initBattle(def, seed)
    const opener = battleOpeners[battleId]
    if (opener) this.ui.dialogueQueue.push(opener)
    this.emit([{ type: 'battleStarted', battleId }]) // 合成事件（M1 登记项：引擎 initBattle 不发此事件）
  }

  get state(): BattleState { return this.st }
  get uiState(): UiState { return this.uiSnapshot() }

  /** 出站快照：每层浅拷贝，防下游持有引用后 Object.is 判同失效（Vue 响应式依赖引用变化）。 */
  private uiSnapshot(): UiState {
    return { ...this.ui, dialogueQueue: [...this.ui.dialogueQueue] }
  }

  private currentFaction(): Faction {
    return this.st.factionOrder[this.st.factionIndex]
  }

  dispatch(intent: Intent): void {
    if (this.st.finished !== null) {
      this.cb.onError({ code: 'BATTLE_ENDED' })
      return
    }
    switch (intent.type) {
      case 'selectUnit': return this.selectUnit(intent.unitId)
      case 'deselect': return this.clearSelection()
      case 'moveTo': return this.moveTo(intent.to)
      case 'undoMove': return this.undoMove()
      case 'attack': return this.unitAction({ type: 'attack', unitId: this.requireSelected(), targetId: intent.targetId })
      case 'cast': return this.unitAction({ type: 'cast', unitId: this.requireSelected(), strategyId: intent.strategyId, target: intent.target })
      case 'useItem': {
        const unitId = this.requireSelected()
        return this.unitAction({ type: 'useItem', unitId, itemId: intent.itemId, targetId: unitId })
      }
      case 'wait': return this.unitAction({ type: 'wait', unitId: this.requireSelected() })
      case 'endTurn': return this.endTurn()
      default: {
        const _exhaustive: never = intent // 新增 Intent 变体必须在此路由，否则编译期报错
        return _exhaustive
      }
    }
  }

  /** 对话确认：出队一条并广播 UiState。 */
  acknowledgeDialogue(): void {
    this.ui.dialogueQueue.shift()
    this.cb.onState(this.st, this.uiSnapshot())
  }

  private selectUnit(unitId: string): void {
    const u = this.st.units.find((x) => x.id === unitId)
    if (!u || !u.alive || u.faction !== 'player' || this.currentFaction() !== 'player' || u.acted) {
      this.cb.onError({ code: 'CANNOT_TARGET', reason: `不可选中: ${unitId}` })
      return
    }
    this.ui.selectedUnitId = unitId
    this.preMove = null
    this.ui.canUndo = false
    this.cb.onState(this.st, this.uiSnapshot())
  }

  private clearSelection(): void {
    this.ui.selectedUnitId = null
    this.preMove = null
    this.ui.canUndo = false
    this.cb.onState(this.st, this.uiSnapshot())
  }

  private requireSelected(): string {
    return this.ui.selectedUnitId ?? ''
  }

  private moveTo(to: Cell): void {
    const unitId = this.requireSelected()
    if (!unitId) return this.cb.onError({ code: 'CANNOT_TARGET', reason: '未选中单位' })
    const r = apply(this.st, { type: 'move', unitId, to }, this.data)
    if (!r.ok) return this.cb.onError(r.error)
    this.preMove = this.st // 引擎状态不可变，旧引用即移动前快照
    this.st = r.state
    this.ui.canUndo = true
    this.emit(r.events)
  }

  private undoMove(): void {
    if (!this.preMove || !this.ui.canUndo) return
    this.st = this.preMove
    this.preMove = null
    this.ui.canUndo = false
    this.cb.onState(this.st, this.uiSnapshot())
  }

  /** 攻击/施法/道具/待机：成功即清选中（单位已 acted）。 */
  private unitAction(cmd: Exclude<Command, { type: 'endTurn' }>): void {
    if (!cmd.unitId) return this.cb.onError({ code: 'CANNOT_TARGET', reason: '未选中单位' })
    const r = apply(this.st, cmd, this.data)
    if (!r.ok) return this.cb.onError(r.error)
    this.st = r.state
    this.clearSelectionSilently() // 静默清选中，与 emit 合并为单次 onState
    this.emit(r.events)
  }

  private endTurn(): void {
    this.clearSelectionSilently()
    if (!this.applyCmd({ type: 'endTurn' })) { this.cb.onState(this.st, this.uiSnapshot()); return }
    // 非玩家阵营依次整批执行，直到回到玩家或终局
    while (this.st.finished === null && this.currentFaction() !== 'player') {
      const ai = runFactionTurn(this.st, this.currentFaction(), this.data)
      this.st = ai.state
      this.collectDialogues(ai.events)
      this.cb.onEvents(ai.events)
      for (const e of ai.errors) this.cb.onError(e)
      if (this.st.finished !== null) break
      if (!this.applyCmd({ type: 'endTurn' })) { this.cb.onState(this.st, this.uiSnapshot()); return }
    }
    this.cb.onState(this.st, this.uiSnapshot())
  }

  private applyCmd(cmd: Command): boolean {
    const r = apply(this.st, cmd, this.data)
    if (!r.ok) { this.cb.onError(r.error); return false }
    this.st = r.state
    this.collectDialogues(r.events)
    this.cb.onEvents(r.events)
    return true
  }

  private collectDialogues(events: GameEvent[]): void {
    for (const e of events)
      if (e.type === 'dialogueTriggered') this.ui.dialogueQueue.push(e.dialogueId)
  }

  private clearSelectionSilently(): void {
    this.ui.selectedUnitId = null
    this.preMove = null
    this.ui.canUndo = false
  }

  private emit(events: GameEvent[]): void {
    this.collectDialogues(events)
    this.cb.onEvents(events)
    this.cb.onState(this.st, this.uiSnapshot())
  }
}
