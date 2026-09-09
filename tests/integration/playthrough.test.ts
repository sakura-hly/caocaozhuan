import { describe, it, expect } from 'vitest'
import type { BattleState, GameEvent } from '../../src/engine/types'
import { apply, decideUnitAction } from '../../src/engine'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { loadBattle } from '../../src/game/bootstrap'
import { runFactionTurn } from '../../src/game/aiRunner'

const factionOf = (s: BattleState) => s.factionOrder[s.factionIndex]

/** 双方全 AI 自动对局：返回终局状态与累计错误（指令被引擎拒绝即错误）。 */
function autoPlay(seed: number): { errors: string[]; finished: BattleState['finished']; turn: number; events: GameEvent[] } {
  let s = loadBattle('yingchuan', seed)
  const errors: string[] = []
  const events: GameEvent[] = []
  for (let guard = 0; guard < 500 && s.finished === null; guard++) {
    if (factionOf(s) === 'player') {
      for (const u of s.units) {
        if (s.finished !== null || u.faction !== 'player' || !u.alive || u.acted) continue
        for (const cmd of decideUnitAction(s, u.id, gameData)) {
          if (s.finished !== null) break
          const r = apply(s, cmd, gameData)
          if (!r.ok) {
            errors.push(`player ${u.id}: ${JSON.stringify(cmd)} → ${JSON.stringify(r.error)}`)
            break
          }
          s = r.state
          events.push(...r.events)
        }
      }
    } else {
      const aiFaction = factionOf(s)
      const r = runFactionTurn(s, aiFaction, gameData)
      s = r.state
      events.push(...r.events)
      for (const e of r.errors) errors.push(`${aiFaction}: ${JSON.stringify(e)}`)
    }
    if (s.finished === null) {
      const r = apply(s, { type: 'endTurn' }, gameData)
      if (!r.ok) {
        errors.push(`endTurn: ${JSON.stringify(r.error)}`)
        break
      }
      s = r.state
      events.push(...r.events)
    }
  }
  return { errors, finished: s.finished, turn: s.turn, events }
}

describe('颍川之战全流程自动对局', () => {
  it('seed 42：零错误、正常终局、未超回合上限', () => {
    const r = autoPlay(42)
    expect(r.errors).toEqual([])
    expect(r.finished).toBe('won')
    expect(r.turn).toBeLessThanOrEqual(battles.yingchuan.maxTurns)
    expect(r.events.some((e) => e.type === 'battleWon' || e.type === 'battleLost')).toBe(true)
  })
  it('seed 7：两次运行事件序列逐字节一致（确定性）', () => {
    expect(JSON.stringify(autoPlay(7).events)).toBe(JSON.stringify(autoPlay(7).events))
  })
  it('多 seed 全部正常终局且零错误', () => {
    for (const seed of [1, 7, 42, 2026]) {
      const r = autoPlay(seed)
      expect(r.errors, `seed ${seed}`).toEqual([])
      expect(r.finished, `seed ${seed}`).not.toBeNull()
    }
  })
})
