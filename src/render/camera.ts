import type { Cell } from '../engine/types'

export const TILE = 32
export interface Camera { x: number; y: number }

/** 世界小于视口时居中（负偏移）；否则夹在 [0, world-view]。 */
export function clampCamera(cam: Camera, mapW: number, mapH: number, viewW: number, viewH: number): Camera {
  const cx = mapW <= viewW ? Math.round((mapW - viewW) / 2) : Math.min(Math.max(0, cam.x), mapW - viewW)
  const cy = mapH <= viewH ? Math.round((mapH - viewH) / 2) : Math.min(Math.max(0, cam.y), mapH - viewH)
  return { x: Math.round(cx), y: Math.round(cy) }
}

export function screenToCell(px: number, py: number, cam: Camera): Cell {
  return { x: Math.floor((px + cam.x) / TILE), y: Math.floor((py + cam.y) / TILE) }
}

export function cellToScreen(c: Cell, cam: Camera): { x: number; y: number } {
  return { x: c.x * TILE - cam.x, y: c.y * TILE - cam.y }
}

export function centerOnCell(c: Cell, viewW: number, viewH: number): Camera {
  return { x: c.x * TILE + TILE / 2 - viewW / 2, y: c.y * TILE + TILE / 2 - viewH / 2 }
}
