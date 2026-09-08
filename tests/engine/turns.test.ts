import { describe, it, expect } from 'vitest'
import { apply } from '../../src/engine/engine'
import { gameData, mkState, mkUnit } from './helpers'

function twoFactionState() {
  return mkState({
    units: [
      mkUnit({ id: 'p1', acted: true, moved: true }),
      mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } }),
    ],
  })
}

describe('回合推进', () => {
  it('两阵营各结束一次 → 新一轮（turn=2）+ roundStarted + 回到玩家', () => {
    const r1 = apply(twoFactionState(), { type: 'endTurn' }, gameData)
    expect(r1.ok && r1.state.factionOrder[r1.state.factionIndex]).toBe('enemy')
    const r2 = apply(r1.ok ? r1.state : twoFactionState(), { type: 'endTurn' }, gameData)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.state.turn).toBe(2)
    expect(r2.state.factionOrder[r2.state.factionIndex]).toBe('player')
    expect(r2.events.some((e) => e.type === 'roundStarted' && e.turn === 2)).toBe(true)
    expect(r2.events.some((e) => e.type === 'turnStarted' && e.faction === 'player' && e.turn === 2)).toBe(true)
  })

  it('weatherScript 在指定回合改变天气', () => {
    const s = { ...twoFactionState(), weatherScript: [{ turn: 2, weather: 'rainy' as const }] }
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok && r2.state.weather).toBe('rainy')
    expect(r2.ok && r2.events.some((e) => e.type === 'weatherChanged' && e.weather === 'rainy')).toBe(true)
  })

  it('增援在指定回合登场', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 }, acted: true, moved: true }),
      ],
      reinforcements: [{ turn: 2, entries: [{ unit: mkUnit({ id: 'r1', faction: 'enemy', pos: { x: 0, y: 0 } }), at: { x: 7, y: 5 } }] }],
    })
    const r1 = apply(s, { type: 'endTurn' }, gameData) // → 敌方回合
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData) // → 新一轮
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    const r1u = r2.state.units.find((u) => u.id === 'r1')
    expect(r1u).toBeDefined()
    expect(r1u!.pos).toEqual({ x: 7, y: 5 })
    expect(r2.events.some((e) => e.type === 'reinforcementsArrived' && e.unitIds.includes('r1'))).toBe(true)
  })

  it('回合对话在指定回合触发', () => {
    const s = { ...twoFactionState(), dialogues: [{ turn: 2, dialogueId: 'yc_reinforce' }] }
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok && r2.events.some((e) => e.type === 'dialogueTriggered' && e.dialogueId === 'yc_reinforce')).toBe(true)
  })

  it('状态效果按归属阵营回合递减', () => {
    const s = mkState({
      units: [mkUnit({ id: 'p1', statuses: [{ kind: 'defdown', turns: 3 }] })],
    })
    // 玩家回合开始时递减：先打完敌我各一回合再观察
    const r1 = apply({ ...s, factionIndex: 1 }, { type: 'endTurn' }, gameData) // enemy→player(新轮)
    const p = r1.ok ? r1.state.units[0].statuses : []
    expect(p.length).toBe(1)
    expect(p[0].turns).toBe(2)
  })
})
