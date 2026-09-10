# 曹操传 M3（养成闭环 + 前 3 场战役）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现里程碑 3 —— 养成闭环（升级持久化/装备/道具/存档）+ 前 3 场战役（颍川✓/汜水关/虎牢关）+ 整备界面。

**Architecture:** 引擎层（M1）基本不动（仅 `types.ts` 加一个可选字段）；新增 `src/game/campaign.ts`（战役进度纯逻辑：roster 持久化、deploy/settle）与 `src/game/saves.ts`（存档槽/序列化）；新战役为纯数据文件；UI 层新增 Progress/Prep/Settle 三屏，App.vue 变为流程状态机（标题→进度→整备→战斗→结算→进度）。

**Tech Stack:** Vue 3 + TypeScript + Vite + Vitest + Canvas 2D（全部沿用现状，零新依赖）。

---

## 全局约定（每个任务都必须遵守）

- **工作目录** `/Users/didi/project/caocaozhuan`，分支 `feature/m3-progression`（基于 main）。
- **测试命令**：`npx vitest run <文件> 2>&1 | tail -25`（长输出必须 tail 截断）。全量：`npm test 2>&1 | tail -25`。类型门：`npm run build 2>&1 | tail -15`（vue-tsc + vite build；vitest 不做类型检查）。
- **提交格式**：`<type>: <中文描述>`（feat/test/docs/refactor），**禁止** Co-Authored-By 等署名尾注。
- **不可变状态**：引擎/campaign/saves 层所有函数返回新对象，绝不改入参（与 M1 引擎 `apply` 一致）。
- **UI 策略**（沿用 M2）：Vue 组件不写自动化测试；可测逻辑一律下沉 `src/game/` 纯函数；UI 靠 `docs/superpowers/manual-checks-m3.md` 人工清单兜底（Task 17）。
- **禁止事项**：不动 `~/.claude/skills/**`；不建临时/探测文件；不并行派发实现者；`rm`/`git push` 等破坏性操作需用户确认。

## 现有代码事实（已核实，实现者可直接引用）

- `Unit.equipment: Partial<Record<ItemSlot, string>>`，`ItemSlot = 'weapon' | 'armor' | 'accessory'`；`Unit.items: string[]` 是携带的消耗品 id（`src/engine/types.ts:70-88`）。
- `BattleState.rewards: string[]` 由引擎在踩宝物格时写入（`src/engine/move.ts:22`）——结算直接读它拿宝物，无需解析事件。
- `initBattle` 有 ally 分支：含 ally 单位时 `factionOrder: ['player','ally','enemy']`（`src/engine/engine.ts:8-15`），**但无直接测试**（M1 登记必补项 → Task 3）。
- 经验只发 `faction==='player'`（`src/engine/growth.ts:29`）；升级时 `u.base` 随机成长、`EXP_PER_LEVEL = 100`——结算收割 `level/exp/base` 即可。
- `heroUnit(heroId, faction, pos, { level?, equipment?, items? })` 基础值取武将档案 1 级裸属性；`mobUnit(id, name, classId, faction, pos, base)` 自定义数值无档案（`src/data/battles/shared.ts:25-48`）。
- 校验器 `validateBattleDef(def, data)` 返回 `{ errors, warnings }`（`src/data/battles/shared.ts:51`）；生产入口 `assertBattleValid`（`src/game/bootstrap.ts:9`）。
- `BattleOrchestrator` 构造器 `(battleId, seed, cb, data = gameData)`，内部 `battles[battleId]` 取定义（`src/game/orchestrator.ts:38`）。
- `BattleScreen.vue` props 仅 `{ battleId: string }`，emit 仅 `exit`；编排器在 `setupOrchestrator()`（`src/ui/screens/BattleScreen.vue:387`）创建，seed 用 `Date.now() % 2147483647`；结算 overlay 走 `settleResult()` → `ResultBanner`（`@restart/@exit`）。
- 全量测试当前 181 个全绿；`src/data/heroes.ts` 现有 13 名曹操军武将；物品注册表含装备 12 件 + 消耗品 2 种。
- 对话组件 `DialogueBox.vue` 只支持点击推进（键盘推进为 M2 已知限制 → Task 16）。

---

### Task 1: BattleDef 掉落字段 + 校验器扩展（allowedClasses / 槽位类型 / drops）

M1 延期项「装备 allowedClasses 未校验」在此清偿；掉落（击破敌将缴获）是 M3 新能力。

**Files:**
- Modify: `src/engine/types.ts`（BattleDef 加可选字段，纯类型扩展）
- Modify: `src/data/battles/shared.ts`（validateBattleDef 扩展）
- Test: `tests/data/battle-validate.test.ts`（新建）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { validateBattleDef } from '../../src/data/battles/shared'
import { gameData } from '../../src/data'
import { yingchuan } from '../../src/data/battles/yingchuan'
import { heroUnit, mobUnit, parseMap } from '../../src/data/battles/shared'

const MAP = parseMap(['.....', '.....', '.....', '.....', '.....'])

function baseDef() {
  return {
    ...yingchuan,
    map: MAP,
    units: [
      heroUnit('caocao', 'player', { x: 0, y: 0 }),
      mobUnit('e1', '敌兵', 'infantry', 'enemy', { x: 4, y: 4 }, { hp: 40, mp: 0, atk: 10, def: 5, spirit: 3, agi: 5 }),
    ],
    reinforcements: [], treasureCells: [], dialogues: [], weatherScript: [],
    win: { kind: 'annihilate' } as const, maxTurns: 10, drops: [],
  }
}

