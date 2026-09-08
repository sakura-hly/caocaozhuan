import type { BattleState } from './types'

export interface BattleVerdict { won: boolean; lost: boolean }

export function evaluate(s: BattleState): BattleVerdict {
  const lord = s.units.find((u) => u.classId === 'lord')
  const alivePlayers = s.units.filter((u) => u.faction === 'player' && u.alive)
  const lost = alivePlayers.length === 0 || (lord !== undefined && !lord.alive)
  const aliveEnemies = s.units.filter((u) => u.faction === 'enemy' && u.alive)
  let won = false
  if (s.win.kind === 'annihilate') won = aliveEnemies.length === 0
  return { won: won && !lost, lost }
}
