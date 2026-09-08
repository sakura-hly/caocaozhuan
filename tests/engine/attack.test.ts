import { describe, it, expect } from 'vitest'
import { apply } from '../../src/engine/engine'
import { gameData, mkState, mkUnit } from './helpers'

// 命中率确定性：攻击方敏捷远高于防守方（hitChance=100%）
function states() {
  return mkState({
    units: [
      mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 50 } }),
      mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 5 } }),
    ],
  })
}

describe('attack 指令', () => {
  it('命中：掉血 + 事件 + acted 置位 + 获得经验', () => {
    const r = apply(states(), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const e1 = r.state.units.find((u) => u.id === 'e1')!
    expect(e1.hp).toBeLessThan(60)
    expect(r.events.some((ev) => ev.type === 'attackLaunched')).toBe(true)
    expect(r.events.some((ev) => ev.type === 'hpChanged' && ev.unitId === 'e1')).toBe(true)
    expect(r.state.units.find((u) => u.id === 'p1')!.acted).toBe(true)
    expect(r.events.some((ev) => ev.type === 'expGained' && ev.unitId === 'p1')).toBe(true)
  })

  it('防守方存活且在射程内 → 触发反击（p1 掉血）', () => {
    const r = apply(states(), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const p1 = r.state.units.find((u) => u.id === 'p1')!
    expect(p1.hp).toBeLessThan(60)
    expect(r.events.filter((e) => e.type === 'attackLaunched').length).toBe(1) // 事件合并一条，内含反击
  })

  it('弓兵被贴脸（距 1）时不反击（minRange=2）', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 50 } }),
        mkUnit({ id: 'e1', faction: 'enemy', classId: 'archer', pos: { x: 2, y: 3 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 5 } }),
      ],
    })
    const r = apply(s, { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.units.find((u) => u.id === 'p1')!.hp).toBe(60) // 未被反击
  })

  it('击杀：unitDied + 击杀奖励经验 + 歼灭即胜', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 }, base: { hp: 60, mp: 0, atk: 99, def: 10, spirit: 5, agi: 50 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 }, base: { hp: 10, mp: 0, atk: 1, def: 0, spirit: 1, agi: 1 }, hp: 5 }),
      ],
    })
    const r = apply(s, { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.events.some((ev) => ev.type === 'unitDied' && ev.unitId === 'e1')).toBe(true)
    expect(r.state.finished).toBe('won')
  })

  it('攻击友军 → CANNOT_TARGET；射程外 → NOT_IN_RANGE', () => {
    const s = states()
    const ally = mkUnit({ id: 'a1', faction: 'ally', pos: { x: 2, y: 3 } })
    const r1 = apply({ ...s, units: [...s.units, ally] }, { type: 'attack', unitId: 'p1', targetId: 'a1' }, gameData)
    expect(r1.ok === false && r1.error.code === 'CANNOT_TARGET').toBe(true)
    // p1 与 e1 相距 12 格，infantry 射程 [1,1]
    const far = mkState({
      units: [
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 7, y: 5 } }),
      ],
    })
    const r2 = apply(far, { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'NOT_IN_RANGE', unitId: 'p1', targetId: 'e1' } })
  })
})
