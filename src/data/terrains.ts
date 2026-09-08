import type { TerrainDef, TerrainId } from '../engine/types'

export const terrains: Record<TerrainId, TerrainDef> = {
  plain: { id: 'plain', name: '平原', defBonus: 0, moveCost: 1 },
  forest: { id: 'forest', name: '森林', defBonus: 15, moveCost: { default: 2, infantry: 1 } },
  mountain: { id: 'mountain', name: '山地', defBonus: 25, moveCost: { default: Infinity, infantry: 2, archer: 2, lord: 3 } },
  water: { id: 'water', name: '水域', defBonus: 0, moveCost: { default: 3, cavalry: 4 } },
  city: { id: 'city', name: '城池', defBonus: 30, moveCost: 1 },
  camp: { id: 'camp', name: '营寨', defBonus: 20, moveCost: 1 },
  pass: { id: 'pass', name: '关隘', defBonus: 30, moveCost: 2 },
  bridge: { id: 'bridge', name: '桥', defBonus: 10, moveCost: 1 },
}
