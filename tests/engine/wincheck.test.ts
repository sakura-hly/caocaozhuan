import { describe, it, expect } from 'vitest'
import { evaluate } from '../../src/engine/wincheck'
import { gameData, mkState, mkUnit } from './helpers'
import { apply } from '../../src/engine/engine'

describe('evaluate 胜利条件', () => {
  it('killCommander：主将阵亡即胜（杂兵尚存）', () => {
    const s = mkState({
      win: { kind: 'killCommander', unitId: 'boss' },
      units: [
        mkUnit({ id: 'p1' }),
        mkUnit({ id: 'boss', faction: 'enemy', pos: { x: 6, y: 5 }, alive: false }),
        mkUnit({ id: 'mob', faction: 'enemy', pos: { x: 6, y: 4 } }),
      ],
    })
    expect(evaluate(s).won).toBe(true)
  })
  it('survive：回合数超过坚守目标即胜', () => {
    const s = mkState({
      win: { kind: 'survive', untilTurn: 5 },
      turn: 6,
      units: [mkUnit({ id: 'p1' }), mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })],
    })
    expect(evaluate(s).won).toBe(true)
  })
  it('reach：指定单位抵达目标格即胜（经 move 指令验证）', () => {
    const s = mkState({
      win: { kind: 'reach', unitId: 'p1', cell: { x: 3, y: 0 } },
      units: [mkUnit({ id: 'p1', pos: { x: 1, y: 0 } })],
    })
    const r = apply(s, { type: 'move', unitId: 'p1', to: { x: 3, y: 0 } }, gameData)
    expect(r.ok && r.state.finished).toBe('won')
  })
  it('maxTurns 超限 → 失败', () => {
    const s = mkState({
      turn: 21, maxTurns: 20,
      units: [mkUnit({ id: 'p1' }), mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })],
    })
    expect(evaluate(s).lost).toBe(true)
  })
  it('君主（lord）阵亡 → 失败', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', classId: 'lord', alive: false }),
        mkUnit({ id: 'p2', pos: { x: 1, y: 0 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } }),
      ],
    })
    expect(evaluate(s).lost).toBe(true)
  })
  it('残局回合语义：敌全灭但 reach 未达成时每次 endTurn 即一整轮（turn 逐指令 +1）', () => {
    const s = mkState({
      win: { kind: 'reach', unitId: 'p1', cell: { x: 7, y: 5 } },
      units: [
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 }, acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 }, alive: false }),
      ],
    })
    // 敌方已全灭但 reach 未达成：战斗未结束，阵营循环绕回玩家即新轮
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok && r2.state.turn).toBe(3)
    expect(r2.ok && r2.state.finished).toBeNull()
  })
})
