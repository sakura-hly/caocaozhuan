import { yingchuan, yingchuanDialogues } from './yingchuan'
import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan }

/** 开场对话 id（按战役注册；对话文本仍在各战役文件）。 */
export const battleOpeners: Record<string, string> = { yingchuan: 'yc_start' }

/** 对话文本注册表：battleId → dialogueId → 台词。 */
export const battleDialogues: Record<string, Record<string, DialogueLine[]>> = {
  yingchuan: yingchuanDialogues,
}
