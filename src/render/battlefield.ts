import type { GameData } from '../data'
import type { BattleState, Cell, TerrainId, Unit } from '../engine/types'
import { effectiveStats } from '../engine/internal'
import { TILE, cellToScreen, type Camera } from './camera'
import {
  TERRAIN_PALETTES, WATER_LIGHT, drawUnitSprite, noiseAt,
} from './sprites'

/** 高亮格集合（key 为 `x,y`）。全部为格子坐标，由渲染层换算像素。 */
export interface HighlightLayer { move: Set<string>; attack: Set<string>; spell: Set<string>; hover: Cell | null }

export interface UnitOverride { x?: number; y?: number; alpha?: number; flash?: boolean; forceVisible?: boolean }
export interface FloatText { x: number; y: number; text: string; color: string; alpha: number }
export interface BurstFx { x: number; y: number; color: string; radius: number; alpha: number }

const FACTION_RING: Record<string, string> = { player: '#4a7de0', enemy: '#d84a4a', ally: '#48b068' }
const HL_COLORS = {
  move: 'rgba(70,130,255,0.30)', attack: 'rgba(235,70,60,0.32)', spell: 'rgba(185,90,255,0.32)',
} as const
const cellKey = (c: Cell) => `${c.x},${c.y}`

export class BattlefieldRenderer {
  private ctx: CanvasRenderingContext2D
  private terrainCache: HTMLCanvasElement
  private cam: Camera = { x: 0, y: 0 }
  private highlights: HighlightLayer = { move: new Set(), attack: new Set(), spell: new Set(), hover: null }
  private overrides = new Map<string, UnitOverride>()
  private floats: FloatText[] = []
  private bursts: BurstFx[] = []
  private banner: string | null = null
  private mapRows: string[] = []
  private state: BattleState | null = null

  constructor(private canvas: HTMLCanvasElement, private data: GameData) {
    this.ctx = canvas.getContext('2d')!
    this.mapRows = []
    this.terrainCache = document.createElement('canvas')
  }

  /** 换地图时调用：重建离屏地形缓存（水格留空，逐帧动画）。 */
  setMap(map: string[], mapW: number, mapH: number): void {
    this.mapRows = map
    this.terrainCache = document.createElement('canvas')
    this.terrainCache.width = mapW * TILE
    this.terrainCache.height = mapH * TILE
    const c = this.terrainCache.getContext('2d')!
    for (let y = 0; y < mapH; y++)
      for (let x = 0; x < mapW; x++)
        this.paintTerrainTile(c, x, y, map[y][x] as TerrainId)
  }

  setCamera(cam: Camera): void { this.cam = cam }
  setState(state: BattleState): void { this.state = state }
  setHighlights(hl: HighlightLayer): void { this.highlights = hl }
  setOverrides(o: Map<string, UnitOverride>): void { this.overrides = o }
  setFloats(f: FloatText[]): void { this.floats = f }
  setBursts(b: BurstFx[]): void { this.bursts = b }
  setBanner(text: string | null): void { this.banner = text }

  /** 每帧重画。单位数据来自最近一次 setState（未设置则跳过）。 */
  render(now: number): void {
    if (!this.state) return
    const ctx = this.ctx
    const W = this.canvas.width, H = this.canvas.height
    ctx.fillStyle = '#141210'
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(this.terrainCache, -this.cam.x, -this.cam.y)
    this.renderWater(now)
    this.renderHighlights()
    this.renderUnits()
    this.renderBursts()
    this.renderFloats()
    this.renderBanner(W, H)
  }

  private paintTerrainTile(c: CanvasRenderingContext2D, x: number, y: number, t: TerrainId): void {
    if (t === 'water') return // 水面逐帧动画，不进缓存
    const p = TERRAIN_PALETTES[t]
    const px = x * TILE, py = y * TILE
    c.fillStyle = p.base
    c.fillRect(px, py, TILE, TILE)
    for (let i = 0; i < 6; i++) { // 抖动斑点
      const n = noiseAt(x * 6 + i, y * 6 + i, 7)
      c.fillStyle = n > 0.5 ? p.dark : p.light
      const dx = noiseAt(x + i, y, i) * (TILE - 4)
      const dy = noiseAt(x, y + i, i) * (TILE - 4)
      c.fillRect(px + dx, py + dy, 3, 3)
    }
    if (t === 'forest' || t === 'mountain') { // 深色团块
      c.fillStyle = p.dark
      c.beginPath()
      c.arc(px + TILE / 2, py + TILE / 2, TILE * 0.3, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = p.light
      c.fillRect(px + 6, py + 6, 4, 4)
    }
    if (t === 'city' || t === 'camp') { // 横纹
      c.fillStyle = p.dark
      for (let i = 0; i < 3; i++) c.fillRect(px + 4, py + 6 + i * 8, TILE - 8, 3)
    }
    if (t === 'bridge') { // 板条
      c.fillStyle = p.dark
      for (let i = 0; i < 4; i++) c.fillRect(px, py + 2 + i * 8, TILE, 2)
    }
    c.strokeStyle = 'rgba(0,0,0,0.12)'
    c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1)
  }

