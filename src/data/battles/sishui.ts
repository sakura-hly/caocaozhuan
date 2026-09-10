import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const XILIANG = { hp: 52, mp: 0, atk: 12, def: 9, spirit: 3, agi: 7 }  // 西凉兵(步兵)
const XILIANG_GONG = { hp: 44, mp: 0, atk: 13, def: 6, spirit: 4, agi: 9 } // 西凉弓手
const XIANGYONG = { hp: 56, mp: 0, atk: 13, def: 8, spirit: 3, agi: 11 } // 凉州骑兵(增援)
/** 三英（友军）按 Lv3 强度标定：保证友军打得动华雄军。 */
const LB3 = { hp: 62, mp: 12, atk: 14, def: 11, spirit: 10, agi: 10 }
const GY3 = { hp: 66, mp: 0, atk: 19, def: 11, spirit: 7, agi: 12 }
const ZF3 = { hp: 72, mp: 0, atk: 18, def: 10, spirit: 4, agi: 11 }

export const sishui: BattleDef = {
  id: 'sishui',
  name: '汜水关之战',
  desc: '关东联军讨董，关羽温酒斩华雄。（胜利：击破华雄）',
  map: parseMap([
    'ff..f.....G..CC.',
    '.f........G..CC.',
    '....f.....G..PP.',
    '..f.......G..PP.',
    '...f......G.....',
    '................',
    '.....m....G.....',
    '..m.......G.....',
    '.mm...f...G.....',
    '.mm.......G.....',
    '..m.......G.....',
    'f.........G.....',
  ]),
  units: [
    // 我方（西侧联军大营）
    heroUnit('caocao', 'player', { x: 2, y: 6 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 5 }),
    heroUnit('xiahouyuan', 'player', { x: 1, y: 7 }),
    heroUnit('caoren', 'player', { x: 3, y: 5 }),
    heroUnit('xunyu', 'player', { x: 3, y: 7 }),
    heroUnit('caohong', 'player', { x: 4, y: 6 }), // 本关新参战
    // 友军（刘备军，关羽将斩华雄）
    heroUnit('liubei', 'ally', { x: 6, y: 5 }, { level: 3, base: LB3 }),
    heroUnit('guanyu', 'ally', { x: 7, y: 4 }, { level: 3, base: GY3 }),
    heroUnit('zhangfei', 'ally', { x: 7, y: 6 }, { level: 3, base: ZF3 }),
    // 敌方（关东侧董卓军）
    heroUnit('huaxiong', 'enemy', { x: 13, y: 5 }, { level: 5, base: { hp: 78, mp: 0, atk: 16, def: 10, spirit: 4, agi: 10 } }),
    mobUnit('e1', '西凉兵', 'infantry', 'enemy', { x: 12, y: 3 }, XILIANG),
    mobUnit('e2', '西凉兵', 'infantry', 'enemy', { x: 14, y: 4 }, XILIANG),
    mobUnit('e3', '西凉兵', 'infantry', 'enemy', { x: 12, y: 7 }, XILIANG),
    mobUnit('e4', '西凉兵', 'infantry', 'enemy', { x: 14, y: 8 }, XILIANG),
    mobUnit('g1', '西凉弓手', 'archer', 'enemy', { x: 13, y: 2 }, XILIANG_GONG),
    mobUnit('g2', '西凉弓手', 'archer', 'enemy', { x: 13, y: 9 }, XILIANG_GONG),
  ],
  reinforcements: [
    { turn: 4, entries: [
      { unit: mobUnit('r1', '凉州骑兵', 'cavalry', 'enemy', { x: 15, y: 5 }, XIANGYONG), at: { x: 15, y: 5 } },
      { unit: mobUnit('r2', '凉州骑兵', 'cavalry', 'enemy', { x: 15, y: 6 }, XIANGYONG), at: { x: 15, y: 6 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 5, y: 9 }, itemId: 'jinchuang_yao', found: false },
    { cell: { x: 14, y: 10 }, itemId: 'huanshen_dan', found: false },
  ],
  drops: [{ unitId: 'huaxiong', itemId: 'iron_armor' }],
  dialogues: [
    { turn: 3, dialogueId: 'ss_ally' },
    { onDeathOf: 'huaxiong', dialogueId: 'ss_hua_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'killCommander', unitId: 'huaxiong' },
  maxTurns: 20,
}


export const sishuiDialogues: Record<string, DialogueLine[]> = {
  ss_start: [
    { speaker: '袁绍', text: '华雄连斩我联军数将，何人敢再去迎战？' },
    { speaker: '关羽', text: '小将愿往，斩华雄之首，献于帐下！' },
    { speaker: '曹操', text: '好！且饮此杯，壮行色。' },
    { speaker: '关羽', text: '酒且斟下，某去便来！' },
  ],
  ss_ally: [
    { speaker: '刘备', text: '云长出阵，翼德压阵，莫教敌军抄了后路。' },
    { speaker: '张飞', text: '俺早等不及了！谁拦俺，俺捅谁！' },
  ],
  ss_hua_down: [
    { speaker: '华雄', text: '竟然……败于一介马弓手……' },
    { speaker: '关羽', text: '华雄已斩——其酒尚温！' },
    { speaker: '曹操', text: '云长神威！传令三军，趁势夺关！' },
  ],
}
