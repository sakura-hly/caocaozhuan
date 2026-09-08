import type { ClassDef, ClassId } from '../engine/types'

const defs: ClassDef[] = [
  { id: 'lord', name: '君主', movePower: 5, minRange: 1, maxRange: 1,
    growth: { hp: 9, mp: 2, atk: 3, def: 3, spirit: 2, agi: 2 } },
  { id: 'infantry', name: '步兵', movePower: 4, minRange: 1, maxRange: 1,
    growth: { hp: 10, mp: 0, atk: 2, def: 4, spirit: 1, agi: 2 } },
  { id: 'cavalry', name: '骑兵', movePower: 7, minRange: 1, maxRange: 1,
    growth: { hp: 8, mp: 0, atk: 4, def: 2, spirit: 1, agi: 3 } },
  { id: 'archer', name: '弓兵', movePower: 5, minRange: 2, maxRange: 3,
    growth: { hp: 7, mp: 0, atk: 3, def: 1, spirit: 1, agi: 3 } },
  { id: 'strategist', name: '军师', movePower: 4, minRange: 1, maxRange: 1,
    growth: { hp: 6, mp: 6, atk: 1, def: 1, spirit: 5, agi: 2 } },
  { id: 'taoist', name: '道士', movePower: 4, minRange: 1, maxRange: 1,
    growth: { hp: 6, mp: 5, atk: 1, def: 1, spirit: 4, agi: 3 } },
]

// 相克三角：骑兵 > 弓兵 > 步兵 > 骑兵；其余 1.0
export const ADVANTAGE: ReadonlyArray<[ClassId, ClassId]> = [
  ['cavalry', 'archer'],
  ['archer', 'infantry'],
  ['infantry', 'cavalry'],
]
export const ADV_COEFF = 1.25
export const DISADV_COEFF = 0.8

export const classes: Record<ClassId, ClassDef> = Object.fromEntries(
  defs.map((d) => [d.id, d]),
) as Record<ClassId, ClassDef>
