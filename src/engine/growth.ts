import type { Stats } from './types'
import type { GameData } from '../data'
import type { Draft } from './internal'
import { rngNext } from './rng'

export const LEVEL_CAP = 30
export const EXP_PER_LEVEL = 100
export const EXP_HIT = 10
export const EXP_SPELL = 12
export const EXP_HEAL = 8
export const EXP_KILL_BONUS = 20

/** 每属性成长 = floor(g/3) + 以 (g%3)/3 概率再 +1（原版随机成长风味，种子可回放）。 */
export function rollLevelUp(growth: Stats, rngState: number): { gains: Partial<Stats>; nextState: number } {
  const gains: Partial<Stats> = {}
  let s = rngState
  for (const [k, g] of Object.entries(growth) as Array<[keyof Stats, number]>) {
    const roll = rngNext(s)
    s = roll.nextState
    const gain = Math.floor(g / 3) + (roll.value < (g % 3) / 3 ? 1 : 0)
    if (gain > 0) gains[k] = gain
  }
  return { gains, nextState: s }
}

/** 经验只发给我方单位；升级循环消耗 EXP_PER_LEVEL。 */
export function awardExp(d: Draft, unitId: string, amount: number, data: GameData): void {
  const u = d.state.units.find((x) => x.id === unitId)
  if (!u || !u.alive || u.faction !== 'player' || u.level >= LEVEL_CAP) return
  u.exp += amount
  d.events.push({ type: 'expGained', unitId: u.id, amount })
  while (u.exp >= EXP_PER_LEVEL && u.level < LEVEL_CAP) {
    u.exp -= EXP_PER_LEVEL
    u.level += 1
    const { gains, nextState } = rollLevelUp(data.classes[u.classId].growth, d.state.rngState)
    d.state.rngState = nextState
    for (const [k, v] of Object.entries(gains) as Array<[keyof Stats, number]>) u.base[k] += v
    if (gains.hp) u.hp += gains.hp
    if (gains.mp) u.mp += gains.mp
    d.events.push({ type: 'levelUp', unitId: u.id, level: u.level, gains })
  }
}
