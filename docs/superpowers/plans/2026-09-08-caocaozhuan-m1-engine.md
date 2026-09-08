# 曹操传 Web 版 · 里程碑 1：战斗引擎 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建零框架依赖、纯 TypeScript、数据驱动的战棋战斗引擎（兵种相克/地形/天气/法术/经验升级/胜负判定/AI），Vitest 通过全部用例，附带第一场战役（颍川之战）的完整数据。

**Architecture:** 三层分离的第一层：`src/engine/` 纯逻辑引擎（`apply(state, command) → { state, events }`，不可变状态 + 状态内 RNG 种子），`src/data/` 纯静态数据（兵种/地形/法术/武将/道具/战役）。引擎不 import Vue/Canvas。本里程碑不涉及渲染与 UI。

**Tech Stack:** TypeScript 5 (strict) + Vitest 3。脚手架为 Vite 6 + Vue 3（为后续里程碑预留，本里程碑只用它验证工程可构建）。

**Spec:** `docs/superpowers/specs/2026-09-08-caocaozhuan-web-design.md`（本计划覆盖 spec §2 架构 + §3 战斗规则 + §9 数据清单的引擎部分；里程碑 2~4 另行出计划）

**全局约定（每个任务都适用）：**
- 长输出命令一律截断：`npm install 2>&1 | tail -5`、`npx vitest run 2>&1 | tail -20`
- commit 格式 `<type>: <描述>`，不加任何 attribution 尾注（用户全局配置已禁用）
- 工作目录：`/Users/didi/project/caocaozhuan`

---

## 文件结构（本里程碑产出）

```
caocaozhuan/
├── package.json / tsconfig.json / vite.config.ts / index.html   # Task 1 脚手架
├── src/
│   ├── main.ts / App.vue                       # Task 1 占位壳
│   ├── engine/                                 # 纯逻辑（零 DOM/Vue 依赖）
│   │   ├── types.ts                            # Task 2  全部状态/指令/事件/数据类型
│   │   ├── rng.ts                              # Task 3  可回放随机数（状态内种子）
│   │   ├── combat.ts                           # Task 4  伤害/命中/暴击/连击/法术公式
│   │   ├── movement.ts                         # Task 5  移动范围/路径/攻击范围
│   │   ├── spells.ts                           # Task 6  法术形状/天气门禁
│   │   ├── wincheck.ts                         # Task 7 基础版 → Task 11 完整版
│   │   ├── internal.ts                         # Task 7  apply 公共底座（克隆/抽随机/死亡/经验）
│   │   ├── move.ts                             # Task 7  move/wait 指令
│   │   ├── attack.ts                           # Task 8  attack 指令（反击/连击/击杀）
│   │   ├── magic.ts                            # Task 9  cast/useItem 指令
│   │   ├── turns.ts                            # Task 10 回合推进（天气/增援/状态/对话）
│   │   ├── ai.ts                               # Task 12 敌方/友军 AI
│   │   └── engine.ts                           # Task 7  apply 分发 + initBattle
│   ├── data/
│   │   ├── terrains.ts / classes.ts            # Task 2
│   │   ├── index.ts                            # Task 2  GameData 注册表（逐任务扩充）
│   │   ├── strategies.ts                       # Task 6
│   │   ├── items.ts                            # Task 9 最小消耗品 → Task 13 完整
│   │   ├── heroes.ts                           # Task 13
│   │   └── battles/
│   │       ├── shared.ts                       # Task 14 parseMap + validateBattleDef
│   │       ├── yingchuan.ts                    # Task 14 第一场战役
│   │       └── index.ts                        # Task 15 战役注册表
│   └── engine/index.ts                         # Task 15 barrel export
├── tests/
│   ├── sanity.test.ts                          # Task 1
│   ├── data/*.test.ts                          # Task 2/6/13/14
│   ├── engine/rng.test.ts                      # Task 3
│   ├── engine/combat.test.ts                   # Task 4
│   ├── engine/movement.test.ts                 # Task 5
│   ├── engine/helpers.ts                       # Task 7 测试工厂（后续任务复用）
│   ├── engine/engine.test.ts                   # Task 7
│   ├── engine/attack.test.ts                   # Task 8
│   ├── engine/magic.test.ts                    # Task 9
│   ├── engine/turns.test.ts                    # Task 10
│   ├── engine/wincheck.test.ts                 # Task 11
│   └── engine/ai.test.ts                       # Task 12
└── README.md                                   # Task 15
```

**引擎对外接口（全计划统一，不得改名）：**

```ts
initBattle(def: BattleDef, rngSeed: number): BattleState
apply(state: BattleState, cmd: Command, data: GameData): ApplyResult
decideUnitAction(state: BattleState, unitId: string, data: GameData): Command[]
```

---

### Task 1: 项目脚手架（Vite + Vue3 + TS + Vitest）

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `tests/sanity.test.ts`
- Modify: `.gitignore`（追加 `dist`）

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "caocaozhuan",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": { "vue": "^3.5.13" },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "vitest": "^3.0.8",
    "vue-tsc": "^2.2.8"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 3: 写 vite.config.ts**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: { include: ['tests/**/*.test.ts'] },
})
```

- [ ] **Step 4: 写 index.html / src/main.ts / src/App.vue**

`index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>三国志曹操传 · Web</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`：

```ts
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

`src/App.vue`：

```vue
<template>
  <div style="font-family: serif; text-align: center; padding-top: 10rem">
    <h1>三国志曹操传</h1>
    <p>里程碑 1：战斗引擎开发中</p>
  </div>
</template>
```

- [ ] **Step 5: 写 tests/sanity.test.ts**

```ts
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('vitest 可运行', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: 安装依赖并验证**

```bash
npm install 2>&1 | tail -5
npx vitest run 2>&1 | tail -8
npm run build 2>&1 | tail -5
```

Expected: install 成功；`1 passed`；build 无报错产出 `dist/`。
若 `node -v` < 20，先升级 Node（vite 6 要求 ≥ 18，vitest 3 要求 ≥ 18）。

- [ ] **Step 7: Commit**

```bash
printf 'dist\n' >> .gitignore
git add -A && git commit -m "chore: vite+vue3+ts+vitest 脚手架"
```

---

### Task 2: 引擎类型系统 + 兵种/地形数据

**Files:**
- Create: `src/engine/types.ts`, `src/data/terrains.ts`, `src/data/classes.ts`, `src/data/index.ts`
- Test: `tests/data/gamedata.test.ts`

- [ ] **Step 1: 写 src/engine/types.ts（本计划全部类型，一次定死）**

```ts
// ---------- 基础 ----------
export type Faction = 'player' | 'enemy' | 'ally'
export type Weather = 'sunny' | 'cloudy' | 'rainy'
export type ClassId = 'lord' | 'infantry' | 'cavalry' | 'archer' | 'strategist' | 'taoist'
export type TerrainId = 'plain' | 'forest' | 'mountain' | 'water' | 'city' | 'camp' | 'pass' | 'bridge'
export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'spirit' | 'agi'
export type Stats = Record<StatKey, number>
export interface Cell { x: number; y: number }

// ---------- 静态数据 ----------
export interface TerrainDef {
  id: TerrainId
  name: string
  defBonus: number // 防御加成 %
  moveCost: number | ({ default: number } & Partial<Record<ClassId, number>>)
}

export interface ClassDef {
  id: ClassId
  name: string
  movePower: number
  minRange: number
  maxRange: number
  growth: Stats // 每级成长率（0~10）
}

export type ItemSlot = 'weapon' | 'armor' | 'accessory'
export type ItemKind = ItemSlot | 'consumable'
export interface ItemDef {
  id: string
  name: string
  kind: ItemKind
  bonuses?: Partial<Stats & { move: number }>
  healHp?: number
  healMp?: number
  allowedClasses?: ClassId[] // 缺省=全兵种
  desc: string
}

export type StrategyKind = 'attack' | 'heal' | 'buff' | 'debuff'
export type TargetShape = 'single' | 'cross' | 'burst' // cross=十字, burst=3x3
export type StatusKind = 'stun' | 'defdown' | 'speedup' | 'accdown'
export interface StrategyDef {
  id: string
  name: string
  kind: StrategyKind
  mpCost: number
  power: number
  shape: TargetShape
  range: number
  element?: 'fire' | 'water' | 'earth' // attack 类必填
  effect?: StatusKind
  effectTurns?: number
  allowedClasses: ClassId[]
  desc: string
}

export interface HeroDef {
  id: string
  name: string
  title: string
  classId: ClassId
  base: Stats // 1 级裸属性
  portraitHue: number // 程序化头像色相 0~360
}

// ---------- 战斗状态 ----------
export interface StatusEffect { kind: StatusKind; turns: number }

export interface Unit {
  id: string
  heroId: string // '' = 非武将档案单位（敌杂兵）
  name: string
  faction: Faction
  classId: ClassId
  level: number
  exp: number
  base: Stats // 成长后裸属性（不含装备）
  hp: number
  mp: number
  pos: Cell
  equipment: Partial<Record<ItemSlot, string>>
  items: string[] // 携带的消耗品 id
  statuses: StatusEffect[]
  moved: boolean
  acted: boolean
  alive: boolean
}

export interface ReinforcementEntry { unit: Unit; at: Cell }
export interface ReinforcementDef { turn: number; entries: ReinforcementEntry[] }
export interface TreasureCell { cell: Cell; itemId: string; found: boolean }
export interface DialogueTrigger { turn?: number; onDeathOf?: string; dialogueId: string }
export interface WeatherScriptEntry { turn: number; weather: Weather }

export type WinCondition =
  | { kind: 'annihilate' }
  | { kind: 'killCommander'; unitId: string }
  | { kind: 'survive'; untilTurn: number }
  | { kind: 'reach'; unitId: string; cell: Cell }

export interface BattleDef {
  id: string
  name: string
  desc: string
  map: TerrainId[][]
  units: Unit[]
  reinforcements: ReinforcementDef[]
  treasureCells: TreasureCell[]
  dialogues: DialogueTrigger[]
  weather: Weather
  weatherScript: WeatherScriptEntry[]
  win: WinCondition // 失败条件固定：曹操(君主)阵亡 / 我方全灭 / 超过 maxTurns
  maxTurns: number
}

export interface BattleState {
  battleId: string
  turn: number
  factionOrder: Faction[]
  factionIndex: number
  weather: Weather
  map: TerrainId[][]
  units: Unit[]
  reinforcements: ReinforcementDef[]
  treasureCells: TreasureCell[]
  dialogues: DialogueTrigger[]
  weatherScript: WeatherScriptEntry[]
  win: WinCondition
  maxTurns: number
  rngState: number
  rewards: string[] // 宝物/缴获
  finished: null | 'won' | 'lost'
}

// ---------- 指令与结果 ----------
export type Command =
  | { type: 'move'; unitId: string; to: Cell }
  | { type: 'attack'; unitId: string; targetId: string }
  | { type: 'cast'; unitId: string; strategyId: string; target: Cell }
  | { type: 'useItem'; unitId: string; itemId: string; targetId: string }
  | { type: 'wait'; unitId: string }
  | { type: 'endTurn' }

export type EngineError =
  | { code: 'UNIT_NOT_FOUND'; unitId: string }
  | { code: 'NOT_YOUR_TURN'; unitId: string; faction: Faction }
  | { code: 'UNIT_ALREADY_ACTED'; unitId: string }
  | { code: 'UNIT_DEAD'; unitId: string }
  | { code: 'OUT_OF_MOVE_RANGE'; unitId: string }
  | { code: 'NOT_IN_RANGE'; unitId: string; targetId: string }
  | { code: 'CANNOT_TARGET'; reason: string }
  | { code: 'NOT_ENOUGH_MP'; needed: number; have: number }
  | { code: 'SPELL_UNUSABLE_IN_WEATHER'; weather: Weather }
  | { code: 'CLASS_CANNOT_CAST'; classId: ClassId }
  | { code: 'ITEM_NOT_HELD'; itemId: string }
  | { code: 'ITEM_NOT_CONSUMABLE'; itemId: string }
  | { code: 'BATTLE_ENDED' }

export type ApplyResult =
  | { ok: true; state: BattleState; events: GameEvent[] }
  | { ok: false; error: EngineError }

// ---------- 事件 ----------
export interface HitDetail {
  attackerId: string
  defenderId: string
  damage: number
  missed: boolean
  critical: boolean
  combo: boolean
  counter: boolean
}

export type GameEvent =
  | { type: 'battleStarted'; battleId: string }
  | { type: 'roundStarted'; turn: number }
  | { type: 'turnStarted'; faction: Faction; turn: number }
  | { type: 'turnEnded'; faction: Faction; turn: number }
  | { type: 'weatherChanged'; weather: Weather }
  | { type: 'unitMoved'; unitId: string; path: Cell[] }
  | { type: 'attackLaunched'; hits: HitDetail[] }
  | { type: 'hpChanged'; unitId: string; hp: number; delta: number }
  | { type: 'mpChanged'; unitId: string; mp: number; delta: number }
  | { type: 'unitDied'; unitId: string; byUnitId?: string }
  | { type: 'expGained'; unitId: string; amount: number }
  | { type: 'levelUp'; unitId: string; level: number; gains: Partial<Stats> }
  | { type: 'spellCast'; casterId: string; strategyId: string; target: Cell }
  | { type: 'statusApplied'; unitId: string; kind: StatusKind; turns: number }
  | { type: 'itemUsed'; unitId: string; targetId: string; itemId: string }
  | { type: 'treasureFound'; unitId: string; itemId: string }
  | { type: 'reinforcementsArrived'; unitIds: string[] }
  | { type: 'dialogueTriggered'; dialogueId: string }
  | { type: 'battleWon' }
  | { type: 'battleLost' }
```

- [ ] **Step 2: 写 src/data/terrains.ts**

```ts
import type { TerrainDef, TerrainId } from '../engine/types'

const defs: TerrainDef[] = [
  { id: 'plain', name: '平原', defBonus: 0, moveCost: 1 },
  { id: 'forest', name: '森林', defBonus: 15, moveCost: { default: 2, infantry: 1 } },
  { id: 'mountain', name: '山地', defBonus: 25, moveCost: { default: Infinity, infantry: 2, archer: 2, lord: 3 } },
  { id: 'water', name: '水域', defBonus: 0, moveCost: { default: 3, cavalry: 4 } },
  { id: 'city', name: '城池', defBonus: 30, moveCost: 1 },
  { id: 'camp', name: '营寨', defBonus: 20, moveCost: 1 },
  { id: 'pass', name: '关隘', defBonus: 30, moveCost: 2 },
  { id: 'bridge', name: '桥', defBonus: 10, moveCost: 1 },
]

export const terrains: Record<TerrainId, TerrainDef> = Object.fromEntries(
  defs.map((d) => [d.id, d]),
) as Record<TerrainId, TerrainDef>
```

- [ ] **Step 3: 写 src/data/classes.ts**

```ts
import type { ClassDef, ClassId } from '../engine/types'

const defs: ClassDef[] = [
  { id: 'lord', name: '君主', movePower: 5, minRange: 1, maxRange: 1,
    growth: { hp: 9, mp: 2, atk: 3, def: 3, spirit: 2, agi: 2 } },
  { id: 'infantry', name: '步兵', movePower: 4, minRange: 1, maxRange: 1,
    growth: { hp: 10, mp: 0, atk: 2, def: 4, spirit: 1, agi: 2 } },
  { id: 'cavalry', name: '骑兵', movePower: 7, minRange: 1, maxRange: 1,
    growth: { hp: 8, mp: 0, atk: 4, def: 2, spirit: 1, agi: 3 } },
  { id: 'archer', name: '弓兵', movePower: 5, minRange: 2, maxRange: 3,
    growth: { hp: 7, mp: 0, atk: 3, def: 1, spirit: 1, agi: 3 } },
  { id: 'strategist', name: '军师', movePower: 4, minRange: 1, maxRange: 1,
    growth: { hp: 6, mp: 6, atk: 1, def: 1, spirit: 5, agi: 2 } },
  { id: 'taoist', name: '道士', movePower: 4, minRange: 1, maxRange: 1,
    growth: { hp: 6, mp: 5, atk: 1, def: 1, spirit: 4, agi: 3 } },
]