describe('validateBattleDef 扩展规则', () => {
  it('现有颍川数据仍零 errors', () => {
    expect(validateBattleDef(yingchuan, gameData).errors).toEqual([])
  })
  it('装备兵种不符 → error（青釭剑只许 lord/infantry）', () => {
    const def = { ...baseDef() }
    def.units[0] = heroUnit('caocao', 'player', { x: 0, y: 0 }) // lord，先证合法
    def.units[1] = { ...def.units[1] }
    const cav = heroUnit('xiaohoudun', 'player', { x: 1, y: 0 }) // cavalry
    cav.equipment = { weapon: 'qinggang_sword' }
    def.units = [cav, def.units[1]]
    const r = validateBattleDef(def, gameData)
    expect(r.errors.some((e) => e.includes('兵种不符'))).toBe(true)
  })
  it('槽位与装备类型不符 → error（weapon 塞进 armor 槽）', () => {
    const def = baseDef()
    const u = heroUnit('caocao', 'player', { x: 0, y: 0 })
    u.equipment = { armor: 'iron_sword' }
    def.units = [u, def.units[1]]
    const r = validateBattleDef(def, gameData)
    expect(r.errors.some((e) => e.includes('类型不符'))).toBe(true)
  })
  it('drops 引用不存在的单位/物品 → error；合法 drops 通过', () => {
    const ok = { ...baseDef(), drops: [{ unitId: 'e1', itemId: 'iron_armor' }] }
    expect(validateBattleDef(ok, gameData).errors).toEqual([])
    const badUnit = { ...baseDef(), drops: [{ unitId: 'nope', itemId: 'iron_armor' }] }
    const badItem = { ...baseDef(), drops: [{ unitId: 'e1', itemId: 'nope' }] }
    expect(validateBattleDef(badUnit, gameData).errors.length).toBeGreaterThan(0)
    expect(validateBattleDef(badItem, gameData).errors.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/data/battle-validate.test.ts 2>&1 | tail -25`
Expected: FAIL（drops 不在类型上 / 兵种不符无校验）

- [ ] **Step 3: 实现**

`src/engine/types.ts` —— 在 `BattleDef` 内 `treasureCells` 之后加：

```ts
export interface DropDef { unitId: string; itemId: string }
```

（`DropDef` 放 `TreasureCell` 附近；`BattleDef` 加一行：）

```ts
  drops?: DropDef[] // 击破指定单位掉落（结算时入库，见 game/campaign.ts settleBattle）
```

`src/data/battles/shared.ts` —— `checkGear` 内替换为（含槽位类型 + 兵种校验）：

```ts
  const checkGear = (u: Unit) => {
    for (const [slot, id] of Object.entries(u.equipment) as Array<[ItemSlot, string | undefined]>) {
      if (id === undefined) continue
      const it = data.items[id]
      if (!it) { errs.push(`单位 ${u.id} 引用未知装备 ${id}`); continue }
      if (it.kind !== slot) errs.push(`单位 ${u.id} 装备 ${it.name} 类型不符（${slot} 槽）`)
      if (it.allowedClasses && !it.allowedClasses.includes(u.classId))
        errs.push(`单位 ${u.id} 装备 ${it.name} 兵种不符（${u.classId}）`)
    }
    for (const id of u.items) if (!data.items[id]) errs.push(`单位 ${u.id} 携带未知道具 ${id}`)
  }
```

（`import type` 行补 `ItemSlot`。）`validateBattleDef` 末尾（maxTurns 检查前）加：

```ts
  for (const d of def.drops ?? []) {
    const inField = def.units.some((u) => u.id === d.unitId)
    const inReinf = def.reinforcements.some((r) => r.entries.some((e) => e.unit.id === d.unitId))
    if (!inField && !inReinf) errs.push(`掉落引用不存在的单位 ${d.unitId}`)
    if (!data.items[d.itemId]) errs.push(`掉落引用未知道具 ${d.itemId}`)
  }
```

- [ ] **Step 4: 运行测试通过 + 全量回归**

Run: `npx vitest run tests/data/battle-validate.test.ts tests/data/yingchuan.test.ts 2>&1 | tail -25`
Expected: PASS（颍川现有数据零 errors——现有装备无不符项）

- [ ] **Step 5: 提交**

```bash
git add src/engine/types.ts src/data/battles/shared.ts tests/data/battle-validate.test.ts
git commit -m "feat: 战役数据掉落字段与装备校验（兵种/槽位）"
```

---

### Task 2: 武将/道具数据扩充（刘关张/华雄/吕布/方天画戟）

新英雄进注册表以获得程序化头像与对话立绘；他们**不进**玩家 roster（roster 只收 player 阵营，见 Task 4）。

**Files:**
- Modify: `src/data/heroes.ts`
- Modify: `src/data/items.ts`
- Test: `tests/data/heroes-items.test.ts`（追加用例）

- [ ] **Step 1: 追加失败测试**

在该测试文件末尾追加（沿用文件现有 describe 风格，import 已有的 heroes/items）：

```ts
describe('M3 新增武将与道具', () => {
  it('刘关张/华雄/吕布 登记且兵种合法', () => {
    const expectHero = (id: string, classId: ClassId) => {
      const h = heroes[id]
      expect(h, id).toBeDefined()
      expect(h.classId).toBe(classId)
    }
    expectHero('liubei', 'lord')
    expectHero('guanyu', 'cavalry')
    expectHero('zhangfei', 'cavalry')
    expectHero('huaxiong', 'cavalry')
    expectHero('lvbu', 'cavalry')
  })
  it('全体武将头像色相互不重复', () => {
    const hues = Object.values(heroes).map((h) => h.portraitHue)
    expect(new Set(hues).size).toBe(hues.length)
  })
  it('方天画戟：weapon、atk 加成、限骑兵/君主', () => {
    const it = items['fangtian_ji']
    expect(it).toBeDefined()
    expect(it.kind).toBe('weapon')
    expect(it.bonuses?.atk).toBeGreaterThan(0)
    expect(it.allowedClasses).toEqual(['cavalry', 'lord'])
  })
})
```

（若文件未导入 `ClassId` 类型，补 `import type { ClassId } from '../../src/engine/types'`。）

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/data/heroes-items.test.ts 2>&1 | tail -25`
Expected: FAIL（新 id 未定义）

- [ ] **Step 3: 实现数据**

`src/data/heroes.ts` 的 `defs` 数组末尾追加（色相避开现有 13 个值）：

```ts
  { id: 'liubei', name: '刘备', title: '字玄德', classId: 'lord', portraitHue: 65,
    base: { hp: 50, mp: 10, atk: 11, def: 9, spirit: 9, agi: 9 } },
  { id: 'guanyu', name: '关羽', title: '字云长', classId: 'cavalry', portraitHue: 175,
    base: { hp: 52, mp: 0, atk: 15, def: 9, spirit: 6, agi: 10 } },
  { id: 'zhangfei', name: '张飞', title: '字翼德', classId: 'cavalry', portraitHue: 320,
    base: { hp: 56, mp: 0, atk: 14, def: 8, spirit: 3, agi: 9 } },
  { id: 'huaxiong', name: '华雄', title: '董卓都督', classId: 'cavalry', portraitHue: 340,
    base: { hp: 52, mp: 0, atk: 13, def: 9, spirit: 4, agi: 9 } },
  { id: 'lvbu', name: '吕布', title: '字奉先', classId: 'cavalry', portraitHue: 300,
    base: { hp: 60, mp: 0, atk: 17, def: 11, spirit: 5, agi: 12 } },
```

`src/data/items.ts` 武器段追加：

```ts
  { id: 'fangtian_ji', name: '方天画戟', kind: 'weapon', bonuses: { atk: 11 }, allowedClasses: ['cavalry', 'lord'], desc: '宝物：吕布的画戟' },
```

- [ ] **Step 4: 运行测试通过**

Run: `npx vitest run tests/data/heroes-items.test.ts 2>&1 | tail -25`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/data/heroes.ts src/data/items.ts tests/data/heroes-items.test.ts
git commit -m "feat: 登记刘关张/华雄/吕布与方天画戟"
```

---

### Task 3: ally 三阵营引擎回归锁（M1 必补项）

`initBattle` 的 hasAlly 分支与三阵营回合循环至今无直接测试。本任务**测试先行**；若暴露引擎缺陷，允许修引擎（这是登记在册的补课，不是新需求）。

**Files:**
- Test: `tests/engine/ally.test.ts`（新建）
- Modify（仅当测试暴露缺陷）: `src/engine/` 相关文件

- [ ] **Step 1: 写测试**

```ts
import { describe, it, expect } from 'vitest'
import { apply, initBattle } from '../../src/engine'
import { gameData } from '../../src/data'
import type { BattleDef } from '../../src/engine/types'
import { heroUnit, mobUnit, parseMap } from '../../src/data/battles/shared'

/** 三阵营最小战役：玩家曹操+夏侯惇、友军刘备军关羽、敌方两杂兵。 */
function allyDef(): BattleDef {
  return {
    id: 'ally-test', name: '友军测试', desc: '',
    map: parseMap(['.......', '.......', '.......', '.......', '.......']),
    units: [
      heroUnit('caocao', 'player', { x: 0, y: 2 }),
      heroUnit('xiaohoudun', 'player', { x: 0, y: 3 }),
      heroUnit('guanyu', 'ally', { x: 2, y: 2 }),
      mobUnit('e1', '敌兵', 'infantry', 'enemy', { x: 6, y: 2 }, { hp: 40, mp: 0, atk: 10, def: 5, spirit: 3, agi: 5 }),
      mobUnit('e2', '敌兵', 'infantry', 'enemy', { x: 6, y: 3 }, { hp: 40, mp: 0, atk: 10, def: 5, spirit: 3, agi: 5 }),
    ],
    reinforcements: [], treasureCells: [], dialogues: [], weather: 'sunny', weatherScript: [],
    win: { kind: 'annihilate' }, maxTurns: 10,
  }
}

const endTurn = (s: ReturnType<typeof initBattle>) => apply(s, { type: 'endTurn' }, gameData)

describe('三阵营（player/ally/enemy）', () => {
  it('含友军时 factionOrder 为三阵营，无友军为两阵营', () => {
    expect(initBattle(allyDef(), 1).factionOrder).toEqual(['player', 'ally', 'enemy'])
    const noAlly = { ...allyDef(), units: allyDef().units.filter((u) => u.faction !== 'ally') }
    expect(initBattle(noAlly, 1).factionOrder).toEqual(['player', 'enemy'])
  })
  it('回合循环：player→ally→enemy→turn+1 回到 player', () => {
    let s = initBattle(allyDef(), 7)
    expect(s.factionOrder[s.factionIndex]).toBe('player')
    s = endTurn(s).state
    expect(s.factionOrder[s.factionIndex]).toBe('ally')
    s = endTurn(s).state
    expect(s.factionOrder[s.factionIndex]).toBe('enemy')
    s = endTurn(s).state
    expect(s.turn).toBe(2)
    expect(s.factionOrder[s.factionIndex]).toBe('player')
  })
  it('友军在场不改变胜负口径：敌全灭=胜；我方全灭=负（友军存活不救）', () => {
    let s = initBattle(allyDef(), 7)
    for (const u of s.units) if (u.faction === 'enemy') u.alive = false // 直接构造终局（不可变约定仅供 apply；测试内改快照构造场景）
    s = endTurn(s).state
    expect(s.finished).toBe('won')
    let t = initBattle(allyDef(), 7)
    for (const u of t.units) if (u.faction === 'player') u.alive = false
    t = endTurn(t).state
    expect(t.finished).toBe('lost')
  })
  it('玩家不能操控友军单位（NOT_YOUR_TURN）', () => {
    const s = initBattle(allyDef(), 7)
    const r = apply(s, { type: 'wait', unitId: 'guanyu' }, gameData)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('NOT_YOUR_TURN')
  })
})
```

（第三个用例直接改快照构造终局：wincheck 在 endTurn 时复核。若现有 wincheck 的 `annihilate` 把 ally 误算入敌军、或「我方全灭」误把 ally 算入我方，此处会暴露——修复引擎使其只按 `faction === 'enemy'` / `faction === 'player'` 判定，并保持既有 181 测试全绿。）

- [ ] **Step 2: 运行测试**

Run: `npx vitest run tests/engine/ally.test.ts 2>&1 | tail -25`
Expected: PASS（若 FAIL，按失败点修引擎，最小 diff）

- [ ] **Step 3: 全量回归**

Run: `npm test 2>&1 | tail -25`
Expected: 全绿

- [ ] **Step 4: 提交**

```bash
git add tests/engine/ally.test.ts src/engine
git commit -m "test: ally 三阵营回合循环与胜负口径回归锁"
```

---

### Task 4: campaign 核心（战役状态 / 新游戏 / 装备与道具操作）

**Files:**
- Create: `src/game/campaign.ts`
- Test: `tests/game/campaign.test.ts`

模块级约定（后续任务都依赖，签名必须一致）：

```ts
export const CAMPAIGN_BATTLES: readonly string[] = ['yingchuan', 'sishui', 'hulao']
export interface RosterMember {
  heroId: string; level: number; exp: number
  base: Stats                                    // 成长后裸属性（与 Unit.base 同口径）
  equipment: Partial<Record<ItemSlot, string>>   // 三槽位
  items: string[]                                // 携带的消耗品
}
export interface CampaignState {
  version: 1
  progress: number          // 已通关场数 = 下一场下标；等于 CAMPAIGN_BATTLES.length 即通关
  roster: RosterMember[]
  inventory: string[]       // 仓库：未装备的装备 + 未分配的消耗品
}
type OpResult = { ok: true; campaign: CampaignState } | { ok: false; error: string }
```

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import {
  CAMPAIGN_BATTLES, newGame, currentBattleId,
  equipItem, unequipItem, assignItem, unassignItem,
} from '../../src/game/campaign'

describe('newGame / 进度查询', () => {
  it('初始 roster 来自第一场战役的我方武将（含模板装备）', () => {
    const c = newGame()
    expect(c.version).toBe(1)
    expect(c.progress).toBe(0)
    expect(c.roster.map((m) => m.heroId)).toEqual(['caocao', 'xiaohoudun', 'xiahouyuan', 'caoren', 'xunyu'])
    const cc = c.roster.find((m) => m.heroId === 'caocao')!
    expect(cc.equipment.weapon).toBe('iron_sword')
    expect(cc.items).toEqual(['jinchuang_yao'])
    expect(currentBattleId(c)).toBe('yingchuan')
  })
  it('progress 走满即通关（currentBattleId = null）', () => {
    expect(currentBattleId({ ...newGame(), progress: CAMPAIGN_BATTLES.length })).toBeNull()
  })
  it('初始仓库有可用消耗品', () => {
    expect(newGame().inventory).toEqual(['jinchuang_yao', 'jinchuang_yao', 'huanshen_dan'])
  })
})

describe('装备/携带操作（纯函数、不可变）', () => {
  it('equip：仓库→槽位；旧装备回仓库；兵种不符/槽位不符/不在仓库均报错', () => {
    let c = newGame()
    c = { ...c, inventory: ['qinggang_sword', 'iron_armor'] } // 构造仓库
    // 曹操(lord)装青釭剑：合法，旧铁剑回仓库
    const r1 = equipItem(c, 'caocao', 'weapon', 'qinggang_sword', gameData)
    expect(r1.ok).toBe(true)
    if (r1.ok) {
      expect(r1.campaign.roster.find((m) => m.heroId === 'caocao')!.equipment.weapon).toBe('qinggang_sword')
      expect(r1.campaign.inventory).toContain('iron_sword')
      expect(r1.campaign.inventory).not.toContain('qinggang_sword')
      expect(c.roster.find((m) => m.heroId === 'caocao')!.equipment.weapon).toBe('iron_sword') // 原状态未被改
    }
    // 夏侯惇(cavalry)装青釭剑：兵种不符
    const r2 = equipItem(c, 'xiaohoudun', 'weapon', 'qinggang_sword', gameData)
    expect(r2).toMatchObject({ ok: false })
    // 装备塞错槽位
    const r3 = equipItem(c, 'caocao', 'armor', 'qinggang_sword', gameData)
    expect(r3).toMatchObject({ ok: false })
    // 不在仓库
    const r4 = equipItem(c, 'caocao', 'weapon', 'fangtian_ji', gameData)
    expect(r4).toMatchObject({ ok: false })
  })
  it('unequip：槽位→仓库', () => {
    const c = newGame()
    const r = unequipItem(c, 'caocao', 'weapon', gameData)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.campaign.inventory).toContain('iron_sword')
  })
  it('assign/unassign 仅限消耗品', () => {
    let c = newGame()
    const r1 = assignItem(c, 'xunyu', 'huanshen_dan', gameData)
    expect(r1.ok).toBe(true)
    if (r1.ok) {
      expect(r1.campaign.roster.find((m) => m.heroId === 'xunyu')!.items).toContain('huanshen_dan')
      const r2 = unassignItem(r1.campaign, 'xunyu', 'huanshen_dan', gameData)
      expect(r2.ok && r2.campaign.inventory).toContain('huanshen_dan')
    }
    const bad = assignItem(c, 'xunyu', 'iron_sword', gameData) // 非消耗品
    expect(bad).toMatchObject({ ok: false })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/game/campaign.test.ts 2>&1 | tail -25`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/game/campaign.ts`**

```ts
import type { BattleDef, BattleState, ItemSlot, Stats, Unit } from '../engine/types'
import type { GameData } from '../data'
import { gameData } from '../data'
import { battles } from '../data/battles'
import { effectiveStats } from '../engine/internal'
import { EXP_PER_LEVEL } from '../engine/growth'

/** 战役时间轴（M3 = 前 3 场）。 */
export const CAMPAIGN_BATTLES: readonly string[] = ['yingchuan', 'sishui', 'hulao']

export interface RosterMember {
  heroId: string; level: number; exp: number
  base: Stats
  equipment: Partial<Record<ItemSlot, string>>
  items: string[]
}

export interface CampaignState {
  version: 1
  progress: number
  roster: RosterMember[]
  inventory: string[]
}

export type OpResult = { ok: true; campaign: CampaignState } | { ok: false; error: string }

/** 新游戏：roster 按首场战役我方阵容初始化（模板装备/携带即为初始值），仓库发基础消耗品。 */
export function newGame(data: GameData = gameData): CampaignState {
  const def = battles[CAMPAIGN_BATTLES[0]!]
  const roster: RosterMember[] = def.units
    .filter((u) => u.faction === 'player' && u.heroId !== '')
    .map((u) => ({
      heroId: u.heroId, level: u.level, exp: u.exp, base: { ...u.base },
      equipment: { ...u.equipment }, items: [...u.items],
    }))
  return { version: 1, progress: 0, roster, inventory: ['jinchuang_yao', 'jinchuang_yao', 'huanshen_dan'] }
}

/** 当前应战战役 id；null = 全部通关。 */
export function currentBattleId(c: CampaignState): string | null {
  return c.progress >= CAMPAIGN_BATTLES.length ? null : CAMPAIGN_BATTLES[c.progress]!
}

const memberOf = (c: CampaignState, heroId: string) => c.roster.find((m) => m.heroId === heroId)

function withRoster(c: CampaignState, heroId: string, patch: (m: RosterMember) => RosterMember): OpResult {
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  return { ok: true, campaign: { ...c, roster: c.roster.map((x) => (x.heroId === heroId ? patch(x) : x)) } }
}

/** 装备：从仓库装入指定槽位；旧装备回仓库。校验：在仓库 / kind 与槽位一致 / 兵种允许。 */
export function equipItem(c: CampaignState, heroId: string, slot: ItemSlot, itemId: string, data: GameData = gameData): OpResult {
  const it = data.items[itemId]
  const hero = data.heroes[heroId]
  if (!it) return { ok: false, error: `未知物品: ${itemId}` }
  if (!hero) return { ok: false, error: `未知武将: ${heroId}` }
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  const idx = c.inventory.indexOf(itemId)
  if (idx < 0) return { ok: false, error: `物品不在仓库: ${itemId}` }
  if (it.kind !== slot) return { ok: false, error: `${it.name} 不能装入 ${slot} 槽` }
  if (it.allowedClasses && !it.allowedClasses.includes(hero.classId))
    return { ok: false, error: `${hero.name}（${data.classes[hero.classId].name}）不能用 ${it.name}` }
  const prev = m.equipment[slot]
  const inventory = c.inventory.filter((_, i) => i !== idx)
  if (prev) inventory.push(prev)
  return {
    ok: true,
    campaign: {
      ...c, inventory,
      roster: c.roster.map((x) => x.heroId === heroId
        ? { ...x, equipment: { ...x.equipment, [slot]: itemId } } : x),
    },
  }
}

/** 卸下：槽位 → 仓库。 */
export function unequipItem(c: CampaignState, heroId: string, slot: ItemSlot, _data: GameData = gameData): OpResult {
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  const prev = m.equipment[slot]
  if (!prev) return { ok: false, error: '该槽位没有装备' }
  const r = withRoster(c, heroId, (x) => {
    const equipment = { ...x.equipment }
    delete equipment[slot]
    return { ...x, equipment }
  })
  return r.ok ? { ok: true, campaign: { ...r.campaign, inventory: [...c.inventory, prev] } } : r
}

/** 携带：仓库消耗品 → 武将。 */
export function assignItem(c: CampaignState, heroId: string, itemId: string, data: GameData = gameData): OpResult {
  const it = data.items[itemId]
  if (!it || it.kind !== 'consumable') return { ok: false, error: `非消耗品: ${itemId}` }
  const idx = c.inventory.indexOf(itemId)
  if (idx < 0) return { ok: false, error: `物品不在仓库: ${itemId}` }
  const r = withRoster(c, heroId, (m) => ({ ...m, items: [...m.items, itemId] }))
  return r.ok
    ? { ok: true, campaign: { ...r.campaign, inventory: c.inventory.filter((_, i) => i !== idx) } }
    : r
}

/** 取回：武将消耗品 → 仓库。 */
export function unassignItem(c: CampaignState, heroId: string, itemId: string, _data: GameData = gameData): OpResult {
  const m = memberOf(c, heroId)
  if (!m) return { ok: false, error: `武将不在名册: ${heroId}` }
  if (!m.items.includes(itemId)) return { ok: false, error: `未携带: ${itemId}` }
  const r = withRoster(c, heroId, (x) => ({ ...x, items: x.items.filter((i) => i !== itemId) }))
  return r.ok
    ? { ok: true, campaign: { ...r.campaign, inventory: [...c.inventory, itemId] } }
    : r
}
```

（import 块中 `effectiveStats` / `Unit` / `EXP_PER_LEVEL` / `BattleDef` / `BattleState` 在本任务暂未使用——它们供 Task 5/6 追加的 `deployBattle`/`settleBattle` 使用；vitest 不做类型检查，本任务不受影响，后续任务不得重复 import。）

- [ ] **Step 4: 运行测试通过**

Run: `npx vitest run tests/game/campaign.test.ts 2>&1 | tail -25`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/campaign.ts tests/game/campaign.test.ts
git commit -m "feat: 战役进度状态与装备/携带操作"
```

---

### Task 5: deployBattle（整备数据 → 战役定义注入）

roster 持久属性（等级/经验/成长裸属性/装备/携带）注入战役定义的我方单位；武将血蓝按含装备的满值初始化（修复 M1 潜在问题：裸 `base.hp` 未计装备 hp 加成，装备明光铠会以"残血"开局）。

**Files:**
- Modify: `src/game/campaign.ts`（追加）
- Test: `tests/game/campaign.test.ts`（追加）

- [ ] **Step 1: 追加失败测试**

```ts
import { deployBattle } from '../../src/game/campaign'
import { battles } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import { initBattle } from '../../src/engine'

describe('deployBattle', () => {
  it('roster 属性注入我方单位：等级/经验/裸属性/装备/携带', () => {
    const c = newGame()
    const tuned = {
      ...c,
      roster: c.roster.map((m) => m.heroId === 'caocao'
        ? { ...m, level: 5, exp: 42, base: { ...m.base, hp: m.base.hp + 12, atk: m.base.atk + 3 },
            equipment: { weapon: 'qinggang_sword' }, items: ['jinchuang_yao', 'huanshen_dan'] }
        : m),
    }
    const def = deployBattle(battles.yingchuan, tuned, gameData)
    const cc = def.units.find((u) => u.id === 'caocao')!
    expect(cc.level).toBe(5)
    expect(cc.exp).toBe(42)
    expect(cc.base.hp).toBe(tuned.roster[0]!.base.hp)
    expect(cc.equipment.weapon).toBe('qinggang_sword')
    expect(cc.items).toEqual(['jinchuang_yao', 'huanshen_dan'])
    // 敌方单位不受影响
    expect(def.units.find((u) => u.id === 'e1')!.level).toBe(1)
  })
  it('血蓝按含装备满值：装明光铠后初始 HP = 裸属性+10', () => {
    const c = newGame()
    const m = c.roster.find((r) => r.heroId === 'caoren')!
    const equipped = { ...c, roster: c.roster.map((r) => r.heroId === 'caoren'
      ? { ...r, equipment: { armor: 'mingguang_armor' } } : r) }
    const def = deployBattle(battles.yingchuan, equipped, gameData)
    const cr = def.units.find((u) => u.id === 'caoren')!
    expect(cr.hp).toBe(m.base.hp + 10)
  })
  it('名册没有的武将按模板参战（新武将随战役登场）', () => {
    const c = { ...newGame(), roster: newGame().roster.filter((m) => m.heroId !== 'xunyu') }
    const def = deployBattle(battles.yingchuan, c, gameData)
    expect(def.units.find((u) => u.id === 'xunyu')).toBeDefined()
  })
  it('注入后的定义仍通过加载校验且可 initBattle', () => {
    const def = deployBattle(battles.yingchuan, newGame(), gameData)
    expect(() => assertBattleValid(def, 'yingchuan', gameData)).not.toThrow()
    expect(initBattle(def, 1).battleId).toBe('yingchuan')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/game/campaign.test.ts 2>&1 | tail -25`
Expected: FAIL（deployBattle 未定义）

- [ ] **Step 3: 实现（campaign.ts 追加）**

```ts
/** 整备注入：roster 属性覆盖战役定义中的我方武将单位；名册外武将按模板参战（结算时自动入册）。 */
export function deployBattle(def: BattleDef, c: CampaignState, data: GameData = gameData): BattleDef {
  const units = def.units.map((u) => {
    if (u.faction !== 'player' || u.heroId === '') return u
    const m = c.roster.find((r) => r.heroId === u.heroId)
    if (!m) return u
    const merged: Unit = {
      ...u, level: m.level, exp: m.exp, base: { ...m.base },
      equipment: { ...m.equipment }, items: [...m.items],
    }
    const eff = effectiveStats(merged, data)
    merged.hp = eff.hp
    merged.mp = eff.mp
    return merged
  })
  return { ...def, units }
}
```

（`effectiveStats` 与 `Unit` 已在 Task 4 的 import 块中，无需新增 import。）

- [ ] **Step 4: 运行测试通过 + 全量回归**

Run: `npx vitest run tests/game/campaign.test.ts 2>&1 | tail -25 && npm test 2>&1 | tail -8`
Expected: PASS / 全绿

- [ ] **Step 5: 提交**

```bash
git add src/game/campaign.ts tests/game/campaign.test.ts
git commit -m "feat: 整备注入 deployBattle（roster→战役定义，满血含装备）"
```

---

### Task 6: settleBattle（战后结算：收割经验/等级/物品 + 掉落入库 + 推进）

**Files:**
- Modify: `src/game/campaign.ts`（追加）
- Test: `tests/game/campaign.test.ts`（追加）

结算口径：**只有胜利才收割**（防止故意战败刷经验）；败北返回原 campaign + `won:false` 报告。宝物读 `final.rewards`（引擎踩格写入）；掉落按 `def.drops` 对照存活状态。新武将（参战但不在名册）胜利后以战后数值自动入册。

- [ ] **Step 1: 追加失败测试**

```ts
import { settleBattle } from '../../src/game/campaign'
import { initBattle } from '../../src/engine'

describe('settleBattle', () => {
  it('胜利：收割等级/经验/裸属性/剩余携带，宝物与掉落入库，推进进度', () => {
    const c = { ...newGame(), inventory: [] }
    const st = initBattle(battles.yingchuan, 42)
    const def = { ...battles.yingchuan, drops: [{ unitId: 'zl', itemId: 'taiping_book' }] }
    // 构造战后终局：敌全灭、曹操升级、踩了宝物格
    const units = st.units.map((u) =>
      u.faction === 'enemy' ? { ...u, alive: false } : u)
    const caocao = units.find((u) => u.id === 'caocao')!
    const idx = units.indexOf(caocao)
    units[idx] = { ...caocao, level: 2, exp: 55, base: { ...caocao.base, hp: caocao.base.hp + 2 } }
    const final = { ...st, units, finished: 'won' as const, rewards: ['iron_sword'] }
    const r = settleBattle(c, def, final, gameData)
    expect(r.report.won).toBe(true)
    expect(r.campaign.progress).toBe(1)
    const m = r.campaign.roster.find((x) => x.heroId === 'caocao')!
    expect(m.level).toBe(2)
    expect(m.exp).toBe(55)
    expect(m.base.hp).toBe(caocao.base.hp + 2)
    expect(r.campaign.inventory).toEqual(expect.arrayContaining(['iron_sword', 'taiping_book']))
    // 掉落目标未死则不入库
    const aliveDrop = settleBattle(c, { ...def, drops: [{ unitId: 'e1', itemId: 'jinchuang_yao' }] },
      { ...final, units: final.units.map((u) => u.id === 'e1' ? { ...u, alive: true } : u) }, gameData)
    expect(aliveDrop.campaign.inventory).not.toContain('jinchuang_yao')
  })
  it('败北：不收割不推进（防刷经验）', () => {
    const c = newGame()
    const st = initBattle(battles.yingchuan, 42)
    const final = { ...st, finished: 'lost' as const, rewards: ['iron_sword'] }
    const r = settleBattle(c, battles.yingchuan, final, gameData)
    expect(r.report.won).toBe(false)
    expect(r.campaign).toEqual(c)
  })
  it('战报：经验增量与升级数按 100/级 折算', () => {
    const c = newGame()
    const st = initBattle(battles.yingchuan, 42)
    const units = st.units.map((u) => u.faction === 'enemy' ? { ...u, alive: false } : u)
    const dun = units.find((u) => u.id === 'xiaohoudun')!
    const idx = units.indexOf(dun)
    units[idx] = { ...dun, level: 3, exp: 40 } // 2 级 × 100 + 40
    const r = settleBattle(c, battles.yingchuan, { ...st, units, finished: 'won' as const, rewards: [] }, gameData)
    const row = r.report.heroes.find((h) => h.heroId === 'xiaohoudun')!
    expect(row.expGained).toBe(240)
    expect(row.levelsGained).toBe(2)
    expect(row.toLevel).toBe(3)
    expect(r.report.heroes.every((h) => h.heroId === 'caocao' || c.roster.some((m) => m.heroId === h.heroId))).toBe(true)
  })
  it('新武将胜利后自动入册（以战后数值）', () => {
    const c = { ...newGame(), roster: newGame().roster.filter((m) => m.heroId !== 'xunyu') }
    const st = initBattle(battles.yingchuan, 42)
    const units = st.units.map((u) => u.faction === 'enemy' ? { ...u, alive: false } : u)
    const xy = units.find((u) => u.id === 'xunyu')!
    const idx = units.indexOf(xy)
    units[idx] = { ...xy, level: 2, exp: 10 }
    const r = settleBattle(c, battles.yingchuan, { ...st, units, finished: 'won' as const, rewards: [] }, gameData)
    expect(r.campaign.roster.find((m) => m.heroId === 'xunyu')!.level).toBe(2)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/game/campaign.test.ts 2>&1 | tail -25`
Expected: FAIL（settleBattle 未定义）

- [ ] **Step 3: 实现（campaign.ts 追加）**

```ts
export interface SettleReportHero {
  heroId: string; name: string
  expGained: number   // 本场折算总经验（跨级按 100/级）
  levelsGained: number
  toLevel: number
}
export interface SettleReport {
  won: boolean
  heroes: SettleReportHero[]       // 仅本场参战武将
  gained: string[]                 // 入库物品 id（宝物 + 掉落）
}

/** 战后结算：胜利收割成长与物品并推进进度；败北原样返回（防刷经验）。 */
export function settleBattle(
  c: CampaignState, def: BattleDef, final: BattleState, data: GameData = gameData,
): { campaign: CampaignState; report: SettleReport } {
  if (final.finished !== 'won') {
    return { campaign: c, report: { won: false, heroes: [], gained: [] } }
  }
  const roster = c.roster.map((m) => ({ ...m, base: { ...m.base }, equipment: { ...m.equipment }, items: [...m.items] }))
  const heroes: SettleReportHero[] = []
  for (const u of final.units) {
    if (u.faction !== 'player' || u.heroId === '') continue
    const m = roster.find((x) => x.heroId === u.heroId)
    const from = m ?? { heroId: u.heroId, level: 1, exp: 0, base: { ...u.base }, equipment: { ...u.equipment }, items: [] }
    heroes.push({
      heroId: u.heroId, name: data.heroes[u.heroId]?.name ?? u.heroId,
      expGained: (u.level - from.level) * EXP_PER_LEVEL + (u.exp - from.exp),
      levelsGained: u.level - from.level, toLevel: u.level,
    })
    if (m) {
      m.level = u.level; m.exp = u.exp; m.base = { ...u.base }; m.items = [...u.items]
    } else {
      roster.push({ heroId: u.heroId, level: u.level, exp: u.exp, base: { ...u.base }, equipment: { ...u.equipment }, items: [...u.items] })
    }
  }
  const gained = [...final.rewards]
  for (const d of def.drops ?? []) {
    const t = final.units.find((u) => u.id === d.unitId)
    if (t && !t.alive) gained.push(d.itemId)
  }
  return {
    campaign: {
      ...c,
      progress: Math.min(c.progress + 1, CAMPAIGN_BATTLES.length),
      roster,
      inventory: [...c.inventory, ...gained],
    },
    report: { won: true, heroes, gained },
  }
}
```

- [ ] **Step 4: 运行测试通过 + 全量回归**

Run: `npx vitest run tests/game/campaign.test.ts 2>&1 | tail -25 && npm test 2>&1 | tail -8`
Expected: PASS / 全绿

- [ ] **Step 5: 提交**

```bash
git add src/game/campaign.ts tests/game/campaign.test.ts
git commit -m "feat: 战后结算 settleBattle（收割/掉落/推进，败北不收割）"
```

---

### Task 7: 存档系统（序列化 / 3 手动 + 1 自动槽 / 导入导出）

localStorage 仅作薄适配器注入；核心序列化/校验是纯函数（spec §6：三手动档 + 1 自动档 + JSON 导出/导入；§7：损坏存档不崩溃）。

**Files:**
- Create: `src/game/saves.ts`
- Test: `tests/game/saves.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/game/saves.test.ts 2>&1 | tail -25`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 `src/game/saves.ts`**

```ts
import type { CampaignState } from './campaign'
import type { GameData } from '../data'

export const SLOT_KEYS = ['auto', '1', '2', '3'] as const
export type SlotKey = typeof SLOT_KEYS[number]

export interface Storage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface SaveEnvelope { v: 1; savedAt: number; campaign: CampaignState }

const keyOf = (slot: SlotKey) => `caocaozhuan:save:${slot}`

/** localStorage 薄适配器（非浏览器环境安全降级为空操作）。 */
export const localStorageAdapter: Storage = {
  getItem: (k) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k)),
  setItem: (k, v) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v) },
  removeItem: (k) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(k) },
}

export function serialize(c: CampaignState, now: number = Date.now()): string {
  return JSON.stringify({ v: 1, savedAt: now, campaign: c })
}

/** 形状与引用校验（武将/物品 id 必须在注册表中）；任何不符返回 null。 */
function validCampaign(x: unknown, data: GameData): x is CampaignState {
  if (typeof x !== 'object' || x === null) return false
  const c = x as Record<string, unknown>
  if (c.version !== 1) return false
  if (typeof c.progress !== 'number' || c.progress < 0) return false
  if (!Array.isArray(c.roster) || !Array.isArray(c.inventory)) return false
  const statKeys = ['hp', 'mp', 'atk', 'def', 'spirit', 'agi']
  for (const m of c.roster) {
    if (typeof m !== 'object' || m === null) return false
    const r = m as Record<string, unknown>
    if (typeof r.heroId !== 'string' || !data.heroes[r.heroId]) return false
    if (typeof r.level !== 'number' || typeof r.exp !== 'number') return false
    if (typeof r.base !== 'object' || r.base === null) return false
    const base = r.base as Record<string, unknown>
    if (!statKeys.every((k) => typeof base[k] === 'number')) return false
    if (!Array.isArray(r.items)) return false
    for (const id of r.items) if (typeof id !== 'string' || !data.items[id]) return false
    if (r.equipment !== undefined) {
      if (typeof r.equipment !== 'object' || r.equipment === null) return false
      for (const id of Object.values(r.equipment as Record<string, unknown>))
        if (typeof id !== 'string' || !data.items[id]) return false
    }
  }
  for (const id of c.inventory) if (typeof id !== 'string' || !data.items[id]) return false
  return true
}

export function deserialize(text: string, data: GameData): CampaignState | null {
  try {
    const env = JSON.parse(text) as SaveEnvelope
    if (env?.v !== 1 || typeof env.savedAt !== 'number') return null
    return validCampaign(env.campaign, data) ? env.campaign : null
  } catch {
    return null
  }
}

export function saveSlot(st: Storage, slot: SlotKey, c: CampaignState, now: number = Date.now()): void {
  st.setItem(keyOf(slot), serialize(c, now))
}

export function loadSlot(st: Storage, slot: SlotKey, data: GameData): CampaignState | null {
  const raw = st.getItem(keyOf(slot))
  return raw === null ? null : deserialize(raw, data)
}

export function slotInfo(st: Storage, slot: SlotKey, data: GameData): { status: 'empty' | 'ok' | 'corrupt'; savedAt: number | null } {
  const raw = st.getItem(keyOf(slot))
  if (raw === null) return { status: 'empty', savedAt: null }
  const env = (() => { try { return JSON.parse(raw) as SaveEnvelope } catch { return null } })()
  if (env?.v !== 1 || !validCampaign(env.campaign, data)) return { status: 'corrupt', savedAt: null }
  return { status: 'ok', savedAt: env.savedAt }
}
```

- [ ] **Step 4: 运行测试通过**

Run: `npx vitest run tests/game/saves.test.ts 2>&1 | tail -25`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/saves.ts tests/game/saves.test.ts
git commit -m "feat: 存档槽（3 手动 + 1 自动）与 JSON 序列化校验"
```

---

### Task 8: 汜水关之战（友军刘关张 / 斩华雄 / heroUnit 数值覆盖）

**Files:**
- Modify: `src/data/battles/shared.ts`（heroUnit 加 `base?` 覆盖项）
- Create: `src/data/battles/sishui.ts`
- Modify: `src/data/battles/index.ts`（注册三张表）
- Test: `tests/data/sishui.test.ts`（新建）

M2 终审登记项「battles/battleOpeners/battleDialogues 三注册表一致性靠约定」在此清偿：新增一致性测试锁全部战役。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { validateBattleDef } from '../../src/data/battles/shared'
import { initBattle } from '../../src/engine'

describe('注册表一致性（全部战役）', () => {
  it('每场战役都有开场对话 id 且台词存在', () => {
    for (const id of Object.keys(battles)) {
      expect(battleOpeners[id], id).toBeDefined()
      expect(battleDialogues[id]?.[battleOpeners[id]!]?.length, id).toBeGreaterThan(0)
    }
  })
  it('每场战役都有对话注册表条目', () => {
    for (const id of Object.keys(battles)) expect(battleDialogues[id], id).toBeDefined()
  })
})

describe('汜水关之战', () => {
  it('校验零 errors（含 ally 阵营与 drops）', () => {
    expect(validateBattleDef(battles.sishui!, gameData).errors).toEqual([])
  })
  it('三阵营回合序（player/ally/enemy）', () => {
    expect(initBattle(battles.sishui!, 1).factionOrder).toEqual(['player', 'ally', 'enemy'])
  })
  it('胜利条件 = 击破华雄；华雄掉落铁甲', () => {
    expect(battles.sishui!.win).toEqual({ kind: 'killCommander', unitId: 'huaxiong' })
    expect(battles.sishui!.drops).toEqual([{ unitId: 'huaxiong', itemId: 'iron_armor' }])
  })
  it('我方 6 人（曹洪登场）、友军三英、敌方华雄+杂兵+增援', () => {
    const u = battles.sishui!.units
    expect(u.filter((x) => x.faction === 'player').map((x) => x.id)).toEqual(
      ['caocao', 'xiaohoudun', 'xiahouyuan', 'caoren', 'xunyu', 'caohong'])
    expect(u.filter((x) => x.faction === 'ally').map((x) => x.id)).toEqual(['liubei', 'guanyu', 'zhangfei'])
    expect(u.find((x) => x.id === 'huaxiong')!.faction).toBe('enemy')
    expect(battles.sishui!.reinforcements[0]!.entries.length).toBeGreaterThan(0)
  })
  it('华雄数值覆盖生效（hp 高于档案值）', () => {
    const h = battles.sishui!.units.find((x) => x.id === 'huaxiong')!
    expect(h.base.hp).toBeGreaterThan(gameData.heroes['huaxiong']!.base.hp)
    expect(h.level).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/data/sishui.test.ts 2>&1 | tail -25`
Expected: FAIL（sishui 未定义）

- [ ] **Step 3: 实现**

`src/data/battles/shared.ts` —— `heroUnit` 选项加 `base?: Stats`（full 覆盖，用于敌将/友军按强度标定）：

```ts
export function heroUnit(
  heroId: string, faction: Faction, pos: Cell,
  o: { level?: number; base?: Stats; equipment?: Partial<Record<ItemSlot, string>>; items?: string[] } = {},
): Unit {
  const h = heroes[heroId]
  if (!h) throw new Error(`未知武将: ${heroId}`)
  const base = o.base ? { ...o.base } : { ...h.base }
  return {
    id: heroId, heroId, name: h.name, faction, classId: h.classId,
    level: o.level ?? 1, exp: 0, base, hp: base.hp, mp: base.mp,
    pos: { ...pos }, equipment: { ...o.equipment }, items: [...(o.items ?? [])],
    statuses: [], moved: false, acted: false, alive: true,
  }
}
```

Create `src/data/battles/sishui.ts`：

```ts
import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const XILIANG = { hp: 52, mp: 0, atk: 12, def: 9, spirit: 3, agi: 7 }  // 西凉兵(步兵)
const XILIANG_GONG = { hp: 44, mp: 0, atk: 13, def: 6, spirit: 4, agi: 9 } // 西凉弓手
const XIANGYONG = { hp: 56, mp: 0, atk: 13, def: 8, spirit: 3, agi: 11 } // 凉州骑兵(增援)
/** 三英（友军）按 Lv3 强度标定：保证友军打得动华雄军。 */
const LB3 = { hp: 62, mp: 12, atk: 14, def: 11, spirit: 10, agi: 10 }
const GY3 = { hp: 66, mp: 0, atk: 19, def: 11, spirit: 7, agi: 12 }
const ZF3 = { hp: 72, mp: 0, atk: 18, def: 10, spirit: 4, agi: 11 }

export const sishui: BattleDef = {
  id: 'sishui',
  name: '汜水关之战',
  desc: '关东联军讨董，关羽温酒斩华雄。（胜利：击破华雄）',
  map: parseMap([
    'ff..f.....G..CC.',
    '.f........G..CC.',
    '....f.....G..PP.',
    '..f.......G..PP.',
    '...f......G.....',
    '................',
    '.....m....G.....',
    '..m.......G.....',
    '.mm...f...G.....',
    '.mm.......G.....',
    '..m.......G.....',
    'f.........G.....',
  ]),
  units: [
    // 我方（西侧联军大营）
    heroUnit('caocao', 'player', { x: 2, y: 6 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 5 }),
    heroUnit('xiahouyuan', 'player', { x: 1, y: 7 }),
    heroUnit('caoren', 'player', { x: 3, y: 5 }),
    heroUnit('xunyu', 'player', { x: 3, y: 7 }),
    heroUnit('caohong', 'player', { x: 4, y: 6 }), // 本关新参战
    // 友军（刘备军，关羽将斩华雄）
    heroUnit('liubei', 'ally', { x: 6, y: 5 }, { level: 3, base: LB3 }),
    heroUnit('guanyu', 'ally', { x: 7, y: 4 }, { level: 3, base: GY3 }),
    heroUnit('zhangfei', 'ally', { x: 7, y: 6 }, { level: 3, base: ZF3 }),
    // 敌方（关东侧董卓军）
    heroUnit('huaxiong', 'enemy', { x: 13, y: 5 }, { level: 5, base: { hp: 78, mp: 0, atk: 16, def: 10, spirit: 4, agi: 10 } }),
    mobUnit('e1', '西凉兵', 'infantry', 'enemy', { x: 12, y: 3 }, XILIANG),
    mobUnit('e2', '西凉兵', 'infantry', 'enemy', { x: 14, y: 4 }, XILIANG),
    mobUnit('e3', '西凉兵', 'infantry', 'enemy', { x: 12, y: 7 }, XILIANG),
    mobUnit('e4', '西凉兵', 'infantry', 'enemy', { x: 14, y: 8 }, XILIANG),
    mobUnit('g1', '西凉弓手', 'archer', 'enemy', { x: 13, y: 2 }, XILIANG_GONG),
    mobUnit('g2', '西凉弓手', 'archer', 'enemy', { x: 13, y: 9 }, XILIANG_GONG),
  ],
  reinforcements: [
    { turn: 4, entries: [
      { unit: mobUnit('r1', '凉州骑兵', 'cavalry', 'enemy', { x: 15, y: 5 }, XIANGYONG), at: { x: 15, y: 5 } },
      { unit: mobUnit('r2', '凉州骑兵', 'cavalry', 'enemy', { x: 15, y: 6 }, XIANGYONG), at: { x: 15, y: 6 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 5, y: 9 }, itemId: 'jinchuang_yao', found: false },
    { cell: { x: 14, y: 10 }, itemId: 'huanshen_dan', found: false },
  ],
  drops: [{ unitId: 'huaxiong', itemId: 'iron_armor' }],
  dialogues: [
    { turn: 3, dialogueId: 'ss_ally' },
    { onDeathOf: 'huaxiong', dialogueId: 'ss_hua_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'killCommander', unitId: 'huaxiong' },
  maxTurns: 20,
}

export type { DialogueLine }

export const sishuiDialogues: Record<string, DialogueLine[]> = {
  ss_start: [
    { speaker: '袁绍', text: '华雄连斩我联军数将，何人敢再去迎战？' },
    { speaker: '关羽', text: '小将愿往，斩华雄之首，献于帐下！' },
    { speaker: '曹操', text: '好！且饮此杯，壮行色。' },
    { speaker: '关羽', text: '酒且斟下，某去便来！' },
  ],
  ss_ally: [
    { speaker: '刘备', text: '云长出阵，翼德压阵，莫教敌军抄了后路。' },
    { speaker: '张飞', text: '俺早等不及了！谁拦俺，俺捅谁！' },
  ],
  ss_hua_down: [
    { speaker: '华雄', text: '竟然……败于一介马弓手……' },
    { speaker: '关羽', text: '华雄已斩——其酒尚温！' },
    { speaker: '曹操', text: '云长神威！传令三军，趁势夺关！' },
  ],
}
```

`src/data/battles/index.ts` 全量替换为：

```ts
import { yingchuan, yingchuanDialogues } from './yingchuan'
import { sishui, sishuiDialogues } from './sishui'
import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan, [sishui.id]: sishui }

/** 开场对话 id（按战役注册；对话文本仍在各战役文件）。 */
export const battleOpeners: Record<string, string> = { yingchuan: 'yc_start', sishui: 'ss_start' }

/** 对话文本注册表：battleId → dialogueId → 台词。 */
export const battleDialogues: Record<string, Record<string, DialogueLine[]>> = {
  yingchuan: yingchuanDialogues,
  sishui: sishuiDialogues,
}
```

- [ ] **Step 4: 运行测试通过 + 全量回归**

Run: `npx vitest run tests/data/sishui.test.ts tests/data/yingchuan.test.ts 2>&1 | tail -25 && npm test 2>&1 | tail -8`
Expected: PASS / 全绿

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/shared.ts src/data/battles/sishui.ts src/data/battles/index.ts tests/data/sishui.test.ts
git commit -m "feat: 汜水关之战（友军三英 + 斩华雄 + 掉落）"
```

---

### Task 9: 虎牢关之战（吕布 / 三英战吕布 / 方天画戟与赤兔）

**Files:**
- Create: `src/data/battles/hulao.ts`
- Modify: `src/data/battles/index.ts`（三张表各加一行 hulao）
- Test: `tests/data/hulao.test.ts`（新建，风格同 sishui.test.ts）

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { validateBattleDef } from '../../src/data/battles/shared'
import { initBattle } from '../../src/engine'

describe('虎牢关之战', () => {
  it('校验零 errors（含 ally 与双掉落）', () => {
    expect(validateBattleDef(battles.hulao!, gameData).errors).toEqual([])
  })
  it('三阵营回合序', () => {
    expect(initBattle(battles.hulao!, 1).factionOrder).toEqual(['player', 'ally', 'enemy'])
  })
  it('胜利条件 = 击破吕布；吕布掉落画戟+赤兔', () => {
    expect(battles.hulao!.win).toEqual({ kind: 'killCommander', unitId: 'lvbu' })
    expect(battles.hulao!.drops).toEqual([
      { unitId: 'lvbu', itemId: 'fangtian_ji' },
      { unitId: 'lvbu', itemId: 'chitu_horse' },
    ])
  })
  it('我方 7 人（典韦登场）、友军三英、吕布 Lv8 高威胁', () => {
    const u = battles.hulao!.units
    expect(u.filter((x) => x.faction === 'player').map((x) => x.id)).toEqual(
      ['caocao', 'xiaohoudun', 'xiahouyuan', 'caoren', 'xunyu', 'caohong', 'dianwei'])
    expect(u.filter((x) => x.faction === 'ally').map((x) => x.id)).toEqual(['liubei', 'guanyu', 'zhangfei'])
    const lvbu = u.find((x) => x.id === 'lvbu')!
    expect(lvbu.level).toBe(8)
    expect(lvbu.base.atk).toBeGreaterThanOrEqual(20)
  })
  it('第 2 回合有三英战吕布对话触发', () => {
    expect(battles.hulao!.dialogues).toContainEqual({ turn: 2, dialogueId: 'hl_sanying' })
    expect(battles.hulao!.dialogues).toContainEqual({ onDeathOf: 'lvbu', dialogueId: 'hl_lvbu_down' })
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/data/hulao.test.ts 2>&1 | tail -25`
Expected: FAIL

- [ ] **Step 3: 实现 `src/data/battles/hulao.ts`**

```ts
import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'
import { heroUnit, mobUnit, parseMap } from './shared'

const BINGZHOU = { hp: 56, mp: 0, atk: 13, def: 8, spirit: 3, agi: 11 } // 并州骑兵
const BINGZHOU_GONG = { hp: 46, mp: 0, atk: 14, def: 6, spirit: 4, agi: 9 } // 并州弓手
/** 三英（友军）按 Lv4 强度标定。 */
const LB4 = { hp: 66, mp: 14, atk: 15, def: 12, spirit: 11, agi: 11 }
const GY4 = { hp: 72, mp: 0, atk: 20, def: 12, spirit: 8, agi: 13 }
const ZF4 = { hp: 78, mp: 0, atk: 19, def: 11, spirit: 5, agi: 12 }

export const hulao: BattleDef = {
  id: 'hulao',
  name: '虎牢关之战',
  desc: '吕布扼守虎牢，三英轮战吕布。（胜利：击破吕布）',
  map: parseMap([
    'ff..f.......G...CC.',
    '.f..........G...CC.',
    '....f.......G...PP.',
    '..f.........G...PP.',
    '...f........G......',
    '..................',
    '.....m......G......',
    '..m.........G......',
    '.mm....f....G......',
    '.mm.........G......',
    '...m........G......',
    'f...........G......',
  ]),
  units: [
    // 我方（西侧）
    heroUnit('caocao', 'player', { x: 2, y: 6 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 5 }),
    heroUnit('xiahouyuan', 'player', { x: 1, y: 7 }),
    heroUnit('caoren', 'player', { x: 3, y: 5 }),
    heroUnit('xunyu', 'player', { x: 3, y: 7 }),
    heroUnit('caohong', 'player', { x: 4, y: 6 }),
    heroUnit('dianwei', 'player', { x: 2, y: 4 }), // 本关新参战
    // 友军（三英）
    heroUnit('liubei', 'ally', { x: 6, y: 6 }, { level: 4, base: LB4 }),
    heroUnit('guanyu', 'ally', { x: 7, y: 5 }, { level: 4, base: GY4 }),
    heroUnit('zhangfei', 'ally', { x: 7, y: 7 }, { level: 4, base: ZF4 }),
    // 敌方
    heroUnit('lvbu', 'enemy', { x: 15, y: 5 }, { level: 8, base: { hp: 96, mp: 0, atk: 21, def: 13, spirit: 6, agi: 13 } }),
    mobUnit('c1', '并州骑兵', 'cavalry', 'enemy', { x: 14, y: 3 }, BINGZHOU),
    mobUnit('c2', '并州骑兵', 'cavalry', 'enemy', { x: 16, y: 4 }, BINGZHOU),
    mobUnit('c3', '并州骑兵', 'cavalry', 'enemy', { x: 14, y: 7 }, BINGZHOU),
    mobUnit('c4', '并州骑兵', 'cavalry', 'enemy', { x: 16, y: 8 }, BINGZHOU),
    mobUnit('g1', '并州弓手', 'archer', 'enemy', { x: 15, y: 2 }, BINGZHOU_GONG),
    mobUnit('g2', '并州弓手', 'archer', 'enemy', { x: 15, y: 9 }, BINGZHOU_GONG),
  ],
  reinforcements: [
    { turn: 4, entries: [
      { unit: mobUnit('c5', '并州骑兵', 'cavalry', 'enemy', { x: 17, y: 5 }, BINGZHOU), at: { x: 17, y: 5 } },
      { unit: mobUnit('c6', '并州骑兵', 'cavalry', 'enemy', { x: 17, y: 6 }, BINGZHOU), at: { x: 17, y: 6 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 6, y: 9 }, itemId: 'jinchuang_yao', found: false },
    { cell: { x: 15, y: 10 }, itemId: 'iron_armor', found: false },
  ],
  drops: [
    { unitId: 'lvbu', itemId: 'fangtian_ji' },
    { unitId: 'lvbu', itemId: 'chitu_horse' },
  ],
  dialogues: [
    { turn: 2, dialogueId: 'hl_sanying' },
    { onDeathOf: 'lvbu', dialogueId: 'hl_lvbu_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'killCommander', unitId: 'lvbu' },
  maxTurns: 20,
}

export type { DialogueLine }

export const hulaoDialogues: Record<string, DialogueLine[]> = {
  hl_start: [
    { speaker: '曹操', text: '虎牢关乃洛阳门户，吕布虽勇，联军势大，诸位勉力！' },
    { speaker: '典韦', text: '主公放心，吕布再猛，也得先过俺这对铁戟！' },
    { speaker: '刘备', text: '玄德愿与孟德同进，共讨国贼。' },
  ],
  hl_sanying: [
    { speaker: '吕布', text: '燕人张飞！环眼贼也敢挡我？' },
    { speaker: '张飞', text: '三姓家奴休走！燕人张飞在此！' },
    { speaker: '关羽', text: '三弟少歇，待某来会他！' },
    { speaker: '刘备', text: '二弟三弟莫要恋战，双剑齐上，拖住他便好。' },
  ],
  hl_lvbu_down: [
    { speaker: '吕布', text: '大耳儿！最是叵测……居然……是你们赢了……' },
    { speaker: '张飞', text: '哈哈哈！人中吕布，也不过如此！' },
    { speaker: '曹操', text: '虎牢已破，洛阳在望。传令：追逐残敌，抢占关城！' },
  ],
}
```

`src/data/battles/index.ts` 三张表分别补：`import { hulao, hulaoDialogues } from './hulao'`；battles 加 `[hulao.id]: hulao`；battleOpeners 加 `hulao: 'hl_start'`；battleDialogues 加 `hulao: hulaoDialogues`。

**数值标定说明**：Task 11 的自动对局测试是数值锁。若 `sishui`/`hulao` 自动对局不能胜，按以下顺序下调敌方数值直至通过：先降杂兵 `atk`（-1 一档），再降主将 hp（-6 一档），最后降 `level`；**不许**改我方/友军数值来凑。

- [ ] **Step 4: 运行测试通过**

Run: `npx vitest run tests/data/hulao.test.ts tests/data/sishui.test.ts 2>&1 | tail -25`
Expected: PASS（虎牢关自动对局在 Task 11 验证）

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/hulao.ts src/data/battles/index.ts tests/data/hulao.test.ts
git commit -m "feat: 虎牢关之战（吕布 + 三英战吕布 + 画戟赤兔掉落）"
```

---

### Task 10: orchestrator 注入战役定义 + ally 回合分支测试

M2 终审登记项「orchestrator endTurn 的 ally 阵营分支无测试」在此清偿。

**Files:**
- Modify: `src/game/orchestrator.ts`（构造器加可选 def 参数）
- Test: `tests/game/orchestrator.test.ts`（追加）

- [ ] **Step 1: 追加失败测试**

```ts
describe('def 注入与 ally 分支', () => {
  it('构造器接受注入定义（整备后的 deploy 产物直接开局）', () => {
    const def = { ...battles.yingchuan, name: '颍川(整备)' }
    const orch = new BattleOrchestrator('yingchuan', 42, noopCb, gameData, def)
    expect(orch.state.battleId).toBe('yingchuan')
  })
  it('endTurn 推进 ally 阵营 AI 行动并轮回 player', () => {
    const st: string[] = []
    const cb: OrchestratorCallbacks = {
      onState: (s) => { st.push(s.factionOrder[s.factionIndex]) },
      onEvents: () => {}, onError: (e) => { errors.push(e) },
    }
    const errors: EngineError[] = []
    const orch = new BattleOrchestrator('sishui', 42, cb, gameData)
    orch.dispatch({ type: 'endTurn' })
    // 一次 endTurn：ally 批 → enemy 批 → 停回 player（或已终局）
    expect(st[st.length - 1]).toBe('player')
    expect(errors).toEqual([]) // ally AI 的指令全部被引擎接受
  })
})
```

（文件顶部按需补 import：`battles`、`EngineError`、`OrchestratorCallbacks`；`noopCb` 用文件里现成的空回调或 `{ onState: () => {}, onEvents: () => {}, onError: () => {} }`。）

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/game/orchestrator.test.ts 2>&1 | tail -25`
Expected: FAIL（构造器第 5 参数类型错）

- [ ] **Step 3: 实现（orchestrator.ts 构造器）**

```ts
  constructor(
    battleId: string, seed: number, private cb: OrchestratorCallbacks,
    private data: GameData = gameData, defOverride?: BattleDef,
  ) {
    const def = defOverride ?? battles[battleId]
    if (!def) throw new Error(`未知战役: ${battleId}`)
    assertBattleValid(def, battleId, this.data)
    this.st = initBattle(def, seed)
    const opener = battleOpeners[battleId]
    if (opener) this.ui.dialogueQueue.push(opener)
    this.emit([{ type: 'battleStarted', battleId }])
  }
```

（`import type { BattleDef }` 补进类型 import 行；其余逻辑零改动——注入定义同样过校验。）

- [ ] **Step 4: 运行测试通过 + 全量回归**

Run: `npx vitest run tests/game/orchestrator.test.ts 2>&1 | tail -25 && npm test 2>&1 | tail -8`
Expected: PASS / 全绿

- [ ] **Step 5: 提交**

```bash
git add src/game/orchestrator.ts tests/game/orchestrator.test.ts
git commit -m "feat: 编排器支持注入战役定义并补 ally 回合分支测试"
```

---

### Task 11: 全战役自动对局集成测试（campaign 闭环 + 存档往返）

**Files:**
- Create: `tests/integration/helpers.ts`（def 版 autoPlay，供复用）
- Create: `tests/integration/campaign-loop.test.ts`

注意：`tests/integration/playthrough.test.ts`（M2 资产）**保持原样不动**，它继续做颍川回归锁。

- [ ] **Step 1: 实现 helper（def 驱动，模式照抄 playthrough 的 autoPlay）**

`tests/integration/helpers.ts`：

```ts
import type { BattleDef, BattleState, GameEvent } from '../../src/engine/types'
import { apply } from '../../src/engine'
import { gameData } from '../../src/data'
import { initBattle } from '../../src/engine'
import { runFactionTurn } from '../../src/game/aiRunner'

const factionOf = (s: BattleState) => s.factionOrder[s.factionIndex]

/** 指定战役定义的双阵营全 AI 自动对局（campaign 集成测试用）。 */
export function autoPlayDef(def: BattleDef, seed: number): { errors: string[]; finished: BattleState['finished']; turn: number; state: BattleState } {
  let s = initBattle(def, seed)
  const errors: string[] = []
  for (let guard = 0; guard < 500 && s.finished === null; guard++) {
    const f = factionOf(s)
    const r = runFactionTurn(s, f, gameData)
    s = r.state
    for (const e of r.errors) errors.push(`t${s.turn} ${f}: ${JSON.stringify(e)}`)
    if (s.finished === null) {
      const r = apply(s, { type: 'endTurn' }, gameData)
      if (!r.ok) { errors.push(`endTurn: ${JSON.stringify(r.error)}`); break }
      s = r.state
    }
  }
  return { errors, finished: s.finished, turn: s.turn, state: s }
}
```

- [ ] **Step 2: 写测试**

`tests/integration/campaign-loop.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import {
  CAMPAIGN_BATTLES, newGame, currentBattleId, deployBattle, settleBattle,
} from '../../src/game/campaign'
import { saveSlot, loadSlot } from '../../src/game/saves'
import type { Storage } from '../../src/game/saves'
import { autoPlayDef } from './helpers'

function fakeStorage(): Storage {
  const dump = new Map<string, string>()
  return {
    getItem: (k) => dump.get(k) ?? null,
    setItem: (k, v) => void dump.set(k, v),
    removeItem: (k) => void dump.delete(k),
  }
}

describe('战役闭环：新游戏 → 三连战 → 通关', () => {
  it('seed 42 全流程：零错误、全胜、进度推进、存档往返', () => {
    let c = newGame()
    const st = fakeStorage()
    for (const id of CAMPAIGN_BATTLES) {
      const def = deployBattle(battles[id]!, c, gameData)
      expect(() => assertBattleValid(def, id, gameData)).not.toThrow()
      const r = autoPlayDef(def, 42)
      expect(r.errors, id).toEqual([])
      expect(r.finished, id).toBe('won')
      const s = settleBattle(c, def, r.state, gameData)
      expect(s.report.won, id).toBe(true)
      c = s.campaign
      saveSlot(st, 'auto', c, 1) // 每战开始/结束都会写 auto（此处验证可写可读）
    }
    expect(currentBattleId(c)).toBeNull()
    const restored = loadSlot(st, 'auto', gameData)
    expect(restored).toEqual(c)
    // 通关后名册成长过（等级高于初始）
    expect(c.roster.every((m) => m.level >= 1)).toBe(true)
    expect(c.roster.some((m) => m.heroId === 'caohong')).toBe(true) // 汜水关入册
    expect(c.roster.some((m) => m.heroId === 'dianwei')).toBe(true) // 虎牢关入册
  })
  it('战败不推进：败北后进度停在原战场', () => {
    const c = newGame()
    const def = deployBattle(battles.yingchuan!, c, gameData)
    // 构造必败终局：我方全灭
    const s0 = autoPlayDef(def, 42)
    const lost = { ...s0.state, finished: 'lost' as const }
    const s = settleBattle(c, def, lost, gameData)
    expect(s.campaign.progress).toBe(0)
    expect(currentBattleId(s.campaign)).toBe('yingchuan')
  })
})

describe('新战役自动对局（多 seed 零错误且可胜）', () => {
  for (const id of ['sishui', 'hulao']) {
    it(`${id}: seeds [1,7,42,2026] 全部零错误且 won`, () => {
      for (const seed of [1, 7, 42, 2026]) {
        const r = autoPlayDef(battles[id]!, seed)
        expect(r.errors, `${id} seed ${seed}`).toEqual([])
        expect(r.finished, `${id} seed ${seed}`).toBe('won')
        expect(r.turn).toBeLessThanOrEqual(battles[id]!.maxTurns)
      }
    })
  }
})
```

- [ ] **Step 3: 运行（数值标定循环）**

Run: `npx vitest run tests/integration/campaign-loop.test.ts 2>&1 | tail -30`

若 `sishui`/`hulao` 无法 `won`：按 Task 9 的标定顺序下调敌方数值（先杂兵 atk -1，再主将 hp -6，最后 level -1），改完重跑；**测试通过即标定锁死**。若出现非数值类错误（AI/引擎报错），停下来按 BLOCKED 上报，不要硬改测试。

Expected: 全部 PASS

- [ ] **Step 4: 全量回归 + 类型门**

Run: `npm test 2>&1 | tail -8 && npm run build 2>&1 | tail -8`
Expected: 全绿 / build 成功

- [ ] **Step 5: 提交**

```bash
git add tests/integration/helpers.ts tests/integration/campaign-loop.test.ts src/data/battles
git commit -m "test: 三战役闭环自动对局与存档往返（数值标定锁）"
```

---

### Task 12: BattleScreen 接线（注入定义 / finished 事件 / 结算按钮语义）

**Files:**
- Modify: `src/ui/screens/BattleScreen.vue`
- Modify: `src/ui/components/ResultBanner.vue`（按钮文案可配置）

**无组件测试（UI 策略）；验收 = vue-tsc 通过 + 既有颍川玩法不回归（App 未改前按旧路径手测一次）。**

- [ ] **Step 1: BattleScreen props/emits 扩展**

script 段：

```ts
import type { BattleDef, BattleState, Cell, EngineError, Faction, GameEvent } from '../../engine/types'
// （原 import type 行里加 BattleDef）

const props = defineProps<{ battleId: string; def?: BattleDef }>()
const emit = defineEmits<{ (e: 'exit'): void; (e: 'finished', finalState: BattleState): void }>()
```

`setupOrchestrator()` 改为：

```ts
function setupOrchestrator(): void {
  orch = new BattleOrchestrator(props.battleId, Date.now() % 2147483647, {
    onState: onOrchState,
    onEvents: onOrchEvents,
    onError: onOrchError,
  }, gameData, props.def)
}
```

结算确认：

```ts
/** 结算横幅主按钮：胜=上报终局（App 结算）；败=原地重开。 */
function onBannerConfirm(): void {
  if (result.value?.won && state.value) emit('finished', state.value)
  else restart()
}
```

template 段 ResultBanner 改为：

```vue
      <ResultBanner
        v-if="result"
        :won="result.won" :turn="result.turn" :rewards="[]"
        :confirm-label="result.won ? '查看战果' : '重新挑战'" exit-label="返回进度"
        @restart="onBannerConfirm" @exit="$emit('exit')"
      />
```

- [ ] **Step 2: ResultBanner 文案参数化**

script 段：

```ts
interface Props { won: boolean; turn: number; rewards?: string[]; confirmLabel?: string; exitLabel?: string }
withDefaults(defineProps<Props>(), { rewards: () => [], confirmLabel: '重新开始', exitLabel: '返回标题' })
```

template 按钮：

```vue
      <button @click="$emit('restart')">{{ confirmLabel }}</button>
      <button @click="$emit('exit')">{{ exitLabel }}</button>
```

- [ ] **Step 3: 类型门 + 手测**

Run: `npm run build 2>&1 | tail -10`
然后 `npm run dev` 手测颍川（开局/移动/攻击/结束回合/终局横幅按钮文案），退出即止。
Expected: build 成功；玩法与 M2 一致

- [ ] **Step 4: 提交**

```bash
git add src/ui/screens/BattleScreen.vue src/ui/components/ResultBanner.vue
git commit -m "feat: 战场屏支持注入定义与终局上报"
```

---

### Task 13: ProgressScreen（战役时间轴 + 存档管理）

**Files:**
- Create: `src/ui/screens/ProgressScreen.vue`

**UI 结构**：左侧战役时间轴（已胜/当前/未至 + 通关态），右侧存档面板（自动档只读状态、3 个手动档 保存/读取、导出/导入）。

- [ ] **Step 1: 实现组件（完整代码）**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CampaignState } from '../../game/campaign'
import { CAMPAIGN_BATTLES, currentBattleId } from '../../game/campaign'
import { battles } from '../../data/battles'
import { gameData } from '../../data'
import { saveSlot, loadSlot, slotInfo, serialize, deserialize, localStorageAdapter, type SlotKey } from '../../game/saves'

const props = defineProps<{ campaign: CampaignState }>()
const emit = defineEmits<{ (e: 'prep'): void; (e: 'loaded', c: CampaignState): void; (e: 'toTitle'): void }>()

const manualSlots: SlotKey[] = ['1', '2', '3']
const notice = ref<string | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)

const current = computed(() => currentBattleId(props.campaign))
const cleared = computed(() => props.campaign.progress)
const rows = computed(() => CAMPAIGN_BATTLES.map((id, i) => ({
  id, name: battles[id]?.name ?? id,
  state: i < cleared.value ? 'cleared' : i === cleared.value ? 'current' : 'locked',
})))

function infoOf(slot: SlotKey) { return slotInfo(localStorageAdapter, slot, gameData) }
function fmt(t: number | null) { return t === null ? '—' : new Date(t).toLocaleString() }

function save(slot: SlotKey): void {
  saveSlot(localStorageAdapter, slot, props.campaign)
  notice.value = `已保存到档位 ${slot}`
}
function load(slot: SlotKey): void {
  const c = loadSlot(localStorageAdapter, slot, gameData)
  if (!c) { notice.value = `档位 ${slot} 无可用存档`; return }
  emit('loaded', c)
}
function exportSave(): void {
  const blob = new Blob([serialize(props.campaign)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'caocaozhuan-save.json'
  a.click()
  URL.revokeObjectURL(url)
}
function onImportFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const c = deserialize(String(reader.result), gameData)
    if (!c) { notice.value = '导入失败：文件不是有效的存档'; return }
    emit('loaded', c)
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="progress-screen">
    <header>
      <h1>战役进度</h1>
      <span class="hint">已通关 {{ cleared }} / {{ CAMPAIGN_BATTLES.length }}</span>
    </header>
    <main>
      <section class="timeline">
        <div v-if="!current" class="allclear">
          <h2>第三章完 · 三战皆捷</h2>
          <p>孟德之名，自此威震诸侯。（后续章节开发中）</p>
        </div>
        <ul>
          <li v-for="r in rows" :key="r.id" :class="r.state">
            <span class="mark">{{ r.state === 'cleared' ? '✔' : r.state === 'current' ? '▶' : '·' }}</span>
            <span class="name">{{ r.name }}</span>
            <span class="tag">{{ r.state === 'cleared' ? '已胜' : r.state === 'current' ? '当前' : '未至' }}</span>
          </li>
        </ul>
        <div class="actions">
          <button v-if="current" class="primary" @click="$emit('prep')">进入整备（{{ battles[current]?.name }}）</button>
          <button @click="$emit('toTitle')">返回标题</button>
        </div>
      </section>
      <section class="saves">
        <h3>存档</h3>
        <div class="slot auto">
          <span>自动档</span>
          <span>{{ fmt(infoOf('auto').savedAt) }}</span>
          <span class="tag">{{ infoOf('auto').status === 'ok' ? '正常' : infoOf('auto').status === 'corrupt' ? '已损坏' : '空' }}</span>
        </div>
        <div v-for="s in manualSlots" :key="s" class="slot">
          <span>档位 {{ s }}</span>
          <span>{{ fmt(infoOf(s).savedAt) }}</span>
          <button @click="save(s)">保存</button>
          <button :disabled="infoOf(s).status !== 'ok'" @click="load(s)">读取</button>
        </div>
        <div class="io">
          <button @click="exportSave">导出 JSON</button>
          <button @click="fileEl?.click()">导入 JSON</button>
          <input ref="fileEl" type="file" accept="application/json,.json" hidden @change="onImportFile" />
        </div>
        <p v-if="notice" class="notice">{{ notice }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.progress-screen { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #141210; color: #f0e6c8; }
header { display: flex; align-items: baseline; gap: 16px; padding: 18px 28px; border-bottom: 1px solid #4a4030; }
h1 { font-family: 'Songti SC', serif; letter-spacing: 8px; margin: 0; font-size: 30px; }
.hint { color: #9a8f7a; }
main { flex: 1; display: flex; gap: 28px; padding: 26px 28px; }
.timeline { flex: 1.2; }
.timeline ul { list-style: none; padding: 0; margin: 0 0 22px; display: flex; flex-direction: column; gap: 12px; }
.timeline li { display: flex; align-items: center; gap: 14px; padding: 14px 18px; background: #1c1813; border: 1px solid #4a4030; border-radius: 4px; opacity: 0.55; }
.timeline li.current { opacity: 1; border-color: #d8b86a; }
.timeline li.cleared { opacity: 0.9; }
.mark { width: 20px; color: #d8b86a; }
.name { flex: 1; font-size: 18px; letter-spacing: 3px; }
.tag { color: #9a8f7a; font-size: 13px; }
.allclear { padding: 18px; border: 1px dashed #d8b86a; border-radius: 6px; margin-bottom: 18px; }
.allclear h2 { color: #f0d28a; letter-spacing: 6px; }
.actions { display: flex; gap: 14px; }
button { padding: 8px 22px; background: #2a241c; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; }
button:hover:not(:disabled) { background: #3a3226; }
button:disabled { opacity: 0.4; cursor: default; }
.primary { background: #d8b86a; color: #141210; border: none; font-weight: bold; }
.primary:hover { background: #f0d28a; }
.saves { flex: 1; background: #1c1813; border: 1px solid #4a4030; border-radius: 6px; padding: 18px 20px; align-self: flex-start; }
.saves h3 { letter-spacing: 4px; margin: 0 0 14px; color: #d8b86a; }
.slot { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #3a3226; font-size: 14px; }
.slot > span:first-child { width: 64px; }
.slot > span:nth-child(2) { flex: 1; color: #9a8f7a; font-size: 12px; }
.slot button { padding: 4px 12px; font-size: 12px; }
.io { display: flex; gap: 10px; margin-top: 14px; }
.notice { color: #f0d28a; font-size: 13px; }
</style>
```

- [ ] **Step 2: 类型门**

Run: `npm run build 2>&1 | tail -10`
Expected: 成功（组件暂未被引用，vue-tsc 仍会检查 SFC）

- [ ] **Step 3: 提交**

```bash
git add src/ui/screens/ProgressScreen.vue
git commit -m "feat: 战役进度屏（时间轴 + 存档管理）"
```

---

### Task 14: PrepScreen（整备：装备三槽 / 道具携带 / 出战）

**Files:**
- Create: `src/ui/screens/PrepScreen.vue`

**交互**：左列名册（点击选中）；右侧详情 = 属性 + 三槽位（当前装备/卸下/可装清单）+ 携带消耗品（取回/分配）；底部仓库与出战按钮。所有操作走 `src/game/campaign.ts` 纯函数（错误信息直接 toast 展示）。

- [ ] **Step 1: 实现组件（完整代码）**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CampaignState, RosterMember } from '../../game/campaign'
import { equipItem, unequipItem, assignItem, unassignItem } from '../../game/campaign'
import { battles } from '../../data/battles'
import { gameData } from '../../data'
import type { ItemSlot } from '../../engine/types'

const props = defineProps<{ campaign: CampaignState; battleId: string }>()
const emit = defineEmits<{ (e: 'start', c: CampaignState): void; (e: 'back'): void }>()

/** 工作副本：整备中的所有改动先落在这里，出战才上交。 */
const work = ref<CampaignState>(structuredClone(toRaw(props.campaign)))
const selectedId = ref<string>(work.value.roster[0]?.heroId ?? '')
const notice = ref<string | null>(null)

import { toRaw } from 'vue' // 与顶部 vue import 合并为：import { computed, ref, toRaw } from 'vue'

const selected = computed<RosterMember | null>(() =>
  work.value.roster.find((m) => m.heroId === selectedId.value) ?? null)
const def = computed(() => battles[props.battleId])
/** 本关新参战：战役定义里有、名册里没有的武将（结算后自动入册）。 */
const newcomers = computed(() => {
  const d = def.value
  if (!d) return []
  return d.units
    .filter((u) => u.faction === 'player' && u.heroId !== '' && !work.value.roster.some((m) => m.heroId === u.heroId))
    .map((u) => gameData.heroes[u.heroId]?.name ?? u.heroId)
})

const SLOT_LABELS: Record<ItemSlot, string> = { weapon: '武器', armor: '防具', accessory: '辅助' }

function itemName(id: string): string { return gameData.items[id]?.name ?? id }
function heroClass(m: RosterMember): string { return gameData.classes[gameData.heroes[m.heroId]!.classId].name }

function applyOp(r: { ok: true; campaign: CampaignState } | { ok: false; error: string }): void {
  if (r.ok) work.value = r.campaign
  else notice.value = r.error
}

function equip(m: RosterMember, slot: ItemSlot, itemId: string): void {
  applyOp(equipItem(work.value, m.heroId, slot, itemId, gameData))
}
function unequip(m: RosterMember, slot: ItemSlot): void {
  applyOp(unequipItem(work.value, m.heroId, slot, gameData))
}
function assign(m: RosterMember, itemId: string): void {
  applyOp(assignItem(work.value, m.heroId, itemId, gameData))
}
function unassign(m: RosterMember, itemId: string): void {
  applyOp(unassignItem(work.value, m.heroId, itemId, gameData))
}
/** 某槽位的可装清单：仓库内 kind 匹配且兵种允许。 */
function candidates(m: RosterMember, slot: ItemSlot): string[] {
  const hero = gameData.heroes[m.heroId]!
  return work.value.inventory.filter((id) => {
    const it = gameData.items[id]
    return it && it.kind === slot && (!it.allowedClasses || it.allowedClasses.includes(hero.classId))
  })
}
const consumablesInInventory = computed(() => work.value.inventory
  .filter((id) => gameData.items[id]?.kind === 'consumable'))
</script>

<template>
  <div class="prep-screen">
    <header>
      <h1>战前整备</h1>
      <span class="hint">{{ def?.name }} · 请检视军备</span>
      <span v-if="newcomers.length" class="join">本关新参战：{{ newcomers.join('、') }}（战后入册）</span>
    </header>
    <main>
      <aside class="roster">
        <button
          v-for="m in work.roster" :key="m.heroId"
          :class="{ active: m.heroId === selectedId }"
          @click="selectedId = m.heroId"
        >
          <b>{{ gameData.heroes[m.heroId]?.name }}</b>
          <span>{{ heroClass(m) }} Lv{{ m.level }} · 经验 {{ m.exp }}/100</span>
        </button>
      </aside>
      <section v-if="selected" class="detail">
        <div class="slots">
          <div v-for="slot in (['weapon', 'armor', 'accessory'] as ItemSlot[])" :key="slot" class="slot">
            <div class="slot-head">
              <span>{{ SLOT_LABELS[slot] }}</span>
              <template v-if="selected.equipment[slot]">
                <b>{{ itemName(selected.equipment[slot]!) }}</b>
                <button @click="unequip(selected, slot)">卸下</button>
              </template>
              <i v-else>（空）</i>
            </div>
            <ul>
              <li v-for="id in candidates(selected, slot)" :key="id">
                <span>{{ itemName(id) }} <small>{{ gameData.items[id]!.desc }}</small></span>
                <button @click="equip(selected, slot, id)">装备</button>
              </li>
            </ul>
          </div>
        </div>
        <div class="items">
          <h4>携带道具（战场中可用）</h4>
          <ul>
            <li v-for="id in selected.items" :key="id">
              <span>{{ itemName(id) }}</span>
              <button @click="unassign(selected, id)">取回</button>
            </li>
            <li v-if="!selected.items.length" class="none">（未携带）</li>
          </ul>
          <h4>仓库消耗品 → 分配给此人</h4>
          <ul>
            <li v-for="id in consumablesInInventory" :key="id">
              <span>{{ itemName(id) }}</span>
              <button @click="assign(selected, id)">分配</button>
            </li>
          </ul>
        </div>
      </section>
    </main>
    <footer>
      <span class="notice">{{ notice }}</span>
      <span class="flex" />
      <button @click="$emit('back')">返回进度</button>
      <button class="primary" @click="$emit('start', work)">出征！</button>
    </footer>
  </div>
</template>

<style scoped>
.prep-screen { width: 100vw; height: 100vh; display: flex; flex-direction: column; background: #141210; color: #f0e6c8; }
header { display: flex; align-items: baseline; gap: 16px; padding: 14px 28px; border-bottom: 1px solid #4a4030; }
h1 { font-family: 'Songti SC', serif; letter-spacing: 8px; margin: 0; font-size: 26px; }
.hint { color: #9a8f7a; }
.join { color: #f0d28a; font-size: 13px; margin-left: auto; }
main { flex: 1; display: flex; gap: 22px; padding: 20px 28px; min-height: 0; }
.roster { width: 240px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.roster button { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; padding: 10px 14px; background: #1c1813; border: 1px solid #4a4030; border-radius: 4px; color: #f0e6c8; cursor: pointer; text-align: left; }
.roster button.active { border-color: #d8b86a; background: #2a241c; }
.roster button span { font-size: 12px; color: #9a8f7a; }
.detail { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; }
.slot { background: #1c1813; border: 1px solid #4a4030; border-radius: 4px; padding: 10px 14px; }
.slot-head { display: flex; align-items: center; gap: 12px; }
.slot-head > span:first-child { width: 48px; color: #d8b86a; }
.slot-head i { color: #6a5c40; }
.slot ul { list-style: none; padding: 0; margin: 8px 0 0; }
.slot li { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-top: 1px dashed #3a3226; font-size: 14px; }
.slot li small { color: #9a8f7a; margin-left: 8px; }
.items { background: #1c1813; border: 1px solid #4a4030; border-radius: 4px; padding: 10px 14px; }
.items h4 { margin: 8px 0 4px; color: #d8b86a; letter-spacing: 2px; }
.items ul { list-style: none; padding: 0; margin: 0; }
.items li { display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px dashed #3a3226; font-size: 14px; }
.items .none { color: #6a5c40; }
button { padding: 4px 12px; background: #2a241c; border: 1px solid #6a5c40; border-radius: 3px; color: #f0e6c8; cursor: pointer; font-size: 13px; }
footer { display: flex; align-items: center; gap: 14px; padding: 14px 28px; border-top: 1px solid #4a4030; }
footer .flex { flex: 1; }
.primary { background: #d8b86a; color: #141210; border: none; font-weight: bold; padding: 8px 28px; }
.notice { color: #f0d28a; font-size: 13px; }
</style>
```

**注意**：`import { toRaw } from 'vue'` 必须与顶部合并成一行 `import { computed, ref, toRaw } from 'vue'`（上面代码块中的独立 import 行是说明性注释，实现时不得保留两行 vue import）。

- [ ] **Step 2: 类型门**

Run: `npm run build 2>&1 | tail -10`
Expected: 成功

- [ ] **Step 3: 提交**

```bash
git add src/ui/screens/PrepScreen.vue
git commit -m "feat: 战前整备屏（装备三槽/道具携带/出战）"
```

---

### Task 15: SettleScreen（战后结算报告）+ DialogueBox 键盘推进

**Files:**
- Create: `src/ui/screens/SettleScreen.vue`
- Modify: `src/ui/components/DialogueBox.vue`（Enter/空格推进——M2 已知限制清偿）

- [ ] **Step 1: 实现 SettleScreen（完整代码）**

```vue
<script setup lang="ts">
import type { SettleReport } from '../../game/campaign'
import { gameData } from '../../data'

defineProps<{ report: SettleReport }>()
defineEmits<{ (e: 'continue'): void }>()

const itemName = (id: string) => gameData.items[id]?.name ?? id
</script>

<template>
  <div class="settle-screen">
    <div class="panel">
      <h1 :class="report.won ? 'win' : 'lose'">{{ report.won ? '战 果 结 算' : '败 北' }}</h1>
      <p v-if="!report.won" class="lose-hint">胜败乃兵家常事。整备之后，再来一战。</p>
      <table v-if="report.heroes.length">
        <thead>
          <tr><th>武将</th><th>等级</th><th>经验</th></tr>
        </thead>
        <tbody>
          <tr v-for="h in report.heroes" :key="h.heroId">
            <td>{{ h.name }}</td>
            <td>{{ h.toLevel }}<template v-if="h.levelsGained > 0">（升 {{ h.levelsGained }} 级）</template></td>
            <td>+{{ h.expGained }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="report.gained.length" class="gained">
        <h3>缴获 / 拾获</h3>
        <ul>
          <li v-for="(id, i) in report.gained" :key="`${i}-${id}`">{{ itemName(id) }}<small> 入库</small></li>
        </ul>
      </div>
      <button class="primary" @click="$emit('continue')">返回进度</button>
    </div>
  </div>
</template>

<style scoped>
.settle-screen { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: rgba(10, 8, 6, 0.94); color: #f0e6c8; }
.panel { width: min(560px, 92%); background: #1c1813; border: 1px solid #6a5c40; border-radius: 8px; padding: 28px 34px; display: flex; flex-direction: column; gap: 18px; }
h1 { font-family: 'Songti SC', serif; letter-spacing: 12px; margin: 0; text-align: center; }
h1.win { color: #f0d28a; }
h1.lose { color: #a05a40; }
.lose-hint { text-align: center; color: #9a8f7a; margin: 0; }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th { text-align: left; color: #d8b86a; font-weight: normal; letter-spacing: 2px; padding: 6px 8px; border-bottom: 1px solid #4a4030; }
td { padding: 7px 8px; border-bottom: 1px dashed #3a3226; }
.gained h3 { margin: 0 0 6px; color: #d8b86a; letter-spacing: 2px; font-size: 15px; }
.gained ul { list-style: none; padding: 0; margin: 0; }
.gained li { padding: 4px 0; }
.gained small { color: #9a8f7a; }
.primary { align-self: center; padding: 9px 34px; background: #d8b86a; color: #141210; border: none; border-radius: 3px; font-weight: bold; cursor: pointer; letter-spacing: 4px; }
</style>
```

- [ ] **Step 2: DialogueBox 键盘推进**

script 段（`onBeforeUnmount` 已有，扩展之；`advance` 已有直接复用）：

```ts
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    advance()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { clearInterval(timer); window.removeEventListener('keydown', onKey) })
```

（顶部 vue import 补 `onMounted`。）

- [ ] **Step 3: 类型门**

Run: `npm run build 2>&1 | tail -10`
Expected: 成功

- [ ] **Step 4: 提交**

```bash
git add src/ui/screens/SettleScreen.vue src/ui/components/DialogueBox.vue
git commit -m "feat: 战后结算屏与对话键盘推进"
```

---

### Task 16: App 流程机组装（标题 → 进度 → 整备 → 战斗 → 结算 → 进度）

**Files:**
- Modify: `src/App.vue`（全量替换）

- [ ] **Step 1: 实现（完整代码）**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BattleDef, BattleState } from './engine/types'
import { gameData } from './data'
import { battles } from './data/battles'
import type { CampaignState, SettleReport } from './game/campaign'
import { newGame, currentBattleId, deployBattle, settleBattle } from './game/campaign'
import { saveSlot, loadSlot, slotInfo, localStorageAdapter } from './game/saves'
import BattleScreen from './ui/screens/BattleScreen.vue'
import ProgressScreen from './ui/screens/ProgressScreen.vue'
import PrepScreen from './ui/screens/PrepScreen.vue'
import SettleScreen from './ui/screens/SettleScreen.vue'

type Screen = 'title' | 'progress' | 'prep' | 'battle' | 'settle'

const screen = ref<Screen>('title')
const campaign = ref<CampaignState | null>(null)
const battleDef = ref<BattleDef | null>(null)
const settleReport = ref<SettleReport | null>(null)
const attempt = ref(0) // 重开计数：BattleScreen 的 key，强制重建

const hasAutoSave = computed(() => slotInfo(localStorageAdapter, 'auto', gameData).status === 'ok')
const currentBattle = computed(() => (campaign.value ? currentBattleId(campaign.value) : null))

function startNew(): void {
  campaign.value = newGame()
  screen.value = 'progress'
}
function continueCampaign(): void {
  const c = loadSlot(localStorageAdapter, 'auto', gameData)
  if (!c) return
  campaign.value = c
  screen.value = 'progress'
}
/** 整备完成出征：注入定义 + 自动档落盘 + 进入战斗。 */
function onStartBattle(c: CampaignState): void {
  if (!currentBattle.value) return
  campaign.value = c
  battleDef.value = deployBattle(battles[currentBattle.value]!, c, gameData)
  saveSlot(localStorageAdapter, 'auto', c)
  attempt.value += 1
  screen.value = 'battle'
}
/** 战斗终局上报：结算 → 更新进度 → 自动档落盘 → 结算屏。 */
function onBattleFinished(finalState: BattleState): void {
  if (!campaign.value || !battleDef.value) return
  const r = settleBattle(campaign.value, battleDef.value, finalState, gameData)
  campaign.value = r.campaign
  settleReport.value = r.report
  saveSlot(localStorageAdapter, 'auto', r.campaign)
  screen.value = 'settle'
}
</script>

<template>
  <div v-if="screen === 'title'" class="title-screen">
    <h1>三国志 · 曹操传</h1>
    <p class="sub">Web 复刻 · 核心可玩版</p>
    <div class="btns">
      <button class="start" @click="startNew">新的征程</button>
      <button class="start" :disabled="!hasAutoSave" @click="continueCampaign">继续征程</button>
    </div>
  </div>
  <ProgressScreen
    v-else-if="screen === 'progress' && campaign"
    :campaign="campaign"
    @prep="screen = 'prep'"
    @loaded="(c: CampaignState) => { campaign = c }"
    @to-title="screen = 'title'"
  />
  <PrepScreen
    v-else-if="screen === 'prep' && campaign && currentBattle"
    :campaign="campaign" :battle-id="currentBattle"
    @start="onStartBattle" @back="screen = 'progress'"
  />
  <BattleScreen
    v-else-if="screen === 'battle' && currentBattle"
    :key="`${currentBattle}-${attempt}`"
    :battle-id="currentBattle" :def="battleDef ?? undefined"
    @exit="screen = 'progress'"
    @finished="onBattleFinished"
  />
  <SettleScreen
    v-else-if="screen === 'settle' && settleReport"
    :report="settleReport"
    @continue="screen = 'progress'"
  />
</template>

<style scoped>
.title-screen {
  width: 100vw; height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 18px;
  background: radial-gradient(ellipse at center, #2a241c 0%, #141210 75%);
  color: #f0e6c8;
}
h1 { font-family: 'Songti SC', serif; font-size: 52px; letter-spacing: 14px; margin: 0; }
.sub { color: #9a8f7a; letter-spacing: 4px; margin: 0; }
.btns { margin-top: 24px; display: flex; gap: 18px; }
.start {
  padding: 12px 44px; font-size: 18px; letter-spacing: 6px;
  color: #141210; background: #d8b86a; border: none; border-radius: 4px; cursor: pointer;
}
.start:hover:not(:disabled) { background: #f0d28a; }
.start:disabled { opacity: 0.4; cursor: default; }
</style>
```

（注意 `main.ts` 与路由无改动——项目无 vue-router，App 即全部。）

- [ ] **Step 2: 类型门 + 全量测试**

Run: `npm run build 2>&1 | tail -10 && npm test 2>&1 | tail -8`
Expected: build 成功 / 全绿

- [ ] **Step 3: 提交**

```bash
git add src/App.vue
git commit -m "feat: 全游戏流程机（标题/进度/整备/战斗/结算 + 自动存档）"
```

---

### Task 17: 文档收尾（README + 人工验收清单）

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/manual-checks-m3.md`

- [ ] **Step 1: README 更新**

`## 架构` 列表在 `src/game/` 条目后补一条、`玩法操作` 全量替换、里程碑勾 3：

架构补：

```markdown
- `src/game/` — 编排层：视图模型查询、AI 阵营批执行、BattleOrchestrator（意图→指令）、loadBattle 加载期校验、
  campaign 战役进度（roster 持久化/deploy/settle）、saves 存档槽
```

（替换原 `src/game/` 那一行。）

玩法操作全量替换为：

```markdown
## 玩法操作（全流程）

1. 标题画面：「新的征程」开新档 / 「继续征程」读自动档
2. 战役进度：查看时间轴；右侧存档面板可保存/读取（3 手动档 + 自动档）、导出/导入 JSON
3. 战前整备：点选武将 → 三槽位装卸装备（兵种限制会拦截）→ 分配/取回消耗品 → 「出征」
4. 战斗：点选蓝色我方单位 → 蓝格移动 → 攻击（红高亮）/ 法术（紫射程 + AoE 预览）/ 道具 / 待机；
   「结束回合」推进友军（绿）与敌方（红）AI 行动；Enter/空格推进对话
5. 战果结算：经验/升级/缴获入库 → 返回进度；战败可从进度重新整备再战
6. 三战（颍川 → 汜水关斩华雄 → 虎牢关破吕布）皆捷即第三章完
```

里程碑：

```markdown
3. [x] 养成闭环（装备/整备/存档）+ 前 3 场战役
```

- [ ] **Step 2: 人工验收清单 `docs/superpowers/manual-checks-m3.md`**

```markdown
# M3 人工验收清单（npm run dev）

> 自动化测试覆盖纯逻辑（引擎/数据/campaign/saves/集成）；以下为 UI 装配层人工验收。
> 每项打勾前须实际操作一遍；发现异常记入「已知限制」。

## 1. 新游戏与进度
- [ ] 标题「新的征程」→ 进度屏显示 3 场战役时间轴，当前=颍川之战
- [ ] 「继续征程」在无存档时置灰；开局出征后回到标题变为可点，可恢复进度

## 2. 整备（PrepScreen）
- [ ] 点选武将出详情；装备三槽显示当前装备
- [ ] 卸下铁剑 → 出现在可装清单；再次装备成功
- [ ] 青釭剑给夏侯惇（骑兵）装 → 拦截并提示兵种不符（先用导出或汜水关掉落凑装备，无则跳过此条并注明）
- [ ] 分配金创药给荀彧 / 取回，仓库数量随之增减
- [ ] 「出征」进入战斗；标题显示战役名

## 3. 汜水关（友军）
- [ ] 开场对话（袁绍/关羽温酒梗）后开局；三阵营 HUD 轮转（我军→友军→敌军）
- [ ] 友军绿色单位由 AI 自动行动，不干扰玩家操控
- [ ] 第 3 回合友军对话触发；击破华雄 → 阵亡对话 → 胜利
- [ ] 结算屏：经验/升级/缴获（铁甲）；返回进度后时间轴颍川✔、汜水当前✔、虎牢当前

## 4. 虎牢关（三英战吕布）
- [ ] 曹洪在汜水关战后入册（整备屏可见）；虎牢关整备显示「本关新参战：典韦」
- [ ] 第 2 回合三英战吕布对话触发；吕布威胁明显（数值体感）
- [ ] 击破吕布 → 方天画戟 + 赤兔马缴获入结算；返回进度显示「第三章完」

## 5. 存档
- [ ] 进度屏手动档 1 保存 → 刷新页面 → 读取档 1 恢复（时间轴/整备一致）
- [ ] 自动档在每次出征与结算后更新时间
- [ ] 导出 JSON → 清空 localStorage（DevTools）→ 导入恢复
- [ ] DevTools 手改档位数据为垃圾 → 该档显示「已损坏」且读取按钮不可点，游戏不崩溃

## 6. 对话与结算交互
- [ ] Enter / 空格推进对话；点击仍有效
- [ ] 胜利横幅主按钮=「查看战果」进结算；战败=「重新挑战」原地重开 + 「返回进度」

## 已知限制
- 整备无装备变更预览（数值变化需进战场看 HUD）
- 战败重打不保留经验（防刷设计，非缺陷）
- M3 敌方无限debuff AI（陈宫类敌军师留 M4）
```

- [ ] **Step 3: 全量验收**

Run: `npm test 2>&1 | tail -8 && npm run build 2>&1 | tail -8`
Expected: 全绿 / 成功

- [ ] **Step 4: 提交**

```bash
git add README.md docs/superpowers/manual-checks-m3.md
git commit -m "docs: M3 玩法说明与人工验收清单"
```

---

## 自审记录（writing-plans Self-Review）

1. **Spec 覆盖**（对照 spec §4.2/§5.1/§6/§9/§10-3）：升级持久化（T5/T6）、装备三槽（T4/T14）、道具携带（T4/T14）、存档 3+1+导入导出（T7/T13）、整备界面（T14）、汜水关（T8）、虎牢关+三英演出（T9）、流程闭环（T16）、金币商店=spec 未含（不做，YAGNI）、善恶抉择=M4（不做）。
2. **延期清单清偿**：hasAlly 三阵营测试（T3）、orchestrator ally 分支（T10）、装备 allowedClasses 校验（T1）、三注册表一致性（T8）、Enter/空格对话（T15）、敌兵数值标定（T8/T9/T11 数值锁）。**继续延期**（登记在册，M4 处理）：敌方 debuff AI、KIND/STATUS_LABELS 收窄、buildViewModel 口径、常量单源、死导出、BattleScreen 假时钟重构、ItemMenu desc、dialogueLines warn。
3. **类型一致性**：`deployBattle(def, c, data)`/`settleBattle(c, def, final, data)` 在 T5/T6/T11/T16 签名一致；`OpResult`、`SettleReport`、`Storage`、`SlotKey` 各任务引用一致；BattleScreen 第 5 参 `defOverride?: BattleDef`（T10 定义、T12 消费）。
4. **占位符扫描**：无 TBD/TODO；T14 的 vue import 合并说明为防错提示而非留白。
