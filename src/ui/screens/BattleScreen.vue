<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { BattleState, Cell, EngineError, Faction, GameEvent } from '../../engine/types'
import { gameData } from '../../data'
import { BattleOrchestrator, type Intent, type UiState } from '../../game/orchestrator'
import { attackTargets, castableStrategies, moveRangeCells, spellTargetCells, usableItems } from '../../game/viewModel'
import { effectiveStats, hostile, unitAt } from '../../engine/internal'
import { affinity } from '../../engine/combat'
import { shapeCells } from '../../engine/spells'
import { BattlefieldRenderer } from '../../render/battlefield'
import { Animator, planAnimations } from '../../render/animator'
import { TILE, centerOnCell, clampCamera, screenToCell } from '../../render/camera'
import UnitInfoPanel from '../components/UnitInfoPanel.vue'
import HoverTooltip from '../components/HoverTooltip.vue'

type MenuMode = 'none' | 'action' | 'attackPick' | 'spellPick' | 'spell' | 'item'

const props = defineProps<{ battleId: string }>()
defineEmits<{ (e: 'exit'): void }>()

// ---------- 响应式状态 ----------
const canvasEl = ref<HTMLCanvasElement | null>(null)
const holderEl = ref<HTMLDivElement | null>(null)
const busy = ref(false)
const state = ref<BattleState | null>(null)
const ui = reactive<{ selectedUnitId: string | null; canUndo: boolean; dialogueQueue: string[] }>({
  selectedUnitId: null,
  canUndo: false,
  dialogueQueue: [],
})
const cam = reactive({ x: 0, y: 0 })
const menuMode = ref<MenuMode>('none')
const pendingSpellId = ref<string | null>(null)
const hoverPx = ref({ x: 0, y: 0 })
const hoverCell = ref<Cell | null>(null)
const toast = ref<string | null>(null)
const result = ref<{ won: boolean; turn: number } | null>(null)

// ---------- 非响应式句柄与动画池 ----------
let renderer: BattlefieldRenderer | null = null
let animator: Animator | null = null
let orch: BattleOrchestrator | null = null
let rafIdle = 0
let toastTimer = 0
let mapInit = false
let pendingEvents: GameEvent[] = []
let renderPositions: Record<string, Cell> | null = null

// ---------- 派生查询 ----------
/** 当前行动阵营：BattleState 无 faction 字段，一律由 factionOrder[factionIndex] 派生。 */
const factionOf = computed<Faction | null>(() =>
  state.value ? state.value.factionOrder[state.value.factionIndex] : null,
)
const selectedUnit = computed(() => {
  const s = state.value
  if (!s || !ui.selectedUnitId) return null
  return s.units.find((u) => u.id === ui.selectedUnitId) ?? null
})
const targets = computed<string[]>(() =>
  state.value && ui.selectedUnitId ? attackTargets(state.value, ui.selectedUnitId, gameData) : [],
)
const spells = computed(() =>
  state.value && ui.selectedUnitId ? castableStrategies(state.value, ui.selectedUnitId, gameData) : [],
)
const items = computed(() => (selectedUnit.value ? usableItems(selectedUnit.value, gameData) : []))
const info = computed(() => {
  const s = state.value
  if (!s) return null
  const u =
    selectedUnit.value ??
    (hoverCell.value ? unitAt(s, hoverCell.value) : undefined) ??
    s.units.find((x) => x.alive && x.heroId === 'caocao')
  if (!u) return null
  const eff = effectiveStats(u, gameData)
  return { unit: u, maxHp: eff.hp, maxMp: eff.mp }
})
const tooltip = computed(() => {
  const s = state.value
  const c = hoverCell.value
  if (!s || !c) return null
  const h = s.map.length
  const w = s.map[0]?.length ?? 0
  if (c.x < 0 || c.y < 0 || c.x >= w || c.y >= h) return null // 出界格
  const lines: string[] = []
  const u = unitAt(s, c)
  if (u) {
    lines.push(`${gameData.classes[u.classId]?.name ?? u.classId} Lv${u.level} · HP ${u.hp}/${effectiveStats(u, gameData).hp}`)
    const sel = selectedUnit.value
    if (sel && sel.id !== u.id && hostile(sel.faction, u.faction))
      lines.push(`兵种相克 ×${affinity(sel.classId, u.classId).toFixed(2)}`)
  }
  const t = gameData.terrains[s.map[c.y][c.x]]
  if (t) lines.push(`${t.name} · 防御+${t.defBonus}%`)
  return {
    x: hoverPx.value.x,
    y: hoverPx.value.y,
    title: u ? (gameData.heroes[u.heroId]?.name ?? u.name) : (t?.name ?? ''),
    lines,
  }
})

