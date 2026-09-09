import { describe, it, expect } from 'vitest'
import {
  CLASS_SPRITES, SPRITE_CHARS, CLASS_ACCENT_HUES, FACTION_HUES,
  TERRAIN_PALETTES, noiseAt, paletteFor,
} from '../../src/render/sprites'
import type { ClassId, TerrainId } from '../../src/engine/types'

const ALL_CLASSES: ClassId[] = ['lord', 'infantry', 'cavalry', 'archer', 'strategist', 'taoist']
const ALL_TERRAINS: TerrainId[] = ['plain', 'forest', 'mountain', 'water', 'city', 'camp', 'pass', 'bridge']

describe('兵种像素画', () => {
  it('6 兵种齐全；每幅 16 行 × 16 字符；字符集合法', () => {
    for (const id of ALL_CLASSES) {
      const rows = CLASS_SPRITES[id]
      expect(rows, id).toBeDefined()
      expect(rows.length, id).toBe(16)
      for (const row of rows) {
        expect(row.length, `${id}: ${row}`).toBe(16)
        for (const ch of row) expect(SPRITE_CHARS.has(ch), `${id}: ${ch}`).toBe(true)
      }
    }
  })
  it('六幅剪影两两不同（hue 撞色的结构性修复）', () => {
    const joined = ALL_CLASSES.map((id) => CLASS_SPRITES[id].join(''))
    for (let i = 0; i < joined.length; i++)
      for (let j = i + 1; j < joined.length; j++)
        expect(joined[i] === joined[j], `${ALL_CLASSES[i]} 与 ${ALL_CLASSES[j]} 剪影相同`).toBe(false)
  })
  it('结构标记：君主剑尖在首行；步兵有整列长枪与左盾；骑兵有整行马身', () => {
    expect(CLASS_SPRITES.lord[0].includes('w')).toBe(true)
    const spearCol = CLASS_SPRITES.infantry.filter((r) => r[14] !== '.').length
    expect(spearCol).toBeGreaterThanOrEqual(10)
    expect(CLASS_SPRITES.infantry.slice(6, 10).every((r) => r[0] !== '.')).toBe(true)
    expect(CLASS_SPRITES.cavalry.some((r) => !r.includes('.'))).toBe(true)
  })
})

describe('配色与噪声', () => {
  it('阵营/兵种色相齐全且阵营色相拉开', () => {
    expect(Object.keys(FACTION_HUES).sort()).toEqual(['ally', 'enemy', 'player'])
    for (const id of ALL_CLASSES) expect(CLASS_ACCENT_HUES[id]).toBeDefined()
    const hues = [FACTION_HUES.player, FACTION_HUES.enemy, FACTION_HUES.ally]
    expect(new Set(hues).size).toBe(3)
  })
  it('paletteFor 返回 hsl 颜色且阵营甲色不同', () => {
    const p1 = paletteFor('player', 'infantry')
    const p2 = paletteFor('enemy', 'infantry')
    expect(p1.a).not.toBe(p2.a)
    expect(p1.a.startsWith('hsl(')).toBe(true)
  })
  it('noiseAt 确定性且落在 [0,1)', () => {
    expect(noiseAt(3, 5, 7)).toBe(noiseAt(3, 5, 7))
    expect(noiseAt(3, 5, 7)).not.toBe(noiseAt(4, 5, 7))
    for (let x = 0; x < 50; x++) {
      const v = noiseAt(x, x * 3, x + 1)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('8 地形色板齐全，各含 base/dark/light 三色', () => {
    for (const t of ALL_TERRAINS) {
      const p = TERRAIN_PALETTES[t]
      expect(p, t).toBeDefined()
      expect(p.base.startsWith('#')).toBe(true)
      expect(p.dark).not.toBe(p.light)
    }
  })
})
