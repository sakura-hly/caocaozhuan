import { describe, it, expect } from 'vitest'
import { battleChoices } from '../../src/data/battles'
import { gameData } from '../../src/data'

describe('战后抉择注册表', () => {
  it('三战抉择存在（徐州/宛城/白门楼）且 id 与键一致', () => {
    for (const id of ['xuzhou_post', 'wancheng_post', 'xiapi_post']) {
      const ch = battleChoices[id]
      expect(ch, id).toBeDefined()
      expect(ch.id).toBe(id)
      expect(ch.battleId.length).toBeGreaterThan(0)
      expect(ch.speaker.length).toBeGreaterThan(0)
      expect(ch.prompt.length).toBeGreaterThan(0)
    }
  })
  it('选项结构合法：2 项、善恶增量为 ±1、奖励道具已注册', () => {
    for (const ch of Object.values(battleChoices)) {
      expect(ch.options).toHaveLength(2)
      for (const opt of ch.options) {
        expect(Math.abs(opt.morality)).toBe(1)
        for (const item of opt.itemRewards ?? []) {
          expect(gameData.items[item], `${ch.id} 奖励 ${item}`).toBeDefined()
        }
      }
    }
  })
  it('每战至多一个抉择（battleId 不重复）', () => {
    const seen = new Set<string>()
    for (const ch of Object.values(battleChoices)) {
      expect(seen.has(ch.battleId), ch.battleId).toBe(false)
      seen.add(ch.battleId)
    }
  })
})
