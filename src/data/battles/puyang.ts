import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const BINGZHOU = { hp: 56, mp: 0, atk: 14, def: 10, spirit: 3, agi: 8 }  // 并州兵(步兵)——吕布旧部，守三门内侧
const PUYANG_GONG = { hp: 46, mp: 0, atk: 14, def: 6, spirit: 4, agi: 9 } // 濮阳弓手(城头)
const LB_YAODAO = { hp: 42, mp: 18, atk: 8, def: 6, spirit: 12, agi: 8 }  // 吕布军妖道——敌方 debuff 施法者

export const puyang: BattleDef = {
  id: 'puyang',
  name: '濮阳之战',
  desc: '吕布袭据兖州，退保濮阳，曹操回军围城。（胜利：击破吕布）',
  map: parseMap([
    '.....f.......G.CCCC.',
    '.............G..CC..',
    '................CC..',
    '..f..........G...C..',
    '....f........G......',
    '.........f...G...CC.',
    '..............b..CC.',
    '..m..........G......',
    '....m........G......',
    '..f...........b.....',
    '...f.........G...ff.',
    'mm...........G....m.',
  ]),
  units: [
    // 我方（西侧纵队 y5-8，三门择路攻城）
    heroUnit('caocao', 'player', { x: 2, y: 6 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 5 }),
    heroUnit('xiahouyuan', 'player', { x: 3, y: 5 }),
    heroUnit('dianwei', 'player', { x: 1, y: 7 }),
    heroUnit('xuchu', 'player', { x: 2, y: 8 }),
    heroUnit('lidian', 'player', { x: 3, y: 7 }),
    heroUnit('xunyu', 'player', { x: 1, y: 6 }),
    heroUnit('guojia', 'player', { x: 3, y: 6 }), // 本关新参战——我方首个 debuff 施法者（taoist 才持 pojia/xuanyun/yaowu）
    // 敌方（濮阳城内，竖城墙 x=13 三缺口 y2/y6/y9 为三门）
    // 吕布复战：战场内 base 覆写（虎牢为 hp66/atk21/def13）——濮阳 hp 更高 atk 更低，围城消耗战口径，非 bug
    heroUnit('lvbu', 'enemy', { x: 16, y: 2 }, { level: 7, base: { hp: 72, mp: 0, atk: 19, def: 12, spirit: 5, agi: 13 } }), // 城心
    heroUnit('chengong', 'enemy', { x: 17, y: 1 }, { level: 6 }), // 城内后排，不覆写 base
    // 敌方 debuff 施法者必须是 taoist 兵种：AI 的 debuff 分支按兵种放行（strategist 只治疗/攻击施法），
    // 陈宫是 strategist 不会施 debuff——引擎口径而非疏漏，故另设吕布军妖道承担 debuff
    mobUnit('d1', '吕布军妖道', 'taoist', 'enemy', { x: 16, y: 3 }, LB_YAODAO),
    mobUnit('e1', '并州兵', 'infantry', 'enemy', { x: 14, y: 2 }, BINGZHOU), // 北门内侧
    mobUnit('e2', '并州兵', 'infantry', 'enemy', { x: 14, y: 6 }, BINGZHOU), // 中门内侧（桥头）
    mobUnit('e3', '并州兵', 'infantry', 'enemy', { x: 14, y: 9 }, BINGZHOU), // 南门内侧（桥头）
    mobUnit('e4', '并州兵', 'infantry', 'enemy', { x: 15, y: 4 }, BINGZHOU),
    mobUnit('g1', '濮阳弓手', 'archer', 'enemy', { x: 15, y: 0 }, PUYANG_GONG), // 城头
    mobUnit('g2', '濮阳弓手', 'archer', 'enemy', { x: 18, y: 5 }, PUYANG_GONG), // 城头
  ],
  reinforcements: [], // 吕布出击是常态——城内守军足以施压，不另设增援
  treasureCells: [
    { cell: { x: 17, y: 2 }, itemId: 'sunzi_book', found: false }, // 城内 C 格
    { cell: { x: 15, y: 6 }, itemId: 'huanshen_dan', found: false }, // 城内空地
  ],
  drops: [], // 方天画戟虎牢已掉，本关宝物走宝物格
  dialogues: [
    { turn: 3, dialogueId: 'py_chengong' },
    { onDeathOf: 'lvbu', dialogueId: 'py_lvbu_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'killCommander', unitId: 'lvbu' },
  maxTurns: 20,
}

export const puyangDialogues: Record<string, DialogueLine[]> = {
  py_start: [
    { speaker: '曹操', text: '吕布袭我兖州，幸得荀彧、程昱死守三城，基业未失。今回军濮阳，誓擒吕奉先！' },
    { speaker: '陈宫', text: '曹操远来兵疲，濮阳城坚，可凭深沟高垒，待其粮尽自退。' },
    { speaker: '吕布', text: '吾有画戟赤兔，何惧曹贼！彼若来攻，吾自出城破之！' },
  ],
  py_chengong: [
    { speaker: '陈宫', text: '曹军势大，将军不可力敌。画戟赤兔，暂避锋芒——先挫其锐，再图后计。' },
    { speaker: '吕布军妖道', text: '谨遵军师之命。咒甲之术已成，教曹军刀枪不入者，寸步难行！' },
  ],
  py_lvbu_down: [
    { speaker: '吕布', text: '大丈夫岂能久居人下……濮阳已不可守，且走定陶，再整兵马！' },
    { speaker: '郭嘉', text: '吕布有虓虎之勇，而无谋断之明。鹰狼之性终不能久，此去必败亡无疑。' },
    { speaker: '曹操', text: '兖州已复，奉孝所言极是。传令追击，勿使奉先再有喘息之机！' },
  ],
}