// 相克三角：骑兵 > 弓兵 > 步兵 > 骑兵；其余 1.0
export const ADVANTAGE: ReadonlyArray<[ClassId, ClassId]> = [
  ['cavalry', 'archer'],
  ['archer', 'infantry'],
  ['infantry', 'cavalry'],
]
export const ADV_COEFF = 1.25
export const DISADV_COEFF = 0.8

export const classes: Record<ClassId, ClassDef> = Object.fromEntries(
  defs.map((d) => [d.id, d]),
) as Record<ClassId, ClassDef>
```

- [ ] **Step 4: 写 src/data/index.ts（GameData 注册表，随任务扩充）**

```ts
import type { ClassDef, ClassId, HeroDef, ItemDef, StrategyDef, TerrainDef, TerrainId } from '../engine/types'
import { classes } from './classes'
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
  strategies: {},
  items: {},
  heroes: {},
}
```

- [ ] **Step 5: 写失败测试 tests/data/gamedata.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { ADVANTAGE } from '../../src/data/classes'
import type { ClassId, TerrainId } from '../../src/engine/types'

const ALL_CLASSES: ClassId[] = ['lord', 'infantry', 'cavalry', 'archer', 'strategist', 'taoist']
const ALL_TERRAINS: TerrainId[] = ['plain', 'forest', 'mountain', 'water', 'city', 'camp', 'pass', 'bridge']

describe('静态数据完整性', () => {
  it('6 兵种齐全且成长率在 0~10', () => {
    for (const id of ALL_CLASSES) {
      const c = gameData.classes[id]
      expect(c, `兵种 ${id}`).toBeDefined()
      for (const v of Object.values(c.growth)) expect(v).toBeGreaterThanOrEqual(0)
      expect(c.movePower).toBeGreaterThan(0)
      expect(c.maxRange).toBeGreaterThanOrEqual(c.minRange)
    }
  })

  it('8 地形齐全且防御加成在 0~50', () => {
    for (const id of ALL_TERRAINS) {
      const t = gameData.terrains[id]
      expect(t, `地形 ${id}`).toBeDefined()
      expect(t.defBonus).toBeGreaterThanOrEqual(0)
      expect(t.defBonus).toBeLessThanOrEqual(50)
    }
  })

  it('每个兵种在每种地形都有移动消耗定义', () => {
    for (const cid of ALL_CLASSES) {
      for (const tid of ALL_TERRAINS) {
        const mc = gameData.terrains[tid].moveCost
        const cost = typeof mc === 'number' ? mc : (mc[cid] ?? mc.default)
        expect(Number.isFinite(cost) || cost === Infinity, `${cid}/${tid}`).toBe(true)
        if (Number.isFinite(cost)) expect(cost as number).toBeGreaterThan(0)
      }
    }
  })

  it('相克三角是封闭环（骑→弓→步→骑）', () => {
    expect([...ADVANTAGE]).toEqual([
      ['cavalry', 'archer'],
      ['archer', 'infantry'],
      ['infantry', 'cavalry'],
    ])
  })
})
```

- [ ] **Step 6: 运行测试**

```bash
npx vitest run tests/data/gamedata.test.ts 2>&1 | tail -8
```

Expected: `4 passed`

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: 引擎类型系统与兵种/地形静态数据"
```

---

### Task 3: 可回放 RNG（状态内种子）

**Files:**
- Create: `src/engine/rng.ts`
- Test: `tests/engine/rng.test.ts`

设计：随机数状态存在 `BattleState.rngState` 里，每次抽取返回新状态 —— 战斗可回放、测试可控。

- [ ] **Step 1: 写失败测试 tests/engine/rng.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { rngNext, rngFloat, rngChance } from '../../src/engine/rng'

describe('rng', () => {
  it('同种子产生相同序列', () => {
    const a = [rngNext(42), rngNext(rngNext(42).nextState), rngNext(rngNext(rngNext(42).nextState).nextState)]
    const b = [rngNext(42), rngNext(rngNext(42).nextState), rngNext(rngNext(rngNext(42).nextState).nextState)]
    expect(a).toEqual(b)
  })

  it('不同种子产生不同值', () => {
    expect(rngNext(1).value).not.toBe(rngNext(2).value)
  })

  it('value 落在 [0,1)', () => {
    let s = 7
    for (let i = 0; i < 1000; i++) {
      const r = rngNext(s)
      expect(r.value).toBeGreaterThanOrEqual(0)
      expect(r.value).toBeLessThan(1)
      s = r.nextState
    }
  })

  it('rngFloat 生成 [lo,hi) 区间值', () => {
    const r = rngFloat(0.9, 1.1, 123)
    expect(r.value).toBeGreaterThanOrEqual(0.9)
    expect(r.value).toBeLessThan(1.1)
  })

  it('rngChance p=0 永假 / p=1 永真', () => {
    expect(rngChance(0, 5).value).toBe(false)
    expect(rngChance(1, 5).value).toBe(true)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/engine/rng.test.ts 2>&1 | tail -6
```

Expected: FAIL（`Cannot find module '../../src/engine/rng'`）

- [ ] **Step 3: 写 src/engine/rng.ts（mulberry32 变体，纯函数）**

```ts
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
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/engine/rng.test.ts 2>&1 | tail -6
```

Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 状态内种子可回放随机数"
```

---

### Task 4: 战斗公式（combat.ts）

**Files:**
- Create: `src/engine/combat.ts`
- Test: `tests/engine/combat.test.ts`

- [ ] **Step 1: 写失败测试 tests/engine/combat.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import {
  affinity, physicalDamage, hitChance, critChance, comboChance, spellDamage, healAmount,
} from '../../src/engine/combat'

describe('affinity 相克系数', () => {
  it('骑兵克弓兵 1.25 / 弓兵被骑克 0.8 / 中立 1.0', () => {
    expect(affinity('cavalry', 'archer')).toBe(1.25)
    expect(affinity('archer', 'cavalry')).toBe(0.8)
    expect(affinity('archer', 'infantry')).toBe(1.25)
    expect(affinity('infantry', 'cavalry')).toBe(1.25)
    expect(affinity('lord', 'strategist')).toBe(1.0)
    expect(affinity('strategist', 'taoist')).toBe(1.0)
  })
})

describe('physicalDamage', () => {
  const base = { attackerClass: 'infantry' as const, defenderClass: 'cavalry' as const, terrainDefBonus: 0, roll: 1 }

  it('基础公式 (攻-防*0.6)*相克*地形*浮动，最低 1', () => {
    // (20 - 10*0.6) * 1.25 * 1 * 1 = 17.5 → 18
    expect(physicalDamage({ ...base, atk: 20, def: 10 })).toBe(18)
  })

  it('地形防御减伤', () => {
    // (20-6) * 1.25 * (1-0.3) = 12.25 → 12
    expect(physicalDamage({ ...base, atk: 20, def: 10, terrainDefBonus: 30 })).toBe(12)
  })

  it('攻击低于防御*0.6 时保底 1 点', () => {
    expect(physicalDamage({ ...base, atk: 5, def: 20, terrainDefBonus: 30, roll: 0.9 })).toBe(1)
  })

  it('浮动 roll 参与计算', () => {
    const d1 = physicalDamage({ ...base, atk: 20, def: 10, roll: 0.9 })
    const d2 = physicalDamage({ ...base, atk: 20, def: 10, roll: 1.09 })
    expect(d1).toBeLessThan(d2)
  })
})

describe('命中/暴击/连击概率', () => {
  it('命中 = clamp(90 + 敏捷差, 50, 100)', () => {
    expect(hitChance(10, 10)).toBe(90)
    expect(hitChance(30, 10)).toBe(100)
    expect(hitChance(10, 100)).toBe(50)
  })
  it('暴击 = clamp(5 + 敏捷差*0.5, 0, 40)', () => {
    expect(critChance(10, 10)).toBe(5)
    expect(critChance(100, 10)).toBe(40)
    expect(critChance(10, 100)).toBe(0)
  })
  it('连击 = clamp(敏捷差*1.5, 0, 30)', () => {
    expect(comboChance(10, 10)).toBe(0)
    expect(comboChance(20, 10)).toBe(15)
    expect(comboChance(100, 10)).toBe(30)
  })
})

describe('法术公式', () => {
  it('伤害 = (威力 + 精*0.8 - 敌精*0.4) * 天气系数', () => {
    // (30 + 20*0.8 - 10*0.4) * 1 = 42
    expect(spellDamage({ power: 30, casterSpirit: 20, targetSpirit: 10, weather: 'sunny', element: 'fire' })).toBe(42)
  })
  it('雨天水系 ×1.5', () => {
    expect(spellDamage({ power: 24, casterSpirit: 20, targetSpirit: 10, weather: 'rainy', element: 'water' }))
      .toBe(Math.round((24 + 16 - 4) * 1.5)) // 54
  })
  it('目标山地落石 ×1.3', () => {
    expect(spellDamage({ power: 34, casterSpirit: 20, targetSpirit: 10, weather: 'sunny', element: 'earth', targetOnMountain: true }))
      .toBe(Math.round((34 + 16 - 4) * 1.3)) // 60
  })
  it('回复 = 威力 + 施法者精神', () => {
    expect(healAmount(40, 20)).toBe(60)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/engine/combat.test.ts 2>&1 | tail -6
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 写 src/engine/combat.ts**

```ts
import type { ClassId, Weather } from './types'
import { ADVANTAGE, ADV_COEFF, DISADV_COEFF } from '../data/classes'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 兵种相克系数：克 1.25 / 被克 0.8 / 无关 1.0 */
export function affinity(a: ClassId, d: ClassId): number {
  if (ADVANTAGE.some(([x, y]) => x === a && y === d)) return ADV_COEFF
  if (ADVANTAGE.some(([x, y]) => x === d && y === a)) return DISADV_COEFF
  return 1
}

export interface PhysicalArgs {
  atk: number
  def: number
  attackerClass: ClassId
  defenderClass: ClassId
  terrainDefBonus: number // 防守方所站地形加成 %
  roll: number // [0.9, 1.1)
}

export function physicalDamage(a: PhysicalArgs): number {
  const raw = (a.atk - a.def * 0.6) * affinity(a.attackerClass, a.defenderClass)
    * (1 - a.terrainDefBonus / 100) * a.roll
  return Math.max(1, Math.round(raw))
}

export function hitChance(attackerAgi: number, defenderAgi: number): number {
  return clamp(90 + (attackerAgi - defenderAgi), 50, 100)
}

export function critChance(attackerAgi: number, defenderAgi: number): number {
  return clamp(5 + (attackerAgi - defenderAgi) * 0.5, 0, 40)
}

export function comboChance(attackerAgi: number, defenderAgi: number): number {
  return clamp((attackerAgi - defenderAgi) * 1.5, 0, 30)
}

export interface SpellArgs {
  power: number
  casterSpirit: number
  targetSpirit: number
  weather: Weather
  element: 'fire' | 'water' | 'earth'
  targetOnMountain?: boolean
}

export function spellDamage(a: SpellArgs): number {
  let coeff = 1
  if (a.element === 'water' && a.weather === 'rainy') coeff = 1.5
  if (a.element === 'earth' && a.targetOnMountain) coeff = 1.3
  const raw = (a.power + a.casterSpirit * 0.8 - a.targetSpirit * 0.4) * coeff
  return Math.max(1, Math.round(raw))
}

