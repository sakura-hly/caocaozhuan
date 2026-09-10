import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const HUANGJIN = { hp: 54, mp: 0, atk: 10, def: 8, spirit: 3, agi: 7 }  // 黄巾贼(步兵)
const HUANGJIN_GONG = { hp: 44, mp: 0, atk: 11, def: 6, spirit: 4, agi: 9 } // 黄巾弓手
const HUANGJIN_DAO = { hp: 42, mp: 18, atk: 6, def: 6, spirit: 12, agi: 8 } // 黄巾道士（pojia/yaowu 由兵种放行）
const QUSHUAI = { hp: 62, mp: 0, atk: 12, def: 10, spirit: 4, agi: 10 } // 黄巾渠帅(骑兵)

export const qingzhou: BattleDef = {
  id: 'qingzhou',
  name: '青州讨伐战',
  desc: '黄巾余党复起青州，奉命讨平。（胜利：全歼敌军）',
  map: parseMap([
    'mPPPPP........mm',
    'm.P..........f.m',
    '.....f..w......m',
    '.........ww.....',
    '..f......ww.....',
    '.f.......ww..C..',
    '..........w..C..',
    '...w............',
    '..f....w......f.',
    '.m......f.....mm',
    'mm............mm',
    'mm......ff....mm',
  ]),
  units: [
    // 我方（南麓进军）
    heroUnit('caocao', 'player', { x: 3, y: 9 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 2, y: 8 }),
    heroUnit('lidian', 'player', { x: 4, y: 8 }),
    heroUnit('xunyu', 'player', { x: 5, y: 9 }),
    heroUnit('dianwei', 'player', { x: 6, y: 9 }),
    heroUnit('xiahouyuan', 'player', { x: 3, y: 10 }),
    heroUnit('yuejin', 'player', { x: 4, y: 10 }),
    heroUnit('yujin', 'player', { x: 5, y: 11 }), // 本关新参战
    // 敌方（黄巾大营北）
    mobUnit('q0', '黄巾渠帅', 'cavalry', 'enemy', { x: 4, y: 1 }, QUSHUAI),
    mobUnit('q1', '黄巾渠帅', 'cavalry', 'enemy', { x: 5, y: 0 }, QUSHUAI),
    mobUnit('e1', '黄巾贼', 'infantry', 'enemy', { x: 2, y: 2 }, HUANGJIN),
    mobUnit('e2', '黄巾贼', 'infantry', 'enemy', { x: 7, y: 1 }, HUANGJIN),
    mobUnit('e3', '黄巾贼', 'infantry', 'enemy', { x: 9, y: 5 }, HUANGJIN),
    mobUnit('e4', '黄巾贼', 'infantry', 'enemy', { x: 6, y: 4 }, HUANGJIN),
    mobUnit('g1', '黄巾弓手', 'archer', 'enemy', { x: 3, y: 0 }, HUANGJIN_GONG),
    mobUnit('g2', '黄巾弓手', 'archer', 'enemy', { x: 8, y: 2 }, HUANGJIN_GONG),
    mobUnit('d1', '黄巾道士', 'taoist', 'enemy', { x: 4, y: 3 }, HUANGJIN_DAO), // debuff 演出核心，中路必经
  ],
  reinforcements: [
    { turn: 5, entries: [
      { unit: mobUnit('r1', '黄巾贼', 'infantry', 'enemy', { x: 8, y: 0 }, HUANGJIN), at: { x: 8, y: 0 } },
      { unit: mobUnit('r2', '黄巾贼', 'infantry', 'enemy', { x: 7, y: 0 }, HUANGJIN), at: { x: 7, y: 0 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 13, y: 6 }, itemId: 'dilu_horse', found: false }, // 东城马厩
    { cell: { x: 9, y: 8 }, itemId: 'huanshen_dan', found: false },
  ],
  drops: [], // 歼灭战奖励走宝物格
  dialogues: [
    { turn: 3, dialogueId: 'qz_yujin' },
    { onDeathOf: 'q0', dialogueId: 'qz_qushuai_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'annihilate' },
  maxTurns: 20,
}

export type { DialogueLine }

export const qingzhouDialogues: Record<string, DialogueLine[]> = {
  qz_start: [
    { speaker: '曹操', text: '黄巾余党复起青州，裹挟流民，为祸日烈。' },
    { speaker: '荀彧', text: '贼众虽多，法度全无，一击即溃。' },
    { speaker: '曹操', text: '好。兵贵神速，踏平贼营！' },
  ],
  qz_yujin: [
    { speaker: '于禁', text: '黄巾虽众，乌合耳。愿为前锋，先挫其锐！' },
    { speaker: '曹操', text: '文则临阵整肃，勉之！' },
  ],
  qz_qushuai_down: [
    { speaker: '黄巾渠帅', text: '苍天已死……苍天已死啊……' },
    { speaker: '于禁', text: '贼首已诛，尔等还不下马受降！' },
    { speaker: '曹操', text: '传令三军：穷追余寇，毋使漏网！' },
  ],
}
