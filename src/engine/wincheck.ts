import type { BattleState } from './types'

export interface BattleVerdict { won: boolean; lost: boolean }

/**
 * 胜负判定（spec §3.8）：
 * 失败 = 我方全灭 / 玩家君主阵亡（敌方君主不判负） / 超过回合上限
 * 胜利 = 按战役数据条件：annihilate / killCommander / survive / reach
 */
export function evaluate(s: BattleState): BattleVerdict {
  const lord = s.units.find((u) => u.faction === 'player' && u.classId === 'lord')
  const alivePlayers = s.units.filter((u) => u.faction === 'player' && u.alive)
  const lost = alivePlayers.length === 0 || (lord !== undefined && !lord.alive) || s.turn > s.maxTurns
  const aliveEnemies = s.units.filter((u) => u.faction === 'enemy' && u.alive)
  let won = false
  switch (s.win.kind) {
    case 'annihilate':
      won = aliveEnemies.length === 0
      break
    case 'killCommander': {
      const c = s.units.find((u) => u.id === s.win.unitId)
      won = c !== undefined && !c.alive
      break
    }
    case 'survive':
      won = s.turn > s.win.untilTurn
      break
    case 'reach': {
      const u = s.units.find((x) => x.id === s.win.unitId)
      won = u !== undefined && u.alive && u.pos.x === s.win.cell.x && u.pos.y === s.win.cell.y
      break
    }
  }
  return { won: won && !lost, lost }
}
