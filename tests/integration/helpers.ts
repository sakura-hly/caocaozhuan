import type { BattleDef, BattleState } from '../../src/engine/types'
import { apply } from '../../src/engine'
import { gameData } from '../../src/data'
import { initBattle } from '../../src/engine'
import { runFactionTurn } from '../../src/game/aiRunner'

const factionOf = (s: BattleState) => s.factionOrder[s.factionIndex]

/** 指定战役定义的全 AI 自动对局（campaign 集成测试用）。 */
export function autoPlayDef(def: BattleDef, seed: number): { errors: string[]; finished: BattleState['finished']; turn: number; state: BattleState } {
  let s = initBattle(def, seed)
  const errors: string[] = []
  for (let guard = 0; guard < 500 && s.finished === null; guard++) {
    const f = factionOf(s)
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
