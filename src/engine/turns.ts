import type { ApplyResult, BattleState, Faction } from './types'
import { begin, finish, type Draft } from './internal'

export function doEndTurn(state: BattleState): ApplyResult {
  const d = begin(state)
  const cur = d.state.factionOrder[d.state.factionIndex]
  d.events.push({ type: 'turnEnded', faction: cur, turn: d.state.turn })
  advanceFaction(d)
  return finish(d)
}

function advanceFaction(d: Draft): void {
  const order = d.state.factionOrder
  let idx = d.state.factionIndex
  for (let i = 0; i < order.length; i++) {
    idx = (idx + 1) % order.length
    const f = order[idx]
    if (d.state.units.some((u) => u.faction === f && u.alive)) {
      d.state.factionIndex = idx
      startFactionTurn(d, f)
      return
    }
  }
}

function startFactionTurn(d: Draft, f: Faction): void {
  d.events.push({ type: 'turnStarted', faction: f, turn: d.state.turn })
  for (const u of d.state.units) {
    if (u.faction !== f || !u.alive) continue
    u.moved = false
    u.acted = false
    if (u.statuses.some((st) => st.kind === 'stun')) u.acted = true // 眩晕：跳过本回合
    u.statuses = u.statuses.map((st) => ({ ...st, turns: st.turns - 1 })).filter((st) => st.turns > 0)
  }
}