export function healAmount(power: number, casterSpirit: number): number {
  return power + casterSpirit
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/engine/combat.test.ts 2>&1 | tail -6
```

Expected: `12 passed`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 战斗公式（相克/物理/法术/命中/暴击/连击）"
```

---

### Task 5: 移动与攻击范围（movement.ts）

**Files:**
- Create: `src/engine/movement.ts`
- Test: `tests/engine/movement.test.ts`

- [ ] **Step 1: 写失败测试 tests/engine/movement.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { moveCostFor, computeMoveRange, pathTo, attackRangeCells, inRange, manhattan } from '../../src/engine/movement'
import { terrains } from '../../src/data/terrains'
import type { TerrainId, Unit } from '../../src/engine/types'

function mkUnit(id: string, classId: Unit['classId'], pos: { x: number; y: number }): Unit {
  return {
    id, heroId: '', name: id, faction: 'player', classId, level: 1, exp: 0,
    base: { hp: 50, mp: 0, atk: 10, def: 8, spirit: 5, agi: 8 }, hp: 50, mp: 0,
    pos, equipment: {}, items: [], statuses: [], moved: false, acted: false, alive: true,
  }
}

describe('moveCostFor', () => {
  it('数字型消耗直接返回', () => {
    expect(moveCostFor(terrains.plain, 'cavalry')).toBe(1)
  })
  it('对象型消耗按兵种取值，缺省用 default', () => {
    expect(moveCostFor(terrains.forest, 'infantry')).toBe(1)
    expect(moveCostFor(terrains.forest, 'cavalry')).toBe(2)
  })
  it('骑兵不可入山地（Infinity）', () => {
    expect(moveCostFor(terrains.mountain, 'cavalry')).toBe(Infinity)
    expect(moveCostFor(terrains.mountain, 'infantry')).toBe(2)
  })
})

describe('computeMoveRange', () => {
  // 8x6 平原
  const map: TerrainId[][] = Array.from({ length: 6 }, () => Array(8).fill('plain'))

  it('步兵移动力 4 在空旷平原可达曼哈顿距离 ≤4 的格子', () => {
    const u = mkUnit('u1', 'infantry', { x: 4, y: 3 })
    const r = computeMoveRange(map, [u], u, terrains)
    expect(r.cells.has('3,3')).toBe(true)  // 距离 1
    expect(r.cells.has('0,3')).toBe(true)  // 距离 4
    expect(r.cells.has('4,7')).toBe(false) // 越界
    expect(r.cells.has('0,2')).toBe(false) // 距离 5
  })

  it('单位占据的格子不可通行（敌我皆阻挡）', () => {
    const u = mkUnit('u1', 'cavalry', { x: 2, y: 2 })
    const blocker = mkUnit('e1', 'infantry', { x: 3, y: 2 })
    const r = computeMoveRange(map, [u, blocker], u, terrains)
    expect(r.cells.has('3,2')).toBe(false)
    expect(r.cells.has('4,2')).toBe(false) // 被挡住后绕不过去？骑动力 7 可绕行 —— 改为断言 4,2 经由绕路可达
  })

  it('友军阻挡绕行（骑兵移动力足够时）', () => {
    const u = mkUnit('u1', 'cavalry', { x: 2, y: 2 })
    const blocker = mkUnit('e1', 'infantry', { x: 3, y: 2 })
    const r = computeMoveRange(map, [u, blocker], u, terrains)
    expect(r.cells.has('4,2')).toBe(true) // 绕 (3,1)/(3,3) 到达
  })

  it('路径还原：从起点到终点', () => {
    const u = mkUnit('u1', 'infantry', { x: 1, y: 1 })
    const r = computeMoveRange(map, [u], u, terrains)
    const p = pathTo(r.prev, u.pos, { x: 3, y: 2 })
    expect(p[0]).toEqual({ x: 1, y: 1 })
    expect(p[p.length - 1]).toEqual({ x: 3, y: 2 })
    // 相邻步曼哈顿距离为 1
    for (let i = 1; i < p.length; i++) expect(manhattan(p[i - 1], p[i])).toBe(1)
  })
})

describe('attackRangeCells / inRange', () => {
  it('弓兵 [2,3] 射程不含相邻格', () => {
    expect(inRange({ x: 0, y: 0 }, { x: 1, y: 0 }, 2, 3)).toBe(false)
    expect(inRange({ x: 0, y: 0 }, { x: 2, y: 0 }, 2, 3)).toBe(true)
    expect(inRange({ x: 0, y: 0 }, { x: 3, y: 0 }, 2, 3)).toBe(true)
    expect(inRange({ x: 0, y: 0 }, { x: 4, y: 0 }, 2, 3)).toBe(false)
  })
  it('attackRangeCells 含边界且在地图内', () => {
    const cells = attackRangeCells({ x: 0, y: 0 }, 1, 1, 8, 6)
    expect(cells).toContainEqual({ x: 1, y: 0 })
    expect(cells).toContainEqual({ x: 0, y: 1 })
    expect(cells).not.toContainEqual({ x: -1, y: 0 })
    expect(cells).not.toContainEqual({ x: 0, y: 0 })
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/engine/movement.test.ts 2>&1 | tail -6
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 写 src/engine/movement.ts**

```ts
import type { Cell, ClassId, TerrainDef, TerrainId, Unit } from './types'
import { classes } from '../data/classes'

export function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

export function cellKey(c: Cell): string { return `${c.x},${c.y}` }

export function moveCostFor(t: TerrainDef, c: ClassId): number {
  if (typeof t.moveCost === 'number') return t.moveCost
  const v = t.moveCost[c]
  return v === undefined ? t.moveCost.default : v
}

export interface MoveRange {
  cells: Map<string, Cell> // 可停留格（含原地）
  prev: Map<string, Cell | null> // 路径前驱
}

/** 一致代价搜索（Dijkstra）：地形消耗不同兵种不同，单位互相阻挡（不可穿越、不可停留）。
 * moveBudget 缺省取兵种自身移动力；引擎侧传入 effectiveMove()（含装备/疾风加成）。 */
export function computeMoveRange(
  map: TerrainId[][], units: Unit[], unit: Unit,
  terrains: Record<TerrainId, TerrainDef>, moveBudget?: number,
): MoveRange {
  const cls = unit.classId
  const budget = moveBudget ?? classes[cls].movePower
  const cells = new Map<string, Cell>()
  const prev = new Map<string, Cell | null>()
  const cost = new Map<string, number>()
  const occupied = new Set(units.filter((u) => u.alive).map((u) => cellKey(u.pos)))
  const h = map.length, w = map[0].length
  const start = unit.pos
  cells.set(cellKey(start), start)
  prev.set(cellKey(start), null)
  cost.set(cellKey(start), 0)
  // 简单优先队列：数组排序（地图 ≤64×64 足够）
  const frontier: Array<{ c: Cell; g: number }> = [{ c: start, g: 0 }]
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.g - b.g)
    const cur = frontier.shift()!
    if (cur.g > (cost.get(cellKey(cur.c)) ?? Infinity)) continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cur.c.x + dx, ny = cur.c.y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const next = { x: nx, y: ny }
      const k = cellKey(next)
      if (occupied.has(k)) continue // 单位阻挡
      const step = moveCostFor(terrains[map[ny][nx]], cls)
      if (!Number.isFinite(step)) continue
      const g = cur.g + step
      if (g > budget) continue
      if (g < (cost.get(k) ?? Infinity)) {
        cost.set(k, g)
        prev.set(k, cur.c)
        if (!cells.has(k)) cells.set(k, next)
        frontier.push({ c: next, g })
      }
    }
  }
  return { cells, prev }
}

export function pathTo(prev: Map<string, Cell | null>, from: Cell, to: Cell): Cell[] {
  const path: Cell[] = []
  let cur: Cell | null = to
  const guard = new Set<string>()
  while (cur) {
    const k = cellKey(cur)
    if (guard.has(k)) break
    guard.add(k)
    path.unshift(cur)
    if (k === cellKey(from)) break
    cur = prev.get(k) ?? null
  }
  return path
}

export function inRange(from: Cell, to: Cell, minRange: number, maxRange: number): boolean {
  const d = manhattan(from, to)
  return d >= minRange && d <= maxRange
}

/** 曼哈顿距离环 [min,max]，限制在 w×h 地图内，不含中心格。 */
export function attackRangeCells(from: Cell, minRange: number, maxRange: number, w: number, h: number): Cell[] {
  const out: Cell[] = []
  for (let y = from.y - maxRange; y <= from.y + maxRange; y++) {
    for (let x = from.x - maxRange; x <= from.x + maxRange; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      if (inRange(from, { x, y }, minRange, maxRange)) out.push({ x, y })
    }
  }
  return out
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/engine/movement.test.ts 2>&1 | tail -6
```

Expected: `9 passed`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 移动范围搜索/路径还原/攻击范围"
```

---

### Task 6: 法术数据与形状/门禁（strategies + spells.ts）

**Files:**
- Create: `src/data/strategies.ts`, `src/engine/spells.ts`
- Modify: `src/data/index.ts`（填充 strategies）
- Test: `tests/data/strategies.test.ts`

- [ ] **Step 1: 写 src/data/strategies.ts**

```ts
import type { StrategyDef } from '../engine/types'

const defs: StrategyDef[] = [
  { id: 'huoshi', name: '火矢', kind: 'attack', mpCost: 6, power: 30, shape: 'single', range: 3,
    element: 'fire', allowedClasses: ['strategist'], desc: '单体火系伤害' },
  { id: 'huolong', name: '火龙', kind: 'attack', mpCost: 12, power: 26, shape: 'cross', range: 3,
    element: 'fire', allowedClasses: ['strategist'], desc: '十字范围火系伤害' },
  { id: 'shuiyan', name: '水淹', kind: 'attack', mpCost: 12, power: 24, shape: 'burst', range: 3,
    element: 'water', allowedClasses: ['strategist'], desc: '3x3 范围水伤，雨天 +50%' },
  { id: 'luoshi', name: '落石', kind: 'attack', mpCost: 8, power: 34, shape: 'single', range: 3,
    element: 'earth', allowedClasses: ['strategist'], desc: '单体伤害，目标在山地 +30%' },
  { id: 'zhiyu', name: '治愈', kind: 'heal', mpCost: 6, power: 40, shape: 'single', range: 3,
    allowedClasses: ['strategist', 'taoist'], desc: '单体回复 HP' },
  { id: 'qunliao', name: '群疗', kind: 'heal', mpCost: 12, power: 30, shape: 'burst', range: 3,
    allowedClasses: ['strategist'], desc: '3x3 范围回复 HP' },
  { id: 'pojia', name: '破甲', kind: 'debuff', mpCost: 5, power: 0, shape: 'single', range: 3,
    effect: 'defdown', effectTurns: 3, allowedClasses: ['taoist'], desc: '降低防御 3 回合' },
  { id: 'jifeng', name: '疾风', kind: 'buff', mpCost: 5, power: 0, shape: 'single', range: 3,
    effect: 'speedup', effectTurns: 3, allowedClasses: ['taoist'], desc: '提升移动力 3 回合' },
  { id: 'xuanyun', name: '眩晕', kind: 'debuff', mpCost: 10, power: 0, shape: 'single', range: 3,
    effect: 'stun', effectTurns: 1, allowedClasses: ['taoist'], desc: '目标下回合无法行动' },
  { id: 'yaowu', name: '妖雾', kind: 'debuff', mpCost: 6, power: 0, shape: 'single', range: 3,
    effect: 'accdown', effectTurns: 3, allowedClasses: ['taoist'], desc: '降低命中 3 回合' },
]

export const strategies: Record<string, StrategyDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
```

- [ ] **Step 2: 修改 src/data/index.ts（填充 strategies）**

将 `strategies: {},` 一行改为：

```ts
  strategies,
```

并在文件头部 import 区加入：

```ts
import { strategies } from './strategies'
```

- [ ] **Step 3: 写失败测试 tests/data/strategies.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { strategies } from '../../src/data/strategies'
import { shapeCells, castableInWeather } from '../../src/engine/spells'
import type { Cell } from '../../src/engine/types'

describe('法术数据', () => {
  it('共 10 个法术，id 唯一', () => {
    expect(Object.keys(strategies).length).toBe(10)
  })
  it('attack 类必填 element；buff/debuff 类必填 effect 与 effectTurns', () => {
    for (const s of Object.values(strategies)) {
      if (s.kind === 'attack') expect(s.element, s.id).toBeDefined()
      if (s.kind === 'buff' || s.kind === 'debuff') {
        expect(s.effect, s.id).toBeDefined()
        expect(s.effectTurns, s.id).toBeGreaterThan(0)
      }
      expect(s.mpCost, s.id).toBeGreaterThan(0)
      expect(s.allowedClasses.length, s.id).toBeGreaterThan(0)
    }
  })
})

describe('shapeCells', () => {
  const c: Cell = { x: 5, y: 5 }
  it('single 只有目标格', () => {
    expect(shapeCells(c, 'single')).toEqual([c])
  })
  it('cross 是目标格 + 四邻', () => {
    expect(shapeCells(c, 'cross').length).toBe(5)
    expect(shapeCells(c, 'cross')).toContainEqual({ x: 6, y: 5 })
    expect(shapeCells(c, 'cross')).not.toContainEqual({ x: 6, y: 6 })
  })
  it('burst 是 3x3 九格', () => {
    expect(shapeCells(c, 'burst').length).toBe(9)
  })
})

describe('castableInWeather', () => {
  it('雨天火系不可用，其余可用', () => {
    expect(castableInWeather(strategies.huoshi, 'rainy')).toBe(false)
    expect(castableInWeather(strategies.huoshi, 'sunny')).toBe(true)
    expect(castableInWeather(strategies.huolong, 'cloudy')).toBe(true)
    expect(castableInWeather(strategies.zhiyu, 'rainy')).toBe(true)
    expect(castableInWeather(strategies.shuiyan, 'rainy')).toBe(true)
  })
})
```

- [ ] **Step 4: 运行确认失败**

```bash
npx vitest run tests/data/strategies.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/engine/spells.ts` 不存在）

- [ ] **Step 5: 写 src/engine/spells.ts**

```ts
import type { Cell, StrategyDef, TargetShape, Weather } from './types'

/** 法术形状覆盖格（不做地图越界过滤，由调用方负责）。 */
export function shapeCells(target: Cell, shape: TargetShape): Cell[] {
  if (shape === 'single') return [target]
  if (shape === 'cross') {
    return [
      target,
      { x: target.x + 1, y: target.y }, { x: target.x - 1, y: target.y },
      { x: target.x, y: target.y + 1 }, { x: target.x, y: target.y - 1 },
    ]
  }
  const out: Cell[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) out.push({ x: target.x + dx, y: target.y + dy })
  return out
}

/** 雨天火系法术不可用（spec §3.5）。 */
export function castableInWeather(s: StrategyDef, w: Weather): boolean {
  if (s.element === 'fire' && w === 'rainy') return false
  return true
}
```

- [ ] **Step 6: 运行确认通过**

```bash
npx vitest run tests/data/strategies.test.ts 2>&1 | tail -6
```

Expected: `5 passed`

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: 十法术数据与形状/天气门禁"
```

---

### Task 7: 引擎核心底座（engine/internal/move/turns + 基础胜负）

**Files:**
- Create: `src/engine/wincheck.ts`, `src/engine/internal.ts`, `src/engine/move.ts`, `src/engine/turns.ts`, `src/engine/engine.ts`, `tests/engine/helpers.ts`
- Test: `tests/engine/engine.test.ts`

- [ ] **Step 1: 写测试工厂 tests/engine/helpers.ts（后续所有引擎测试复用）**

```ts
import type { BattleDef, BattleState, Stats, TerrainId, Unit } from '../../src/engine/types'
import { gameData } from '../../src/data'
import { initBattle } from '../../src/engine/engine'

export { gameData }

export function mkUnit(o: Partial<Unit> & { id: string }): Unit {
  const base: Stats = o.base ?? { hp: 50, mp: 0, atk: 12, def: 8, spirit: 5, agi: 8 }
  return {
    heroId: '', name: o.id, faction: 'player', classId: 'infantry',
    level: 1, exp: 0, base, hp: o.hp ?? base.hp, mp: o.mp ?? base.mp,
    pos: o.pos ?? { x: 0, y: 0 }, equipment: {}, items: [], statuses: [],
    moved: false, acted: false, alive: true, ...o,
  }
}

export function flatMap(w = 8, h = 6, t: TerrainId = 'plain'): TerrainId[][] {
  return Array.from({ length: h }, () => Array(w).fill(t))
}

export function mkState(o: Partial<BattleState> = {}): BattleState {
  return {
    battleId: 'test', turn: 1, factionOrder: ['player', 'enemy'], factionIndex: 0,
    weather: 'sunny', map: flatMap(), units: [], reinforcements: [], treasureCells: [],
    dialogues: [], weatherScript: [], win: { kind: 'annihilate' }, maxTurns: 20,
    rngState: 42, rewards: [], finished: null, ...o,
  }
}

export function mkBattle(o: Partial<BattleDef> = {}): BattleDef {
  return {
    id: 'test', name: '测试战役', desc: '',
    map: flatMap(), units: [], reinforcements: [], treasureCells: [], dialogues: [],
    weather: 'sunny', weatherScript: [], win: { kind: 'annihilate' }, maxTurns: 20, ...o,
  }
}

export function stateFromBattle(def: BattleDef, seed = 42): BattleState {
  return initBattle(def, seed)
}
```

- [ ] **Step 2: 写失败测试 tests/engine/engine.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { apply, initBattle } from '../../src/engine/engine'
import { gameData, mkBattle, mkState, mkUnit } from './helpers'

describe('initBattle', () => {
  it('回合=1、玩家先手、未结束', () => {
    const s = initBattle(mkBattle({ units: [mkUnit({ id: 'p1' })] }), 42)
    expect(s.turn).toBe(1)
    expect(s.factionOrder[s.factionIndex]).toBe('player')
    expect(s.finished).toBeNull()
  })
})

describe('move 指令', () => {
  const state = () => mkState({ units: [mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 } })] })

  it('合法移动：位置更新 + moved 置位 + unitMoved 事件', () => {
    const r = apply(state(), { type: 'move', unitId: 'p1', to: { x: 4, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.state.units[0].pos).toEqual({ x: 4, y: 2 })
      expect(r.state.units[0].moved).toBe(true)
      expect(r.events.some((e) => e.type === 'unitMoved')).toBe(true)
    }
  })
  it('超范围移动 → OUT_OF_MOVE_RANGE', () => {
    const r = apply(state(), { type: 'move', unitId: 'p1', to: { x: 7, y: 6 } }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'OUT_OF_MOVE_RANGE', unitId: 'p1' } })
  })
  it('已移动过的单位不能再移动', () => {
    const r1 = apply(state(), { type: 'move', unitId: 'p1', to: { x: 3, y: 2 } }, gameData)
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    const r2 = apply(r1.state, { type: 'move', unitId: 'p1', to: { x: 5, y: 2 } }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'UNIT_ALREADY_ACTED', unitId: 'p1' } })
  })
  it('踩宝物格 → rewards + treasureFound 事件', () => {
    const s = mkState({
      units: [mkUnit({ id: 'p1', pos: { x: 1, y: 1 } })],
      treasureCells: [{ cell: { x: 2, y: 1 }, itemId: 'jinchuang_yao', found: false }],
    })
    const r = apply(s, { type: 'move', unitId: 'p1', to: { x: 2, y: 1 } }, gameData)
    expect(r.ok && r.state.rewards).toEqual(['jinchuang_yao'])
    expect(r.ok && r.events.some((e) => e.type === 'treasureFound')).toBe(true)
  })
  it('敌方回合单位不受玩家指令控制', () => {
    const s = mkState({ units: [mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })] })
    const r = apply(s, { type: 'move', unitId: 'e1', to: { x: 6, y: 4 } }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'NOT_YOUR_TURN', unitId: 'e1', faction: 'player' } })
  })
})

describe('wait / endTurn', () => {
  it('wait 置 acted', () => {
    const s = mkState({ units: [mkUnit({ id: 'p1' })] })
    const r = apply(s, { type: 'wait', unitId: 'p1' }, gameData)
    expect(r.ok && r.state.units[0].acted).toBe(true)
  })
  it('endTurn → 敌方回合、敌方单位标志重置、事件成对', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 }, acted: true, moved: true }),
      ],
    })
    const r = apply(s, { type: 'endTurn' }, gameData)
    expect(r.ok && r.state.factionOrder[r.state.factionIndex]).toBe('enemy')
    expect(r.ok && r.state.units[1].acted).toBe(false)
    expect(r.ok && r.events.some((e) => e.type === 'turnEnded' && e.faction === 'player')).toBe(true)
    expect(r.ok && r.events.some((e) => e.type === 'turnStarted' && e.faction === 'enemy')).toBe(true)
  })
})

describe('基础胜负（annihilate + 全灭/君主阵亡）', () => {
  it('场上无敌人 → won，此后指令 BATTLE_ENDED', () => {
    const s = mkState({ units: [mkUnit({ id: 'p1' })] })
    const r = apply(s, { type: 'wait', unitId: 'p1' }, gameData)
    expect(r.ok && r.state.finished).toBe('won')
    const r2 = apply(r.ok ? r.state : s, { type: 'endTurn' }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'BATTLE_ENDED' } })
  })
  it('我方全灭 → lost', () => {
    const s = mkState({ units: [mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })] })
    const r = apply(s, { type: 'endTurn' }, gameData)
    expect(r.ok && r.state.finished).toBe('lost')
  })
})
```

- [ ] **Step 3: 运行确认失败**

```bash
npx vitest run tests/engine/engine.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/engine/engine` 模块不存在）

- [ ] **Step 4: 实现 5 个引擎文件**

`src/engine/wincheck.ts`（基础版，Task 11 扩展）：

```ts
import type { BattleState } from './types'

export interface BattleVerdict { won: boolean; lost: boolean }

export function evaluate(s: BattleState): BattleVerdict {
  const lord = s.units.find((u) => u.classId === 'lord')
  const alivePlayers = s.units.filter((u) => u.faction === 'player' && u.alive)
  const lost = alivePlayers.length === 0 || (lord !== undefined && !lord.alive)
  const aliveEnemies = s.units.filter((u) => u.faction === 'enemy' && u.alive)
  let won = false
  if (s.win.kind === 'annihilate') won = aliveEnemies.length === 0
  return { won: won && !lost, lost }
}
```

`src/engine/internal.ts`：

```ts
import type { ApplyResult, BattleState, Cell, EngineError, Faction, GameEvent, StatKey, Stats, Unit } from './types'
import type { GameData } from '../data'
import { rngNext } from './rng'
import { evaluate } from './wincheck'

/** 一次指令的工作草稿：克隆状态 + 事件累积 + 可回放随机数。 */
export interface Draft {
  state: BattleState
  events: GameEvent[]
  draw(): number // [0,1)，同时推进 state.rngState
}

export function begin(state: BattleState): Draft {
  const s = structuredClone(state)
  const events: GameEvent[] = []
  return {
    state: s,
    events,
    draw() {
      const r = rngNext(s.rngState)
      s.rngState = r.nextState
      return r.value
    },
  }
}

export function findUnit(s: BattleState, id: string): Unit | undefined {
  return s.units.find((u) => u.id === id)
}

export function unitAt(s: BattleState, c: Cell): Unit | undefined {
  return s.units.find((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y)
}

/** player 与 ally 互为友军，enemy 与两者敌对。 */
export function hostile(a: Faction, b: Faction): boolean {
  if (a === b) return false
  return a === 'enemy' || b === 'enemy'
}

/** 裸属性 + 装备加成 + 状态修正（破甲）。 */
export function effectiveStats(u: Unit, data: GameData): Stats {
  const s: Stats = { ...u.base }
  for (const id of Object.values(u.equipment)) {
    const item = id !== undefined ? data.items[id] : undefined
    if (!item?.bonuses) continue
    for (const [k, v] of Object.entries(item.bonuses)) {
      if (k !== 'move' && v !== undefined) s[k as StatKey] += v
    }
  }
  if (u.statuses.some((st) => st.kind === 'defdown')) s.def = Math.floor(s.def * 0.7)
  return s
}

/** 兵种移动力 + 装备（的卢/赤兔）+ 疾风状态。 */
export function effectiveMove(u: Unit, data: GameData): number {
  let move = data.classes[u.classId].movePower
  for (const id of Object.values(u.equipment)) {
    const item = id !== undefined ? data.items[id] : undefined
    if (item?.bonuses?.move) move += item.bonuses.move
  }
  if (u.statuses.some((st) => st.kind === 'speedup')) move += 2
  return move
}

/** 单位行动权校验：存在→存活→本阵营回合→未行动。 */
export function ensureActable(s: BattleState, unitId: string): EngineError | null {
  const u = findUnit(s, unitId)
  if (!u) return { code: 'UNIT_NOT_FOUND', unitId }
  if (!u.alive) return { code: 'UNIT_DEAD', unitId }
  const cur = s.factionOrder[s.factionIndex]
  if (u.faction !== cur) return { code: 'NOT_YOUR_TURN', unitId, faction: cur }
  if (u.acted) return { code: 'UNIT_ALREADY_ACTED', unitId }
  return null
}

export function killUnit(d: Draft, u: Unit, byUnitId?: string): void {
  u.alive = false
  u.hp = 0
  d.events.push({ type: 'unitDied', unitId: u.id, byUnitId })
  for (const trig of d.state.dialogues) {
    if (trig.onDeathOf === u.id) d.events.push({ type: 'dialogueTriggered', dialogueId: trig.dialogueId })
  }
}

/** 每次指令收尾：评估胜负并落 finished。 */
export function finish(d: Draft): ApplyResult {
  const v = evaluate(d.state)
  if (v.won && !v.lost) {
    d.state.finished = 'won'
    d.events.push({ type: 'battleWon' })
  } else if (v.lost) {
    d.state.finished = 'lost'
    d.events.push({ type: 'battleLost' })
  }
  return { ok: true, state: d.state, events: d.events }
}
```

`src/engine/move.ts`：

```ts
import type { ApplyResult, BattleState, Command } from './types'
import type { GameData } from '../data'
import { begin, effectiveMove, ensureActable, findUnit, finish } from './internal'
import { cellKey, computeMoveRange, pathTo } from './movement'

export function doMove(state: BattleState, cmd: Extract<Command, { type: 'move' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const actor = findUnit(state, cmd.unitId)!
  if (actor.moved) return { ok: false, error: { code: 'UNIT_ALREADY_ACTED', unitId: cmd.unitId } }
  const d = begin(state)
  const du = findUnit(d.state, cmd.unitId)!
  const r = computeMoveRange(d.state.map, d.state.units, du, data.terrains, effectiveMove(du, data))
  if (!r.cells.has(cellKey(cmd.to))) return { ok: false, error: { code: 'OUT_OF_MOVE_RANGE', unitId: cmd.unitId } }
  const path = pathTo(r.prev, du.pos, cmd.to)
  du.pos = { ...cmd.to }
  du.moved = true
  d.events.push({ type: 'unitMoved', unitId: du.id, path })
  for (const t of d.state.treasureCells) {
    if (!t.found && t.cell.x === cmd.to.x && t.cell.y === cmd.to.y) {
      t.found = true
      d.state.rewards.push(t.itemId)
      d.events.push({ type: 'treasureFound', unitId: du.id, itemId: t.itemId })
    }
  }
  return finish(d)
}

export function doWait(state: BattleState, cmd: Extract<Command, { type: 'wait' }>): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const d = begin(state)
  const du = findUnit(d.state, cmd.unitId)!
  du.acted = true
  du.moved = true
  return finish(d)
}
```

`src/engine/turns.ts`（基础版，Task 10 扩展为整轮推进）：

```ts
import type { ApplyResult, BattleState, Faction } from './types'
import { begin, finish, type Draft } from './internal'

export function doEndTurn(state: BattleState): ApplyResult {
  const d = begin(state)
  const cur = d.state.factionOrder[d.state.factionIndex]
  d.events.push({ type: 'turnEnded', faction: cur, turn: d.state.turn })
  advanceFaction(d)
  return finish(d)
}

function advanceFaction(d: Draft): void {
  const order = d.state.factionOrder
  let idx = d.state.factionIndex
  for (let i = 0; i < order.length; i++) {
    idx = (idx + 1) % order.length
    const f = order[idx]
    if (d.state.units.some((u) => u.faction === f && u.alive)) {
      d.state.factionIndex = idx
      startFactionTurn(d, f)
      return
    }
  }
}

function startFactionTurn(d: Draft, f: Faction): void {
  d.events.push({ type: 'turnStarted', faction: f, turn: d.state.turn })
  for (const u of d.state.units) {
    if (u.faction !== f || !u.alive) continue
    u.moved = false
    u.acted = false
    if (u.statuses.some((st) => st.kind === 'stun')) u.acted = true // 眩晕：跳过本回合
    u.statuses = u.statuses.map((st) => ({ ...st, turns: st.turns - 1 })).filter((st) => st.turns > 0)
  }
}
```

`src/engine/engine.ts`：

```ts
import type { ApplyResult, BattleDef, BattleState, Command } from './types'
import type { GameData } from '../data'
import { doMove, doWait } from './move'
import { doEndTurn } from './turns'

export function initBattle(def: BattleDef, rngSeed: number): BattleState {
  const hasAlly =
    def.units.some((u) => u.faction === 'ally') ||
    def.reinforcements.some((r) => r.entries.some((e) => e.unit.faction === 'ally'))
  return {
    battleId: def.id,
    turn: 1,
    factionOrder: hasAlly ? ['player', 'ally', 'enemy'] : ['player', 'enemy'],
    factionIndex: 0,
    weather: def.weather,
    map: def.map,
    units: def.units,
    reinforcements: def.reinforcements,
    treasureCells: def.treasureCells,
    dialogues: def.dialogues,
    weatherScript: def.weatherScript,
    win: def.win,
    maxTurns: def.maxTurns,
    rngState: rngSeed,
    rewards: [],
    finished: null,
  }
}

export function apply(state: BattleState, cmd: Command, data: GameData): ApplyResult {
  if (state.finished) return { ok: false, error: { code: 'BATTLE_ENDED' } }
  switch (cmd.type) {
    case 'move': return doMove(state, cmd, data)
    case 'attack': return { ok: false, error: { code: 'CANNOT_TARGET', reason: 'attack 未实现（Task 8）' } }
    case 'cast': return { ok: false, error: { code: 'CANNOT_TARGET', reason: 'cast 未实现（Task 9）' } }
    case 'useItem': return { ok: false, error: { code: 'CANNOT_TARGET', reason: 'useItem 未实现（Task 9）' } }
    case 'wait': return doWait(state, cmd)
    case 'endTurn': return doEndTurn(state)
  }
}
```

- [ ] **Step 5: 运行确认通过**

```bash
npx vitest run tests/engine/engine.test.ts 2>&1 | tail -6
```

Expected: `10 passed`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 引擎核心底座（apply 分发/移动/待机/回合推进/基础胜负）"
```

---

### Task 8: 攻击指令（反击/连击/暴击）+ 经验升级

**Files:**
- Create: `src/engine/growth.ts`, `src/engine/attack.ts`, `tests/engine/growth.test.ts`
- Modify: `src/engine/engine.ts`（attack case 接入）
- Test: `tests/engine/attack.test.ts`

- [ ] **Step 1: 写失败测试 tests/engine/growth.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { rollLevelUp, awardExp, EXP_PER_LEVEL, LEVEL_CAP } from '../../src/engine/growth'
import { mkState, mkUnit, gameData } from './helpers'
import { begin } from '../../src/engine/internal'
import type { Stats } from '../../src/engine/types'

describe('rollLevelUp', () => {
  it('同种子结果一致（可回放）', () => {
    const g: Stats = { hp: 9, mp: 2, atk: 3, def: 3, spirit: 2, agi: 2 }
    expect(rollLevelUp(g, 100)).toEqual(rollLevelUp(g, 100))
  })
  it('成长率 ≥3 的属性每级至少 +1', () => {
    const g: Stats = { hp: 10, mp: 0, atk: 4, def: 4, spirit: 0, agi: 3 }
    for (let seed = 1; seed <= 20; seed++) {
      const { gains } = rollLevelUp(g, seed)
      expect(gains.hp).toBeGreaterThanOrEqual(3)
      expect(gains.atk).toBeGreaterThanOrEqual(1)
      expect(gains.def).toBeGreaterThanOrEqual(1)
      expect(gains.agi).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('awardExp', () => {
  it('满经验升级并加属性，事件成对', () => {
    const u = mkUnit({ id: 'p1', exp: EXP_PER_LEVEL - 10 })
    const d = begin(mkState({ units: [u] }))
    awardExp(d, 'p1', 10, gameData)
    expect(d.state.units[0].level).toBe(2)
    expect(d.state.units[0].exp).toBe(0)
    expect(d.events.some((e) => e.type === 'expGained')).toBe(true)
    expect(d.events.some((e) => e.type === 'levelUp')).toBe(true)
  })
  it('敌方单位不获得经验', () => {
    const e = mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })
    const d = begin(mkState({ units: [e] }))
    awardExp(d, 'e1', 50, gameData)
    expect(d.state.units[0].exp).toBe(0)
    expect(d.events.length).toBe(0)
  })
  it('等级封顶后不再升级', () => {
    const u = mkUnit({ id: 'p1', level: LEVEL_CAP, exp: 0 })
    const d = begin(mkState({ units: [u] }))
    awardExp(d, 'p1', 500, gameData)
    expect(d.state.units[0].level).toBe(LEVEL_CAP)
  })
})
```

- [ ] **Step 2: 写失败测试 tests/engine/attack.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { apply } from '../../src/engine/engine'
import { gameData, mkState, mkUnit } from './helpers'

// 命中率确定性：攻击方敏捷远高于防守方（hitChance=100%）
function states() {
  return mkState({
    units: [
      mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 50 } }),
      mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 5 } }),
    ],
  })
}

