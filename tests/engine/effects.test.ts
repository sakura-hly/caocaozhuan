import { describe, it, expect } from 'vitest'
import { apply } from '../../src/engine/engine'
import { effectiveStats, effectiveMove } from '../../src/engine/internal'
import { computeMoveRange } from '../../src/engine/movement'
import { flatMap, gameData, mkState, mkUnit } from './helpers'
import type { ApplyResult, Unit } from '../../src/engine/types'

// 装备加成（铁剑 atk / 的卢 move）与 pojia/jifeng/yaowu 状态效果链的行为锁定。
// RNG 为状态内种子：seed 42 下攻击序列确定（唯一一击、roll=0.9897、无暴击无连击），
// 伤害公式 physicalDamage = round((atk − def×0.6) × 相克 × 地形 × roll)。

/** 构造「步兵攻相邻步兵」的配对场景：平原全图，agi 50 vs 5 保证 100% 命中。 */
function attackPair(o: { equipment?: Unit['equipment']; targetStatuses?: Unit['statuses'] }) {
  return mkState({
    units: [
      mkUnit({
        id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 },
        base: { hp: 500, mp: 0, atk: 12, def: 8, spirit: 5, agi: 50 },
        equipment: o.equipment ?? {},
      }),
      mkUnit({
        id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 3, y: 2 },
        base: { hp: 500, mp: 0, atk: 10, def: 8, spirit: 5, agi: 5 },
        statuses: o.targetStatuses ?? [],
      }),
    ],
  })
}

function e1Hp(r: Extract<ApplyResult, { ok: true }>): number {
  return r.state.units.find((u) => u.id === 'e1')!.hp
}

