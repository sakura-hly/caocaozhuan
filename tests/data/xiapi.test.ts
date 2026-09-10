import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import { xiapi } from '../../src/data/battles/xiapi'

describe('下邳之战定义', () => {
  it('三注册表登记一致（battles/openers/dialogues）', () => {
    expect(battles.xiapi).toBe(xiapi)
    expect(battleOpeners.xiapi).toBe('xp_start')
    expect(Object.keys(battleDialogues.xiapi!).length).toBeGreaterThanOrEqual(3)
  })
  it('校验零警告（errors 直接 throw；返回值是 warnings，断言空数组即零警告）', () => {
    expect(assertBattleValid(xiapi, 'xiapi', gameData)).toEqual([])
  })
  it('12 行 × 20 列地图，地形抽查哨兵', () => {
    expect(xiapi.map).toHaveLength(12)
    expect(xiapi.map.every((r) => r.length === 20)).toBe(true)
    // 内容抽查：日后改地图（填桥/铲城/填水域）时这几处先红，不让逐字符核对沦为一次性
    expect(xiapi.map[10]![5]).toBe('bridge') // 登陆桥（西南登陆通道）
    expect(xiapi.map[2]![15]).toBe('city') // 吕布城心格（东北大城）
    expect(xiapi.map[0]![0]).toBe('water') // 外圈水
    expect(xiapi.map[10]![13]).toBe('water') // 南水域
  })
  it('荀攸玩家方首战；胜利 = 击破吕布 Lv10 / 陈宫 enemy 标级 7；妖道在编可施 debuff；水淹三重奏；宝物格全锁；无掉落', () => {
    expect(xiapi.units.find((u) => u.heroId === 'xunyou')?.faction).toBe('player')
    expect(xiapi.win).toEqual({ kind: 'killCommander', unitId: 'lvbu' })
    expect(xiapi.units.find((u) => u.heroId === 'lvbu')?.level).toBe(10)
    expect(xiapi.units.find((u) => u.heroId === 'chengong')?.faction).toBe('enemy')
    expect(xiapi.units.find((u) => u.heroId === 'chengong')?.level).toBe(7)
    // 敌方 debuff 施法者 = 下邳妖道（taoist）：AI 的 debuff 分支按兵种放行（strategist 只治疗/攻击施法），
    // 故敌方 debuff 施法者必须是 taoist 兵种——引擎口径，数据侧锁兵种+阵营+mp 门槛
    const d1 = xiapi.units.find((u) => u.id === 'd1')
    expect(d1).toBeDefined()
    expect(d1!.classId).toBe('taoist')
    expect(d1!.faction).toBe('enemy')
    expect(d1!.base.mp).toBeGreaterThanOrEqual(gameData.strategies.pojia.mpCost) // mp 不够则 debuff 静默失效
    // 水淹三重奏：turn 6 天气转雨且持续至终局（只写一条则后续随机漂移放晴），同回合台词 + 城东缘增援突围
    expect(xiapi.weatherScript).toHaveLength(19) // turn 6..24
    expect(xiapi.weatherScript[0]).toEqual({ turn: 6, weather: 'rainy' })
    expect(xiapi.weatherScript.every((e) => e.weather === 'rainy' && e.turn >= 6)).toBe(true)
    expect(xiapi.dialogues).toContainEqual({ turn: 6, dialogueId: 'xp_shuiyan' }) // 三重奏的台词腿
    expect(xiapi.reinforcements.map((r) => r.turn)).toEqual([6])
    expect(xiapi.reinforcements[0]!.entries).toHaveLength(2)
    xiapi.reinforcements[0]!.entries.forEach((e) => {
      expect(e.unit.name).toBe('并州兵')
      expect(e.unit.classId).toBe('infantry')
    })
    // 宝物格全锁（挪格/换物即红，勿只锁数量）
    expect(xiapi.treasureCells.map((t) => [t.cell.x, t.cell.y, t.itemId])).toEqual([
      [14, 2, 'shuangtie_ji'],
      [6, 9, 'jinchuang_yao'],
    ])
    expect(xiapi.drops).toEqual([]) // 终战宝物走宝物格与战后抉择，无击破掉落
    expect(xiapi.maxTurns).toBe(24)
  })
})