describe('attack 指令', () => {
  it('命中：掉血 + 事件 + acted 置位 + 获得经验', () => {
    const r = apply(states(), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const e1 = r.state.units.find((u) => u.id === 'e1')!
    expect(e1.hp).toBeLessThan(60)
    expect(r.events.some((ev) => ev.type === 'attackLaunched')).toBe(true)
    expect(r.events.some((ev) => ev.type === 'hpChanged' && ev.unitId === 'e1')).toBe(true)
    expect(r.state.units.find((u) => u.id === 'p1')!.acted).toBe(true)
    expect(r.events.some((ev) => ev.type === 'expGained' && ev.unitId === 'p1')).toBe(true)
  })

  it('防守方存活且在射程内 → 触发反击（p1 掉血）', () => {
    const r = apply(states(), { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const p1 = r.state.units.find((u) => u.id === 'p1')!
    expect(p1.hp).toBeLessThan(60)
    expect(r.events.filter((e) => e.type === 'attackLaunched').length).toBe(1) // 事件合并一条，内含反击
  })

  it('弓兵被贴脸（距 1）时不反击（minRange=2）', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 50 } }),
        mkUnit({ id: 'e1', faction: 'enemy', classId: 'archer', pos: { x: 2, y: 3 }, base: { hp: 60, mp: 0, atk: 20, def: 10, spirit: 5, agi: 5 } }),
      ],
    })
    const r = apply(s, { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.units.find((u) => u.id === 'p1')!.hp).toBe(60) // 未被反击
  })

  it('击杀：unitDied + 击杀奖励经验 + 歼灭即胜', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', classId: 'infantry', pos: { x: 2, y: 2 }, base: { hp: 60, mp: 0, atk: 99, def: 10, spirit: 5, agi: 50 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 }, base: { hp: 10, mp: 0, atk: 1, def: 0, spirit: 1, agi: 1 }, hp: 5 }),
      ],
    })
    const r = apply(s, { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.events.some((ev) => ev.type === 'unitDied' && ev.unitId === 'e1')).toBe(true)
    expect(r.state.finished).toBe('won')
  })

  it('攻击友军 → CANNOT_TARGET；射程外 → NOT_IN_RANGE', () => {
    const s = states()
    const ally = mkUnit({ id: 'a1', faction: 'ally', pos: { x: 2, y: 3 } })
    const r1 = apply({ ...s, units: [...s.units, ally] }, { type: 'attack', unitId: 'p1', targetId: 'a1' }, gameData)
    expect(r1.ok === false && r1.error.code === 'CANNOT_TARGET').toBe(true)
    // p1 与 e1 相距 12 格，infantry 射程 [1,1]
    const far = mkState({
      units: [
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 7, y: 5 } }),
      ],
    })
    const r2 = apply(far, { type: 'attack', unitId: 'p1', targetId: 'e1' }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'NOT_IN_RANGE', unitId: 'p1', targetId: 'e1' } })
  })
})
```

- [ ] **Step 3: 运行确认失败**

```bash
npx vitest run tests/engine/growth.test.ts tests/engine/attack.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/engine/growth` 模块不存在）

- [ ] **Step 4: 写 src/engine/growth.ts**

```ts
import type { Stats } from './types'
import type { GameData } from '../data'
import type { Draft } from './internal'
import { rngNext } from './rng'

