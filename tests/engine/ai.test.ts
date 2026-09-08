import { describe, it, expect } from 'vitest'
import { decideUnitAction } from '../../src/engine/ai'
import { gameData, mkState, mkUnit } from './helpers'

describe('decideUnitAction', () => {
  it('可击杀的残血目标优先于高血量目标', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', classId: 'cavalry', pos: { x: 4, y: 2 },
          base: { hp: 60, mp: 0, atk: 20, def: 8, spirit: 4, agi: 10 } }),
        mkUnit({ id: 'archer_low', pos: { x: 5, y: 2 }, hp: 5,
          base: { hp: 50, mp: 0, atk: 10, def: 1, spirit: 4, agi: 6 } }),
        mkUnit({ id: 'inf_full', pos: { x: 3, y: 2 },
          base: { hp: 60, mp: 0, atk: 10, def: 14, spirit: 4, agi: 6 } }),
      ],
    })
    const cmds = decideUnitAction(s, 'ai1', gameData)
    const atk = cmds.find((c) => c.type === 'attack')
    expect(atk).toBeDefined()
    expect(atk && atk.type === 'attack' && atk.targetId).toBe('archer_low')
  })

  it('无目标可及 → 返回 [move, wait] 且移动后更接近最近敌人', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', classId: 'infantry', pos: { x: 0, y: 0 } }),
        mkUnit({ id: 'p1', pos: { x: 7, y: 5 }, acted: true }),
      ],
    })
    const cmds = decideUnitAction(s, 'ai1', gameData)
    expect(cmds.length).toBe(2)
    expect(cmds[0].type).toBe('move')
    expect(cmds[1].type).toBe('wait')
    if (cmds[0].type === 'move') {
      const before = Math.abs(7 - 0) + Math.abs(5 - 0)
      const after = Math.abs(7 - cmds[0].to.x) + Math.abs(5 - cmds[0].to.y)
      expect(after).toBeLessThan(before)
    }
  })

  it('道士优先治疗重伤友军', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'e_tao', faction: 'enemy', classId: 'taoist', pos: { x: 5, y: 5 },
          base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e_inf', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 5 }, hp: 20,
          base: { hp: 60, mp: 0, atk: 10, def: 10, spirit: 4, agi: 8 } }),
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 }, acted: true }), // 远离，打不到
      ],
    })
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    const cast = cmds.find((c) => c.type === 'cast')
    expect(cast).toBeDefined()
    expect(cast && cast.type === 'cast' && cast.strategyId).toBe('zhiyu')
  })

  it('已行动/阵亡单位返回空数组', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', pos: { x: 5, y: 5 }, acted: true }),
        mkUnit({ id: 'dead', faction: 'enemy', pos: { x: 5, y: 4 }, alive: false }),
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 }, acted: true }),
      ],
    })
    expect(decideUnitAction(s, 'ai1', gameData)).toEqual([])
    expect(decideUnitAction(s, 'dead', gameData)).toEqual([])
  })
})
