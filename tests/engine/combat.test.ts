import { describe, it, expect } from 'vitest'
import {
  affinity, physicalDamage, hitChance, critChance, comboChance, spellDamage, healAmount,
} from '../../src/engine/combat'

describe('affinity 相克系数', () => {
  it('骑兵克弓兵 1.25 / 弓兵被骑克 0.8 / 中立 1.0', () => {
    expect(affinity('cavalry', 'archer')).toBe(1.25)
    expect(affinity('archer', 'cavalry')).toBe(0.8)
    expect(affinity('archer', 'infantry')).toBe(1.25)
    expect(affinity('infantry', 'cavalry')).toBe(1.25)
    expect(affinity('lord', 'strategist')).toBe(1.0)
    expect(affinity('strategist', 'taoist')).toBe(1.0)
  })
})

describe('physicalDamage', () => {
  const base = { attackerClass: 'infantry' as const, defenderClass: 'cavalry' as const, terrainDefBonus: 0, roll: 1 }

  it('基础公式 (攻-防*0.6)*相克*地形*浮动，最低 1', () => {
    // (20 - 10*0.6) * 1.25 * 1 * 1 = 17.5 → 18
    expect(physicalDamage({ ...base, atk: 20, def: 10 })).toBe(18)
  })

  it('地形防御减伤', () => {
    // (20-6) * 1.25 * (1-0.3) = 12.25 → 12
    expect(physicalDamage({ ...base, atk: 20, def: 10, terrainDefBonus: 30 })).toBe(12)
  })

  it('攻击低于防御*0.6 时保底 1 点', () => {
    expect(physicalDamage({ ...base, atk: 5, def: 20, terrainDefBonus: 30, roll: 0.9 })).toBe(1)
  })

  it('浮动 roll 参与计算', () => {
    const d1 = physicalDamage({ ...base, atk: 20, def: 10, roll: 0.9 })
    const d2 = physicalDamage({ ...base, atk: 20, def: 10, roll: 1.09 })
    expect(d1).toBeLessThan(d2)
  })
})

describe('命中/暴击/连击概率', () => {
  it('命中 = clamp(90 + 敏捷差, 50, 100)', () => {
    expect(hitChance(10, 10)).toBe(90)
    expect(hitChance(30, 10)).toBe(100)
    expect(hitChance(10, 100)).toBe(50)
  })
  it('暴击 = clamp(5 + 敏捷差*0.5, 0, 40)', () => {
    expect(critChance(10, 10)).toBe(5)
    expect(critChance(100, 10)).toBe(40)
    expect(critChance(10, 100)).toBe(0)
  })
  it('连击 = clamp(敏捷差*1.5, 0, 30)', () => {
    expect(comboChance(10, 10)).toBe(0)
    expect(comboChance(20, 10)).toBe(15)
    expect(comboChance(100, 10)).toBe(30)
  })
})

describe('法术公式', () => {
  it('伤害 = (威力 + 精*0.8 - 敌精*0.4) * 天气系数', () => {
    // (30 + 20*0.8 - 10*0.4) * 1 = 42
    expect(spellDamage({ power: 30, casterSpirit: 20, targetSpirit: 10, weather: 'sunny', element: 'fire' })).toBe(42)
  })
  it('雨天水系 ×1.5', () => {
    expect(spellDamage({ power: 24, casterSpirit: 20, targetSpirit: 10, weather: 'rainy', element: 'water' }))
      .toBe(Math.round((24 + 16 - 4) * 1.5)) // 54
  })
  it('目标山地落石 ×1.3', () => {
    expect(spellDamage({ power: 34, casterSpirit: 20, targetSpirit: 10, weather: 'sunny', element: 'earth', targetOnMountain: true }))
      .toBe(Math.round((34 + 16 - 4) * 1.3)) // 60
  })
  it('回复 = 威力 + 施法者精神', () => {
    expect(healAmount(40, 20)).toBe(60)
  })
})