// ---------- 高亮同步 ----------
function syncHighlights(): void {
  if (!renderer) return
  const move = new Set<string>()
  const attack = new Set<string>()
  const spell = new Set<string>()
  const s = state.value
  if (!busy.value && s && s.finished === null) {
    if (menuMode.value === 'none' && ui.selectedUnitId)
      for (const c of moveRangeCells(s, ui.selectedUnitId, gameData)) move.add(`${c.x},${c.y}`) // moved/acted 时函数自身返回空
    if (menuMode.value === 'attackPick')
      for (const id of targets.value) {
        const u = s.units.find((x) => x.id === id)
        if (u) attack.add(`${u.pos.x},${u.pos.y}`)
      }
    if ((menuMode.value === 'spellPick' || menuMode.value === 'spell') && pendingSpellId.value && ui.selectedUnitId) {
      for (const c of spellTargetCells(s, ui.selectedUnitId, pendingSpellId.value, gameData)) spell.add(`${c.x},${c.y}`)
      const strat = gameData.strategies[pendingSpellId.value]
      const hc = hoverCell.value
      if (strat && hc) {
        const h = s.map.length
        const w = s.map[0]?.length ?? 0
        // AoE 预览：以悬停格为靶心展开形状，越界过滤
        for (const c of shapeCells(hc, strat.shape))
          if (c.x >= 0 && c.y >= 0 && c.x < w && c.y < h) spell.add(`${c.x},${c.y}`)
      }
    }
  }
  renderer.setHighlights({ move, attack, spell, hover: hoverCell.value })
}

watch([menuMode, pendingSpellId, busy], () => syncHighlights())

// ---------- 时序契约核心 ----------
/** 一次 endTurn 同步发多批 onEvents + 末尾一次 onState；动画期间 renderer 持 pre-action 状态。 */
function positionsOf(s: BattleState): Record<string, Cell> {
  const p: Record<string, Cell> = {}
  for (const u of s.units) p[u.id] = { x: u.pos.x, y: u.pos.y }
  return p
}

function onOrchEvents(events: GameEvent[]): void {
  if (!events.length) return
  pendingEvents.push(...events) // 池化：动画播放中到达的批入池
  // 构造器在首次 onState 之前同步发 battleStarted（state 未落位），先池化、由 onOrchState 触发
  if (!busy.value && state.value) startPlayback()
}

function startPlayback(): void {
  if (!animator) return
  if (!pendingEvents.length) {
    drainDialogues()
    applyRendererState()
    return
  }
  const evs = pendingEvents
  pendingEvents = []
  // 首批用 state.value（onState 未到，恰为 pre-action）；后续批用链式 finalPositions
  const positions = renderPositions ?? positionsOf(state.value!)
  renderPositions = planAnimations(evs, positions).finalPositions
  busy.value = true
  animator.play(evs, positions, () => {
    busy.value = false
    if (pendingEvents.length) startPlayback() // 连播下一池
    else {
      renderPositions = null
      applyRendererState()
      drainDialogues()
    }
  })
}

function applyRendererState(): void {
  if (busy.value || !renderer || !state.value) return // 动画期间 renderer 持 pre-action 状态
  renderer.setState(state.value)
  syncHighlights()
}

