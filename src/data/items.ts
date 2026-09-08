import type { ItemDef } from '../engine/types'

const defs: ItemDef[] = [
  { id: 'jinchuang_yao', name: '金创药', kind: 'consumable', healHp: 60, desc: '回复 60 HP' },
  { id: 'huanshen_dan', name: '还神丹', kind: 'consumable', healMp: 20, desc: '回复 20 MP' },
]

export const items: Record<string, ItemDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
