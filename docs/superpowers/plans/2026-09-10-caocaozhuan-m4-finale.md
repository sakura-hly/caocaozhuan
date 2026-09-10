# 曹操传 M4（终章：8 战 + 善恶抉择 + 三档结局）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 spec §9 后 5 场战役（青州/徐州/濮阳/宛城/下邳），引入善恶值与战后抉择，敌方军师 AI 施法，通关按忠奸分三档结局。

**Architecture:** 沿用四层（engine 冻结 / data 静态 / game 纯函数 / ui Vue）。善恶值落 `CampaignState`（morality + choicesMade），战后抉择走新数据注册表 `battleChoices` + SettleScreen 内嵌 ChoiceBox，结局屏按 morality 分档。敌方 AI 施法在 aiRunner（game 层）扩展。**引擎零改动**（四种 WinCondition 含 `reach` 已在 M1 落地）。

**Tech Stack:** Vue 3 `<script setup>` + TS + Vitest + Canvas 2D（不变）。

---

## 设计决策（实现者必读）

1. **善恶值口径**：`morality: number` 初始 0，仁 +1 / 暴 −1。结局分档：`>= 2` 忠臣 / `<= -2` 奸雄 / 其余 中间。
2. **抉择呈现位置**：战后（SettleScreen 报告下方内嵌 ChoiceBox），不进战斗内——避开 orchestrator/BattleScreen 改动。每场至多 1 个抉择。
3. **防重复**：`CampaignState.choicesMade: Record<string, number>`（choiceId → 选项下标）。已答的抉择不再出现；存档往返保持。
4. **存档兼容**：`version` 保持 1；`validCampaign` 对 morality/choicesMade 缺省容错（旧 M3 档读入后 morality=0、choicesMade={}）。
5. **徐州"或撤退"**：引擎 WinCondition 是单值不做 OR——胜利条件定为 `killCommander(taoqian)`，"屠城/安民"作为战后抉择呈现（原版亦为破陶谦后的分支），忠实度够。
6. **濮阳三城门**：地图设计承载（三条通路 + 三处城门缺口），不加机制化选择。
7. **宛城撤退点**：`{ kind: 'reach'; unitId: 'caocao'; cell }`，引擎已有。典韦断后 = 回合对话 + 张绣军增援潮演出。
8. **下邳水淹**：`weatherScript` turn 6 → rainy（禁火=战术影响）+ 水淹对白 + 城内守军增援出击。不做地形改写（引擎冻结）。
9. **入册节奏**（13 人到齐）：青州→曹仁（已在册? 否——曹仁未入过 roster）、徐州→于禁、濮阳→郭嘉、宛城→许褚、下邳→荀攸。newcomer 机制（settleBattle 战后入册）已有。
10. **敌方 AI 施法**（M3 延期清偿）：军师类敌方（strategist/taoist 且有可施法术）每回合 ~50% 概率先施法（优先 debuff 最高 atk 玩家单位，其次治疗本方低血单位），再走既有攻击/移动启发式。友军共用。
11. **音效**：spec 标注"视情况"——延后登记，本计划不做。
12. **数值标定协议**（沿用 M3）：多 seed [1,7,42,2026] 全 AI 自打须全 `won` 且零 error；只动敌方数值杠杆（杂兵 atk → 主将 hp → level），不动我方/友军。

## 既有事实（勿重查）

- `WinCondition`（engine/types.ts:100）：annihilate / killCommander / survive / reach 四种
- `heroUnit`（data/battles/shared.ts）：`{ level?, base?, equipment?, items? }`；`heroId: ''` = 无名杂兵
- 法术已注册：debuff `pojia`(破甲)/`xuanyun`(眩晕)/`yaowu`(妖雾)、heal `zhiyu`/`qunliao`、attack 含 `shuiyan`(水淹)
- 道具池未发放宝物：`dilu_horse`/`sunzi_book`/`mingguang_armor`/`shuangtie_ji`（M4 宝物格/掉落用）
- `settleBattle`：战后 newcomers 自动入册；败北原样返回不结算
- `CAMPAIGN_BATTLES`（game/campaign.ts）：当前 `['yingchuan','sishui','hulao']`，M4 改 8 元组
- `saves.ts`：envelope `{ v:1, savedAt, campaign }`，`validCampaign` 已有 isFin/Number.isInteger/Object.hasOwn 硬化
- 测试基线：241 用例 / 32 文件；类型门 `npm run build`（vue-tsc && vite build）
- M3 遗留锁：`tests/integration/campaign-loop.test.ts` 以 `CAMPAIGN_BATTLES` 遍历——扩到 8 战后该测试自动覆盖新战役（seed 42 全胜须重标定各关数值）

---

### Task 1: 敌方武将注册（陶谦/张绣/陈宫）

**Files:**
- Modify: `src/data/heroes.ts`（defs 数组末尾追加 3 条）
- Test: `tests/data/heroes.test.ts`（若无则 Create）

- [ ] **Step 1: 写失败测试**

`tests/data/heroes.test.ts`（若文件已存在则追加 describe；先 `ls tests/data/` 确认）：

```ts
import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'

describe('M4 敌方武将注册', () => {
  const need: Array<[string, string, string]> = [
    ['taoqian', '陶谦', 'lord'],
    ['zhangxiu', '张绣', 'cavalry'],
    ['chengong', '陈宫', 'strategist'],
  ]
  for (const [id, name, cls] of need) {
    it(`${name}（${id}）已注册为 ${cls}`, () => {
      const h = gameData.heroes[id]
      expect(h, id).toBeDefined()
      expect(h!.name).toBe(name)
      expect(h!.classId).toBe(cls)
      expect(Number.isFinite(h!.base.hp)).toBe(true)
    })
  }
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/data/heroes.test.ts 2>&1 | tail -8`
Expected: 3 个 FAIL（undefined 注册）

- [ ] **Step 3: 实现**

`src/data/heroes.ts` defs 数组末尾（吕布条目之后）追加：

```ts
  { id: 'taoqian', name: '陶谦', title: '字恭祖', classId: 'lord', portraitHue: 50,
    base: { hp: 62, mp: 6, atk: 12, def: 10, spirit: 5, agi: 8 } },
  { id: 'zhangxiu', name: '张绣', title: '北地枪王', classId: 'cavalry', portraitHue: 330,
    base: { hp: 70, mp: 0, atk: 15, def: 11, spirit: 4, agi: 12 } },
  { id: 'chengong', name: '陈宫', title: '字公台', classId: 'strategist', portraitHue: 140,
    base: { hp: 48, mp: 24, atk: 8, def: 8, spirit: 14, agi: 9 } },
```

- [ ] **Step 4: 测试通过 + 类型门**

Run: `npx vitest run tests/data/herores.test.ts 2>&1 | tail -4`（注意文件名以实际创建为准）
Run: `npm run build 2>&1 | tail -4`
Expected: PASS / 构建成功

- [ ] **Step 5: 提交**

```bash
git add src/data/heroes.ts tests/data/heroes.test.ts
git commit -m "feat: 登记陶谦/张绣/陈宫"
```

---

### Task 2: campaign 善恶值与抉择记录（morality + choicesMade + applyChoice）

**Files:**
- Modify: `src/game/campaign.ts`
- Modify: `src/game/saves.ts`（validCampaign 兼容旧档）
- Test: `tests/game/campaign.test.ts`（追加 describe）、`tests/game/saves.test.ts`（追加用例）