function onOrchState(s: BattleState, next: UiState): void {
  state.value = s // Vue HUD 立即更新
  ui.selectedUnitId = next.selectedUnitId
  ui.canUndo = next.canUndo
  ui.dialogueQueue = [...next.dialogueQueue]
  if (!mapInit && renderer) {
    renderer.setMap(s.map, s.map[0].length, s.map.length)
    mapInit = true
    centerInitial()
  }
  applyRendererState() // busy 时跳过，动画结束后补
  if (s.finished !== null && !result.value) result.value = { won: s.finished === 'won', turn: s.turn }
  if (next.selectedUnitId === null && !next.canUndo) menuMode.value = 'none'
  if (!busy.value && pendingEvents.length) startPlayback() // 首批因 state 未落位而池化的批，此处补播
}

/** T9 阶段对话自动跳过（T11 换 DialogueBox）。 */
function drainDialogues(): void {
  while (orch && orch.uiState.dialogueQueue.length) orch.acknowledgeDialogue()
  ui.dialogueQueue = orch ? [...orch.uiState.dialogueQueue] : []
}

const ERROR_TEXT: Partial<Record<EngineError['code'], string>> = {
  OUT_OF_MOVE_RANGE: '超出移动范围',
  NOT_IN_RANGE: '目标不在射程内',
  NOT_ENOUGH_MP: 'MP 不足',
  NOT_YOUR_TURN: '尚未轮到该单位行动',
  CANNOT_TARGET: '无法选定该目标',
  CLASS_CANNOT_CAST: '该兵种不能施放法术',
  SPELL_UNUSABLE_IN_WEATHER: '当前天气无法施放该法术',
  ITEM_NOT_HELD: '未持有该道具',
  ITEM_NOT_CONSUMABLE: '该道具无法使用',
}

function onOrchError(e: EngineError): void {
  showToast(ERROR_TEXT[e.code] ?? `操作失败（${e.code}）`)
}

// ---------- 交互 ----------
function doIntent(intent: Intent): void {
  if (!orch || busy.value || state.value?.finished != null) return
  orch.dispatch(intent)
}

function showToast(text: string): void {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 1800)
}

function inBoard(s: BattleState, c: Cell): boolean {
  return c.x >= 0 && c.y >= 0 && c.y < s.map.length && c.x < (s.map[0]?.length ?? 0)
}

function onClick(e: MouseEvent): void {
  const s = state.value
  if (busy.value || !orch || !s || s.finished !== null) return
  const cell = screenToCell(e.offsetX, e.offsetY, cam)
  const unit = unitAt(s, cell)
  if (menuMode.value === 'attackPick') {
    if (unit && targets.value.includes(unit.id)) {
      menuMode.value = 'none'
      doIntent({ type: 'attack', targetId: unit.id })
    } else menuMode.value = 'action'
    return
  }
  if (menuMode.value === 'spellPick') {
    if (inBoard(s, cell) && pendingSpellId.value) {
      const sid = pendingSpellId.value
      menuMode.value = 'none'
      pendingSpellId.value = null
      doIntent({ type: 'cast', strategyId: sid, target: cell })
    } else {
      pendingSpellId.value = null
      menuMode.value = 'spell'
    }
    return
  }
  if (unit && ui.selectedUnitId && unit.id === ui.selectedUnitId) {
    menuMode.value = 'action'
    return
  }
  if (ui.canUndo) return // 移动待决：点击空处不确认也不取消
  if (menuMode.value !== 'none') {
    menuMode.value = 'none'
    return
  }
  if (unit && unit.faction === 'player' && factionOf.value === 'player' && !unit.acted) {
    doIntent({ type: 'selectUnit', unitId: unit.id })
    return
  }
  if (ui.selectedUnitId) {
    // 点击移动范围格 → 移动（move 高亮层的落点）；范围外空格落到 deselect
    const range = moveRangeCells(s, ui.selectedUnitId, gameData)
    if (range.some((c) => c.x === cell.x && c.y === cell.y)) {
      doIntent({ type: 'moveTo', to: { x: cell.x, y: cell.y } })
      return
    }
  }
  doIntent({ type: 'deselect' }) // deselect 语义 = 确认移动（见 orchestrator 契约）
}