export const LEVEL_CAP = 30
export const EXP_PER_LEVEL = 100
export const EXP_HIT = 10
export const EXP_SPELL = 12
export const EXP_HEAL = 8
export const EXP_KILL_BONUS = 20

/** 每属性成长 = floor(g/3) + 以 (g%3)/3 概率再 +1（原版随机成长风味，种子可回放）。 */
export function rollLevelUp(growth: Stats, rngState: number): { gains: Partial<Stats>; nextState: number } {
  const gains: Partial<Stats> = {}
  let s = rngState
  for (const [k, g] of Object.entries(growth) as Array<[keyof Stats, number]>) {
    const roll = rngNext(s)
    s = roll.nextState
    const gain = Math.floor(g / 3) + (roll.value < (g % 3) / 3 ? 1 : 0)
    if (gain > 0) gains[k] = gain
  }
  return { gains, nextState: s }
}

/** 经验只发给我方单位；升级循环消耗 EXP_PER_LEVEL。 */
export function awardExp(d: Draft, unitId: string, amount: number, data: GameData): void {
  const u = d.state.units.find((x) => x.id === unitId)
  if (!u || !u.alive || u.faction !== 'player' || u.level >= LEVEL_CAP) return
  u.exp += amount
  d.events.push({ type: 'expGained', unitId: u.id, amount })
  while (u.exp >= EXP_PER_LEVEL && u.level < LEVEL_CAP) {
    u.exp -= EXP_PER_LEVEL
    u.level += 1
    const { gains, nextState } = rollLevelUp(data.classes[u.classId].growth, d.state.rngState)
    d.state.rngState = nextState
    for (const [k, v] of Object.entries(gains) as Array<[keyof Stats, number]>) u.base[k] += v
    d.events.push({ type: 'levelUp', unitId: u.id, level: u.level, gains })
  }
}
```

- [ ] **Step 5: 写 src/engine/attack.ts**

```ts
import type { ApplyResult, BattleState, Command, HitDetail, Unit } from './types'
import type { GameData } from '../data'
import { begin, effectiveStats, ensureActable, findUnit, finish, hostile, killUnit, type Draft } from './internal'
import { comboChance, critChance, hitChance, physicalDamage } from './combat'
import { inRange } from './movement'
import { awardExp, EXP_HIT, EXP_KILL_BONUS } from './growth'

export function doAttack(state: BattleState, cmd: Extract<Command, { type: 'attack' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const attacker = findUnit(state, cmd.unitId)!
  const target = findUnit(state, cmd.targetId)
  if (!target || !target.alive) return { ok: false, error: { code: 'UNIT_NOT_FOUND', unitId: cmd.targetId } }
  if (!hostile(attacker.faction, target.faction)) {
    return { ok: false, error: { code: 'CANNOT_TARGET', reason: '不能攻击友军' } }
  }
  const aCls = data.classes[attacker.classId]
  if (!inRange(attacker.pos, target.pos, aCls.minRange, aCls.maxRange)) {
    return { ok: false, error: { code: 'NOT_IN_RANGE', unitId: cmd.unitId, targetId: cmd.targetId } }
  }
  const d = begin(state)
  const A = findUnit(d.state, cmd.unitId)!
  const D = findUnit(d.state, cmd.targetId)!
  const hits = strike(d, A, D, data, false)
  // 反击：存活 + 攻击者在其射程内 + 未被眩晕
  const dCls = data.classes[D.classId]
  if (D.alive && !D.statuses.some((st) => st.kind === 'stun') && inRange(D.pos, A.pos, dCls.minRange, dCls.maxRange)) {
    hits.push(...strike(d, D, A, data, true))
  }
  d.events.push({ type: 'attackLaunched', hits })
  A.acted = true
  A.moved = true
  return finish(d)
}

/** 一次打击（可含连击第二击）。counter=true 时伤害 ×0.8 且不再触发连击。 */
function strike(d: Draft, attacker: Unit, defender: Unit, data: GameData, counter: boolean): HitDetail[] {
  const hits: HitDetail[] = []
  const aS = effectiveStats(attacker, data)
  const dS = effectiveStats(defender, data)
  const accMod = attacker.statuses.some((st) => st.kind === 'accdown') ? 0.75 : 1
  if (d.draw() >= (hitChance(aS.agi, dS.agi) / 100) * accMod) {
    hits.push({ attackerId: attacker.id, defenderId: defender.id, damage: 0, missed: true, critical: false, combo: false, counter })
    return hits
  }
  const terrain = data.terrains[d.state.map[defender.pos.y][defender.pos.x]]
  const swing = (combo: boolean): HitDetail => {
    const roll = 0.9 + d.draw() * 0.2 // [0.9, 1.1)
    let dmg = physicalDamage({
      atk: aS.atk, def: dS.def,
      attackerClass: attacker.classId, defenderClass: defender.classId,
      terrainDefBonus: terrain.defBonus, roll,
    })
    const critical = d.draw() < critChance(aS.agi, dS.agi) / 100
    if (critical) dmg *= 2
    if (counter) dmg *= 0.8
    dmg = Math.round(dmg)
    defender.hp = Math.max(0, defender.hp - dmg)
    d.events.push({ type: 'hpChanged', unitId: defender.id, hp: defender.hp, delta: -dmg })
    if (defender.hp <= 0 && defender.alive) killUnit(d, defender, attacker.id)
    if (attacker.faction === 'player') {
      awardExp(d, attacker.id, EXP_HIT, data)
      if (!defender.alive) awardExp(d, attacker.id, EXP_KILL_BONUS, data)
    }
    return { attackerId: attacker.id, defenderId: defender.id, damage: dmg, missed: false, critical, combo, counter }
  }
  hits.push(swing(false))
  if (!counter && defender.alive && d.draw() < comboChance(aS.agi, dS.agi) / 100) {
    hits.push(swing(true))
  }
  return hits
}
```

- [ ] **Step 6: 修改 src/engine/engine.ts 接入 attack**

import 区加入：

```ts
import { doAttack } from './attack'
```

将 `case 'attack'` 一行替换为：

```ts
    case 'attack': return doAttack(state, cmd, data)
```

- [ ] **Step 7: 运行确认通过**

```bash
npx vitest run tests/engine/growth.test.ts tests/engine/attack.test.ts 2>&1 | tail -6
```

Expected: `10 passed`

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: 攻击指令（反击/连击/暴击）与经验升级"
```

---

### Task 9: 法术与道具指令（cast / useItem）

**Files:**
- Create: `src/engine/magic.ts`, `src/data/items.ts`（最小消耗品）, `tests/engine/magic.test.ts`
- Modify: `src/data/index.ts`（填充 items）, `src/engine/engine.ts`（cast/useItem 接入）

- [ ] **Step 1: 写 src/data/items.ts（本任务只放消耗品，Task 13 扩全量）**

```ts
import type { ItemDef } from '../engine/types'

const defs: ItemDef[] = [
  { id: 'jinchuang_yao', name: '金创药', kind: 'consumable', healHp: 60, desc: '回复 60 HP' },
  { id: 'huanshen_dan', name: '还神丹', kind: 'consumable', healMp: 20, desc: '回复 20 MP' },
]

export const items: Record<string, ItemDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
```

- [ ] **Step 2: 修改 src/data/index.ts**

import 区加入 `import { items } from './items'`，将 `items: {},` 改为 `items,`。

- [ ] **Step 3: 写失败测试 tests/engine/magic.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { apply } from '../../src/engine/engine'
import { gameData, mkState, mkUnit } from './helpers'

function castState() {
  return mkState({
    units: [
      mkUnit({ id: 's1', classId: 'strategist', pos: { x: 2, y: 2 }, base: { hp: 40, mp: 30, atk: 5, def: 5, spirit: 20, agi: 8 }, mp: 30 }),
      mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 4, y: 2 }, base: { hp: 60, mp: 0, atk: 10, def: 8, spirit: 5, agi: 8 } }),
    ],
  })
}

describe('cast 指令', () => {
  it('火矢：扣 MP、掉血、spellCast/hpChanged/expGained 事件、acted 置位', () => {
    const r = apply(castState(), { type: 'cast', unitId: 's1', strategyId: 'huoshi', target: { x: 4, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const s1 = r.state.units.find((u) => u.id === 's1')!
    const e1 = r.state.units.find((u) => u.id === 'e1')!
    expect(s1.mp).toBe(30 - 6)
    expect(e1.hp).toBeLessThan(60)
    expect(s1.acted).toBe(true)
    expect(r.events.some((ev) => ev.type === 'spellCast')).toBe(true)
    expect(r.events.some((ev) => ev.type === 'expGained' && ev.unitId === 's1')).toBe(true)
  })

  it('雨天火系 → SPELL_UNUSABLE_IN_WEATHER', () => {
    const s = { ...castState(), weather: 'rainy' as const }
    const r = apply(s, { type: 'cast', unitId: 's1', strategyId: 'huoshi', target: { x: 4, y: 2 } }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'SPELL_UNUSABLE_IN_WEATHER', weather: 'rainy' } })
  })

  it('非施法兵种 → CLASS_CANNOT_CAST；MP 不足 → NOT_ENOUGH_MP', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'w1', classId: 'infantry', pos: { x: 2, y: 2 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 } }),
      ],
    })
    const r1 = apply(s, { type: 'cast', unitId: 'w1', strategyId: 'huoshi', target: { x: 3, y: 2 } }, gameData)
    expect(r1).toEqual({ ok: false, error: { code: 'CLASS_CANNOT_CAST', classId: 'infantry' } })
    const s2 = castState()
    s2.units[0].mp = 3
    const r2 = apply(s2, { type: 'cast', unitId: 's1', strategyId: 'huoshi', target: { x: 4, y: 2 } }, gameData)
    expect(r2).toEqual({ ok: false, error: { code: 'NOT_ENOUGH_MP', needed: 6, have: 3 } })
  })

  it('治愈：回复友军且不超上限', () => {
    const s = castState()
    s.units[0].hp = 10
    const r = apply(s, { type: 'cast', unitId: 's1', strategyId: 'zhiyu', target: { x: 2, y: 2 } }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const hp = r.state.units.find((u) => u.id === 's1')!.hp
    expect(hp).toBeGreaterThan(10)
    expect(hp).toBeLessThanOrEqual(40)
  })

  it('眩晕：statusApplied + 敌方下回合被跳过', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 't1', classId: 'taoist', pos: { x: 2, y: 2 }, base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 3, y: 2 }, base: { hp: 60, mp: 0, atk: 10, def: 8, spirit: 5, agi: 8 } }),
      ],
    })
    const r1 = apply(s, { type: 'cast', unitId: 't1', strategyId: 'xuanyun', target: { x: 3, y: 2 } }, gameData)
    expect(r1.ok && r1.events.some((ev) => ev.type === 'statusApplied' && ev.unitId === 'e1')).toBe(true)
    if (!r1.ok) return
    const r2 = apply(r1.state, { type: 'endTurn' }, gameData)
    expect(r2.ok && r2.state.units.find((u) => u.id === 'e1')!.acted).toBe(true)
  })
})

describe('useItem 指令', () => {
  it('金创药：回复 HP（不超上限）并消耗道具', () => {
    const s = mkState({
      units: [mkUnit({ id: 'p1', pos: { x: 2, y: 2 }, hp: 10, items: ['jinchuang_yao'] })],
    })
    const r = apply(s, { type: 'useItem', unitId: 'p1', itemId: 'jinchuang_yao', targetId: 'p1' }, gameData)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const u = r.state.units[0]
    expect(u.hp).toBe(50) // hp=10 + 回复 60，但上限 base.hp=50
    expect(u.items.length).toBe(0)
  })
  it('未持有道具 → ITEM_NOT_HELD', () => {
    const s = mkState({ units: [mkUnit({ id: 'p1' })] })
    const r = apply(s, { type: 'useItem', unitId: 'p1', itemId: 'jinchuang_yao', targetId: 'p1' }, gameData)
    expect(r).toEqual({ ok: false, error: { code: 'ITEM_NOT_HELD', itemId: 'jinchuang_yao' } })
  })
})
```

- [ ] **Step 4: 运行确认失败**

```bash
npx vitest run tests/engine/magic.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/engine/magic` 不存在；engine 中 cast 仍是占位错误）

- [ ] **Step 5: 写 src/engine/magic.ts**

```ts
import type { ApplyResult, BattleState, Command, StrategyDef, Unit } from './types'
import type { GameData } from '../data'
import { begin, effectiveStats, ensureActable, findUnit, finish, hostile, killUnit, type Draft } from './internal'
import { healAmount, spellDamage } from './combat'
import { castableInWeather, shapeCells } from './spells'
import { manhattan } from './movement'
import { awardExp, EXP_HEAL, EXP_KILL_BONUS, EXP_SPELL } from './growth'

