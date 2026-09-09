# 曹操传 Web 版 · 里程碑 2：Canvas 渲染与颍川之战可玩 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 M1 引擎之上补齐三层架构的另外两层 —— Canvas 渲染层与编排层，加 Vue 3 界面组装，使颍川之战可以从标题画面点进、完整交互打完（点选/移动/攻击/法术/道具/待机/撤销/回合推进/敌方 AI/对话演出/结算画面）。

**Architecture:** 依赖方向严格单向：`engine`（M1，本里程碑除登记修复外不动）← `render/`（Canvas 绘制，零 Vue 依赖）← `game/`（编排纯逻辑，可 Vitest 直测）← `ui/`（Vue 3 只做组装与输入）。纯逻辑部分（camera / viewModel / aiRunner / orchestrator / 动画规划器）TDD；Canvas 绘制与 Vue 组件以 `npm run build` 类型门禁 + 手动验收（spec §8）。

**Tech Stack:** TypeScript 5 (strict) + Canvas 2D + Vue 3 `<script setup>` + Vitest 3（既有脚手架，零新依赖）。

**Spec:** `docs/superpowers/specs/2026-09-08-caocaozhuan-web-design.md` §2（render/ui/game 三层）、§5（界面与渲染/战斗交互）、§10 里程碑 2。

**全局约定（每个任务都适用）：**
- 长输出命令一律截断：`npm install 2>&1 | tail -5`、`npx vitest run 2>&1 | tail -20`、`npm run build 2>&1 | tail -8`
- commit 格式 `<type>: <描述>`，不加任何 attribution 尾注（用户全局配置已禁用）
- 工作目录：`/Users/didi/project/caocaozhuan`；开始执行前从 `main` 检出分支 `feature/m2-render`
- M1 代码默认不动。例外仅两处（均为 M1 评审登记的延期项）：
  - Task 7 修 `src/engine/ai.ts`（M-1 已移动单位守卫、M-4 治疗口径统一 effectiveStats）
  - Task 8 拆 `validateBattleDef` 返回 `{ errors, warnings }` 并接线加载期校验（配套改写 `tests/data/yingchuan.test.ts` 断言，属签名变更的必要同步）
- M1→M2 延期事项纳入本里程碑：编排层/AI 单位间 `finished` 检查（Task 4）、AI M-1/M-4/M-9（Task 7）、校验器拆分+加载期接线（Task 8）、`battleStarted` 事件合成（Task 5）、hue 撞色改兵种剪影区分（Task 1）
- 明确不做（留 M3+）：M-3 AoE 锚点枚举、M-5 击杀跨类校准、M-6 AI 微优化、敌方 debuff AI、敌兵数值随关卡成长、hasAlly 三阵营测试、StrategyDef 判别联合、事件顺序统一、wincheck never 穷尽检查、engine↔data 分层整理、音效、存档、整备界面（M3 里程碑本体）

---

## 文件结构（本里程碑产出）

```
caocaozhuan/
├── src/
│   ├── render/                                  # Canvas 层（零 Vue 依赖）
│   │   ├── sprites.ts                           # Task 1  兵种像素画/地形色板/噪声/绘制原语
│   │   ├── camera.ts                            # Task 2  镜头纯函数
│   │   ├── battlefield.ts                       # Task 2  战场渲染器（离屏地形缓存/水面动画/高亮/血条）
│   │   └── animator.ts                          # Task 6  纯动画规划器 + rAF 播放器
│   ├── game/                                    # 编排层（纯逻辑可测）
│   │   ├── viewModel.ts                         # Task 3  移动范围/攻击目标/可施法/可用道具
│   │   ├── aiRunner.ts                          # Task 4  阵营回合批执行（单位间终局检查）
│   │   ├── orchestrator.ts                      # Task 5  意图→指令编排（撤销快照/对话队列）
│   │   └── bootstrap.ts                         # Task 8  loadBattle 加载期校验 + 对话文本查询
│   ├── ui/
│   │   ├── screens/BattleScreen.vue             # Task 9  主战斗画面（Canvas+交互+镜头）
│   │   └── components/
│   │       ├── UnitInfoPanel.vue                # Task 9  底部状态条
│   │       ├── HoverTooltip.vue                 # Task 9  地形/相克悬浮提示
│   │       ├── ActionMenu.vue                   # Task 10 动作菜单
│   │       ├── SpellMenu.vue                    # Task 10 法术菜单
│   │       ├── ItemMenu.vue                     # Task 10 道具菜单
│   │       ├── DialogueBox.vue                  # Task 11 打字机对话
│   │       └── ResultBanner.vue                 # Task 11 胜负结算
│   ├── App.vue                                  # Task 9  标题画面 → 战斗画面
│   ├── data/battles/shared.ts                   # Task 8  校验器签名拆分 + DialogueLine 类型
│   ├── data/battles/yingchuan.ts                # Task 8  DialogueLine 改从 shared 导入
│   ├── data/battles/index.ts                    # Task 5  battleOpeners；Task 8 battleDialogues
│   └── engine/ai.ts                             # Task 7  M-1/M-4 修复
├── tests/
│   ├── render/sprites.test.ts                   # Task 1
│   ├── render/camera.test.ts                    # Task 2
│   ├── game/viewModel.test.ts                   # Task 3
│   ├── game/aiRunner.test.ts                    # Task 4
│   ├── game/orchestrator.test.ts                # Task 5
│   ├── render/animator.test.ts                  # Task 6
│   ├── engine/ai-edge.test.ts                   # Task 7
│   ├── game/bootstrap.test.ts                   # Task 8
│   └── integration/playthrough.test.ts          # Task 12
└── docs/superpowers/manual-checks-m2.md         # Task 12 手动验收清单
```

**新增对外接口（全计划统一，不得改名）：**

```ts
// render/camera.ts
export const TILE = 32
export function clampCamera(cam: Camera, mapW: number, mapH: number, viewW: number, viewH: number): Camera
export function screenToCell(px: number, py: number, cam: Camera): Cell
export function cellToScreen(c: Cell, cam: Camera): { x: number; y: number }
export function centerOnCell(c: Cell, viewW: number, viewH: number): Camera

// game/viewModel.ts
export function buildViewModel(state: BattleState, data: GameData): BattleViewModel
export function moveRangeCells(state: BattleState, unitId: string, data: GameData): Cell[]
export function attackTargets(state: BattleState, unitId: string, data: GameData): string[]
export function castableStrategies(state: BattleState, unitId: string, data: GameData): StrategyDef[]
export function spellTargetCells(state: BattleState, unitId: string, strategyId: string, data: GameData): Cell[]
export function usableItems(unit: Unit, data: GameData): ItemDef[]

// game/aiRunner.ts
export function runFactionTurn(state: BattleState, faction: Faction, data: GameData): { state: BattleState; events: GameEvent[]; errors: EngineError[] }

// game/orchestrator.ts
export class BattleOrchestrator {
  constructor(battleId: string, seed: number, cb: OrchestratorCallbacks, data?: GameData)
  dispatch(intent: Intent): void
  acknowledgeDialogue(): void
  get state(): BattleState
  get uiState(): UiState
}

// render/animator.ts
export function planAnimations(events: GameEvent[], positions: Record<string, Cell>): PlanResult
export class Animator {
  constructor(renderer: BattlefieldRenderer)
  play(events: GameEvent[], positions: Record<string, Cell>, onDone: () => void): void
  get busy(): boolean
  cancel(): void
}

// game/bootstrap.ts
export function loadBattle(battleId: string, seed: number): BattleState
```

---

### Task 1: 程序化像素画（sprites.ts）

**Files:**
- Create: `src/render/sprites.ts`
- Test: `tests/render/sprites.test.ts`

设计要点：M1 登记的 hue 撞色问题（步兵 200/210/220/230、弓手 20/35/45 色相过近）用**非色相特征**解决 —— 每兵种 16×16 像素画剪影各不相同（君主举剑披风 / 步兵盾枪 / 骑兵马身 / 弓兵弓弧 / 军师高冠持扇 / 道士兜帽执杖），配色只做辅助（阵营色为甲、兵种色为冠）。像素画以字符串数组定义，字符集固定，绘制原语按字符查色画矩形。

- [ ] **Step 1: 写失败测试 tests/render/sprites.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import {
  CLASS_SPRITES, SPRITE_CHARS, CLASS_ACCENT_HUES, FACTION_HUES,
  TERRAIN_PALETTES, noiseAt, paletteFor,
} from '../../src/render/sprites'
import type { ClassId, TerrainId } from '../../src/engine/types'

const ALL_CLASSES: ClassId[] = ['lord', 'infantry', 'cavalry', 'archer', 'strategist', 'taoist']
const ALL_TERRAINS: TerrainId[] = ['plain', 'forest', 'mountain', 'water', 'city', 'camp', 'pass', 'bridge']

describe('兵种像素画', () => {
  it('6 兵种齐全；每幅 16 行 × 16 字符；字符集合法', () => {
    for (const id of ALL_CLASSES) {
      const rows = CLASS_SPRITES[id]
      expect(rows, id).toBeDefined()
      expect(rows.length, id).toBe(16)
      for (const row of rows) {
        expect(row.length, `${id}: ${row}`).toBe(16)
        for (const ch of row) expect(SPRITE_CHARS.has(ch), `${id}: ${ch}`).toBe(true)
      }
    }
  })
  it('六幅剪影两两不同（hue 撞色的结构性修复）', () => {
    const joined = ALL_CLASSES.map((id) => CLASS_SPRITES[id].join(''))
    for (let i = 0; i < joined.length; i++)
      for (let j = i + 1; j < joined.length; j++)
        expect(joined[i] === joined[j], `${ALL_CLASSES[i]} 与 ${ALL_CLASSES[j]} 剪影相同`).toBe(false)
  })
  it('结构标记：君主剑尖在首行；步兵有整列长枪与左盾；骑兵有整行马身', () => {
    expect(CLASS_SPRITES.lord[0].includes('w')).toBe(true)
    const spearCol = CLASS_SPRITES.infantry.filter((r) => r[14] !== '.').length
    expect(spearCol).toBeGreaterThanOrEqual(10)
    expect(CLASS_SPRITES.infantry.slice(6, 10).every((r) => r[0] !== '.')).toBe(true)
    expect(CLASS_SPRITES.cavalry.some((r) => !r.includes('.'))).toBe(true)
  })
})

