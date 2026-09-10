import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import {
  CAMPAIGN_BATTLES, newGame, currentBattleId, deployBattle, settleBattle,
} from '../../src/game/campaign'
import { saveSlot, loadSlot } from '../../src/game/saves'
import type { Storage } from '../../src/game/saves'
import { autoPlayDef } from './helpers'

function fakeStorage(): Storage {
  const dump = new Map<string, string>()
  return {
    getItem: (k) => dump.get(k) ?? null,
    setItem: (k, v) => void dump.set(k, v),
    removeItem: (k) => void dump.delete(k),
  }
}

describe('战役闭环：新游戏 → 三连战 → 通关', () => {
  it('seed 42 全流程：零错误、全胜、进度推进、存档往返', () => {
    let c = newGame()
    const st = fakeStorage()
    for (const id of CAMPAIGN_BATTLES) {
      const def = deployBattle(battles[id]!, c, gameData)
      expect(() => assertBattleValid(def, id, gameData)).not.toThrow()
      const r = autoPlayDef(def, 42)
      expect(r.errors, id).toEqual([])
      expect(r.finished, id).toBe('won')
      const s = settleBattle(c, def, r.state, gameData)
      expect(s.report.won, id).toBe(true)
      c = s.campaign
      saveSlot(st, 'auto', c, 1) // 每战开始/结束都会写 auto（此处验证可写可读）
    }
    expect(currentBattleId(c)).toBeNull()
    const restored = loadSlot(st, 'auto', gameData)
    expect(restored).toEqual(c)
    // 通关后名册成长过（等级高于初始）
    expect(c.roster.every((m) => m.level >= 1)).toBe(true)
    expect(c.roster.some((m) => m.heroId === 'caohong')).toBe(true) // 汜水关入册
    expect(c.roster.some((m) => m.heroId === 'dianwei')).toBe(true) // 虎牢关入册
  })
  it('战败不推进：败北后进度停在原战场', () => {
    const c = newGame()
    const def = deployBattle(battles.yingchuan!, c, gameData)
    // 构造必败终局：我方全灭
    const s0 = autoPlayDef(def, 42)
    const lost = { ...s0.state, finished: 'lost' as const }
    const s = settleBattle(c, def, lost, gameData)
    expect(s.campaign.progress).toBe(0)
    expect(currentBattleId(s.campaign)).toBe('yingchuan')
  })
})

describe('新战役自动对局（多 seed 零错误且可胜）', () => {
  for (const id of ['sishui', 'hulao']) {
    it(`${id}: seeds [1,7,42,2026] 全部零错误且 won`, () => {
      for (const seed of [1, 7, 42, 2026]) {
        const r = autoPlayDef(battles[id]!, seed)
        expect(r.errors, `${id} seed ${seed}`).toEqual([])
        expect(r.finished, `${id} seed ${seed}`).toBe('won')
        expect(r.turn).toBeLessThanOrEqual(battles[id]!.maxTurns)
      }
    })
  }
})
