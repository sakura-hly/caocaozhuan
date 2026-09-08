import type { BattleDef } from '../../engine/types'
import { heroUnit, mobUnit, parseMap } from './shared'

const ZEIBING = { hp: 44, mp: 0, atk: 10, def: 8, spirit: 3, agi: 7 } // 黄巾贼(步兵)
const GONGSHOU = { hp: 38, mp: 0, atk: 11, def: 5, spirit: 4, agi: 9 } // 黄巾弓手

export const yingchuan: BattleDef = {
  id: 'yingchuan',
  name: '颍川之战',
  desc: '讨伐颍川黄巾，曹操初阵。（教学关：歼灭全部敌军）',
  map: parseMap([
    'ff.......w...PP.',
    '...f.....w...PP.',
    '.....f...w......',
    '..f......w......',
    '.........w......',
    '.........b......',
    '....f....w......',
    '..f......w....f.',
    '.....m...w..f...',
    '....mm...w.mm...',
    '..mmmm...wmmm...',
    '..mmmm...wmmm...',
  ]),
  units: [
    // 我方（西侧出生）
    heroUnit('caocao', 'player', { x: 2, y: 5 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 4 }),
    heroUnit('xiahouyuan', 'player', { x: 1, y: 6 }),
    heroUnit('caoren', 'player', { x: 3, y: 4 }),
    heroUnit('xunyu', 'player', { x: 3, y: 6 }),
    // 敌方（东侧黄巾）——【勘误 4】zl 兵种 taoist、hp 43；zb hp 42
    mobUnit('zl', '张梁', 'taoist', 'enemy', { x: 13, y: 1 }, { hp: 43, mp: 18, atk: 5, def: 4, spirit: 13, agi: 7 }),
    mobUnit('zb', '张宝', 'taoist', 'enemy', { x: 14, y: 1 }, { hp: 42, mp: 16, atk: 4, def: 4, spirit: 12, agi: 8 }),
    mobUnit('e1', '黄巾贼', 'infantry', 'enemy', { x: 12, y: 0 }, ZEIBING),
    mobUnit('e2', '黄巾贼', 'infantry', 'enemy', { x: 11, y: 1 }, ZEIBING),
    mobUnit('e3', '黄巾贼', 'infantry', 'enemy', { x: 12, y: 3 }, ZEIBING),
    mobUnit('e4', '黄巾贼', 'infantry', 'enemy', { x: 11, y: 4 }, ZEIBING),
    mobUnit('e5', '黄巾贼', 'infantry', 'enemy', { x: 12, y: 6 }, ZEIBING),
    mobUnit('g1', '黄巾弓手', 'archer', 'enemy', { x: 12, y: 2 }, GONGSHOU),
    mobUnit('g2', '黄巾弓手', 'archer', 'enemy', { x: 11, y: 5 }, GONGSHOU),
  ],
  reinforcements: [
    { turn: 3, entries: [
      { unit: mobUnit('r1', '黄巾贼', 'infantry', 'enemy', { x: 15, y: 3 }, ZEIBING), at: { x: 15, y: 3 } },
      { unit: mobUnit('r2', '黄巾贼', 'infantry', 'enemy', { x: 15, y: 4 }, ZEIBING), at: { x: 15, y: 4 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 5, y: 2 }, itemId: 'jinchuang_yao', found: false },
    { cell: { x: 1, y: 10 }, itemId: 'iron_sword', found: false },
  ],
  dialogues: [
    // 战前对话（yc_start）由编排层开局播放，不走回合触发
    { turn: 3, dialogueId: 'yc_reinforce' },
    { onDeathOf: 'zl', dialogueId: 'yc_zl_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'annihilate' },
  maxTurns: 20,
}

export interface DialogueLine { speaker: string; text: string }

export const yingchuanDialogues: Record<string, DialogueLine[]> = {
  yc_start: [
    { speaker: '曹操', text: '黄巾作乱，祸害颍川。今日一战，便是曹某扬名之时！' },
    { speaker: '夏侯惇', text: '孟德放心，元让的枪早已饥渴难耐。' },
    { speaker: '荀彧', text: '黄巾贼乌合之众，破之不难。稳扎稳打，勿要冒进。' },
  ],
  yc_reinforce: [
    { speaker: '士兵', text: '报——！黄巾援军自东面杀来！' },
    { speaker: '曹操', text: '慌什么。阵型不乱，稳扎稳打。' },
  ],
  yc_zl_down: [
    { speaker: '张梁', text: '苍天……已死……' },
    { speaker: '曹操', text: '黄巾之乱，当有此报。' },
  ],
}
