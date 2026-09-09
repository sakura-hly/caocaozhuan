import type { ClassId, Faction, HeroDef, TerrainId, Unit } from '../engine/types'

export const SPRITE_CHARS = new Set(['.', 'o', 's', 'e', 'h', 'H', 'a', 'A', 'w', 'W'])

/** 每兵种 16×16 像素画 —— 剪影必须互不相同（hue 撞色的结构性修复）。 */
export const CLASS_SPRITES: Record<ClassId, string[]> = {
  // 君主：平天冠 + 披风 + 右侧举剑
  lord: [
    '.............w..',
    '..hhhhhhhh....w.',
    '...HHHHHHH....w.',
    '....ssss......w.',
    '....sees......w.',
    '....osso.....aw.',
    '...aaaaaaaa...o.',
    '.Aaaaaaaaa......',
    '.AaaAAAAAAa.....',
    '.AaaaAAAAAAaa...',
    '...aaaaaa.......',
    '....o..o........',
    '....o..o........',
    '....o..o........',
    '...oo..oo.......',
    '................',
  ],
  // 步兵：左手大盾 + 整列长枪
  infantry: [
    '..............W.',
    '....hhhh......W.',
    '...hHHHHh.....W.',
    '....ssss......W.',
    '....sees......W.',
    '....osso......W.',
    'Aaa.aaaaa.....W.',
    'Aaa.aaaaa.....W.',
    'Aaa.AAAAA.....W.',
    'Aaa.aaaaa.....W.',
    'Aaa...........W.',
    '....o..o......W.',
    '....o..o......W.',
    '...oo..oo.....W.',
    '................',
    '................',
  ],
  // 骑兵：横向马身（含整行无透明的体量行）
  cavalry: [
    '....hhhh........',
    '...hHHHHh.......',
    '....ssss........',
    '....sees........',
    '...aaaaa........',
    '...aaAAAa...oo..',
    '.aaaaaaaaaaaaoo.',
    'aaaaaaaaaaaaaaaa',
    'aaaaaAAAAaaaaaaa',
    '.aaaaaaaaaaaaaa.',
    '..o..........o..',
    '..o..........o..',
    '..o..........o..',
    '.oo..........oo.',
    '................',
    '................',
  ],
  // 弓兵：尖帽 + 右侧弓弧
  archer: [
    '.......h........',
    '......hhhh......',
    '.....hHHHHh.....',
    '....ssss...w....',
    '....sees..w.....',
    '....osso..w.....',
    '...aaaaaa.w.....',
    '..aaaaaaaa.w....',
    '..aaaaaaaa.w....',
    '...aaaaaa.w.....',
    '....o..o..w.....',
    '....o..o...w....',
    '....o..o........',
    '...oo..oo.......',
    '................',
    '................',
  ],
  // 军师：高冠 + 摇扇 + 长袍及地（无分腿）
  strategist: [
    '......hh........',
    '.....hhhh.......',
    '....hHHHHh......',
    '....ssss........',
    '....sees........',
    '....osso........',
    '...aaaaaa.ww....',
    '..aaaaaaaa.www.w',
    '...aaaaaa.ww....',
    '...aAAAAAa......',
    '...aaaaaa.......',
    '...aaaaaa.......',
    '...aAAAAAa......',
    '...ooooooo......',
    '................',
    '................',
  ],
  // 道士：兜帽包脸 + 左侧执杖（杖顶宝珠）
  taoist: [
    '.ww.............',
    '.Ww....hhhh.....',
    '.W.....hHHHHh...',
    '.W.....hHHHHh...',
    '.W.....hssseh...',
    '.W.....hseesh...',
    '.W.....hossoh...',
    '.W.....aaaaaa...',
    '.Wo....aaaaaa...',
    '.W.....aAAAAAa..',
    '.W.....aaaaaaa..',
    '.W.....aaaaaaa..',
    '.W.....aAAAAAa..',
    '.W.....ooooooo..',
    '................',
    '................',
  ],
}

/** 阵营甲色相 / 兵种冠色相（拉开 Δ≥90，避免撞色）。 */
export const FACTION_HUES: Record<Faction, number> = { player: 210, enemy: 0, ally: 120 }
export const CLASS_ACCENT_HUES: Record<ClassId, number> = {
  lord: 45, infantry: 205, cavalry: 25, archer: 95, strategist: 275, taoist: 320,
}

