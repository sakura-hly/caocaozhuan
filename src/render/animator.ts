import type { Cell, GameEvent } from '../engine/types'
import { gameData } from '../data'
import type { BattlefieldRenderer, BurstFx, FloatText, UnitOverride } from './battlefield'

export const SLIDE_MS_PER_CELL = 90
export const FLASH_MS = 260
export const FLOAT_MS = 800
export const LUNGE_MS = 170
export const FADE_MS = 420
export const BURST_MS = 460
export const BANNER_MS = 1100
const STEP_GAP = 40
const FLOAT_GAP = 120

export type AnimStep =
  | { kind: 'slide'; t: number; dur: number; unitId: string; path: Cell[] }
  | { kind: 'flash'; t: number; dur: number; unitId: string }
  | { kind: 'float'; t: number; dur: number; at: Cell; text: string; color: string }
  | { kind: 'lunge'; t: number; dur: number; unitId: string; toward: Cell }
  | { kind: 'fade'; t: number; dur: number; unitId: string }
  | { kind: 'burst'; t: number; dur: number; at: Cell; color: string }
  | { kind: 'banner'; t: number; dur: number; text: string }

export interface PlanResult { steps: AnimStep[]; finalPositions: Record<string, Cell>; totalMs: number }

export const ELEMENT_COLORS: Record<string, string> = { fire: '#ff8a3a', water: '#55aaff', earth: '#b09070' }
const KIND_COLORS: Record<string, string> = { heal: '#6aff9a', buff: '#d090ff', debuff: '#d090ff' }
const STATUS_LABELS: Record<string, string> = { stun: '眩晕', defdown: '破甲', speedup: '疾风', accdown: '妖雾' }
const FACTION_BANNERS: Record<string, string> = { player: '我军行动', enemy: '敌军行动', ally: '友军行动' }

/** 事件序列 → 带时间轴的动画步骤表。纯函数：不触碰渲染器、不读时钟。
 * 核心顺序修复：引擎先发 hpChanged 再发 attackLaunched，故伤害数字进 pendingHp 缓冲，
 * 压后到 lunge/flash 之后才落屏（flushHp）。 */
export function planAnimations(events: GameEvent[], positions: Record<string, Cell>): PlanResult {
  const steps: AnimStep[] = []
  const finalPositions: Record<string, Cell> = { ...positions }
  let t = 0
  let pendingHp: { unitId: string; delta: number }[] = []

  const posOf = (id: string): Cell => finalPositions[id] ?? { x: 0, y: 0 }
  const flushHp = (): void => {
    for (const h of pendingHp) {
      const n = Math.abs(h.delta)
      steps.push({
        kind: 'float', t, dur: FLOAT_MS, at: posOf(h.unitId),
        text: h.delta < 0 ? `-${n}` : `+${n}`,
        color: h.delta < 0 ? '#ff5a4a' : '#5ae08a',
      })
      t += FLOAT_GAP
    }
    pendingHp = []
  }

  for (const ev of events) {
    switch (ev.type) {
      case 'unitMoved': {
        flushHp()
        const path = ev.path
        const to = path[path.length - 1]!
        const dur = Math.max(SLIDE_MS_PER_CELL, SLIDE_MS_PER_CELL * (path.length - 1))
        steps.push({ kind: 'slide', t, dur, unitId: ev.unitId, path })
        t += dur + STEP_GAP
        finalPositions[ev.unitId] = { x: to.x, y: to.y }
        break
      }
      case 'attackLaunched': {
        // hits 数组：每 hit 一段 lunge →（落空飘字 | 闪白），全部 hit 后再 flushHp
        for (const h of ev.hits) {
          steps.push({ kind: 'lunge', t, dur: LUNGE_MS, unitId: h.attackerId, toward: posOf(h.defenderId) })
          t += LUNGE_MS + STEP_GAP
          if (h.missed) {
            steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(h.defenderId), text: '落空', color: '#b8b8b8' })
            t += FLOAT_GAP
          } else {
            steps.push({ kind: 'flash', t, dur: FLASH_MS, unitId: h.defenderId })
            t += FLASH_MS + STEP_GAP
          }
        }
        flushHp() // 伤害数字压后到 lunge/flash 之后
        break
      }
      case 'hpChanged': {
        pendingHp.push({ unitId: ev.unitId, delta: ev.delta })
        break
      }
      case 'unitDied': {
        flushHp()
        steps.push({ kind: 'fade', t, dur: FADE_MS, unitId: ev.unitId })
        t += FADE_MS + STEP_GAP
        break
      }
      case 'spellCast': {
        flushHp()
        const s = gameData.strategies[ev.strategyId]
        const color = s ? (s.kind === 'attack' ? ELEMENT_COLORS[s.element ?? 'fire'] ?? '#ff8a3a' : KIND_COLORS[s.kind] ?? '#d090ff') : '#d090ff'
        steps.push({ kind: 'burst', t, dur: BURST_MS, at: { x: ev.target.x, y: ev.target.y }, color })
        t += BURST_MS + STEP_GAP
        break
      }
      case 'statusApplied': {
        flushHp()
        steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(ev.unitId), text: STATUS_LABELS[ev.kind] ?? ev.kind, color: '#ffe06a' })
        t += FLOAT_GAP
        break
      }
      case 'levelUp': {
        flushHp()
        steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(ev.unitId), text: '升级！', color: '#ffd84a' })
        t += FLOAT_GAP
        break
      }
      case 'treasureFound': {
        flushHp()
        steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(ev.unitId), text: '获得宝物', color: '#ffd84a' })
        t += FLOAT_GAP
        break
      }
      case 'roundStarted': {
        flushHp()
        steps.push({ kind: 'banner', t, dur: BANNER_MS, text: `第 ${ev.turn} 回合` })
        t += BANNER_MS + STEP_GAP
        break
      }
      case 'turnStarted': {
        flushHp()
        steps.push({ kind: 'banner', t, dur: BANNER_MS, text: FACTION_BANNERS[ev.faction] ?? ev.faction })
        t += BANNER_MS + STEP_GAP
        break
      }
      default:
        break // battleStarted/turnEnded/weatherChanged/expGained/mpChanged/itemUsed/reinforcementsArrived/reinforcementDropped/dialogueTriggered/battleWon/battleLost 不做动画
    }
  }
  flushHp()
  return { steps, finalPositions, totalMs: t }
}

