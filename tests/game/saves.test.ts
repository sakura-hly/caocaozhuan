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
  it('数值域：非整数 progress / Infinity 属性 → null', () => {
    expect(deserialize(serialize({ ...newGame(), progress: 1.5 }, 1), gameData)).toBeNull()
    // 1e999 是合法 JSON，JSON.parse 得 Infinity —— 必须被有限性检查挡下
    const inf = JSON.stringify({ v: 1, savedAt: 1, campaign: { ...newGame(), roster: [{ ...newGame().roster[0]!, base: { ...newGame().roster[0]!.base, hp: 1e999 } }] } })
    expect(deserialize(inf, gameData)).toBeNull()
  })
  it('原型链穿透：__proto__/constructor 作为 id → null', () => {
    const proto = JSON.stringify({ v: 1, savedAt: 1, campaign: { ...newGame(), inventory: ['__proto__'] } })
    expect(deserialize(proto, gameData)).toBeNull()
    const ctor = JSON.stringify({ v: 1, savedAt: 1, campaign: { ...newGame(), roster: [{ ...newGame().roster[0]!, heroId: 'constructor' }] } })
    expect(deserialize(ctor, gameData)).toBeNull()
  })
  it('槽位键域与物品类型：幻影槽 / 携带非消耗品 / 名册重复 heroId → null', () => {
    const ghostSlot = JSON.stringify({ v: 1, savedAt: 1, campaign: { ...newGame(), roster: [{ ...newGame().roster[0]!, equipment: { foo: 'iron_sword' } }] } })
    expect(deserialize(ghostSlot, gameData)).toBeNull()
    const wrongKind = JSON.stringify({ v: 1, savedAt: 1, campaign: { ...newGame(), roster: [{ ...newGame().roster[0]!, equipment: { weapon: 'jinchuang_yao' } }] } })
    expect(deserialize(wrongKind, gameData)).toBeNull()
    const nonConsumable = JSON.stringify({ v: 1, savedAt: 1, campaign: { ...newGame(), roster: [{ ...newGame().roster[0]!, items: ['iron_sword'] }] } })
    expect(deserialize(nonConsumable, gameData)).toBeNull()
    const dup = JSON.stringify({ v: 1, savedAt: 1, campaign: { ...newGame(), roster: [...newGame().roster, newGame().roster[0]!] } })
    expect(deserialize(dup, gameData)).toBeNull()
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
    // 合法 JSON 但 campaign 不合法 → 同样 corrupt（savedAt 非数字也拒）
    st.dump.set('caocaozhuan:save:1', '{"v":1,"savedAt":"abc","campaign":{}}')
    expect(slotInfo(st, '1', gameData).status).toBe('corrupt')
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
