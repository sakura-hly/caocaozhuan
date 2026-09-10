import type { BattleDef, Cell, ClassId, Faction, ItemSlot, Stats, TerrainId, Unit } from '../../engine/types'
import type { GameData } from '../index'
import { heroes } from '../heroes'
import { moveCostFor } from '../../engine/movement'

/** 校验报告：errors 阻断加载；warnings 提示但不阻断。 */
export interface ValidationReport { errors: string[]; warnings: string[] }

/** 对话行（开场/剧情/触发对话共用）。 */
export interface DialogueLine { speaker: string; text: string }

export const MAP_LEGEND: Record<string, TerrainId> = {
  '.': 'plain', f: 'forest', m: 'mountain', w: 'water', C: 'city', P: 'camp', G: 'pass', b: 'bridge',
}

export function parseMap(rows: string[]): TerrainId[][] {
  return rows.map((r) => [...r].map((ch) => {
    const t = MAP_LEGEND[ch]
    if (!t) throw new Error(`未知地形字符: ${ch}`)
    return t
  }))
}

/** 从武将档案生成单位（初始 HP/MP 取满值）。 */
export function heroUnit(
  heroId: string, faction: Faction, pos: Cell,
  o: { level?: number; equipment?: Partial<Record<ItemSlot, string>>; items?: string[] } = {},
): Unit {
  const h = heroes[heroId]
  if (!h) throw new Error(`未知武将: ${heroId}`)
  return {
    id: heroId, heroId, name: h.name, faction, classId: h.classId,
    level: o.level ?? 1, exp: 0, base: { ...h.base }, hp: h.base.hp, mp: h.base.mp,
    pos: { ...pos }, equipment: { ...o.equipment }, items: [...(o.items ?? [])],
    statuses: [], moved: false, acted: false, alive: true,
  }
}

/** 杂兵/敌将单位（不走武将档案）。 */
export function mobUnit(
  id: string, name: string, classId: ClassId, faction: Faction, pos: Cell, base: Stats,
): Unit {
  return {
    id, heroId: '', name, faction, classId, level: 1, exp: 0, base: { ...base },
    hp: base.hp, mp: base.mp, pos: { ...pos }, equipment: {}, items: [],
    statuses: [], moved: false, acted: false, alive: true,
  }
}

