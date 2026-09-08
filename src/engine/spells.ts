import type { Cell, StrategyDef, TargetShape, Weather } from './types'

/** 法术形状覆盖格（不做地图越界过滤，由调用方负责）。 */
export function shapeCells(target: Cell, shape: TargetShape): Cell[] {
  if (shape === 'single') return [target]
  if (shape === 'cross') {
    return [
      target,
      { x: target.x + 1, y: target.y }, { x: target.x - 1, y: target.y },
      { x: target.x, y: target.y + 1 }, { x: target.x, y: target.y - 1 },
    ]
  }
  const out: Cell[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) out.push({ x: target.x + dx, y: target.y + dy })
  return out
}

/** 雨天火系法术不可用（spec §3.5）。 */
export function castableInWeather(s: StrategyDef, w: Weather): boolean {
  if (s.element === 'fire' && w === 'rainy') return false
  return true
}
