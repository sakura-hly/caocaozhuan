import { describe, it, expect } from 'vitest'
import { rngNext, rngFloat, rngChance } from '../../src/engine/rng'

describe('rng', () => {
  it('同种子产生相同序列', () => {
    const a = [rngNext(42), rngNext(rngNext(42).nextState), rngNext(rngNext(rngNext(42).nextState).nextState)]
    const b = [rngNext(42), rngNext(rngNext(42).nextState), rngNext(rngNext(rngNext(42).nextState).nextState)]
    expect(a).toEqual(b)
  })

  it('不同种子产生不同值', () => {
    expect(rngNext(1).value).not.toBe(rngNext(2).value)
  })

  it('value 落在 [0,1)', () => {
    let s = 7
    for (let i = 0; i < 1000; i++) {
      const r = rngNext(s)
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(1)
      s = r.nextState
    }
  })

  it('rngFloat 生成 [lo,hi) 区间值', () => {
    const r = rngFloat(0.9, 1.1, 123)
    expect(r.value).toBeGreaterThanOrEqual(0.9)
    expect(r.value).toBeLessThan(1.1)
  })

  it('rngChance p=0 永假 / p=1 永真', () => {
    expect(rngChance(0, 5).value).toBe(false)
    expect(rngChance(1, 5).value).toBe(true)
  })
})
