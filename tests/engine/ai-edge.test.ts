import { describe, it, expect } from 'vitest'
import type { Command, Unit } from '../../src/engine/types'
import { apply, decideUnitAction } from '../../src/engine'
import { gameData } from '../../src/data'
import { mkBattle, mkUnit, stateFromBattle } from './helpers'

// mkBattle 默认 factionOrder ['player','enemy']、factionIndex 0，player 可动
const stateFrom = (units: Unit[]) => stateFromBattle(mkBattle({ units }))

const run = (s: ReturnType<typeof stateFrom>, cmds: Command[]) => {
  let st = s
  for (const c of cmds) {
    const r = apply(st, c, gameData)
    expect(r.ok, JSON.stringify(c)).toBe(true) // M-1：AI 产出的指令必须全部可执行
    if (r.ok) st = r.state
  }
  return st
}

describe('M-1 已移动单位守卫', () => {
  it('moved 步兵邻接敌军：不发 move、从原地攻击、全部指令可执行', () => {
    const s = stateFrom([
      mkUnit({ id: 'p1', faction: 'player', classId: 'infantry', pos: { x: 3, y: 3 }, moved: true }),
      mkUnit({ id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 3 } }),
    ])
    const cmds = decideUnitAction(s, 'p1', gameData)
    expect(cmds.some((c) => c.type === 'move')).toBe(false)
    expect(cmds.some((c) => c.type === 'attack' && c.targetId === 'e1')).toBe(true)
    run(s, cmds)
  })
  it('moved 弓兵仅 d=1 敌军（minRange 2）：恰返回 [wait]', () => {
    const s = stateFrom([
      mkUnit({ id: 'p1', faction: 'player', classId: 'archer', pos: { x: 3, y: 3 }, moved: true }),
      mkUnit({ id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 3 } }),
    ])
    expect(decideUnitAction(s, 'p1', gameData)).toEqual([{ type: 'wait', unitId: 'p1' }])
  })
})

describe('M-4 治疗口径统一 effectiveStats', () => {
  it('装备加血的重伤友军（hp ≥ base.hp/2 但 < eff.hp/2）会被治疗', () => {
    // w1：base.hp 50（mkUnit 默认）+ 明光铠 hp+10 → 有效 60；hp=28：< 30（新口径触发）且 ≥ 25（旧口径不触发）
    // ⚠️ 装备必须挂 equipment 字段——effectiveStats 只读 u.equipment，items 无效
    // 布局：p1 距 h1 = 12 > move 4 + 火矢射程 3 → 攻击法术不可及，治愈是唯一正分选项（否则火矢 38.4 分压过治愈 32 分）
    const s = stateFrom([
      mkUnit({ id: 'h1', faction: 'enemy', classId: 'strategist', pos: { x: 0, y: 0 }, mp: 30 }),
      mkUnit({ id: 'w1', faction: 'enemy', classId: 'infantry', pos: { x: 0, y: 1 }, hp: 28, equipment: { armor: 'mingguang_armor' } }),
      mkUnit({ id: 'p1', faction: 'player', classId: 'infantry', pos: { x: 7, y: 5 } }),
    ])
    const cmds = decideUnitAction(s, 'h1', gameData)
    expect(cmds.some((c) => c.type === 'cast' && c.strategyId === 'zhiyu')).toBe(true)
  })
})

describe('M-9 射程边界回归锁（GREEN）', () => {
  it('军师对 d=3 恰好射程的法术目标仍会施法', () => {
    const s = stateFrom([
      mkUnit({ id: 'h1', faction: 'enemy', classId: 'strategist', pos: { x: 3, y: 3 }, mp: 30 }),
      mkUnit({ id: 'p1', faction: 'player', classId: 'infantry', pos: { x: 6, y: 3 } }),
    ])
    const cmds = decideUnitAction(s, 'h1', gameData)
    expect(cmds.some((c) => c.type === 'cast')).toBe(true)
  })
  it('弓兵对 d=2（自身 minRange 下沿）目标仍会攻击', () => {
    const s = stateFrom([
      mkUnit({ id: 'a1', faction: 'player', classId: 'archer', pos: { x: 3, y: 3 } }),
      mkUnit({ id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 5, y: 3 } }),
    ])
    const cmds = decideUnitAction(s, 'a1', gameData)
    expect(cmds.some((c) => c.type === 'attack' && c.targetId === 'e1')).toBe(true)
  })
})
