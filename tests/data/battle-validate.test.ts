import { describe, it, expect } from 'vitest'
import { validateBattleDef } from '../../src/data/battles/shared'
import { gameData } from '../../src/data'
import { yingchuan } from '../../src/data/battles/yingchuan'
import { heroUnit, mobUnit, parseMap } from '../../src/data/battles/shared'

const MAP = parseMap(['.....', '.....', '.....', '.....', '.....'])

function baseDef() {
  return {
    ...yingchuan,
    map: MAP,
    units: [
      heroUnit('caocao', 'player', { x: 0, y: 0 }),
      mobUnit('e1', '敌兵', 'infantry', 'enemy', { x: 4, y: 4 }, { hp: 40, mp: 0, atk: 10, def: 5, spirit: 3, agi: 5 }),
    ],
    reinforcements: [], treasureCells: [], dialogues: [], weatherScript: [],
    win: { kind: 'annihilate' } as const, maxTurns: 10, drops: [],
  }
}

describe('validateBattleDef 扩展规则', () => {
  it('现有颍川数据仍零 errors', () => {
    expect(validateBattleDef(yingchuan, gameData).errors).toEqual([])
  })
  it('装备兵种不符 → error（青釭剑只许 lord/infantry）', () => {
    const def = baseDef()
    const cav = heroUnit('xiaohoudun', 'player', { x: 1, y: 0 }) // cavalry
    cav.equipment = { weapon: 'qinggang_sword' }
    def.units = [cav, def.units[1]!]
    const r = validateBattleDef(def, gameData)
    expect(r.errors.some((e) => e.includes('兵种不符'))).toBe(true)
  })
  it('槽位与装备类型不符 → error（weapon 塞进 armor 槽）', () => {
    const def = baseDef()
    const u = heroUnit('caocao', 'player', { x: 0, y: 0 })
    u.equipment = { armor: 'iron_sword' }
    def.units = [u, def.units[1]!]
    const r = validateBattleDef(def, gameData)
    expect(r.errors.some((e) => e.includes('类型不符'))).toBe(true)
  })
  it('drops 引用不存在的单位/物品 → error；合法 drops 通过', () => {
    const ok = { ...baseDef(), drops: [{ unitId: 'e1', itemId: 'iron_armor' }] }
    expect(validateBattleDef(ok, gameData).errors).toEqual([])
    const badUnit = { ...baseDef(), drops: [{ unitId: 'nope', itemId: 'iron_armor' }] }
    const badItem = { ...baseDef(), drops: [{ unitId: 'e1', itemId: 'nope' }] }
    expect(validateBattleDef(badUnit, gameData).errors.length).toBeGreaterThan(0)
    expect(validateBattleDef(badItem, gameData).errors.length).toBeGreaterThan(0)
  })
})
