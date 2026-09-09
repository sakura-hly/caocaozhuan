import { initBattle } from '../engine'
import type { BattleState, BattleDef } from '../engine/types'
import type { GameData } from '../data'
import { gameData } from '../data'
import { battles, battleDialogues } from '../data/battles'
import { validateBattleDef, type DialogueLine } from '../data/battles/shared'

/** 数据校验：errors 抛错（带完整清单），warnings 打印后放行。 */
export function assertBattleValid(def: BattleDef, battleId: string, data: GameData = gameData): string[] {
  const report = validateBattleDef(def, data)
  for (const w of report.warnings) console.warn(`[battle:${battleId}] 告警 ${w}`)
  if (report.errors.length > 0) {
    throw new Error(`战役数据校验失败: ${battleId}\n${report.errors.map((e) => ` - ${e}`).join('\n')}`)
  }
  return report.warnings
}

/** UI 层唯一战役入口：校验 + initBattle。 */
export function loadBattle(battleId: string, seed: number): BattleState {
  const def = battles[battleId]
  if (!def) throw new Error(`未知战役: ${battleId}`)
  assertBattleValid(def, battleId)
  return initBattle(def, seed)
}

/** 对话文本查询：未知返回空（UI 判空跳过）。 */
export function dialogueLines(battleId: string, dialogueId: string): DialogueLine[] {
  return battles[battleId] ? battleDialogues[battleId]?.[dialogueId] ?? [] : []
}
