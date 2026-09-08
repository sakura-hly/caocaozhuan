import type { ClassId, Weather } from './types'
import { ADVANTAGE, ADV_COEFF, DISADV_COEFF } from '../data/classes'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 兵种相克系数：克 1.25 / 被克 0.8 / 无关 1.0 */
export function affinity(a: ClassId, d: ClassId): number {
  if (ADVANTAGE.some(([x, y]) => x === a && y === d)) return ADV_COEFF
  if (ADVANTAGE.some(([x, y]) => x === d && y === a)) return DISADV_COEFF
  return 1
}

export interface PhysicalArgs {
  atk: number
  def: number
  attackerClass: ClassId
  defenderClass: ClassId
  terrainDefBonus: number // 防守方所站地形加成 %
  roll: number // [0.9, 1.1)
}

export function physicalDamage(a: PhysicalArgs): number {
  const raw = (a.atk - a.def * 0.6) * affinity(a.attackerClass, a.defenderClass)
    * (1 - a.terrainDefBonus / 100) * a.roll
  return Math.max(1, Math.round(raw))
}

export function hitChance(attackerAgi: number, defenderAgi: number): number {
  return clamp(90 + (attackerAgi - defenderAgi), 50, 100)
}

export function critChance(attackerAgi: number, defenderAgi: number): number {
  return clamp(5 + (attackerAgi - defenderAgi) * 0.5, 0, 40)
}

export function comboChance(attackerAgi: number, defenderAgi: number): number {
  return clamp((attackerAgi - defenderAgi) * 1.5, 0, 30)
}

export interface SpellArgs {
  power: number
  casterSpirit: number
  targetSpirit: number
  weather: Weather
  element: 'fire' | 'water' | 'earth'
  targetOnMountain?: boolean
}

export function spellDamage(a: SpellArgs): number {
  let coeff = 1
  if (a.element === 'water' && a.weather === 'rainy') coeff = 1.5
  if (a.element === 'earth' && a.targetOnMountain) coeff = 1.3
  const raw = (a.power + a.casterSpirit * 0.8 - a.targetSpirit * 0.4) * coeff
  return Math.max(1, Math.round(raw))
}

export function healAmount(power: number, casterSpirit: number): number {
  return power + casterSpirit
}
