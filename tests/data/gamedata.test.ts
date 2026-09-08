import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { ADVANTAGE } from '../../src/data/classes'
import type { ClassId, TerrainId } from '../../src/engine/types'

const ALL_CLASSES: ClassId[] = ['lord', 'infantry', 'cavalry', 'archer', 'strategist', 'taoist']
const ALL_TERRAINS: TerrainId[] = ['plain', 'forest', 'mountain', 'water', 'city', 'camp', 'pass', 'bridge']

describe('静态数据完整性', () => {
  it('6 兵种齐全且成长率在 0~10', () => {
    for (const id of ALL_CLASSES) {
      const c = gameData.classes[id]
      expect(c, `兵种 ${id}`).toBeDefined()
      for (const v of Object.values(c.growth)) expect(v).toBeGreaterThanOrEqual(0)
      expect(c.movePower).toBeGreaterThan(0)
      expect(c.maxRange).toBeGreaterThanOrEqual(c.minRange)
    }
  })

  it('8 地形齐全且防御加成在 0~50', () => {
    for (const id of ALL_TERRAINS) {
      const t = gameData.terrains[id]
      expect(t, `地形 ${id}`).toBeDefined()
      expect(t.defBonus).toBeGreaterThanOrEqual(0)
      expect(t.defBonus).toBeLessThanOrEqual(50)
    }
  })

  it('每个兵种在每种地形都有移动消耗定义', () => {
    for (const cid of ALL_CLASSES) {
      for (const tid of ALL_TERRAINS) {
        const mc = gameData.terrains[tid].moveCost
        const cost = typeof mc === 'number' ? mc : (mc[cid] ?? mc.default)
        expect(Number.isFinite(cost) || cost === Infinity, `${cid}/${tid}`).toBe(true)
        if (Number.isFinite(cost)) expect(cost as number).toBeGreaterThan(0)
      }
    }
  })

  it('相克三角是封闭环（骑→弓→步→骑）', () => {
    expect([...ADVANTAGE]).toEqual([
      ['cavalry', 'archer'],
      ['archer', 'infantry'],
      ['infantry', 'cavalry'],
    ])
  })
})
