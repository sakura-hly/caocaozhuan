import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { validateBattleDef } from '../../src/data/battles/shared'
import { initBattle } from '../../src/engine'

describe('虎牢关之战', () => {
  it('校验零 errors 零 warnings（含 ally 与双掉落）', () => {
    expect(validateBattleDef(battles.hulao!, gameData)).toEqual({ errors: [], warnings: [] })
  })
  it('三阵营回合序', () => {
    expect(initBattle(battles.hulao!, 1).factionOrder).toEqual(['player', 'ally', 'enemy'])
  })
  it('胜利条件 = 击破吕布；吕布掉落画戟+赤兔', () => {
    expect(battles.hulao!.win).toEqual({ kind: 'killCommander', unitId: 'lvbu' })
    expect(battles.hulao!.drops).toEqual([
      { unitId: 'lvbu', itemId: 'fangtian_ji' },
      { unitId: 'lvbu', itemId: 'chitu_horse' },
    ])
  })
  it('我方 7 人（典韦登场）、友军三英、吕布 Lv8 高威胁', () => {
    const u = battles.hulao!.units
    expect(u.filter((x) => x.faction === 'player').map((x) => x.id)).toEqual(
      ['caocao', 'xiaohoudun', 'xiahouyuan', 'caoren', 'xunyu', 'caohong', 'dianwei'])
    expect(u.filter((x) => x.faction === 'ally').map((x) => x.id)).toEqual(['liubei', 'guanyu', 'zhangfei'])
    const lvbu = u.find((x) => x.id === 'lvbu')!
    expect(lvbu.level).toBe(8)
    expect(lvbu.base.atk).toBeGreaterThanOrEqual(20)
    expect(battles.hulao!.reinforcements[0]!.turn).toBe(4)
    expect(battles.hulao!.reinforcements[0]!.entries.length).toBe(2)
  })
  it('第 2 回合有三英战吕布对话触发', () => {
    expect(battles.hulao!.dialogues).toContainEqual({ turn: 2, dialogueId: 'hl_sanying' })
    expect(battles.hulao!.dialogues).toContainEqual({ onDeathOf: 'lvbu', dialogueId: 'hl_lvbu_down' })
  })
})
