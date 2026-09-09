import { describe, it, expect } from 'vitest'
import type { BattleState, EngineError, GameEvent } from '../../src/engine/types'
import type { UiState } from '../../src/game/orchestrator'
import { BattleOrchestrator } from '../../src/game/orchestrator'

interface Captured {
  states: BattleState[]
  events: GameEvent[][]
  errors: EngineError[]
  ui: UiState[]
}
function mkHarness(seed = 42): { orch: BattleOrchestrator; cap: Captured } {
  const cap: Captured = { states: [], events: [], errors: [], ui: [] }
  const orch = new BattleOrchestrator('yingchuan', seed, {
    onState: (s, ui) => { cap.states.push(s); cap.ui.push(ui) },
    onEvents: (ev) => { cap.events.push(ev) },
    onError: (e) => { cap.errors.push(e) },
  })
  return { orch, cap }
}

describe('BattleOrchestrator 初始化', () => {
  it('构造即发 battleStarted 并排队开场对话；回合 1 我方行动', () => {
    const { orch, cap } = mkHarness()
    expect(cap.events[0]).toEqual([{ type: 'battleStarted', battleId: 'yingchuan' }])
    expect(orch.uiState.dialogueQueue).toEqual(['yc_start'])
    expect(orch.state.turn).toBe(1)
    expect(orch.state.factionOrder[orch.state.factionIndex]).toBe('player')
    expect(cap.errors).toEqual([])
  })
  it('未知战役 id 抛错', () => {
    expect(() => new BattleOrchestrator('nope', 1, { onState: () => {}, onEvents: () => {}, onError: () => {} })).toThrow()
  })
})

describe('选中 / 移动 / 撤销', () => {
  it('选曹操 → 移动 → canUndo → 撤销回到原位', () => {
    const { orch, cap } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    const ui1 = cap.ui.at(-1)!
    expect(ui1.selectedUnitId).toBe('caocao')
    const from = orch.state.units.find((u) => u.id === 'caocao')!.pos
    const to = pickAdjacent(orch, 'caocao')
    orch.dispatch({ type: 'moveTo', to })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.pos).toEqual(to)
    expect(orch.uiState.canUndo).toBe(true)
    orch.dispatch({ type: 'undoMove' })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.pos).toEqual(from)
    expect(orch.uiState.canUndo).toBe(false)
    expect(cap.errors).toEqual([])
  })
  it('不可达格移动被引擎拒绝并上报错误', () => {
    const { orch, cap } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    orch.dispatch({ type: 'moveTo', to: { x: 0, y: 0 } }) // 左上远处
    expect(cap.errors.length).toBe(1)
    expect(cap.errors[0]!.code).toBe('OUT_OF_MOVE_RANGE')
  })
  it('撤销后 preMove 快照重置：改道另一邻格再撤销仍回原位', () => {
    const { orch } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    const from = orch.state.units.find((u) => u.id === 'caocao')!.pos
    const a = pickAdjacent(orch, 'caocao')
    orch.dispatch({ type: 'moveTo', to: a })
    orch.dispatch({ type: 'undoMove' })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.pos).toEqual(from)
    const b = pickAdjacent(orch, 'caocao', 1) // 与 a 不同的另一邻格
    expect(b).not.toEqual(a)
    orch.dispatch({ type: 'moveTo', to: b })
    orch.dispatch({ type: 'undoMove' })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.pos).toEqual(from)
    expect(orch.uiState.canUndo).toBe(false)
  })
  it('选中敌方单位被拒绝', () => {
    const { orch, cap } = mkHarness()
    const enemy = orch.state.units.find((u) => u.faction === 'enemy')!
    orch.dispatch({ type: 'selectUnit', unitId: enemy.id })
    expect(cap.errors[0]!.code).toBe('CANNOT_TARGET')
    expect(orch.uiState.selectedUnitId).toBeNull()
  })
})

describe('攻击 / 待机', () => {
  it('远程目标攻击被拒（NOT_IN_RANGE）', () => {
    const { orch, cap } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    // 颍川敌军全在东侧（x≥11），无 y>6 者；改按曼哈顿距离取远敌（曹操近战射程 1）
    const from = orch.state.units.find((u) => u.id === 'caocao')!.pos
    const far = orch.state.units.find(
      (u) => u.faction === 'enemy' && Math.abs(u.pos.x - from.x) + Math.abs(u.pos.y - from.y) > 4,
    )!
    orch.dispatch({ type: 'attack', targetId: far.id })
    expect(cap.errors[0]!.code).toBe('NOT_IN_RANGE')
  })
  it('待机：单位 acted、选中清空', () => {
    const { orch } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    orch.dispatch({ type: 'wait' })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.acted).toBe(true)
    expect(orch.uiState.selectedUnitId).toBeNull()
  })
})

