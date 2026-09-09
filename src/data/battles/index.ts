import type { BattleDef } from '../../engine/types'
import { yingchuan } from './yingchuan'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan }

/** 开场对话 id（按战役注册；对话文本仍在各战役文件）。 */
export const battleOpeners: Record<string, string> = { yingchuan: 'yc_start' }