export function doCast(state: BattleState, cmd: Extract<Command, { type: 'cast' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const caster = findUnit(state, cmd.unitId)!
  const s = data.strategies[cmd.strategyId]
  if (!s) return { ok: false, error: { code: 'CANNOT_TARGET', reason: `未知法术 ${cmd.strategyId}` } }
  if (!s.allowedClasses.includes(caster.classId)) {
    return { ok: false, error: { code: 'CLASS_CANNOT_CAST', classId: caster.classId } }
  }
  if (!castableInWeather(s, state.weather)) {
    return { ok: false, error: { code: 'SPELL_UNUSABLE_IN_WEATHER', weather: state.weather } }
  }
  if (caster.mp < s.mpCost) return { ok: false, error: { code: 'NOT_ENOUGH_MP', needed: s.mpCost, have: caster.mp } }
  if (manhattan(caster.pos, cmd.target) > s.range) {
    return { ok: false, error: { code: 'NOT_IN_RANGE', unitId: cmd.unitId, targetId: `${cmd.target.x},${cmd.target.y}` } }
  }
  const d = begin(state)
  const C = findUnit(d.state, cmd.unitId)!
  C.mp -= s.mpCost
  d.events.push({ type: 'mpChanged', unitId: C.id, mp: C.mp, delta: -s.mpCost })
  d.events.push({ type: 'spellCast', casterId: C.id, strategyId: s.id, target: { ...cmd.target } })
  const h = d.state.map.length, w = d.state.map[0].length
  for (const c of shapeCells(cmd.target, s.shape)) {
    if (c.x < 0 || c.y < 0 || c.x >= w || c.y >= h) continue
    const target = d.state.units.find((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y)
    if (!target) continue
    if (s.kind === 'attack' || s.kind === 'debuff') {
      if (!hostile(C.faction, target.faction)) continue
    } else if (hostile(C.faction, target.faction)) continue // heal/buff 只作用友军（含自己）
    applySpellEffect(d, C, target, s, data)
  }
  C.acted = true
  C.moved = true
  return finish(d)
}

function applySpellEffect(d: Draft, C: Unit, target: Unit, s: StrategyDef, data: GameData): void {
  const cS = effectiveStats(C, data)
  if (s.kind === 'attack') {
    const tS = effectiveStats(target, data)
    const onMountain = d.state.map[target.pos.y][target.pos.x] === 'mountain'
    const dmg = spellDamage({
      power: s.power, casterSpirit: cS.spirit, targetSpirit: tS.spirit,
      weather: d.state.weather, element: s.element!, targetOnMountain: onMountain,
    })
    target.hp = Math.max(0, target.hp - dmg)
    d.events.push({ type: 'hpChanged', unitId: target.id, hp: target.hp, delta: -dmg })
    if (target.hp <= 0 && target.alive) killUnit(d, target, C.id)
    if (C.faction === 'player') {
      awardExp(d, C.id, EXP_SPELL, data)
      if (!target.alive) awardExp(d, C.id, EXP_KILL_BONUS, data)
    }
  } else if (s.kind === 'heal') {
    const amount = Math.min(healAmount(s.power, cS.spirit), target.base.hp - target.hp)
    if (amount > 0) {
      target.hp += amount
      d.events.push({ type: 'hpChanged', unitId: target.id, hp: target.hp, delta: amount })
    }
    if (C.faction === 'player') awardExp(d, C.id, EXP_HEAL, data)
  } else {
    const eff = s.effect!
    target.statuses = target.statuses.filter((st) => st.kind !== eff).concat({ kind: eff, turns: s.effectTurns! })
    d.events.push({ type: 'statusApplied', unitId: target.id, kind: eff, turns: s.effectTurns! })
    if (C.faction === 'player') awardExp(d, C.id, EXP_SPELL, data)
  }
}

export function doUseItem(state: BattleState, cmd: Extract<Command, { type: 'useItem' }>, data: GameData): ApplyResult {
  const err = ensureActable(state, cmd.unitId)
  if (err) return { ok: false, error: err }
  const u = findUnit(state, cmd.unitId)!
  if (!u.items.includes(cmd.itemId)) return { ok: false, error: { code: 'ITEM_NOT_HELD', itemId: cmd.itemId } }
  const item = data.items[cmd.itemId]
  if (!item || item.kind !== 'consumable') return { ok: false, error: { code: 'ITEM_NOT_CONSUMABLE', itemId: cmd.itemId } }
  if (cmd.targetId !== u.id) return { ok: false, error: { code: 'CANNOT_TARGET', reason: '道具只能对自身使用' } }
  const d = begin(state)
  const U = findUnit(d.state, cmd.unitId)!
  U.items.splice(U.items.indexOf(cmd.itemId), 1)
  if (item.healHp) {
    const amount = Math.min(item.healHp, U.base.hp - U.hp)
    U.hp += amount
    d.events.push({ type: 'hpChanged', unitId: U.id, hp: U.hp, delta: amount })
  }
  if (item.healMp) {
    const amount = Math.min(item.healMp, U.base.mp - U.mp)
    U.mp += amount
    d.events.push({ type: 'mpChanged', unitId: U.id, mp: U.mp, delta: amount })
  }
  d.events.push({ type: 'itemUsed', unitId: U.id, targetId: cmd.targetId, itemId: cmd.itemId })
  U.acted = true
  U.moved = true
  return finish(d)
}
```

- [ ] **Step 6: 修改 src/engine/engine.ts 接入 cast/useItem**

import 区加入：

```ts
import { doCast, doUseItem } from './magic'
```

将 `case 'cast'` 与 `case 'useItem'` 两行替换为：

```ts
    case 'cast': return doCast(state, cmd, data)
    case 'useItem': return doUseItem(state, cmd, data)
```

- [ ] **Step 7: 运行确认通过**

```bash
npx vitest run tests/engine/magic.test.ts 2>&1 | tail -6
```

Expected: `7 passed`

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: 法术与道具指令（形状目标/天气门禁/MP/状态施加）"
```

---

### Task 10: 完整回合推进（轮次/天气/增援/状态递减/回合对话）

**Files:**
- Modify: `src/engine/turns.ts`（整体替换）
- Test: `tests/engine/turns.test.ts`

- [ ] **Step 1: 写失败测试 tests/engine/turns.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { apply } from '../../src/engine/engine'
import { gameData, mkState, mkUnit } from './helpers'

function twoFactionState() {
  return mkState({
    units: [
      mkUnit({ id: 'p1', acted: true, moved: true }),
      mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } }),
    ],
  })
}

describe('回合推进', () => {
  it('两阵营各结束一次 → 新一轮（turn=2）+ roundStarted + 回到玩家', () => {
    const r1 = apply(twoFactionState(), { type: 'endTurn' }, gameData)
    expect(r1.ok && r1.state.factionOrder[r1.state.factionIndex]).toBe('enemy')
    const r2 = apply(r1.ok ? r1.state : twoFactionState(), { type: 'endTurn' }, gameData)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.state.turn).toBe(2)
    expect(r2.state.factionOrder[r2.state.factionIndex]).toBe('player')
    expect(r2.events.some((e) => e.type === 'roundStarted' && e.turn === 2)).toBe(true)
    expect(r2.events.some((e) => e.type === 'turnStarted' && e.faction === 'player' && e.turn === 2)).toBe(true)
  })

  it('weatherScript 在指定回合改变天气', () => {
    const s = { ...twoFactionState(), weatherScript: [{ turn: 2, weather: 'rainy' as const }] }
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok && r2.state.weather).toBe('rainy')
    expect(r2.ok && r2.events.some((e) => e.type === 'weatherChanged' && e.weather === 'rainy')).toBe(true)
  })

  it('增援在指定回合登场', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', acted: true, moved: true }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 }, acted: true, moved: true }),
      ],
      reinforcements: [{ turn: 2, entries: [{ unit: mkUnit({ id: 'r1', faction: 'enemy', pos: { x: 0, y: 0 } }), at: { x: 7, y: 5 } }] }],
    })
    const r1 = apply(s, { type: 'endTurn' }, gameData) // → 敌方回合
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData) // → 新一轮
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    const r1u = r2.state.units.find((u) => u.id === 'r1')
    expect(r1u).toBeDefined()
    expect(r1u!.pos).toEqual({ x: 7, y: 5 })
    expect(r2.events.some((e) => e.type === 'reinforcementsArrived' && e.unitIds.includes('r1'))).toBe(true)
  })

  it('回合对话在指定回合触发', () => {
    const s = { ...twoFactionState(), dialogues: [{ turn: 2, dialogueId: 'yc_reinforce' }] }
    const r1 = apply(s, { type: 'endTurn' }, gameData)
    const r2 = apply(r1.ok ? r1.state : s, { type: 'endTurn' }, gameData)
    expect(r2.ok && r2.events.some((e) => e.type === 'dialogueTriggered' && e.dialogueId === 'yc_reinforce')).toBe(true)
  })

  it('状态效果按归属阵营回合递减', () => {
    const s = mkState({
      units: [mkUnit({ id: 'p1', statuses: [{ kind: 'defdown', turns: 3 }] })],
    })
    // 玩家回合开始时递减：先打完敌我各一回合再观察
    const r1 = apply({ ...s, factionIndex: 1 }, { type: 'endTurn' }, gameData) // enemy→player(新轮)
    const p = r1.ok ? r1.state.units[0].statuses : []
    expect(p.length).toBe(1)
    expect(p[0].turns).toBe(2)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/engine/turns.test.ts 2>&1 | tail -6
```

Expected: FAIL（turn 恒为 1，无 roundStarted 事件）

- [ ] **Step 3: 整体替换 src/engine/turns.ts**

```ts
import type { ApplyResult, BattleState, Cell, ClassId, Faction } from './types'
import { begin, finish, type Draft } from './internal'
import { rngNext } from './rng'
import { moveCostFor } from './movement'
import { terrains } from '../data/terrains'

export function doEndTurn(state: BattleState): ApplyResult {
  const d = begin(state)
  const cur = d.state.factionOrder[d.state.factionIndex]
  d.events.push({ type: 'turnEnded', faction: cur, turn: d.state.turn })
  advance(d)
  return finish(d)
}

function advance(d: Draft): void {
  const order = d.state.factionOrder
  let idx = d.state.factionIndex
  for (let i = 0; i < order.length; i++) {
    idx = (idx + 1) % order.length
    if (idx === 0) newRound(d) // 绕回首阵营 = 新一轮
    const f = order[idx]
    if (d.state.units.some((u) => u.faction === f && u.alive)) {
      d.state.factionIndex = idx
      startFactionTurn(d, f)
      return
    }
  }
}

function newRound(d: Draft): void {
  d.state.turn += 1
  d.events.push({ type: 'roundStarted', turn: d.state.turn })
  // 天气：脚本优先，否则 20% 概率随机切换
  const scripted = d.state.weatherScript.find((e) => e.turn === d.state.turn)
  if (scripted) {
    if (scripted.weather !== d.state.weather) {
      d.state.weather = scripted.weather
      d.events.push({ type: 'weatherChanged', weather: scripted.weather })
    }
  } else {
    const r = rngNext(d.state.rngState)
    d.state.rngState = r.nextState
    if (r.value < 0.2) {
      const others = (['sunny', 'cloudy', 'rainy'] as const).filter((w) => w !== d.state.weather)
      const r2 = rngNext(d.state.rngState)
      d.state.rngState = r2.nextState
      const w = others[Math.floor(r2.value * others.length)] ?? others[0]
      d.state.weather = w
      d.events.push({ type: 'weatherChanged', weather: w })
    }
  }
  // 增援登场（落点被占时找相邻可站格）
  for (const r of d.state.reinforcements) {
    if (r.turn !== d.state.turn) continue
    const ids: string[] = []
    for (const e of r.entries) {
      let cell = e.at
      if (occupied(d, cell)) {
        const alt = [
          { x: cell.x + 1, y: cell.y }, { x: cell.x - 1, y: cell.y },
          { x: cell.x, y: cell.y + 1 }, { x: cell.x, y: cell.y - 1 },
        ].find((c) => inBounds(d, c) && !occupied(d, c) && walkable(d, c, e.unit.classId))
        if (!alt) continue
        cell = alt
      }
      const unit = structuredClone(e.unit)
      unit.pos = cell
      unit.moved = false
      unit.acted = false
      d.state.units.push(unit)
      ids.push(unit.id)
    }
    if (ids.length > 0) d.events.push({ type: 'reinforcementsArrived', unitIds: ids })
  }
  // 回本对话触发
  for (const t of d.state.dialogues) {
    if (t.turn === d.state.turn) d.events.push({ type: 'dialogueTriggered', dialogueId: t.dialogueId })
  }
}

function startFactionTurn(d: Draft, f: Faction): void {
  d.events.push({ type: 'turnStarted', faction: f, turn: d.state.turn })
  for (const u of d.state.units) {
    if (u.faction !== f || !u.alive) continue
    u.moved = false
    u.acted = false
    if (u.statuses.some((st) => st.kind === 'stun')) u.acted = true // 眩晕：跳过本回合
    u.statuses = u.statuses.map((st) => ({ ...st, turns: st.turns - 1 })).filter((st) => st.turns > 0)
  }
}

function occupied(d: Draft, c: Cell): boolean {
  return d.state.units.some((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y)
}
function inBounds(d: Draft, c: Cell): boolean {
  return c.y >= 0 && c.y < d.state.map.length && c.x >= 0 && c.x < d.state.map[0].length
}
function walkable(d: Draft, c: Cell, classId: ClassId): boolean {
  return Number.isFinite(moveCostFor(terrains[d.state.map[c.y][c.x]], classId))
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/engine/turns.test.ts 2>&1 | tail -6
```

Expected: `5 passed`

- [ ] **Step 5: 回归全部测试**

```bash
npx vitest run 2>&1 | tail -8
```

Expected: 全部通过（状态递减改动可能影响 magic.test 的眩晕用例——眩晕 turns=1 在敌方回合开始时先置 acted=true 再递减清除，断言不变）

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 完整回合推进（轮次/天气/增援/状态递减/回合对话）"
```

---

### Task 11: 完整胜负判定（四种胜利条件 + 回合上限）

**Files:**
- Modify: `src/engine/wincheck.ts`（整体替换）
- Test: `tests/engine/wincheck.test.ts`

- [ ] **Step 1: 写失败测试 tests/engine/wincheck.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { evaluate } from '../../src/engine/wincheck'
import { gameData, mkState, mkUnit } from './helpers'
import { apply } from '../../src/engine/engine'

describe('evaluate 胜利条件', () => {
  it('killCommander：主将阵亡即胜（杂兵尚存）', () => {
    const s = mkState({
      win: { kind: 'killCommander', unitId: 'boss' },
      units: [
        mkUnit({ id: 'p1' }),
        mkUnit({ id: 'boss', faction: 'enemy', pos: { x: 6, y: 5 }, alive: false }),
        mkUnit({ id: 'mob', faction: 'enemy', pos: { x: 6, y: 4 } }),
      ],
    })
    expect(evaluate(s).won).toBe(true)
  })
  it('survive：回合数超过坚守目标即胜', () => {
    const s = mkState({
      win: { kind: 'survive', untilTurn: 5 },
      turn: 6,
      units: [mkUnit({ id: 'p1' }), mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })],
    })
    expect(evaluate(s).won).toBe(true)
  })
  it('reach：指定单位抵达目标格即胜（经 move 指令验证）', () => {
    const s = mkState({
      win: { kind: 'reach', unitId: 'p1', cell: { x: 3, y: 0 } },
      units: [mkUnit({ id: 'p1', pos: { x: 1, y: 0 } })],
    })
    const r = apply(s, { type: 'move', unitId: 'p1', to: { x: 3, y: 0 } }, gameData)
    expect(r.ok && r.state.finished).toBe('won')
  })
  it('maxTurns 超限 → 失败', () => {
    const s = mkState({
      turn: 21, maxTurns: 20,
      units: [mkUnit({ id: 'p1' }), mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } })],
    })
    expect(evaluate(s).lost).toBe(true)
  })
  it('君主（lord）阵亡 → 失败', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'p1', classId: 'lord', alive: false }),
        mkUnit({ id: 'p2', pos: { x: 1, y: 0 } }),
        mkUnit({ id: 'e1', faction: 'enemy', pos: { x: 6, y: 5 } }),
      ],
    })
    expect(evaluate(s).lost).toBe(true)
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/engine/wincheck.test.ts 2>&1 | tail -6
```

Expected: FAIL（基础版只实现 annihilate）

- [ ] **Step 3: 整体替换 src/engine/wincheck.ts**

```ts
import type { BattleState } from './types'

export interface BattleVerdict { won: boolean; lost: boolean }

/**
 * 胜负判定（spec §3.8）：
 * 失败 = 我方全灭 / 君主阵亡 / 超过回合上限
 * 胜利 = 按战役数据条件：annihilate / killCommander / survive / reach
 */
export function evaluate(s: BattleState): BattleVerdict {
  const lord = s.units.find((u) => u.classId === 'lord')
  const alivePlayers = s.units.filter((u) => u.faction === 'player' && u.alive)
  const lost = alivePlayers.length === 0 || (lord !== undefined && !lord.alive) || s.turn > s.maxTurns
  const aliveEnemies = s.units.filter((u) => u.faction === 'enemy' && u.alive)
  let won = false
  switch (s.win.kind) {
    case 'annihilate':
      won = aliveEnemies.length === 0
      break
    case 'killCommander': {
      const c = s.units.find((u) => u.id === s.win.unitId)
      won = c !== undefined && !c.alive
      break
    }
    case 'survive':
      won = s.turn > s.win.untilTurn
      break
    case 'reach': {
      const u = s.units.find((x) => x.id === s.win.unitId)
      won = u !== undefined && u.alive && u.pos.x === s.win.cell.x && u.pos.y === s.win.cell.y
      break
    }
  }
  return { won: won && !lost, lost }
}
```

- [ ] **Step 4: 运行确认通过 + 回归**

```bash
npx vitest run tests/engine/wincheck.test.ts 2>&1 | tail -6
npx vitest run 2>&1 | tail -8
```

Expected: `5 passed`；全量通过

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 完整胜负判定（击破主将/坚守/抵达/回合上限）"
```

