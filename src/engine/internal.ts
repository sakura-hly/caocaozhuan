import type { ApplyResult, BattleState, Cell, EngineError, Faction, GameEvent, StatKey, Stats, Unit } from './types'
import type { GameData } from '../data'
import { rngNext } from './rng'
import { evaluate } from './wincheck'

/** 一次指令的工作草稿：克隆状态 + 事件累积 + 可回放随机数。 */
export interface Draft {
  state: BattleState
  events: GameEvent[]
  draw(): number // [0,1)，同时推进 state.rngState
}

export function begin(state: BattleState): Draft {
  const s = structuredClone(state)
  const events: GameEvent[] = []
  return {
    state: s,
    events,
    draw() {
      const r = rngNext(s.rngState)
      s.rngState = r.nextState
      return r.value
    },
  }
}

export function findUnit(s: BattleState, id: string): Unit | undefined {
  return s.units.find((u) => u.id === id)
}

export function unitAt(s: BattleState, c: Cell): Unit | undefined {
  return s.units.find((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y)
}

/** player 与 ally 互为友军，enemy 与两者敌对。 */
export function hostile(a: Faction, b: Faction): boolean {
  if (a === b) return false
  return a === 'enemy' || b === 'enemy'
}

/** 裸属性 + 装备加成 + 状态修正（破甲）。 */
export function effectiveStats(u: Unit, data: GameData): Stats {
  const s: Stats = { ...u.base }
  for (const id of Object.values(u.equipment)) {
    const item = id !== undefined ? data.items[id] : undefined
    if (!item?.bonuses) continue
    for (const [k, v] of Object.entries(item.bonuses)) {
      if (k !== 'move' && v !== undefined) s[k as StatKey] += v
    }
  }
  if (u.statuses.some((st) => st.kind === 'defdown')) s.def = Math.floor(s.def * 0.7)
  return s
}

/** 兵种移动力 + 装备（的卢/赤兔）+ 疾风状态。 */
export function effectiveMove(u: Unit, data: GameData): number {
  let move = data.classes[u.classId].movePower
  for (const id of Object.values(u.equipment)) {
    const item = id !== undefined ? data.items[id] : undefined
    if (item?.bonuses?.move) move += item.bonuses.move
  }
  if (u.statuses.some((st) => st.kind === 'speedup')) move += 2
  return move
}

/** 单位行动权校验：存在→存活→本阵营回合→未行动。 */
export function ensureActable(s: BattleState, unitId: string): EngineError | null {
  const u = findUnit(s, unitId)
  if (!u) return { code: 'UNIT_NOT_FOUND', unitId }
  if (!u.alive) return { code: 'UNIT_DEAD', unitId }
  const cur = s.factionOrder[s.factionIndex]
  if (u.faction !== cur) return { code: 'NOT_YOUR_TURN', unitId, faction: cur }
  if (u.acted) return { code: 'UNIT_ALREADY_ACTED', unitId }
  return null
}

export function killUnit(d: Draft, u: Unit, byUnitId?: string): void {
  u.alive = false
  u.hp = 0
  d.events.push({ type: 'unitDied', unitId: u.id, byUnitId })
  for (const trig of d.state.dialogues) {
    if (trig.onDeathOf === u.id) d.events.push({ type: 'dialogueTriggered', dialogueId: trig.dialogueId })
  }
}

/** 每次指令收尾：评估胜负并落 finished。 */
export function finish(d: Draft): ApplyResult {
  const v = evaluate(d.state)
  if (v.won && !v.lost) {
    d.state.finished = 'won'
    d.events.push({ type: 'battleWon' })
  } else if (v.lost) {
    d.state.finished = 'lost'
    d.events.push({ type: 'battleLost' })
  }
  return { ok: true, state: d.state, events: d.events }
}
