import { yingchuan, yingchuanDialogues } from './yingchuan'
import { sishui, sishuiDialogues } from './sishui'
import { hulao, hulaoDialogues } from './hulao'
import { qingzhou, qingzhouDialogues } from './qingzhou'
import { xuzhou, xuzhouDialogues } from './xuzhou'
import { puyang, puyangDialogues } from './puyang'
import { wancheng, wanchengDialogues } from './wancheng'
import { xiapi, xiapiDialogues } from './xiapi'
import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan, [sishui.id]: sishui, [hulao.id]: hulao, [qingzhou.id]: qingzhou, [xuzhou.id]: xuzhou, [puyang.id]: puyang, [wancheng.id]: wancheng, [xiapi.id]: xiapi }

/** 开场对话 id（按战役注册；对话文本仍在各战役文件）。 */
export const battleOpeners: Record<string, string> = { yingchuan: 'yc_start', sishui: 'ss_start', hulao: 'hl_start', qingzhou: 'qz_start', xuzhou: 'xz_start', puyang: 'py_start', wancheng: 'wc_start', xiapi: 'xp_start' }

/** 对话文本注册表：battleId → dialogueId → 台词。 */
export const battleDialogues: Record<string, Record<string, DialogueLine[]>> = {
  yingchuan: yingchuanDialogues,
  sishui: sishuiDialogues,
  hulao: hulaoDialogues,
  qingzhou: qingzhouDialogues,
  xuzhou: xuzhouDialogues,
  puyang: puyangDialogues,
  wancheng: wanchengDialogues,
  xiapi: xiapiDialogues,
}

export { battleChoices, type ChoiceDef, type ChoiceOption } from './choices'
