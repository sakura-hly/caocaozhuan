import type { BattleDef, BattleState, ItemSlot, Stats, Unit } from '../engine/types'
import type { GameData } from '../data'
import { gameData } from '../data'
import { battles } from '../data/battles'
import { effectiveStats } from '../engine/internal'
import { EXP_PER_LEVEL } from '../engine/growth'

/** 战役时间轴（M3 = 前 3 场）。 */
export const CAMPAIGN_BATTLES: readonly string[] = ['yingchuan', 'sishui', 'hulao']

export interface RosterMember {
  heroId: string; level: number; exp: number
  base: Stats
  equipment: Partial<Record<ItemSlot, string>>
  items: string[]
}

export interface CampaignState {
  version: 1
  progress: number
  roster: RosterMember[]
  inventory: string[]
}

export type OpResult = { ok: true; campaign: CampaignState } | { ok: false; error: string }

/** 新游戏：roster 按首场战役我方阵容初始化（模板装备/携带即为初始值），仓库发基础消耗品。 */
export function newGame(data: GameData = gameData): CampaignState {
  const def = battles[CAMPAIGN_BATTLES[0]!]
  const roster: RosterMember[] = def.units
    .filter((u) => u.faction === 'player' && u.heroId !== '')
    .map((u) => ({
      heroId: u.heroId, level: u.level, exp: u.exp, base: { ...u.base },
      equipment: { ...u.equipment }, items: [...u.items],
    }))
  return { version: 1, progress: 0, roster, inventory: ['jinchuang_yao', 'jinchuang_yao', 'huanshen_dan'] }
}

/** 当前应战战役 id；null = 全部通关。 */
export function currentBattleId(c: CampaignState): string | null {
  return c.progress >= CAMPAIGN_BATTLES.length ? null : CAMPAIGN_BATTLES[c.progress]!
}

const memberOf = (c: CampaignState, heroId: string) => c.roster.find((m) => m.heroId === heroId)

function withRoster(c: CampaignState, heroId: string, patch: (m: RosterMember) => RosterMember): OpResult {
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  return { ok: true, campaign: { ...c, roster: c.roster.map((x) => (x.heroId === heroId ? patch(x) : x)) } }
}

/** 装备：从仓库装入指定槽位；旧装备回仓库。校验：在仓库 / kind 与槽位一致 / 兵种允许。 */
export function equipItem(c: CampaignState, heroId: string, slot: ItemSlot, itemId: string, data: GameData = gameData): OpResult {
  const it = data.items[itemId]
  const hero = data.heroes[heroId]
  if (!it) return { ok: false, error: `未知物品: ${itemId}` }
  if (!hero) return { ok: false, error: `未知武将: ${heroId}` }
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  const idx = c.inventory.indexOf(itemId)
  if (idx < 0) return { ok: false, error: `物品不在仓库: ${itemId}` }
  if (it.kind !== slot) return { ok: false, error: `${it.name} 不能装入 ${slot} 槽` }
  if (it.allowedClasses && !it.allowedClasses.includes(hero.classId))
    return { ok: false, error: `${hero.name}（${data.classes[hero.classId].name}）不能用 ${it.name}` }
  const prev = m.equipment[slot]
  const inventory = c.inventory.filter((_, i) => i !== idx)
  if (prev) inventory.push(prev)
  return {
    ok: true,
    campaign: {
      ...c, inventory,
      roster: c.roster.map((x) => x.heroId === heroId
        ? { ...x, equipment: { ...x.equipment, [slot]: itemId } } : x),
    },
  }
}

/** 卸下：槽位 → 仓库。 */
export function unequipItem(c: CampaignState, heroId: string, slot: ItemSlot, _data: GameData = gameData): OpResult {
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  const prev = m.equipment[slot]
  if (!prev) return { ok: false, error: '该槽位没有装备' }
  const r = withRoster(c, heroId, (x) => {
    const equipment = { ...x.equipment }
    delete equipment[slot]
    return { ...x, equipment }
  })
  return r.ok ? { ok: true, campaign: { ...r.campaign, inventory: [...c.inventory, prev] } } : r
}

