import type { CampaignState } from './campaign'
import type { GameData } from '../data'

export const SLOT_KEYS = ['auto', '1', '2', '3'] as const
export type SlotKey = typeof SLOT_KEYS[number]

export interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface SaveEnvelope { v: 1; savedAt: number; campaign: CampaignState }

const keyOf = (slot: SlotKey) => `caocaozhuan:save:${slot}`

/** localStorage 薄适配器（非浏览器环境安全降级为空操作）。 */
export const localStorageAdapter: Storage = {
  getItem: (k) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k)),
  setItem: (k, v) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v) },
  removeItem: (k) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(k) },
}

export function serialize(c: CampaignState, now: number = Date.now()): string {
  return JSON.stringify({ v: 1, savedAt: now, campaign: c })
}

/** 形状与引用校验（武将/物品 id 必须在注册表中）；任何不符返回 null。 */
function validCampaign(x: unknown, data: GameData): x is CampaignState {
  if (typeof x !== 'object' || x === null) return false
  const c = x as Record<string, unknown>
  if (c.version !== 1) return false
  if (typeof c.progress !== 'number' || c.progress < 0) return false
  if (!Array.isArray(c.roster) || !Array.isArray(c.inventory)) return false
  const statKeys = ['hp', 'mp', 'atk', 'def', 'spirit', 'agi']
  for (const m of c.roster) {
    if (typeof m !== 'object' || m === null) return false
    const r = m as Record<string, unknown>
    if (typeof r.heroId !== 'string' || !data.heroes[r.heroId]) return false
    if (typeof r.level !== 'number' || typeof r.exp !== 'number') return false
    if (typeof r.base !== 'object' || r.base === null) return false
    const base = r.base as Record<string, unknown>
    if (!statKeys.every((k) => typeof base[k] === 'number')) return false
    if (!Array.isArray(r.items)) return false
    for (const id of r.items) if (typeof id !== 'string' || !data.items[id]) return false
    if (r.equipment !== undefined) {
      if (typeof r.equipment !== 'object' || r.equipment === null) return false
      for (const id of Object.values(r.equipment as Record<string, unknown>))
        if (typeof id !== 'string' || !data.items[id]) return false
    }
  }
  for (const id of c.inventory) if (typeof id !== 'string' || !data.items[id]) return false
  return true
}

export function deserialize(text: string, data: GameData): CampaignState | null {
  try {
    const env = JSON.parse(text) as SaveEnvelope
    if (env?.v !== 1 || typeof env.savedAt !== 'number') return null
    return validCampaign(env.campaign, data) ? env.campaign : null
  } catch {
    return null
  }
}

export function saveSlot(st: Storage, slot: SlotKey, c: CampaignState, now: number = Date.now()): void {
  st.setItem(keyOf(slot), serialize(c, now))
}

export function loadSlot(st: Storage, slot: SlotKey, data: GameData): CampaignState | null {
  const raw = st.getItem(keyOf(slot))
  return raw === null ? null : deserialize(raw, data)
}

export function slotInfo(st: Storage, slot: SlotKey, data: GameData): { status: 'empty' | 'ok' | 'corrupt'; savedAt: number | null } {
  const raw = st.getItem(keyOf(slot))
  if (raw === null) return { status: 'empty', savedAt: null }
  const env = (() => { try { return JSON.parse(raw) as SaveEnvelope } catch { return null } })()
  if (env?.v !== 1 || !validCampaign(env.campaign, data)) return { status: 'corrupt', savedAt: null }
  return { status: 'ok', savedAt: env.savedAt }
}
