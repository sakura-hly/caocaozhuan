import type { ApplyResult, BattleState, Command } from './types'
import type { GameData } from '../data'
import { begin, effectiveMove, ensureActable, findUnit, finish } from './internal'
import { cellKey, computeMoveRange, pathTo } from './movement'

export function doMove(state: BattleState, cmd: Extract<Command, { type: 'move' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const actor = findUnit(state, cmd.unitId)!
  if (actor.moved) return { ok: false, error: { code: 'UNIT_ALREADY_ACTED', unitId: cmd.unitId } }
  const d = begin(state)
  const du = findUnit(d.state, cmd.unitId)!
  const r = computeMoveRange(d.state.map, d.state.units, du, data.terrains, effectiveMove(du, data))
  if (!r.cells.has(cellKey(cmd.to))) return { ok: false, error: { code: 'OUT_OF_MOVE_RANGE', unitId: cmd.unitId } }
  const path = pathTo(r.prev, du.pos, cmd.to)
  du.pos = { ...cmd.to }
  du.moved = true
  d.events.push({ type: 'unitMoved', unitId: du.id, path })
  for (const t of d.state.treasureCells) {
    if (!t.found && t.cell.x === cmd.to.x && t.cell.y === cmd.to.y) {
      t.found = true
      d.state.rewards.push(t.itemId)
      d.events.push({ type: 'treasureFound', unitId: du.id, itemId: t.itemId })
    }
  }
  return finish(d)
}

export function doWait(state: BattleState, cmd: Extract<Command, { type: 'wait' }>): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const d = begin(state)
  const du = findUnit(d.state, cmd.unitId)!
  du.acted = true
  du.moved = true
  return finish(d)
}
