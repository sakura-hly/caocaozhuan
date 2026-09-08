import type { ApplyResult, BattleState, Command, HitDetail, Unit } from './types'
import type { GameData } from '../data'
import { begin, effectiveStats, ensureActable, findUnit, finish, hostile, killUnit, type Draft } from './internal'
import { comboChance, critChance, hitChance, physicalDamage } from './combat'
import { inRange } from './movement'
import { awardExp, EXP_HIT, EXP_KILL_BONUS } from './growth'

export function doAttack(state: BattleState, cmd: Extract<Command, { type: 'attack' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const attacker = findUnit(state, cmd.unitId)!
  const target = findUnit(state, cmd.targetId)
  if (!target || !target.alive) return { ok: false, error: { code: 'UNIT_NOT_FOUND', unitId: cmd.targetId } }
  if (!hostile(attacker.faction, target.faction)) {
    return { ok: false, error: { code: 'CANNOT_TARGET', reason: '不能攻击友军' } }
  }
  const aCls = data.classes[attacker.classId]
  if (!inRange(attacker.pos, target.pos, aCls.minRange, aCls.maxRange)) {
    return { ok: false, error: { code: 'NOT_IN_RANGE', unitId: cmd.unitId, targetId: cmd.targetId } }
  }
  const d = begin(state)
  const A = findUnit(d.state, cmd.unitId)!
  const D = findUnit(d.state, cmd.targetId)!
  const hits = strike(d, A, D, data, false)
  // 反击：存活 + 攻击者在其射程内 + 未被眩晕
  const dCls = data.classes[D.classId]
  if (D.alive && !D.statuses.some((st) => st.kind === 'stun') && inRange(D.pos, A.pos, dCls.minRange, dCls.maxRange)) {
    hits.push(...strike(d, D, A, data, true))
  }
  d.events.push({ type: 'attackLaunched', hits })
  A.acted = true
  A.moved = true
  return finish(d)
}

/** 一次打击（可含连击第二击）。counter=true 时伤害 ×0.8 且不再触发连击。 */
function strike(d: Draft, attacker: Unit, defender: Unit, data: GameData, counter: boolean): HitDetail[] {
  const hits: HitDetail[] = []
  const aS = effectiveStats(attacker, data)
  const dS = effectiveStats(defender, data)
  const accMod = attacker.statuses.some((st) => st.kind === 'accdown') ? 0.75 : 1
  if (d.draw() >= (hitChance(aS.agi, dS.agi) / 100) * accMod) {
    hits.push({ attackerId: attacker.id, defenderId: defender.id, damage: 0, missed: true, critical: false, combo: false, counter })
    return hits
  }
  const terrain = data.terrains[d.state.map[defender.pos.y][defender.pos.x]]
  const swing = (combo: boolean): HitDetail => {
    const roll = 0.9 + d.draw() * 0.2 // [0.9, 1.1)
    let dmg = physicalDamage({
      atk: aS.atk, def: dS.def,
      attackerClass: attacker.classId, defenderClass: defender.classId,
      terrainDefBonus: terrain.defBonus, roll,
    })
    const critical = d.draw() < critChance(aS.agi, dS.agi) / 100
    if (critical) dmg *= 2
    if (counter) dmg *= 0.8
    dmg = Math.round(dmg)
    const before = defender.hp
    defender.hp = Math.max(0, defender.hp - dmg)
    d.events.push({ type: 'hpChanged', unitId: defender.id, hp: defender.hp, delta: defender.hp - before })
    if (defender.hp <= 0 && defender.alive) killUnit(d, defender, attacker.id)
    if (attacker.faction === 'player') {
      awardExp(d, attacker.id, EXP_HIT, data)
      if (!defender.alive) awardExp(d, attacker.id, EXP_KILL_BONUS, data)
    }
    return { attackerId: attacker.id, defenderId: defender.id, damage: dmg, missed: false, critical, combo, counter }
  }
  hits.push(swing(false))
  if (!counter && defender.alive && d.draw() < comboChance(aS.agi, dS.agi) / 100) {
    hits.push(swing(true))
  }
  return hits
}
