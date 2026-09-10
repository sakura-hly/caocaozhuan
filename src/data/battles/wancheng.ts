import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const ZHANGXIU_QIANGBING = { hp: 50, mp: 0, atk: 13, def: 9, spirit: 3, agi: 7 } // 张绣军枪兵(步兵)——西路追兵
const WANCHENG_GONGSHOU = { hp: 44, mp: 0, atk: 13, def: 6, spirit: 4, agi: 9 }  // 宛城弓手(南路截击)

export const wancheng: BattleDef = {
  id: 'wancheng',
  name: '宛城之战',
  desc: '张绣降而复反，夜袭宛城曹营，典韦断后死战。（胜利：曹操抵达西南关隘撤退点）',
  map: parseMap([
    '............PPmm',
    '..f.........PP.m',
    '...............m',
    '.....w..........',
    '....www.....f...',
    '..f.ww..........',
    '....ww.....f....',
    '.m...w..........',
    '.mm.......f.....',
    '..m.............',
    'mm..........f...',
    'GG..........ff..',
  ]),
  units: [
    // 我方（东北被围营地，无新参战——向西南关隘突围）
    heroUnit('caocao', 'player', { x: 12, y: 1 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('dianwei', 'player', { x: 13, y: 1 }), // 必须参战——断后剧情核心（wc_duanhou / wc_dianwei_down 均以其在场为前提）
    heroUnit('xiaohoudun', 'player', { x: 11, y: 0 }),
    heroUnit('xuchu', 'player', { x: 12, y: 0 }),
    heroUnit('xunyu', 'player', { x: 11, y: 1 }),
    heroUnit('lidian', 'player', { x: 13, y: 0 }),
    heroUnit('yuejin', 'player', { x: 11, y: 2 }),
    // 敌方（西南追击：张绣 + 西路枪兵 + 南路弓手，截断突围路线）
    heroUnit('zhangxiu', 'enemy', { x: 6, y: 6 }, { level: 6 }), // 追击主力，不覆写 base
    mobUnit('e1', '张绣军枪兵', 'infantry', 'enemy', { x: 3, y: 6 }, ZHANGXIU_QIANGBING), // 西路
    mobUnit('e2', '张绣军枪兵', 'infantry', 'enemy', { x: 5, y: 8 }, ZHANGXIU_QIANGBING), // 西路
    mobUnit('e3', '张绣军枪兵', 'infantry', 'enemy', { x: 7, y: 9 }, ZHANGXIU_QIANGBING), // 西路
    mobUnit('g1', '宛城弓手', 'archer', 'enemy', { x: 9, y: 10 }, WANCHENG_GONGSHOU), // 南路
    mobUnit('g2', '宛城弓手', 'archer', 'enemy', { x: 11, y: 9 }, WANCHENG_GONGSHOU), // 南路
  ],
  reinforcements: [
    // 三波穷追：撤退战的紧迫感来自数值压力——每波 2 员枪兵，拖慢即被合围
    { turn: 3, entries: [ // 西缘
      { unit: mobUnit('r1', '张绣军枪兵', 'infantry', 'enemy', { x: 0, y: 3 }, ZHANGXIU_QIANGBING), at: { x: 0, y: 3 } },
      { unit: mobUnit('r2', '张绣军枪兵', 'infantry', 'enemy', { x: 0, y: 5 }, ZHANGXIU_QIANGBING), at: { x: 0, y: 5 } },
    ] },
    { turn: 5, entries: [ // 南缘
      { unit: mobUnit('r3', '张绣军枪兵', 'infantry', 'enemy', { x: 3, y: 11 }, ZHANGXIU_QIANGBING), at: { x: 3, y: 11 } },
      { unit: mobUnit('r4', '张绣军枪兵', 'infantry', 'enemy', { x: 5, y: 11 }, ZHANGXIU_QIANGBING), at: { x: 5, y: 11 } },
    ] },
    { turn: 7, entries: [ // 第三波兜底
      { unit: mobUnit('r5', '张绣军枪兵', 'infantry', 'enemy', { x: 0, y: 6 }, ZHANGXIU_QIANGBING), at: { x: 0, y: 6 } },
      { unit: mobUnit('r6', '张绣军枪兵', 'infantry', 'enemy', { x: 7, y: 11 }, ZHANGXIU_QIANGBING), at: { x: 7, y: 11 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 7, y: 8 }, itemId: 'jinchuang_yao', found: false }, // 突围路上
    { cell: { x: 12, y: 10 }, itemId: 'huanshen_dan', found: false },
  ],
  drops: [], // 撤退战无暇缴获
  dialogues: [
    { turn: 4, dialogueId: 'wc_duanhou' },
    { onDeathOf: 'dianwei', dialogueId: 'wc_dianwei_down' }, // onDeathOf 对玩家单位同样生效——典韦阵亡即触发
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'reach', unitId: 'caocao', cell: { x: 1, y: 11 } }, // row 11 的 G 关隘 = 撤退点，抵达即胜（无需对话）
  maxTurns: 14, // 撤退战不该拖——短限是压力设计
}

export const wanchengDialogues: Record<string, DialogueLine[]> = {
  wc_start: [
    { speaker: '张绣', text: '曹操辱我叔母，是可忍孰不可忍！今夜乘其无备，纵火劫营，教他有来无回！' },
    { speaker: '典韦', text: '营中喊杀四起，主公先行，韦断后！贼虽千军，休想踏过此门一步！' },
    { speaker: '曹操', text: '恶来保重！众将随我且战且走，向西南关隘突围，迟则全军皆没于此！' },
  ],
  wc_duanhou: [
    { speaker: '典韦', text: '双戟虽失，腰刀犹在！贼子想过去，先问过我手中之刀！' },
    { speaker: '曹操', text: '恶来独守辕门，吾心何安……诸军勿回顾，早抵关隘一刻，便多一分生机！' },
  ],
  wc_dianwei_down: [
    { speaker: '典韦', text: '主公……已远……韦……能断后者，唯死而已……' },
    { speaker: '曹操', text: '恶来……古之恶来，殁于王事！待吾脱险，必祭亡魂，厚恤遗孤！' },
  ],
}