- [ ] **Step 1: 写失败测试**

`tests/game/campaign.test.ts` 追加：

```ts
describe('善恶值与抉择记录', () => {
  it('newGame 初始 morality 0、choicesMade 空', () => {
    const c = newGame()
    expect(c.morality).toBe(0)
    expect(c.choicesMade).toEqual({})
  })
  it('applyChoice 写入善恶增量和选项下标，幂等键防重复', () => {
    let c = newGame()
    const r1 = applyChoice(c, 'xuzhou_post', 1) // 暴 −1
    expect(r1.campaign.morality).toBe(-1)
    expect(r1.campaign.choicesMade['xuzhou_post']).toBe(1)
    c = r1.campaign
    const r2 = applyChoice(c, 'xuzhou_post', 0) // 已答：拒绝重复作答
    expect(r2.ok).toBe(false)
    expect(r2.campaign).toBeUndefined()
    expect(c.morality).toBe(-1) // 原状态不可变
  })
  it('choiceMade 查询已答抉择', () => {
    const c = applyChoice(newGame(), 'wancheng_post', 0).campaign
    expect(choiceMade(c, 'wancheng_post')).toBe(0)
    expect(choiceMade(c, 'xiapi_post')).toBeNull()
  })
})
```

`tests/game/saves.test.ts` 追加（旧档兼容——M3 快照无 morality 字段）：

```ts
it('M3 旧档缺 morality/choicesMade 读入后取默认值', () => {
  const old = newGame()
  const legacy = { ...old } as Record<string, unknown>
  delete legacy.morality
  delete legacy.choicesMade
  const envelope = JSON.stringify({ v: 1, savedAt: Date.now(), campaign: legacy })
  const c = deserialize(envelope, gameData)
  expect(c).not.toBeNull()
  expect(c!.morality).toBe(0)
  expect(c!.choicesMade).toEqual({})
})
it('morality 非整数或 choicesMade 非法对象被判损坏', () => {
  const base = { v: 1, savedAt: Date.now(), campaign: { ...newGame(), morality: 1.5 } }
  expect(deserialize(JSON.stringify(base), gameData)).toBeNull()
  const base2 = { v: 1, savedAt: Date.now(), campaign: { ...newGame(), choicesMade: { a: 'x' } } }
  expect(deserialize(JSON.stringify(base2), gameData)).toBeNull()
})
```

（`deserialize`/`gameData`/`newGame` 若未在文件顶部导入则补 import；断言风格对齐既有用例。）

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/game/campaign.test.ts tests/game/saves.test.ts 2>&1 | tail -10`
Expected: 新用例 FAIL（属性不存在 / 类型错）

- [ ] **Step 3: 实现**

`src/game/campaign.ts`：

`CampaignState` 增两字段（放 inventory 之后）：

```ts
export interface CampaignState {
  version: 1
  progress: number
  roster: RosterMember[]
  inventory: string[]
  /** 忠奸值：仁 +1 / 暴 −1，0 起。结局分档 ≥2 忠臣 / ≤−2 奸雄 / 其余中间。 */
  morality: number
  /** 已答抉择：choiceId → 选项下标（防重复作答，存档持久）。 */
  choicesMade: Record<string, number>
}
```

`newGame` 返回值补：`morality: 0, choicesMade: {}`。

同文件追加导出（放 settleBattle 之后）：

```ts
/** 查询抉择已选下标；未答返回 null。 */
export function choiceMade(c: CampaignState, choiceId: string): number | null {
  const v = c.choicesMade[choiceId]
  return typeof v === 'number' ? v : null
}

/** 作答战后抉择：写善恶增量的入口由调用方（UI）从 battleChoices 数据取值，此处只落账。 */
export function applyChoice(
  c: CampaignState, choiceId: string, optionIndex: number,
): { ok: true; campaign: CampaignState } | { ok: false; error: string } {
  if (Object.hasOwn(c.choicesMade, choiceId)) return { ok: false, error: '该抉择已作答' }
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 9) {
    return { ok: false, error: `非法选项下标: ${optionIndex}` }
  }
  return {
    ok: true,
    campaign: {
      ...c,
      choicesMade: { ...c.choicesMade, [choiceId]: optionIndex },
    },
  }
}
```

注意：善恶数值增量（±1）与物品奖励由 T3 的 `battleChoices` 数据表定义、T5 的 UI 层组合调用（`applyChoice` 落账 + `morality` 变更走新的纯函数）——为保持纯函数单一职责，campaign.ts 再加：

```ts
/** 善恶值变更（UI 从抉择数据读 delta 后调用）。 */
export function addMorality(c: CampaignState, delta: number): CampaignState {
  return { ...c, morality: c.morality + delta }
}
```

测试第 2 用例中 `applyChoice(c, 'xuzhou_post', 1)` 后 morality 为 −1 —— 组合语义：测试改为分两步断言：

```ts
const r1 = applyChoice(c, 'xuzhou_post', 1)
const withMorality = addMorality(r1.campaign, -1)
expect(withMorality.morality).toBe(-1)
```

（以实现为准修正测试——applyChoice 不含 morality 变更。）

`src/game/saves.ts` `validCampaign`（函数名以实际为准）在既有字段校验后追加：

```ts
  // M4 字段：旧 M3 档缺省容错（读入后由 normalize 补默认）
  if (Object.hasOwn(raw, 'morality') && !Number.isInteger(raw.morality)) return null
  if (Object.hasOwn(raw, 'choicesMade')) {
    const cm = raw.choicesMade
    if (typeof cm !== 'object' || cm === null || Array.isArray(cm)) return null
    for (const v of Object.values(cm)) if (!Number.isInteger(v) || v < 0 || v > 9) return null
  }
```

读取侧（loadSlot/deserialize 的 campaign 构造处）补默认：

```ts
  campaign.morality = Number.isInteger(raw.morality) ? raw.morality : 0
  campaign.choicesMade = raw.choicesMade && typeof raw.choicesMade === 'object' ? { ...raw.choicesMade } : {}
```

（实现时对齐该文件实际的校验/构造结构，语义 = 缺省容错 + 非法拒绝。）

- [ ] **Step 4: 全量测试 + 类型门**

Run: `npm test 2>&1 | tail -6 && npm run build 2>&1 | tail -4`
Expected: 全绿（既有 241 + 新增）/ 构建成功。**settleBattle/deployBattle 返回的 campaign 展开（...c）自动携带新字段，无需改动。**

- [ ] **Step 5: 提交**

```bash
git add src/game/campaign.ts src/game/saves.ts tests/game/campaign.test.ts tests/game/saves.test.ts
git commit -m "feat: 战役状态善恶值与抉择记录（旧档兼容）"
```

---

### Task 3: 战后抉择数据注册表（battleChoices + ChoiceDef）

**Files:**
- Create: `src/data/battles/choices.ts`
- Modify: `src/data/battles/index.ts`（re-export）
- Test: `tests/data/choices.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/data/choices.test.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { battleChoices } from '../../src/data/battles'
import { battles } from '../../src/data/battles'

