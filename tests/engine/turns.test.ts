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

  it('无天气脚本时 20% 概率随机换天气，同 seed 回放一致', () => {
    // seed=7：首轮 draw=0.0117 < 0.2 → 触发；第二次 draw=0.0620 → 选 cloudy
    const run = () => {
      const s = mkState({
        rngState: 7,
        units: [
          mkUnit({ id: 'p1', acted: true, moved: true }),
          mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } }),
        ],
      })
      const r1 = apply(s, { type: 'endTurn' }, gameData)
      return apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    }
    const a = run()
    const b = run()
    expect(a.ok && a.state.weather).toBe('cloudy')
    expect(a.ok && a.events.some((e) => e.type === 'weatherChanged' && e.weather === 'cloudy')).toBe(true)
    // 回放承诺：同 seed 两次运行事件与 rngState 完全一致
    expect(a.ok && JSON.stringify(a.events)).toBe(b.ok && JSON.stringify(b.events))
    expect(a.ok && a.state.rngState).toBe(b.ok && b.state.rngState)
  })

  it('增援落点被占 → 回退到唯一可用相邻格', () => {
    // (7,5) 是 8×6 地图右下角：界内相邻格只有 (6,5) 与 (7,4)。
    // at(7,5) 被 e1 占据、(6,5) 被 o1 占据 → 唯一可用相邻格是 (7,4)
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 7, y: 5 }, acted: true, moved: true }),
        mkUnit({ id: 'o1', faction: 'enemy', pos: { x: 6, y: 5 }, acted: true, moved: true }),
      ],
      reinforcements: [{ turn: 2, entries: [{ unit: mkUnit({ id: 'r1', faction: 'enemy' }), at: { x: 7, y: 5 } }] }],
    })
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    const u = r2.state.units.find((x) => x.id === 'r1')
    expect(u).toBeDefined()
    expect(u!.pos).toEqual({ x: 7, y: 4 })
    expect(r2.events.some((e) => e.type === 'reinforcementsArrived' && e.unitIds.includes('r1'))).toBe(true)
  })

  it('增援落点及四邻全被占 → reinforcementDropped，不入场', () => {
    const blockers = [
      { x: 4, y: 3 }, // 占住 at
      { x: 5, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 2 }, // 四邻
    ].map((p, i) => mkUnit({ id: 'o' + i, faction: 'enemy', pos: p }))
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 }, acted: true, moved: true }),
        ...blockers,
      ],
      reinforcements: [{ turn: 2, entries: [{ unit: mkUnit({ id: 'r1', faction: 'enemy' }), at: { x: 4, y: 3 } }] }],
    })
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.state.units.some((u) => u.id === 'r1')).toBe(false)
    expect(r2.events.some((e) => e.type === 'reinforcementDropped' && e.unitId === 'r1')).toBe(true)
    expect(r2.events.some((e) => e.type === 'reinforcementsArrived' && e.unitIds.includes('r1'))).toBe(false)
  })

  it('增援与场上同 id（含已亡）→ reinforcementDropped，不重复入场', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 }, acted: true, moved: true }),
        mkUnit({ id: 'r1', faction: 'enemy', pos: { x: 7, y: 5 }, alive: false }),
      ],
      reinforcements: [{ turn: 2, entries: [{ unit: mkUnit({ id: 'r1', faction: 'enemy' }), at: { x: 7, y: 5 } }] }],
    })
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.state.units.filter((u) => u.id === 'r1')).toHaveLength(1)
    expect(r2.state.units.find((u) => u.id === 'r1')!.alive).toBe(false)
    expect(r2.events.some((e) => e.type === 'reinforcementDropped' && e.unitId === 'r1')).toBe(true)
  })

  it('眩晕 + 到期状态：己方回合开始置 acted，到期状态清除', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', statuses: [{ kind: 'stun', turns: 1 }, { kind: 'defdown', turns: 1 }] }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } }),
      ],
      factionIndex: 1,
    })
    const r = apply(s, { type: 'endTurn' }, gameData) // enemy→player(新轮)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const p = r.state.units[0]
    expect(p.acted).toBe(true)
    expect(p.statuses).toEqual([])
  })
})