describe('装备加成与状态效果链', () => {
  it('铁剑 +4 atk 进伤害：属性叠加 12+4=16，持剑伤害恰高 4（相克/地形系数均为 1）', () => {
    // 属性层：effectiveStats 装备 bonuses 逐项叠加
    expect(effectiveStats(attackPair({ equipment: {} }).units[0], gameData).atk).toBe(12)
    expect(effectiveStats(attackPair({ equipment: { weapon: 'iron_sword' } }).units[0], gameData).atk).toBe(16)

    // 伤害层：同构造配对（同 seed），持剑比空装恰多扣 4×相克(1)×地形(1)×roll 的量
    const bare = apply(attackPair({ equipment: {} }), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    const sword = apply(attackPair({ equipment: { weapon: 'iron_sword' } }), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(bare.ok).toBe(true)
    expect(sword.ok).toBe(true)
    if (!bare.ok || !sword.ok) return
    // seed 42 唯一一击 roll=0.9897：空装 round((12−4.8)×0.9897)=7；持剑 round((16−4.8)×0.9897)=11
    expect(e1Hp(bare)).toBe(493)
    expect(e1Hp(sword)).toBe(489)
    expect(e1Hp(bare) - e1Hp(sword)).toBe(4)
  })

  it('的卢 +2 移动力：effectiveMove 4→6，computeMoveRange 可达格数严格增加', () => {
    const bare = mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 3, y: 2 } })
    const horsed = mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 3, y: 2 }, equipment: { accessory: 'dilu_horse' } })
    expect(effectiveMove(bare, gameData)).toBe(4) // infantry movePower
    expect(effectiveMove(horsed, gameData)).toBe(6) // + 的卢 bonuses.move: 2

    // 引擎 move 指令的调用方式：预算传 effectiveMove
    const map = flatMap() // 8x6 平原
    const rBare = computeMoveRange(map, [bare], bare, gameData.terrains, effectiveMove(bare, gameData))
    const rHorsed = computeMoveRange(map, [horsed], horsed, gameData.terrains, effectiveMove(horsed, gameData))
    expect(rBare.cells.size).toBe(35) // 曼哈顿 ≤4（含原地）
    expect(rHorsed.cells.size).toBe(47) // 曼哈顿 ≤6
    expect(rHorsed.cells.size).toBeGreaterThan(rBare.cells.size)
    expect(rBare.cells.has('7,2')).toBe(true) // 距 4：两者皆可达
    expect(rHorsed.cells.has('7,2')).toBe(true)
    expect(rBare.cells.has('7,4')).toBe(false) // 距 6：仅的卢可达
    expect(rHorsed.cells.has('7,4')).toBe(true)
  })

  it('破甲链：taoist 施 pojia → 敌 defdown 3 回合 → effectiveStats def=5 → 物理伤害 +2', () => {
    // cast 路径：施放 → 状态落地 → 属性衰减（floor(8×0.7)=floor(5.6)=5）
    const s = mkState({
      units: [
        mkUnit({ id: 't1', classId: 'taoist', pos: { x: 2, y: 2 }, base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 3, y: 2 }, base: { hp: 500, mp: 0, atk: 10, def: 8, spirit: 5, agi: 5 } }),
      ],
    })
    const rc = apply(s, { type: 'cast', unitId: 't1', strategyId: 'pojia', target: { x: 3, y: 2 } }, gameData)
    expect(rc.ok).toBe(true)
    if (!rc.ok) return
    expect(rc.events.some((ev) => ev.type === 'statusApplied' && ev.unitId === 'e1' && ev.kind === 'defdown' && ev.turns === 3)).toBe(true)
    const e1 = rc.state.units.find((u) => u.id === 'e1')!
    expect(e1.statuses).toEqual([{ kind: 'defdown', turns: 3 }])
    expect(effectiveStats(e1, gameData).def).toBe(5)
    expect(rc.state.units.find((u) => u.id === 't1')!.mp).toBe(25) // mpCost 5

    // 伤害链：同 seed 配对对照（直塞 defdown 以对齐双方 RNG 消耗序列）
    const ctrl = apply(attackPair({ targetStatuses: [] }), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    const debuffed = apply(attackPair({ targetStatuses: [{ kind: 'defdown', turns: 3 }] }), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(ctrl.ok).toBe(true)
    expect(debuffed.ok).toBe(true)
    if (!ctrl.ok || !debuffed.ok) return
    // def 8→5，每 1 点 def 折 0.6 伤害：round((12−3.0)×0.9897)=9 vs round((12−4.8)×0.9897)=7
    expect(e1Hp(ctrl)).toBe(493)
    expect(e1Hp(debuffed)).toBe(491)
  })

  it('疾风链：taoist 施 jifeng → 友军 speedup 3 回合 → effectiveMove 4→6', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 't1', classId: 'taoist', pos: { x: 2, y: 2 }, base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'p2', classId: 'infantry', pos: { x: 3, y: 2 }, base: { hp: 60, mp: 0, atk: 12, def: 8, spirit: 5, agi: 8 } }),
      ],
    })
    expect(effectiveMove(s.units[1], gameData)).toBe(4) // cast 前
    const r = apply(s, { type: 'cast', unitId: 't1', strategyId: 'jifeng', target: { x: 3, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.events.some((ev) => ev.type === 'statusApplied' && ev.unitId === 'p2' && ev.kind === 'speedup' && ev.turns === 3)).toBe(true)
    const p2 = r.state.units.find((u) => u.id === 'p2')!
    expect(p2.statuses).toEqual([{ kind: 'speedup', turns: 3 }])
    expect(effectiveMove(p2, gameData)).toBe(6) // cast 后：speedup +2
    expect(r.state.units.find((u) => u.id === 't1')!.mp).toBe(25) // mpCost 5
  })

  it('妖雾/accdown：基线 100% 命中，带 accdown 衰减至 75%（40 次固定种子采样）', () => {
    // 施放链：taoist 对敌施妖雾 → accdown 3 回合
    const s = mkState({
      units: [
        mkUnit({ id: 't1', classId: 'taoist', pos: { x: 2, y: 2 }, base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 }, base: { hp: 60, mp: 0, atk: 10, def: 8, spirit: 5, agi: 8 } }),
      ],
    })
    const rc = apply(s, { type: 'cast', unitId: 't1', strategyId: 'yaowu', target: { x: 3, y: 2 } }, gameData)
    expect(rc.ok).toBe(true)
    if (!rc.ok) return
    expect(rc.events.some((ev) => ev.type === 'statusApplied' && ev.unitId === 'e1' && ev.kind === 'accdown' && ev.turns === 3)).toBe(true)
    expect(rc.state.units.find((u) => u.id === 'e1')!.statuses).toEqual([{ kind: 'accdown', turns: 3 }])

    // 统计：agi 50 vs 10 ⇒ hitChance=clamp(90+40)=100；accdown ⇒ 命中概率 ×0.75 = 75%。
    // RNG 为状态内种子：每次新构造状态若用同一 seed 会重放同一首个 draw（40 次全同），
    // 故逐次用固定种子 42+i 采样，整体仍完全确定。
    const N = 40
    const sample = (accdown: boolean, i: number): boolean => {
      const st = mkState({
        rngState: 42 + i,
        units: [
          mkUnit({
            id: 'p1', pos: { x: 2, y: 2 }, base: { hp: 500, mp: 0, atk: 12, def: 8, spirit: 5, agi: 50 },
            statuses: accdown ? [{ kind: 'accdown', turns: 3 }] : [],
          }),
          mkUnit({ id: 'e1', faction: 'enemy', classId: 'archer', pos: { x: 3, y: 2 }, base: { hp: 500, mp: 0, atk: 10, def: 8, spirit: 5, agi: 10 } }),
        ],
      })
      const r = apply(st, { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
      expect(r.ok).toBe(true)
      if (!r.ok) return false
      const launched = r.events.find((e) => e.type === 'attackLaunched')
      return !!launched && launched.type === 'attackLaunched' && !launched.hits[0].missed
    }
    let baseline = 0
    for (let i = 0; i < N; i++) if (sample(false, i)) baseline++
    expect(baseline).toBe(N) // 基线：阈值 1.0，draw∈[0,1) 恒命中
    let hits = 0
    for (let i = 0; i < N; i++) if (sample(true, i)) hits++
    // 理论 30/40，实测 30/40；窗口 30±4（含理论值）
    expect(hits).toBeGreaterThanOrEqual(26)
    expect(hits).toBeLessThanOrEqual(34)
  })
})
