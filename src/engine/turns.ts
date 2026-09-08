import type { ApplyResult, BattleState, Cell, ClassId, Faction } from './types'
import { begin, finish, type Draft } from './internal'
import { rngNext } from './rng'
import { moveCostFor } from './movement'
import { terrains } from '../data/terrains'

export function doEndTurn(state: BattleState): ApplyResult {
  const d = begin(state)
  const cur = d.state.factionOrder[d.state.factionIndex]
  d.events.push({ type: 'turnEnded', faction: cur, turn: d.state.turn })
  advance(d)
  return finish(d)
}

function advance(d: Draft): void {
  const order = d.state.factionOrder
  let idx = d.state.factionIndex
  for (let i = 0; i < order.length; i++) {
    idx = (idx + 1) % order.length
    if (idx === 0) newRound(d) // 绕回首阵营 = 新一轮
    const f = order[idx]
    if (d.state.units.some((u) => u.faction === f && u.alive)) {
      d.state.factionIndex = idx
      startFactionTurn(d, f)
      return
    }
  }
}

function newRound(d: Draft): void {
  d.state.turn += 1
  d.events.push({ type: 'roundStarted', turn: d.state.turn })
  // 天气：脚本优先，否则 20% 概率随机切换
  const scripted = d.state.weatherScript.find((e) => e.turn === d.state.turn)
  if (scripted) {
    if (scripted.weather !== d.state.weather) {
      d.state.weather = scripted.weather
      d.events.push({ type: 'weatherChanged', weather: scripted.weather })
    }
  } else {
    const r = rngNext(d.state.rngState)
    d.state.rngState = r.nextState
    if (r.value < 0.2) {
      const others = (['sunny', 'cloudy', 'rainy'] as const).filter((w) => w !== d.state.weather)
      const r2 = rngNext(d.state.rngState)
      d.state.rngState = r2.nextState
      const w = others[Math.floor(r2.value * others.length)] ?? others[0]
      d.state.weather = w
      d.events.push({ type: 'weatherChanged', weather: w })
    }
  }
  // 增援登场（落点被占时找相邻可站格）
  for (const r of d.state.reinforcements) {
    if (r.turn !== d.state.turn) continue
    const ids: string[] = []
    for (const e of r.entries) {
      let cell = e.at
      if (occupied(d, cell)) {
        const alt = [
          { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
          { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 },
        ].find((c) => inBounds(d, c) && !occupied(d, c) && walkable(d, c, e.unit.classId))
        if (!alt) continue
        cell = alt
      }
      const unit = structuredClone(e.unit)
      unit.pos = cell
      unit.moved = false
      unit.acted = false
      d.state.units.push(unit)
      ids.push(unit.id)
    }
    if (ids.length > 0) d.events.push({ type: 'reinforcementsArrived', unitIds: ids })
  }
  // 回本对话触发
  for (const t of d.state.dialogues) {
    if (t.turn === d.state.turn) d.events.push({ type: 'dialogueTriggered', dialogueId: t.dialogueId })
  }
}

function startFactionTurn(d: Draft, f: Faction): void {
  d.events.push({ type: 'turnStarted', faction: f, turn: d.state.turn })
  for (const u of d.state.units) {
    if (u.faction !== f || !u.alive) continue
    u.moved = false
    u.acted = false
    if (u.statuses.some((st) => st.kind === 'stun')) u.acted = true // 眩晕：跳过本回合
    u.statuses = u.statuses.map((st) => ({ ...st, turns: st.turns - 1 })).filter((st) => st.turns > 0)
  }
}

function occupied(d: Draft, c: Cell): boolean {
  return d.state.units.some((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y)
}
function inBounds(d: Draft, c: Cell): boolean {
  return c.y >= 0 && c.y < d.state.map.length && c.x >= 0 && c.x < d.state.map[0].length
}
function walkable(d: Draft, c: Cell, classId: ClassId): boolean {
  return Number.isFinite(moveCostFor(terrains[d.state.map[c.y][c.x]], classId))
}
