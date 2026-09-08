import type { ApplyResult, BattleState, Command, StrategyDef, Unit } from './types'
import type { GameData } from '../data'
import { begin, effectiveStats, ensureActable, findUnit, finish, hostile, killUnit, unitAt, type Draft } from './internal'
import { healAmount, spellDamage } from './combat'
import { castableInWeather, shapeCells } from './spells'
import { manhattan } from './movement'
import { awardExp, EXP_HEAL, EXP_KILL_BONUS, EXP_SPELL } from './growth'

export function doCast(state: BattleState, cmd: Extract<Command, { type: 'cast' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const caster = findUnit(state, cmd.unitId)!
  const s = data.strategies[cmd.strategyId]
  if (!s) return { ok: false, error: { code: 'CANNOT_TARGET', reason: `未知法术 ${cmd.strategyId}` } }
  if (!s.allowedClasses.includes(caster.classId)) {
    return { ok: false, error: { code: 'CLASS_CANNOT_CAST', classId: caster.classId } }
  }
  if (!castableInWeather(s, state.weather)) {
    return { ok: false, error: { code: 'SPELL_UNUSABLE_IN_WEATHER', weather: state.weather } }
  }
  if (caster.mp < s.mpCost) return { ok: false, error: { code: 'NOT_ENOUGH_MP', needed: s.mpCost, have: caster.mp } }
  if (manhattan(caster.pos, cmd.target) > s.range) {
    return { ok: false, error: { code: 'NOT_IN_RANGE', unitId: cmd.unitId, targetId: `${cmd.target.x},${cmd.target.y}` } }
  }
  const d = begin(state)
  const C = findUnit(d.state, cmd.unitId)!
  C.mp -= s.mpCost
  d.events.push({ type: 'mpChanged', unitId: C.id, mp: C.mp, delta: -s.mpCost })
  d.events.push({ type: 'spellCast', casterId: C.id, strategyId: s.id, target: { ...cmd.target } })
  const h = d.state.map.length, w = d.state.map[0].length
  for (const c of shapeCells(cmd.target, s.shape)) {
    if (c.x < 0 || c.y < 0 || c.x >= w || c.y >= h) continue
    const target = unitAt(d.state, c)
    if (!target) continue
    if (s.kind === 'attack' || s.kind === 'debuff') {
      if (!hostile(C.faction, target.faction)) continue
    } else if (hostile(C.faction, target.faction)) continue // heal/buff 只作用友军（含自己）
    applySpellEffect(d, C, target, s, data)
  }
  C.acted = true
  C.moved = true
  return finish(d)
}

function applySpellEffect(d: Draft, C: Unit, target: Unit, s: StrategyDef, data: GameData): void {
  const cS = effectiveStats(C, data)
  if (s.kind === 'attack') {
    const tS = effectiveStats(target, data)
    const onMountain = d.state.map[target.pos.y][target.pos.x] === 'mountain'
    const dmg = spellDamage({
      power: s.power, casterSpirit: cS.spirit, targetSpirit: tS.spirit,
      weather: d.state.weather, element: s.element!, targetOnMountain: onMountain,
    })
    const before = target.hp
    target.hp = Math.max(0, target.hp - dmg)
    d.events.push({ type: 'hpChanged', unitId: target.id, hp: target.hp, delta: target.hp - before })
    if (target.hp <= 0 && target.alive) killUnit(d, target, C.id)
    if (C.faction === 'player') {
      awardExp(d, C.id, EXP_SPELL, data)
      if (!target.alive) awardExp(d, C.id, EXP_KILL_BONUS, data)
    }
  } else if (s.kind === 'heal') {
    const maxHp = effectiveStats(target, data).hp
    const amount = Math.min(healAmount(s.power, cS.spirit), maxHp - target.hp)
    if (amount > 0) {
      target.hp += amount
      d.events.push({ type: 'hpChanged', unitId: target.id, hp: target.hp, delta: amount })
    }
    // 满血施放仍发 EXP_HEAL：保留原作行为，有意设计
    if (C.faction === 'player') awardExp(d, C.id, EXP_HEAL, data)
  } else {
    const eff = s.effect!
    target.statuses = target.statuses.filter((st) => st.kind !== eff).concat({ kind: eff, turns: s.effectTurns! })
    d.events.push({ type: 'statusApplied', unitId: target.id, kind: eff, turns: s.effectTurns! })
    if (C.faction === 'player') awardExp(d, C.id, EXP_SPELL, data)
  }
}

export function doUseItem(state: BattleState, cmd: Extract<Command, { type: 'useItem' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const u = findUnit(state, cmd.unitId)!
  if (!u.items.includes(cmd.itemId)) return { ok: false, error: { code: 'ITEM_NOT_HELD', itemId: cmd.itemId } }
  const item = data.items[cmd.itemId]
  if (!item || item.kind !== 'consumable') return { ok: false, error: { code: 'ITEM_NOT_CONSUMABLE', itemId: cmd.itemId } }
  if (cmd.targetId !== u.id) return { ok: false, error: { code: 'CANNOT_TARGET', reason: '道具只能对自身使用' } }
  const d = begin(state)
  const U = findUnit(d.state, cmd.unitId)!
  U.items.splice(U.items.indexOf(cmd.itemId), 1)
  const eff = effectiveStats(U, data)
  if (item.healHp) {
    const amount = Math.min(item.healHp, eff.hp - U.hp)
    if (amount > 0) {
      U.hp += amount
      d.events.push({ type: 'hpChanged', unitId: U.id, hp: U.hp, delta: amount })
    }
  }
  if (item.healMp) {
    const amount = Math.min(item.healMp, eff.mp - U.mp)
    if (amount > 0) {
      U.mp += amount
      d.events.push({ type: 'mpChanged', unitId: U.id, mp: U.mp, delta: amount })
    }
  }
  d.events.push({ type: 'itemUsed', unitId: U.id, targetId: cmd.targetId, itemId: cmd.itemId })
  U.acted = true
  U.moved = true
  return finish(d)
}
