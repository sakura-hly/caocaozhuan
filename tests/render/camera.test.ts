import { describe, it, expect } from 'vitest'
import { TILE, clampCamera, screenToCell, cellToScreen, centerOnCell } from '../../src/render/camera'

describe('镜头纯函数', () => {
  it('TILE 常量为 32', () => {
    expect(TILE).toBe(32)
  })
  it('地图大于视口时 clamp 到边界', () => {
    // 世界 16×12 格 = 512×384px，视口 320×240
    expect(clampCamera({ x: -50, y: -10 }, 512, 384, 320, 240)).toEqual({ x: 0, y: 0 })
    expect(clampCamera({ x: 999, y: 999 }, 512, 384, 320, 240)).toEqual({ x: 192, y: 144 })
    expect(clampCamera({ x: 100, y: 100 }, 512, 384, 320, 240)).toEqual({ x: 100, y: 100 })
  })
  it('地图小于视口时居中（负坐标，世界画在视口中央）', () => {
    // 世界 4×3 格 = 128×96px，视口 320×240 → 相机 = (world-view)/2 = (-96, -72)
    expect(clampCamera({ x: 0, y: 0 }, 128, 96, 320, 240)).toEqual({ x: -96, y: -72 })
    expect(clampCamera({ x: 999, y: 999 }, 128, 96, 320, 240)).toEqual({ x: -96, y: -72 })
    // 负相机下世界 (0,0) 格画在屏幕 (96,72)：逆换算仍成立
    expect(screenToCell(96, 72, { x: -96, y: -72 })).toEqual({ x: 0, y: 0 })
  })
  it('screenToCell 与 cellToScreen 互逆（含镜头偏移）', () => {
    const cam = { x: 33, y: 17 }
    const px = 100, py = 200
    const cell = screenToCell(px, py, cam)
    expect(cell).toEqual({ x: Math.floor((100 + 33) / 32), y: Math.floor((200 + 17) / 32) })
    const back = cellToScreen(cell, cam)
    expect(px - back.x).toBeLessThan(TILE)
    expect(py - back.y).toBeLessThan(TILE)
    expect(back.x).toBeGreaterThanOrEqual(0)
  })
  it('centerOnCell 把指定格放到视口中心', () => {
    expect(centerOnCell({ x: 8, y: 6 }, 320, 240)).toEqual({ x: 8 * 32 - 160 + 16, y: 6 * 32 - 120 + 16 })
  })
})
