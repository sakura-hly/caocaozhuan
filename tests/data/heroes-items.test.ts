import { describe, it, expect } from 'vitest'
import { heroes } from '../../src/data/heroes'
import { items } from '../../src/data/items'
import { gameData } from '../../src/data'
import type { ClassId } from '../../src/engine/types'

const VALID_CLASSES: ClassId[] = ['lord', 'infantry', 'cavalry', 'archer', 'strategist', 'taoist']

describe('武将数据', () => {
  it('13 名武将，id 唯一，属性为正', () => {
    expect(Object.keys(heroes).length).toBe(13)
    expect(new Set(Object.keys(heroes)).size).toBe(13)
    for (const h of Object.values(heroes)) {
      expect(VALID_CLASSES).toContain(h.classId)
      for (const [k, v] of Object.entries(h.base)) {
        if (k === 'mp') expect(v).toBeGreaterThanOrEqual(0) // 物理系武将无 MP，0 合法（勘误：计划原断言与数据矛盾）
        else expect(v).toBeGreaterThan(0)
      }
    }
  })
  it('含且仅含一名君主（曹操）', () => {
    const lords = Object.values(heroes).filter((h) => h.classId === 'lord')
    expect(lords.map((h) => h.id)).toEqual(['caocao'])
  })
})

describe('道具数据', () => {
  it('16 件道具，id 唯一，数值为正，兵种合法', () => {
    expect(Object.keys(items).length).toBe(16)
    for (const it of Object.values(items)) {
      for (const v of Object.values(it.bonuses ?? {})) expect(v as number).toBeGreaterThan(0)
      for (const c of it.allowedClasses ?? []) expect(VALID_CLASSES).toContain(c)
      if (it.kind === 'consumable') expect(it.healHp || it.healMp).toBeTruthy()
    }
  })
  it('gameData 注册表完整', () => {
    expect(Object.keys(gameData.heroes).length).toBe(13)
    expect(Object.keys(gameData.items).length).toBe(16)
  })
})
