import type { BattleState, Cell, Command, Unit } from './types'
import type { GameData } from '../data'
import { effectiveMove, effectiveStats, findUnit, hostile } from './internal'
import { affinity } from './combat'
import { cellKey, computeMoveRange, inRange, manhattan } from './movement'
import { castableInWeather, shapeCells } from './spells'

interface Option { score: number; cmds: Command[] }

/**
 * 启发式 AI（spec §3.9）：
 * 期望伤害 ×（可击杀 ×2）×相克；施法者优先治疗重伤友军（缺失 HP 记分）/攻击法术 ×1.2；
 * 无可及目标时向最近敌军推进。纯函数无随机 —— 可测试。
 */
export function decideUnitAction(state: BattleState, unitId: string, data: GameData): Command[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  // 正常回合流程下 stun 单位已被 turns.ts 的 startFactionTurn 置 acted=true 走早退；此分支服务传入未经 startFactionTurn 状态的直接调用方
  if (u.statuses.some((st) => st.kind === 'stun')) return [{ type: 'wait', unitId }]
  const foes = state.units.filter((t) => t.alive && hostile(u.faction, t.faction))
  if (foes.length === 0) return [{ type: 'wait', unitId }]

  const range = computeMoveRange(state.map, state.units, u, data.terrains, effectiveMove(u, data))
  const cls = data.classes[u.classId]
  let best: Option = { score: 0, cmds: [{ type: 'wait', unitId }] }

  // M-1：已移动单位只评估原地（不再枚举移动范围，也不落入推进分支）
  const candidates: Cell[] = u.moved ? [u.pos] : [...range.cells.values()]
  for (const cell of candidates) {
    const moveCmd: Command[] = cellKey(cell) === cellKey(u.pos) ? [] : [{ type: 'move', unitId, to: { x: cell.x, y: cell.y } }]
    // 物理攻击
    for (const t of foes) {
      if (!inRange(cell, t.pos, cls.minRange, cls.maxRange)) continue
      const est = estimateDamage(u, t, state, data)
      const score = est * (est >= t.hp ? 2 : 1) * affinity(u.classId, t.classId)
      if (score > best.score) best = { score, cmds: [...moveCmd, { type: 'attack', unitId, targetId: t.id }] }
    }
    // 法术
    for (const s of Object.values(data.strategies)) {
      if (!s.allowedClasses.includes(u.classId) || u.mp < s.mpCost) continue
      if (!castableInWeather(s, state.weather)) continue
      if (s.kind === 'heal') {
        const wounded = state.units.filter(
          (f) => f.alive && !hostile(u.faction, f.faction) && f.hp < effectiveStats(f, data).hp * 0.5,
        )
        for (const f of wounded) {
          if (manhattan(cell, f.pos) > s.range) continue
          const score = effectiveStats(f, data).hp - f.hp // 缺失 HP 越多越优先
          if (score > best.score) best = { score, cmds: [...moveCmd, { type: 'cast', unitId, strategyId: s.id, target: { x: f.pos.x, y: f.pos.y } }] }
        }
      } else if (s.kind === 'attack') {
        for (const t of foes) {
          if (manhattan(cell, t.pos) > s.range) continue
          let sum = 0
          for (const c of shapeCells(t.pos, s.shape)) {
            const hit = state.units.find(
              (x) => x.alive && x.pos.x === c.x && x.pos.y === c.y && hostile(u.faction, x.faction),
            )
            if (hit) sum += estimateSpell(u, hit, s.power, data)
          }
          const score = sum * 1.2
          if (score > best.score) best = { score, cmds: [...moveCmd, { type: 'cast', unitId, strategyId: s.id, target: { x: t.pos.x, y: t.pos.y } }] }
        }
      } else if (s.kind === 'debuff') {
        // M4（M2 登记项清偿）：持法道士优先削弱最高威胁目标。同 kind 已带不重施（对齐 magic 按 kind 去重，
        // 亦免我方增益挡住敌方 debuff）；评分 14+atk×1.2 稳压普攻、低于濒死治疗紧急度——取舍有意。
        for (const t of foes) {
          if (manhattan(cell, t.pos) > s.range) continue
          if (t.statuses.some((st) => st.kind === s.effect)) continue
          const score = 14 + effectiveStats(t, data).atk * 1.2 // 威胁越高越值得削弱
          if (score > best.score) {
            best = { score, cmds: [...moveCmd, { type: 'cast', unitId, strategyId: s.id, target: { x: t.pos.x, y: t.pos.y } }] }
          }
        }
      }
    }
  }
  if (best.score > 0) return best.cmds
  if (u.moved) return [{ type: 'wait', unitId }] // M-1：已移动单位无处可去

  // 推进：选距最近敌人最近的可达格
  let target: Cell = u.pos
  let bestDist = manhattan(u.pos, nearestPos(foes, u.pos))
  for (const cell of range.cells.values()) {
    const dist = manhattan(cell, nearestPos(foes, cell))
    if (dist < bestDist) { bestDist = dist; target = cell }
  }
  if (cellKey(target) !== cellKey(u.pos)) return [{ type: 'move', unitId, to: { x: target.x, y: target.y } }, { type: 'wait', unitId }]
  return [{ type: 'wait', unitId }]
}

function nearestPos(foes: Unit[], from: Cell): Cell {
  let best = foes[0].pos
  let dist = manhattan(from, best)
  for (const t of foes) {
    const d = manhattan(from, t.pos)
    if (d < dist) { dist = d; best = t.pos }
  }
  return best
}

function estimateDamage(u: Unit, t: Unit, state: BattleState, data: GameData): number {
  const a = effectiveStats(u, data)
  const d = effectiveStats(t, data)
  const terr = data.terrains[state.map[t.pos.y][t.pos.x]]
  const raw = (a.atk - d.def * 0.6) * affinity(u.classId, t.classId) * (1 - terr.defBonus / 100)
  return Math.max(1, Math.round(raw))
}

function estimateSpell(u: Unit, t: Unit, power: number, data: GameData): number {
  const a = effectiveStats(u, data)
  const d = effectiveStats(t, data)
  return Math.max(1, Math.round(power + a.spirit * 0.8 - d.spirit * 0.4))
}
