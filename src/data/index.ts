import type { ClassDef, ClassId, HeroDef, ItemDef, StrategyDef, TerrainDef, TerrainId } from '../engine/types'
import { classes } from './classes'
import { strategies } from './strategies'
import { terrains } from './terrains'

export interface GameData {
  classes: Record<ClassId, ClassDef>
  terrains: Record<TerrainId, TerrainDef>
  strategies: Record<string, StrategyDef> // Task 6 填充
  items: Record<string, ItemDef>          // Task 9 起填充
  heroes: Record<string, HeroDef>         // Task 13 填充
}

export const gameData: GameData = {
  classes,
  terrains,
  strategies,
  items: {},
  heroes: {},
}
