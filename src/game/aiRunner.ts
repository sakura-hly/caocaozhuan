import type { BattleState, EngineError, Faction, GameEvent } from '../engine/types'
import type { GameData } from '../data'
import { apply, decideUnitAction } from '../engine'

/**
 * 整阵营批量执行：逐单位 decideUnitAction → 逐条 apply。
 * 单位间检查 state.finished（M1 登记的终局中断修复）；单条 apply 失败记入 errors 并放弃该单位剩余指令。
 * 不发 endTurn —— 阵营推进由调用方持有。
 */
export function runFactionTurn(
  state: BattleState, faction: Faction, data: GameData,
): { state: BattleState; events: GameEvent[]; errors: EngineError[] } {
  let s = state
  const events: GameEvent[] = []
  const errors: EngineError[] = []
  for (const u of s.units) {
    if (s.finished !== null) break
    if (u.faction !== faction || !u.alive || u.acted) continue
    const cmds = decideUnitAction(s, u.id, data)
    for (const cmd of cmds) {
      if (s.finished !== null) break
      const r = apply(s, cmd, data)
      if (!r.ok) {
        errors.push(r.error)
        break // 该单位剩余指令放弃（前置失败的后续指令必然失败）
      }
      s = r.state
      events.push(...r.events)
    }
  }
  return { state: s, events, errors }
}
