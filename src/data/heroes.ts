import type { HeroDef } from '../engine/types'

const defs: HeroDef[] = [
  { id: 'caocao', name: '曹操', title: '字孟德', classId: 'lord', portraitHue: 0,
    base: { hp: 52, mp: 8, atk: 12, def: 10, spirit: 10, agi: 10 } },
  { id: 'xiaohoudun', name: '夏侯惇', title: '字元让', classId: 'cavalry', portraitHue: 20,
    base: { hp: 48, mp: 0, atk: 13, def: 8, spirit: 4, agi: 10 } },
  { id: 'xiahouyuan', name: '夏侯渊', title: '字妙才', classId: 'archer', portraitHue: 35,
    base: { hp: 42, mp: 0, atk: 12, def: 6, spirit: 5, agi: 11 } },
  { id: 'caoren', name: '曹仁', title: '字子孝', classId: 'infantry', portraitHue: 210,
    base: { hp: 50, mp: 0, atk: 10, def: 12, spirit: 5, agi: 8 } },
  { id: 'caohong', name: '曹洪', title: '字子廉', classId: 'infantry', portraitHue: 220,
    base: { hp: 46, mp: 0, atk: 10, def: 11, spirit: 4, agi: 9 } },
  { id: 'dianwei', name: '典韦', title: '古之恶来', classId: 'infantry', portraitHue: 280,
    base: { hp: 54, mp: 0, atk: 15, def: 8, spirit: 3, agi: 9 } },
  { id: 'xuchu', name: '许褚', title: '字仲康', classId: 'infantry', portraitHue: 290,
    base: { hp: 56, mp: 0, atk: 14, def: 9, spirit: 3, agi: 7 } },
  { id: 'lidian', name: '李典', title: '字曼成', classId: 'infantry', portraitHue: 200,
    base: { hp: 44, mp: 0, atk: 10, def: 10, spirit: 6, agi: 9 } },
  { id: 'yuejin', name: '乐进', title: '字文谦', classId: 'infantry', portraitHue: 230,
    base: { hp: 45, mp: 0, atk: 11, def: 9, spirit: 4, agi: 10 } },
  { id: 'yujin', name: '于禁', title: '字文则', classId: 'archer', portraitHue: 45,
    base: { hp: 40, mp: 0, atk: 11, def: 7, spirit: 6, agi: 10 } },
  { id: 'xunyu', name: '荀彧', title: '字文若', classId: 'strategist', portraitHue: 120,
    base: { hp: 38, mp: 20, atk: 5, def: 5, spirit: 15, agi: 8 } },
  { id: 'xunyou', name: '荀攸', title: '字公达', classId: 'strategist', portraitHue: 130,
    base: { hp: 38, mp: 22, atk: 4, def: 5, spirit: 16, agi: 8 } },
  { id: 'guojia', name: '郭嘉', title: '字奉孝', classId: 'taoist', portraitHue: 160,
    base: { hp: 36, mp: 18, atk: 4, def: 4, spirit: 14, agi: 9 } },
]

export const heroes: Record<string, HeroDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
