import { describe, it, expect } from 'vitest'
import type { BattleState, Command } from '../../src/engine/types'
import { decideUnitAction } from '../../src/engine/ai'
import { apply } from '../../src/engine/engine'
import { gameData, mkState, mkUnit } from './helpers'

describe('decideUnitAction', () => {
  it('可击杀的残血目标优先于高血量目标', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', classId: 'cavalry', pos: { x: 4, y: 2 },
          base: { hp: 60, mp: 0, atk: 20, def: 8, spirit: 4, agi: 10 } }),
        mkUnit({ id: 'archer_low', pos: { x: 5, y: 2 }, hp: 5,
          base: { hp: 50, mp: 0, atk: 10, def: 1, spirit: 4, agi: 6 } }),
        mkUnit({ id: 'inf_full', pos: { x: 3, y: 2 },
          base: { hp: 60, mp: 0, atk: 10, def: 14, spirit: 4, agi: 6 } }),
      ],
    })
    const cmds = decideUnitAction(s, 'ai1', gameData)
    const atk = cmds.find((c) => c.type === 'attack')
    expect(atk).toBeDefined()
    expect(atk && atk.type === 'attack' && atk.targetId).toBe('archer_low')
  })

  it('无目标可及 → 返回 [move, wait] 且移动后更接近最近敌人', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', classId: 'infantry', pos: { x: 0, y: 0 } }),
        mkUnit({ id: 'p1', pos: { x: 7, y: 5 } }),
      ],
    })
    const cmds = decideUnitAction(s, 'ai1', gameData)
    expect(cmds.length).toBe(2)
    expect(cmds[0].type).toBe('move')
    expect(cmds[1].type).toBe('wait')
    if (cmds[0].type === 'move') {
      const before = Math.abs(7 - 0) + Math.abs(5 - 0)
      const after = Math.abs(7 - cmds[0].to.x) + Math.abs(5 - cmds[0].to.y)
      expect(after).toBeLessThan(before)
    }
  })

  it('道士优先治疗重伤友军', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'e_tao', faction: 'enemy', classId: 'taoist', pos: { x: 5, y: 5 },
          base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e_inf', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 5 }, hp: 20,
          base: { hp: 60, mp: 0, atk: 10, def: 10, spirit: 4, agi: 8 } }),
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 } }), // 远离，打不到
      ],
    })
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    const cast = cmds.find((c) => c.type === 'cast')
    expect(cast).toBeDefined()
    expect(cast && cast.type === 'cast' && cast.strategyId).toBe('zhiyu')
  })

  it('已行动/阵亡单位返回空数组', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', pos: { x: 5, y: 5 }, acted: true }),
        mkUnit({ id: 'dead', faction: 'enemy', pos: { x: 5, y: 4 }, alive: false }),
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 } }),
      ],
    })
    expect(decideUnitAction(s, 'ai1', gameData)).toEqual([])
    expect(decideUnitAction(s, 'dead', gameData)).toEqual([])
  })
})

/** 契约：AI 输出的指令序列必须被引擎逐条接受，且链尾单位完成行动（AI 的校验谓词不得偏离引擎）。 */
function applyAll(s: BattleState, unitId: string, cmds: Command[]): void {
  let cur = s
  for (const cmd of cmds) {
    const r = apply(cur, cmd, gameData)
    expect(r.ok, `指令被引擎拒绝: ${JSON.stringify(cmd)}`).toBe(true)
    if (r.ok) cur = r.state
  }
  const actor = cur.units.find((u) => u.id === unitId)
  expect(actor?.acted).toBe(true)
}

describe('decideUnitAction · apply 契约', () => {
  it('物理链：先移后攻的指令逐条 apply 全部 ok 且链尾 acted', () => {
    const s = mkState({
      factionIndex: 1, // 敌方回合
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', classId: 'cavalry', pos: { x: 4, y: 2 },
          base: { hp: 60, mp: 0, atk: 20, def: 8, spirit: 4, agi: 10 } }),
        mkUnit({ id: 'p1', pos: { x: 6, y: 2 }, // 距离 2，骑兵射程 1 → 逼出先移后攻
          base: { hp: 60, mp: 0, atk: 10, def: 4, spirit: 4, agi: 6 } }),
      ],
    })
    const cmds = decideUnitAction(s, 'ai1', gameData)
    expect(cmds.some((c) => c.type === 'attack')).toBe(true)
    applyAll(s, 'ai1', cmds)
  })

  it('施法链：治疗指令 [可选 move] + cast 全链 ok 且链尾 acted', () => {
    const s = mkState({
      factionIndex: 1, // 敌方回合
      units: [
        mkUnit({ id: 'e_tao', faction: 'enemy', classId: 'taoist', pos: { x: 5, y: 5 },
          base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e_inf', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 5 }, hp: 20,
          base: { hp: 60, mp: 0, atk: 10, def: 10, spirit: 4, agi: 8 } }),
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 } }), // 远离，打不到
      ],
    })
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    expect(cmds.some((c) => c.type === 'cast')).toBe(true)
    applyAll(s, 'e_tao', cmds)
  })
})

describe('AI debuff 施法（M4 清偿 M2 登记项）', () => {
  // 注册表口径：pojia/xuanyun/yaowu 的 allowedClasses 均为 ['taoist'] —— 持法者是道士（如郭嘉），非军师
  const eTao = () =>
    mkUnit({ id: 'e_tao', faction: 'enemy', classId: 'taoist', pos: { x: 4, y: 2 },
      base: { hp: 40, mp: 20, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 20 })
  const dianwei = () =>
    mkUnit({ id: 'dianwei', pos: { x: 5, y: 2 }, // manhattan 1 ≤ pojia.range 3；atk 30 = 高威胁
      base: { hp: 60, mp: 0, atk: 30, def: 10, spirit: 4, agi: 6 } })

  it('持 debuff 法术的道士对射程内最高威胁敌单位施放，而非普攻', () => {
    const s = mkState({ units: [eTao(), dianwei()] })
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    const cast = cmds.find((c) => c.type === 'cast')
    expect(cast).toBeDefined()
    expect(cast && cast.type === 'cast' && cast.strategyId).toBe('pojia') // 同分严格 > 保留首个达标 debuff
    expect(cast && cast.type === 'cast' && cast.target).toEqual({ x: 5, y: 2 })
  })

  it('目标已带任意状态时跳过（防无限叠 debuff）', () => {
    const s = mkState({
      units: [eTao(), mkUnit({ ...dianwei(), statuses: [{ kind: 'defdown', turns: 2 }] })],
    })
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    const debuffs = new Set(['pojia', 'xuanyun', 'yaowu'])
    expect(cmds.some((c) => c.type === 'cast' && debuffs.has(c.strategyId))).toBe(false)
  })

  it('mp 不足不施', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'e_tao', faction: 'enemy', classId: 'taoist', pos: { x: 4, y: 2 },
          base: { hp: 40, mp: 4, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 4 }), // mp 4 < 全部 debuff 最低消耗 5
        dianwei(),
      ],
    })
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    expect(cmds.some((c) => c.type === 'cast')).toBe(false)
  })

  it('debuff 施法链：[可选 move] + cast 全链 ok 且链尾 acted（AI 校验谓词不偏离引擎）', () => {
    const s = mkState({ factionIndex: 1, units: [eTao(), dianwei()] }) // 敌方回合
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    expect(cmds.some((c) => c.type === 'cast')).toBe(true)
    applyAll(s, 'e_tao', cmds)
  })
})
