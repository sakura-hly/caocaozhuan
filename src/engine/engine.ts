import type { ApplyResult, BattleDef, BattleState, Command } from './types'
import type { GameData } from '../data'
import { doMove, doWait } from './move'
import { doEndTurn } from './turns'

export function initBattle(def: BattleDef, rngSeed: number): BattleState {
  const hasAlly =
    def.units.some((u) => u.faction === 'ally') ||
    def.reinforcements.some((r) => r.entries.some((e) => e.unit.faction === 'ally'))
  return {
    battleId: def.id,
    turn: 1,
    factionOrder: hasAlly ? ['player', 'ally', 'enemy'] : ['player', 'enemy'],
    factionIndex: 0,
    weather: def.weather,
    map: def.map,
    units: def.units,
    reinforcements: def.reinforcements,
    treasureCells: def.treasureCells,
    dialogues: def.dialogues,
    weatherScript: def.weatherScript,
    win: def.win,
    maxTurns: def.maxTurns,
    rngState: rngSeed,
    rewards: [],
    finished: null,
  }
}

export function apply(state: BattleState, cmd: Command, data: GameData): ApplyResult {
  if (state.finished) return { ok: false, error: { code: 'BATTLE_ENDED' } }
  switch (cmd.type) {
    case 'move': return doMove(state, cmd, data)
    case 'attack': return { ok: false, error: { code: 'CANNOT_TARGET', reason: 'attack 未实现（Task 8）' } }
    case 'cast': return { ok: false, error: { code: 'CANNOT_TARGET', reason: 'cast 未实现（Task 9）' } }
    case 'useItem': return { ok: false, error: { code: 'CANNOT_TARGET', reason: 'useItem 未实现（Task 9）' } }
    case 'wait': return doWait(state, cmd)
    case 'endTurn': return doEndTurn(state)
  }
}
