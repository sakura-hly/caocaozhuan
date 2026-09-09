import { describe, it, expect } from 'vitest'
import { initBattle, apply } from '../../src/engine/engine'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { runFactionTurn } from '../../src/game/aiRunner'

const mk = () => initBattle(battles.yingchuan, 42)
/** 引擎 ensureActable 校验阵营轮次（factionIndex）——与 orchestrator 契约一致，先用引擎 endTurn 推进到敌方回合。 */
const mkEnemyTurn = () => {
  const r = apply(mk(), { type: 'endTurn' }, gameData)
  if (!r.ok) throw new Error(`推进到敌方回合失败: ${JSON.stringify(r.error)}`)
  return r.state
}

describe('runFactionTurn', () => {
  it('敌方回合：有事件、零错误、敌方全员 acted', () => {
    const s0 = mkEnemyTurn()
    const before = structuredClone(s0)
    const r = runFactionTurn(s0, 'enemy', gameData)
    expect(s0).toEqual(before) // 纯度契约：入参 state 不被变异
    expect(r.events.length).toBeGreaterThan(0)
    expect(r.errors).toEqual([])
    expect(r.state.units.filter((u) => u.faction === 'enemy' && u.alive).every((u) => u.acted)).toBe(true)
  })
  it('终局中断回归锁：击杀致胜后不再对剩余单位发指令（M1 登记项）', () => {
    const s0 = mk()
    // 把敌方打到只剩 1 人 5 血，且我方两人在其近旁 —— 第一击杀即胜
    const s = structuredClone(s0)
    const enemies = s.units.filter((u) => u.faction === 'enemy')
    for (const e of enemies.slice(1)) e.alive = false
    const last = enemies[0]!
    last.hp = 5
    last.pos = { x: 2, y: 1 }
    last.acted = false
    const p1 = s.units.find((u) => u.id === 'caocao')!
    p1.pos = { x: 2, y: 0 }
    // moved=true 仅为贴近「移动后攻击」场景；AI 出纯 [attack] 依赖：评分与攻击者站位无关、
    // 原地格先评估且严格 > 平局保留首项 —— 引入站位加成后此用例需随之调整
    p1.moved = true
    p1.acted = false
    const p2 = s.units.find((u) => u.id === 'xiaohoudun')!
    p2.pos = { x: 3, y: 1 }
    p2.moved = true
    p2.acted = false
    // 我方回合先手击杀 → 战斗结束
    const r = runFactionTurn(s, 'player', gameData)
    expect(r.state.finished).toBe('won')
    expect(r.errors).toEqual([]) // 修复前：后续单位再发指令会收到 BATTLE_ENDED
    expect(r.events.some((e) => e.type === 'battleWon')).toBe(true)
  })
  it('同 seed 两次执行事件完全一致（确定性）', () => {
    const a = runFactionTurn(mkEnemyTurn(), 'enemy', gameData)
    const b = runFactionTurn(mkEnemyTurn(), 'enemy', gameData)
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
  })
})