describe('战后抉择注册表', () => {
  it('三战抉择存在且 battleId 均为已注册战役', () => {
    for (const id of ['xuzhou_post', 'wancheng_post', 'xiapi_post']) {
      const ch = battleChoices[id]
      expect(ch, id).toBeDefined()
      expect(battles[ch.battleId], `${id}.battleId`).toBeDefined()
    }
  })
  it('选项结构合法：2 项、delta 为 ±1、奖励道具已注册', () => {
    for (const ch of Object.values(battleChoices)) {
      expect(ch.prompt.length).toBeGreaterThan(0)
      expect(ch.options).toHaveLength(2)
      for (const opt of ch.options) {
        expect(Math.abs(opt.morality)).toBe(1)
        for (const item of opt.itemRewards ?? []) {
          expect(gameData.items[item], `${ch.id} 奖励 ${item}`).toBeDefined()
        }
      }
    }
  })
  it('每战至多一个抉择（battleId 不重复）', () => {
    const seen = new Set<string>()
    for (const ch of Object.values(battleChoices)) {
      expect(seen.has(ch.battleId), ch.battleId).toBe(false)
      seen.add(ch.battleId)
    }
  })
})
```

（`gameData` 未导入则补：`import { gameData } from '../../src/data'`。）

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/data/choices.test.ts 2>&1 | tail -6`
Expected: FAIL（battleChoices 不存在）

- [ ] **Step 3: 实现**

`src/data/battles/choices.ts`：

```ts
/** 战后抉择：呈现于 SettleScreen（报告下方），作答写 morality 并入 choicesMade。 */
export interface ChoiceOption {
  label: string
  /** 善恶增量：仁 +1 / 暴 −1。 */
  morality: number
  /** 入库奖励（可选）。 */
  itemRewards?: string[]
}
export interface ChoiceDef {
  id: string
  battleId: string
  /** 说话人（复用程序化头像）。 */
  speaker: string
  prompt: string
  options: ChoiceOption[]
}

export const battleChoices: Record<string, ChoiceDef> = {
  xuzhou_post: {
    id: 'xuzhou_post', battleId: 'xuzhou', speaker: '荀彧',
    prompt: '陶谦已死，徐州已定。城中将士请示：如何处置徐州军民？',
    options: [
      { label: '出安民告示，秋毫无犯（仁）', morality: 1 },
      { label: '纵兵屠城，为父报仇（暴）', morality: -1, itemRewards: ['mingguang_armor'] },
    ],
  },
  wancheng_post: {
    id: 'wancheng_post', battleId: 'wancheng', speaker: '曹操',
    prompt: '张绣已降，宛城已定。其部曲降卒数千，如何处置？',
    options: [
      { label: '抚恤降卒，收编为己用（仁）', morality: 1 },
      { label: '尽诛张绣旧部，以绝后患（暴）', morality: -1 },
    ],
  },
  xiapi_post: {
    id: 'xiapi_post', battleId: 'xiapi', speaker: '刘备',
    prompt: '白门楼上，吕布被缚，怒视刘备："大耳儿最叵信！"如何处置吕布？',
    options: [
      { label: '斩之，以正军法（仁）', morality: 1 },
      { label: '惜其勇武，招揽为己用（暴）', morality: -1 },
    ],
  },
}
```

`src/data/battles/index.ts` 追加：

```ts
export { battleChoices, type ChoiceDef } from './choices'
```

- [ ] **Step 4: 测试通过 + 类型门**

Run: `npx vitest run tests/data/choices.test.ts 2>&1 | tail -4 && npm run build 2>&1 | tail -3`

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/choices.ts src/data/battles/index.ts tests/data/choices.test.ts
git commit -m "feat: 战后抉择数据注册表（徐州/宛城/白门楼）"
```

---

### Task 4: 引擎 AI 补 debuff 施法分支（M2 登记项清偿）

> 冻结纪律说明：spec §3.9「军师优先施法」自 M1 即为引擎 AI 需求，M1 实现遗漏 debuff/buff 分支，自 M2 起登记延期至 M4（manual-checks-m3 已知限制原文「M3 敌方无限debuff AI（陈宫类敌军师留 M4）」——本任务即该项清偿）。改动为纯函数内新增分支，不触碰既有行为分支。

**Files:**
- Modify: `src/engine/ai.ts`（法术评分循环加 debuff 分支）
- Test: `tests/engine/ai.test.ts`（追加 describe；文件名以实际为准——先 `ls tests/engine/`）

- [ ] **Step 1: 写失败测试**

`tests/engine/ai.test.ts` 追加（导入与构造手法对齐文件内既有用例；下方为语义骨架，须用该文件既有的局面构造助手改写）：

```ts
describe('AI debuff 施法（M4 清偿）', () => {
  it('军师对最高威胁敌方单位施放破甲，而非物理攻击', () => {
    // 局面：敌方 strategist（陈宫，mp 足够）与高 atk 我方单位（典韦）距离 2 内
    // 断言 decideUnitAction 返回含 { type: 'cast', strategyId: 'pojia' } 且 target 为典韦位置
  })
  it('目标已带状态时不再叠 debuff（防无限施法）', () => {
    // 局面：唯一敌方目标已有 statuses 非空 → 不返回 debuff cast（可返回攻击/推进/wait）
  })
  it('mp 不足或雨天禁用时不施 debuff', () => {
    // mp < mpCost → 无 cast；weather rainy 对风系法术照常（pojia 无天气限制则只测 mp 分支）
  })
})
```

（具体断言以运行结果为准：施法评分须高于对同目标的物理攻击评分才能胜出。）

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/engine/ai.test.ts 2>&1 | tail -8`

- [ ] **Step 3: 实现**

`src/engine/ai.ts` 法术循环（`} else if (s.kind === 'attack') {` 块之后）追加分支：

```ts
      } else if (s.kind === 'debuff') {
        // M4（M2 登记项）：军师优先削弱最高威胁目标；已带状态不叠（防无限施法——原版敌军师作风）
        for (const t of foes) {
          if (manhattan(cell, t.pos) > s.range) continue
          if (t.statuses.length > 0) continue
          const score = 14 + effectiveStats(t, data).atk * 1.2 // 威胁越高越值得削弱
          if (score > best.score) best = { score, cmds: [...moveCmd, { type: 'cast', unitId, strategyId: s.id, target: { x: t.pos.x, y: t.pos.y } }] }
        }
      }
```

评分基准：常见物理攻击评分 = est（≈ atk − def×0.6，我方 Lv5 前排对陈宫 def 8 ≈ 8-15）；`14 + atk×1.2` 对 atk≥10 的目标 ≈ 26+，稳定高于普攻但低于击杀加倍（est×2）——高血量前排被 debuff、残血目标仍优先击杀。**buff 分支不做**（spec 只要求 debuff 优先）。

- [ ] **Step 4: 全量回归（重点：三战役闭环多 seed 不得翻红）**

Run: `npm test 2>&1 | tail -6`
Expected: 全绿。若 sishui/hulao 的 seed 锁因友军/敌方军师行为改变而 FAIL：AI 决策是确定性的，行为变化会传导——此时按失败 seed 复盘，若闭环仍全胜仅事件序列断言过时则更新断言并在提交信息注明；若出现败局，下调 debuff 评分（14→10）重试。**不允许改战役数值来迁就 AI 变化。**

- [ ] **Step 5: 提交**

```bash
git add src/engine/ai.ts tests/engine/ai.test.ts
git commit -m "feat: 引擎 AI 补军师 debuff 施法（M2 登记项清偿）"
```

