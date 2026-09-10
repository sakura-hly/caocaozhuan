import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { newGame, deployBattle, settleBattle } from '../../src/game/campaign'
import { battles } from '../../src/data/battles'
import { initBattle } from '../../src/engine'
import {
  SLOT_KEYS, serialize, deserialize, saveSlot, loadSlot, slotInfo, localStorageAdapter,
} from '../../src/game/saves'
import type { Storage } from '../../src/game/saves'

function fakeStorage(): Storage & { dump: Map<string, string> } {
  const dump = new Map<string, string>()
  return {
    dump,
    getItem: (k) => dump.get(k) ?? null,
    setItem: (k, v) => void dump.set(k, v),
    removeItem: (k) => void dump.delete(k),
  }
}

describe('存档序列化', () => {
  it('serialize→deserialize 往返相等（结构 toEqual）', () => {
    const c = newGame()
    expect(deserialize(serialize(c, 1000), gameData)).toEqual(c)
  })
  it('版本不符 / JSON 坏 / 形状不符 → null（不抛异常）', () => {
    expect(deserialize('not json', gameData)).toBeNull()
    expect(deserialize('{"v":99,"savedAt":1,"campaign":{}}', gameData)).toBeNull()
    expect(deserialize(serialize({ ...newGame(), version: 1 }, 1).replace('"progress":0', '"progress":"x"'), gameData)).toBeNull()
    expect(deserialize('{"v":1,"savedAt":1,"campaign":{"version":1,"progress":0,"roster":[{"heroId":"nope","level":1,"exp":0,"base":{},"equipment":{},"items":[]}],"inventory":[]}}', gameData)).toBeNull()
  })
})

describe('槽位读写', () => {
  it('SLOT_KEYS = auto/1/2/3', () => {
    expect(SLOT_KEYS).toEqual(['auto', '1', '2', '3'])
  })
  it('保存后可读取；空槽 empty；坏数据 corrupt 且 loadSlot 返回 null', () => {
    const st = fakeStorage()
    expect(slotInfo(st, '1', gameData).status).toBe('empty')
    const c = newGame()
    saveSlot(st, '1', c, 1234)
    expect(slotInfo(st, '1', gameData)).toMatchObject({ status: 'ok', savedAt: 1234 })
    expect(loadSlot(st, '1', gameData)).toEqual(c)
    st.dump.set('caocaozhuan:save:1', '{oops')
    expect(slotInfo(st, '1', gameData).status).toBe('corrupt')
    expect(loadSlot(st, '1', gameData)).toBeNull()
  })
  it('中途存档往返：颍川结算后的进度可完整恢复', () => {
    const c1 = newGame()
    const def = deployBattle(battles.yingchuan, c1, gameData)
    const st = initBattle(def, 42)
    const final = { ...st, units: st.units.map((u) => u.faction === 'enemy' ? { ...u, alive: false } : u), finished: 'won' as const, rewards: [] }
    const after = settleBattle(c1, def, final, gameData).campaign
    const st2 = fakeStorage()
    saveSlot(st2, 'auto', after, 9)
    expect(loadSlot(st2, 'auto', gameData)).toEqual(after)
    expect(loadSlot(st2, 'auto', gameData)!.progress).toBe(1)
  })
  it('浏览器无 localStorage 时适配器不抛异常', () => {
    expect(() => localStorageAdapter.getItem('x')).not.toThrow()
  })
})
