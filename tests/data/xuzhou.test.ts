import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import { xuzhou } from '../../src/data/battles/xuzhou'

describe('徐州复仇战定义', () => {
  it('三注册表登记一致（battles/openers/dialogues）', () => {
    expect(battles.xuzhou).toBe(xuzhou)
    expect(battleOpeners.xuzhou).toBe('xz_start')
    expect(Object.keys(battleDialogues.xuzhou!).length).toBeGreaterThanOrEqual(3)
  })
  it('校验零警告（errors 直接 throw；返回值是 warnings，断言空数组即零警告）', () => {
    expect(assertBattleValid(xuzhou, 'xuzhou', gameData)).toEqual([])
  })
  it('12 行 × 18 列地图，地形抽查哨兵', () => {
    expect(xuzhou.map).toHaveLength(12)
    expect(xuzhou.map.every((r) => r.length === 18)).toBe(true)
    // 内容抽查：日后改地图（填河/拆桥/铲城）时这三处先红，不让逐字符核对沦为一次性
    expect(xuzhou.map[4]![10]).toBe('bridge') // 北护城河桥（西进第一通道）
    expect(xuzhou.map[5]![15]).toBe('city') // 陶谦城（敌主将落点格）
    expect(xuzhou.map[0]![11]).toBe('water') // 北段护城河
  })
  it('许褚为玩家新参战；胜利 = 击破陶谦；敌军师在编；陶谦闭城固守无增援、奖励走战后抉择', () => {
    expect(xuzhou.units.find((u) => u.heroId === 'xuchu')?.faction).toBe('player')
    expect(xuzhou.win).toEqual({ kind: 'killCommander', unitId: 'taoqian' })
    expect(xuzhou.units.find((u) => u.heroId === 'taoqian')?.faction).toBe('enemy')
    // 敌军师在编：strategist 持 zhiyu（治疗保主将）由 AI 按兵种注册表放行，数据侧只锁兵种与阵营
    expect(xuzhou.units.some((u) => u.classId === 'strategist' && u.faction === 'enemy')).toBe(true)
    // 陶谦闭城固守：无增援；宝物走战后抉择 xuzhou_post（安民得明光铠），无宝物格无掉落
    expect(xuzhou.reinforcements).toEqual([])
    expect(xuzhou.treasureCells).toEqual([])
    expect(xuzhou.drops).toEqual([])
  })
})
