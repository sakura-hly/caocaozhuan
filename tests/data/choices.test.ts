import { describe, it, expect } from 'vitest'
import { battleChoices } from '../../src/data/battles'
import { gameData } from '../../src/data'

describe('战后抉择注册表', () => {
  it('三战抉择存在（徐州/宛城/白门楼）且 id 遵 `${battleId}_post` 契约', () => {
    for (const id of ['xuzhou_post', 'wancheng_post', 'xiapi_post']) {
      const ch = battleChoices[id]
      expect(ch, id).toBeDefined()
      expect(ch.id).toBe(id)
      expect(ch.battleId.length).toBeGreaterThan(0)
      expect(ch.speaker.length).toBeGreaterThan(0)
      expect(ch.prompt.length).toBeGreaterThan(0)
    }
    // 遍历锁全表契约：choicesMade 持久化键依赖该命名形态
    for (const [key, ch] of Object.entries(battleChoices)) {
      expect(ch.id, key).toBe(key)
      expect(ch.id, `${key} 命名契约`).toBe(`${ch.battleId}_post`)
    }
  })
  it('选项结构合法：2 项、方向相反（0=仁+1 / 1=暴−1）、奖励道具已注册', () => {
    for (const ch of Object.values(battleChoices)) {
      expect(ch.options).toHaveLength(2)
      expect(ch.options.map((o) => o.morality).sort(), ch.id).toEqual([-1, 1])
      expect(ch.options[0]!.morality, `${ch.id} 顺序：仁在前`).toBe(1)
      for (const opt of ch.options) {
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
