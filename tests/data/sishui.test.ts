import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { validateBattleDef } from '../../src/data/battles/shared'
import { initBattle } from '../../src/engine'

describe('注册表一致性（全部战役）', () => {
  it('每场战役都有开场对话 id 且台词存在', () => {
    for (const id of Object.keys(battles)) {
      expect(battleOpeners[id], id).toBeDefined()
      expect(battleDialogues[id]?.[battleOpeners[id]!]?.length, id).toBeGreaterThan(0)
    }
  })
  it('每场战役都有对话注册表条目', () => {
    for (const id of Object.keys(battles)) expect(battleDialogues[id], id).toBeDefined()
  })
})

describe('汜水关之战', () => {
  it('校验零 errors（含 ally 阵营与 drops）', () => {
    expect(validateBattleDef(battles.sishui!, gameData).errors).toEqual([])
  })
  it('三阵营回合序（player/ally/enemy）', () => {
    expect(initBattle(battles.sishui!, 1).factionOrder).toEqual(['player', 'ally', 'enemy'])
  })
  it('胜利条件 = 击破华雄；华雄掉落铁甲', () => {
    expect(battles.sishui!.win).toEqual({ kind: 'killCommander', unitId: 'huaxiong' })
    expect(battles.sishui!.drops).toEqual([{ unitId: 'huaxiong', itemId: 'iron_armor' }])
  })
  it('我方 6 人（曹洪登场）、友军三英、敌方华雄+杂兵+增援', () => {
    const u = battles.sishui!.units
    expect(u.filter((x) => x.faction === 'player').map((x) => x.id)).toEqual(
      ['caocao', 'xiaohoudun', 'xiahouyuan', 'caoren', 'xunyu', 'caohong'])
    expect(u.filter((x) => x.faction === 'ally').map((x) => x.id)).toEqual(['liubei', 'guanyu', 'zhangfei'])
    expect(u.find((x) => x.id === 'huaxiong')!.faction).toBe('enemy')
    expect(battles.sishui!.reinforcements[0]!.entries.length).toBeGreaterThan(0)
  })
  it('华雄数值覆盖生效（hp 高于档案值）', () => {
    const h = battles.sishui!.units.find((x) => x.id === 'huaxiong')!
    expect(h.base.hp).toBeGreaterThan(gameData.heroes['huaxiong']!.base.hp)
    expect(h.level).toBeGreaterThan(1)
  })
})
