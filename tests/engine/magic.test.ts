import { describe, it, expect } from 'vitest'
import { apply } from '../../src/engine/engine'
import { gameData, mkState, mkUnit } from './helpers'

function castState() {
  return mkState({
    units: [
      mkUnit({ id: 's1', classId: 'strategist', pos: { x: 2, y: 2 }, base: { hp: 40, mp: 30, atk: 5, def: 5, spirit: 20, agi: 8 }, mp: 30 }),
      mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 4, y: 2 }, base: { hp: 60, mp: 0, atk: 10, def: 8, spirit: 5, agi: 8 } }),
    ],
  })
}

describe('cast 指令', () => {
  it('火矢：扣 MP、掉血、spellCast/hpChanged/expGained 事件、acted 置位', () => {
    const r = apply(castState(), { type: 'cast', unitId: 's1', strategyId: 'huoshi', target: { x: 4, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const s1 = r.state.units.find((u) => u.id === 's1')!
    const e1 = r.state.units.find((u) => u.id === 'e1')!
    expect(s1.mp).toBe(30 - 6)
    expect(e1.hp).toBeLessThan(60)
    expect(s1.acted).toBe(true)
    expect(r.events.some((ev) => ev.type === 'spellCast')).toBe(true)
    expect(r.events.some((ev) => ev.type === 'expGained' && ev.unitId === 's1')).toBe(true)
  })

  it('雨天火系 → SPELL_UNUSABLE_IN_WEATHER', () => {
    const s = { ...castState(), weather: 'rainy' as const }
    const r = apply(s, { type: 'cast', unitId: 's1', strategyId: 'huoshi', target: { x: 4, y: 2 } }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'SPELL_UNUSABLE_IN_WEATHER', weather: 'rainy' } })
  })

  it('非施法兵种 → CLASS_CANNOT_CAST；MP 不足 → NOT_ENOUGH_MP', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'w1', classId: 'infantry', pos: { x: 2, y: 2 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 } }),
      ],
    })
    const r1 = apply(s, { type: 'cast', unitId: 'w1', strategyId: 'huoshi', target: { x: 3, y: 2 } }, gameData)
    expect(r1).toEqual({ ok: false, error: { code: 'CLASS_CANNOT_CAST', classId: 'infantry' } })
    const s2 = castState()
    s2.units[0].mp = 3
    const r2 = apply(s2, { type: 'cast', unitId: 's1', strategyId: 'huoshi', target: { x: 4, y: 2 } }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'NOT_ENOUGH_MP', needed: 6, have: 3 } })
  })

  it('治愈：回复友军且不超上限', () => {
    const s = castState()
    s.units[0].hp = 10
    const r = apply(s, { type: 'cast', unitId: 's1', strategyId: 'zhiyu', target: { x: 2, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const hp = r.state.units.find((u) => u.id === 's1')!.hp
    expect(hp).toBeGreaterThan(10)
    expect(hp).toBeLessThanOrEqual(40)
  })

  it('眩晕：statusApplied + 敌方下回合被跳过', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 't1', classId: 'taoist', pos: { x: 2, y: 2 }, base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 }, base: { hp: 60, mp: 0, atk: 10, def: 8, spirit: 5, agi: 8 } }),
      ],
    })
    const r1 = apply(s, { type: 'cast', unitId: 't1', strategyId: 'xuanyun', target: { x: 3, y: 2 } }, gameData)
    expect(r1.ok && r1.events.some((ev) => ev.type === 'statusApplied' && ev.unitId === 'e1')).toBe(true)
    if (!r1.ok) return
    const r2 = apply(r1.state, { type: 'endTurn' }, gameData)
    expect(r2.ok && r2.state.units.find((u) => u.id === 'e1')!.acted).toBe(true)
  })
})

describe('useItem 指令', () => {
  it('金创药：回复 HP（不超上限）并消耗道具', () => {
    const s = mkState({
      units: [mkUnit({ id: 'p1', pos: { x: 2, y: 2 }, hp: 10, items: ['jinchuang_yao'] })],
    })
    const r = apply(s, { type: 'useItem', unitId: 'p1', itemId: 'jinchuang_yao', targetId: 'p1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const u = r.state.units[0]
    expect(u.hp).toBe(50) // hp=10 + 回复 60，但上限 base.hp=50
    expect(u.items.length).toBe(0)
  })
  it('未持有道具 → ITEM_NOT_HELD', () => {
    const s = mkState({ units: [mkUnit({ id: 'p1' })] })
    const r = apply(s, { type: 'useItem', unitId: 'p1', itemId: 'jinchuang_yao', targetId: 'p1' }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'ITEM_NOT_HELD', itemId: 'jinchuang_yao' } })
  })
})
