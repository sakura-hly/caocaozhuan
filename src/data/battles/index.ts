import type { BattleDef } from '../../engine/types'
import { yingchuan } from './yingchuan'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan }
