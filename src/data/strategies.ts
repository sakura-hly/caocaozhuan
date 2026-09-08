import type { StrategyDef } from '../engine/types'

const defs: StrategyDef[] = [
  { id: 'huoshi', name: '火矢', kind: 'attack', mpCost: 6, power: 30, shape: 'single', range: 3,
    element: 'fire', allowedClasses: ['strategist'], desc: '单体火系伤害' },
  { id: 'huolong', name: '火龙', kind: 'attack', mpCost: 12, power: 26, shape: 'cross', range: 3,
    element: 'fire', allowedClasses: ['strategist'], desc: '十字范围火系伤害' },
  { id: 'shuiyan', name: '水淹', kind: 'attack', mpCost: 12, power: 24, shape: 'burst', range: 3,
    element: 'water', allowedClasses: ['strategist'], desc: '3x3 范围水伤，雨天 +50%' },
  { id: 'luoshi', name: '落石', kind: 'attack', mpCost: 8, power: 34, shape: 'single', range: 3,
    element: 'earth', allowedClasses: ['strategist'], desc: '单体伤害，目标在山地 +30%' },
  { id: 'zhiyu', name: '治愈', kind: 'heal', mpCost: 6, power: 40, shape: 'single', range: 3,
    allowedClasses: ['strategist', 'taoist'], desc: '单体回复 HP' },
  { id: 'qunliao', name: '群疗', kind: 'heal', mpCost: 12, power: 30, shape: 'burst', range: 3,
    allowedClasses: ['strategist'], desc: '3x3 范围回复 HP' },
  { id: 'pojia', name: '破甲', kind: 'debuff', mpCost: 5, power: 0, shape: 'single', range: 3,
    effect: 'defdown', effectTurns: 3, allowedClasses: ['taoist'], desc: '降低防御 3 回合' },
  { id: 'jifeng', name: '疾风', kind: 'buff', mpCost: 5, power: 0, shape: 'single', range: 3,
    effect: 'speedup', effectTurns: 3, allowedClasses: ['taoist'], desc: '提升移动力 3 回合' },
  { id: 'xuanyun', name: '眩晕', kind: 'debuff', mpCost: 10, power: 0, shape: 'single', range: 3,
    effect: 'stun', effectTurns: 1, allowedClasses: ['taoist'], desc: '目标下回合无法行动' },
  { id: 'yaowu', name: '妖雾', kind: 'debuff', mpCost: 6, power: 0, shape: 'single', range: 3,
    effect: 'accdown', effectTurns: 3, allowedClasses: ['taoist'], desc: '降低命中 3 回合' },
]

export const strategies: Record<string, StrategyDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
