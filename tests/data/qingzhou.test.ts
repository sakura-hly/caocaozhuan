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
  it('校验零警告（errors 直接 throw；返回值是 warnings，断言空数组即零警告）', () => {
    expect(assertBattleValid(qingzhou, 'qingzhou', gameData)).toEqual([])
  })
  it('12 行 × 16 列地图，地形抽查哨兵', () => {
    expect(qingzhou.map).toHaveLength(12)
    expect(qingzhou.map.every((r) => r.length === 16)).toBe(true)
    // 内容抽查：日后改地图（挪河道/铲城池）时这三处先红，不让逐字符核对沦为一次性
    expect(qingzhou.map[0]![1]).toBe('camp') // 北麓贼营
    expect(qingzhou.map[6]![13]).toBe('city') // 的卢宝物格，顺带锁可达地形
    expect(qingzhou.map[5]![9]).toBe('water') // 中路河道 choke
  })
  it('于禁为玩家新参战；胜利 = 歼灭全敌；两宝物格；黄巾道士在编；turn 5 双增援', () => {
    expect(qingzhou.units.find((u) => u.heroId === 'yujin')?.faction).toBe('player')
    expect(qingzhou.win).toEqual({ kind: 'annihilate' })
    expect(qingzhou.treasureCells).toHaveLength(2)
    expect(qingzhou.units.some((u) => u.classId === 'taoist' && u.faction === 'enemy')).toBe(true)
    // 增援是本关设计标识：turn 5 北麓两股
    expect(qingzhou.reinforcements).toHaveLength(1)
    expect(qingzhou.reinforcements[0]!.turn).toBe(5)
    expect(qingzhou.reinforcements[0]!.entries).toHaveLength(2)
  })
})