describe('道具 / 施法', () => {
  it('useItem 全链路：满血使用合法，道具消耗、acted、选中清空', () => {
    const { orch, cap } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    orch.dispatch({ type: 'useItem', itemId: 'jinchuang_yao' }) // 满血：治疗量 0 但 itemUsed 照发
    expect(cap.errors).toEqual([])
    const cc = orch.state.units.find((u) => u.id === 'caocao')!
    expect(cc.acted).toBe(true)
    expect(cc.items).not.toContain('jinchuang_yao')
    expect(orch.uiState.selectedUnitId).toBeNull()
  })
  it('cast 全链路：荀彧自疗（治愈），mp 扣减、acted、选中清空', () => {
    const { orch, cap } = mkHarness()
    const xunyu = orch.state.units.find((u) => u.id === 'xunyu')!
    expect(xunyu.mp).toBe(20) // 前置：strategist 1 级基值，治愈 mpCost 6
    orch.dispatch({ type: 'selectUnit', unitId: 'xunyu' })
    orch.dispatch({ type: 'cast', strategyId: 'zhiyu', target: { ...xunyu.pos } })
    expect(cap.errors).toEqual([])
    const after = orch.state.units.find((u) => u.id === 'xunyu')!
    expect(after.acted).toBe(true)
    expect(after.mp).toBe(14)
    expect(orch.uiState.selectedUnitId).toBeNull()
  })
})

describe('endTurn 批量推进', () => {
  it('一次 endTurn 跑完敌方回合回到玩家：回合 2，事件序列完整，对话进队列', () => {
    const { orch, cap } = mkHarness(7)
    orch.dispatch({ type: 'endTurn' })
    const batch = cap.events.slice(1).flat()
    const types = batch.map((e) => e.type)
    expect(types[0]).toBe('turnEnded')
    expect(types).toContain('turnStarted')
    expect(types.filter((t) => t === 'turnStarted').length).toBeGreaterThanOrEqual(2) // enemy + player
    // AI 至少做过一次移动或攻击
    expect(types.some((t) => t === 'unitMoved' || t === 'attackLaunched')).toBe(true)
    expect(types).toContain('roundStarted')
    expect(orch.state.turn).toBe(2)
    expect(orch.state.factionOrder[orch.state.factionIndex]).toBe('player')
    expect(cap.errors).toEqual([])
  })
  it('同 seed 两次对局状态完全一致（确定性）', () => {
    const a = mkHarness(7)
    const b = mkHarness(7)
    a.orch.dispatch({ type: 'endTurn' })
    b.orch.dispatch({ type: 'endTurn' })
    expect(JSON.stringify(a.orch.state)).toBe(JSON.stringify(b.orch.state))
  })
})

describe('对话队列', () => {
  it('acknowledgeDialogue 逐条出队', () => {
    const { orch } = mkHarness()
    expect(orch.uiState.dialogueQueue).toHaveLength(1)
    orch.acknowledgeDialogue()
    expect(orch.uiState.dialogueQueue).toHaveLength(0)
  })
})

/** 测试助手：选中单位的第 index 个可达邻格（不含原地）。 */
function pickAdjacent(orch: BattleOrchestrator, unitId: string, index = 0): { x: number; y: number } {
  const u = orch.state.units.find((x) => x.id === unitId)!
  const neigh = [
    { x: u.pos.x + 1, y: u.pos.y }, { x: u.pos.x - 1, y: u.pos.y },
    { x: u.pos.x, y: u.pos.y + 1 }, { x: u.pos.x, y: u.pos.y - 1 },
  ].filter((c) =>
    c.y >= 0 && c.y < orch.state.map.length && c.x >= 0 && c.x < orch.state.map[0].length
    && orch.state.map[c.y][c.x] !== 'water'
    && !orch.state.units.some((o) => o.alive && o.pos.x === c.x && o.pos.y === c.y),
  )
  if (neigh.length <= index) throw new Error('无可达邻格，改用 moveRangeCells 取一格')
  return neigh[index]!
}
