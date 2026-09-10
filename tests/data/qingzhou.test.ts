import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import { qingzhou } from '../../src/data/battles/qingzhou'

describe('青州之战定义', () => {
  it('三注册表登记一致（battles/openers/dialogues）', () => {
    expect(battles.qingzhou).toBe(qingzhou)
    expect(battleOpeners.qingzhou).toBe('qz_start')
    expect(Object.keys(battleDialogues.qingzhou!).length).toBeGreaterThanOrEqual(3)
  })
  it('校验零错误（assertBattleValid 返回 errors: string[]）', () => {
    expect(assertBattleValid(qingzhou, 'qingzhou', gameData)).toEqual([])
  })
  it('12 行 × 16 列地图', () => {
    expect(qingzhou.map).toHaveLength(12)
    expect(qingzhou.map.every((r) => r.length === 16)).toBe(true)
  })
  it('于禁为玩家新参战；胜利 = 歼灭全敌；两宝物格；黄巾道士在编', () => {
    expect(qingzhou.units.find((u) => u.heroId === 'yujin')?.faction).toBe('player')
    expect(qingzhou.win).toEqual({ kind: 'annihilate' })
    expect(qingzhou.treasureCells).toHaveLength(2)
    expect(qingzhou.units.some((u) => u.classId === 'taoist' && u.faction === 'enemy')).toBe(true)
  })
})
