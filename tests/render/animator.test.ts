import { describe, it, expect } from 'vitest'
import type { Cell, GameEvent, HitDetail } from '../../src/engine/types'
import {
  planAnimations, SLIDE_MS_PER_CELL, LUNGE_MS, FLASH_MS, FADE_MS, BANNER_MS, type AnimStep,
} from '../../src/render/animator'

const pos = (x: number, y: number): Cell => ({ x, y })
const P: Record<string, Cell> = { p1: pos(3, 3), e1: pos(6, 3) }
const hit = (over: Partial<HitDetail> = {}): HitDetail => ({
  attackerId: 'p1', defenderId: 'e1', damage: 8, missed: false,
  critical: false, combo: false, counter: false, ...over,
})

describe('planAnimations 纯函数', () => {
  it('移动 → 一个 slide 步骤，时长 = 单格时长×段数，finalPositions 更新', () => {
    const events: GameEvent[] = [
      { type: 'unitMoved', unitId: 'p1', path: [pos(3, 3), pos(4, 3), pos(5, 3)] },
    ]
    const plan = planAnimations(events, { p1: pos(3, 3) })
    const slides = plan.steps.filter((s) => s.kind === 'slide')
    expect(slides).toHaveLength(1)
    expect(slides[0]!.dur).toBe(SLIDE_MS_PER_CELL * 2)
    expect(plan.finalPositions.p1).toEqual(pos(5, 3))
    expect(plan.totalMs).toBeGreaterThan(0)
  })
  it('顺序修复锁：伤害飘字在 lunge/flash 之后（hpChanged 先于 attackLaunched 到达）', () => {
    const events: GameEvent[] = [
      { type: 'hpChanged', unitId: 'e1', hp: 12, delta: -8 },
      { type: 'attackLaunched', hits: [hit()] },
    ]
    const plan = planAnimations(events, { ...P })
    const kinds = plan.steps.map((s) => s.kind)
    const lungeI = kinds.indexOf('lunge')
    const flashI = kinds.indexOf('flash')
    const floatI = kinds.findIndex((s) => s === 'float')
    expect(lungeI).toBeGreaterThanOrEqual(0)
    expect(flashI).toBeGreaterThanOrEqual(0)
    expect(floatI).toBeGreaterThan(lungeI)
    expect(floatI).toBeGreaterThan(flashI)
    const f = plan.steps.find((s) => s.kind === 'float') as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('-8')
    expect(f.color).toBe('#ff5a4a')
  })
  it('落空攻击 → 灰色「落空」飘字，无 flash', () => {
    const events: GameEvent[] = [
      { type: 'attackLaunched', hits: [hit({ missed: true, damage: 0 })] },
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps.some((s) => s.kind === 'flash')).toBe(false)
    const f = plan.steps.find((s) => s.kind === 'float') as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('落空')
    expect(f.color).toBe('#b8b8b8')
  })
  it('多 hit（连击）：两条 lunge 按序、闪白两次、飘字在最后', () => {
    const events: GameEvent[] = [
      { type: 'hpChanged', unitId: 'e1', hp: 12, delta: -8 },
      { type: 'hpChanged', unitId: 'e1', hp: 4, delta: -8 },
      { type: 'attackLaunched', hits: [hit(), hit({ combo: true })] },
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps.filter((s) => s.kind === 'lunge')).toHaveLength(2)
    expect(plan.steps.filter((s) => s.kind === 'flash')).toHaveLength(2)
    const floats = plan.steps.filter((s) => s.kind === 'float')
    expect(floats).toHaveLength(2)
    const lastFloat = floats[floats.length - 1] as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(lastFloat.text).toBe('-8')
    const kinds = plan.steps.map((s) => s.kind)
    expect(kinds.indexOf('float')).toBeGreaterThan(kinds.lastIndexOf('flash'))
  })
  it('治疗：目标格 burst（绿色）+ 绿色 +N 飘字在 burst 之后', () => {
    const events: GameEvent[] = [
      { type: 'spellCast', casterId: 'p1', strategyId: 'zhiyu', target: pos(3, 3) },
      { type: 'hpChanged', unitId: 'p1', hp: 30, delta: 12 },
    ]
    const plan = planAnimations(events, { ...P })
    const kinds = plan.steps.map((s) => s.kind)
    const burstI = kinds.indexOf('burst')
    const floatI = kinds.indexOf('float')
    expect(burstI).toBeGreaterThanOrEqual(0)
    expect(floatI).toBeGreaterThan(burstI)
    const b = plan.steps[burstI] as Extract<(typeof plan.steps)[number], { kind: 'burst' }>
    expect(b.color).toBe('#6aff9a')
    expect(b.dur).toBeGreaterThanOrEqual(1)
    const f = plan.steps[floatI] as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('+12')
    expect(f.color).toBe('#5ae08a')
  })
  it('火系攻击法术 → 火色 burst', () => {
    const events: GameEvent[] = [
      { type: 'spellCast', casterId: 'p1', strategyId: 'huoshi', target: pos(6, 3) },
    ]
    const plan = planAnimations(events, { ...P })
    const b = plan.steps.find((s) => s.kind === 'burst') as Extract<(typeof plan.steps)[number], { kind: 'burst' }>
    expect(b.color).toBe('#ff8a3a')
  })
  it('阵亡 → fade 步骤（时长=FADE_MS）；状态 → 中文标签飘字', () => {
    const events: GameEvent[] = [
      { type: 'unitDied', unitId: 'e1', byUnitId: 'p1' },
      { type: 'statusApplied', unitId: 'e1', kind: 'stun', turns: 1 },
    ]
    const plan = planAnimations(events, { ...P })
    const fade = plan.steps.find((s) => s.kind === 'fade') as Extract<(typeof plan.steps)[number], { kind: 'fade' }>
    expect(fade).toBeDefined()
    expect(fade.dur).toBe(FADE_MS)
    const f = plan.steps.find((s) => s.kind === 'float') as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('眩晕')
  })
  it('回合/阵营横幅文案与时长', () => {
    const events: GameEvent[] = [
      { type: 'roundStarted', turn: 2 },
      { type: 'turnStarted', faction: 'enemy', turn: 2 },
    ]
    const plan = planAnimations(events, { ...P })
    const banners = plan.steps.filter((s) => s.kind === 'banner') as Extract<(typeof plan.steps)[number], { kind: 'banner' }>[]
    const texts = banners.map((b) => b.text)
    expect(texts).toEqual(['第 2 回合', '敌军行动'])
    expect(banners[0]!.dur).toBe(BANNER_MS)
  })
  it('I1 原地移动（单格 path）→ 不产出 slide，finalPositions 更新，零时长', () => {
    const events: GameEvent[] = [
      { type: 'unitMoved', unitId: 'p1', path: [pos(3, 3)] },
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps).toEqual([])
    expect(plan.finalPositions.p1).toEqual(pos(3, 3))
    expect(plan.totalMs).toBe(0)
  })
  it('M3 攻击击杀序列：lunge → flash → 伤害飘字 → fade（unitDied 先于 attackLaunched 到达）', () => {
    const events: GameEvent[] = [
      { type: 'hpChanged', unitId: 'e1', hp: 0, delta: -8 },
      { type: 'unitDied', unitId: 'e1', byUnitId: 'p1' },
      { type: 'attackLaunched', hits: [hit()] },
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps.map((s) => s.kind)).toEqual(['lunge', 'flash', 'float', 'fade'])
  })
  it('M3 法术击杀：burst → 飘字 → fade（无 attackLaunched，末尾 flush）', () => {
    const events: GameEvent[] = [
      { type: 'spellCast', casterId: 'p1', strategyId: 'huoshi', target: pos(6, 3) },
      { type: 'hpChanged', unitId: 'e1', hp: 0, delta: -8 },
      { type: 'unitDied', unitId: 'e1' },
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps.map((s) => s.kind)).toEqual(['burst', 'float', 'fade'])
  })
  it('批量回放位置锁：伤害飘字在 flash 后、下一单位移动前', () => {
    const events: GameEvent[] = [
      { type: 'hpChanged', unitId: 'e1', hp: 12, delta: -8 },
      { type: 'attackLaunched', hits: [hit()] },
      { type: 'unitMoved', unitId: 'e1', path: [pos(6, 3), pos(5, 3)] },
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps.map((s) => s.kind)).toEqual(['lunge', 'flash', 'float', 'slide'])
    const tOf = (kind: AnimStep['kind']): number => plan.steps.find((s) => s.kind === kind)!.t
    expect(tOf('slide')).toBeGreaterThan(tOf('float'))
    expect(tOf('float')).toBeGreaterThan(tOf('flash'))
  })
  it('空事件 → 空计划；被忽略事件类型不产生步骤', () => {
    expect(planAnimations([], {})).toEqual({ steps: [], finalPositions: {}, totalMs: 0 })
    const events: GameEvent[] = [
      { type: 'battleStarted', battleId: 'yingchuan' },
      { type: 'turnEnded', faction: 'player', turn: 1 },
      { type: 'weatherChanged', weather: 'rainy' },
      { type: 'expGained', unitId: 'p1', amount: 3 },
      { type: 'mpChanged', unitId: 'p1', mp: 5, delta: -5 },
      { type: 'itemUsed', unitId: 'p1', targetId: 'p1', itemId: 'jinchuang_yao' },
      { type: 'dialogueTriggered', dialogueId: 'yc_start' },
      { type: 'battleWon' },
    ]
    expect(planAnimations(events, { ...P }).steps).toEqual([])
  })
})
