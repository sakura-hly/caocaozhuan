import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const BINGZHOU = { hp: 56, mp: 0, atk: 13, def: 8, spirit: 3, agi: 11 } // 并州骑兵
const BINGZHOU_GONG = { hp: 46, mp: 0, atk: 14, def: 6, spirit: 4, agi: 9 } // 并州弓手
/** 三英（友军）按 Lv4 强度标定。 */
const LB4 = { hp: 66, mp: 14, atk: 15, def: 12, spirit: 11, agi: 11 }
const GY4 = { hp: 72, mp: 0, atk: 20, def: 12, spirit: 8, agi: 13 }
const ZF4 = { hp: 78, mp: 0, atk: 19, def: 11, spirit: 5, agi: 12 }

export const hulao: BattleDef = {
  id: 'hulao',
  name: '虎牢关之战',
  desc: '吕布扼守虎牢，三英轮战吕布。（胜利：击破吕布）',
  map: parseMap([
    'ff..f.......G...CC.',
    '.f..........G...CC.',
    '....f.......G...PP.',
    '..f.........G...PP.',
    '...f........G......',
    '...................',
    '.....m......G......',
    '..m.........G......',
    '.mm....f....G......',
    '.mm.........G......',
    '...m........G......',
    'f...........G......',
  ]),
  units: [
    // 我方（西侧）
    heroUnit('caocao', 'player', { x: 2, y: 6 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 5 }),
    heroUnit('xiahouyuan', 'player', { x: 1, y: 7 }),
    heroUnit('caoren', 'player', { x: 3, y: 5 }),
    heroUnit('xunyu', 'player', { x: 3, y: 7 }),
    heroUnit('caohong', 'player', { x: 4, y: 6 }),
    heroUnit('dianwei', 'player', { x: 2, y: 4 }), // 本关新参战
    // 友军（三英）
    heroUnit('liubei', 'ally', { x: 6, y: 6 }, { level: 4, base: LB4 }),
    heroUnit('guanyu', 'ally', { x: 7, y: 5 }, { level: 4, base: GY4 }),
    heroUnit('zhangfei', 'ally', { x: 7, y: 7 }, { level: 4, base: ZF4 }),
    // 敌方
    heroUnit('lvbu', 'enemy', { x: 15, y: 5 }, { level: 8, base: { hp: 96, mp: 0, atk: 21, def: 13, spirit: 6, agi: 13 } }),
    mobUnit('c1', '并州骑兵', 'cavalry', 'enemy', { x: 14, y: 3 }, BINGZHOU),
    mobUnit('c2', '并州骑兵', 'cavalry', 'enemy', { x: 16, y: 4 }, BINGZHOU),
    mobUnit('c3', '并州骑兵', 'cavalry', 'enemy', { x: 14, y: 7 }, BINGZHOU),
    mobUnit('c4', '并州骑兵', 'cavalry', 'enemy', { x: 16, y: 8 }, BINGZHOU),
    mobUnit('g1', '并州弓手', 'archer', 'enemy', { x: 15, y: 2 }, BINGZHOU_GONG),
    mobUnit('g2', '并州弓手', 'archer', 'enemy', { x: 15, y: 9 }, BINGZHOU_GONG),
  ],
  reinforcements: [
    { turn: 4, entries: [
      { unit: mobUnit('c5', '并州骑兵', 'cavalry', 'enemy', { x: 17, y: 5 }, BINGZHOU), at: { x: 17, y: 5 } },
      { unit: mobUnit('c6', '并州骑兵', 'cavalry', 'enemy', { x: 17, y: 6 }, BINGZHOU), at: { x: 17, y: 6 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 6, y: 9 }, itemId: 'jinchuang_yao', found: false },
    { cell: { x: 15, y: 10 }, itemId: 'iron_armor', found: false },
  ],
  drops: [
    { unitId: 'lvbu', itemId: 'fangtian_ji' },
    { unitId: 'lvbu', itemId: 'chitu_horse' },
  ],
  dialogues: [
    { turn: 2, dialogueId: 'hl_sanying' },
    { onDeathOf: 'lvbu', dialogueId: 'hl_lvbu_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'killCommander', unitId: 'lvbu' },
  maxTurns: 20,
}

export type { DialogueLine }

export const hulaoDialogues: Record<string, DialogueLine[]> = {
  hl_start: [
    { speaker: '曹操', text: '虎牢关乃洛阳门户，吕布虽勇，联军势大，诸位勉力！' },
    { speaker: '典韦', text: '主公放心，吕布再猛，也得先过俺这对铁戟！' },
    { speaker: '刘备', text: '玄德愿与孟德同进，共讨国贼。' },
  ],
  hl_sanying: [
    { speaker: '吕布', text: '燕人张飞！环眼贼也敢挡我？' },
    { speaker: '张飞', text: '三姓家奴休走！燕人张飞在此！' },
    { speaker: '关羽', text: '三弟少歇，待某来会他！' },
    { speaker: '刘备', text: '二弟三弟莫要恋战，双剑齐上，拖住他便好。' },
  ],
  hl_lvbu_down: [
    { speaker: '吕布', text: '大耳儿！最是叵测……居然……是你们赢了……' },
    { speaker: '张飞', text: '哈哈哈！人中吕布，也不过如此！' },
    { speaker: '曹操', text: '虎牢已破，洛阳在望。传令：追逐残敌，抢占关城！' },
  ],
}
