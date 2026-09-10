import { describe, it, expect } from 'vitest'
import { apply, initBattle } from '../../src/engine'
import { gameData } from '../../src/data'
import type { BattleDef } from '../../src/engine/types'
import { heroUnit, mobUnit, parseMap } from '../../src/data/battles/shared'

/** 三阵营最小战役：玩家曹操+夏侯惇、友军刘备军关羽、敌方两杂兵。 */
function allyDef(): BattleDef {
  return {
    id: 'ally-test', name: '友军测试', desc: '',
    map: parseMap(['.......', '.......', '.......', '.......', '.......']),
    units: [
      heroUnit('caocao', 'player', { x: 0, y: 2 }),
      heroUnit('xiaohoudun', 'player', { x: 0, y: 3 }),
      heroUnit('guanyu', 'ally', { x: 2, y: 2 }),
      mobUnit('e1', '敌兵', 'infantry', 'enemy', { x: 6, y: 2 }, { hp: 40, mp: 0, atk: 10, def: 5, spirit: 3, agi: 5 }),
      mobUnit('e2', '敌兵', 'infantry', 'enemy', { x: 6, y: 3 }, { hp: 40, mp: 0, atk: 10, def: 5, spirit: 3, agi: 5 }),
    ],
    reinforcements: [], treasureCells: [], dialogues: [], weather: 'sunny', weatherScript: [],
    win: { kind: 'annihilate' }, maxTurns: 10,
  }
}

const endTurn = (s: ReturnType<typeof initBattle>) => apply(s, { type: 'endTurn' }, gameData)

describe('三阵营（player/ally/enemy）', () => {
  it('含友军时 factionOrder 为三阵营，无友军为两阵营', () => {
    expect(initBattle(allyDef(), 1).factionOrder).toEqual(['player', 'ally', 'enemy'])
    const noAlly = { ...allyDef(), units: allyDef().units.filter((u) => u.faction !== 'ally') }
    expect(initBattle(noAlly, 1).factionOrder).toEqual(['player', 'enemy'])
  })
  it('回合循环：player→ally→enemy→turn+1 回到 player', () => {
    let s = initBattle(allyDef(), 7)
    expect(s.factionOrder[s.factionIndex]).toBe('player')
    s = endTurn(s).state
    expect(s.factionOrder[s.factionIndex]).toBe('ally')
    s = endTurn(s).state
    expect(s.factionOrder[s.factionIndex]).toBe('enemy')
    s = endTurn(s).state
    expect(s.turn).toBe(2)
    expect(s.factionOrder[s.factionIndex]).toBe('player')
  })
  it('友军在场不改变胜负口径：敌全灭=胜；我方全灭=负（友军存活不救）', () => {
    let s = initBattle(allyDef(), 7)
    for (const u of s.units) if (u.faction === 'enemy') u.alive = false // 直接构造终局（不可变约定仅供 apply；测试内改快照构造场景）
    s = endTurn(s).state
    expect(s.finished).toBe('won')
    let t = initBattle(allyDef(), 7)
    for (const u of t.units) if (u.faction === 'player') u.alive = false
    t = endTurn(t).state
    expect(t.finished).toBe('lost')
  })
  it('玩家不能操控友军单位（NOT_YOUR_TURN）', () => {
    const s = initBattle(allyDef(), 7)
    const r = apply(s, { type: 'wait', unitId: 'guanyu' }, gameData)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('NOT_YOUR_TURN')
  })
})
