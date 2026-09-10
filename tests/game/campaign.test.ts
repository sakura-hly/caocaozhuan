import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import {
  CAMPAIGN_BATTLES, newGame, currentBattleId,
  equipItem, unequipItem, assignItem, unassignItem,
} from '../../src/game/campaign'

describe('newGame / 进度查询', () => {
  it('初始 roster 来自第一场战役的我方武将（含模板装备）', () => {
    const c = newGame()
    expect(c.version).toBe(1)
    expect(c.progress).toBe(0)
    expect(c.roster.map((m) => m.heroId)).toEqual(['caocao', 'xiaohoudun', 'xiahouyuan', 'caoren', 'xunyu'])
    const cc = c.roster.find((m) => m.heroId === 'caocao')!
    expect(cc.equipment.weapon).toBe('iron_sword')
    expect(cc.items).toEqual(['jinchuang_yao'])
    expect(currentBattleId(c)).toBe('yingchuan')
  })
  it('progress 走满即通关（currentBattleId = null）', () => {
    expect(currentBattleId({ ...newGame(), progress: CAMPAIGN_BATTLES.length })).toBeNull()
  })
  it('初始仓库有可用消耗品', () => {
    expect(newGame().inventory).toEqual(['jinchuang_yao', 'jinchuang_yao', 'huanshen_dan'])
  })
})

describe('装备/携带操作（纯函数、不可变）', () => {
  it('equip：仓库→槽位；旧装备回仓库；兵种不符/槽位不符/不在仓库均报错', () => {
    let c = newGame()
    c = { ...c, inventory: ['qinggang_sword', 'iron_armor'] } // 构造仓库
    // 曹操(lord)装青釭剑：合法，旧铁剑回仓库
    const r1 = equipItem(c, 'caocao', 'weapon', 'qinggang_sword', gameData)
    expect(r1.ok).toBe(true)
    if (r1.ok) {
      expect(r1.campaign.roster.find((m) => m.heroId === 'caocao')!.equipment.weapon).toBe('qinggang_sword')
      expect(r1.campaign.inventory).toContain('iron_sword')
      expect(r1.campaign.inventory).not.toContain('qinggang_sword')
      expect(c.roster.find((m) => m.heroId === 'caocao')!.equipment.weapon).toBe('iron_sword') // 原状态未被改
    }
    // 夏侯惇(cavalry)装青釭剑：兵种不符
    const r2 = equipItem(c, 'xiaohoudun', 'weapon', 'qinggang_sword', gameData)
    expect(r2).toMatchObject({ ok: false })
    // 装备塞错槽位
    const r3 = equipItem(c, 'caocao', 'armor', 'qinggang_sword', gameData)
    expect(r3).toMatchObject({ ok: false })
    // 不在仓库
    const r4 = equipItem(c, 'caocao', 'weapon', 'fangtian_ji', gameData)
    expect(r4).toMatchObject({ ok: false })
  })
  it('unequip：槽位→仓库', () => {
    const c = newGame()
    const r = unequipItem(c, 'caocao', 'weapon', gameData)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.campaign.inventory).toContain('iron_sword')
  })
  it('assign/unassign 仅限消耗品', () => {
    let c = newGame()
    const r1 = assignItem(c, 'xunyu', 'huanshen_dan', gameData)
    expect(r1.ok).toBe(true)
    if (r1.ok) {
      expect(r1.campaign.roster.find((m) => m.heroId === 'xunyu')!.items).toContain('huanshen_dan')
      const r2 = unassignItem(r1.campaign, 'xunyu', 'huanshen_dan', gameData)
      expect(r2.ok && r2.campaign.inventory).toContain('huanshen_dan')
    }
    const bad = assignItem(c, 'xunyu', 'iron_sword', gameData) // 非消耗品
    expect(bad).toMatchObject({ ok: false })
  })
})
