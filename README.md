# 三国志曹操传 · Web 版

Koei 经典战棋 RPG《三国志曹操传》的 Web 复刻（程序化像素风，零外部素材）。
设计文档见 `docs/superpowers/specs/`，实现计划见 `docs/superpowers/plans/`。

## 开发

    npm install
    npm run dev     # 开发服务器
    npm test        # Vitest 全量测试
    npm run build   # 类型检查 + 构建

## 架构

- `src/engine/` 纯 TypeScript 战棋引擎，零框架依赖：
  `apply(state, command, data) → { ok: true, state, events } | { ok: false, error }`，不可变状态 + 状态内 RNG（可回放）。
- `src/data/` 纯静态数据：兵种/地形/法术/武将/道具/战役。加战役 = 加数据文件。
- `src/render/` — Canvas 渲染层：像素画/镜头纯函数/战场渲染器/动画规划与播放（零 Vue 依赖）
- `src/game/` — 编排层：视图模型查询、AI 阵营批执行、BattleOrchestrator（意图→指令）、loadBattle 加载期校验
- `src/ui/` — Vue 3 组装层：BattleScreen + 菜单/对话/结算/信息面板组件
- 规则要点：兵种相克（骑>弓>步>骑）、地形加成、天气门禁（雨天禁火）、
  反击/暴击/连击、经验升级（随机成长）、四种胜利条件、启发式 AI。

## 玩法操作（颍川之战）

1. 标题画面点「开始颍川之战」
2. 点选蓝色我方单位 → 蓝色格为可达范围，点击移动
3. 移动后弹出动作菜单：攻击（红高亮选目标）/ 法术（紫射程 + AoE 预览）/ 道具 / 待机 / 撤销
4. 「结束回合」推进敌方行动（自动 AI + 动画演出）
5. 滚轮 / 方向键平移镜头；Esc 取消当前选择
6. 全歼敌军获胜；曹操阵亡或超过回合上限失败

## 里程碑

1. [x] 战斗引擎 + 全套单测
2. [x] Canvas 渲染 + 颍川之战可玩
3. [ ] 养成闭环（装备/整备/存档）+ 前 3 场战役
4. [ ] 8 场战役 + 剧情对话 + 善恶结局
