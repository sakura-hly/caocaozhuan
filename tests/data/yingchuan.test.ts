import { describe, it, expect } from 'vitest'
import { yingchuan, yingchuanDialogues } from '../../src/data/battles/yingchuan'
import { validateBattleDef } from '../../src/data/battles/shared'
import { gameData } from '../../src/data'
import type { BattleDef } from '../../src/engine/types'

describe('颍川之战', () => {
  it('战役数据校验零错误零告警', () => {
    expect(validateBattleDef(yingchuan, gameData)).toEqual({ errors: [], warnings: [] })
  })
  it('16x12 地图；我方 5 人 / 敌方 9 人', () => {
    expect(yingchuan.map.length).toBe(12)
    expect(yingchuan.map[0].length).toBe(16)
    expect(yingchuan.units.filter((u) => u.faction === 'player').length).toBe(5)
    expect(yingchuan.units.filter((u) => u.faction === 'enemy').length).toBe(9)
    // 【勘误 4】结构锁：防张梁兵种回退为 strategist
    expect(yingchuan.units.find((u) => u.id === 'zl')?.classId).toBe('taoist')
  })
  it('第 3 回合增援 2 人；对话触发都有文本', () => {
    expect(yingchuan.reinforcements.find((r) => r.turn === 3)?.entries.length).toBe(2)
    for (const t of yingchuan.dialogues) {
      expect(yingchuanDialogues[t.dialogueId], t.dialogueId).toBeDefined()
    }
  })
  it('校验器能发现越界与 survive/maxTurns 冲突', () => {
    const broken: BattleDef = {
      ...yingchuan,
      units: yingchuan.units.map((u) => (u.id === 'e1' ? { ...u, pos: { x: 99, y: 99 } } : u)),
      win: { kind: 'survive', untilTurn: 30 },
      maxTurns: 20,
    }
    const errs = validateBattleDef(broken, gameData)
    expect(errs.errors.some((e) => e.includes('越界'))).toBe(true)
    expect(errs.errors.some((e) => e.includes('坚守'))).toBe(true)
  })
  it('勘误负向：单位与增援 id 重复被拦截', () => {
    const r = yingchuan.reinforcements[0]
    const dup: BattleDef = {
      ...yingchuan,
      reinforcements: [{ ...r, entries: [{ ...r.entries[0], unit: { ...r.entries[0].unit, id: 'e1' } }] }],
    }
    expect(validateBattleDef(dup, gameData).errors.some((e) => e.includes('单位 id 重复'))).toBe(true)
  })
  it('勘误负向：击破目标为我方单位被拦截', () => {
    const bad: BattleDef = { ...yingchuan, win: { kind: 'killCommander', unitId: 'caocao' } }
    expect(validateBattleDef(bad, gameData).errors.some((e) => e.includes('应为敌方阵营'))).toBe(true)
  })
  it('勘误负向：击破目标仅来自增援时告警', () => {
    const warn: BattleDef = { ...yingchuan, win: { kind: 'killCommander', unitId: 'r1' } }
    const r = validateBattleDef(warn, gameData)
    expect(r.warnings.some((w) => w.includes('仅来自增援'))).toBe(true)
    expect(r.errors.some((e) => e.includes('仅来自增援'))).toBe(false)
  })
})
