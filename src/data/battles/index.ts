import { yingchuan, yingchuanDialogues } from './yingchuan'
import { sishui, sishuiDialogues } from './sishui'
import { hulao, hulaoDialogues } from './hulao'
import { qingzhou, qingzhouDialogues } from './qingzhou'
import { xuzhou, xuzhouDialogues } from './xuzhou'
import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan, [sishui.id]: sishui, [hulao.id]: hulao, [qingzhou.id]: qingzhou, [xuzhou.id]: xuzhou }

/** 开场对话 id（按战役注册；对话文本仍在各战役文件）。 */
export const battleOpeners: Record<string, string> = { yingchuan: 'yc_start', sishui: 'ss_start', hulao: 'hl_start', qingzhou: 'qz_start', xuzhou: 'xz_start' }

/** 对话文本注册表：battleId → dialogueId → 台词。 */
export const battleDialogues: Record<string, Record<string, DialogueLine[]>> = {
  yingchuan: yingchuanDialogues,
  sishui: sishuiDialogues,
  hulao: hulaoDialogues,
  qingzhou: qingzhouDialogues,
  xuzhou: xuzhouDialogues,
}

export { battleChoices, type ChoiceDef, type ChoiceOption } from './choices'
