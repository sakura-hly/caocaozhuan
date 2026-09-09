import { describe, it, expect } from 'vitest'
import { initBattle } from '../../src/engine/engine'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import {
  buildViewModel, moveRangeCells, attackTargets, castableStrategies, spellTargetCells, usableItems,
} from '../../src/game/viewModel'
import { mkState, mkUnit } from '../engine/helpers'

const state0 = initBattle(battles.yingchuan, 42)
// 曹操 lord 在 (2,5)；夏侯惇 cavalry；张辽不在颍川。荀彧 xunyu strategist。
const find = (id: string) => state0.units.find((u) => u.id === id)!

describe('buildViewModel', () => {
  it('初始状态：回合 1、我方行动、5 个可行动单位', () => {
    const vm = buildViewModel(state0, gameData)
    expect(vm.turn).toBe(1)
    expect(vm.currentFaction).toBe('player')
    expect(vm.finished).toBeNull()
    expect(vm.units.filter((v) => v.actionable).map((v) => v.unit.id)).toHaveLength(5)
  })
  it('UnitView 带满血/满蓝（装备加成后）', () => {
    const vm = buildViewModel(state0, gameData)
    const cao = vm.units.find((v) => v.unit.id === 'caocao')!
    expect(cao.maxHp).toBe(cao.unit.base.hp) // 铁剑仅 atk 加成，无 HP 加成
    expect(cao.maxMp).toBeGreaterThanOrEqual(cao.unit.mp)
    // 装备 HP 加成生效：明光铠 +10 HP
    const s = mkState({ units: [mkUnit({ id: 'u1', pos: { x: 2, y: 2 }, equipment: { armor: 'mingguang_armor' } })] })
    const v = buildViewModel(s, gameData).units[0]
    expect(v.maxHp).toBe(v.unit.base.hp + 10)
  })
})

describe('moveRangeCells', () => {
  it('骑兵移动范围不含水面与被占格，含自身所在格', () => {
    const cells = moveRangeCells(state0, 'xiaohoudun', gameData)
    const keys = new Set(cells.map((c) => `${c.x},${c.y}`))
    expect(keys.has(`${find('xiaohoudun').pos.x},${find('xiaohoudun').pos.y}`)).toBe(true)
    for (const c of cells) {
      expect(state0.map[c.y][c.x]).not.toBe('water')
      expect(state0.units.some((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y && u.id !== 'xiaohoudun')).toBe(false)
    }
    expect(cells.length).toBeGreaterThan(4)
  })
  it('已行动单位返回空数组', () => {
    const s = structuredClone(state0)
    const u = s.units.find((x) => x.id === 'caocao')!
    u.acted = true
    expect(moveRangeCells(s, 'caocao', gameData)).toEqual([])
  })
})

describe('attackTargets', () => {
  it('弓兵 d=1 不含、d=2/d=3 含、d=4 不含（minRange 2 maxRange 3）', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'a', classId: 'archer', pos: { x: 3, y: 3 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 4, y: 3 } }),
        mkUnit({ id: 'e2', faction: 'enemy', pos: { x: 5, y: 3 } }),
        mkUnit({ id: 'e3', faction: 'enemy', pos: { x: 6, y: 3 } }),
        mkUnit({ id: 'e4', faction: 'enemy', pos: { x: 7, y: 3 } }),
      ],
    })
    const t = attackTargets(s, 'a', gameData)
    expect(t).toContain('e2')
    expect(t).toContain('e3')
    expect(t).not.toContain('e1')
    expect(t).not.toContain('e4')
  })
})

describe('castableStrategies / spellTargetCells', () => {
  it('荀彧初始可施法 ≥3（含 zhiyu/huoshi）；曹操可施 0 个', () => {
    const s = castableStrategies(state0, 'xunyu', gameData)
    const ids = s.map((x) => x.id)
    expect(ids).toContain('zhiyu')
    expect(ids).toContain('huoshi')
    expect(s.length).toBeGreaterThanOrEqual(3)
    expect(castableStrategies(state0, 'caocao', gameData)).toEqual([])
  })
  it('雨天火石不可施（weather gate）', () => {
    const s = structuredClone(state0)
    s.weather = 'rainy'
    const ids = castableStrategies(s, 'xunyu', gameData).map((x) => x.id)
    expect(ids).not.toContain('huoshi')
    expect(ids).toContain('zhiyu')
  })
  it('治疗术目标格含自身；攻击法术目标格不含自身（射程 3 → 曼哈顿圆盘）', () => {
    const heal = spellTargetCells(state0, 'xunyu', 'zhiyu', gameData)
    const self = find('xunyu').pos
    expect(heal.some((c) => c.x === self.x && c.y === self.y)).toBe(true)
    expect(heal).toHaveLength(25) // range 3 曼哈顿全格
    const fire = spellTargetCells(state0, 'xunyu', 'huoshi', gameData)
    expect(fire.some((c) => c.x === self.x && c.y === self.y)).toBe(false)
    expect(fire).toHaveLength(24)
  })
})

describe('usableItems', () => {
  it('曹操初始携带 1 个可用道具', () => {
    const items = usableItems(find('caocao'), gameData)
    expect(items.length).toBe(1)
    expect(items[0].kind).toBe('consumable')
  })
})

describe('空值契约', () => {
  it('已移动单位移动范围为空', () => {
    const s = structuredClone(state0)
    s.units.find((x) => x.id === 'caocao')!.moved = true
    expect(moveRangeCells(s, 'caocao', gameData)).toEqual([])
  })
  it('未知 unitId 移动范围为空', () => {
    expect(moveRangeCells(state0, 'nope', gameData)).toEqual([])
  })
  it('未知 strategyId 施法目标格为空', () => {
    expect(spellTargetCells(state0, 'xunyu', 'nope', gameData)).toEqual([])
  })
  it('MP 低于消耗的法术不在可施列表', () => {
    const s = structuredClone(state0)
    s.units.find((x) => x.id === 'xunyu')!.mp = 3
    expect(castableStrategies(s, 'xunyu', gameData).map((x) => x.id)).not.toContain('zhiyu')
  })
})