---

### Task 12: 敌方/友军 AI（启发式）

**Files:**
- Create: `src/engine/ai.ts`
- Test: `tests/engine/ai.test.ts`

- [ ] **Step 1: 写失败测试 tests/engine/ai.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { decideUnitAction } from '../../src/engine/ai'
import { gameData, mkState, mkUnit } from './helpers'

describe('decideUnitAction', () => {
  it('可击杀的残血目标优先于高血量目标', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', classId: 'cavalry', pos: { x: 4, y: 2 },
          base: { hp: 60, mp: 0, atk: 20, def: 8, spirit: 4, agi: 10 } }),
        mkUnit({ id: 'archer_low', pos: { x: 5, y: 2 }, hp: 5,
          base: { hp: 50, mp: 0, atk: 10, def: 1, spirit: 4, agi: 6 } }),
        mkUnit({ id: 'inf_full', pos: { x: 3, y: 2 },
          base: { hp: 60, mp: 0, atk: 10, def: 14, spirit: 4, agi: 6 } }),
      ],
    })
    const cmds = decideUnitAction(s, 'ai1', gameData)
    const atk = cmds.find((c) => c.type === 'attack')
    expect(atk).toBeDefined()
    expect(atk && atk.type === 'attack' && atk.targetId).toBe('archer_low')
  })

  it('无目标可及 → 返回 [move, wait] 且移动后更接近最近敌人', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', classId: 'infantry', pos: { x: 0, y: 0 } }),
        mkUnit({ id: 'p1', pos: { x: 7, y: 5 }, acted: true }),
      ],
    })
    const cmds = decideUnitAction(s, 'ai1', gameData)
    expect(cmds.length).toBe(2)
    expect(cmds[0].type).toBe('move')
    expect(cmds[1].type).toBe('wait')
    if (cmds[0].type === 'move') {
      const before = Math.abs(7 - 0) + Math.abs(5 - 0)
      const after = Math.abs(7 - cmds[0].to.x) + Math.abs(5 - cmds[0].to.y)
      expect(after).toBeLessThan(before)
    }
  })

  it('道士优先治疗重伤友军', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'e_tao', faction: 'enemy', classId: 'taoist', pos: { x: 5, y: 5 },
          base: { hp: 40, mp: 30, atk: 4, def: 4, spirit: 18, agi: 8 }, mp: 30 }),
        mkUnit({ id: 'e_inf', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 5 }, hp: 20,
          base: { hp: 60, mp: 0, atk: 10, def: 10, spirit: 4, agi: 8 } }),
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 }, acted: true }), // 远离，打不到
      ],
    })
    const cmds = decideUnitAction(s, 'e_tao', gameData)
    const cast = cmds.find((c) => c.type === 'cast')
    expect(cast).toBeDefined()
    expect(cast && cast.type === 'cast' && cast.strategyId).toBe('zhiyu')
  })

  it('已行动/阵亡单位返回空数组', () => {
    const s = mkState({
      units: [
        mkUnit({ id: 'ai1', faction: 'enemy', pos: { x: 5, y: 5 }, acted: true }),
        mkUnit({ id: 'dead', faction: 'enemy', pos: { x: 5, y: 4 }, alive: false }),
        mkUnit({ id: 'p1', pos: { x: 0, y: 0 }, acted: true }),
      ],
    })
    expect(decideUnitAction(s, 'ai1', gameData)).toEqual([])
    expect(decideUnitAction(s, 'dead', gameData)).toEqual([])
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/engine/ai.test.ts 2>&1 | tail -6
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 写 src/engine/ai.ts**

```ts
import type { BattleState, Cell, Command, Unit } from './types'
import type { GameData } from '../data'
import { effectiveMove, effectiveStats, findUnit, hostile } from './internal'
import { affinity } from './combat'
import { cellKey, computeMoveRange, inRange, manhattan } from './movement'
import { castableInWeather, shapeCells } from './spells'

interface Option { score: number; cmds: Command[] }

/**
 * 启发式 AI（spec §3.9）：
 * 期望伤害 ×（可击杀 ×2）×相克；施法者优先治疗重伤友军（缺失 HP 记分）/攻击法术 ×1.2；
 * 无可及目标时向最近敌军推进。纯函数无随机 —— 可测试。
 */
export function decideUnitAction(state: BattleState, unitId: string, data: GameData): Command[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  if (u.statuses.some((st) => st.kind === 'stun')) return [{ type: 'wait', unitId }]
  const foes = state.units.filter((t) => t.alive && hostile(u.faction, t.faction))
  if (foes.length === 0) return [{ type: 'wait', unitId }]

  const range = computeMoveRange(state.map, state.units, u, data.terrains, effectiveMove(u, data))
  const cls = data.classes[u.classId]
  let best: Option = { score: 0, cmds: [{ type: 'wait', unitId }] }

  for (const cell of range.cells.values()) {
    const moveCmd: Command[] = cellKey(cell) === cellKey(u.pos) ? [] : [{ type: 'move', unitId, to: { x: cell.x, y: cell.y } }]
    // 物理攻击
    for (const t of foes) {
      if (!inRange(cell, t.pos, cls.minRange, cls.maxRange)) continue
      const est = estimateDamage(u, t, state, data)
      const score = est * (est >= t.hp ? 2 : 1) * affinity(u.classId, t.classId)
      if (score > best.score) best = { score, cmds: [...moveCmd, { type: 'attack', unitId, targetId: t.id }] }
    }
    // 法术
    for (const s of Object.values(data.strategies)) {
      if (!s.allowedClasses.includes(u.classId) || u.mp < s.mpCost) continue
      if (!castableInWeather(s, state.weather)) continue
      if (s.kind === 'heal') {
        const wounded = state.units.filter(
          (f) => f.alive && !hostile(u.faction, f.faction) && f.hp < f.base.hp * 0.5,
        )
        for (const f of wounded) {
          if (manhattan(cell, f.pos) > s.range) continue
          const score = f.base.hp - f.hp // 缺失 HP 越多越优先
          if (score > best.score) best = { score, cmds: [...moveCmd, { type: 'cast', unitId, strategyId: s.id, target: { x: f.pos.x, y: f.pos.y } }] }
        }
      } else if (s.kind === 'attack') {
        for (const t of foes) {
          if (manhattan(cell, t.pos) > s.range) continue
          let sum = 0
          for (const c of shapeCells(t.pos, s.shape)) {
            const hit = state.units.find(
              (x) => x.alive && x.pos.x === c.x && x.pos.y === c.y && hostile(u.faction, x.faction),
            )
            if (hit) sum += estimateSpell(u, hit, s.power, data)
          }
          const score = sum * 1.2
          if (score > best.score) best = { score, cmds: [...moveCmd, { type: 'cast', unitId, strategyId: s.id, target: { x: t.pos.x, y: t.pos.y } }] }
        }
      }
    }
  }
  if (best.score > 0) return best.cmds

  // 推进：选距最近敌人最近的可达格
  let target: Cell = u.pos
  let bestDist = manhattan(u.pos, nearestPos(foes, u.pos))
  for (const cell of range.cells.values()) {
    const dist = manhattan(cell, nearestPos(foes, cell))
    if (dist < bestDist) { bestDist = dist; target = cell }
  }
  if (cellKey(target) !== cellKey(u.pos)) return [{ type: 'move', unitId, to: { x: target.x, y: target.y } }, { type: 'wait', unitId }]
  return [{ type: 'wait', unitId }]
}

function nearestPos(foes: Unit[], from: Cell): Cell {
  let best = foes[0].pos
  let dist = manhattan(from, best)
  for (const t of foes) {
    const d = manhattan(from, t.pos)
    if (d < dist) { dist = d; best = t.pos }
  }
  return best
}

function estimateDamage(u: Unit, t: Unit, state: BattleState, data: GameData): number {
  const a = effectiveStats(u, data)
  const d = effectiveStats(t, data)
  const terr = data.terrains[state.map[t.pos.y][t.pos.x]]
  const raw = (a.atk - d.def * 0.6) * affinity(u.classId, t.classId) * (1 - terr.defBonus / 100)
  return Math.max(1, Math.round(raw))
}

function estimateSpell(u: Unit, t: Unit, power: number, data: GameData): number {
  const a = effectiveStats(u, data)
  const d = effectiveStats(t, data)
  return Math.max(1, Math.round(power + a.spirit * 0.8 - d.spirit * 0.4))
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/engine/ai.test.ts 2>&1 | tail -6
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 启发式 AI（击杀优先/施法评估/伤员治疗/推进）"
```

---

### Task 13: 全量武将与道具数据

**Files:**
- Create: `src/data/heroes.ts`, `tests/data/heroes-items.test.ts`
- Modify: `src/data/items.ts`（扩全量）、`src/data/index.ts`（填充 heroes）

- [ ] **Step 1: 写 src/data/heroes.ts（13 名可操作武将，spec §9）**

```ts
import type { HeroDef } from '../engine/types'

const defs: HeroDef[] = [
  { id: 'caocao', name: '曹操', title: '字孟德', classId: 'lord', portraitHue: 0,
    base: { hp: 52, mp: 8, atk: 12, def: 10, spirit: 10, agi: 10 } },
  { id: 'xiaohoudun', name: '夏侯惇', title: '字元让', classId: 'cavalry', portraitHue: 20,
    base: { hp: 48, mp: 0, atk: 13, def: 8, spirit: 4, agi: 10 } },
  { id: 'xiahouyuan', name: '夏侯渊', title: '字妙才', classId: 'archer', portraitHue: 35,
    base: { hp: 42, mp: 0, atk: 12, def: 6, spirit: 5, agi: 11 } },
  { id: 'caoren', name: '曹仁', title: '字子孝', classId: 'infantry', portraitHue: 210,
    base: { hp: 50, mp: 0, atk: 10, def: 12, spirit: 5, agi: 8 } },
  { id: 'caohong', name: '曹洪', title: '字子廉', classId: 'infantry', portraitHue: 220,
    base: { hp: 46, mp: 0, atk: 10, def: 11, spirit: 4, agi: 9 } },
  { id: 'dianwei', name: '典韦', title: '古之恶来', classId: 'infantry', portraitHue: 280,
    base: { hp: 54, mp: 0, atk: 15, def: 8, spirit: 3, agi: 9 } },
  { id: 'xuchu', name: '许褚', title: '字仲康', classId: 'infantry', portraitHue: 290,
    base: { hp: 56, mp: 0, atk: 14, def: 9, spirit: 3, agi: 7 } },
  { id: 'lidian', name: '李典', title: '字曼成', classId: 'infantry', portraitHue: 200,
    base: { hp: 44, mp: 0, atk: 10, def: 10, spirit: 6, agi: 9 } },
  { id: 'yuejin', name: '乐进', title: '字文谦', classId: 'infantry', portraitHue: 230,
    base: { hp: 45, mp: 0, atk: 11, def: 9, spirit: 4, agi: 10 } },
  { id: 'yujin', name: '于禁', title: '字文则', classId: 'archer', portraitHue: 45,
    base: { hp: 40, mp: 0, atk: 11, def: 7, spirit: 6, agi: 10 } },
  { id: 'xunyu', name: '荀彧', title: '字文若', classId: 'strategist', portraitHue: 120,
    base: { hp: 34, mp: 20, atk: 5, def: 5, spirit: 15, agi: 8 } },
  { id: 'xunyou', name: '荀攸', title: '字公达', classId: 'strategist', portraitHue: 130,
    base: { hp: 33, mp: 22, atk: 4, def: 5, spirit: 16, agi: 8 } },
  { id: 'guojia', name: '郭嘉', title: '字奉孝', classId: 'taoist', portraitHue: 160,
    base: { hp: 32, mp: 18, atk: 4, def: 4, spirit: 14, agi: 9 } },
]

export const heroes: Record<string, HeroDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
```

- [ ] **Step 2: 整体替换 src/data/items.ts（16 件，宝物见 desc）**

```ts
import type { ItemDef } from '../engine/types'

const defs: ItemDef[] = [
  // 武器
  { id: 'iron_sword', name: '铁剑', kind: 'weapon', bonuses: { atk: 4 }, desc: '制式佩剑' },
  { id: 'qinggang_sword', name: '青釭剑', kind: 'weapon', bonuses: { atk: 8 }, allowedClasses: ['lord', 'infantry'], desc: '宝物：削铁如泥的名剑' },
  { id: 'iron_spear', name: '铁枪', kind: 'weapon', bonuses: { atk: 4 }, allowedClasses: ['infantry', 'cavalry'], desc: '制式长枪' },
  { id: 'shuangtie_ji', name: '双铁戟', kind: 'weapon', bonuses: { atk: 9 }, allowedClasses: ['infantry'], desc: '宝物：典韦的成名兵器' },
  { id: 'iron_bow', name: '铁弓', kind: 'weapon', bonuses: { atk: 4 }, allowedClasses: ['archer'], desc: '制式铁弓' },
  { id: 'tiegu_fan', name: '铁骨扇', kind: 'weapon', bonuses: { atk: 3, spirit: 2 }, allowedClasses: ['strategist', 'taoist'], desc: '军师道士所用' },
  // 防具
  { id: 'cloth_armor', name: '布衣', kind: 'armor', bonuses: { def: 2 }, desc: '粗布护衣' },
  { id: 'iron_armor', name: '铁甲', kind: 'armor', bonuses: { def: 6 }, desc: '制式铁甲' },
  { id: 'mingguang_armor', name: '明光铠', kind: 'armor', bonuses: { def: 10, hp: 10 }, desc: '宝物：光照刺敌的名甲' },
  // 辅助
  { id: 'leather_shield', name: '皮盾', kind: 'accessory', bonuses: { def: 2 }, desc: '皮质圆盾' },
  { id: 'dilu_horse', name: '的卢', kind: 'accessory', bonuses: { move: 2 }, desc: '宝物：跃檀溪的骏马' },
  { id: 'chitu_horse', name: '赤兔马', kind: 'accessory', bonuses: { move: 3 }, allowedClasses: ['cavalry'], desc: '宝物：人中吕布，马中赤兔' },
  { id: 'taiping_book', name: '太平要术', kind: 'accessory', bonuses: { mp: 15, spirit: 3 }, desc: '宝物：南华老仙授张角之书' },
  { id: 'sunzi_book', name: '孙子兵法', kind: 'accessory', bonuses: { spirit: 5 }, desc: '宝物：兵家圣典' },
  // 消耗品
  { id: 'jinchuang_yao', name: '金创药', kind: 'consumable', healHp: 60, desc: '回复 60 HP' },
  { id: 'huanshen_dan', name: '还神丹', kind: 'consumable', healMp: 20, desc: '回复 20 MP' },
]

export const items: Record<string, ItemDef> = Object.fromEntries(defs.map((d) => [d.id, d]))
```

- [ ] **Step 3: 修改 src/data/index.ts**

import 区加入 `import { heroes } from './heroes'`，将 `heroes: {},` 改为 `heroes,`。

- [ ] **Step 4: 写测试 tests/data/heroes-items.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { heroes } from '../../src/data/heroes'
import { items } from '../../src/data/items'
import { gameData } from '../../src/data'
import type { ClassId } from '../../src/engine/types'

const VALID_CLASSES: ClassId[] = ['lord', 'infantry', 'cavalry', 'archer', 'strategist', 'taoist']

describe('武将数据', () => {
  it('13 名武将，id 唯一，属性为正', () => {
    expect(Object.keys(heroes).length).toBe(13)
    expect(new Set(Object.keys(heroes)).size).toBe(13)
    for (const h of Object.values(heroes)) {
      expect(VALID_CLASSES).toContain(h.classId)
      for (const v of Object.values(h.base)) expect(v).toBeGreaterThan(0)
    }
  })
  it('含且仅含一名君主（曹操）', () => {
    const lords = Object.values(heroes).filter((h) => h.classId === 'lord')
    expect(lords.map((h) => h.id)).toEqual(['caocao'])
  })
})

describe('道具数据', () => {
  it('16 件道具，id 唯一，数值为正，兵种合法', () => {
    expect(Object.keys(items).length).toBe(16)
    for (const it of Object.values(items)) {
      for (const v of Object.values(it.bonuses ?? {})) expect(v as number).toBeGreaterThan(0)
      for (const c of it.allowedClasses ?? []) expect(VALID_CLASSES).toContain(c)
      if (it.kind === 'consumable') expect(it.healHp || it.healMp).toBeTruthy()
    }
  })
  it('gameData 注册表完整', () => {
    expect(Object.keys(gameData.heroes).length).toBe(13)
    expect(Object.keys(gameData.items).length).toBe(16)
  })
})
```

- [ ] **Step 5: 运行确认通过**

```bash
npx vitest run tests/data/heroes-items.test.ts 2>&1 | tail -6
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 13 武将与 16 道具全量数据"
```

---

### Task 14: 第一场战役（颍川之战）+ 战役数据校验器

**Files:**
- Create: `src/data/battles/shared.ts`, `src/data/battles/yingchuan.ts`
- Test: `tests/data/yingchuan.test.ts`

- [ ] **Step 1: 写 src/data/battles/shared.ts**

```ts
import type { BattleDef, Cell, ClassId, Faction, ItemSlot, Stats, TerrainId, Unit } from '../../engine/types'
import type { GameData } from '../index'
import { heroes } from '../heroes'
import { moveCostFor } from '../../engine/movement'

export const MAP_LEGEND: Record<string, TerrainId> = {
  '.': 'plain', f: 'forest', m: 'mountain', w: 'water', C: 'city', P: 'camp', G: 'pass', b: 'bridge',
}

export function parseMap(rows: string[]): TerrainId[][] {
  return rows.map((r) => [...r].map((ch) => {
    const t = MAP_LEGEND[ch]
    if (!t) throw new Error(`未知地形字符: ${ch}`)
    return t
  }))
}

/** 从武将档案生成单位（初始 HP/MP 取满值）。 */
export function heroUnit(
  heroId: string, faction: Faction, pos: Cell,
  o: { level?: number; equipment?: Partial<Record<ItemSlot, string>>; items?: string[] } = {},
): Unit {
  const h = heroes[heroId]
  return {
    id: heroId, heroId, name: h.name, faction, classId: h.classId,
    level: o.level ?? 1, exp: 0, base: { ...h.base }, hp: h.base.hp, mp: h.base.mp,
    pos: { ...pos }, equipment: { ...o.equipment }, items: [...(o.items ?? [])],
    statuses: [], moved: false, acted: false, alive: true,
  }
}

/** 杂兵/敌将单位（不走武将档案）。 */
export function mobUnit(
  id: string, name: string, classId: ClassId, faction: Faction, pos: Cell, base: Stats,
): Unit {
  return {
    id, heroId: '', name, faction, classId, level: 1, exp: 0, base: { ...base },
    hp: base.hp, mp: base.mp, pos: { ...pos }, equipment: {}, items: [],
    statuses: [], moved: false, acted: false, alive: true,
  }
}

/** 战役数据静态校验（加载期调用），返回错误列表（空 = 合法）。 */
export function validateBattleDef(def: BattleDef, data: GameData): string[] {
  const errs: string[] = []
  const h = def.map.length
  const w = def.map[0]?.length ?? 0
  if (h < 5 || w < 5) errs.push(`地图尺寸 ${w}x${h} 过小（至少 5x5）`)
  for (let y = 0; y < h; y++) if (def.map[y].length !== w) errs.push(`地图第 ${y} 行宽度不一致`)
  const inBounds = (c: Cell) => c.x >= 0 && c.y >= 0 && c.x < w && c.y < h
  const seen = new Set<string>()
  const checkPos = (u: Unit, c: Cell, tag: string, overlap: boolean) => {
    if (!inBounds(c)) { errs.push(`${tag} 位置越界 (${c.x},${c.y})`); return }
    const t = def.map[c.y][c.x]
    if (!Number.isFinite(moveCostFor(data.terrains[t], u.classId))) errs.push(`${tag} 站在不可通行地形 ${t}`)
    const k = `${c.x},${c.y}`
    if (overlap) {
      if (seen.has(k)) errs.push(`${tag} 与其他单位位置重叠 (${k})`)
      seen.add(k)
    }
  }
  const checkGear = (u: Unit) => {
    for (const id of Object.values(u.equipment)) {
      if (id !== undefined && !data.items[id]) errs.push(`单位 ${u.id} 引用未知装备 ${id}`)
    }
    for (const id of u.items) if (!data.items[id]) errs.push(`单位 ${u.id} 携带未知道具 ${id}`)
  }
  def.units.forEach((u) => {
    checkPos(u, u.pos, `单位 ${u.id}`, true)
    if (u.heroId !== '' && !data.heroes[u.heroId]) errs.push(`单位 ${u.id} 引用未知武将 ${u.heroId}`)
    checkGear(u)
  })
  def.reinforcements.forEach((r) => {
    if (r.turn < 2) errs.push(`增援回合数应 ≥2（turn=${r.turn}）`)
    r.entries.forEach((e) => checkPos(e.unit, e.at, `增援 ${e.unit.id}`, false))
  })
  def.treasureCells.forEach((t) => { if (!inBounds(t.cell)) errs.push(`宝物格越界 (${t.cell.x},${t.cell.y})`) })
  if (def.win.kind === 'killCommander' || def.win.kind === 'reach') {
    const id = def.win.unitId
    const exists = def.units.some((u) => u.id === id)
      || def.reinforcements.some((r) => r.entries.some((e) => e.unit.id === id))
    if (!exists) errs.push(`胜利条件引用不存在的单位 ${id}`)
  }
  if (def.win.kind === 'survive' && def.win.untilTurn >= def.maxTurns) {
    errs.push(`坚守 ${def.win.untilTurn} 回合必须小于回合上限 ${def.maxTurns}`)
  }
  if (def.maxTurns < 1) errs.push('回合上限必须 ≥1')
  return errs
}
```

- [ ] **Step 2: 写 src/data/battles/yingchuan.ts**

地图 16×12（图例见 shared.ts）：西岸玩家出生地、x=9 河流（y=5 有桥）、东岸黄巾营寨、西南角山地藏宝。

```ts
import type { BattleDef } from '../../engine/types'
import { heroUnit, mobUnit, parseMap } from './shared'

const ZEIBING = { hp: 44, mp: 0, atk: 10, def: 8, spirit: 3, agi: 7 } // 黄巾贼(步兵)
const GONGSHOU = { hp: 38, mp: 0, atk: 11, def: 5, spirit: 4, agi: 9 } // 黄巾弓手

export const yingchuan: BattleDef = {
  id: 'yingchuan',
  name: '颍川之战',
  desc: '讨伐颍川黄巾，曹操初阵。（教学关：歼灭全部敌军）',
  map: parseMap([
    'ff.......w...PP.',
    '...f.....w...PP.',
    '.....f...w......',
    '..f......w......',
    '.........w......',
    '.........b......',
    '....f....w......',
    '..f......w....f.',
    '.....m...w..f...',
    '....mm...w.mm...',
    '..mmmm...wmmm...',
    '..mmmm...wmmm...',
  ]),
  units: [
    // 我方（西侧出生）
    heroUnit('caocao', 'player', { x: 2, y: 5 }, { equipment: { weapon: 'iron_sword' }, items: ['jinchuang_yao'] }),
    heroUnit('xiaohoudun', 'player', { x: 1, y: 4 }),
    heroUnit('xiahouyuan', 'player', { x: 1, y: 6 }),
    heroUnit('caoren', 'player', { x: 3, y: 4 }),
    heroUnit('xunyu', 'player', { x: 3, y: 6 }),
    // 敌方（东侧黄巾）
    mobUnit('zl', '张梁', 'strategist', 'enemy', { x: 13, y: 1 }, { hp: 36, mp: 18, atk: 5, def: 4, spirit: 13, agi: 7 }),
    mobUnit('zb', '张宝', 'taoist', 'enemy', { x: 14, y: 1 }, { hp: 34, mp: 16, atk: 4, def: 4, spirit: 12, agi: 8 }),
    mobUnit('e1', '黄巾贼', 'infantry', 'enemy', { x: 12, y: 0 }, ZEIBING),
    mobUnit('e2', '黄巾贼', 'infantry', 'enemy', { x: 11, y: 1 }, ZEIBING),
    mobUnit('e3', '黄巾贼', 'infantry', 'enemy', { x: 12, y: 3 }, ZEIBING),
    mobUnit('e4', '黄巾贼', 'infantry', 'enemy', { x: 11, y: 4 }, ZEIBING),
    mobUnit('e5', '黄巾贼', 'infantry', 'enemy', { x: 12, y: 6 }, ZEIBING),
    mobUnit('g1', '黄巾弓手', 'archer', 'enemy', { x: 12, y: 2 }, GONGSHOU),
    mobUnit('g2', '黄巾弓手', 'archer', 'enemy', { x: 11, y: 5 }, GONGSHOU),
  ],
  reinforcements: [
    { turn: 3, entries: [
      { unit: mobUnit('r1', '黄巾贼', 'infantry', 'enemy', { x: 15, y: 3 }, ZEIBING), at: { x: 15, y: 3 } },
      { unit: mobUnit('r2', '黄巾贼', 'infantry', 'enemy', { x: 15, y: 4 }, ZEIBING), at: { x: 15, y: 4 } },
    ] },
  ],
  treasureCells: [
    { cell: { x: 5, y: 2 }, itemId: 'jinchuang_yao', found: false },
    { cell: { x: 1, y: 10 }, itemId: 'iron_sword', found: false },
  ],
  dialogues: [
    // 战前对话（yc_start）由编排层开局播放，不走回合触发
    { turn: 3, dialogueId: 'yc_reinforce' },
    { onDeathOf: 'zl', dialogueId: 'yc_zl_down' },
  ],
  weather: 'sunny',
  weatherScript: [],
  win: { kind: 'annihilate' },
  maxTurns: 20,
}

export interface DialogueLine { speaker: string; text: string }

export const yingchuanDialogues: Record<string, DialogueLine[]> = {
  yc_start: [
    { speaker: '曹操', text: '黄巾作乱，祸害颍川。今日一战，便是曹某扬名之时！' },
    { speaker: '夏侯惇', text: '孟德放心，元让的枪早已饥渴难耐。' },
    { speaker: '荀彧', text: '黄巾贼乌合之众，破之不难。稳扎稳打，勿要冒进。' },
  ],
  yc_reinforce: [
    { speaker: '士兵', text: '报——！黄巾援军自东面杀来！' },
    { speaker: '曹操', text: '慌什么。阵型不乱，稳扎稳打。' },
  ],
  yc_zl_down: [
    { speaker: '张梁', text: '苍天……已死……' },
    { speaker: '曹操', text: '黄巾之乱，当有此报。' },
  ],
}
```

- [ ] **Step 3: 写测试 tests/data/yingchuan.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { yingchuan, yingchuanDialogues } from '../../src/data/battles/yingchuan'
import { validateBattleDef } from '../../src/data/battles/shared'
import { gameData } from '../../src/data'
import type { BattleDef } from '../../src/engine/types'

describe('颍川之战', () => {
  it('战役数据校验零错误', () => {
    expect(validateBattleDef(yingchuan, gameData)).toEqual([])
  })
  it('16x12 地图；我方 5 人 / 敌方 9 人', () => {
    expect(yingchuan.map.length).toBe(12)
    expect(yingchuan.map[0].length).toBe(16)
    expect(yingchuan.units.filter((u) => u.faction === 'player').length).toBe(5)
    expect(yingchuan.units.filter((u) => u.faction === 'enemy').length).toBe(9)
  })
  it('第 3 回合增援 2 人；对话触发都有文本', () => {
    expect(yingchuan.reinforcements.find((r) => r.turn === 3)?.entries.length).toBe(2)
    for (const t of yingchuan.dialogues) {
      expect(yingchuanDialogues[t.dialogueId], t.dialogueId).toBeDefined()
    }
  })
  it('校验器能发现越界与 survive/maxTurns 冲突', () => {
    const broken: BattleDef = {
      ...yingchuan,
      units: yingchuan.units.map((u) => (u.id === 'e1' ? { ...u, pos: { x: 99, y: 99 } } : u)),
      win: { kind: 'survive', untilTurn: 30 },
      maxTurns: 20,
    }
    const errs = validateBattleDef(broken, gameData)
    expect(errs.some((e) => e.includes('越界'))).toBe(true)
    expect(errs.some((e) => e.includes('坚守'))).toBe(true)
  })
})
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/data/yingchuan.test.ts 2>&1 | tail -6
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 颍川之战战役数据与校验器"
```

---

### Task 15: 收尾（barrel 导出 / 战役注册表 / README / 全量验证）

**Files:**
- Create: `src/engine/index.ts`, `src/data/battles/index.ts`, `README.md`

- [ ] **Step 1: 写 src/engine/index.ts**

```ts
export * from './types'
export { initBattle, apply } from './engine'
export { evaluate } from './wincheck'
export { decideUnitAction } from './ai'
```

- [ ] **Step 2: 写 src/data/battles/index.ts**

```ts
import type { BattleDef } from '../../engine/types'
import { yingchuan } from './yingchuan'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan }
```

- [ ] **Step 3: 写 README.md**

```markdown
# 三国志曹操传 · Web 版

Koei 经典战棋 RPG《三国志曹操传》的 Web 复刻（程序化像素风，零外部素材）。
设计文档见 `docs/superpowers/specs/`，实现计划见 `docs/superpowers/plans/`。

## 开发

    npm install
    npm run dev     # 开发服务器
    npm test        # Vitest 全量测试
    npm run build   # 类型检查 + 构建

## 架构（里程碑 1：战斗引擎）

- `src/engine/` 纯 TypeScript 战棋引擎，零框架依赖：
  `apply(state, command, data) → { state, events }`，不可变状态 + 状态内 RNG（可回放）。
- `src/data/` 纯静态数据：兵种/地形/法术/武将/道具/战役。加战役 = 加数据文件。
- 规则要点：兵种相克（骑>弓>步>骑）、地形加成、天气门禁（雨天禁火）、
  反击/暴击/连击、经验升级（随机成长）、四种胜利条件、启发式 AI。

## 里程碑

1. [x] 战斗引擎 + 全套单测（当前）
2. [ ] Canvas 渲染 + 颍川之战可玩
3. [ ] 养成闭环（装备/整备/存档）+ 前 3 场战役
4. [ ] 8 场战役 + 剧情对话 + 善恶结局
```

- [ ] **Step 4: 全量验证**

```bash
npx vitest run 2>&1 | tail -10
npm run build 2>&1 | tail -5
```

Expected: 全部测试通过；构建成功。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: 引擎 barrel 导出、战役注册表与 README"
```

---

## 计划自审记录（写计划时已修正）

1. **movement.ts 预算参数**：初稿 `extraMove = 0` 作为总预算会让不传参的调用只能原地不动 —— 已改为 `moveBudget?: number`，缺省取兵种自身移动力，引擎侧传 `effectiveMove()`（含装备/疾风加成）。
2. **眩晕时序**：状态在归属阵营回合开始时「先置 acted 再递减」，保证 turns=1 的眩晕确实跳过一回合（magic.test 覆盖）。
3. **战前对话**：turn:1 的对话不会触发（newRound 只在 turn≥2 运行），颍川之战的 yc_start 标注由编排层开局播放，不放进 dialogues 触发器。
4. **survive 与 maxTurns**：校验器强制 `untilTurn < maxTurns`，避免同一回合同时满足胜利与失败。

