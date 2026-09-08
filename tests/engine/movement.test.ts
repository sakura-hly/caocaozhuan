import { describe, it, expect } from 'vitest'
import { moveCostFor, computeMoveRange, pathTo, attackRangeCells, inRange, manhattan } from '../../src/engine/movement'
import { terrains } from '../../src/data/terrains'
import type { TerrainId, Unit } from '../../src/engine/types'

function mkUnit(id: string, classId: Unit['classId'], pos: { x: number; y: number }): Unit {
  return {
    id, heroId: '', name: id, faction: 'player', classId, level: 1, exp: 0,
    base: { hp: 50, mp: 0, atk: 10, def: 8, spirit: 5, agi: 8 }, hp: 50, mp: 0,
    pos, equipment: {}, items: [], statuses: [], moved: false, acted: false, alive: true,
  }
}

describe('moveCostFor', () => {
  it('数字型消耗直接返回', () => {
    expect(moveCostFor(terrains.plain, 'cavalry')).toBe(1)
  })
  it('对象型消耗按兵种取值，缺省用 default', () => {
    expect(moveCostFor(terrains.forest, 'infantry')).toBe(1)
    expect(moveCostFor(terrains.forest, 'cavalry')).toBe(2)
  })
  it('骑兵不可入山地（Infinity）', () => {
    expect(moveCostFor(terrains.mountain, 'cavalry')).toBe(Infinity)
    expect(moveCostFor(terrains.mountain, 'infantry')).toBe(2)
  })
})

describe('computeMoveRange', () => {
  // 8x6 平原
  const map: TerrainId[][] = Array.from({ length: 6 }, () => Array(8).fill('plain'))

  it('步兵移动力 4 在空旷平原可达曼哈顿距离 ≤4 的格子', () => {
    const u = mkUnit('u1', 'infantry', { x: 4, y: 3 })
    const r = computeMoveRange(map, [u], u, terrains)
    expect(r.cells.has('3,3')).toBe(true)  // 距离 1
    expect(r.cells.has('0,3')).toBe(true)  // 距离 4
    expect(r.cells.has('4,7')).toBe(false) // 越界
    expect(r.cells.has('0,2')).toBe(false) // 距离 5
  })

  it('单位占据的格子不可停留', () => {
    const u = mkUnit('u1', 'cavalry', { x: 2, y: 2 })
    const blocker = mkUnit('e1', 'infantry', { x: 3, y: 2 })
    const r = computeMoveRange(map, [u, blocker], u, terrains)
    expect(r.cells.has('3,2')).toBe(false)
  })

  it('绕开阻挡单位（骑兵移动力足够时可绕行到达其后）', () => {
    const u = mkUnit('u1', 'cavalry', { x: 2, y: 2 })
    const blocker = mkUnit('e1', 'infantry', { x: 3, y: 2 })
    const r = computeMoveRange(map, [u, blocker], u, terrains)
    expect(r.cells.has('4,2')).toBe(true) // 绕 (3,1)/(3,3) 到达
  })

  it('路径还原：从起点到终点', () => {
    const u = mkUnit('u1', 'infantry', { x: 1, y: 1 })
    const r = computeMoveRange(map, [u], u, terrains)
    const p = pathTo(r.prev, u.pos, { x: 3, y: 2 })
    expect(p[0]).toEqual({ x: 1, y: 1 })
    expect(p[p.length - 1]).toEqual({ x: 3, y: 2 })
    // 相邻步曼哈顿距离为 1
    for (let i = 1; i < p.length; i++) expect(manhattan(p[i - 1], p[i])).toBe(1)
  })
})

describe('attackRangeCells / inRange', () => {
  it('弓兵 [2,3] 射程不含相邻格', () => {
    expect(inRange({ x: 0, y: 0 }, { x: 1, y: 0 }, 2, 3)).toBe(false)
    expect(inRange({ x: 0, y: 0 }, { x: 2, y: 0 }, 2, 3)).toBe(true)
    expect(inRange({ x: 0, y: 0 }, { x: 3, y: 0 }, 2, 3)).toBe(true)
    expect(inRange({ x: 0, y: 0 }, { x: 4, y: 0 }, 2, 3)).toBe(false)
  })
  it('attackRangeCells 含边界且在地图内', () => {
    const cells = attackRangeCells({ x: 0, y: 0 }, 1, 1, 8, 6)
    expect(cells).toContainEqual({ x: 1, y: 0 })
    expect(cells).toContainEqual({ x: 0, y: 1 })
    expect(cells).not.toContainEqual({ x: -1, y: 0 })
    expect(cells).not.toContainEqual({ x: 0, y: 0 })
  })
})
