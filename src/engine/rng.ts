/** 纯函数随机数：种子在 BattleState.rngState 中传递，保证战斗可回放。 */
export interface RngDraw { value: number; nextState: number }

export function rngNext(state: number): RngDraw {
  const t = (state + 0x6d2b79f5) | 0
  let r = t
  r = Math.imul(r ^ (r >>> 15), r | 1)
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296
  return { value, nextState: t }
}

export function rngFloat(lo: number, hi: number, state: number): RngDraw {
  const d = rngNext(state)
  return { value: lo + d.value * (hi - lo), nextState: d.nextState }
}

export function rngChance(p: number, state: number): { value: boolean; nextState: number } {
  const d = rngNext(state)
  return { value: d.value < p, nextState: d.nextState }
}