describe('配色与噪声', () => {
  it('阵营/兵种色相齐全且阵营色相拉开', () => {
    expect(Object.keys(FACTION_HUES).sort()).toEqual(['ally', 'enemy', 'player'])
    for (const id of ALL_CLASSES) expect(CLASS_ACCENT_HUES[id]).toBeDefined()
    const hues = [FACTION_HUES.player, FACTION_HUES.enemy, FACTION_HUES.ally]
    expect(new Set(hues).size).toBe(3)
  })
  it('paletteFor 返回 hsl 颜色且阵营甲色不同', () => {
    const p1 = paletteFor('player', 'infantry')
    const p2 = paletteFor('enemy', 'infantry')
    expect(p1.a).not.toBe(p2.a)
    expect(p1.a.startsWith('hsl(')).toBe(true)
  })
  it('noiseAt 确定性且落在 [0,1)', () => {
    expect(noiseAt(3, 5, 7)).toBe(noiseAt(3, 5, 7))
    expect(noiseAt(3, 5, 7)).not.toBe(noiseAt(4, 5, 7))
    for (let x = 0; x < 50; x++) {
      const v = noiseAt(x, x * 3, x + 1)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('8 地形色板齐全，各含 base/dark/light 三色', () => {
    for (const t of ALL_TERRAINS) {
      const p = TERRAIN_PALETTES[t]
      expect(p, t).toBeDefined()
      expect(p.base.startsWith('#')).toBe(true)
      expect(p.dark).not.toBe(p.light)
    }
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/render/sprites.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/render/sprites` 模块不存在）

- [ ] **Step 3: 写 src/render/sprites.ts**

字符集：`.` 透明 ｜ `o` 描边 ｜ `s` 皮肤 ｜ `e` 眼睛 ｜ `h`/`H` 冠帽主/暗色（兵种色相）｜ `a`/`A` 甲主/暗色（阵营色相）｜ `w`/`W` 武器亮/暗。
**抄写像素行时若长度不为 16，以 Step 1 测试失败为准修正字面量**（测试即守卫）。

```ts
import type { ClassId, Faction, HeroDef, TerrainId, Unit } from '../engine/types'

export const SPRITE_CHARS = new Set(['.', 'o', 's', 'e', 'h', 'H', 'a', 'A', 'w', 'W'])

/** 每兵种 16×16 像素画 —— 剪影必须互不相同（hue 撞色的结构性修复）。 */
export const CLASS_SPRITES: Record<ClassId, string[]> = {
  // 君主：平天冠 + 披风 + 右侧举剑
  lord: [
    '.............w..',
    '..hhhhhhhh....w.',
    '...HHHHHHH....w.',
    '....ssss......w.',
    '....sees......w.',
    '....osso.....aw.',
    '...aaaaaaaa...o.',
    '.Aaaaaaaaa......',
    '.AaaAAAAAAa.....',
    '.AaaaAAAAAAaa...',
    '...aaaaaa.......',
    '....o..o........',
    '....o..o........',
    '....o..o........',
    '...oo..oo.......',
    '................',
  ],
  // 步兵：左手大盾 + 整列长枪
  infantry: [
    '..............W.',
    '....hhhh......W.',
    '...hHHHHh.....W.',
    '....ssss......W.',
    '....sees......W.',
    '....osso......W.',
    'Aaa.aaaaa.....W.',
    'Aaa.aaaaa.....W.',
    'Aaa.AAAAA.....W.',
    'Aaa.aaaaa.....W.',
    'Aaa...........W.',
    '....o..o......W.',
    '....o..o......W.',
    '...oo..oo.....W.',
    '................',
    '................',
  ],
  // 骑兵：横向马身（含整行无透明的体量行）
  cavalry: [
    '....hhhh........',
    '...hHHHHh.......',
    '....ssss........',
    '....sees........',
    '...aaaaa........',
    '...aaAAAa...oo..',
    '.aaaaaaaaaaaaoo.',
    'aaaaaaaaaaaaaaaa',
    'aaaaaAAAAaaaaaaa',
    '.aaaaaaaaaaaaaa.',
    '..o..........o..',
    '..o..........o..',
    '..o..........o..',
    '.oo..........oo.',
    '................',
    '................',
  ],
  // 弓兵：尖帽 + 右侧弓弧
  archer: [
    '.......h........',
    '......hhhh......',
    '.....hHHHHh.....',
    '....ssss...w....',
    '....sees..w.....',
    '....osso..w.....',
    '...aaaaaa.w.....',
    '..aaaaaaaa.w....',
    '..aaaaaaaa.w....',
    '...aaaaaa.w.....',
    '....o..o..w.....',
    '....o..o...w....',
    '....o..o........',
    '...oo..oo.......',
    '................',
    '................',
  ],
  // 军师：高冠 + 摇扇 + 长袍及地（无分腿）
  strategist: [
    '......hh........',
    '.....hhhh.......',
    '....hHHHHh......',
    '....ssss........',
    '....sees........',
    '....osso........',
    '...aaaaaa.ww....',
    '..aaaaaaaa.www.w',
    '...aaaaaa.ww....',
    '...aAAAAAa......',
    '...aaaaaa.......',
    '...aaaaaa.......',
    '...aAAAAAa......',
    '...ooooooo......',
    '................',
    '................',
  ],
  // 道士：兜帽包脸 + 左侧执杖（杖顶宝珠）
  taoist: [
    '.ww.............',
    '.Ww....hhhh.....',
    '.W.....hHHHHh...',
    '.W.....hHHHHh...',
    '.W.....hssseh...',
    '.W.....hseesh...',
    '.W.....hossoh...',
    '.W.....aaaaaa...',
    '.Wo....aaaaaa...',
    '.W.....aAAAAAa..',
    '.W.....aaaaaaa..',
    '.W.....aaaaaaa..',
    '.W.....aAAAAAa..',
    '.W.....ooooooo..',
    '................',
    '................',
  ],
}

/** 阵营甲色相 / 兵种冠色相（拉开 Δ≥90，避免撞色）。 */
export const FACTION_HUES: Record<Faction, number> = { player: 210, enemy: 0, ally: 120 }
export const CLASS_ACCENT_HUES: Record<ClassId, number> = {
  lord: 45, infantry: 205, cavalry: 25, archer: 95, strategist: 275, taoist: 320,
}

export interface SpritePalette { h: string; H: string; a: string; A: string }

const hsl = (hue: number, sat: number, light: number) => `hsl(${hue} ${sat}% ${light}%)`

export function paletteFor(faction: Faction, classId: ClassId): SpritePalette {
  const f = FACTION_HUES[faction]
  const c = CLASS_ACCENT_HUES[classId]
  return { h: hsl(c, 55, 55), H: hsl(c, 55, 35), a: hsl(f, 45, 60), A: hsl(f, 45, 38) }
}

const STATIC_COLORS: Record<string, string> = {
  o: '#26221c', s: '#e8b98a', e: '#1c1c1c', w: '#c8ccd4', W: '#8a8f99',
}

/** 确定性伪随机 [0,1)：地形抖动与水面波纹共用（spec §5.2）。 */
export function noiseAt(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return Math.abs(v - Math.floor(v))
}

export const TERRAIN_PALETTES: Record<TerrainId, { base: string; dark: string; light: string }> = {
  plain:    { base: '#a8b06a', dark: '#8e9757', light: '#bcc47e' },
  forest:   { base: '#4f7a3c', dark: '#3d6130', light: '#63934c' },
  mountain: { base: '#8d8578', dark: '#6f685d', light: '#a8a094' },
  water:    { base: '#4a78b5', dark: '#3a62a0', light: '#6b9bd0' },
  city:     { base: '#b0a48c', dark: '#948871', light: '#c8bda6' },
  camp:     { base: '#9c7a4f', dark: '#7d603c', light: '#b6946a' },
  pass:     { base: '#9a8f96', dark: '#7a7078', light: '#b3a9b0' },
  bridge:   { base: '#a5814f', dark: '#86683f', light: '#c09a66' },
}

export const WATER_LIGHT = 'rgba(255,255,255,0.35)'

export function drawSprite(
  ctx: CanvasRenderingContext2D, rows: string[], palette: SpritePalette,
  destX: number, destY: number, scale: number,
  opts: { alpha?: number; flash?: boolean } = {},
): void {
  ctx.save()
  ctx.globalAlpha = opts.alpha ?? 1
  const px = Math.ceil(scale)
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x]
      if (ch === '.') continue
      ctx.fillStyle = opts.flash ? '#ffffff'
        : ch === 'h' ? palette.h
        : ch === 'H' ? palette.H
        : ch === 'a' ? palette.a
        : ch === 'A' ? palette.A
        : STATIC_COLORS[ch]!
      ctx.fillRect(destX + x * scale, destY + y * scale, px, px)
    }
  }
  ctx.restore()
}

export function drawUnitSprite(
  ctx: CanvasRenderingContext2D, unit: Unit,
  destX: number, destY: number, scale: number,
  opts: { alpha?: number; flash?: boolean } = {},
): void {
  drawSprite(ctx, CLASS_SPRITES[unit.classId], paletteFor(unit.faction, unit.classId), destX, destY, scale, opts)
}

/** 程序化头像（对话框用）：色相底 + 冠区 + 面 + 肩衣。 */
export function drawPortrait(
  ctx: CanvasRenderingContext2D, hero: HeroDef, destX: number, destY: number, size: number,
): void {
  ctx.save()
  ctx.fillStyle = hsl(hero.portraitHue, 40, 78)
  ctx.fillRect(destX, destY, size, size)
  ctx.fillStyle = hsl(hero.portraitHue, 45, 62)
  ctx.fillRect(destX, destY, size, size * 0.3)
  ctx.fillStyle = '#e8b98a'
  ctx.fillRect(destX + size * 0.28, destY + size * 0.34, size * 0.44, size * 0.4)
  ctx.fillStyle = '#1c1c1c'
  ctx.fillRect(destX + size * 0.38, destY + size * 0.48, size * 0.07, size * 0.05)
  ctx.fillRect(destX + size * 0.55, destY + size * 0.48, size * 0.07, size * 0.05)
  ctx.fillStyle = hsl(hero.portraitHue, 40, 30)
  ctx.fillRect(destX + size * 0.2, destY + size * 0.78, size * 0.6, size * 0.16)
  ctx.strokeStyle = '#26221c'
  ctx.strokeRect(destX + 0.5, destY + 0.5, size - 1, size - 1)
  ctx.restore()
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/render/sprites.test.ts 2>&1 | tail -6
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 兵种像素画与地形色板（剪影区分解决 hue 撞色）"
```

---

### Task 2: 镜头纯函数与战场渲染器（camera.ts + battlefield.ts）

**Files:**
- Create: `src/render/camera.ts`
- Create: `src/render/battlefield.ts`
- Test: `tests/render/camera.test.ts`

设计要点：镜头换算全部抽成纯函数（可 Vitest 直测）；`BattlefieldRenderer` 只做绘制 —— 离屏 canvas 缓存整张地形（水格除外，水面要逐帧波纹）、单位/高亮/飘字/横幅每帧重画。渲染器模块顶层**不触碰任何 DOM API**（`document.createElement` 只在构造函数内调用），保证测试环境可 import 纯函数部分。

- [ ] **Step 1: 写失败测试 tests/render/camera.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { TILE, clampCamera, screenToCell, cellToScreen, centerOnCell } from '../../src/render/camera'

describe('镜头纯函数', () => {
  it('TILE 常量为 32', () => {
    expect(TILE).toBe(32)
  })
  it('地图大于视口时 clamp 到边界', () => {
    // 世界 16×12 格 = 512×384px，视口 320×240
    expect(clampCamera({ x: -50, y: -10 }, 512, 384, 320, 240)).toEqual({ x: 0, y: 0 })
    expect(clampCamera({ x: 999, y: 999 }, 512, 384, 320, 240)).toEqual({ x: 192, y: 144 })
    expect(clampCamera({ x: 100, y: 100 }, 512, 384, 320, 240)).toEqual({ x: 100, y: 100 })
  })
  it('地图小于视口时居中（负坐标，世界画在视口中央）', () => {
    // 世界 4×3 格 = 128×96px，视口 320×240 → 相机 = (world-view)/2 = (-96, -72)
    expect(clampCamera({ x: 0, y: 0 }, 128, 96, 320, 240)).toEqual({ x: -96, y: -72 })
    expect(clampCamera({ x: 999, y: 999 }, 128, 96, 320, 240)).toEqual({ x: -96, y: -72 })
    // 负相机下世界 (0,0) 格画在屏幕 (96,72)：逆换算仍成立
    expect(screenToCell(96, 72, { x: -96, y: -72 })).toEqual({ x: 0, y: 0 })
  })
  it('screenToCell 与 cellToScreen 互逆（含镜头偏移）', () => {
    const cam = { x: 33, y: 17 }
    const px = 100, py = 200
    const cell = screenToCell(px, py, cam)
    expect(cell).toEqual({ x: Math.floor((100 + 33) / 32), y: Math.floor((200 + 17) / 32) })
    const back = cellToScreen(cell, cam)
    expect(px - back.x).toBeLessThan(TILE)
    expect(py - back.y).toBeLessThan(TILE)
    expect(back.x).toBeGreaterThanOrEqual(0)
  })
  it('centerOnCell 把指定格放到视口中心', () => {
    expect(centerOnCell({ x: 8, y: 6 }, 320, 240)).toEqual({ x: 8 * 32 - 160 + 16, y: 6 * 32 - 120 + 16 })
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/render/camera.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/render/camera` 模块不存在）

- [ ] **Step 3: 写 src/render/camera.ts**

```ts
import type { Cell } from '../engine/types'

export const TILE = 32
export interface Camera { x: number; y: number }

/** 世界小于视口时居中（负偏移）；否则夹在 [0, world-view]。 */
export function clampCamera(cam: Camera, mapW: number, mapH: number, viewW: number, viewH: number): Camera {
  const cx = mapW <= viewW ? Math.round((mapW - viewW) / 2) : Math.min(Math.max(0, cam.x), mapW - viewW)
  const cy = mapH <= viewH ? Math.round((mapH - viewH) / 2) : Math.min(Math.max(0, cam.y), mapH - viewH)
  return { x: cx, y: cy }
}

export function screenToCell(px: number, py: number, cam: Camera): Cell {
  return { x: Math.floor((px + cam.x) / TILE), y: Math.floor((py + cam.y) / TILE) }
}

export function cellToScreen(c: Cell, cam: Camera): { x: number; y: number } {
  return { x: c.x * TILE - cam.x, y: c.y * TILE - cam.y }
}

export function centerOnCell(c: Cell, viewW: number, viewH: number): Camera {
  return { x: c.x * TILE + TILE / 2 - viewW / 2, y: c.y * TILE + TILE / 2 - viewH / 2 }
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/render/camera.test.ts 2>&1 | tail -6
```

Expected: `5 passed`

- [ ] **Step 5: 写 src/render/battlefield.ts（类型门禁 + 手动验收，无单测）**

```ts
import type { GameData } from '../data'
import type { BattleState, Cell, Unit } from '../engine/types'
import { effectiveStats } from '../engine/internal'
import { TILE, cellToScreen, type Camera } from './camera'
import {
  TERRAIN_PALETTES, WATER_LIGHT, drawUnitSprite, noiseAt,
} from './sprites'

/** 高亮格集合（key 为 `x,y`）。全部为格子坐标，由渲染层换算像素。 */
export interface HighlightLayer { move: Set<string>; attack: Set<string>; spell: Set<string>; hover: Cell | null }

export interface UnitOverride { x?: number; y?: number; alpha?: number; flash?: boolean; forceVisible?: boolean }
export interface FloatText { x: number; y: number; text: string; color: string; alpha: number }
export interface BurstFx { x: number; y: number; color: string; radius: number; alpha: number }

const FACTION_RING: Record<string, string> = { player: '#4a7de0', enemy: '#d84a4a', ally: '#48b068' }
const HL_COLORS = {
  move: 'rgba(70,130,255,0.30)', attack: 'rgba(235,70,60,0.32)', spell: 'rgba(185,90,255,0.32)',
} as const
const cellKey = (c: Cell) => `${c.x},${c.y}`

export class BattlefieldRenderer {
  private ctx: CanvasRenderingContext2D
  private terrainCache: HTMLCanvasElement
  private cam: Camera = { x: 0, y: 0 }
  private highlights: HighlightLayer = { move: new Set(), attack: new Set(), spell: new Set(), hover: null }
  private overrides = new Map<string, UnitOverride>()
  private floats: FloatText[] = []
  private bursts: BurstFx[] = []
  private banner: string | null = null
  private mapRows: string[] = []
  private state: BattleState | null = null

  constructor(private canvas: HTMLCanvasElement, private data: GameData) {
    this.ctx = canvas.getContext('2d')!
    this.mapRows = []
    this.terrainCache = document.createElement('canvas')
  }

  /** 换地图时调用：重建离屏地形缓存（水格留空，逐帧动画）。 */
  setMap(map: string[], mapW: number, mapH: number): void {
    this.mapRows = map
    this.terrainCache = document.createElement('canvas')
    this.terrainCache.width = mapW * TILE
    this.terrainCache.height = mapH * TILE
    const c = this.terrainCache.getContext('2d')!
    for (let y = 0; y < mapH; y++)
      for (let x = 0; x < mapW; x++)
        this.paintTerrainTile(c, x, y, map[y][x] as import('../engine/types').TerrainId)
  }

  setCamera(cam: Camera): void { this.cam = cam }
  setState(state: BattleState): void { this.state = state }
  setHighlights(hl: HighlightLayer): void { this.highlights = hl }
  setOverrides(o: Map<string, UnitOverride>): void { this.overrides = o }
  setFloats(f: FloatText[]): void { this.floats = f }
  setBursts(b: BurstFx[]): void { this.bursts = b }
  setBanner(text: string | null): void { this.banner = text }

  /** 每帧重画。单位数据来自最近一次 setState（未设置则跳过）。 */
  render(now: number): void {
    if (!this.state) return
    const ctx = this.ctx
    const W = this.canvas.width, H = this.canvas.height
    ctx.fillStyle = '#141210'
    ctx.fillRect(0, 0, W, H)
    ctx.drawImage(this.terrainCache, -this.cam.x, -this.cam.y)
    this.renderWater(now)
    this.renderHighlights()
    this.renderUnits()
    this.renderBursts()
    this.renderFloats()
    this.renderBanner(W, H)
  }

  private paintTerrainTile(c: CanvasRenderingContext2D, x: number, y: number, t: import('../engine/types').TerrainId): void {
    if (t === 'water') return // 水面逐帧动画，不进缓存
    const p = TERRAIN_PALETTES[t]
    const px = x * TILE, py = y * TILE
    c.fillStyle = p.base
    c.fillRect(px, py, TILE, TILE)
    for (let i = 0; i < 6; i++) { // 抖动斑点
      const n = noiseAt(x * 6 + i, y * 6 + i, 7)
      c.fillStyle = n > 0.5 ? p.dark : p.light
      const dx = noiseAt(x + i, y, i) * (TILE - 4)
      const dy = noiseAt(x, y + i, i) * (TILE - 4)
      c.fillRect(px + dx, py + dy, 3, 3)
    }
    if (t === 'forest' || t === 'mountain') { // 深色团块
      c.fillStyle = p.dark
      c.beginPath()
      c.arc(px + TILE / 2, py + TILE / 2, TILE * 0.3, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = p.light
      c.fillRect(px + 6, py + 6, 4, 4)
    }
    if (t === 'city' || t === 'camp') { // 横纹
      c.fillStyle = p.dark
      for (let i = 0; i < 3; i++) c.fillRect(px + 4, py + 6 + i * 8, TILE - 8, 3)
    }
    if (t === 'bridge') { // 板条
      c.fillStyle = p.dark
      for (let i = 0; i < 4; i++) c.fillRect(px, py + 2 + i * 8, TILE, 2)
    }
    c.strokeStyle = 'rgba(0,0,0,0.12)'
    c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1)
  }

  private renderWater(now: number): void {
    const ctx = this.ctx
    const frame = Math.floor(now / 400)
    for (let y = 0; y < this.mapRows.length; y++) {
      for (let x = 0; x < this.mapRows[y].length; x++) {
        if (this.mapRows[y][x] !== 'water') continue
        const p = TERRAIN_PALETTES.water
        const { x: sx, y: sy } = cellToScreen({ x, y }, this.cam)
        if (sx < -TILE || sy < -TILE || sx > this.canvas.width || sy > this.canvas.height) continue
        ctx.fillStyle = p.base
        ctx.fillRect(sx, sy, TILE, TILE)
        if (noiseAt(x, y, frame) > 0.45) { // 波纹闪烁
          ctx.fillStyle = WATER_LIGHT
          ctx.fillRect(sx + 4, sy + 12, TILE - 12, 3)
          ctx.fillRect(sx + 10, sy + 22, TILE - 18, 2)
        }
      }
    }
  }

  private renderHighlights(): void {
    const ctx = this.ctx
    const layer = (set: Set<string>, color: string) => {
      ctx.fillStyle = color
      for (const key of set) {
        const [x, y] = key.split(',').map(Number)
        const { x: sx, y: sy } = cellToScreen({ x, y }, this.cam)
        ctx.fillRect(sx, sy, TILE, TILE)
      }
    }
    layer(this.highlights.move, HL_COLORS.move)
    layer(this.highlights.spell, HL_COLORS.spell)
    layer(this.highlights.attack, HL_COLORS.attack)
    if (this.highlights.hover) {
      const { x: sx, y: sy } = cellToScreen(this.highlights.hover, this.cam)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2)
    }
  }

  private renderUnits(): void {
    const ctx = this.ctx
    const state = this.state!
    for (const u of state.units) {
      const o = this.overrides.get(u.id)
      const visible = u.alive || o?.forceVisible
      if (!visible) continue
      const pos: Cell = { x: o?.x ?? u.pos.x, y: o?.y ?? u.pos.y }
      const { x: sx, y: sy } = cellToScreen(pos, this.cam)
      if (sx < -TILE || sy < -TILE || sx > this.canvas.width || sy > this.canvas.height) continue
      const cx = sx + TILE / 2, cy = sy + TILE - 4
      // 阵营环
      ctx.fillStyle = FACTION_RING[u.faction] ?? '#999'
      ctx.beginPath()
      ctx.ellipse(cx, sy + TILE - 3, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      drawUnitSprite(ctx, u, sx + 2, sy - 18, 1.75, { alpha: o?.alpha, flash: o?.flash })
      // 血条
      const max = effectiveStats(u, this.data).hp
      const w = 26, hp = Math.max(0, Math.min(1, u.hp / max))
      ctx.fillStyle = '#000'
      ctx.fillRect(cx - w / 2 - 1, sy + TILE + 1, w + 2, 5)
      ctx.fillStyle = hp > 0.5 ? '#4ec46a' : hp > 0.25 ? '#e8c04a' : '#e05050'
      ctx.fillRect(cx - w / 2, sy + TILE + 2, w * hp, 3)
      // 已行动半透明
      if (u.acted && u.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(sx, sy, TILE, TILE)
      }
    }
  }

  private renderBursts(): void {
    const ctx = this.ctx
    for (const b of this.bursts) {
      const { x: sx, y: sy } = cellToScreen({ x: b.x, y: b.y }, this.cam)
      ctx.save()
      ctx.globalAlpha = Math.max(0, b.alpha)
      ctx.strokeStyle = b.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(sx + TILE / 2, sy + TILE / 2, 6 + b.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  private renderFloats(): void {
    const ctx = this.ctx
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    for (const f of this.floats) {
      const { x: sx, y: sy } = cellToScreen({ x: f.x, y: f.y }, this.cam)
      ctx.save()
      ctx.globalAlpha = Math.max(0, f.alpha)
      ctx.fillStyle = '#000'
      ctx.fillText(f.text, sx + TILE / 2 + 1, sy + 1)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, sx + TILE / 2, sy)
      ctx.restore()
    }
  }

  private renderBanner(W: number, H: number): void {
    if (!this.banner) return
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(10,8,6,0.75)'
    ctx.fillRect(0, H / 2 - 28, W, 56)
    ctx.strokeStyle = 'rgba(220,190,120,0.8)'
    ctx.lineWidth = 2
    ctx.strokeRect(4, H / 2 - 26, W - 8, 52)
    ctx.fillStyle = '#f0e6c8'
    ctx.font = '26px serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.banner, W / 2, H / 2 + 9)
  }
}
```

- [ ] **Step 6: 类型门禁**

```bash
npm run build 2>&1 | tail -8
```

Expected: 构建通过（vue-tsc 无错误）。渲染器无单测 —— 绘制正确性由 Task 12 手动验收清单覆盖。

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: 镜头纯函数与战场 Canvas 渲染器"
```

---

### Task 3: 战斗视图模型（viewModel.ts）

**Files:**
- Create: `src/game/viewModel.ts`
- Test: `tests/game/viewModel.test.ts`

设计要点：UI 需要的派生查询（可行动单位、移动范围、攻击目标、可施法术、法术目标格、可用道具）集中成一个纯函数模块 —— 引擎函数的组合层，不持有状态。`moveRangeCells` 复用引擎 `computeMoveRange`+`effectiveMove`；`spellTargetCells` 是 M1 `attackRangeCells`（此前仅有测试消费者）的第一个生产消费者。所有函数对"未选中/已行动/已移动"返回空值而非报错 —— UI 据此灰化按钮。

- [ ] **Step 1: 写失败测试 tests/game/viewModel.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { initBattle } from '../../src/engine/engine'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import {
  buildViewModel, moveRangeCells, attackTargets, castableStrategies, spellTargetCells, usableItems,
} from '../../src/game/viewModel'
import { mkBattle } from '../engine/helpers'

const state0 = initBattle(battles.yingchuan, gameData, 42)
// 曹操 lord 在 (3,6)；夏侯惇 cavalry；张辽不在颍川。荀彧 xunyu strategist。
const find = (id: string) => state0.units.find((u) => u.id === id)!

describe('buildViewModel', () => {
  it('初始状态：回合 1、我方行动、5 个可行动单位', () => {
    const vm = buildViewModel(state0, gameData)
    expect(vm.turn).toBe(1)
    expect(vm.currentFaction).toBe('player')
    expect(vm.finished).toBeNull()
    expect(vm.units.filter((v) => v.actionable).map((v) => v.unit.id)).toHaveLength(5)
  })
  it('UnitView 带满血/满蓝（装备加成后）', () => {
    const vm = buildViewModel(state0, gameData)
    const cao = vm.units.find((v) => v.unit.id === 'caocao')!
    expect(cao.maxHp).toBeGreaterThan(cao.unit.base.hp) // 宝剑 +HP 生效
    expect(cao.maxMp).toBeGreaterThanOrEqual(cao.unit.mp)
  })
})

describe('moveRangeCells', () => {
  it('骑兵移动范围不含水面与被占格，含自身所在格', () => {
    const cells = moveRangeCells(state0, 'xiahouyong', gameData)
    const keys = new Set(cells.map((c) => `${c.x},${c.y}`))
    expect(keys.has(`${find('xiahouyong').pos.x},${find('xiahouyong').pos.y}`)).toBe(true)
    for (const c of cells) {
      expect(state0.map[c.y][c.x]).not.toBe('water')
      expect(state0.units.some((u) => u.alive && u.pos.x === c.x && u.pos.y === c.y && u.id !== 'xiahouyong')).toBe(false)
    }
    expect(cells.length).toBeGreaterThan(4)
  })
  it('已行动单位返回空数组', () => {
    const s = JSON.parse(JSON.stringify(state0)) as typeof state0
    const u = s.units.find((x) => x.id === 'caocao')!
    u.acted = true
    expect(moveRangeCells(s, 'caocao', gameData)).toEqual([])
  })
})

describe('attackTargets', () => {
  it('弓兵 d=1 不含、d=2/d=3 含、d=4 不含（minRange 2 maxRange 3）', () => {
    const s = mkBattle({
      units: [
        { id: 'a', faction: 'player', classId: 'archer', pos: { x: 3, y: 3 }, items: [] },
        { id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 3 }, items: [] },
        { id: 'e2', faction: 'enemy', classId: 'infantry', pos: { x: 5, y: 3 }, items: [] },
        { id: 'e3', faction: 'enemy', classId: 'infantry', pos: { x: 6, y: 3 }, items: [] },
        { id: 'e4', faction: 'enemy', classId: 'infantry', pos: { x: 7, y: 3 }, items: [] },
      ],
    })
    const t = attackTargets(s, 'a', gameData)
    expect(t).toContain('e2')
    expect(t).toContain('e3')
    expect(t).not.toContain('e1')
    expect(t).not.toContain('e4')
  })
})

describe('castableStrategies / spellTargetCells', () => {
  it('荀彧初始可施法 ≥3（含 zhiyu/huoshi）；曹操可施 0 个', () => {
    const s = castableStrategies(state0, 'xunyu', gameData)
    const ids = s.map((x) => x.id)
    expect(ids).toContain('zhiyu')
    expect(ids).toContain('huoshi')
    expect(s.length).toBeGreaterThanOrEqual(3)
    expect(castableStrategies(state0, 'caocao', gameData)).toEqual([])
  })
  it('雨天火石不可施（weather gate）', () => {
    const s = JSON.parse(JSON.stringify(state0)) as typeof state0
    s.weather = 'rain'
    const ids = castableStrategies(s, 'xunyu', gameData).map((x) => x.id)
    expect(ids).not.toContain('huoshi')
    expect(ids).toContain('zhiyu')
  })
  it('治疗术目标格含自身；攻击法术目标格不含自身（射程 3 → 7×7 曼哈顿圆盘）', () => {
    const heal = spellTargetCells(state0, 'xunyu', 'zhiyu', gameData)
    const self = find('xunyu').pos
    expect(heal.some((c) => c.x === self.x && c.y === self.y)).toBe(true)
    expect(heal).toHaveLength(25) // range 3 曼哈顿全格
    const fire = spellTargetCells(state0, 'xunyu', 'huoshi', gameData)
    expect(fire.some((c) => c.x === self.x && c.y === self.y)).toBe(false)
    expect(fire).toHaveLength(24)
  })
})

describe('usableItems', () => {
  it('曹操初始携带 1 个可用道具', () => {
    const items = usableItems(find('caocao'), gameData)
    expect(items.length).toBe(1)
    expect(items[0]!.kind).toBe('consumable')
  })
})
```

（若颍川武将 id 与上面假设不符 —— 以 `src/data/battles/yingchuan.ts` 实际 id 为准修正测试用例名，断言逻辑不变。）

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/game/viewModel.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/game/viewModel` 模块不存在）

- [ ] **Step 3: 写 src/game/viewModel.ts**

```ts
import type { BattleState, Cell, ItemDef, StrategyDef, Unit } from '../engine/types'
import type { GameData } from '../data'
import { effectiveMove, effectiveStats, findUnit, hostile } from '../engine/internal'
import { attackRangeCells, computeMoveRange, inRange } from '../engine/movement'
import { castableInWeather } from '../engine/spells'

export interface UnitView { unit: Unit; maxHp: number; maxMp: number; actionable: boolean }
export interface BattleViewModel {
  turn: number
  weather: BattleState['weather']
  currentFaction: BattleState['faction']
  finished: BattleState['finished']
  units: UnitView[]
}

export function buildViewModel(state: BattleState, data: GameData): BattleViewModel {
  return {
    turn: state.turn,
    weather: state.weather,
    currentFaction: state.faction,
    finished: state.finished,
    units: state.units.map((unit) => {
      const eff = effectiveStats(unit, data)
      return {
        unit,
        maxHp: eff.hp,
        maxMp: eff.mp,
        actionable: unit.alive && !unit.acted && unit.faction === state.faction,
      }
    }),
  }
}

/** 可移动格（含原地）。已移动/已行动/不存在 → 空数组（UI 据此灰化）。 */
export function moveRangeCells(state: BattleState, unitId: string, data: GameData): Cell[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.moved || u.acted) return []
  const range = computeMoveRange(state.map, state.units, u, data.terrains, effectiveMove(u, data))
  return [...range.cells.values()].map((c) => ({ x: c.x, y: c.y }))
}

/** 从当前站位可直接物理攻击的敌方单位 id。 */
export function attackTargets(state: BattleState, unitId: string, data: GameData): string[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  const cls = data.classes[u.classId]
  return state.units
    .filter((t) => t.alive && hostile(u.faction, t.faction) && inRange(u.pos, t.pos, cls.minRange, cls.maxRange))
    .map((t) => t.id)
}

/** 当前可施放的全体法术（职业/天气/MP 三重过滤）。 */
export function castableStrategies(state: BattleState, unitId: string, data: GameData): StrategyDef[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  return Object.values(data.strategies).filter(
    (s) => s.allowedClasses.includes(u.classId) && castableInWeather(s, state.weather) && u.mp >= s.mpCost,
  )
}

/** 施法候选格：射程圆盘；治疗/增益另含自身格（M1 attackRangeCells 的首个生产消费者）。 */
export function spellTargetCells(state: BattleState, unitId: string, strategyId: string, data: GameData): Cell[] {
  const u = findUnit(state, unitId)
  if (!u || !u.alive || u.acted) return []
  const s = data.strategies[strategyId]
  if (!s) return []
  const h = state.map.length, w = state.map[0].length
  const cells = attackRangeCells(u.pos, 1, s.range, w, h).map((c) => ({ x: c.x, y: c.y }))
  if (s.kind === 'heal' || s.kind === 'buff') cells.unshift({ x: u.pos.x, y: u.pos.y })
  return cells
}

/** 持有的可用道具（消耗品）。 */
export function usableItems(unit: Unit, data: GameData): ItemDef[] {
  return unit.items
    .map((id) => data.items[id])
    .filter((it): it is ItemDef => !!it && it.kind === 'consumable')
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/game/viewModel.test.ts 2>&1 | tail -8
```

Expected: 全部通过（`7 passed` 或以上）。若 `attackRangeCells` 的导出名不符，以 `src/engine/movement.ts` 实际导出为准修正 import —— 断言不变。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 战斗视图模型（移动范围/攻击目标/可施法/道具查询）"
```

---

### Task 4: 阵营回合批执行器（aiRunner.ts）

**Files:**
- Create: `src/game/aiRunner.ts`
- Test: `tests/game/aiRunner.test.ts`

设计要点：M1 登记的"AI 单位间无终局检查"修复点。`runFactionTurn` 依序为该阵营每个未行动单位取 `decideUnitAction` 的指令序列并逐条 `apply`：单条失败（如终局后 BATTLE_ENDED 拒绝）记入 `errors` 并跳过该单位剩余指令；**每个单位执行前检查 `state.finished`**，终局即停。本函数不发 `endTurn` —— 阵营推进由调用方（orchestrator）持有。

- [ ] **Step 1: 写失败测试 tests/game/aiRunner.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { initBattle } from '../../src/engine/engine'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { runFactionTurn } from '../../src/game/aiRunner'

const mk = () => initBattle(battles.yingchuan, gameData, 42)

describe('runFactionTurn', () => {
  it('敌方回合：有事件、零错误、敌方全员 acted', () => {
    const s0 = mk()
    const r = runFactionTurn(s0, 'enemy', gameData)
    expect(r.events.length).toBeGreaterThan(0)
    expect(r.errors).toEqual([])
    expect(r.state.units.filter((u) => u.faction === 'enemy' && u.alive).every((u) => u.acted)).toBe(true)
  })
  it('终局中断回归锁：击杀致胜后不再对剩余单位发指令（M1 登记项）', () => {
    const s0 = mk()
    // 把敌方打到只剩 1 人 5 血，且我方两人在其近旁 —— 第一击杀即胜
    const s = JSON.parse(JSON.stringify(s0)) as typeof s0
    const enemies = s.units.filter((u) => u.faction === 'enemy')
    for (const e of enemies.slice(1)) e.alive = false
    const last = enemies[0]!
    last.hp = 5
    last.pos = { x: 2, y: 1 }
    last.acted = false
    const p1 = s.units.find((u) => u.id === 'caocao')!
    p1.pos = { x: 2, y: 0 }
    p1.moved = true
    p1.acted = false
    const p2 = s.units.find((u) => u.id === 'xiahouyong') ?? s.units.filter((u) => u.faction === 'player')[1]!
    p2.pos = { x: 3, y: 1 }
    p2.moved = true
    p2.acted = false
    // 我方回合先手击杀 → 战斗结束
    const r = runFactionTurn(s, 'player', gameData)
    expect(r.state.finished).toBe('won')
    expect(r.errors).toEqual([]) // 修复前：后续单位再发 attack 会收到 BATTLE_ENDED
    expect(r.events.some((e) => e.type === 'battleWon')).toBe(true)
  })
  it('同 seed 两次执行事件完全一致（确定性）', () => {
    const a = runFactionTurn(mk(), 'enemy', gameData)
    const b = runFactionTurn(mk(), 'enemy', gameData)
    expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events))
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
  })
})
```

（第二个用例若因武将 id 不存在而引用失败，以 `src/data/battles/yingchuan.ts` 实际 id 为准替换 `xiahouyong`。）

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/game/aiRunner.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/game/aiRunner` 模块不存在）

- [ ] **Step 3: 写 src/game/aiRunner.ts**

```ts
import type { BattleState, EngineError, Faction, GameEvent } from '../engine/types'
import type { GameData } from '../data'
import { apply, decideUnitAction } from '../engine'

/**
 * 整阵营批量执行：逐单位 decideUnitAction → 逐条 apply。
 * 单位间检查 state.finished（M1 登记的终局中断修复）；单条 apply 失败记入 errors 并放弃该单位剩余指令。
 * 不发 endTurn —— 阵营推进由调用方持有。
 */
export function runFactionTurn(
  state: BattleState, faction: Faction, data: GameData,
): { state: BattleState; events: GameEvent[]; errors: EngineError[] } {
  let s = state
  const events: GameEvent[] = []
  const errors: EngineError[] = []
  for (const u of s.units) {
    if (s.finished !== null) break
    if (u.faction !== faction || !u.alive || u.acted) continue
    const cmds = decideUnitAction(s, u.id, data)
    for (const cmd of cmds) {
      if (s.finished !== null) break
      const r = apply(s, cmd, data)
      if (!r.ok) {
        errors.push(r.error)
        break // 该单位剩余指令放弃（前置失败的后续指令必然失败）
      }
      s = r.state
      events.push(...r.events)
    }
  }
  return { state: s, events, errors }
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/game/aiRunner.test.ts 2>&1 | tail -6
```

Expected: `3 passed`。重点确认第二个用例（终局中断）通过 —— 这是 M1 登记缺陷的行为锁。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 阵营回合批执行器（单位间终局检查）"
```

---

### Task 5: 战斗编排器（orchestrator.ts + battleOpeners）

**Files:**
- Create: `src/game/orchestrator.ts`
- Modify: `src/data/battles/index.ts`（追加 `battleOpeners`）
- Test: `tests/game/orchestrator.test.ts`

设计要点：把 UI 意图翻译成引擎指令的唯一入口。持有 `BattleState` + `UiState`（选中/可撤销/对话队列），**不持有动画 busy** —— 那是画面的职责。构造时合成 `battleStarted` 事件（M1 登记项：引擎 `initBattle` 不发此事件）并排队开场对话。`endTurn` 内循环跑完所有非玩家阵营（用 Task 4 的 `runFactionTurn`）回到玩家手牌。`dialogueTriggered` 事件统一收进 `dialogueQueue`，UI 逐条 `acknowledgeDialogue`。

- [ ] **Step 1: 在 src/data/battles/index.ts 追加开场对话注册表**

```ts
import { yingchuan } from './yingchuan'
import type { BattleDef } from '../../engine/types'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan }

/** 开场对话 id（按战役注册；对话文本仍在各战役文件）。 */
export const battleOpeners: Record<string, string> = { yingchuan: 'yc_start' }
```

- [ ] **Step 2: 写失败测试 tests/game/orchestrator.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import type { BattleState, EngineError, GameEvent } from '../../src/engine/types'
import type { UiState } from '../../src/game/orchestrator'
import { BattleOrchestrator } from '../../src/game/orchestrator'

interface Captured {
  states: BattleState[]
  events: GameEvent[][]
  errors: EngineError[]
  ui: UiState[]
}
function mkHarness(seed = 42): { orch: BattleOrchestrator; cap: Captured } {
  const cap: Captured = { states: [], events: [], errors: [], ui: [] }
  const orch = new BattleOrchestrator('yingchuan', seed, {
    onState: (s, ui) => { cap.states.push(s); cap.ui.push(ui) },
    onEvents: (ev) => { cap.events.push(ev) },
    onError: (e) => { cap.errors.push(e) },
  })
  return { orch, cap }
}

describe('BattleOrchestrator 初始化', () => {
  it('构造即发 battleStarted 并排队开场对话；回合 1 我方行动', () => {
    const { orch, cap } = mkHarness()
    expect(cap.events[0]).toEqual([{ type: 'battleStarted', battleId: 'yingchuan' }])
    expect(orch.uiState.dialogueQueue).toEqual(['yc_start'])
    expect(orch.state.turn).toBe(1)
    expect(orch.state.faction).toBe('player')
    expect(cap.errors).toEqual([])
  })
  it('未知战役 id 抛错', () => {
    expect(() => new BattleOrchestrator('nope', 1, { onState: () => {}, onEvents: () => {}, onError: () => {} })).toThrow()
  })
})

describe('选中 / 移动 / 撤销', () => {
  it('选曹操 → 移动 → canUndo → 撤销回到原位', () => {
    const { orch, cap } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    const ui1 = cap.ui.at(-1)!
    expect(ui1.selectedUnitId).toBe('caocao')
    const from = orch.state.units.find((u) => u.id === 'caocao')!.pos
    const to = pickAdjacent(orch, 'caocao')
    orch.dispatch({ type: 'moveTo', to })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.pos).toEqual(to)
    expect(orch.uiState.canUndo).toBe(true)
    orch.dispatch({ type: 'undoMove' })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.pos).toEqual(from)
    expect(orch.uiState.canUndo).toBe(false)
    expect(cap.errors).toEqual([])
  })
  it('不可达格移动被引擎拒绝并上报错误', () => {
    const { orch, cap } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    orch.dispatch({ type: 'moveTo', to: { x: 0, y: 0 } }) // 左上远处
    expect(cap.errors.length).toBe(1)
    expect(cap.errors[0]!.code).toBe('OUT_OF_MOVE_RANGE')
  })
  it('选中敌方单位被拒绝', () => {
    const { orch, cap } = mkHarness()
    const enemy = orch.state.units.find((u) => u.faction === 'enemy')!
    orch.dispatch({ type: 'selectUnit', unitId: enemy.id })
    expect(cap.errors[0]!.code).toBe('CANNOT_TARGET')
    expect(orch.uiState.selectedUnitId).toBeNull()
  })
})

describe('攻击 / 待机', () => {
  it('远程目标攻击被拒（NOT_IN_RANGE）', () => {
    const { orch, cap } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    const far = orch.state.units.find((u) => u.faction === 'enemy' && u.pos.y > 6)!
    orch.dispatch({ type: 'attack', targetId: far.id })
    expect(cap.errors[0]!.code).toBe('NOT_IN_RANGE')
  })
  it('待机：单位 acted、选中清空', () => {
    const { orch } = mkHarness()
    orch.dispatch({ type: 'selectUnit', unitId: 'caocao' })
    orch.dispatch({ type: 'wait' })
    expect(orch.state.units.find((u) => u.id === 'caocao')!.acted).toBe(true)
    expect(orch.uiState.selectedUnitId).toBeNull()
  })
})

describe('endTurn 批量推进', () => {
  it('一次 endTurn 跑完敌方回合回到玩家：回合 2，事件序列完整，对话进队列', () => {
    const { orch, cap } = mkHarness(7)
    orch.dispatch({ type: 'endTurn' })
    const batch = cap.events.slice(1).flat()
    const types = batch.map((e) => e.type)
    expect(types[0]).toBe('turnEnded')
    expect(types).toContain('turnStarted')
    expect(types.filter((t) => t === 'turnStarted').length).toBeGreaterThanOrEqual(2) // enemy + player
    // AI 至少做过一次移动或攻击
    expect(types.some((t) => t === 'unitMoved' || t === 'attackLaunched')).toBe(true)
    expect(types).toContain('roundStarted')
    expect(orch.state.turn).toBe(2)
    expect(orch.state.faction).toBe('player')
    expect(cap.errors).toEqual([])
  })
  it('同 seed 两次对局状态完全一致（确定性）', () => {
    const a = mkHarness(7)
    const b = mkHarness(7)
    a.orch.dispatch({ type: 'endTurn' })
    b.orch.dispatch({ type: 'endTurn' })
    expect(JSON.stringify(a.orch.state)).toBe(JSON.stringify(b.orch.state))
  })
})

describe('对话队列', () => {
  it('acknowledgeDialogue 逐条出队', () => {
    const { orch } = mkHarness()
    expect(orch.uiState.dialogueQueue).toHaveLength(1)
    orch.acknowledgeDialogue()
    expect(orch.uiState.dialogueQueue).toHaveLength(0)
  })
})

/** 测试助手：选中单位的任一可达邻格（不含原地）。 */
function pickAdjacent(orch: BattleOrchestrator, unitId: string): { x: number; y: number } {
  const u = orch.state.units.find((x) => x.id === unitId)!
  const neigh = [
    { x: u.pos.x + 1, y: u.pos.y }, { x: u.pos.x - 1, y: u.pos.y },
    { x: u.pos.x, y: u.pos.y + 1 }, { x: u.pos.x, y: u.pos.y - 1 },
  ].filter((c) =>
    c.y >= 0 && c.y < orch.state.map.length && c.x >= 0 && c.x < orch.state.map[0].length
    && orch.state.map[c.y][c.x] !== 'water'
    && !orch.state.units.some((o) => o.alive && o.pos.x === c.x && o.pos.y === c.y),
  )
  if (neigh.length === 0) throw new Error('无可达邻格，改用 moveRangeCells 取一格')
  return neigh[0]!
}
```

- [ ] **Step 3: 运行确认失败**

```bash
npx vitest run tests/game/orchestrator.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/game/orchestrator` 模块不存在）

- [ ] **Step 4: 写 src/game/orchestrator.ts**

```ts
import type { BattleState, Cell, EngineError, GameEvent } from '../engine/types'
import type { GameData } from '../data'
import { gameData } from '../data'
import { apply, initBattle } from '../engine'
import { battles, battleOpeners } from '../data/battles'
import { runFactionTurn } from './aiRunner'

export type Intent =
  | { type: 'selectUnit'; unitId: string }
  | { type: 'deselect' }
  | { type: 'moveTo'; to: Cell }
  | { type: 'undoMove' }
  | { type: 'attack'; targetId: string }
  | { type: 'cast'; strategyId: string; target: Cell }
  | { type: 'useItem'; itemId: string }
  | { type: 'wait' }
  | { type: 'endTurn' }

export interface UiState { selectedUnitId: string | null; canUndo: boolean; dialogueQueue: string[] }
export interface OrchestratorCallbacks {
  onState: (state: BattleState, ui: UiState) => void
  onEvents: (events: GameEvent[]) => void
  onError: (error: EngineError) => void
}

/** UI 意图 → 引擎指令的唯一翻译层。不持有动画 busy（画面职责）。 */
export class BattleOrchestrator {
  private st: BattleState
  private ui: UiState = { selectedUnitId: null, canUndo: false, dialogueQueue: [] }
  private preMove: BattleState | null = null

  constructor(battleId: string, seed: number, private cb: OrchestratorCallbacks, private data: GameData = gameData) {
    const def = battles[battleId]
    if (!def) throw new Error(`未知战役: ${battleId}`)
    this.st = initBattle(def, data, seed)
    const opener = battleOpeners[battleId]
    if (opener) this.ui.dialogueQueue.push(opener)
    this.emit([{ type: 'battleStarted', battleId }]) // 合成事件（M1 登记项）
  }

  get state(): BattleState { return this.st }
  get uiState(): UiState { return this.ui }

  dispatch(intent: Intent): void {
    if (this.st.finished !== null) {
      this.cb.onError({ code: 'CANNOT_TARGET', reason: '战斗已结束' })
      return
    }
    switch (intent.type) {
      case 'selectUnit': return this.selectUnit(intent.unitId)
      case 'deselect': return this.clearSelection()
      case 'moveTo': return this.moveTo(intent.to)
      case 'undoMove': return this.undoMove()
      case 'attack': return this.unitAction({ type: 'attack', unitId: this.requireSelected(), targetId: intent.targetId })
      case 'cast': return this.unitAction({ type: 'cast', unitId: this.requireSelected(), strategyId: intent.strategyId, target: intent.target })
      case 'useItem': return this.unitAction({ type: 'useItem', unitId: this.requireSelected(), itemId: intent.itemId, targetId: this.requireSelected() })
      case 'wait': return this.unitAction({ type: 'wait', unitId: this.requireSelected() })
      case 'endTurn': return this.endTurn()
    }
  }

  /** 对话确认：出队一条并广播 UiState。 */
  acknowledgeDialogue(): void {
    this.ui.dialogueQueue.shift()
    this.cb.onState(this.st, this.ui)
  }

  private selectUnit(unitId: string): void {
    const u = this.st.units.find((x) => x.id === unitId)
    if (!u || !u.alive || u.faction !== 'player' || this.st.faction !== 'player' || u.acted) {
      this.cb.onError({ code: 'CANNOT_TARGET', reason: `不可选中: ${unitId}` })
      return
    }
    this.ui.selectedUnitId = unitId
    this.preMove = null
    this.ui.canUndo = false
    this.cb.onState(this.st, this.ui)
  }

  private clearSelection(): void {
    this.ui.selectedUnitId = null
    this.preMove = null
    this.ui.canUndo = false
    this.cb.onState(this.st, this.ui)
  }

  private requireSelected(): string {
    return this.ui.selectedUnitId ?? ''
  }

  private moveTo(to: Cell): void {
    const unitId = this.requireSelected()
    if (!unitId) return this.cb.onError({ code: 'CANNOT_TARGET', reason: '未选中单位' })
    const r = apply(this.st, { type: 'move', unitId, to }, this.data)
    if (!r.ok) return this.cb.onError(r.error)
    this.preMove = this.st
    this.st = r.state
    this.ui.canUndo = true
    this.emit(r.events)
  }

  private undoMove(): void {
    if (!this.preMove || !this.ui.canUndo) return
    this.st = this.preMove
    this.preMove = null
    this.ui.canUndo = false
    this.cb.onState(this.st, this.ui)
  }

  /** 攻击/施法/道具/待机：成功即清选中（单位已 acted）。 */
  private unitAction(cmd: Parameters<typeof apply>[1]): void {
    if (!cmd.unitId) return this.cb.onError({ code: 'CANNOT_TARGET', reason: '未选中单位' })
    const r = apply(this.st, cmd, this.data)
    if (!r.ok) return this.cb.onError(r.error)
    this.st = r.state
    this.emit(r.events)
    this.clearSelection()
  }

  private endTurn(): void {
    this.clearSelectionSilently()
    if (!this.applyCmd({ type: 'endTurn' })) return
    // 非玩家阵营依次整批执行，直到回到玩家或终局
    while (this.st.finished === null && this.st.faction !== 'player') {
      const ai = runFactionTurn(this.st, this.st.faction, this.data)
      this.st = ai.state
      this.collectDialogues(ai.events)
      this.cb.onEvents(ai.events)
      for (const e of ai.errors) this.cb.onError(e)
      if (this.st.finished !== null) break
      if (!this.applyCmd({ type: 'endTurn' })) return
    }
    this.cb.onState(this.st, this.ui)
  }

  private applyCmd(cmd: Parameters<typeof apply>[1]): boolean {
    const r = apply(this.st, cmd, this.data)
    if (!r.ok) { this.cb.onError(r.error); return false }
    this.st = r.state
    this.collectDialogues(r.events)
    this.cb.onEvents(r.events)
    return true
  }

  private collectDialogues(events: GameEvent[]): void {
    for (const e of events)
      if (e.type === 'dialogueTriggered') this.ui.dialogueQueue.push(e.dialogueId)
  }

  private clearSelectionSilently(): void {
    this.ui.selectedUnitId = null
    this.preMove = null
    this.ui.canUndo = false
  }

  private emit(events: GameEvent[]): void {
    this.collectDialogues(events)
    this.cb.onEvents(events)
    this.cb.onState(this.st, this.ui)
  }
}
```

（`unitAction` 的 `cmd` 参数用 `Parameters<typeof apply>[1]` 收窄到四类单位指令；若类型报错，改为显式 `Command` 类型并保留同样的四次调用。）

- [ ] **Step 5: 运行确认通过**

```bash
npx vitest run tests/game/orchestrator.test.ts 2>&1 | tail -8
```

Expected: 全部通过（约 `10 passed`）。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 战斗编排器（意图分发/撤销快照/对话队列）"
```

---

### Task 6: 事件动画规划器与播放器（animator.ts）

**Files:**
- Create: `src/render/animator.ts`
- Test: `tests/render/animator.test.ts`

设计要点：动画分两层 —— `planAnimations` 是**纯函数**（事件序列 → 带时间轴的动画步骤表，Vitest 直测），`Animator` 类用 rAF 按帧把步骤换算成渲染器覆盖（位移/闪白/淡出/飘字/爆发/横幅）。**M1 事件顺序事实：`hpChanged` 先于其 `attackLaunched` 发出** —— 规划器用"待决飘字缓冲"把伤害数字压后到 lunge/flash 之后落屏（本计划明确锁定的顺序修复）。

（事件字面量的字段名以 `src/engine/types.ts` 实际定义为准 —— 实现时先读该文件，再对齐下列测试与实现中的字段；**断言逻辑不变**。）

- [ ] **Step 1: 写失败测试 tests/render/animator.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import type { Cell, GameEvent } from '../../src/engine/types'
import {
  planAnimations, SLIDE_MS_PER_CELL, LUNGE_MS, FLASH_MS, FADE_MS, BANNER_MS,
} from '../../src/render/animator'

const pos = (x: number, y: number): Cell => ({ x, y })
const P: Record<string, Cell> = { p1: pos(3, 3), e1: pos(6, 3) }

describe('planAnimations 纯函数', () => {
  it('移动 → 一个 slide 步骤，时长 = 单格时长×段数，finalPositions 更新', () => {
    const events: GameEvent[] = [
      { type: 'unitMoved', unitId: 'p1', from: pos(3, 3), to: pos(5, 3), path: [pos(3, 3), pos(4, 3), pos(5, 3)] } as GameEvent,
    ]
    const plan = planAnimations(events, { p1: pos(3, 3) })
    const slides = plan.steps.filter((s) => s.kind === 'slide')
    expect(slides).toHaveLength(1)
    expect(slides[0]!.dur).toBe(SLIDE_MS_PER_CELL * 2)
    expect(plan.finalPositions.p1).toEqual(pos(5, 3))
    expect(plan.totalMs).toBeGreaterThan(0)
  })
  it('顺序修复锁：伤害飘字在 lunge/flash 之后（hpChanged 先于 attackLaunched 到达）', () => {
    const events: GameEvent[] = [
      { type: 'hpChanged', unitId: 'e1', hp: 12, delta: -8 } as GameEvent,
      { type: 'attackLaunched', attackerId: 'p1', targetId: 'e1', damage: 8, missed: false } as GameEvent,
    ]
    const plan = planAnimations(events, { ...P })
    const kinds = plan.steps.map((s) => s.kind)
    const lungeI = kinds.indexOf('lunge')
    const flashI = kinds.indexOf('flash')
    const floatI = kinds.findIndex((s) => s === 'float')
    expect(lungeI).toBeGreaterThanOrEqual(0)
    expect(flashI).toBeGreaterThanOrEqual(0)
    expect(floatI).toBeGreaterThan(lungeI)
    expect(floatI).toBeGreaterThan(flashI)
    const f = plan.steps.find((s) => s.kind === 'float') as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('-8')
    expect(f.color).toBe('#ff5a4a')
  })
  it('落空攻击 → 灰色「落空」飘字，无 flash', () => {
    const events: GameEvent[] = [
      { type: 'attackLaunched', attackerId: 'p1', targetId: 'e1', damage: 0, missed: true } as GameEvent,
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps.some((s) => s.kind === 'flash')).toBe(false)
    const f = plan.steps.find((s) => s.kind === 'float') as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('落空')
    expect(f.color).toBe('#b8b8b8')
  })
  it('治疗：目标格 burst（绿色）+ 绿色 +N 飘字在 burst 之后', () => {
    const events: GameEvent[] = [
      { type: 'spellCast', casterId: 'p1', strategyId: 'zhiyu', target: pos(3, 3) } as GameEvent,
      { type: 'hpChanged', unitId: 'p1', hp: 30, delta: 12 } as GameEvent,
    ]
    const plan = planAnimations(events, { ...P })
    const kinds = plan.steps.map((s) => s.kind)
    const burstI = kinds.indexOf('burst')
    const floatI = kinds.indexOf('float')
    expect(burstI).toBeGreaterThanOrEqual(0)
    expect(floatI).toBeGreaterThan(burstI)
    const b = plan.steps[burstI] as Extract<(typeof plan.steps)[number], { kind: 'burst' }>
    expect(b.color).toBe('#6aff9a')
    const f = plan.steps[floatI] as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('+12')
    expect(f.color).toBe('#5ae08a')
  })
  it('火系攻击法术 → 火色 burst', () => {
    const events: GameEvent[] = [
      { type: 'spellCast', casterId: 'p1', strategyId: 'huoshi', target: pos(6, 3) } as GameEvent,
    ]
    const plan = planAnimations(events, { ...P })
    const b = plan.steps.find((s) => s.kind === 'burst') as Extract<(typeof plan.steps)[number], { kind: 'burst' }>
    expect(b.color).toBe('#ff8a3a')
  })
  it('阵亡 → fade 步骤；状态 → 中文标签飘字', () => {
    const events: GameEvent[] = [
      { type: 'unitDied', unitId: 'e1', killerId: 'p1' } as GameEvent,
      { type: 'statusApplied', unitId: 'e1', kind: 'stun', turns: 1 } as GameEvent,
    ]
    const plan = planAnimations(events, { ...P })
    expect(plan.steps.some((s) => s.kind === 'fade')).toBe(true)
    const f = plan.steps.find((s) => s.kind === 'float') as Extract<(typeof plan.steps)[number], { kind: 'float' }>
    expect(f.text).toBe('眩晕')
  })
  it('回合/阵营横幅文案', () => {
    const events: GameEvent[] = [
      { type: 'roundStarted', turn: 2 } as GameEvent,
      { type: 'turnStarted', faction: 'enemy' } as GameEvent,
    ]
    const plan = planAnimations(events, { ...P })
    const texts = plan.steps.filter((s) => s.kind === 'banner').map((s) => (s as { text: string }).text)
    expect(texts).toEqual(['第 2 回合', '敌军行动'])
  })
  it('空事件 → 空计划；被忽略事件类型不产生步骤', () => {
    expect(planAnimations([], {})).toEqual({ steps: [], finalPositions: {}, totalMs: 0 })
    const events: GameEvent[] = [
      { type: 'battleStarted', battleId: 'yingchuan' } as GameEvent,
      { type: 'turnEnded', faction: 'player' } as GameEvent,
      { type: 'weatherChanged', weather: 'rain' } as GameEvent,
      { type: 'expGained', unitId: 'p1', exp: 3 } as GameEvent,
      { type: 'mpChanged', unitId: 'p1', mp: 5, delta: -5 } as GameEvent,
      { type: 'itemUsed', unitId: 'p1', targetId: 'p1', itemId: 'jingu' } as GameEvent,
      { type: 'dialogueTriggered', dialogueId: 'yc_start' } as GameEvent,
    ]
    expect(planAnimations(events, { ...P }).steps).toEqual([])
  })
})
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/render/animator.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/render/animator` 模块不存在）

- [ ] **Step 3: 写 src/render/animator.ts**

```ts
import type { Cell, GameEvent } from '../engine/types'
import { gameData } from '../data'
import type { BattlefieldRenderer, BurstFx, FloatText, UnitOverride } from './battlefield'

export const SLIDE_MS_PER_CELL = 90
export const FLASH_MS = 260
export const FLOAT_MS = 800
export const LUNGE_MS = 170
export const FADE_MS = 420
export const BURST_MS = 460
export const BANNER_MS = 1100
const STEP_GAP = 40
const FLOAT_GAP = 120

export type AnimStep =
  | { kind: 'slide'; t: number; dur: number; unitId: string; path: Cell[] }
  | { kind: 'flash'; t: number; dur: number; unitId: string }
  | { kind: 'float'; t: number; dur: number; at: Cell; text: string; color: string }
  | { kind: 'lunge'; t: number; dur: number; unitId: string; toward: Cell }
  | { kind: 'fade'; t: number; dur: number; unitId: string }
  | { kind: 'burst'; t: number; dur: number; at: Cell; color: string }
  | { kind: 'banner'; t: number; dur: number; text: string }

export interface PlanResult { steps: AnimStep[]; finalPositions: Record<string, Cell>; totalMs: number }

export const ELEMENT_COLORS: Record<string, string> = { fire: '#ff8a3a', water: '#55aaff', earth: '#b09070' }
const KIND_COLORS: Record<string, string> = { heal: '#6aff9a', buff: '#d090ff', debuff: '#d090ff' }
const STATUS_LABELS: Record<string, string> = { stun: '眩晕', defdown: '破甲', speedup: '疾风', accdown: '妖雾' }
const FACTION_BANNERS: Record<string, string> = { player: '我军行动', enemy: '敌军行动', ally: '友军行动' }

/**
 * 事件序列 → 时间轴动画步骤（纯函数）。
 * M1 事件顺序事实：hpChanged 先于其 attackLaunched 发出 —— pendingHp 缓冲把伤害飘字
 * flush 到 attackLaunched 的 lunge/flash 之后（或任意其它事件/结尾处）。
 */
export function planAnimations(events: GameEvent[], positions: Record<string, Cell>): PlanResult {
  const steps: AnimStep[] = []
  const finalPositions: Record<string, Cell> = { ...positions }
  let t = 0
  let pendingHp: { unitId: string; delta: number }[] = []

  const posOf = (id: string): Cell => finalPositions[id] ?? { x: 0, y: 0 }
  const flushHp = (): void => {
    for (const h of pendingHp) {
      const n = Math.abs(h.delta)
      steps.push({
        kind: 'float', t, dur: FLOAT_MS, at: posOf(h.unitId),
        text: h.delta < 0 ? `-${n}` : `+${n}`,
        color: h.delta < 0 ? '#ff5a4a' : '#5ae08a',
      })
      t += FLOAT_GAP
    }
    pendingHp = []
  }

  for (const ev of events) {
    switch (ev.type) {
      case 'unitMoved': {
        flushHp()
        const path = ev.path ?? [ev.from, ev.to]
        const dur = Math.max(SLIDE_MS_PER_CELL, SLIDE_MS_PER_CELL * (path.length - 1))
        steps.push({ kind: 'slide', t, dur, unitId: ev.unitId, path })
        t += dur + STEP_GAP
        finalPositions[ev.unitId] = { x: ev.to.x, y: ev.to.y }
        break
      }
      case 'attackLaunched': {
        steps.push({ kind: 'lunge', t, dur: LUNGE_MS, unitId: ev.attackerId, toward: posOf(ev.targetId) })
        t += LUNGE_MS + STEP_GAP
        if (ev.missed) {
          steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(ev.targetId), text: '落空', color: '#b8b8b8' })
          t += FLOAT_GAP
        } else {
          steps.push({ kind: 'flash', t, dur: FLASH_MS, unitId: ev.targetId })
          t += FLASH_MS + STEP_GAP
        }
        flushHp() // 伤害数字压后到 lunge/flash 之后
        break
      }
      case 'hpChanged': {
        pendingHp.push({ unitId: ev.unitId, delta: ev.delta })
        break
      }
      case 'unitDied': {
        flushHp()
        steps.push({ kind: 'fade', t, dur: FADE_MS, unitId: ev.unitId })
        t += FADE_MS + STEP_GAP
        break
      }
      case 'spellCast': {
        flushHp()
        const s = gameData.strategies[ev.strategyId]
        const color = s ? (s.kind === 'attack' ? ELEMENT_COLORS[s.element ?? 'fire'] ?? '#ff8a3a' : KIND_COLORS[s.kind] ?? '#d090ff') : '#d090ff'
        steps.push({ kind: 'burst', t, dur: BURST_MS, at: { x: ev.target.x, y: ev.target.y }, color })
        t += BURST_MS + STEP_GAP
        break
      }
      case 'statusApplied': {
        flushHp()
        steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(ev.unitId), text: STATUS_LABELS[ev.kind] ?? ev.kind, color: '#ffe06a' })
        t += FLOAT_GAP
        break
      }
      case 'levelUp': {
        flushHp()
        steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(ev.unitId), text: '升级！', color: '#ffd84a' })
        t += FLOAT_GAP
        break
      }
      case 'treasureFound': {
        flushHp()
        steps.push({ kind: 'float', t, dur: FLOAT_MS, at: posOf(ev.unitId ?? ''), text: '获得宝物', color: '#ffd84a' })
        t += FLOAT_GAP
        break
      }
      case 'roundStarted': {
        flushHp()
        steps.push({ kind: 'banner', t, dur: BANNER_MS, text: `第 ${ev.turn} 回合` })
        t += BANNER_MS + STEP_GAP
        break
      }
      case 'turnStarted': {
        flushHp()
        steps.push({ kind: 'banner', t, dur: BANNER_MS, text: FACTION_BANNERS[ev.faction] ?? ev.faction })
        t += BANNER_MS + STEP_GAP
        break
      }
      default:
        break // battleStarted/turnEnded/weatherChanged/expGained/mpChanged/itemUsed/reinforcementsArrived/dialogueTriggered/battleWon/battleLost 不做动画
    }
  }
  flushHp()
  return { steps, finalPositions, totalMs: t }
}

/** rAF 播放器：把步骤表逐帧换算为渲染器覆盖。 */
export class Animator {
  private raf = 0
  private start = 0
  private total = 0
  private steps: AnimStep[] = []
  private positions: Record<string, Cell> = {}
  private onDone: (() => void) | null = null
  private _busy = false

  constructor(private renderer: BattlefieldRenderer) {}

  get busy(): boolean { return this._busy }

  play(events: GameEvent[], positions: Record<string, Cell>, onDone: () => void): void {
    this.cancel()
    const plan = planAnimations(events, positions)
    if (plan.totalMs <= 0) { onDone(); return }
    this.steps = plan.steps
    this.positions = positions
    this.total = plan.totalMs
    this.onDone = onDone
    this._busy = true
    this.start = performance.now()
    const tick = (now: number): void => {
      const el = now - this.start
      this.renderFrame(el)
      this.renderer.render(now)
      if (el >= this.total) {
        this._busy = false
        this.clearFx()
        this.renderer.render(now)
        const done = this.onDone
        this.onDone = null
        done?.()
      } else {
        this.raf = requestAnimationFrame(tick)
      }
    }
    this.raf = requestAnimationFrame(tick)
  }

  cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this._busy = false
    this.onDone = null
    this.clearFx()
  }

  private renderFrame(el: number): void {
    const overrides = new Map<string, UnitOverride>()
    const floats: FloatText[] = []
    const bursts: BurstFx[] = []
    let banner: string | null = null
    for (const s of this.steps) {
      if (s.t + s.dur <= el) { // 已结束 —— 固化终态
        if (s.kind === 'slide') {
          const last = s.path[s.path.length - 1]!
          overrides.set(s.unitId, { ...overrides.get(s.unitId), x: last.x, y: last.y })
        } else if (s.kind === 'fade') {
          overrides.set(s.unitId, { ...overrides.get(s.unitId), alpha: 0, forceVisible: true })
        }
        continue
      }
      if (s.t > el) continue // 未开始
      const p = (el - s.t) / s.dur
      switch (s.kind) {
        case 'slide': {
          const segs = s.path.length - 1
          const idx = Math.min(segs - 1, Math.floor(p * segs))
          const f = p * segs - idx
          const a = s.path[idx]!
          const b = s.path[idx + 1]!
          overrides.set(s.unitId, { ...overrides.get(s.unitId), x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
          break
        }
        case 'flash':
          overrides.set(s.unitId, { ...overrides.get(s.unitId), flash: true })
          break
        case 'lunge': {
          const base = this.positions[s.unitId]
          if (base) {
            const k = Math.sin(p * Math.PI) * 0.35
            overrides.set(s.unitId, {
              ...overrides.get(s.unitId),
              x: base.x + (s.toward.x - base.x) * k,
              y: base.y + (s.toward.y - base.y) * k,
            })
          }
          break
        }
        case 'fade':
          overrides.set(s.unitId, { ...overrides.get(s.unitId), alpha: 1 - p, forceVisible: true })
          break
        case 'float':
          floats.push({ x: s.at.x, y: s.at.y - 8 - 26 * p, text: s.text, color: s.color, alpha: 1 - p * p })
          break
        case 'burst':
          bursts.push({ x: s.at.x, y: s.at.y, color: s.color, radius: 26 * p, alpha: 1 - p })
          break
        case 'banner':
          banner = s.text
          break
      }
    }
    this.renderer.setOverrides(overrides)
    this.renderer.setFloats(floats)
    this.renderer.setBursts(bursts)
    this.renderer.setBanner(banner)
  }

  private clearFx(): void {
    this.renderer.setOverrides(new Map())
    this.renderer.setFloats([])
    this.renderer.setBursts([])
    this.renderer.setBanner(null)
  }
}
```

（`treasureFound` 分支的 `ev.unitId ?? ''` 视实际事件字段调整；若该事件不存在于 M1 事件联合中，删除整个分支与对应导出。）

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/render/animator.test.ts 2>&1 | tail -8
```

Expected: `8 passed`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 事件动画规划器与 rAF 播放器（伤害数字压后修复）"
```

---

### Task 7: AI 修复轮 —— M-1 已移动守卫 / M-4 治疗口径 / M-9 射程边界锁（engine/ai.ts）

**Files:**
- Modify: `src/engine/ai.ts`（M1 冻结的唯一例外之一 —— M1 评审登记延期项）
- Test: `tests/engine/ai-edge.test.ts`

设计要点：三个登记缺陷一次修完。**M-1**：`decideUnitAction` 对 `moved && !acted` 的单位（玩家移动后 AI 接管、或 future 重演场景）仍会枚举整张移动范围并发出 move 指令 —— 引擎会拒掉，但推进分支还会返回新的 move。修复：候选格收敛为 `[u.pos]`，且打过 `best.score > 0` 判断后对已移动单位直接 `wait`（不再走推进分支）。**M-4**：治疗目标筛选与记分用 `base.hp`，与引擎实际口径（`effectiveStats` 含装备加成）不一致 —— 骑明光铠的重伤单位会漏治。**M-9**：为两个射程边界补回归锁（GREEN，不 RED）。

- [ ] **Step 1: 写失败测试 tests/engine/ai-edge.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import type { Command } from '../../src/engine/types'
import { apply, decideUnitAction } from '../../src/engine'
import { gameData } from '../../src/data'
import { mkBattle } from './helpers'

const run = (s: ReturnType<typeof mkBattle>, cmds: Command[]) => {
  let st = s
  for (const c of cmds) {
    const r = apply(st, c, gameData)
    expect(r.ok, JSON.stringify(c)).toBe(true) // M-1：AI 产出的指令必须全部可执行
    if (r.ok) st = r.state
  }
  return st
}

describe('M-1 已移动单位守卫', () => {
  it('moved 步兵邻接敌军：不发 move、从原地攻击、全部指令可执行', () => {
    const s = mkBattle({
      units: [
        { id: 'p1', faction: 'player', classId: 'infantry', pos: { x: 3, y: 3 }, moved: true, items: [] },
        { id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 3 }, items: [] },
      ],
    })
    const cmds = decideUnitAction(s, 'p1', gameData)
    expect(cmds.some((c) => c.type === 'move')).toBe(false) // 修复前：可从推进分支发出
    expect(cmds.some((c) => c.type === 'attack' && c.targetId === 'e1')).toBe(true)
    run(s, cmds)
  })
  it('moved 弓兵仅 d=1 敌军（minRange 2）：恰返回 [wait]', () => {
    const s = mkBattle({
      units: [
        { id: 'p1', faction: 'player', classId: 'archer', pos: { x: 3, y: 3 }, moved: true, items: [] },
        { id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 4, y: 3 }, items: [] },
      ],
    })
    expect(decideUnitAction(s, 'p1', gameData)).toEqual([{ type: 'wait', unitId: 'p1' }])
  })
})

