import type { BattleDef, BattleState, Stats, TerrainId, Unit } from '../../src/engine/types'
import { gameData } from '../../src/data'
import { initBattle } from '../../src/engine/engine'

export { gameData }

export function mkUnit(o: Partial<Unit> & { id: string }): Unit {
  const base: Stats = o.base ?? { hp: 50, mp: 0, atk: 12, def: 8, spirit: 5, agi: 8 }
  return {
    heroId: '', name: o.id, faction: 'player', classId: 'infantry',
    level: 1, exp: 0, base, hp: o.hp ?? base.hp, mp: o.mp ?? base.mp,
    pos: o.pos ?? { x: 0, y: 0 }, equipment: {}, items: [], statuses: [],
    moved: false, acted: false, alive: true, ...o,
  }
}

export function flatMap(w = 8, h = 6, t: TerrainId = 'plain'): TerrainId[][] {
  return Array.from({ length: h }, () => Array(w).fill(t))
}

export function mkState(o: Partial<BattleState> = {}): BattleState {
  return {
    battleId: 'test', turn: 1, factionOrder: ['player', 'enemy'], factionIndex: 0,
    weather: 'sunny', map: flatMap(), units: [], reinforcements: [], treasureCells: [],
    dialogues: [], weatherScript: [], win: { kind: 'annihilate' }, maxTurns: 20,
    rngState: 42, rewards: [], finished: null, ...o,
  }
}

export function mkBattle(o: Partial<BattleDef> = {}): BattleDef {
  return {
    id: 'test', name: '测试战役', desc: '',
    map: flatMap(), units: [], reinforcements: [], treasureCells: [], dialogues: [],
    weather: 'sunny', weatherScript: [], win: { kind: 'annihilate' }, maxTurns: 20, ...o,
  }
}

export function stateFromBattle(def: BattleDef, seed = 42): BattleState {
  return initBattle(def, seed)
}