  private renderWater(now: number): void {
    const ctx = this.ctx
    const frame = Math.floor(now / 400)
    for (let y = 0; y < this.mapRows.length; y++) {
      for (let x = 0; x < this.mapRows[y].length; x++) {
        if (this.mapRows[y][x] !== 'water') continue
        const p = TERRAIN_PALETTES.water
        const { x: sx, y: sy } = cellToScreen({ x, y }, this.cam)
        if (sx < -TILE || sy < -TILE || sx > this.canvas.width || sy > this.canvas.height) continue
        ctx.fillStyle = p.base
        ctx.fillRect(sx, sy, TILE, TILE)
        if (noiseAt(x, y, frame) > 0.45) { // 波纹闪烁
          ctx.fillStyle = WATER_LIGHT
          ctx.fillRect(sx + 4, sy + 12, TILE - 12, 3)
          ctx.fillRect(sx + 10, sy + 22, TILE - 18, 2)
        }
      }
    }
  }

  private renderHighlights(): void {
    const ctx = this.ctx
    const layer = (set: Set<string>, color: string) => {
      ctx.fillStyle = color
      for (const key of set) {
        const [x, y] = key.split(',').map(Number)
        const { x: sx, y: sy } = cellToScreen({ x, y }, this.cam)
        ctx.fillRect(sx, sy, TILE, TILE)
      }
    }
    layer(this.highlights.move, HL_COLORS.move)
    layer(this.highlights.spell, HL_COLORS.spell)
    layer(this.highlights.attack, HL_COLORS.attack)
    if (this.highlights.hover) {
      const { x: sx, y: sy } = cellToScreen(this.highlights.hover, this.cam)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2)
    }
  }

  private renderUnits(): void {
    const ctx = this.ctx
    const state = this.state!
    for (const u of state.units) {
      const o = this.overrides.get(u.id)
      const visible = u.alive || o?.forceVisible
      if (!visible) continue
      const pos: Cell = { x: o?.x ?? u.pos.x, y: o?.y ?? u.pos.y }
      const { x: sx, y: sy } = cellToScreen(pos, this.cam)
      if (sx < -TILE || sy < -TILE || sx > this.canvas.width || sy > this.canvas.height) continue
      const cx = sx + TILE / 2, cy = sy + TILE - 4
      // 阵营环
      ctx.fillStyle = FACTION_RING[u.faction] ?? '#999'
      ctx.beginPath()
      ctx.ellipse(cx, sy + TILE - 3, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      drawUnitSprite(ctx, u, sx + 2, sy - 18, 1.75, { alpha: o?.alpha, flash: o?.flash })
      // 血条
      const max = effectiveStats(u, this.data).hp
      const w = 26, hp = Math.max(0, Math.min(1, u.hp / max))
      ctx.fillStyle = '#000'
      ctx.fillRect(cx - w / 2 - 1, sy + TILE + 1, w + 2, 5)
      ctx.fillStyle = hp > 0.5 ? '#4ec46a' : hp > 0.25 ? '#e8c04a' : '#e05050'
      ctx.fillRect(cx - w / 2, sy + TILE + 2, w * hp, 3)
      // 已行动半透明
      if (u.acted && u.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(sx, sy, TILE, TILE)
      }
    }
  }

  private renderBursts(): void {
    const ctx = this.ctx
    for (const b of this.bursts) {
      const { x: sx, y: sy } = cellToScreen({ x: b.x, y: b.y }, this.cam)
      ctx.save()
      ctx.globalAlpha = Math.max(0, b.alpha)
      ctx.strokeStyle = b.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(sx + TILE / 2, sy + TILE / 2, 6 + b.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  private renderFloats(): void {
    const ctx = this.ctx
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    for (const f of this.floats) {
      const { x: sx, y: sy } = cellToScreen({ x: f.x, y: f.y }, this.cam)
      ctx.save()
      ctx.globalAlpha = Math.max(0, f.alpha)
      ctx.fillStyle = '#000'
      ctx.fillText(f.text, sx + TILE / 2 + 1, sy + 1)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, sx + TILE / 2, sy)
      ctx.restore()
    }
  }

  private renderBanner(W: number, H: number): void {
    if (!this.banner) return
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(10,8,6,0.75)'
    ctx.fillRect(0, H / 2 - 28, W, 56)
    ctx.strokeStyle = 'rgba(220,190,120,0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(4, H / 2 - 26, W - 8, 52)
    ctx.fillStyle = '#f0e6c8'
    ctx.font = '26px serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.banner, W / 2, H / 2 + 9)
  }
}
