import type { BattleDef, BattleState } from '../../src/engine/types'
import { apply } from '../../src/engine'
import { gameData } from '../../src/data'
import { initBattle } from '../../src/engine'
import { runFactionTurn } from '../../src/game/aiRunner'
import { effectiveMove } from '../../src/engine/internal'
import { computeMoveRange, manhattan } from '../../src/engine/movement'

const factionOf = (s: BattleState) => s.factionOrder[s.factionIndex]

/**
 * reach 胜利关护送：通用 AI 只扑最近敌人，绝不会护送 win.unitId 前往目标格，reach 关自动对局必超时——
 * 这是测试助手缺 reach 意识，不是数据 bug。目标单位所属阵营回合开始时先手操其走向目标格
 * （可停留格中曼哈顿距离最小者，并列任取），move+wait 后照常 runFactionTurn（自动跳过已行动单位，队友照旧 AI 断后）。
 */
function escortReachUnit(def: BattleDef, s: BattleState, errors: string[]): BattleState {
  if (def.win.kind !== 'reach') return s
  const win = def.win // 取窄化引用（闭包内属性窄化会失效）
  const u = s.units.find((x) => x.id === win.unitId)
  if (!u || !u.alive || u.acted || u.faction !== factionOf(s)) return s
  const goal = win.cell
  const range = computeMoveRange(s.map, s.units, u, gameData.terrains, effectiveMove(u, gameData))
  let best = u.pos
  let bestDist = manhattan(u.pos, goal)
  for (const cell of range.cells.values()) {
    const d = manhattan(cell, goal)
    if (d < bestDist) { bestDist = d; best = cell }
  }
  if (best.x !== u.pos.x || best.y !== u.pos.y) {
    const r = apply(s, { type: 'move', unitId: u.id, to: { x: best.x, y: best.y } }, gameData)
    if (!r.ok) { errors.push(`t${s.turn} ${u.faction}: escort ${JSON.stringify(r.error)}`); return s }
    s = r.state
  }
  if (s.finished === null) { // 抵达目标格时 move 已判胜终局，不可再发 wait（BATTLE_ENDED）
    const w = apply(s, { type: 'wait', unitId: u.id }, gameData)
    if (!w.ok) { errors.push(`t${s.turn} ${u.faction}: escort ${JSON.stringify(w.error)}`); return s }
    s = w.state
  }
  return s
}

/** 指定战役定义的全 AI 自动对局（campaign 集成测试用）。 */
export function autoPlayDef(def: BattleDef, seed: number): { errors: string[]; finished: BattleState['finished']; turn: number; state: BattleState } {
  let s = initBattle(def, seed)
  const errors: string[] = []
  for (let guard = 0; guard < 500 && s.finished === null; guard++) {
    const f = factionOf(s)
    s = escortReachUnit(def, s, errors)
    const r = runFactionTurn(s, f, gameData)
    s = r.state
    for (const e of r.errors) errors.push(`t${s.turn} ${f}: ${JSON.stringify(e)}`)
    if (s.finished === null) {
      const r = apply(s, { type: 'endTurn' }, gameData)
      if (!r.ok) { errors.push(`endTurn: ${JSON.stringify(r.error)}`); break }
      s = r.state
    }
  }
  return { errors, finished: s.finished, turn: s.turn, state: s }
}
