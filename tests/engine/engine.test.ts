import { describe, it, expect } from 'vitest'
import { apply, initBattle } from '../../src/engine/engine'
import { gameData, mkBattle, mkState, mkUnit } from './helpers'

describe('initBattle', () => {
  it('回合=1、玩家先手、未结束', () => {
    const s = initBattle(mkBattle({ units: [mkUnit({ id: 'p1' })] }), 42)
    expect(s.turn).toBe(1)
    expect(s.factionOrder[s.factionIndex]).toBe('player')
    expect(s.finished).toBeNull()
  })
})

describe('move 指令', () => {
  // 夹具带一名敌方单位：无敌人的 annihilate 战场会让首次 move 即判胜（finished='won'），
  // 后续指令命中 BATTLE_ENDED 而非本组测试关注的 moved/范围校验。
  const state = () => mkState({
    units: [
      mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 } }),
      mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } }),
    ],
  })

  it('合法移动：位置更新 + moved 置位 + unitMoved 事件', () => {
    const r = apply(state(), { type: 'move', unitId: 'p1', to: { x: 4, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state.units[0].pos).toEqual({ x: 4, y: 2 })
      expect(r.state.units[0].moved).toBe(true)
      expect(r.events.some((e) => e.type === 'unitMoved')).toBe(true)
    }
  })
  it('apply 不改写入参状态（不可变约定）', () => {
    const s = state()
    const snapshot = structuredClone(s)
    const r = apply(s, { type: 'move', unitId: 'p1', to: { x: 4, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    expect(s).toEqual(snapshot) // 原状态深相等，未被突变
  })
  it('超范围移动 → OUT_OF_MOVE_RANGE', () => {
    const r = apply(state(), { type: 'move', unitId: 'p1', to: { x: 7, y: 6 } }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'OUT_OF_MOVE_RANGE', unitId: 'p1' } })
  })
  it('已移动过的单位不能再移动', () => {
    const r1 = apply(state(), { type: 'move', unitId: 'p1', to: { x: 3, y: 2 } }, gameData)
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    const r2 = apply(r1.state, { type: 'move', unitId: 'p1', to: { x: 5, y: 2 } }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'UNIT_ALREADY_ACTED', unitId: 'p1' } })
  })
  it('踩宝物格 → rewards + treasureFound 事件', () => {
    const s = mkState({
      units: [mkUnit({ id: 'p1', pos: { x: 1, y: 1 } })],
      treasureCells: [{ cell: { x: 2, y: 1 }, itemId: 'jinchuang_yao', found: false }],
    })
    const r = apply(s, { type: 'move', unitId: 'p1', to: { x: 2, y: 1 } }, gameData)
    expect(r.ok && r.state.rewards).toEqual(['jinchuang_yao'])
    expect(r.ok && r.events.some((e) => e.type === 'treasureFound')).toBe(true)
  })
  it('敌方回合单位不受玩家指令控制', () => {
    const s = mkState({ units: [mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })] })
    const r = apply(s, { type: 'move', unitId: 'e1', to: { x: 6, y: 4 } }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'NOT_YOUR_TURN', unitId: 'e1', faction: 'player' } })
  })
})

describe('wait / endTurn', () => {
  it('wait 置 acted', () => {
    const s = mkState({ units: [mkUnit({ id: 'p1' })] })
    const r = apply(s, { type: 'wait', unitId: 'p1' }, gameData)
    expect(r.ok && r.state.units[0].acted).toBe(true)
  })
  it('endTurn → 敌方回合、敌方单位标志重置、事件成对', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 }, acted: true, moved: true }),
      ],
    })
    const r = apply(s, { type: 'endTurn' }, gameData)
    expect(r.ok && r.state.factionOrder[r.state.factionIndex]).toBe('enemy')
    expect(r.ok && r.state.units[1].acted).toBe(false)
    expect(r.ok && r.events.some((e) => e.type === 'turnEnded' && e.faction === 'player')).toBe(true)
    expect(r.ok && r.events.some((e) => e.type === 'turnStarted' && e.faction === 'enemy')).toBe(true)
  })
})

describe('基础胜负（annihilate + 全灭/君主阵亡）', () => {
  it('场上无敌人 → won，此后指令 BATTLE_ENDED', () => {
    const s = mkState({ units: [mkUnit({ id: 'p1' })] })
    const r = apply(s, { type: 'wait', unitId: 'p1' }, gameData)
    expect(r.ok && r.state.finished).toBe('won')
    const r2 = apply(r.ok ? r.state : s, { type: 'endTurn' }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'BATTLE_ENDED' } })
  })
  it('我方全灭 → lost', () => {
    const s = mkState({ units: [mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })] })
    const r = apply(s, { type: 'endTurn' }, gameData)
    expect(r.ok && r.state.finished).toBe('lost')
  })
})