/** 战役数据静态校验（加载期调用）：errors 为阻断性问题，warnings 为建议性提示（战役仍合法）。 */
export function validateBattleDef(def: BattleDef, data: GameData): ValidationReport {
  const errs: string[] = []
  const warns: string[] = []
  const h = def.map.length
  const w = def.map[0]?.length ?? 0
  if (h < 5 || w < 5) errs.push(`地图尺寸 ${w}x${h} 过小（至少 5x5）`)
  for (let y = 0; y < h; y++) if (def.map[y].length !== w) errs.push(`地图第 ${y} 行宽度不一致`)
  const inBounds = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < w && c.y < h
  const seen = new Set<string>()
  const checkPos = (u: Unit, c: Cell, tag: string, overlap: boolean) => {
    if (!inBounds(c)) { errs.push(`${tag} 位置越界 (${c.x},${c.y})`); return }
    const t = def.map[c.y]?.[c.x]
    if (t === undefined) return // 参差短行：宽度错误已在上方收集，此处防崩不重复报
    if (!Number.isFinite(moveCostFor(data.terrains[t], u.classId))) errs.push(`${tag} 站在不可通行地形 ${t}`)
    const k = `${c.x},${c.y}`
    if (overlap) {
      if (seen.has(k)) errs.push(`${tag} 与其他单位位置重叠 (${k})`)
      seen.add(k)
    }
  }
  const checkGear = (u: Unit) => {
    for (const [slot, id] of Object.entries(u.equipment) as Array<[ItemSlot, string | undefined]>) {
      if (id === undefined) continue
      const it = data.items[id]
      if (!it) { errs.push(`单位 ${u.id} 引用未知装备 ${id}`); continue }
      if (it.kind !== slot) errs.push(`单位 ${u.id} 装备 ${it.name} 类型不符（${slot} 槽，实际 ${it.kind}）`)
      if (it.allowedClasses && !it.allowedClasses.includes(u.classId))
        errs.push(`单位 ${u.id} 装备 ${it.name} 兵种不符（${u.classId}，允许 ${it.allowedClasses.join('/')}）`)
    }
    for (const id of u.items) if (!data.items[id]) errs.push(`单位 ${u.id} 携带未知道具 ${id}`)
  }
  def.units.forEach((u) => {
    checkPos(u, u.pos, `单位 ${u.id}`, true)
    if (u.heroId !== '' && !data.heroes[u.heroId]) errs.push(`单位 ${u.id} 引用未知武将 ${u.heroId}`)
    checkGear(u)
  })
  // 【勘误 1】单位 id 跨集合唯一性（def.units + 全部增援 entries；T10 运行时守卫的静态前置）
  const idCounts = new Map<string, number>()
  for (const u of def.units) idCounts.set(u.id, (idCounts.get(u.id) ?? 0) + 1)
  for (const r of def.reinforcements) for (const e of r.entries) idCounts.set(e.unit.id, (idCounts.get(e.unit.id) ?? 0) + 1)
  for (const [id, n] of idCounts) if (n > 1) errs.push(`单位 id 重复: ${id}（出现 ${n} 次）`)
  def.reinforcements.forEach((r) => {
    if (r.turn < 2) errs.push(`增援回合数应 ≥2（turn=${r.turn}）`)
    r.entries.forEach((e) => checkPos(e.unit, e.at, `增援 ${e.unit.id}`, false))
  })
  def.treasureCells.forEach((t) => {
    if (!inBounds(t.cell)) errs.push(`宝物格越界 (${t.cell.x},${t.cell.y})`)
    if (!data.items[t.itemId]) errs.push(`宝物格引用未知道具 ${t.itemId}`)
  })
  if (def.win.kind === 'killCommander' || def.win.kind === 'reach') {
    const id = def.win.unitId
    const inField = def.units.some((u) => u.id === id)
    const inReinf = def.reinforcements.some((r) => r.entries.some((e) => e.unit.id === id))
    if (!inField && !inReinf) errs.push(`胜利条件引用不存在的单位 ${id}`)
    const target = def.units.find((u) => u.id === id) ?? def.reinforcements.flatMap((r) => r.entries.map((e) => e.unit)).find((u) => u.id === id)
    // 【勘误 2】击破目标应为敌方阵营（防数据 bug 导致己方单位阵亡判胜）
    if (def.win.kind === 'killCommander') {
      if (target && target.faction !== 'enemy') errs.push(`击破目标 ${id} 应为敌方阵营（当前 ${target.faction}）`)
    }
    // 抵达格校验：越界，或目标兵种在该格不可通行
    if (def.win.kind === 'reach') {
      if (!inBounds(def.win.cell)) {
        errs.push(`胜利条件抵达格越界 (${def.win.cell.x},${def.win.cell.y})`)
      } else if (target) {
        const t = def.map[def.win.cell.y]?.[def.win.cell.x]
        if (t === undefined || !Number.isFinite(moveCostFor(data.terrains[t], target.classId))) {
          errs.push(`胜利条件抵达格不可达 (${def.win.cell.x},${def.win.cell.y})`)
        }
      }
    }
    // 【勘误 3】目标仅来自增援时告警（增援落点冲突被丢弃则战役不可胜）
    if (!inField && inReinf) warns.push(`胜利目标 ${id} 仅来自增援（若增援被丢弃，战役将不可胜）`)
  }
  def.dialogues.forEach((trig) => {
    if (trig.onDeathOf === undefined) return
    const inField = def.units.some((u) => u.id === trig.onDeathOf)
    const inReinf = def.reinforcements.some((r) => r.entries.some((e) => e.unit.id === trig.onDeathOf))
    if (!inField && !inReinf) errs.push(`对话触发引用不存在的单位 ${trig.onDeathOf}`)
  })
  if (def.win.kind === 'survive' && def.win.untilTurn >= def.maxTurns) {
    errs.push(`坚守 ${def.win.untilTurn} 回合必须小于回合上限 ${def.maxTurns}`)
  }
  for (const d of def.drops ?? []) {
    const inField = def.units.some((u) => u.id === d.unitId)
    const inReinf = def.reinforcements.some((r) => r.entries.some((e) => e.unit.id === d.unitId))
    if (!inField && !inReinf) errs.push(`掉落引用不存在的单位 ${d.unitId}`)
    if (!data.items[d.itemId]) errs.push(`掉落引用未知道具 ${d.itemId}`)
  }
  if (def.maxTurns < 1) errs.push('回合上限必须 ≥1')
  return { errors: errs, warnings: warns }
}