---

### Task 5: ChoiceBox 组件 + SettleScreen 抉择集成 + App 落账接线

**Files:**
- Create: `src/ui/components/ChoiceBox.vue`
- Modify: `src/ui/screens/SettleScreen.vue`（报告下方内嵌抉择）
- Modify: `src/App.vue`（onBattleFinished 后若本场有未答抉择，作答后落账）
- Test: 手动验收（纯 UI，无组件测试——对齐 M3 惯例，登记延后）

**契约**：抉择数据 = T3 `battleChoices`，键为 `${battleId}_post` 形态由数据自带 id；作答 = `applyChoice`（落 choicesMade）+ `addMorality`（落 delta）+ 物品 `inventory.push(...rewards)`（campaign 不可变——用展开重建）。落账发生在 App（campaign 唯一属主），SettleScreen 只发事件。

- [ ] **Step 1: ChoiceBox.vue（完整代码）**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ChoiceDef } from '../../data/battles/choices'
import { gameData } from '../../data'
import { drawPortrait } from '../../render/sprites'
import { heroOf } from './portraitLookup'

const props = defineProps<{ choice: ChoiceDef }>()
const emit = defineEmits<{ (e: 'picked', optionIndex: number): void }>()

const cv = ref<HTMLCanvasElement | null>(null)
/** 静态头像，挂载画一次（同 DialogueBox.paintPortrait 手法）。 */
onMounted(() => {
  const el = cv.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return
  ctx.clearRect(0, 0, el.width, el.height)
  drawPortrait(ctx, heroOf(props.choice.speaker), 0, 0, el.width)
})

const itemName = (id: string) => gameData.items[id]?.name ?? id
</script>

