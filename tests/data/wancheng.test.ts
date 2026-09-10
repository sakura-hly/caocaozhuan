import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import { wancheng } from '../../src/data/battles/wancheng'

describe('宛城之战定义', () => {
  it('三注册表登记一致（battles/openers/dialogues）', () => {
    expect(battles.wancheng).toBe(wancheng)
    expect(battleOpeners.wancheng).toBe('wc_start')
    expect(Object.keys(battleDialogues.wancheng!).length).toBeGreaterThanOrEqual(3)
  })
  it('校验零警告（errors 直接 throw；返回值是 warnings，断言空数组即零警告）', () => {
    expect(assertBattleValid(wancheng, 'wancheng', gameData)).toEqual([])
  })
  it('12 行 × 16 列地图，地形抽查哨兵', () => {
    expect(wancheng.map).toHaveLength(12)
    expect(wancheng.map.every((r) => r.length === 16)).toBe(true)
    // 内容抽查：日后改地图（填关隘/迁营地/铲水域）时这几处先红，不让逐字符核对沦为一次性
    expect(wancheng.map[11]![1]).toBe('pass') // 撤退点关隘（reach 胜利格）
    expect(wancheng.map[0]![12]).toBe('camp') // 东北营地（我方被围起点）
    expect(wancheng.map[4]![4]).toBe('water') // 中路水域（拖速突围路线）
  })
  it('胜利 = 曹操抵达撤退点；典韦在编断后；张绣标级 6；增援三波各 2；两宝物格；无掉落', () => {
    // 全游戏首个 reach 撤退胜利关：曹操到格即胜，不必歼敌
    expect(wancheng.win).toEqual({ kind: 'reach', unitId: 'caocao', cell: { x: 1, y: 11 } })
    // 典韦必须参战且在玩家方——断后剧情核心（wc_duanhou / wc_dianwei_down 均以其在场为前提）
    expect(wancheng.units.find((u) => u.heroId === 'dianwei')?.faction).toBe('player')
    // 张绣：追击主力，enemy 标级 6，不覆写 base
    const zx = wancheng.units.find((u) => u.heroId === 'zhangxiu')
    expect(zx?.faction).toBe('enemy')
    expect(zx?.level).toBe(6)
    // 三波穷追：turn [3,5,7]，每波恰 2 员张绣军枪兵（撤退紧迫感的数值来源）
    expect(wancheng.reinforcements.map((r) => r.turn)).toEqual([3, 5, 7])
    wancheng.reinforcements.forEach((r) => {
      expect(r.entries).toHaveLength(2)
      r.entries.forEach((e) => {
        expect(e.unit.name).toBe('张绣军枪兵')
        expect(e.unit.classId).toBe('infantry')
      })
    })
    // 宝物格全锁（挪格/换物即红，勿只锁数量）
    expect(wancheng.treasureCells.map((t) => [t.cell.x, t.cell.y, t.itemId])).toEqual([
      [7, 8, 'jinchuang_yao'],
      [12, 10, 'huanshen_dan'],
    ])
    expect(wancheng.drops).toEqual([]) // 撤退战无暇缴获
    expect(wancheng.maxTurns).toBe(14) // reach 关压力核心参数
  })
})
