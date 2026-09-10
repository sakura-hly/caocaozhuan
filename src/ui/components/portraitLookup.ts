import type { HeroDef } from '../../engine/types'
import { gameData } from '../../data'

/** 说话人 → 武将定义（查不到给通用兜底：默认兵种、固定色相）。 */
export function heroOf(speaker: string): HeroDef {
  const found = Object.values(gameData.heroes).find((h) => h.name === speaker)
  if (found) return found
  return { id: `npc:${speaker}`, name: speaker, classId: 'infantry', portraitHue: 210 } as unknown as HeroDef
}
