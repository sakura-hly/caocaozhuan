import { describe, it, expect } from 'vitest'
import { rollLevelUp, awardExp, EXP_PER_LEVEL, LEVEL_CAP } from '../../src/engine/growth'
import { mkState, mkUnit, gameData } from './helpers'
import { begin } from '../../src/engine/internal'
import type { Stats } from '../../src/engine/types'

describe('rollLevelUp', () => {
  it('同种子结果一致（可回放）', () => {
    const g: Stats = { hp: 9, mp: 2, atk: 3, def: 3, spirit: 2, agi: 2 }
    expect(rollLevelUp(g, 100)).toEqual(rollLevelUp(g, 100))
  })
  it('成长率 ≥3 的属性每级至少 +1', () => {
    const g: Stats = { hp: 10, mp: 0, atk: 4, def: 4, spirit: 0, agi: 3 }
    for (let seed = 1; seed <= 20; seed++) {
      const { gains } = rollLevelUp(g, seed)
      expect(gains.hp).toBeGreaterThanOrEqual(3)
      expect(gains.atk).toBeGreaterThanOrEqual(1)
      expect(gains.def).toBeGreaterThanOrEqual(1)
      expect(gains.agi).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('awardExp', () => {
  it('满经验升级并加属性，事件成对', () => {
    const u = mkUnit({ id: 'p1', exp: EXP_PER_LEVEL - 10 })
    const d = begin(mkState({ units: [u] }))
    awardExp(d, 'p1', 10, gameData)
    expect(d.state.units[0].level).toBe(2)
    expect(d.state.units[0].exp).toBe(0)
    expect(d.events.some((e) => e.type === 'expGained')).toBe(true)
    expect(d.events.some((e) => e.type === 'levelUp')).toBe(true)
  })
  it('敌方单位不获得经验', () => {
    const e = mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })
    const d = begin(mkState({ units: [e] }))
    awardExp(d, 'e1', 50, gameData)
    expect(d.state.units[0].exp).toBe(0)
    expect(d.events.length).toBe(0)
  })
  it('等级封顶后不再升级', () => {
    const u = mkUnit({ id: 'p1', level: LEVEL_CAP, exp: 0 })
    const d = begin(mkState({ units: [u] }))
    awardExp(d, 'p1', 500, gameData)
    expect(d.state.units[0].level).toBe(LEVEL_CAP)
  })
})
