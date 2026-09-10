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
      expect(r1.campaign.inventory).toEqual(['iron_armor', 'iron_sword']) // 移除青釭剑、旧铁剑 push 到末尾
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
    if (r.ok) expect(r.campaign.inventory).toEqual(['jinchuang_yao', 'jinchuang_yao', 'huanshen_dan', 'iron_sword'])
  })
  it('assign/unassign 仅限消耗品', () => {
    let c = newGame()
    const r1 = assignItem(c, 'xunyu', 'huanshen_dan', gameData)
    expect(r1.ok).toBe(true)
    if (r1.ok) {
      expect(r1.campaign.roster.find((m) => m.heroId === 'xunyu')!.items).toContain('huanshen_dan')
      expect(r1.campaign.inventory).toEqual(['jinchuang_yao', 'jinchuang_yao'])
      const r2 = unassignItem(r1.campaign, 'xunyu', 'huanshen_dan', gameData)
      expect(r2.ok && r2.campaign.inventory).toEqual(['jinchuang_yao', 'jinchuang_yao', 'huanshen_dan'])
    }
    const bad = assignItem(c, 'xunyu', 'iron_sword', gameData) // 非消耗品
    expect(bad).toMatchObject({ ok: false })
  })
  it('unassign 同名消耗品只取回一份（数量守恒）', () => {
    const base = newGame()
    const c0 = { ...base, roster: base.roster.map((m) => (m.heroId === 'xunyu' ? { ...m, items: [] } : m)) }
    const r1 = assignItem(c0, 'xunyu', 'jinchuang_yao', gameData)
    const r2 = r1.ok ? assignItem(r1.campaign, 'xunyu', 'jinchuang_yao', gameData) : r1
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.campaign.inventory).toEqual(['huanshen_dan']) // 仓库两瓶全部分配出去
    expect(r2.campaign.roster.find((m) => m.heroId === 'xunyu')!.items).toEqual(['jinchuang_yao', 'jinchuang_yao'])
    const back = unassignItem(r2.campaign, 'xunyu', 'jinchuang_yao', gameData)
    expect(back.ok).toBe(true)
    if (back.ok) {
      expect(back.campaign.roster.find((m) => m.heroId === 'xunyu')!.items).toEqual(['jinchuang_yao'])
      expect(back.campaign.inventory).toEqual(['huanshen_dan', 'jinchuang_yao']) // 恰好回来一瓶
    }
  })
  it('错误分支收口：未知物品/未知武将/不在名册/空槽位/不在仓库/未携带', () => {
    const c = newGame()
    const emptyInv = { ...newGame(), inventory: [] }
    expect(equipItem(c, 'caocao', 'weapon', 'nope', gameData)).toMatchObject({ ok: false }) // 未知物品
    expect(equipItem(c, 'nope', 'weapon', 'iron_sword', gameData)).toMatchObject({ ok: false }) // 未知武将
    expect(equipItem(c, 'huaxiong', 'weapon', 'iron_sword', gameData)).toMatchObject({ ok: false }) // 武将不在名册
    expect(unequipItem(c, 'caocao', 'accessory', gameData)).toMatchObject({ ok: false }) // 空槽位
    expect(unequipItem(c, 'huaxiong', 'weapon', gameData)).toMatchObject({ ok: false }) // 不在名册
    expect(assignItem(emptyInv, 'xunyu', 'jinchuang_yao', gameData)).toMatchObject({ ok: false }) // 不在仓库
    expect(assignItem(c, 'huaxiong', 'jinchuang_yao', gameData)).toMatchObject({ ok: false }) // 不在名册
    expect(unassignItem(c, 'xunyu', 'huanshen_dan', gameData)).toMatchObject({ ok: false }) // 未携带
    expect(unassignItem(c, 'huaxiong', 'jinchuang_yao', gameData)).toMatchObject({ ok: false }) // 不在名册
  })
})