function onMouseMove(e: MouseEvent): void {
  hoverPx.value = { x: e.offsetX, y: e.offsetY }
  hoverCell.value = screenToCell(e.offsetX, e.offsetY, cam)
  syncHighlights()
}

function onWheel(e: WheelEvent): void {
  pan(0, e.deltaY)
}

function pan(dx: number, dy: number): void {
  const cv = canvasEl.value
  const s = state.value
  if (!renderer || !cv || !s) return
  cam.x += dx
  cam.y += dy
  const clamped = clampCamera(cam, s.map[0].length * TILE, s.map.length * TILE, cv.width, cv.height)
  cam.x = clamped.x
  cam.y = clamped.y
  renderer.setCamera({ x: cam.x, y: cam.y })
}

function onKey(e: KeyboardEvent): void {
  if (result.value || !state.value) return
  if (e.key === 'Escape') {
    if (menuMode.value === 'attackPick' || menuMode.value === 'spellPick' || menuMode.value === 'spell' || menuMode.value === 'item') {
      pendingSpellId.value = null
      menuMode.value = ui.canUndo ? 'action' : 'none'
    } else if (ui.canUndo) {
      doIntent({ type: 'undoMove' })
    } else if (ui.selectedUnitId) {
      doIntent({ type: 'deselect' })
    }
    return
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    pan(-TILE, 0)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    pan(TILE, 0)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    pan(0, -TILE)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    pan(0, TILE)
  }
}

function onResize(): void {
  const cv = canvasEl.value
  const holder = holderEl.value
  if (!cv || !holder) return
  cv.width = holder.clientWidth
  cv.height = holder.clientHeight
  pan(0, 0) // 视口变化后重夹相机
}

function centerInitial(): void {
  const cv = canvasEl.value
  const s = state.value
  if (!cv || !renderer || !s) return
  const hero = s.units.find((u) => u.heroId === 'caocao') ?? s.units.find((u) => u.faction === 'player')
  if (!hero) return
  const c = centerOnCell(hero.pos, cv.clientWidth, cv.clientHeight)
  cam.x = c.x
  cam.y = c.y
  pan(0, 0)
}

// ---------- 生命周期 ----------
function setupOrchestrator(): void {
  orch = new BattleOrchestrator(props.battleId, Date.now() % 2147483647, {
    onState: onOrchState,
    onEvents: onOrchEvents,
    onError: onOrchError,
  })
}

function restart(): void {
  animator?.cancel()
  busy.value = false
  mapInit = false
  result.value = null
  menuMode.value = 'none'
  pendingSpellId.value = null
  pendingEvents = []
  renderPositions = null
  state.value = null
  toast.value = null
  setupOrchestrator()
}

function idleLoop(now: number): void {
  rafIdle = requestAnimationFrame(idleLoop)
  if (!animator?.busy) renderer?.render(now) // 播放期由 Animator 自渲染，单 rAF 互斥
}

onMounted(() => {
  const cv = canvasEl.value
  if (!cv) return
  onResize()
  renderer = new BattlefieldRenderer(cv, gameData)
  animator = new Animator(renderer)
  setupOrchestrator()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
  rafIdle = requestAnimationFrame(idleLoop)
})

onBeforeUnmount(() => {
  if (rafIdle) cancelAnimationFrame(rafIdle)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
  clearTimeout(toastTimer)
  animator?.cancel()
})
</script>

