import type { Cell, ClassId, TerrainDef, TerrainId, Unit } from './types'
import { classes } from '../data/classes'

export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function cellKey(c: Cell): string { return `${c.x},${c.y}` }

export function moveCostFor(t: TerrainDef, c: ClassId): number {
  if (typeof t.moveCost === 'number') return t.moveCost
  const v = t.moveCost[c]
  return v === undefined ? t.moveCost.default : v
}

export interface MoveRange {
  cells: Map<string, Cell> // 可停留格（含原地）
  prev: Map<string, Cell | null> // 路径前驱
}

/** 一致代价搜索（Dijkstra）：地形消耗不同兵种不同，单位互相阻挡（不可穿越、不可停留）。
 * moveBudget 缺省取兵种自身移动力；引擎侧传入 effectiveMove()（含装备/疾风加成）。 */
export function computeMoveRange(
  map: TerrainId[][], units: Unit[], unit: Unit,
  terrains: Record<TerrainId, TerrainDef>, moveBudget?: number,
): MoveRange {
  const cls = unit.classId
  const budget = moveBudget ?? classes[cls].movePower
  const cells = new Map<string, Cell>()
  const prev = new Map<string, Cell | null>()
  const cost = new Map<string, number>()
  const occupied = new Set(units.filter((u) => u.alive).map((u) => cellKey(u.pos)))
  const h = map.length, w = map[0].length
  const start = unit.pos
  cells.set(cellKey(start), start)
  prev.set(cellKey(start), null)
  cost.set(cellKey(start), 0)
  // 简单优先队列：数组排序（地图 ≤64×64 足够）
  const frontier: Array<{ c: Cell; g: number }> = [{ c: start, g: 0 }]
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.g - b.g)
    const cur = frontier.shift()!
    if (cur.g > (cost.get(cellKey(cur.c)) ?? Infinity)) continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cur.c.x + dx, ny = cur.c.y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const next = { x: nx, y: ny }
      const k = cellKey(next)
      if (occupied.has(k)) continue // 单位阻挡
      const step = moveCostFor(terrains[map[ny][nx]], cls)
      if (!Number.isFinite(step)) continue
      const g = cur.g + step
      if (g > budget) continue
      if (g < (cost.get(k) ?? Infinity)) {
        cost.set(k, g)
        prev.set(k, cur.c)
        if (!cells.has(k)) cells.set(k, next)
        frontier.push({ c: next, g })
      }
    }
  }
  return { cells, prev }
}

export function pathTo(prev: Map<string, Cell | null>, from: Cell, to: Cell): Cell[] {
  const path: Cell[] = []
  let cur: Cell | null = to
  const guard = new Set<string>()
  while (cur) {
    const k = cellKey(cur)
    if (guard.has(k)) break
    guard.add(k)
    path.unshift(cur)
    if (k === cellKey(from)) break
    cur = prev.get(k) ?? null
  }
  return path
}

export function inRange(from: Cell, to: Cell, minRange: number, maxRange: number): boolean {
  const d = manhattan(from, to)
  return d >= minRange && d <= maxRange
}

/** 曼哈顿距离环 [min,max]，限制在 w×h 地图内，不含中心格。 */
export function attackRangeCells(from: Cell, minRange: number, maxRange: number, w: number, h: number): Cell[] {
  const out: Cell[] = []
  for (let y = from.y - maxRange; y <= from.y + maxRange; y++) {
    for (let x = from.x - maxRange; x <= from.x + maxRange; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      if (inRange(from, { x, y }, minRange, maxRange)) out.push({ x, y })
    }
  }
  return out
}