export interface SpritePalette { h: string; H: string; a: string; A: string }

const hsl = (hue: number, sat: number, light: number) => `hsl(${hue} ${sat}% ${light}%)`

export function paletteFor(faction: Faction, classId: ClassId): SpritePalette {
  const f = FACTION_HUES[faction]
  const c = CLASS_ACCENT_HUES[classId]
  return { h: hsl(c, 55, 55), H: hsl(c, 55, 35), a: hsl(f, 45, 60), A: hsl(f, 45, 38) }
}

const STATIC_COLORS: Record<string, string> = {
  o: '#26221c', s: '#e8b98a', e: '#1c1c1c', w: '#c8ccd4', W: '#8a8f99',
}

/** 确定性伪随机 [0,1)：地形抖动与水面波纹共用。 */
export function noiseAt(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return Math.abs(v - Math.floor(v))
}

export const TERRAIN_PALETTES: Record<TerrainId, { base: string; dark: string; light: string }> = {
  plain:    { base: '#a8b06a', dark: '#8e9757', light: '#bcc47e' },
  forest:   { base: '#4f7a3c', dark: '#3d6130', light: '#63934c' },
  mountain: { base: '#8d8578', dark: '#6f685d', light: '#a8a094' },
  water:    { base: '#4a78b5', dark: '#3a62a0', light: '#6b9bd0' },
  city:     { base: '#b0a48c', dark: '#948871', light: '#c8bda6' },
  camp:     { base: '#9c7a4f', dark: '#7d603c', light: '#b6946a' },
  pass:     { base: '#9a8f96', dark: '#7a7078', light: '#b3a9b0' },
  bridge:   { base: '#a5814f', dark: '#86683f', light: '#c09a66' },
}

export const WATER_LIGHT = 'rgba(255,255,255,0.35)'

export function drawSprite(
  ctx: CanvasRenderingContext2D, rows: string[], palette: SpritePalette,
  destX: number, destY: number, scale: number,
  opts: { alpha?: number; flash?: boolean } = {},
): void {
  ctx.save()
  ctx.globalAlpha = opts.alpha ?? 1
  const px = Math.ceil(scale)
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x]
      if (ch === '.') continue
      ctx.fillStyle = opts.flash ? '#ffffff'
        : ch === 'h' ? palette.h
        : ch === 'H' ? palette.H
        : ch === 'a' ? palette.a
        : ch === 'A' ? palette.A
        : STATIC_COLORS[ch]!
      ctx.fillRect(destX + x * scale, destY + y * scale, px, px)
    }
  }
  ctx.restore()
}

export function drawUnitSprite(
  ctx: CanvasRenderingContext2D, unit: Unit,
  destX: number, destY: number, scale: number,
  opts: { alpha?: number; flash?: boolean } = {},
): void {
  drawSprite(ctx, CLASS_SPRITES[unit.classId], paletteFor(unit.faction, unit.classId), destX, destY, scale, opts)
}

/** 程序化头像（对话框用）：色相底 + 冠区 + 面 + 肩衣。 */
export function drawPortrait(
  ctx: CanvasRenderingContext2D, hero: HeroDef, destX: number, destY: number, size: number,
): void {
  ctx.save()
  ctx.fillStyle = hsl(hero.portraitHue, 40, 78)
  ctx.fillRect(destX, destY, size, size)
  ctx.fillStyle = hsl(hero.portraitHue, 45, 62)
  ctx.fillRect(destX, destY, size, size * 0.3)
  ctx.fillStyle = '#e8b98a'
  ctx.fillRect(destX + size * 0.28, destY + size * 0.34, size * 0.44, size * 0.4)
  ctx.fillStyle = '#1c1c1c'
  ctx.fillRect(destX + size * 0.38, destY + size * 0.48, size * 0.07, size * 0.05)
  ctx.fillRect(destX + size * 0.55, destY + size * 0.48, size * 0.07, size * 0.05)
  ctx.fillStyle = hsl(hero.portraitHue, 40, 30)
  ctx.fillRect(destX + size * 0.2, destY + size * 0.78, size * 0.6, size * 0.16)
  ctx.strokeStyle = '#26221c'
  ctx.strokeRect(destX + 0.5, destY + 0.5, size - 1, size - 1)
  ctx.restore()
}
