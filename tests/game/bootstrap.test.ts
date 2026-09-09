import { describe, it, expect } from 'vitest'
import { loadBattle, assertBattleValid, dialogueLines } from '../../src/game/bootstrap'
import { yingchuan } from '../../src/data/battles/yingchuan'
import { gameData } from '../../src/data'
import type { BattleDef } from '../../src/engine/types'

describe('loadBattle', () => {
  it('颍川：回合 1、初始 14 个单位（5+9，增援未入场）', () => {
    const s = loadBattle('yingchuan', 42)
    expect(s.turn).toBe(1)
    expect(s.units).toHaveLength(14)
    expect(s.factionOrder[s.factionIndex]).toBe('player')
  })
  it('未知战役 id 抛错', () => {
    expect(() => loadBattle('nope', 1)).toThrow('未知战役')
  })
})

describe('assertBattleValid', () => {
  it('合法战役通过且返回告警数组', () => {
    expect(assertBattleValid(yingchuan, 'yingchuan')).toEqual([])
  })
  it('越界单位抛出完整错误清单', () => {
    const broken: BattleDef = {
      ...yingchuan,
      units: yingchuan.units.map((u) => (u.id === 'e1' ? { ...u, pos: { x: 99, y: 99 } } : u)),
    }
    expect(() => assertBattleValid(broken, 'broken')).toThrow('越界')
  })
})

describe('dialogueLines', () => {
  it('开场对话 3 行且首行曹操', () => {
    const lines = dialogueLines('yingchuan', 'yc_start')
    expect(lines).toHaveLength(3)
    expect(lines[0]!.speaker).toBe('曹操')
  })
  it('未知对话/未知战役返回空数组', () => {
    expect(dialogueLines('yingchuan', 'nope')).toEqual([])
    expect(dialogueLines('nope', 'yc_start')).toEqual([])
  })
})
