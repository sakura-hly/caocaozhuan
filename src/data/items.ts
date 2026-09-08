import type { ItemDef } from '../engine/types'

const defs: ItemDef[] = [
  // 武器
  { id: 'iron_sword', name: '铁剑', kind: 'weapon', bonuses: { atk: 4 }, desc: '制式佩剑' },
  { id: 'qinggang_sword', name: '青釭剑', kind: 'weapon', bonuses: { atk: 8 }, allowedClasses: ['lord', 'infantry'], desc: '宝物：削铁如泥的名剑' },
  { id: 'iron_spear', name: '铁枪', kind: 'weapon', bonuses: { atk: 4 }, allowedClasses: ['infantry', 'cavalry'], desc: '制式长枪' },
  { id: 'shuangtie_ji', name: '双铁戟', kind: 'weapon', bonuses: { atk: 9 }, allowedClasses: ['infantry'], desc: '宝物：典韦的成名兵器' },
  { id: 'iron_bow', name: '铁弓', kind: 'weapon', bonuses: { atk: 4 }, allowedClasses: ['archer'], desc: '制式铁弓' },
  { id: 'tiegu_fan', name: '铁骨扇', kind: 'weapon', bonuses: { atk: 3, spirit: 2 }, allowedClasses: ['strategist', 'taoist'], desc: '军师道士所用' },
  // 防具
  { id: 'cloth_armor', name: '布衣', kind: 'armor', bonuses: { def: 2 }, desc: '粗布护衣' },
  { id: 'iron_armor', name: '铁甲', kind: 'armor', bonuses: { def: 6 }, desc: '制式铁甲' },
  { id: 'mingguang_armor', name: '明光铠', kind: 'armor', bonuses: { def: 10, hp: 10 }, desc: '宝物：光照刺敌的名甲' },
  // 辅助
  { id: 'leather_shield', name: '皮盾', kind: 'accessory', bonuses: { def: 2 }, desc: '皮质圆盾' },
  { id: 'dilu_horse', name: '的卢', kind: 'accessory', bonuses: { move: 2 }, desc: '宝物：跃檀溪的骏马' },
  { id: 'chitu_horse', name: '赤兔马', kind: 'accessory', bonuses: { move: 3 }, allowedClasses: ['cavalry'], desc: '宝物：人中吕布，马中赤兔' },
  { id: 'taiping_book', name: '太平要术', kind: 'accessory', bonuses: { mp: 15, spirit: 3 }, allowedClasses: ['strategist', 'taoist'], desc: '宝物：南华老仙授张角之书' },
  { id: 'sunzi_book', name: '孙子兵法', kind: 'accessory', bonuses: { spirit: 5 }, desc: '宝物：兵家圣典' },
  // 消耗品
  { id: 'jinchuang_yao', name: '金创药', kind: 'consumable', healHp: 60, desc: '回复 60 HP' },
  { id: 'huanshen_dan', name: '还神丹', kind: 'consumable', healMp: 20, desc: '回复 20 MP' },
]

export const items: Record<string, ItemDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