/** 携带：仓库消耗品 → 武将。 */
export function assignItem(c: CampaignState, heroId: string, itemId: string, data: GameData = gameData): OpResult {
  const it = data.items[itemId]
  if (!it || it.kind !== 'consumable') return { ok: false, error: `非消耗品: ${itemId}` }
  const idx = c.inventory.indexOf(itemId)
  if (idx < 0) return { ok: false, error: `物品不在仓库: ${itemId}` }
  const r = withRoster(c, heroId, (m) => ({ ...m, items: [...m.items, itemId] }))
  return r.ok
    ? { ok: true, campaign: { ...r.campaign, inventory: c.inventory.filter((_, i) => i !== idx) } }
    : r
}

/** 取回：武将消耗品 → 仓库（同名消耗品只取回一份，与仓库移除语义对齐）。 */
export function unassignItem(c: CampaignState, heroId: string, itemId: string, _data: GameData = gameData): OpResult {
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  const idx = m.items.indexOf(itemId)
  if (idx < 0) return { ok: false, error: `未携带: ${itemId}` }
  const r = withRoster(c, heroId, (x) => ({ ...x, items: x.items.filter((_, i) => i !== idx) }))
  return r.ok
    ? { ok: true, campaign: { ...r.campaign, inventory: [...c.inventory, itemId] } }
    : r
}

/** 整备注入：roster 属性覆盖战役定义中的我方武将单位；名册外武将按模板参战（结算时自动入册）。 */
export function deployBattle(def: BattleDef, c: CampaignState, data: GameData = gameData): BattleDef {
  const units = def.units.map((u) => {
    if (u.faction !== 'player' || u.heroId === '') return u
    const m = c.roster.find((r) => r.heroId === u.heroId)
    if (!m) return u
    const merged: Unit = {
      ...u, level: m.level, exp: m.exp, base: { ...m.base },
      equipment: { ...m.equipment }, items: [...m.items],
    }
    const eff = effectiveStats(merged, data)
    merged.hp = eff.hp
    merged.mp = eff.mp
    return merged
  })
  return { ...def, units }
}

export interface SettleReportHero {
  heroId: string; name: string
  expGained: number   // 本场折算总经验（跨级按 100/级）
  levelsGained: number
  toLevel: number
}
export interface SettleReport {
  won: boolean
  heroes: SettleReportHero[]       // 仅本场参战武将
  gained: string[]                 // 入库物品 id（宝物 + 掉落）
}

/** 战后结算：胜利收割成长与物品并推进进度；败北原样返回（防刷经验）。 */
export function settleBattle(
  c: CampaignState, def: BattleDef, final: BattleState, data: GameData = gameData,
): { campaign: CampaignState; report: SettleReport } {
  if (final.finished !== 'won') {
    return { campaign: c, report: { won: false, heroes: [], gained: [] } }
  }
  const roster = c.roster.map((m) => ({ ...m, base: { ...m.base }, equipment: { ...m.equipment }, items: [...m.items] }))
  const heroes: SettleReportHero[] = []
  for (const u of final.units) {
    if (u.faction !== 'player' || u.heroId === '') continue
    const m = roster.find((x) => x.heroId === u.heroId)
    // 名册外武将的战报基线取战役定义模板值（Lv>1 登场不虚报经验）
    const tpl = def.units.find((d) => d.heroId === u.heroId)
    const from = m ?? { heroId: u.heroId, level: tpl?.level ?? 1, exp: tpl?.exp ?? 0, base: { ...u.base }, equipment: { ...u.equipment }, items: [] }
    heroes.push({
      heroId: u.heroId, name: data.heroes[u.heroId]?.name ?? u.heroId,
      expGained: (u.level - from.level) * EXP_PER_LEVEL + (u.exp - from.exp),
      levelsGained: u.level - from.level, toLevel: u.level,
    })
    if (m) {
      m.level = u.level; m.exp = u.exp; m.base = { ...u.base }; m.items = [...u.items]
    } else {
      roster.push({ heroId: u.heroId, level: u.level, exp: u.exp, base: { ...u.base }, equipment: { ...u.equipment }, items: [...u.items] })
    }
  }
  const gained = [...final.rewards]
  for (const d of def.drops ?? []) {
    const t = final.units.find((u) => u.id === d.unitId)
    if (t && !t.alive) gained.push(d.itemId)
  }
  return {
    campaign: {
      ...c,
      progress: Math.min(c.progress + 1, CAMPAIGN_BATTLES.length),
      roster,
      inventory: [...c.inventory, ...gained],
    },
    report: { won: true, heroes, gained },
  }
}
