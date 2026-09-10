import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const BINGZHOU = { hp: 58, mp: 0, atk: 15, def: 10, spirit: 3, agi: 8 }  // 并州兵(步兵)——吕布旧部终战，压过濮阳(56/14)
const XIAPI_GONG = { hp: 46, mp: 0, atk: 14, def: 6, spirit: 4, agi: 9 } // 下邳弓手(城头)——掩护南墙缺口群（距登陆场远，压制的是破城段）
const XP_YAODAO = { hp: 44, mp: 20, atk: 8, def: 6, spirit: 12, agi: 8 } // 下邳妖道——敌方 debuff 施法者（mp20 够破甲5/眩晕10）

const MAX_TURNS = 24
const FLOOD_FROM_TURN = 6 // 水淹起始回合——荀攸献策筑堤，第 6 回合决堤

export const xiapi: BattleDef = {
  id: 'xiapi',
  name: '下邳之战',
  desc: '吕布屡败退保下邳，曹操决泗沂之堤水灌孤城，白门楼缚虎在即。（胜利：击破吕布）',
  map: parseMap([
    'ww..........CCCCC...',
    'w..f.......CCCCCCC..',
    '...........CCCCCCC..',
    '....f......CCC..CC..',
    '...........CC....CC.',
    '..w..............w..',
    '.ww........f.....ww.',
    '.ww...............w.',
    '..ww....f......ww...',
    'w..ww........www....',
    'ww...bb...w..www....',
    'www...........ww....',
  ]),
  units: [
    // 我方（西南登陆区 y10-11；外圈水未闭环、moveCost 3 可涉渡，非唯一通道——开阔推进设计，落点均避开水域）
    heroUnit('caocao', 'player', { x: 4, y: 11 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 4, y: 10 }),
    heroUnit('xiahouyuan', 'player', { x: 5, y: 10 }), // 桥上
    heroUnit('dianwei', 'player', { x: 6, y: 10 }), // 桥上
    heroUnit('xuchu', 'player', { x: 7, y: 11 }),
    heroUnit('lidian', 'player', { x: 3, y: 11 }),
    heroUnit('xunyu', 'player', { x: 7, y: 10 }),
    heroUnit('xunyou', 'player', { x: 3, y: 10 }), // 本关新参战——水攻之策献计者（xp_start 首行）
    // 敌方（下邳大城：东北 C 城区，南/西水泽环城）
    // 吕布终战：战场内 base 覆写，终章强度——hp 88 / atk 22 均压过濮阳（72/19），level 10 顺延濮阳 8；
    // 同一敌将终战全面上调是刻意设计，非 bug
    heroUnit('lvbu', 'enemy', { x: 15, y: 2 }, { level: 10, base: { hp: 88, mp: 0, atk: 22, def: 13, spirit: 5, agi: 13 } }), // 城心
    heroUnit('chengong', 'enemy', { x: 13, y: 3 }, { level: 7 }), // 城内，不覆写 base
    // 敌方 debuff 施法者必须是 taoist 兵种：AI 的 debuff 分支按兵种放行（strategist 只治疗/攻击施法），
    // 陈宫是 strategist 不会施 debuff——引擎口径而非疏漏，故另设下邳妖道承担 debuff
    mobUnit('d1', '下邳妖道', 'taoist', 'enemy', { x: 14, y: 3 }, XP_YAODAO),
    mobUnit('e1', '并州兵', 'infantry', 'enemy', { x: 10, y: 5 }, BINGZHOU), // 城外阻滞
    mobUnit('e2', '并州兵', 'infantry', 'enemy', { x: 9, y: 8 }, BINGZHOU), // 城外阻滞
    mobUnit('e3', '并州兵', 'infantry', 'enemy', { x: 11, y: 1 }, BINGZHOU), // 城门内
    mobUnit('e4', '并州兵', 'infantry', 'enemy', { x: 12, y: 4 }, BINGZHOU), // 城门内
    mobUnit('e5', '并州兵', 'infantry', 'enemy', { x: 15, y: 4 }, BINGZHOU), // 纵深
    mobUnit('e6', '并州兵', 'infantry', 'enemy', { x: 16, y: 1 }, BINGZHOU), // 纵深
    // 三名弓手 (12,1)(16,3)(13,2) 已逐一对照地图核为 C 城池格（非水非山），无需挪位
    mobUnit('g1', '下邳弓手', 'archer', 'enemy', { x: 12, y: 1 }, XIAPI_GONG), // 城头
    mobUnit('g2', '下邳弓手', 'archer', 'enemy', { x: 16, y: 3 }, XIAPI_GONG), // 城头
    mobUnit('g3', '下邳弓手', 'archer', 'enemy', { x: 13, y: 2 }, XIAPI_GONG), // 城头
  ],
  reinforcements: [
    // 水淹同回合（turn 6）：城东缘守军突围演出——雨天 + xp_shuiyan 台词 + 增援三重奏；两落点均已核非水
    { turn: 6, entries: [
      { unit: mobUnit('r1', '并州兵', 'infantry', 'enemy', { x: 16, y: 6 }, BINGZHOU), at: { x: 16, y: 6 } },
      { unit: mobUnit('r2', '并州兵', 'infantry', 'enemy', { x: 18, y: 8 }, BINGZHOU), at: { x: 18, y: 8 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 14, y: 2 }, itemId: 'shuangtie_ji', found: false }, // 城内 C 格——双铁戟（典韦成名兵器，入城可取）
    { cell: { x: 6, y: 9 }, itemId: 'jinchuang_yao', found: false }, // 登陆桥北——桥头补给
  ],
  drops: [], // 方天画戟、赤兔虎牢已掉；白门楼抉择（xiapi_post）处置吕布本人非宝物，本关宝物走宝物格
  dialogues: [
    { turn: 6, dialogueId: 'xp_shuiyan' },
    { onDeathOf: 'lvbu', dialogueId: 'xp_lvbu_down' },
  ],
  weather: 'sunny',
  // 水淹下邳演出：第 6 回合转雨并持续至终局——引擎按精确回合匹配，只写 turn 6 则后续落回 20% 随机漂移，
  // 与「一城皆成泽国」台词不符；转雨时刻与 xp_shuiyan 台词、城东增援同回合三重奏
  weatherScript: Array.from({ length: MAX_TURNS - FLOOD_FROM_TURN + 1 }, (_, i) => ({ turn: FLOOD_FROM_TURN + i, weather: 'rainy' as const })),
  win: { kind: 'killCommander', unitId: 'lvbu' },
  maxTurns: MAX_TURNS,
}

export const xiapiDialogues: Record<string, DialogueLine[]> = {
  xp_start: [
    { speaker: '荀攸', text: '吕布锐气虽挫，犹自恃勇。下邳城坚，强攻则士卒多伤——攸观泗、沂二水皆傍城而过，若决其堤，一城皆成泽国，敌军不战自乱。' },
    { speaker: '吕布', text: '曹贼虽众，吾有并州铁骑、坚城深池，何惧之有！深沟高垒，看他能奈我何！' },
    { speaker: '曹操', text: '公达之策，正合我意。传令筑堤蓄水，先困后淹，下邳之破只在指顾之间。' },
  ],
  xp_shuiyan: [
    { speaker: '曹操', text: '堤成水就——传令决泗沂之堤，灌下邳！教吕布知我军威！' },
    { speaker: '陈宫', text: '大水一至，城不攻自破……此天亡布，非战之罪也。' },
    { speaker: '吕布', text: '水势临城，军心已乱……吾且聚残兵，背城死战！' },
  ],
  xp_lvbu_down: [
    { speaker: '吕布', text: '缚太急，乞缓之……曹公！布今诚心归降，为公将骑兵，天下不足定也！' },
    { speaker: '荀攸', text: '主公慎思——吕布虓虎之性，弑丁原、董卓以博富贵，留之恐养虎遗患。' },
    { speaker: '曹操', text: '缚虎不得不急。奉先既擒，且押上白门楼，如何发落，容我三思。' },
  ],
}