describe('M-4 治疗口径统一 effectiveStats', () => {
  it('装备加血的重伤友军（hp ≥ base.hp/2 但 < eff.hp/2）会被治疗', () => {
    // w1：base.hp 40，装备 +10 → 有效 50；hp=24：≥20（旧口径不触发）但 <25（新口径触发）
    const s = mkBattle({
      units: [
        {
          id: 'h1', faction: 'enemy', classId: 'strategist', pos: { x: 3, y: 3 },
          mp: 30, items: [],
        },
        {
          id: 'w1', faction: 'enemy', classId: 'infantry', pos: { x: 3, y: 4 },
          hp: 24, items: ['mingguang_armor'],
        },
        { id: 'p1', faction: 'player', classId: 'infantry', pos: { x: 10, y: 10 }, items: [] },
      ],
    })
    const cmds = decideUnitAction(s, 'h1', gameData)
    expect(cmds.some((c) => c.type === 'cast' && c.strategyId === 'zhiyu')).toBe(true)
  })
})

describe('M-9 射程边界回归锁（GREEN）', () => {
  it('军师对 d=3 恰好射程的法术目标仍会施法', () => {
    const s = mkBattle({
      units: [
        { id: 'h1', faction: 'enemy', classId: 'strategist', pos: { x: 3, y: 3 }, mp: 30, items: [] },
        { id: 'p1', faction: 'player', classId: 'infantry', pos: { x: 6, y: 3 }, items: [] },
      ],
    })
    const cmds = decideUnitAction(s, 'h1', gameData)
    expect(cmds.some((c) => c.type === 'cast')).toBe(true)
  })
  it('弓兵对 d=2（自身 minRange 下沿）目标仍会攻击', () => {
    const s = mkBattle({
      units: [
        { id: 'a1', faction: 'player', classId: 'archer', pos: { x: 3, y: 3 }, items: [] },
        { id: 'e1', faction: 'enemy', classId: 'infantry', pos: { x: 5, y: 3 }, items: [] },
      ],
    })
    const cmds = decideUnitAction(s, 'a1', gameData)
    expect(cmds.some((c) => c.type === 'attack' && c.targetId === 'e1')).toBe(true)
  })
})
```

（`mkBattle` 的默认 map/基数以 `tests/engine/helpers.ts` 实际实现为准；若默认 hp/base 结构不同，直接在 unit 字面量里显式给出 `base` 与 `hp`。装备 id `mingguang_armor` 以 `src/data/equipments` 实际 id 为准 —— **M-4 用例必须用 HP 加成装备构造 `eff.hp ≠ base.hp`**（加成 > 8，使 `24 < (40+加成)/2` 但 `24 ≥ 40/2`）；无装备无法区分新旧口径（`eff.hp === base.hp` 时两口径同值）。M1 数据设计含 HP 加成装备（宝剑/明光铠族），若确实找不到，向控制者报告而不是改弱断言。）

- [ ] **Step 2: 运行确认失败（RED）**

```bash
npx vitest run tests/engine/ai-edge.test.ts 2>&1 | tail -12
```

Expected: **M-1 两个用例、M-4 一个用例 FAIL**；M-9 两个用例 PASS（回归锁，不得 RED）。

- [ ] **Step 3: 修 src/engine/ai.ts**

改动一（M-1，`for (const cell of range.cells.values()) {` 一行替换）：

```ts
  // M-1：已移动单位只评估原地（不再枚举移动范围，也不落入推进分支）
  const candidates: Cell[] = u.moved ? [u.pos] : [...range.cells.values()]
  for (const cell of candidates) {
```

改动二（M-1，`if (best.score > 0) return best.cmds` 之后、推进分支注释之前插入）：

```ts
  if (u.moved) return [{ type: 'wait', unitId }] // M-1：已移动单位无处可去
```

改动三（M-4，治疗分支两处 `f.base.hp` → `effectiveStats(f, data).hp`）：

```ts
        const wounded = state.units.filter(
          (f) => f.alive && !hostile(u.faction, f.faction) && f.hp < effectiveStats(f, data).hp * 0.5,
        )
        for (const f of wounded) {
          if (manhattan(cell, f.pos) > s.range) continue
          const score = effectiveStats(f, data).hp - f.hp // 缺失 HP 越多越优先
```

（`effectiveStats` 已在 ai.ts 顶部 import，无需新增。）

- [ ] **Step 4: 运行确认通过 + 全量回归**

```bash
npx vitest run tests/engine/ai-edge.test.ts 2>&1 | tail -6
npx vitest run 2>&1 | tail -10
```

Expected: 新文件 `5 passed`；全量套件零失败（M1 既有 113 测试不得回归 —— `decideUnitAction` 行为变化可能影响 M1 的 ai.test.ts：若其有"未移动单位推进"的既有断言，行为未变；若有依赖旧行为的用例失败，**停下来分析并向控制者报告，不得删改既有断言**）。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix: AI 已移动单位守卫与治疗口径统一（M-1/M-4）+ 射程边界锁（M-9）"
```

---

### Task 8: 校验器拆分 errors/warnings + 加载期接线（shared.ts + bootstrap.ts）

**Files:**
- Modify: `src/data/battles/shared.ts`（签名拆分 + DialogueLine 类型）
- Modify: `src/data/battles/yingchuan.ts`（DialogueLine 改从 shared 导入）
- Modify: `src/data/battles/index.ts`（battleDialogues 注册表）
- Modify: `src/engine/index.ts`（导出 BattleVerdict 类型）
- Create: `src/game/bootstrap.ts`
- Modify: `tests/data/yingchuan.test.ts`（断言随签名同步 —— 签名变更的必要配套，属 M1 登记项）
- Test: `tests/game/bootstrap.test.ts`

设计要点：M1 登记的「校验结果混装」修复 —— 错误（阻断加载）与告警（提示但不阻断）分离为 `{ errors, warnings }`；`DialogueLine` 类型上移 shared 供注册表使用；新增 `bootstrap.loadBattle` 作为 UI 层唯一战役入口（未知 id / 校验失败 → throw；告警 → console.warn）。`engine/index.ts` 顺带导出 `BattleVerdict`（Task 12 与结算画面要用）。

- [ ] **Step 1: 改 src/data/battles/shared.ts（签名拆分）**

在文件类型导入区之后新增两个接口：

```ts
/** 校验报告：errors 阻断加载；warnings 提示但不阻断。 */
export interface ValidationReport { errors: string[]; warnings: string[] }

/** 对话行（开场/剧情/触发对话共用）。 */
export interface DialogueLine { speaker: string; text: string }
```

函数签名与内部结构改动（共四处）：

```ts
// 旧：export function validateBattleDef(def: BattleDef, data: GameData): string[] {
//       ... const errs: string[] = []
//       ... errs.push(`告警：胜利目标 ${id} 仅来自增援（若增援被丢弃，战役将不可胜）`)
//       ... return errs
// 新：
export function validateBattleDef(def: BattleDef, data: GameData): ValidationReport {
  const errs: string[] = []
  const warns: string[] = []
```

告警行替换（去掉「告警：」前缀，改入 warns）：

```ts
  warns.push(`胜利目标 ${id} 仅来自增援（若增援被丢弃，战役将不可胜）`)
```

返回值替换：

```ts
  return { errors: errs, warnings: warns }
```

（函数 docstring 中「告警：」前缀约定同步删除。）

- [ ] **Step 2: 改 src/data/battles/yingchuan.ts 与 index.ts、engine/index.ts**

yingchuan.ts —— 删除本地 `export interface DialogueLine { speaker: string; text: string }`，改为：

```ts
import type { DialogueLine } from './shared'
export type { DialogueLine }
```

（`yingchuanDialogues: Record<string, DialogueLine[]>` 本体不变。）

index.ts 全量替换为：

```ts
import { yingchuan, yingchuanDialogues } from './yingchuan'
import type { BattleDef } from '../../engine/types'
import type { DialogueLine } from './shared'

export const battles: Record<string, BattleDef> = { [yingchuan.id]: yingchuan }

/** 开场对话 id（按战役注册；对话文本仍在各战役文件）。 */
export const battleOpeners: Record<string, string> = { yingchuan: 'yc_start' }

/** 对话文本注册表：battleId → dialogueId → 台词。 */
export const battleDialogues: Record<string, Record<string, DialogueLine[]>> = {
  yingchuan: yingchuanDialogues,
}
```

engine/index.ts 追加一行：

```ts
export type { BattleVerdict } from './wincheck'
```

（先查看 `src/engine/wincheck.ts` 实际导出的判定类型名；若不叫 `BattleVerdict`，以实际名导出 —— 下游用法不变。）

- [ ] **Step 3: 同步改写 tests/data/yingchuan.test.ts 断言**

改动四处（其余用例不动）：

```ts
  it('战役数据校验零错误零告警', () => {
    expect(validateBattleDef(yingchuan, gameData)).toEqual({ errors: [], warnings: [] })
  })
```

```ts
    const errs = validateBattleDef(broken, gameData)
    expect(errs.errors.some((e) => e.includes('越界'))).toBe(true)
    expect(errs.errors.some((e) => e.includes('坚守'))).toBe(true)
```

```ts
    expect(validateBattleDef(dup, gameData).errors.some((e) => e.includes('单位 id 重复'))).toBe(true)
```

```ts
    expect(validateBattleDef(bad, gameData).errors.some((e) => e.includes('应为敌方阵营'))).toBe(true)
```

```ts
  it('勘误负向：击破目标仅来自增援时告警（warnings 而非 errors）', () => {
    const warn: BattleDef = { ...yingchuan, win: { kind: 'killCommander', unitId: 'r1' } }
    const r = validateBattleDef(warn, gameData)
    expect(r.warnings.some((w) => w.includes('仅来自增援'))).toBe(true)
    expect(r.errors.some((e) => e.includes('仅来自增援'))).toBe(false)
  })
```

- [ ] **Step 4: 运行既有套件确认同步无回归**

```bash
npx vitest run tests/data/yingchuan.test.ts 2>&1 | tail -6
```

Expected: `7 passed`（断言已按新签名适配）

- [ ] **Step 5: 写失败测试 tests/game/bootstrap.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { loadBattle, assertBattleValid, dialogueLines } from '../../src/game/bootstrap'
import { yingchuan } from '../../src/data/battles/yingchuan'
import { gameData } from '../../src/data'
import type { BattleDef } from '../../src/engine/types'

describe('loadBattle', () => {
  it('颍川：回合 1、初始 14 个单位（5+9，增援未入场）', () => {
    const s = loadBattle('yingchuan', 42)
    expect(s.turn).toBe(1)
    expect(s.units).toHaveLength(14)
    expect(s.faction).toBe('player')
  })
  it('未知战役 id 抛错', () => {
    expect(() => loadBattle('nope', 1)).toThrow('未知战役')
  })
})

describe('assertBattleValid', () => {
  it('合法战役通过且返回告警数组', () => {
    expect(assertBattleValid(yingchuan, 'yingchuan')).toEqual([])
  })
  it('越界单位抛出完整错误清单', () => {
    const broken: BattleDef = {
      ...yingchuan,
      units: yingchuan.units.map((u) => (u.id === 'e1' ? { ...u, pos: { x: 99, y: 99 } } : u)),
    }
    expect(() => assertBattleValid(broken, 'broken')).toThrow('越界')
  })
})

describe('dialogueLines', () => {
  it('开场对话 3 行且首行曹操', () => {
    const lines = dialogueLines('yingchuan', 'yc_start')
    expect(lines).toHaveLength(3)
    expect(lines[0]!.speaker).toBe('曹操')
  })
  it('未知对话/未知战役返回空数组', () => {
    expect(dialogueLines('yingchuan', 'nope')).toEqual([])
    expect(dialogueLines('nope', 'yc_start')).toEqual([])
  })
})
```

- [ ] **Step 6: 运行确认失败**

```bash
npx vitest run tests/game/bootstrap.test.ts 2>&1 | tail -6
```

Expected: FAIL（`src/game/bootstrap` 模块不存在）

- [ ] **Step 7: 写 src/game/bootstrap.ts**

```ts
import { initBattle } from '../engine'
import type { BattleState } from '../engine/types'
import type { BattleDef } from '../engine/types'
import type { GameData } from '../data'
import { gameData } from '../data'
import { battles, battleDialogues } from '../data/battles'
import { validateBattleDef, type DialogueLine } from '../data/battles/shared'

/** 数据校验：errors 抛错（带完整清单），warnings 打印后放行。 */
export function assertBattleValid(def: BattleDef, battleId: string, data: GameData = gameData): string[] {
  const report = validateBattleDef(def, data)
  for (const w of report.warnings) console.warn(`[battle:${battleId}] 告警 ${w}`)
  if (report.errors.length > 0) {
    throw new Error(`战役数据校验失败: ${battleId}\n${report.errors.map((e) => ` - ${e}`).join('\n')}`)
  }
  return report.warnings
}

/** UI 层唯一战役入口：校验 + initBattle。 */
export function loadBattle(battleId: string, seed: number): BattleState {
  const def = battles[battleId]
  if (!def) throw new Error(`未知战役: ${battleId}`)
  assertBattleValid(def, battleId)
  return initBattle(def, gameData, seed)
}

/** 对话文本查询：未知返回空（UI 判空跳过）。 */
export function dialogueLines(battleId: string, dialogueId: string): DialogueLine[] {
  return battles[battleId] ? battleDialogues[battleId]?.[dialogueId] ?? [] : []
}
```

- [ ] **Step 8: 运行确认通过 + 全量回归**

```bash
npx vitest run tests/game/bootstrap.test.ts 2>&1 | tail -6
npx vitest run 2>&1 | tail -10
```

Expected: 新文件 `7 passed`；全量零失败（validateBattleDef 的其他调用方若还有 —— 全仓 `grep -rn validateBattleDef src tests` 确认全部适配新签名）。

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "refactor: 战役校验器拆分 errors/warnings 并接线加载期"
```

---

### Task 9: 主战斗画面与组装（App.vue + BattleScreen + UnitInfoPanel + HoverTooltip）

**Files:**
- Modify: `src/App.vue`（全量替换：标题画面 → 战斗画面）
- Create: `src/ui/screens/BattleScreen.vue`
- Create: `src/ui/components/UnitInfoPanel.vue`
- Create: `src/ui/components/HoverTooltip.vue`

设计要点：Vue 只做组装与输入 —— 游戏状态全部来自 `BattleOrchestrator` 回调（模板渲染 HUD），Canvas 全部经 `BattlefieldRenderer`（画面自己不画）。`BattleScreen` 持有动画 busy（播动画时锁输入）；镜头平移/滚轮/方向键；本任务先内置**最小动作条**（攻击/待机/撤销）与**最小结算条**、对话自动跳过 —— Task 10 把菜单抽组件，Task 11 把对话框/结算条抽组件。武将显示名经 `gameData.heroes` 反查。

- [ ] **Step 1: 改写 src/App.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BattleScreen from './ui/screens/BattleScreen.vue'

const started = ref(false)
</script>

<template>
  <div v-if="!started" class="title-screen">
    <h1>三国志 · 曹操传</h1>
    <p class="sub">Web 复刻 · 核心可玩版</p>
    <button class="start" @click="started = true">开始颍川之战</button>
  </div>
  <BattleScreen v-else battle-id="yingchuan" @exit="started = false" />
</template>

<style scoped>
.title-screen {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: radial-gradient(ellipse at center, #2a241c 0%, #141210 75%);
  color: #f0e6c8;
}
h1 { font-family: 'Songti SC', serif; font-size: 52px; letter-spacing: 14px; margin: 0; }
.sub { color: #9a8f7a; letter-spacing: 4px; margin: 0; }
.start {
  margin-top: 24px;
  padding: 12px 44px;
  font-size: 18px;
  letter-spacing: 6px;
  color: #141210;
  background: #d8b86a;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.start:hover { background: #f0d28a; }
</style>
```

- [ ] **Step 2: 写 src/ui/components/UnitInfoPanel.vue**

```vue
<script setup lang="ts">
import type { Unit } from '../../engine/types'
import type { GameData } from '../../data'
import { gameData } from '../../data'
import { effectiveStats } from '../../engine/internal'

interface Props { unit: Unit; maxHp: number; maxMp: number }
const props = defineProps<Props>()

const heroName = (u: Unit): string => gameData.heroes[u.heroId]?.name ?? u.id
const className = (u: Unit): string => gameData.classes[u.classId]?.name ?? u.classId
const equipNames = (u: Unit, data: GameData): string[] =>
  u.items.map((id) => data.equipments[id]?.name ?? data.items[id]?.name ?? id).filter(Boolean)
const STATUS_LABELS: Record<string, string> = { stun: '眩晕', defdown: '破甲', speedup: '疾风', accdown: '妖雾' }
const stats = () => effectiveStats(props.unit, gameData)
</script>

<template>
  <div class="panel">
    <div class="row head">
      <span class="name">{{ heroName(unit) }}</span>
      <span class="cls">{{ className(unit) }}</span>
      <span class="lv">Lv{{ unit.level }}</span>
    </div>
    <div class="bar hp"><i :style="{ width: (100 * unit.hp / maxHp) + '%' }" /><label>HP {{ unit.hp }}/{{ maxHp }}</label></div>
    <div class="bar mp"><i :style="{ width: maxMp ? (100 * unit.mp / maxMp) + '%' : '0%' }" /><label>MP {{ unit.mp }}/{{ maxMp }}</label></div>
    <div class="row stats">
      <span>攻 {{ stats().atk }}</span><span>防 {{ stats().def }}</span>
      <span>敏 {{ stats().spd }}</span><span>智 {{ stats().spirit }}</span><span>命中 {{ stats().acc }}</span>
    </div>
    <div v-if="equipNames(unit, gameData).length" class="row equips">{{ equipNames(unit, gameData).join(' · ') }}</div>
    <div v-if="unit.statuses.length" class="row status">
      <span v-for="st in unit.statuses" :key="st.kind" class="tag">{{ STATUS_LABELS[st.kind] ?? st.kind }}({{ st.turns }})</span>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: absolute;
  left: 10px;
  bottom: 10px;
  width: 300px;
  padding: 10px 12px;
  background: rgba(16, 13, 10, 0.88);
  border: 1px solid #6a5c40;
  border-radius: 4px;
  color: #f0e6c8;
  font-size: 13px;
  pointer-events: none;
}
.row { display: flex; gap: 10px; align-items: baseline; }
.head .name { font-size: 17px; font-weight: bold; }
.head .cls { color: #b8a878; }
.head .lv { margin-left: auto; color: #d8b86a; }
.bar { position: relative; height: 14px; margin: 4px 0; background: #2a241c; border: 1px solid #4a4030; }
.bar i { display: block; height: 100%; }
.bar.hp i { background: #4ec46a; }
.bar.mp i { background: #5588e0; }
.bar label { position: absolute; inset: 0; font-size: 11px; line-height: 14px; text-align: center; color: #fff; text-shadow: 0 0 2px #000; }
.stats { color: #c8bda6; }
.equips { color: #9a8f7a; }
.tag { background: #5a3020; padding: 1px 6px; border-radius: 3px; color: #ffd8a0; }
</style>
```

（`unit.heroId / unit.level / unit.statuses[].turns / gameData.classes[].name` 的字段名以 `src/engine/types.ts` 与 `src/data` 实际定义为准 —— 缺失的字段（如职业中文名）就从模板里去掉对应行，不强造数据。）

- [ ] **Step 3: 写 src/ui/components/HoverTooltip.vue**

```vue
<script setup lang="ts">
interface Props { x: number; y: number; title: string; lines: string[] }
defineProps<Props>()
</script>

<template>
  <div class="tooltip" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="tt-title">{{ title }}</div>
    <div v-for="(l, i) in lines" :key="i" class="tt-line">{{ l }}</div>
  </div>
</template>

<style scoped>
.tooltip {
  position: absolute;
  padding: 6px 10px;
  background: rgba(16, 13, 10, 0.92);
  border: 1px solid #6a5c40;
  border-radius: 4px;
  color: #e8dfc8;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  transform: translate(14px, -50%);
  white-space: nowrap;
}
.tt-title { font-weight: bold; color: #f0d28a; margin-bottom: 2px; }
.tt-line { color: #b8af98; }
</style>
```

- [ ] **Step 4: 写 src/ui/screens/BattleScreen.vue**

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { BattleState, Cell, EngineError, GameEvent, Unit } from '../../engine/types'
import { gameData } from '../../data'
import { affinity } from '../../engine/combat'
import { shapeCells } from '../../engine/spells'
import { effectiveStats } from '../../engine/internal'
import { TILE, centerOnCell, clampCamera, screenToCell, type Camera } from '../../render/camera'
import { BattlefieldRenderer, type HighlightLayer } from '../../render/battlefield'
import { Animator } from '../../render/animator'
import { BattleOrchestrator, type Intent, type UiState } from '../../game/orchestrator'
import { attackTargets, castableStrategies, moveRangeCells, spellTargetCells, usableItems } from '../../game/viewModel'
import UnitInfoPanel from '../components/UnitInfoPanel.vue'
import HoverTooltip from '../components/HoverTooltip.vue'

interface Props { battleId: string }
const props = defineProps<Props>()
defineEmits<{ (e: 'exit'): void }>()

type MenuMode = 'none' | 'action' | 'attackPick' | 'spellPick' | 'spell' | 'item'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const holderEl = ref<HTMLDivElement | null>(null)
const busy = ref(false)
const state = ref<BattleState | null>(null)
const ui = reactive<UiState>({ selectedUnitId: null, canUndo: false, dialogueQueue: [] })
const cam = reactive<Camera>({ x: 0, y: 0 })
const menuMode = ref<MenuMode>('none')
const pendingSpellId = ref<string | null>(null)
const hoverPx = ref<{ x: number; y: number } | null>(null)
const hoverCell = ref<Cell | null>(null)
const toast = ref<string | null>(null)
const result = ref<{ won: boolean; turn: number } | null>(null)

let renderer: BattlefieldRenderer | null = null
let animator: Animator | null = null
let orch: BattleOrchestrator | null = null
let rafIdle = 0
let toastTimer = 0
let mapInit = false

const selectedUnit = computed<Unit | null>(() =>
  state.value?.units.find((u) => u.id === ui.selectedUnitId) ?? null)
const targets = computed<string[]>(() =>
  selectedUnit.value && state.value ? attackTargets(state.value, selectedUnit.value.id, gameData) : [])
const spells = computed(() =>
  selectedUnit.value && state.value ? castableStrategies(state.value, selectedUnit.value.id, gameData) : [])
const items = computed(() => (selectedUnit.value ? usableItems(selectedUnit.value, gameData) : []))

const info = computed(() => {
  const s = state.value
  if (!s) return null
  const u = selectedUnit.value
    ?? (hoverCell.value ? s.units.find((x) => x.alive && x.pos.x === hoverCell.value!.x && x.pos.y === hoverCell.value!.y) : null)
    ?? s.units.find((x) => x.id === 'caocao' && x.alive)
    ?? null
  if (!u) return null
  const eff = effectiveStats(u, gameData)
  return { unit: u, maxHp: eff.hp, maxMp: eff.mp }
})

const tooltip = computed(() => {
  const s = state.value, hc = hoverCell.value, px = hoverPx.value
  if (!s || !hc || !px) return null
  if (hc.y < 0 || hc.y >= s.map.length || hc.x < 0 || hc.x >= s.map[0].length) return null
  const terr = gameData.terrains[s.map[hc.y][hc.x]]
  const lines: string[] = []
  if (terr.defBonus) lines.push(`防御 +${terr.defBonus}%`)
  const u = s.units.find((x) => x.alive && x.pos.x === hc.x && x.pos.y === hc.y)
  if (u) {
    lines.push(`${gameData.classes[u.classId]?.name ?? u.classId} · HP ${u.hp}/${effectiveStats(u, gameData).hp}`)
    const sel = selectedUnit.value
    if (sel && sel.id !== u.id) lines.push(`相克 ×${affinity(sel.classId, u.classId).toFixed(2)}`)
  }
  return { x: px.x, y: px.y, title: terr.name ?? s.map[hc.y][hc.x], lines }
})

// ---------- 渲染同步 ----------

function syncHighlights(): void {
  if (!renderer) return
  const hl: HighlightLayer = { move: new Set(), attack: new Set(), spell: new Set(), hover: hoverCell.value }
  const s = state.value
  const sel = selectedUnit.value
  if (s && sel && !busy.value) {
    if (menuMode.value === 'none' && !sel.moved)
      for (const c of moveRangeCells(s, sel.id, gameData)) hl.move.add(`${c.x},${c.y}`)
    if (menuMode.value === 'attackPick')
      for (const id of targets.value) {
        const t = s.units.find((u) => u.id === id)
        if (t) hl.attack.add(`${t.pos.x},${t.pos.y}`)
      }
    if ((menuMode.value === 'spellPick' || menuMode.value === 'spell') && pendingSpellId.value) {
      for (const c of spellTargetCells(s, sel.id, pendingSpellId.value, gameData)) hl.spell.add(`${c.x},${c.y}`)
      if (hoverCell.value && hl.spell.has(`${hoverCell.value.x},${hoverCell.value.y}`)) { // 悬停 AoE 预览
        const strat = gameData.strategies[pendingSpellId.value]!
        const h = s.map.length, w = s.map[0].length
        for (const c of shapeCells(hoverCell.value, strat.shape))
          if (c.x >= 0 && c.y >= 0 && c.x < w && c.y < h) hl.spell.add(`${c.x},${c.y}`)
      }
    }
  }
  renderer.setHighlights(hl)
}

// ---------- 编排回调 ----------

function onOrchState(s: BattleState, next: UiState): void {
  state.value = s
  ui.selectedUnitId = next.selectedUnitId
  ui.canUndo = next.canUndo
  ui.dialogueQueue = [...next.dialogueQueue]
  if (renderer) {
    renderer.setState(s)
    if (!mapInit) {
      renderer.setMap(s.map, s.map[0].length, s.map.length)
      mapInit = true
      centerInitial()
    }
    syncHighlights()
  }
  if (s.finished !== null && !result.value) result.value = { won: s.finished === 'won', turn: s.turn }
  if (next.selectedUnitId === null && !next.canUndo) menuMode.value = 'none'
}

function onOrchEvents(events: GameEvent[]): void {
  if (!events.length || !animator || !state.value) { drainDialogues(); return }
  busy.value = true
  const positions: Record<string, Cell> = {}
  for (const u of state.value.units) positions[u.id] = { x: u.pos.x, y: u.pos.y }
  animator.play(events, positions, () => {
    busy.value = false
    syncHighlights()
    drainDialogues()
  })
}

function onOrchError(e: EngineError): void {
  showToast(ERROR_TEXT[e.code] ?? `操作失败（${e.code}）`)
}

function drainDialogues(): void {
  // Task 11 接入 DialogueBox 后改为逐条展示；当前自动确认跳过
  while (orch && orch.uiState.dialogueQueue.length) orch.acknowledgeDialogue()
  ui.dialogueQueue = orch ? [...orch.uiState.dialogueQueue] : []
}

const ERROR_TEXT: Record<string, string> = {
  OUT_OF_MOVE_RANGE: '无法到达该格',
  NOT_IN_RANGE: '目标超出射程',
  NOT_ENOUGH_MP: 'MP 不足',
  NOT_YOUR_TURN: '还未到我方行动',
  CANNOT_TARGET: '无法选中该目标',
  CLASS_CANNOT_CAST: '该兵种无法施放此法术',
  SPELL_UNUSABLE_IN_WEATHER: '当前天气无法施放',
  ITEM_NOT_HELD: '未持有该道具',
  ITEM_NOT_CONSUMABLE: '该道具不可使用',
}

function showToast(text: string): void {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.value = null }, 1800)
}

// ---------- 交互 ----------

function localPx(ev: MouseEvent): { x: number; y: number } {
  const rect = canvasEl.value!.getBoundingClientRect()
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
}

function onMouseMove(ev: MouseEvent): void {
  const px = localPx(ev)
  hoverPx.value = px
  hoverCell.value = screenToCell(px.x, px.y, cam)
  syncHighlights()
}

function onClick(ev: MouseEvent): void {
  if (busy.value || !orch || !state.value || result.value) return
  const px = localPx(ev)
  const cell = screenToCell(px.x, px.y, cam)
  const s = state.value
  const inBounds = cell.y >= 0 && cell.y < s.map.length && cell.x >= 0 && cell.x < s.map[0].length
  const unitAt = inBounds ? s.units.find((u) => u.alive && u.pos.x === cell.x && u.pos.y === cell.y) : undefined

  if (menuMode.value === 'attackPick') {
    if (unitAt && targets.value.includes(unitAt.id)) doIntent({ type: 'attack', targetId: unitAt.id })
    else menuMode.value = 'action'
    return
  }
  if (menuMode.value === 'spellPick' && pendingSpellId.value && ui.selectedUnitId) {
    const cells = spellTargetCells(s, ui.selectedUnitId, pendingSpellId.value, gameData)
    if (cells.some((c) => c.x === cell.x && c.y === cell.y))
      doIntent({ type: 'cast', strategyId: pendingSpellId.value, target: { x: cell.x, y: cell.y } })
    else menuMode.value = 'spell'
    return
  }
  // 点击已选中单位本身 → 直接打开动作菜单（原地攻击/法术/道具）
  if (ui.selectedUnitId && unitAt?.id === ui.selectedUnitId) { menuMode.value = 'action'; return }
  // 已移动待决：只能由动作菜单驱动（撤销/待机/攻击）
  if (ui.canUndo) return
  // 菜单悬浮时点画布其余处 → 关闭菜单
  if (menuMode.value !== 'none') { menuMode.value = 'none'; return }
  if (unitAt && unitAt.faction === 'player' && !unitAt.acted && s.faction === 'player') {
    orch.dispatch({ type: 'selectUnit', unitId: unitAt.id })
  } else if (ui.selectedUnitId) {
    orch.dispatch({ type: 'deselect' })
  }
}

function doIntent(intent: Intent): void {
  menuMode.value = 'none'
  pendingSpellId.value = null
  orch?.dispatch(intent)
}

function onWheel(ev: WheelEvent): void { pan(0, ev.deltaY) }

function pan(dx: number, dy: number): void {
  const s = state.value
  const canvas = canvasEl.value
  if (!s || !canvas || !renderer) return
  const next = clampCamera(
    { x: cam.x + dx, y: cam.y + dy },
    s.map[0].length * TILE, s.map.length * TILE, canvas.width, canvas.height,
  )
  cam.x = next.x
  cam.y = next.y
  renderer.setCamera(next)
}

function onKey(ev: KeyboardEvent): void {
  if (ev.key === 'Escape') {
    if (menuMode.value === 'attackPick' || menuMode.value === 'spellPick' || menuMode.value === 'spell' || menuMode.value === 'item')
      menuMode.value = ui.canUndo ? 'action' : 'none'
    else if (ui.canUndo) doIntent({ type: 'undoMove' })
    else if (ui.selectedUnitId) orch?.dispatch({ type: 'deselect' })
    return
  }
  const step = TILE
  if (ev.key === 'ArrowLeft') pan(-step, 0)
  if (ev.key === 'ArrowRight') pan(step, 0)
  if (ev.key === 'ArrowUp') pan(0, -step)
  if (ev.key === 'ArrowDown') pan(0, step)
}

function onResize(): void {
  const canvas = canvasEl.value, holder = holderEl.value
  if (!canvas || !holder) return
  canvas.width = holder.clientWidth
  canvas.height = holder.clientHeight
  pan(0, 0) // 重新夹取镜头并重绘
}

function centerInitial(): void {
  const s = state.value, canvas = canvasEl.value
  if (!s || !canvas || !renderer) return
  const cc = s.units.find((u) => u.faction === 'player' && u.id === 'caocao') ?? s.units.find((u) => u.faction === 'player')!
  const c = clampCamera(
    centerOnCell(cc.pos, canvas.width, canvas.height),
    s.map[0].length * TILE, s.map.length * TILE, canvas.width, canvas.height,
  )
  cam.x = c.x
  cam.y = c.y
  renderer.setCamera(c)
}

// ---------- 生命周期 ----------

function setupOrchestrator(): void {
  const seed = Date.now() % 2147483647
  mapInit = false
  result.value = null
  menuMode.value = 'none'
  pendingSpellId.value = null
  orch = new BattleOrchestrator(props.battleId, seed, {
    onState: onOrchState,
    onEvents: onOrchEvents,
    onError: onOrchError,
  })
}

onMounted(() => {
  const canvas = canvasEl.value!
  const holder = holderEl.value!
  canvas.width = holder.clientWidth
  canvas.height = holder.clientHeight
  renderer = new BattlefieldRenderer(canvas, gameData)
  animator = new Animator(renderer)
  setupOrchestrator()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
  const loop = (now: number): void => {
    if (!animator?.busy) renderer?.render(now) // 动画播放器自带 rAF，空闲时由本循环重绘（水面波纹等）
    rafIdle = requestAnimationFrame(loop)
  }
  rafIdle = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafIdle)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
  clearTimeout(toastTimer)
  animator?.cancel()
})

function restart(): void {
  animator?.cancel()
  busy.value = false
  setupOrchestrator()
}
</script>

<template>
  <div class="battle">
    <div class="hud">
      <span>第 {{ state?.turn ?? '—' }} 回合</span>
      <span>{{ state?.faction === 'player' ? '我军行动' : state?.faction === 'enemy' ? '敌军行动' : '友军行动' }}</span>
      <span>{{ state?.weather === 'rain' ? '雨' : state?.weather === 'snow' ? '雪' : '晴' }}</span>
      <span class="spacer" />
      <button :disabled="busy || state?.faction !== 'player' || !!result" @click="doIntent({ type: 'endTurn' })">结束回合</button>
      <button @click="$emit('exit')">退出</button>
    </div>
    <div ref="holderEl" class="holder">
      <canvas ref="canvasEl" @mousemove="onMouseMove" @click="onClick" @wheel.prevent="onWheel" />
      <UnitInfoPanel v-if="info" :unit="info.unit" :max-hp="info.maxHp" :max-mp="info.maxMp" />
      <HoverTooltip v-if="tooltip" :x="tooltip.x" :y="tooltip.y" :title="tooltip.title" :lines="tooltip.lines" />
      <div v-if="menuMode === 'action' && !busy" class="menu action-row">
        <button :disabled="targets.length === 0" @click="menuMode = 'attackPick'">攻击</button>
        <button :disabled="spells.length === 0" @click="menuMode = 'spell'">法术</button>
        <button :disabled="items.length === 0" @click="menuMode = 'item'">道具</button>
        <button @click="doIntent({ type: 'wait' })">待机</button>
        <button v-if="ui.canUndo" @click="doIntent({ type: 'undoMove' })">撤销</button>
      </div>
      <div v-else-if="menuMode === 'spell' && !busy" class="menu list">
        <button v-for="s in spells" :key="s.id" @click="pendingSpellId = s.id; menuMode = 'spellPick'">
          {{ s.name }}（{{ s.mpCost }}MP）
        </button>
        <button @click="menuMode = 'action'">返回</button>
      </div>
      <div v-else-if="menuMode === 'item' && !busy" class="menu list">
        <button v-for="it in items" :key="it.id" @click="doIntent({ type: 'useItem', itemId: it.id })">
          {{ it.name }}
        </button>
        <button @click="menuMode = 'action'">返回</button>
      </div>
      <div v-if="toast" class="toast">{{ toast }}</div>
      <div v-if="result" class="overlay">
        <h2>{{ result.won ? '胜 利' : '败 北' }}</h2>
        <p>第 {{ result.turn }} 回合{{ result.won ? '告捷' : '战罢' }}</p>
        <button @click="restart">重新开始</button>
        <button @click="$emit('exit')">返回标题</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle { display: flex; flex-direction: column; width: 100vw; height: 100vh; background: #141210; color: #f0e6c8; }
.hud { display: flex; gap: 18px; align-items: center; padding: 8px 14px; background: #1d1913; border-bottom: 1px solid #4a4030; font-size: 14px; }
.hud .spacer { flex: 1; }
.hud button { padding: 4px 14px; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; }
.hud button:disabled { opacity: 0.4; cursor: default; }
.holder { position: relative; flex: 1; overflow: hidden; }
.holder canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
.menu { position: absolute; right: 12px; bottom: 12px; display: flex; flex-direction: column; gap: 6px; padding: 10px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px; }
.menu.action-row { flex-direction: row; }
.menu button { padding: 6px 16px; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; min-width: 64px; }
.menu button:disabled { opacity: 0.4; cursor: default; }
.toast { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); padding: 6px 18px; background: rgba(90, 30, 20, 0.92); border: 1px solid #a05040; border-radius: 4px; font-size: 14px; }
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: rgba(10, 8, 6, 0.82); }
.overlay h2 { font-family: 'Songti SC', serif; font-size: 56px; letter-spacing: 20px; margin: 0; color: #f0d28a; }
.overlay button { padding: 8px 28px; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; }
</style>
```

（`spells`/`items` 与 `menuMode === 'spell' | 'item'` 分支已在本任务内联实现 —— Task 10 将其抽为 `ActionMenu/SpellMenu/ItemMenu` 组件并接 `attackPick/spellPick` 的完整交互，行为不变。）

- [ ] **Step 5: 类型门禁 + 手动冒烟**

```bash
npm run build 2>&1 | tail -8
```

Expected: vue-tsc 零错误、构建成功。随后 `npm run dev 2>&1 | tail -5` 起服务，浏览器打开手动冒烟：标题 → 点开始 → 战场出现（地形/单位/血条）、点曹操出现蓝色移动范围、点范围格移动并出现动作菜单、待机/结束回合可推进敌方回合（有横幅与 AI 动画）、Esc/方向键/滚轮生效。问题记录到 Task 12 清单复验。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 主战斗画面（Canvas 交互/镜头/状态条/悬浮提示）"
```

---

### Task 10: 菜单组件化（ActionMenu / SpellMenu / ItemMenu）

**Files:**
- Create: `src/ui/components/ActionMenu.vue`
- Create: `src/ui/components/SpellMenu.vue`
- Create: `src/ui/components/ItemMenu.vue`
- Modify: `src/ui/screens/BattleScreen.vue`（内联菜单替换为组件）

设计要点：Task 9 的内联菜单行为已可用 —— 本任务把三块菜单抽成受控组件（props 进、事件出），BattleScreen 只留模式切换。纯重构：抽完 `npm run build` 必须零错误，交互行为与 Task 9 冒烟时完全一致。

- [ ] **Step 1: 写三个组件**

`src/ui/components/ActionMenu.vue`：

```vue
<script setup lang="ts">
interface Props { canAttack: boolean; canCast: boolean; canItem: boolean; canUndo: boolean }
defineProps<Props>()
defineEmits<{ (e: 'attack'): void; (e: 'cast'): void; (e: 'item'): void; (e: 'wait'): void; (e: 'undo'): void }>()
</script>

<template>
  <div class="menu row">
    <button :disabled="!canAttack" @click="$emit('attack')">攻击</button>
    <button :disabled="!canCast" @click="$emit('cast')">法术</button>
    <button :disabled="!canItem" @click="$emit('item')">道具</button>
    <button @click="$emit('wait')">待机</button>
    <button v-if="canUndo" @click="$emit('undo')">撤销</button>
  </div>
</template>

<style scoped>
.menu { display: flex; gap: 6px; padding: 10px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px; }
.menu button { padding: 6px 16px; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; min-width: 64px; }
.menu button:disabled { opacity: 0.4; cursor: default; }
</style>
```

`src/ui/components/SpellMenu.vue`：

```vue
<script setup lang="ts">
import type { StrategyDef } from '../../engine/types'

interface Props { strategies: StrategyDef[] }
defineProps<Props>()
defineEmits<{ (e: 'pick', id: string): void; (e: 'back'): void }>()

const KIND_LABELS: Record<string, string> = { attack: '攻击', heal: '治疗', buff: '增益', debuff: '减益' }
</script>

<template>
  <div class="menu">
    <button v-for="s in strategies" :key="s.id" @click="$emit('pick', s.id)">
      {{ s.name }} <small>{{ KIND_LABELS[s.kind] ?? s.kind }} · {{ s.mpCost }}MP</small>
    </button>
    <button class="back" @click="$emit('back')">返回</button>
  </div>
</template>

<style scoped>
.menu { display: flex; flex-direction: column; gap: 6px; padding: 10px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px; min-width: 180px; }
.menu button { padding: 6px 12px; text-align: left; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; }
.menu small { color: #9a8f7a; margin-left: 6px; }
.menu .back { text-align: center; }
</style>
```

`src/ui/components/ItemMenu.vue`：

```vue
<script setup lang="ts">
import type { ItemDef } from '../../engine/types'

interface Props { items: ItemDef[] }
defineProps<Props>()
defineEmits<{ (e: 'use', id: string): void; (e: 'back'): void }>()

const desc = (it: ItemDef): string => {
  const parts: string[] = []
  if (it.healHp) parts.push(`HP+${it.healHp}`)
  if (it.healMp) parts.push(`MP+${it.healMp}`)
  return parts.join(' ') || '道具'
}
</script>

<template>
  <div class="menu">
    <button v-for="it in items" :key="it.id" @click="$emit('use', it.id)">
      {{ it.name }} <small>{{ desc(it) }}</small>
    </button>
    <button class="back" @click="$emit('back')">返回</button>
  </div>
</template>

<style scoped>
.menu { display: flex; flex-direction: column; gap: 6px; padding: 10px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px; min-width: 160px; }
.menu button { padding: 6px 12px; text-align: left; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; }
.menu small { color: #9a8f7a; margin-left: 6px; }
.menu .back { text-align: center; }
</style>
```

（`ItemDef.healHp/healMp`、`StrategyDef.name/kind/mpCost` 字段以 `src/engine/types.ts` 实际定义为准。）

- [ ] **Step 2: BattleScreen 替换内联菜单**

script 增加导入：

```ts
import ActionMenu from '../components/ActionMenu.vue'
import SpellMenu from '../components/SpellMenu.vue'
import ItemMenu from '../components/ItemMenu.vue'
```

模板中 Task 9 的三个 `v-if/v-else-if` 菜单块整体替换为：

```html
      <ActionMenu
        v-if="menuMode === 'action' && !busy && ui.selectedUnitId"
        :can-attack="targets.length > 0" :can-cast="spells.length > 0"
        :can-item="items.length > 0" :can-undo="ui.canUndo"
        @attack="menuMode = 'attackPick'" @cast="menuMode = 'spell'" @item="menuMode = 'item'"
        @wait="doIntent({ type: 'wait' })" @undo="doIntent({ type: 'undoMove' })"
      />
      <SpellMenu
        v-else-if="menuMode === 'spell' && !busy && ui.selectedUnitId"
        :strategies="spells"
        @pick="(id: string) => { pendingSpellId = id; menuMode = 'spellPick' }"
        @back="menuMode = 'action'"
      />
      <ItemMenu
        v-else-if="menuMode === 'item' && !busy && ui.selectedUnitId"
        :items="items"
        @use="(id: string) => doIntent({ type: 'useItem', itemId: id })"
        @back="menuMode = 'action'"
      />
```

同时删除 BattleScreen `<style>` 中被组件接走的 `.menu ...` 规则与组件内重复样式（保留 `.holder` 定位相关：菜单组件的容器改为 `position: absolute; right: 12px; bottom: 12px;` —— 在 BattleScreen 中包一层定位容器或给组件加 `class="floating"` 皆可，选后者并在 BattleScreen 加 `.floating { position: absolute; right: 12px; bottom: 12px; }`）。

- [ ] **Step 3: 类型门禁 + 冒烟复验**

```bash
npm run build 2>&1 | tail -8
```

Expected: 构建通过。`npm run dev` 复验 Task 9 冒烟清单中菜单相关条目（攻击/法术选择/道具/待机/撤销/返回）行为不变。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 动作/法术/道具菜单组件化"
```

---

### Task 11: 打字机对话与结算画面（DialogueBox / ResultBanner）

**Files:**
- Create: `src/ui/components/DialogueBox.vue`
- Create: `src/ui/components/ResultBanner.vue`
- Modify: `src/ui/screens/BattleScreen.vue`（接入对话框：替换"自动跳过对话"与内联结算条）

设计要点：对话为经典战棋演出 —— 底部半透明框 + 左侧程序化头像（`drawPortrait`）+ 打字机逐字 + 点击推进。`BattleScreen.drainDialogues` 从"自动确认"改为"逐条展示，finished 后 `acknowledgeDialogue` 再取下一条"。结算画面从内联 overlay 抽成组件（胜负/回合数；奖励列表 prop 预留，颍川暂传 `[]`）。

- [ ] **Step 1: 写 src/ui/components/DialogueBox.vue**

```vue
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { DialogueLine } from '../../data/battles/shared'
import type { HeroDef } from '../../engine/types'
import { gameData } from '../../data'
import { drawPortrait } from '../../render/sprites'

interface Props { lines: DialogueLine[] }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'finished'): void }>()

const idx = ref(0)
const shown = ref('')
const canvasEl = ref<HTMLCanvasElement | null>(null)
let timer = 0

const line = computed<DialogueLine | null>(() => props.lines[idx.value] ?? null)
const fullText = computed<string>(() => line.value?.text ?? '')

/** 说话人 → 武将定义（查不到给通用兜底：同色相、默认兵种）。 */
function heroOf(speaker: string): HeroDef {
  const found = Object.values(gameData.heroes).find((h) => h.name === speaker)
  if (found) return found
  return { id: `npc:${speaker}`, name: speaker, classId: 'infantry', portraitHue: 210 } as unknown as HeroDef
}

function paintPortrait(): void {
  const cv = canvasEl.value
  const l = line.value
  if (!cv || !l) return
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, cv.width, cv.height)
  drawPortrait(ctx, heroOf(l.speaker), 0, 0, cv.width)
}

function startTyping(): void {
  clearInterval(timer)
  shown.value = ''
  void nextTick(paintPortrait)
  timer = window.setInterval(() => {
    if (shown.value.length < fullText.value.length) shown.value += fullText.value[shown.value.length]!
    else clearInterval(timer)
  }, 28)
}

watch(() => [props.lines, idx.value], startTyping, { immediate: true })

function advance(): void {
  if (shown.value.length < fullText.value.length) { // 先补全本行
    shown.value = fullText.value
    return
  }
  if (idx.value < props.lines.length - 1) idx.value += 1
  else emit('finished')
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div v-if="line" class="dialogue" @click="advance">
    <canvas ref="canvasEl" width="72" height="72" class="portrait" />
    <div class="body">
      <div class="speaker">{{ line.speaker }}</div>
      <p class="text">{{ shown }}<i v-if="shown.length >= fullText.length" class="cursor">▼</i></p>
    </div>
  </div>
</template>

<style scoped>
.dialogue {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  width: min(720px, 92%);
  padding: 12px 16px;
  background: rgba(12, 10, 7, 0.92);
  border: 2px solid #8a7a50;
  border-radius: 6px;
  color: #f0e6c8;
  cursor: pointer;
  z-index: 20;
}
.portrait { width: 72px; height: 72px; image-rendering: pixelated; border: 1px solid #6a5c40; }
.speaker { color: #f0d28a; font-weight: bold; letter-spacing: 2px; margin-bottom: 4px; }
.text { margin: 0; font-size: 16px; line-height: 1.7; min-height: 54px; }
.cursor { font-style: normal; color: #f0d28a; animation: blink 0.8s infinite; margin-left: 4px; }
@keyframes blink { 50% { opacity: 0; } }
</style>
```

- [ ] **Step 2: 写 src/ui/components/ResultBanner.vue**

```vue
<script setup lang="ts">
interface Props { won: boolean; turn: number; rewards?: string[] }
withDefaults(defineProps<Props>(), { rewards: () => [] })
defineEmits<{ (e: 'restart'): void; (e: 'exit'): void }>()
</script>

<template>
  <div class="overlay">
    <h2>{{ won ? '胜 利' : '败 北' }}</h2>
    <p>第 {{ turn }} 回合{{ won ? '告捷' : '战罢' }}</p>
    <ul v-if="rewards.length" class="rewards">
      <li v-for="r in rewards" :key="r">获得 {{ r }}</li>
    </ul>
    <div class="btns">
      <button @click="$emit('restart')">重新开始</button>
      <button @click="$emit('exit')">返回标题</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: rgba(10, 8, 6, 0.82); color: #f0e6c8; }
h2 { font-family: 'Songti SC', serif; font-size: 56px; letter-spacing: 20px; margin: 0; color: #f0d28a; }
.rewards { list-style: none; padding: 0; color: #d8b86a; }
.btns { display: flex; gap: 12px; }
button { padding: 8px 28px; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; }
</style>
```

- [ ] **Step 3: BattleScreen 接线**

script 改动：

```ts
import DialogueBox from '../components/DialogueBox.vue'
import ResultBanner from '../components/ResultBanner.vue'
import { dialogueLines } from '../../game/bootstrap'

const dialogueId = ref<string | null>(null)
const dialogueText = computed(() =>
  dialogueId.value ? dialogueLines(props.battleId, dialogueId.value) : [])
```

`drainDialogues` 替换为逐条展示版：

```ts
function drainDialogues(): void {
  if (!dialogueId.value && orch && orch.uiState.dialogueQueue.length)
    dialogueId.value = orch.uiState.dialogueQueue[0]!
}
function onDialogueFinished(): void {
  orch?.acknowledgeDialogue()
  dialogueId.value = null
  drainDialogues() // 链式取下一条
}
```

模板中内联结算 overlay 替换为：

```html
      <ResultBanner
        v-if="result"
        :won="result.won" :turn="result.turn" :rewards="[]"
        @restart="restart" @exit="$emit('exit')"
      />
      <DialogueBox v-if="dialogueText.length && !result" :lines="dialogueText" @finished="onDialogueFinished" />
```

注意：对话展示期间应锁输入 —— `onClick`/`onKey` 开头追加 `if (dialogueId.value) return`；`restart` 中重置 `dialogueId.value = null`。

- [ ] **Step 4: 类型门禁 + 冒烟复验**

```bash
npm run build 2>&1 | tail -8
```

Expected: 构建通过。`npm run dev` 验证：进入战场弹出开场对话（曹操 3 行、点击逐行推进、最后消失）；打完一局出结算画面（重开/返回均可）。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 打字机对话与胜负结算画面"
```

---

### Task 12: 颍川全流程自动对局 + 手动验收清单

**Files:**
- Test: `tests/integration/playthrough.test.ts`
- Create: `docs/superpowers/manual-checks-m2.md`

设计要点：自动对局 = 双方都用 `decideUnitAction`（我方也交给 AI），从 `loadBattle` 打到终局，断言**零错误 + 必终局 + 确定性**。这是三层装配（data→engine→game）的最大集成网：任何一层接口不匹配都会在这里爆。

- [ ] **Step 1: 写 tests/integration/playthrough.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import type { BattleState, GameEvent } from '../../src/engine/types'
import { apply, decideUnitAction } from '../../src/engine'
import { gameData } from '../../src/data'
import { battles } from '../../src/data/battles'
import { loadBattle } from '../../src/game/bootstrap'
import { runFactionTurn } from '../../src/game/aiRunner'

/** 双方全 AI 自动对局：返回终局状态与累计错误（指令被引擎拒绝即错误）。 */
function autoPlay(seed: number): { errors: string[]; finished: BattleState['finished']; turn: number; events: GameEvent[] } {
  let s = loadBattle('yingchuan', seed)
  const errors: string[] = []
  const events: GameEvent[] = []
  for (let guard = 0; guard < 500 && s.finished === null; guard++) {
    if (s.faction === 'player') {
      for (const u of s.units) {
        if (s.finished !== null || u.faction !== 'player' || !u.alive || u.acted) continue
        for (const cmd of decideUnitAction(s, u.id, gameData)) {
          if (s.finished !== null) break
          const r = apply(s, cmd, gameData)
          if (!r.ok) {
            errors.push(`player ${u.id}: ${JSON.stringify(cmd)} → ${JSON.stringify(r.error)}`)
            break
          }
          s = r.state
          events.push(...r.events)
        }
      }
    } else {
      const r = runFactionTurn(s, s.faction, gameData)
      s = r.state
      events.push(...r.events)
      for (const e of r.errors) errors.push(`${s.faction}: ${JSON.stringify(e)}`)
    }
    if (s.finished === null) {
      const r = apply(s, { type: 'endTurn' }, gameData)
      if (!r.ok) {
        errors.push(`endTurn: ${JSON.stringify(r.error)}`)
        break
      }
      s = r.state
      events.push(...r.events)
    }
  }
  return { errors, finished: s.finished, turn: s.turn, events }
}

describe('颍川之战全流程自动对局', () => {
  it('seed 42：零错误、我方全歼获胜、未超回合上限', () => {
    const r = autoPlay(42)
    expect(r.errors).toEqual([])
    expect(r.finished).toBe('won')
    expect(r.turn).toBeLessThanOrEqual(battles.yingchuan.maxTurns)
    expect(r.events.some((e) => e.type === 'battleWon')).toBe(true)
  })
  it('seed 7：两次运行事件序列逐字节一致（确定性）', () => {
    expect(JSON.stringify(autoPlay(7).events)).toBe(JSON.stringify(autoPlay(7).events))
  })
  it('多 seed 全部正常终局且零错误', () => {
    for (const seed of [1, 7, 42, 2026]) {
      const r = autoPlay(seed)
      expect(r.errors, `seed ${seed}`).toEqual([])
      expect(r.finished, `seed ${seed}`).not.toBeNull()
    }
  })
})
```

- [ ] **Step 2: 运行确认通过（若失败，这是三层装配的集成网 —— 修到绿为止）**

```bash
npx vitest run tests/integration/playthrough.test.ts 2>&1 | tail -10
```

Expected: `3 passed`。若 `finished` 为 null（打满 guard），说明 AI 互殴在 20 回合内未分胜负 —— 检查 `maxTurns` 到顶时引擎是否按失败判（`survive`/超时判负逻辑），必要时用断言 `finished !== null` 替代 `'won'`（敌我同源 AI，胜负本就不保证单侧）。

- [ ] **Step 3: 写 docs/superpowers/manual-checks-m2.md**

```markdown
# 里程碑 2 手动验收清单（颍川之战可玩）

启动：`npm run dev` → 浏览器打开提示地址（桌面优先，Chrome/Safari 最新版）。

## 标题与进入
- [ ] 标题画面显示「三国志 · 曹操传」，点击「开始颍川之战」进入战场
- [ ] 进入后自动弹出开场对话（曹操/夏侯惇/荀彧 三行，打字机逐字），点击推进，末行点击后关闭

## 战场渲染
- [ ] 16×12 地形正确：草地/树林/山丘/水域/颍川城/军营/关隘/桥，水面有波纹动画
- [ ] 我方蓝色调、敌方红色调；六个兵种剪影可分辨（君主持剑/步兵盾枪/骑兵马身/弓兵弓弧/军师摇扇/道士执杖）
- [ ] 单位脚下阵营色环、头顶血条（变色阈值 50%/25%）、已行动单位变暗

## 我方回合交互
- [ ] 点选我方单位 → 蓝色移动范围（不含水面/占位格）
- [ ] 点范围格 → 单位滑动过去，弹出动作菜单（攻击/法术/道具/待机/撤销）
- [ ] 撤销 → 单位回到原位、菜单关闭、可重选移动格
- [ ] 攻击 → 敌方可击目标红色高亮 → 点击目标：突进/闪白/伤害飘字（先动画后数字）→ 若击杀则淡出
- [ ] 法术 → 菜单列出法术与 MP → 选择后紫色射程圆盘 → 悬停显示 AoE 形状预览 → 点击施放：法阵爆发 + 治疗/伤害数字
- [ ] 道具 → 列出携带道具 → 使用回血/回蓝（MP 不足/射程外等操作有 toast 提示）
- [ ] 待机 → 单位变暗、选中清空
- [ ] 非法操作（超射程攻击等）有 toast 且状态不变

## 敌方回合与回合流
- [ ] 结束回合 → 「敌军行动」横幅 → 敌军逐个移动/攻击/施法有动画 → 「第 N 回合」「我军行动」横幅 → 回到可操作
- [ ] 第 3 回合敌方增援入场并有对应对话触发
- [ ] 击杀张梁触发剧情对话

## 镜头与 HUD
- [ ] 鼠标滚轮/方向键平移镜头（边界夹取）；窗口缩放自适应
- [ ] 底部信息面板：选中/悬停单位的名/级/HP/MP/五维/装备/状态
- [ ] 悬浮提示：地形防御加成、敌单位概要、与选中单位的相克倍率

## 结算
- [ ] 全歼敌方 → 胜利画面（回合数 + 重开/返回）
- [ ] 曹操阵亡或超回合 → 败北画面
- [ ] 重开 → 新 seed 重启整场（含开场对话）
```

- [ ] **Step 4: 全量回归 + Commit**

```bash
npx vitest run 2>&1 | tail -10
git add -A && git commit -m "test: 颍川全流程自动对局与手动验收清单"
```

---

### Task 13: README 里程碑收口与终验

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README.md**

三处改动（先读现状再改，保持既有结构）：

1. 里程碑清单勾选里程碑 2（`- [ ] 里程碑 2` → `- [x] 里程碑 2：Canvas 渲染 + 交互 + 颍川之战可玩`，文字以 README 现有条目为准）。

2. 「架构」小节追加三层说明（在既有 engine/data 条目后）：

```markdown
- `src/render/` — Canvas 渲染层：像素画/镜头纯函数/战场渲染器/动画规划与播放（零 Vue 依赖）
- `src/game/` — 编排层：视图模型查询、AI 阵营批执行、BattleOrchestrator（意图→指令）、loadBattle 加载期校验
- `src/ui/` — Vue 3 组装层：BattleScreen + 菜单/对话/结算/信息面板组件
```

3. 新增「玩法操作」（放在架构或快速开始之后）：

```markdown
## 玩法操作（颍川之战）

1. 标题画面点「开始颍川之战」
2. 点选蓝色我方单位 → 蓝色格为可达范围，点击移动
3. 移动后弹出动作菜单：攻击（红高亮选目标）/ 法术（紫射程 + AoE 预览）/ 道具 / 待机 / 撤销
4. 「结束回合」推进敌方行动（自动 AI + 动画演出）
5. 滚轮 / 方向键平移镜头；Esc 取消当前选择
6. 全歼敌军获胜；曹操阵亡或超过回合上限失败
```

4. 若 README 的引擎接口示例中 `apply` 返回值写作其它形式，统一为：

```ts
apply(state, cmd, data) // → { ok: true, state, events } | { ok: false, error }
```

- [ ] **Step 2: 终验（全量测试 + 构建）**

```bash
npx vitest run 2>&1 | tail -10
npm run build 2>&1 | tail -8
```

Expected: 全部测试通过（M1 113 + M2 新增 ≈ 45+）；vue-tsc + vite build 零错误。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: 里程碑 2 完成说明与操作指南"
```

---

## 计划自审记录

**Spec 覆盖（§2 / §5 / §10-里程碑2）：**
- 三层架构 render/game/ui —— Task 1-2（render）、Task 3-5/8（game）、Task 9-11（ui）✓
- 战场渲染（地形/水面动画/高亮/血条/横幅）—— Task 2 ✓
- 战斗交互（选中/移动/撤销/攻击/法术 AoE 预览/道具/待机/回合推进）—— Task 9 + Task 10 ✓
- 敌方 AI 回合演出 —— Task 4 + Task 6 ✓
- 对话（开场/触发）与结算画面 —— Task 11 + battleOpeners（Task 5）/battleDialogues（Task 8）✓
- M1→M2 移交项：终局中断（T4）、AI M-1/M-4/M-9（T7）、校验拆分+接线（T8）、battleStarted 合成（T5）、hue 撞色→剪影（T1）、hpChanged/attackLaunched 顺序→压后飘字（T6）✓
- 里程碑 2 验收（可从标题打到结算）—— Task 12 自动对局 + 手动清单 ✓

**YAGNI 复核：** 未加音效/存档/整备/多战役菜单/移动端 —— 均在 M3+ 清单；ResultBanner 的 rewards prop 留空数组不造假数据。

**类型一致性检查（重点核对过）：**
- `Intent`/`UiState`/`OrchestratorCallbacks`：Task 5 定义 = Task 9 使用 ✓
- `HighlightLayer`/`UnitOverride`/`FloatText`/`BurstFx`：Task 2 定义 = Task 6 消费 ✓
- `planAnimations`/`Animator`：Task 6 签名与头部 API 块一致 ✓
- 渲染器最终为 `setState + render(now)`（Task 2 已同步），Animator 播放器依赖此签名 ✓
- `battleOpeners` 定义于 data 层（Task 5）先于 orchestrator 使用 ✓；`battleDialogues`（Task 8）供 bootstrap `dialogueLines` ✓

**已知的"以实际定义为准"核对点**（实现时逐个对齐，均为字段名级差异，不影响断言逻辑）：engine 事件字面量字段（T6 测试）、`wincheck` 判定类型名（T8）、装备/道具/法术中文名与 id（T3/T7/T10）、`TerrainDef.name`、`HeroDef` 兜底转换（T11）、`tests/engine/helpers` 的 mkBattle 默认值（T3/T7）。
