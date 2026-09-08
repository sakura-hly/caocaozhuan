import { describe, it, expect } from 'vitest'
import { strategies } from '../../src/data/strategies'
import { shapeCells, castableInWeather } from '../../src/engine/spells'
import type { Cell } from '../../src/engine/types'

describe('法术数据', () => {
  it('共 10 个法术，id 唯一', () => {
    expect(Object.keys(strategies).length).toBe(10)
  })
  it('attack 类必填 element；buff/debuff 类必填 effect 与 effectTurns', () => {
    for (const s of Object.values(strategies)) {
      if (s.kind === 'attack') expect(s.element, s.id).toBeDefined()
      if (s.kind === 'buff' || s.kind === 'debuff') {
        expect(s.effect, s.id).toBeDefined()
        expect(s.effectTurns, s.id).toBeGreaterThan(0)
      }
      expect(s.mpCost, s.id).toBeGreaterThan(0)
      expect(s.allowedClasses.length, s.id).toBeGreaterThan(0)
    }
  })
})

describe('shapeCells', () => {
  const c: Cell = { x: 5, y: 5 }
  it('single 只有目标格', () => {
    expect(shapeCells(c, 'single')).toEqual([c])
  })
  it('cross 是目标格 + 四邻', () => {
    expect(shapeCells(c, 'cross').length).toBe(5)
    expect(shapeCells(c, 'cross')).toContainEqual({ x: 6, y: 5 })
    expect(shapeCells(c, 'cross')).not.toContainEqual({ x: 6, y: 6 })
  })
  it('burst 是 3x3 九格', () => {
    expect(shapeCells(c, 'burst').length).toBe(9)
  })
})

describe('castableInWeather', () => {
  it('雨天火系不可用，其余可用', () => {
    expect(castableInWeather(strategies.huoshi, 'rainy')).toBe(false)
    expect(castableInWeather(strategies.huoshi, 'sunny')).toBe(true)
    expect(castableInWeather(strategies.huolong, 'cloudy')).toBe(true)
    expect(castableInWeather(strategies.zhiyu, 'rainy')).toBe(true)
    expect(castableInWeather(strategies.shuiyan, 'rainy')).toBe(true)
  })
})
