import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

// 敌方杂兵 atk 为八连战标定值（各 -2，原始 13/13/8）——泛用 AI 自打四 seed 可胜口径
const DANYANG = { hp: 52, mp: 0, atk: 11, def: 9, spirit: 3, agi: 7 }  // 丹阳兵(步兵)——陶谦精锐，守两桥头与东岸
const XUZHOU_GONG = { hp: 44, mp: 0, atk: 11, def: 6, spirit: 4, agi: 9 } // 徐州弓手(城墙)
const TAO_MULIAO = { hp: 48, mp: 24, atk: 6, def: 8, spirit: 14, agi: 9 } // 陶谦幕僚(军师)——zhiyu 治疗保主将

export const xuzhou: BattleDef = {
  id: 'xuzhou',
  name: '徐州复仇战',
  desc: '曹嵩死于徐州，曹操起兵复仇，陶谦闭城固守。（胜利：击破陶谦）',
  map: parseMap([
    '....f......w....CC',
    '...........w....CC',
    '..f........w...C.C',
    '..........ww......',
    '....f.....bb...C..',
    '..........ww..CCCC',
    '..m.......ww...CCC',
    '..........bb......',
    '.mm.......ww......',
    '..m.......ww....ff',
    'mm........ww....ff',
    'm.........ww......',
  ]),
  units: [
    // 我方（西岸进军）
    heroUnit('caocao', 'player', { x: 2, y: 5 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 4 }),
    heroUnit('dianwei', 'player', { x: 2, y: 4 }),
    heroUnit('xiahouyuan', 'player', { x: 1, y: 6 }),
    heroUnit('xunyu', 'player', { x: 3, y: 6 }), // (2,6) 为山地，军师不可入，右移一格落平原
    heroUnit('lidian', 'player', { x: 1, y: 7 }),
    heroUnit('xuchu', 'player', { x: 2, y: 7 }), // 本关新参战
    // 敌方（陶谦闭城固守，护城河两桥为 choke）
    heroUnit('taoqian', 'enemy', { x: 15, y: 5 }, { level: 4 }), // 敌主将，东城内（标级对齐华雄/吕布先例，面板不显示 Lv1）
    mobUnit('m0', '陶谦幕僚', 'strategist', 'enemy', { x: 13, y: 6 }, TAO_MULIAO), // 持 zhiyu（AI 按兵种放行），贴身保陶谦
    mobUnit('e1', '丹阳兵', 'infantry', 'enemy', { x: 9, y: 4 }, DANYANG), // 北桥头
    mobUnit('e2', '丹阳兵', 'infantry', 'enemy', { x: 9, y: 7 }, DANYANG), // 南桥头
    mobUnit('e3', '丹阳兵', 'infantry', 'enemy', { x: 12, y: 4 }, DANYANG), // 东岸
    mobUnit('e4', '丹阳兵', 'infantry', 'enemy', { x: 13, y: 5 }, DANYANG), // 东岸
    mobUnit('g1', '徐州弓手', 'archer', 'enemy', { x: 15, y: 2 }, XUZHOU_GONG), // 城墙
    mobUnit('g2', '徐州弓手', 'archer', 'enemy', { x: 14, y: 6 }, XUZHOU_GONG), // 城墙下
  ],
  reinforcements: [], // 陶谦闭城固守：无增援，压力全部来自初始布防与军师治疗
  // 口径说明：「闭城固守」是文案——引擎 AI 无守城锚定，陶谦会主动出击（反而保住 16 回合预算），非 bug
  treasureCells: [], // 奖励走战后抉择 xuzhou_post（安民+1 / 屠城-1 得明光铠 mingguang_armor）
  drops: [],
  dialogues: [
    { turn: 2, dialogueId: 'xz_xuchu' },
    { onDeathOf: 'taoqian', dialogueId: 'xz_taoqian_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'killCommander', unitId: 'taoqian' },
  maxTurns: 16,
}


export const xuzhouDialogues: Record<string, DialogueLine[]> = {
  xz_start: [
    { speaker: '曹操', text: '父亲曹嵩惨死徐州，此仇不共戴天！传令三军，即刻起兵伐陶谦！' },
    { speaker: '荀彧', text: '主公，兖州初定，徐州兵精粮足，陶谦又据城而守，还望慎重。' },
    { speaker: '曹操', text: '父仇不报，我有何面目立于天地！大军渡河，直取郯城！' },
  ],
  xz_xuchu: [
    { speaker: '许褚', text: '谯县许褚，字仲康，力能曳牛！愿为前部，替主公踏平徐州！' },
    { speaker: '曹操', text: '仲康勇力之名，曹某早有耳闻。好，便教徐州人见识你的手段！' },
  ],
  xz_taoqian_down: [
    { speaker: '陶谦', text: '害曹公之父者，乃我部下张闿，非老夫本意……今城破，唯死谢罪。' },
    { speaker: '陶谦', text: '只求一事：入城之后，勿害百姓。徐州生灵，尽托于公。' },
    { speaker: '曹操', text: '父债已清。传令收兵——城中之事，曹某自有分寸。' },
  ],
}
