import { describe, it, expect } from 'vitest'
import { heroes } from '../../src/data/heroes'
import { items } from '../../src/data/items'
import { gameData } from '../../src/data'
import type { ClassId } from '../../src/engine/types'

const VALID_CLASSES: ClassId[] = ['lord', 'infantry', 'cavalry', 'archer', 'strategist', 'taoist']

describe('武将数据', () => {
  it('18 名武将，id 唯一，属性为正', () => {
    expect(Object.keys(heroes).length).toBe(18)
    expect(new Set(Object.keys(heroes)).size).toBe(18)
    for (const h of Object.values(heroes)) {
      expect(VALID_CLASSES).toContain(h.classId)
      for (const [k, v] of Object.entries(h.base)) {
        if (k === 'mp') expect(v).toBeGreaterThanOrEqual(0) // 物理系武将无 MP，0 合法（勘误：计划原断言与数据矛盾）
        else expect(v).toBeGreaterThan(0)
      }
    }
  })
  it('君主为曹操与刘备（刘备暂不入玩家 roster）', () => {
    const lords = Object.values(heroes).filter((h) => h.classId === 'lord')
    expect(lords.map((h) => h.id).sort()).toEqual(['caocao', 'liubei'])
  })
})

describe('道具数据', () => {
  it('17 件道具，id 唯一，数值为正，兵种合法', () => {
    expect(Object.keys(items).length).toBe(17)
    for (const it of Object.values(items)) {
      for (const v of Object.values(it.bonuses ?? {})) expect(v as number).toBeGreaterThan(0)
      for (const c of it.allowedClasses ?? []) expect(VALID_CLASSES).toContain(c)
      if (it.kind === 'consumable') expect(it.healHp || it.healMp).toBeTruthy()
    }
  })
  it('gameData 注册表完整', () => {
    expect(Object.keys(gameData.heroes).length).toBe(18)
    expect(Object.keys(gameData.items).length).toBe(17)
  })
})

describe('M3 新增武将与道具', () => {
  it('刘关张/华雄/吕布 登记且兵种合法', () => {
    const expectHero = (id: string, classId: ClassId) => {
      const h = heroes[id]
      expect(h, id).toBeDefined()
      expect(h.classId).toBe(classId)
    }
    expectHero('liubei', 'lord')
    expectHero('guanyu', 'cavalry')
    expectHero('zhangfei', 'cavalry')
    expectHero('huaxiong', 'cavalry')
    expectHero('lvbu', 'cavalry')
  })
  it('全体武将头像色相互不重复', () => {
    const hues = Object.values(heroes).map((h) => h.portraitHue)
    expect(new Set(hues).size).toBe(hues.length)
  })
  it('方天画戟：weapon、atk 加成、限骑兵/君主', () => {
    const it = items['fangtian_ji']
    expect(it).toBeDefined()
    expect(it.kind).toBe('weapon')
    expect(it.bonuses?.atk).toBeGreaterThan(0)
    expect(it.allowedClasses).toEqual(['cavalry', 'lord'])
  })
})