/** rAF 播放器：把步骤表逐帧换算为渲染器覆盖。 */
export class Animator {
  private raf = 0
  private start = 0
  private total = 0
  private steps: AnimStep[] = []
  private positions: Record<string, Cell> = {}
  private onDone: (() => void) | null = null
  private _busy = false

  constructor(private renderer: BattlefieldRenderer) {}

  get busy(): boolean { return this._busy }

  play(events: GameEvent[], positions: Record<string, Cell>, onDone: () => void): void {
    this.cancel()
    const plan = planAnimations(events, positions)
    if (plan.totalMs <= 0) { onDone(); return }
    this.steps = plan.steps
    this.positions = plan.finalPositions // 用 finalPositions 做 lunge 基准（slide 后单位已在终点）
    this.total = plan.totalMs
    this.onDone = onDone
    this._busy = true
    this.start = performance.now()
    const tick = (now: number): void => {
      const el = now - this.start
      this.renderFrame(el)
      this.renderer.render(now)
      if (el >= this.total) {
        this._busy = false
        this.clearFx()
        this.renderer.render(now)
        const done = this.onDone
        this.onDone = null
        done?.()
      } else {
        this.raf = requestAnimationFrame(tick)
      }
    }
    this.raf = requestAnimationFrame(tick)
  }

  cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this._busy = false
    this.onDone = null
    this.clearFx()
  }

  private renderFrame(el: number): void {
    const overrides = new Map<string, UnitOverride>()
    const floats: FloatText[] = []
    const bursts: BurstFx[] = []
    let banner: string | null = null
    for (const s of this.steps) {
      if (s.t + s.dur <= el) { // 已结束 —— 固化终态
        if (s.kind === 'slide') {
          const last = s.path[s.path.length - 1]!
          overrides.set(s.unitId, { ...overrides.get(s.unitId), x: last.x, y: last.y })
        } else if (s.kind === 'fade') {
          overrides.set(s.unitId, { ...overrides.get(s.unitId), alpha: 0, forceVisible: true })
        }
        continue
      }
      if (s.t > el) continue // 未开始
      const p = (el - s.t) / s.dur
      switch (s.kind) {
        case 'slide': {
          const segs = s.path.length - 1
          const idx = Math.min(segs - 1, Math.floor(p * segs))
          const f = p * segs - idx
          const a = s.path[idx]!
          const b = s.path[idx + 1]!
          overrides.set(s.unitId, { ...overrides.get(s.unitId), x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
          break
        }
        case 'flash':
          overrides.set(s.unitId, { ...overrides.get(s.unitId), flash: true })
          break
        case 'lunge': {
          const base = this.positions[s.unitId]
          if (base) {
            const k = Math.sin(p * Math.PI) * 0.35
            overrides.set(s.unitId, {
              ...overrides.get(s.unitId),
              x: base.x + (s.toward.x - base.x) * k,
              y: base.y + (s.toward.y - base.y) * k,
            })
          }
          break
        }
        case 'fade':
          overrides.set(s.unitId, { ...overrides.get(s.unitId), alpha: 1 - p, forceVisible: true })
          break
        case 'float':
          floats.push({ x: s.at.x, y: s.at.y - 0.3 - 0.7 * p, text: s.text, color: s.color, alpha: 1 - p * p })
          break
        case 'burst':
          bursts.push({ x: s.at.x, y: s.at.y, color: s.color, radius: 26 * p, alpha: 1 - p })
          break
        case 'banner':
          banner = s.text
          break
      }
    }
    this.renderer.setOverrides(overrides)
    this.renderer.setFloats(floats)
    this.renderer.setBursts(bursts)
    this.renderer.setBanner(banner)
  }

  private clearFx(): void {
    this.renderer.setOverrides(new Map())
    this.renderer.setFloats([])
    this.renderer.setBursts([])
    this.renderer.setBanner(null)
  }
}