<template>
  <div class="choice">
    <canvas ref="cv" width="56" height="56" class="portrait" />
    <div class="body">
      <p class="prompt">{{ choice.prompt }}</p>
      <button v-for="(opt, i) in choice.options" :key="i" @click="$emit('picked', i)">
        {{ opt.label }}<template v-if="opt.itemRewards?.length">（得 {{ opt.itemRewards.map(itemName).join('、') }}）</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.choice { display: flex; gap: 12px; padding: 12px; background: rgba(12, 10, 7, 0.92); border: 2px solid #8a7a50; border-radius: 6px; }
.portrait { width: 56px; height: 56px; image-rendering: pixelated; border: 1px solid #6a5c40; align-self: flex-start; }
.body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.prompt { margin: 0; font-size: 15px; line-height: 1.6; color: #f0e6c8; }
button { padding: 8px 16px; text-align: left; background: #2a241c; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; font-size: 14px; }
button:hover { background: #3a3226; border-color: #d8b86a; }
</style>
```

`heroOf`：DialogueBox.vue 内已有同名私有函数（speaker → HeroDef 兜底）。**不复制**——把它从 DialogueBox 抽到 `src/ui/components/portraitLookup.ts` 导出，DialogueBox 改为 import（这是本任务唯一允许触碰 DialogueBox 的改动，抽取不改行为）：

```ts
// src/ui/components/portraitLookup.ts
import type { HeroDef } from '../../engine/types'
import { gameData } from '../../data'

/** 说话人 → 武将定义（查不到给通用兜底：同色相、默认兵种）。 */
export function heroOf(speaker: string): HeroDef {
  const found = Object.values(gameData.heroes).find((h) => h.name === speaker)
  if (found) return found
  return { id: `npc:${speaker}`, name: speaker, classId: 'infantry', portraitHue: 210 } as unknown as HeroDef
}
```

ChoiceBox 画头像：`onMounted` 中取 canvas ref 调 `drawPortrait(ctx, heroOf(props.choice.speaker), 0, 0, 56)`（参照 DialogueBox.paintPortrait，静态无打字机不需要重绘）。

- [ ] **Step 2: SettleScreen 集成**

props 增 `choice?: ChoiceDef | null`；emits 增 `(e: 'choicePicked', optionIndex: number): void`。模板在「返回进度」按钮**之前**插入：

```vue
<ChoiceBox v-if="choice" :choice="choice" @picked="(i: number) => $emit('choicePicked', i)" />
```

「返回进度」按钮在 `choice` 存在时禁用（` :disabled="!!choice"` —— 必须作答才能继续；败北无抉择不受影响）。

- [ ] **Step 3: App 接线**

script 增加：

```ts
import { battleChoices } from './data/battles'
import { applyChoice, addMorality } from './game/campaign'
```

`onBattleFinished` 内、`screen.value = 'settle'` 之前补：从 `battleDef.value.id` 找本战抉择：

```ts
  const pending = Object.values(battleChoices).find(
    (ch) => ch.battleId === battleDef.value!.id && !Object.hasOwn(campaign.value.choicesMade, ch.id),
  ) ?? null
```

`settleReport` 同级新增 `const pendingChoice = ref<ChoiceDef | null>(null)`；`onBattleFinished` 末尾 `pendingChoice.value = pending`（败北 settleBattle 不会进此函数？——败北也走 finished→settle 屏！败北抉择判定：仅 `r.report.won` 为 true 时带抉择：`pendingChoice.value = r.report.won ? pending : null`）。

新增 handler：

```ts
/** 抉择作答：落账善恶/物品/防重复，随后清空让结算屏放行。 */
function onChoicePicked(optionIndex: number): void {
  const ch = pendingChoice.value
  if (!ch || !campaign.value) return
  const opt = ch.options[optionIndex]
  if (!opt) return
  const answered = applyChoice(campaign.value, ch.id, optionIndex)
  if (!answered.ok) { pendingChoice.value = null; return }
  let c = addMorality(answered.campaign, opt.morality)
  if (opt.itemRewards?.length) c = { ...c, inventory: [...c.inventory, ...opt.itemRewards] }
  campaign.value = c
  saveSlot(localStorageAdapter, 'auto', c) // 抉择影响即落盘
  pendingChoice.value = null
}
```

template SettleScreen 节点补 `:choice="pendingChoice"` 与 `@choice-picked="onChoicePicked"`。

- [ ] **Step 4: 类型门 + 全量测试**

Run: `npm run build 2>&1 | tail -4 && npm test 2>&1 | tail -4`
Expected: 成功 / 全绿

- [ ] **Step 5: 提交**

```bash
git add src/ui/components/ChoiceBox.vue src/ui/components/portraitLookup.ts src/ui/components/DialogueBox.vue src/ui/screens/SettleScreen.vue src/App.vue
git commit -m "feat: 战后善恶抉择（ChoiceBox + 结算屏集成 + App 落账）"
```

---

### Task 6: 青州之战（歼灭战 · 收编于禁 · 宝物格）

**Files:**
- Create: `src/data/battles/qingzhou.ts`
- Modify: `src/data/battles/index.ts`（注册 battles/battleOpeners/battleDialogues）
- Test: `tests/data/qingzhou.test.ts`

**地图 16×12**（黄巾大营北，中部水泽村落，玩家南；逐行数清 16 字符，`parseMap` 拒绝不齐）：

```
mPPPPP........mm
m.P..........f.m
.....f..w......m
.........ww.....
..f......ww.....
.f.......ww..C..
..........w..C..
...w............
..f....w......f.
.m......f.....mm
mm............mm
mm......ff....mm
```

- [ ] **Step 1: 写失败测试**

`tests/data/qingzhou.test.ts`（骨架对齐 tests/data/hulao.test.ts 模式——先读该文件抄结构）：

```ts
import { describe, it, expect } from 'vitest'
import { gameData } from '../../src/data'
import { battles, battleOpeners, battleDialogues } from '../../src/data/battles'
import { assertBattleValid } from '../../src/game/bootstrap'
import { qingzhou } from '../../src/data/battles/qingzhou'

describe('青州之战定义', () => {
  it('三注册表登记一致（battles/openers/dialogues）', () => {
    expect(battles.qingzhou).toBe(qingzhou)
    expect(battleOpeners.qingzhou).toBe('qz_start')
    expect(Object.keys(battleDialogues.qingzhou!).length).toBeGreaterThanOrEqual(3)
  })
  it('校验零错误（assertBattleValid 返回 errors: string[]）', () => {
    expect(assertBattleValid(qingzhou, 'qingzhou', gameData)).toEqual([])
  })
  it('12 行 × 16 列地图', () => {
    expect(qingzhou.map).toHaveLength(12)
    expect(qingzhou.map.every((r) => r.length === 16)).toBe(true)
  })
  it('于禁为玩家新参战；胜利 = 歼灭全敌；两宝物格', () => {
    const yj = qingzhou.units.find((u) => u.heroId === 'yujin')
    expect(yj?.faction).toBe('player')
    expect(qingzhou.win).toEqual({ kind: 'annihilate' })
    expect(qingzhou.treasureCells).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/data/qingzhou.test.ts 2>&1 | tail -6`

- [ ] **Step 3: 实现 qingzhou.ts**

骨架完全对齐 sishui.ts（import / 常量块 / BattleDef / Dialogues）。要点：

- 杂兵基值：黄巾贼(步兵) `{ hp: 54, mp: 0, atk: 12, def: 8, spirit: 3, agi: 7 }`、黄巾弓手 `{ hp: 44, mp: 0, atk: 13, def: 6, spirit: 4, agi: 9 }`、黄巾道士(taoist) `{ hp: 42, mp: 18, atk: 8, def: 6, spirit: 12, agi: 8 }`（道士带 `pojia`/`yaowu`——T4 的 debuff AI 由此生效）、渠帅( cavalry) `{ hp: 62, mp: 0, atk: 14, def: 10, spirit: 4, agi: 10 }`
- 玩家 7 员 = 曹操、夏侯惇、夏侯渊、李典、乐进、荀彧、典韦（位置 y8-11 南半区，参考：caocao(3,9)、xiaohoudun(2,8)、xiahouyuan(2,10)、lidian(4,8)、yuejin(4,10)、xunyu(5,9)、dianwei(6,9)）+ 新参战 `heroUnit('yujin', 'player', { x: 5, y: 11 })`
- 敌方 9 员：渠帅×2（e0 (4,1)、e5 (5,0)），黄巾贼×4（(2,2)(7,1)(9,5)(6,4)），弓手×2（(3,0)(8,2)），道士×1（(4,3)）——道士是 debuff 演出核心，放中路必经
- reinforcements：turn 5 黄巾贼×2 从北缘 (8,0)/(7,0)
- treasureCells：`{ cell: { x: 13, y: 6 }, itemId: 'dilu_horse', found: false }`、`{ cell: { x: 9, y: 8 }, itemId: 'huanshen_dan', found: false }`
- drops：无（歼灭战奖励走宝物格）
- dialogues：opener `qz_start`（曹操：黄巾复起……）、turn 3 `qz_taoshi`（于禁请战——本战演出主角）、onDeathOf 渠帅 e0 `qz_win`；battleDialogues 三组台词各 2-3 行（措辞自拟，风格对齐 sishui）
- `weather: 'sunny', weatherScript: [], win: { kind: 'annihilate' }, maxTurns: 20`

- [ ] **Step 4: 测试通过 + 类型门**

Run: `npx vitest run tests/data/qingzhou.test.ts 2>&1 | tail -4 && npm run build 2>&1 | tail -3`

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/qingzhou.ts src/data/battles/index.ts tests/data/qingzhou.test.ts
git commit -m "feat: 青州讨伐战（歼灭战/收编于禁/黄巾道士 debutt 首演）"
```

（提交信息注意：`debuff` 别打错。）

---

### Task 7: 徐州复仇战（击破陶谦 · 许褚登场 · 战后抉择）

**Files:**
- Create: `src/data/battles/xuzhou.ts`
- Modify: `src/data/battles/index.ts`
- Test: `tests/data/xuzhou.test.ts`

**地图 18×12**（玩家西、护城河竖列 x11-12 桥 y5/y8、陶谦城东）：

```
....f......w....CC
...........w....CC
..f........w...C.C
..........ww......
....f.....bb...C..
..........ww..CCCC
..m.......ww...CCC
..........bb......
.mm.......ww......
..m.......ww......
mm........ww....ff
m.........ww......
```

（逐行数清 18 字符；ww 竖列在 x10-11，桥 bb 在 y4 与 y7 的 x10-11。）

- [ ] **Step 1: 写失败测试**（骨架同 T6，改断言）：

```ts
it('许褚为玩家新参战；胜利 = 击破陶谦；陶谦掉落无（奖励走抉择）', () => {
  const xc = xuzhou.units.find((u) => u.heroId === 'xuchu')
  expect(xc?.faction).toBe('player')
  expect(xuzhou.win).toEqual({ kind: 'killCommander', unitId: 'taoqian' })
  expect(xuzhou.drops ?? []).toHaveLength(0)
})
it('陶谦 Lv4 军师辅佐：荀谋试阻（敌方带 healer 保陶谦——数值见定义）', () => {
  const tq = xuzhou.units.find((u) => u.heroId === 'taoqian')
  expect(tq?.level).toBe(4)
})
```

- [ ] **Step 2: 运行确认失败** → `npx vitest run tests/data/xuzhou.test.ts 2>&1 | tail -6`

- [ ] **Step 3: 实现 xuzhou.ts**

- 玩家 7 员：曹操、夏侯惇、夏侯渊、典韦、李典、荀彧、+ 新参战 `xuchu`（西缘 y4-7 一字排开）
- 敌方：`taoqian` Lv4 于城心 (15,5)；丹阳兵(步兵) ×4 河东岸与桥头；弓手 ×2 城墙；**敌军师**（mobUnit '陶谦幕僚' strategist，带 zhiyu 治疗保陶谦）×1 —— healer AI 已有（M1），陶谦更难击杀
- dialogues：opener `xz_start`（曹操泣誓复仇 / 荀彧劝抚民）；turn 4 `xz_xuchu`（许褚拦路斩将请战）；onDeathOf taoqian `xz_taoqian_down`（陶谦托孤徐州）
- `weather: 'sunny', weatherScript: [], maxTurns: 20`
- **抉择联动**：T3 已登记 `xuzhou_post`（安民 +1 / 屠城 −1 得明光铠）——本任务只管战役定义；抉择 UI 已在 T5 落地，集成测试在 T12

- [ ] **Step 4: 测试通过 + 类型门** → 同 T6

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/xuzhou.ts src/data/battles/index.ts tests/data/xuzhou.test.ts
git commit -m "feat: 徐州复仇战（击破陶谦/许褚登场/战后善恶抉择）"
```

---

### Task 8: 濮阳之战（三城门 · 吕布复战 · 陈宫 debuff · 郭嘉登场）

**Files:**
- Create: `src/data/battles/puyang.ts`
- Modify: `src/data/battles/index.ts`
- Test: `tests/data/puyang.test.ts`

**地图 20×12**（左野右城；竖城墙 G 列 x=13，三处缺口 y2/y6/y9 = 三门进攻路线）：

```
.....f.......G.CCCC.
.............G..CC..
................CC..
..f..........G...C..
....f........G......
.........f...G...CC.
..............b..CC.
..m..........G......
....m.........G.....
..f............b....
...f..........G..ff.
mm............G...m.
```

（逐行 20 字符；G 列 x13 于 y2/y6/y9 处断开为 `.`/`b`；城内地形 C 与空地混合，吕布居 C 群中央。）

- [ ] **Step 1: 写失败测试**（骨架同 T6，改断言）：

```ts
it('郭嘉为玩家新参战；胜利 = 击破吕布；陈宫为敌方军师', () => {
  expect(puyang.units.find((u) => u.heroId === 'guojia')?.faction).toBe('player')
  expect(puyang.win).toEqual({ kind: 'killCommander', unitId: 'lvbu' })
  const cg = puyang.units.find((u) => u.heroId === 'chengong')
  expect(cg?.faction).toBe('enemy')
  expect(cg?.level).toBeGreaterThanOrEqual(5)
})
it('三门路线：G 列 x13 恰有三处非 G 缺口', () => {
  const gaps = puyang.map.filter((row) => row[13] !== ('pass' as const)).length
  expect(gaps).toBe(3)
})
it('孙子兵法宝物格', () => {
  expect(puyang.treasureCells?.[0]?.itemId).toBe('sunzi_book')
})
```

- [ ] **Step 2: 运行确认失败** → 同前

- [ ] **Step 3: 实现 puyang.ts**

- 玩家 8 员：曹操、夏侯惇、夏侯渊、典韦、许褚、李典、荀彧、+ 新参战 `guojia`（西侧纵队）
- 敌方：`lvbu` Lv7 base `{ hp: 72, mp: 0, atk: 19, def: 12, spirit: 5, agi: 13 }`（比虎牢关 hp 高 atk 低——成长后的玩家应有余力）；`chengong` Lv6（T1 注册值）城内后排；并州兵 ×4 三门内分布、弓手 ×2 城头
- drops：`[{ unitId: 'lvbu', itemId: 'fangtian_ji' }]`？——**方天画戟虎牢关已掉**。改：吕布濮阳掉 `mingguang_armor`？明光铠是徐州屠城奖，二选一获取可接受（原作同类宝物多途径）。定：无 drops，宝物走宝物格 `sunzi_book`（城内 (17,2)）+ `huanshen_dan`（(15,6)）
- dialogues：opener `py_start`（陈宫献策 / 吕布轻敌）；turn 3 `py_chengong`（陈宫："曹军势大，画戟赤兔暂避锋芒"——debuff 战术宣言）；onDeathOf lvbu `py_lvbu_down`（吕布溃走 / 郭嘉："吕布鹰狼之性，终不能久"）
- `weather: 'sunny', weatherScript: [], maxTurns: 20`

- [ ] **Step 4: 测试通过 + 类型门** → 同前

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/puyang.ts src/data/battles/index.ts tests/data/puyang.test.ts
git commit -m "feat: 濮阳之战（三城门/吕布复战/陈宫军师 debuff）"
```

---

### Task 9: 宛城之战（撤退点 · 典韦断后 · 增援潮 · 战后抉择）

**Files:**
- Create: `src/data/battles/wancheng.ts`
- Modify: `src/data/battles/index.ts`
- Test: `tests/data/wancheng.test.ts`

**地图 16×12**（玩家东北城内被围，向西南关隘突围；水域散布拖速）：

```
............PPmm
..f.........PP.m
...............m
.....w..........
....www.....f...
..f.ww..........
....ww.....f....
.m...w..........
.mm.......f.....
..m.............
mm..........f...
GG..........ff..
```

（撤退点 = 西南关隘 `{ x: 1, y: 11 }` 的 G 格。）

- [ ] **Step 1: 写失败测试**（骨架同 T6，改断言）：

```ts
it('胜利 = 曹操抵达撤退点；无新参战（典韦断后为本战演出）', () => {
  expect(wancheng.win).toEqual({ kind: 'reach', unitId: 'caocao', cell: { x: 1, y: 11 } })
  const ids = new Set(wancheng.units.filter((u) => u.faction === 'player').map((u) => u.heroId))
  expect(ids.has('dianwei')).toBe(true)
})
it('增援潮三波（张绣军穷追）', () => {
  expect(wancheng.reinforcements.length).toBe(3)
  expect(wancheng.reinforcements.map((r) => r.turn)).toEqual([3, 5, 7])
})
it('撤退点为可通行关隘格', () => {
  expect(wancheng.map[11]![1]).toBe('pass')
})
```

- [ ] **Step 2: 运行确认失败** → 同前

- [ ] **Step 3: 实现 wancheng.ts**

- 玩家 7 员：曹操、典韦（**必须参战**——断后剧情）、夏侯惇、许褚、荀彧、李典、乐进（东北城内 PP 一带，空间紧凑）
- 敌方：`zhangxiu` Lv6（T1 注册值）西南追击主力；枪兵 ×3 西路、弓手 ×2 南路
- reinforcements：turn 3 / 5 / 7 各 2 员从西缘与南缘涌入（张绣军穷追——撤退紧迫感的数值来源）
- treasureCells：`jinchuang_yao`（突围路 (7,8)）、`huanshen_dan`（(12,10)）
- dialogues：opener `wc_start`（张绣夜袭 / 典韦："主公先行，韦断后！"）；turn 4 `wc_duanhou`（典韦独守辕门，杀声震天）；曹操抵撤退点无需对话（reach 即胜）；onDeathOf dianwei `wc_dianwei_down`（若典韦阵亡——"古之恶来，殁于王事"）——**注意**：玩家单位阵亡不触发 onDeathOf？查引擎 DialogueTrigger 的 onDeathOf 语义（M3 只对敌方用过）——若引擎只对任意单位死亡触发则直接可用；若只敌方，本条删去，阵亡演出靠战报。实现时以 `grep onDeathOf src/engine` 实查为准。
- `weather: 'sunny', weatherScript: [], maxTurns: 14`（短限——撤退战不该拖）
- **抉择联动**：T3 `wancheng_post`（抚恤 +1 / 尽诛 −1），T12 集成验证

- [ ] **Step 4: 测试通过 + 类型门** → 同前

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/wancheng.ts src/data/battles/index.ts tests/data/wancheng.test.ts
git commit -m "feat: 宛城之战（撤退点突围/典韦断后/增援潮）"
```

---

### Task 10: 下邳之战（水淹下邳 · 终战 · 荀攸登场 · 白门楼抉择）

**Files:**
- Create: `src/data/battles/xiapi.ts`
- Modify: `src/data/battles/index.ts`
- Test: `tests/data/xiapi.test.ts`

**地图 20×12**（玩家西南登陆，外圈水，吕布死守东北大城；桥 b 是登陆通道）：

```
ww..........CCCCC...
w..f.......CCCCCCC..
...........CCCCCCC..
....f......CCC..CC..
...........CC....CC.
..w..............w..
.ww........f.....ww.
.ww...............w.
..ww....f......ww...
w..ww........www....
ww...bb...w..www....
www...........ww....
```

（逐行数清 20 字符。城 C 群位于 x11-18 / y0-4；桥 bb 在 y10 的 x5-6。）

- [ ] **Step 1: 写失败测试**（骨架同 T6，改断言）：

```ts
it('荀攸为玩家新参战；胜利 = 击破吕布 Lv10；陈宫随军', () => {
  expect(xiapi.units.find((u) => u.heroId === 'xunyou')?.faction).toBe('player')
  expect(xiapi.win).toEqual({ kind: 'killCommander', unitId: 'lvbu' })
  const lb = xiapi.units.find((u) => u.heroId === 'lvbu')
  expect(lb?.level).toBe(10)
  expect(xiapi.units.find((u) => u.heroId === 'chengong')?.faction).toBe('enemy')
})
it('水淹脚本：turn 6 转 rainy', () => {
  expect(xiapi.weatherScript).toContainEqual({ turn: 6, weather: 'rainy' })
})
it('双铁戟宝物格在城内', () => {
  expect(xiapi.treasureCells?.map((t) => t.itemId)).toContain('shuangtie_ji')
})
```

（`weatherScript` 元素的实际字段名/形状以 engine/types.ts 的 WeatherScriptEntry 为准——先 `grep -n "weatherScript" src/engine/types.ts`，断言按真实形状写。）

- [ ] **Step 2: 运行确认失败** → 同前

- [ ] **Step 3: 实现 xiapi.ts**

- 玩家 8 员：曹操、夏侯惇、夏侯渊、典韦、许褚、李典、荀彧、+ 新参战 `xunyou`（西南登陆区 y9-11：曹操(4,11)、夏侯惇(4,10)、夏侯渊(5,10)、典韦(6,10)、许褚(7,11)、李典(2,11)、荀彧(7,10)、荀攸(3,10)——落点以地图实况微调，避开 w）
- 敌方：`lvbu` Lv10 base `{ hp: 88, mp: 0, atk: 22, def: 13, spirit: 5, agi: 13 }` 居城心 (15,2)；`chengong` Lv7 (13,3)；并州兵 ×6 城内 + 城外阻滞；弓手 ×3 城头（射程压制登陆场）
- reinforcements：turn 6 随水淹同回合，城东缘 (18,6)(18,8) 侯成/魏续残部 ×2 出击（"守军突围"演出）
- weatherScript：`[{ turn: 6, weather: 'rainy' }]`（形状以类型为准）——雨天禁火 + 台词演出"水淹下邳"
- treasureCells：`shuangtie_ji`（城内 (14,2) 附近）、`jinchuang_yao`（(6,9)）
- dialogues：opener `xp_start`（荀攸献水攻之策 / 吕布恃勇）；turn 6 `xp_shuiyan`（水淹下邳——"决泗沂之堤，灌下邳！" / 陈宫长叹）；onDeathOf lvbu `xp_lvbu_down`（白门楼缚吕布——衔接战后抉择）
- `weather: 'sunny', maxTurns: 24`
- **抉择联动**：T3 `xiapi_post`（白门楼：斩 +1 / 招揽 −1），T12 集成验证

- [ ] **Step 4: 测试通过 + 类型门** → 同前

- [ ] **Step 5: 提交**

```bash
git add src/data/battles/xiapi.ts src/data/battles/index.ts tests/data/xiapi.test.ts
git commit -m "feat: 下邳之战（水淹终战/吕布 Lv10/白门楼抉择）"
```

---

### Task 11: EndingScreen 三档结局 + App 终章流程 + ProgressScreen 终章文案

**Files:**
- Create: `src/ui/screens/EndingScreen.vue`
- Modify: `src/App.vue`（Screen 增 'ending'；结算屏「继续」按进度分流）
- Modify: `src/ui/screens/ProgressScreen.vue`（allclear 文案改终章）
- Test: 手动验收（纯展示 UI）

**分档口径**（设计决策 1）：`morality >= 2` 忠臣 / `morality <= -2` 奸雄 / 其余 中间。三抉择全仁 = +3、全暴 = −3，档位可达。

- [ ] **Step 1: EndingScreen.vue（完整代码）**

```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ morality: number }>()
const emit = defineEmits<{ (e: 'toTitle'): void }>()

/** 分档：≥2 忠臣 / ≤−2 奸雄 / 其余中间（口径与 CampaignState.morality 注释一致）。 */
const kind = computed<'loyal' | 'tyrant' | 'middle'>(() => {
  if (props.morality >= 2) return 'loyal'
  if (props.morality <= -2) return 'tyrant'
  return 'middle'
})
const ENDINGS = {
  loyal: {
    title: '治世之能臣',
    lines: [
      '青州平贼不戮降，徐州安民，宛城抚卒，白门楼明正军法。',
      '世人评孟德：可信、可托、可寄生死。',
      '汉室虽衰，能臣之名，青史镌之。',
    ],
  },
  tyrant: {
    title: '乱世之奸雄',
    lines: [
      '屠徐州以泄私愤，诛降卒以绝后患，惜吕布之勇而忘其义。',
      '世人评孟德：治世之能臣，乱世之奸雄——君择其后者。',
      '天下汹汹，唯强者定之。',
    ],
  },
  middle: {
    title: '非常之人，超世之杰',
    lines: [
      '仁与威并施，义与利相权。乱世之中，君行于两者之间。',
      '不拘一德，不守一义，唯务实而进。',
      '非常之人，超世之杰——后人论之，毁誉参半。',
    ],
  },
} as const
const ending = computed(() => ENDINGS[kind.value])
</script>

<template>
  <div class="ending-screen">
    <p class="kicker">终章 · 八战功成</p>
    <h1>{{ ending.title }}</h1>
    <p v-for="(l, i) in ending.lines" :key="i" class="line">{{ l }}</p>
    <p class="meter">忠奸之评：{{ morality > 0 ? '+' : '' }}{{ morality }}</p>
    <button class="primary" @click="$emit('toTitle')">返回标题</button>
  </div>
</template>

<style scoped>
.ending-screen { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(ellipse at center, #2a241c 0%, #141210 75%); color: #f0e6c8; }
.kicker { color: #9a8f7a; letter-spacing: 6px; margin: 0; }
h1 { font-family: 'Songti SC', serif; font-size: 44px; letter-spacing: 12px; margin: 0 0 18px; color: #f0d28a; }
.line { margin: 0; letter-spacing: 2px; line-height: 1.9; }
.meter { margin-top: 16px; color: #9a8f7a; }
.primary { margin-top: 26px; padding: 12px 44px; font-size: 16px; letter-spacing: 6px; color: #141210; background: #d8b86a; border: none; border-radius: 4px; cursor: pointer; }
.primary:hover { background: #f0d28a; }
</style>
```

- [ ] **Step 2: App 接线**

- import EndingScreen；`type Screen` 加 `'ending'`
- SettleScreen 的 `@continue="screen = 'progress'"` 改为 `@continue="onSettleContinue"`：

```ts
/** 结算屏「继续」：全章通关 → 结局屏；否则回进度屏。 */
function onSettleContinue(): void {
  screen.value = campaign.value && currentBattleId(campaign.value) === null ? 'ending' : 'progress'
}
```

- template 追加：

```vue
  <EndingScreen
    v-else-if="screen === 'ending' && campaign"
    :morality="campaign.morality"
    @to-title="screen = 'title'"
  />
```

- [ ] **Step 3: ProgressScreen 终章文案**

allclear 块文案更新（v-if="!current" 分支）：

```vue
<div v-if="!current" class="allclear">
  <h2>八章全通 · 乱世已成</h2>
  <p>结局已按君之忠奸呈现。可自档位读取，重走乱世另择仁暴。</p>
</div>
```

- [ ] **Step 4: 类型门 + 全量测试**

Run: `npm run build 2>&1 | tail -4 && npm test 2>&1 | tail -4`
Expected: 成功 / 全绿

- [ ] **Step 5: 提交**

```bash
git add src/ui/screens/EndingScreen.vue src/App.vue src/ui/screens/ProgressScreen.vue
git commit -m "feat: 三档结局屏与终章流程（忠臣/奸雄/居中）"
```

---

### Task 12: 战役表扩 8 战 + 八连战闭环集成测试 + 数值标定

**Files:**
- Modify: `src/game/campaign.ts`（CAMPAIGN_BATTLES 扩 8 元组）
- Modify: `tests/integration/campaign-loop.test.ts`（八连战 + 抉择流转断言）
- Test: 即上述文件

**战役顺序**（史实序）：`['yingchuan','sishui','hulao','qingzhou','xuzhou','puyang','wancheng','xiapi']`

- [ ] **Step 1: 扩表 + 跑既有闭环看基线**

`CAMPAIGN_BATTLES` 改为上表。Run: `npx vitest run tests/integration/campaign-loop.test.ts 2>&1 | tail -12`
Expected: **大概率 FAIL**（新战役数值未标定，AI 自打可能超时/团灭）——这正是标定入口。

- [ ] **Step 2: 数值标定循环（本任务主体）**

对每个失败战役，只动敌方杠杆，顺序：杂兵 atk −1 → 主将 hp −5 → 敌方 level −1；改一次跑一次多 seed：

```bash
npx vitest run tests/integration/campaign-loop.test.ts 2>&1 | tail -6
```

铁律：
- **不动我方/友军数值**（成长曲线是 M3 已锁资产）
- 不动 maxTurns 凑胜（除非确实需要更长回合——加 2 为限并在定义注释说明）
- 调完后 [1,7,42,2026] 四 seed 须**全** 'won' 且零 error
- 若某战役怎么调都翻车：先查是不是 debuff AI（T4）把友军废了——降 debuff 评分常量（14→10）属引擎微调，允许但要单独 commit 并注明

- [ ] **Step 3: 抉择流转断言（campaign-loop.test.ts 追加）**

```ts
it('三抉择全仁 → morality +3 → 忠臣分档；存档往返保持', () => {
  let c = newGame()
  for (const id of CAMPAIGN_BATTLES) {
    const final = autoPlayToWin(id, c, 42) // 以文件内既有自打助手为准
    c = settleBattle(c, battles[id]!, final, gameData).campaign
    const ch = Object.values(battleChoices).find((x) => x.battleId === id)
    if (ch) {
      const answered = applyChoice(c, ch.id, 0)
      c = addMorality(answered.campaign, ch.options[0]!.morality)
    }
  }
  expect(c.morality).toBe(3)
  expect(c.progress).toBe(CAMPAIGN_BATTLES.length)
  // 存档往返
  const back = deserialize(serialize(c), gameData)
  expect(back!.morality).toBe(3)
  expect(back!.choicesMade['xuzhou_post']).toBe(0)
})
```

（`autoPlayToWin`/自打助手、import 清单以该测试文件既有代码为准；`serialize`/`deserialize`/`battleChoices`/`applyChoice`/`addMorality` 按需补 import。）

- [ ] **Step 4: 全量测试 + 类型门**

Run: `npm test 2>&1 | tail -6 && npm run build 2>&1 | tail -4`
Expected: 全绿 / 构建成功

- [ ] **Step 5: 提交**

```bash
git add src/game/campaign.ts tests/integration/campaign-loop.test.ts
git commit -m "feat: 战役表扩 8 战并完成八连战标定与抉择流转闭环"
```

（若标定改了各战役定义文件，一并 add 并在提交信息列出：`feat: 战役表扩 8 战并完成八连战标定与抉择流转闭环（标定：青州/濮阳/下邳敌方数值）`）

---

### Task 13: README 里程碑 4 + 手动验收清单

**Files:**
- Modify: `README.md`（里程碑 4 勾选；玩法操作补抉择/结局）
- Create: `docs/superpowers/manual-checks-m4.md`

- [ ] **Step 1: README**

- 里程碑 4 复选框勾选，括注内容：终章 5 战 + 善恶抉择 + 三档结局
- 「玩法操作」列表补 2 条：战后抉择（作答即改忠奸，影响结局）；通关结局（八章后按忠奸三档）
- 其他段落不动

- [ ] **Step 2: docs/superpowers/manual-checks-m4.md**

结构对齐 manual-checks-m3.md（先读该文件抄骨架）。章节：

1. **五场新战役**：各战打开（胜利条件/新参战/宝物格/对话演出逐条过）
2. **战后抉择三处**：徐州（安民/屠城得明光铠）、宛城、白门楼——作答后「返回进度」解禁；重开同档不再弹
3. **水淹下邳**：第 6 回合天气转雨 + 台词 + 城内出击增援
4. **宛城撤退**：曹操抵西南关隘即胜；典韦参战；14 回合限
5. **三档结局**：新档全仁 → 忠臣；全暴 → 奸雄；混合 → 居中
6. **存档兼容**：M3 旧档 JSON 导入 → morality=0 正常继续；新档导出/导入往返
7. **已知限制**：结局屏不存「重看」入口（回标题后从档位读档可重触发最终战役重打）；音效未做（spec「视情况」项，仍登记延后）

- [ ] **Step 3: 提交**

```bash
git add README.md docs/superpowers/manual-checks-m4.md
git commit -m "docs: M4 里程碑勾选与手动验收清单"
```

---

## 计划自检（writing-plans Self-Review）

- **Spec 覆盖**：spec §9 后 5 战 → T6-T10；善恶值/抉择 → T2/T3/T5；结局三档 → T11；敌方施法（M2 登记项）→ T4；8 战闭环+标定 → T12；文档 → T13。spec「音效视情况」按设计决策 11 登记延后。无遗漏。
- **占位符扫描**：T6-T10 台词措辞「自拟」是对白文案的委托而非代码占位（结构/条数/挂点均已定）；T9 onDeathOf 玩家单位语义已给实查指令；T10 weatherScript 形状已给 grep 指令。无 TBD/TODO。
- **类型一致性**：`applyChoice`/`addMorality`/`choiceMade`（T2 定义，T5/T12 调用）；`battleChoices`/`ChoiceDef`（T3 定义，T5 引用 `'./data/battles'` re-export）；`drawPortrait(ctx, hero, x, y, size)`（sprites.ts:192 实签）；`heroOf`（T5 抽取，DialogueBox 改 import）。一致。
- **执行方式**：subagent-driven-development（既有连续执行授权，无需再确认）。