<template>
  <div class="battle">
    <div class="hud">
      <span>第 {{ state?.turn ?? '—' }} 回合</span>
      <span>{{ factionOf === 'player' ? '我军行动' : factionOf === 'enemy' ? '敌军行动' : '友军行动' }}</span>
      <span>{{ state?.weather === 'rainy' ? '雨' : state?.weather === 'cloudy' ? '阴' : '晴' }}</span>
      <span class="spacer" />
      <button :disabled="busy || factionOf !== 'player' || !!result" @click="doIntent({ type: 'endTurn' })">结束回合</button>
      <button @click="$emit('exit')">退出</button>
    </div>
    <div ref="holderEl" class="holder">
      <canvas ref="canvasEl" @mousemove="onMouseMove" @click="onClick" @wheel.prevent="onWheel" />
      <UnitInfoPanel v-if="info" :unit="info.unit" :max-hp="info.maxHp" :max-mp="info.maxMp" />
      <HoverTooltip v-if="tooltip" :x="tooltip.x" :y="tooltip.y" :title="tooltip.title" :lines="tooltip.lines" />
      <div v-if="menuMode === 'action' && !busy" class="menu">
        <button :disabled="targets.length === 0" @click="menuMode = 'attackPick'">攻击</button>
        <button :disabled="spells.length === 0" @click="menuMode = 'spell'">法术</button>
        <button :disabled="items.length === 0" @click="menuMode = 'item'">道具</button>
        <button @click="doIntent({ type: 'wait' })">待机</button>
        <button v-if="ui.canUndo" @click="menuMode = 'none'; doIntent({ type: 'undoMove' })">撤销</button>
      </div>
      <div v-else-if="menuMode === 'spell' && !busy" class="menu">
        <button v-for="s in spells" :key="s.id" @click="pendingSpellId = s.id; menuMode = 'spellPick'">
          {{ s.name }}（{{ s.mpCost }}MP）
        </button>
        <button @click="menuMode = 'action'">返回</button>
      </div>
      <div v-else-if="menuMode === 'item' && !busy" class="menu">
        <button v-for="it in items" :key="it.id" @click="doIntent({ type: 'useItem', itemId: it.id })">{{ it.name }}</button>
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
.battle {
  width: 100vw; height: 100vh; display: flex; flex-direction: column;
  background: #141210; user-select: none; overflow: hidden;
}
.hud {
  display: flex; align-items: center; gap: 18px; padding: 8px 14px;
  background: #1c1813; border-bottom: 1px solid #4a4030; color: #e8dfc8; font-size: 14px;
}
.hud .spacer { flex: 1; }
.hud button {
  padding: 5px 16px; font-size: 13px; color: #f0e6c8; background: #2a241c;
  border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer;
}
.hud button:hover:not(:disabled) { background: #3a3226; }
.hud button:disabled { opacity: 0.45; cursor: default; }
.holder { position: relative; flex: 1; overflow: hidden; }
.holder canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: crosshair; }
.menu {
  position: absolute; right: 12px; bottom: 12px; z-index: 5; display: flex; flex-direction: column; gap: 6px;
  padding: 8px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px;
}
.menu button {
  padding: 6px 18px; font-size: 14px; text-align: left; color: #f0e6c8; background: #2a241c;
  border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer;
}
.menu button:hover:not(:disabled) { background: #4a3f2c; }
.menu button:disabled { opacity: 0.45; cursor: default; }
.toast {
  position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 8;
  padding: 8px 20px; background: rgba(90, 48, 32, 0.92); border: 1px solid #a05a40;
  border-radius: 4px; color: #ffd8a0; font-size: 14px;
}
.overlay {
  position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 14px;
  background: rgba(10, 8, 6, 0.82); color: #f0e6c8;
}
.overlay h2 { font-family: 'Songti SC', serif; font-size: 44px; letter-spacing: 16px; margin: 0; }
.overlay p { color: #9a8f7a; margin: 0; }
.overlay button {
  padding: 9px 30px; font-size: 16px; color: #141210; background: #d8b86a;
  border: none; border-radius: 4px; cursor: pointer;
}
.overlay button:hover { background: #f0d28a; }
</style>
