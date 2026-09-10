import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import { puyang } from '../../src/data/battles/puyang'

describe('濮阳之战定义', () => {
  it('三注册表登记一致（battles/openers/dialogues）', () => {
    expect(battles.puyang).toBe(puyang)
    expect(battleOpeners.puyang).toBe('py_start')
    expect(Object.keys(battleDialogues.puyang!).length).toBeGreaterThanOrEqual(3)
  })
  it('校验零警告（errors 直接 throw；返回值是 warnings，断言空数组即零警告）', () => {
    expect(assertBattleValid(puyang, 'puyang', gameData)).toEqual([])
  })
  it('12 行 × 20 列地图，地形抽查哨兵；竖城墙 G 列恰三缺口（三门）', () => {
    expect(puyang.map).toHaveLength(12)
    expect(puyang.map.every((r) => r.length === 20)).toBe(true)
    // 内容抽查：日后改地图（填门/拆桥/铲城）时这几处先红，不让逐字符核对沦为一次性
    expect(puyang.map[0]![13]).toBe('pass') // 城墙列（x=13 为 pass 关隘）
    expect(puyang.map[2]![13]).toBe('plain') // 北门缺口（y=2）
    expect(puyang.map[9]![14]).toBe('bridge') // 南门内桥（缺口东邻 b 为门内通道）
    expect(puyang.map[2]![17]).toBe('city') // 孙子兵法宝物格（城内 C）
    // 三门断言：城墙列上非 pass 的行恰 3 行（y2/y6/y9 三处缺口 = 三门进攻路线）
    expect(puyang.map.filter((row) => row[13] !== 'pass').length).toBe(3)
  })
  it('郭嘉玩家方首次参战；胜利 = 击破吕布；吕布标级 7 / 陈宫标级 6；妖道在编可施 debuff；无增援无掉落', () => {
    expect(puyang.units.find((u) => u.heroId === 'guojia')?.faction).toBe('player')
    expect(puyang.win).toEqual({ kind: 'killCommander', unitId: 'lvbu' })
    expect(puyang.units.find((u) => u.heroId === 'lvbu')?.level).toBe(7)
    expect(puyang.units.find((u) => u.heroId === 'chengong')?.faction).toBe('enemy')
    expect(puyang.units.find((u) => u.heroId === 'chengong')?.level).toBe(6)
    // 敌方 debuff 施法者 = 吕布军妖道（taoist）：AI 的 debuff 分支按兵种放行（strategist 只治疗/攻击施法），
    // 故敌方 debug 施法者必须是 taoist 兵种——引擎口径，数据侧锁兵种+阵营+mp 门槛
    const d1 = puyang.units.find((u) => u.id === 'd1')
    expect(d1).toBeDefined()
    expect(d1!.classId).toBe('taoist')
    expect(d1!.faction).toBe('enemy')
    expect(d1!.base.mp).toBeGreaterThanOrEqual(gameData.strategies.pojia.mpCost) // mp 不够则 debuff 静默失效
    // 吕布出击是常态：城内守军足以施压，无增援；方天画戟虎牢已掉，宝物走宝物格，无掉落
    expect(puyang.reinforcements).toEqual([])
    expect(puyang.drops).toEqual([])
  })
})
