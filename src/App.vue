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

/** localStorage 读取无响应性：computed 零依赖会永不过期，改为普通函数让每次渲染重求值。 */
function hasAutoSave(): boolean {
  return slotInfo(localStorageAdapter, 'auto', gameData).status === 'ok'
}
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
      <button class="start" :disabled="!hasAutoSave()" @click="continueCampaign">继续征程</button>
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
