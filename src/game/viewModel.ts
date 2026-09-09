import type { BattleState, Cell, Faction, ItemDef, StrategyDef, Unit } from '../engine/types'
import type { GameData } from '../data'
import { effectiveMove, effectiveStats, findUnit, hostile } from '../engine/internal'
import { attackRangeCells, computeMoveRange, inRange } from '../engine/movement'
import { castableInWeather } from '../engine/spells'

export interface UnitView { unit: Unit; maxHp: number; maxMp: number; actionable: boolean }
export interface BattleViewModel {
  turn: number
  weather: BattleState['weather']
  currentFaction: Faction
  finished: BattleState['finished']
  units: UnitView[]
}

export function buildViewModel(state: BattleState, data: GameData): BattleViewModel {
  const current = state.factionOrder[state.factionIndex]!
  return {
    turn: state.turn,
    weather: state.weather,
    currentFaction: current,
    finished: state.finished,
    units: state.units.map((unit) => {
      const eff = effectiveStats(unit, data)
      return {
        unit,
        maxHp: eff.hp,
        maxMp: eff.mp,
        actionable: unit.alive && !unit.acted && unit.faction === current,
      }
    }),
  }
}

/** 可移动格（含原地）。已移动/已行动/不存在 → 空数组（UI 据此灰化）。 */
export function moveRangeCells(state: BattleState, unitId: string, data: GameData): Cell[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.moved || u.acted) return []
  const range = computeMoveRange(state.map, state.units, u, data.terrains, effectiveMove(u, data))
  return [...range.cells.values()].map((c) => ({ x: c.x, y: c.y }))
}

/** 从当前站位可直接物理攻击的敌方单位 id。 */
export function attackTargets(state: BattleState, unitId: string, data: GameData): string[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  const cls = data.classes[u.classId]
  return state.units
    .filter((t) => t.alive && hostile(u.faction, t.faction) && inRange(u.pos, t.pos, cls.minRange, cls.maxRange))
    .map((t) => t.id)
}

/** 当前可施放的全体法术（职业/天气/MP 三重过滤）。 */
export function castableStrategies(state: BattleState, unitId: string, data: GameData): StrategyDef[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  return Object.values(data.strategies).filter(
    (s) => s.allowedClasses.includes(u.classId) && castableInWeather(s, state.weather) && u.mp >= s.mpCost,
  )
}

/** 施法候选格：射程圆盘；治疗/增益另含自身格。 */
export function spellTargetCells(state: BattleState, unitId: string, strategyId: string, data: GameData): Cell[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  const s = data.strategies[strategyId]
  if (!s) return []
  const h = state.map.length, w = state.map[0]?.length ?? 0
  const cells = attackRangeCells(u.pos, 1, s.range, w, h).map((c) => ({ x: c.x, y: c.y }))
  if (s.kind === 'heal' || s.kind === 'buff') cells.unshift({ x: u.pos.x, y: u.pos.y })
  return cells
}

/** 持有的可用道具（消耗品）。 */
export function usableItems(unit: Unit, data: GameData): ItemDef[] {
  return unit.items
    .map((id) => data.items[id])
    .filter((it): it is ItemDef => !!it && it.kind === 'consumable')
}
