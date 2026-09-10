<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CampaignState } from '../../game/campaign'
import { CAMPAIGN_BATTLES, currentBattleId } from '../../game/campaign'
import { battles } from '../../data/battles'
import { gameData } from '../../data'
import { saveSlot, loadSlot, slotInfo, serialize, deserialize, localStorageAdapter, SLOT_KEYS, type SlotKey } from '../../game/saves'

const props = defineProps<{ campaign: CampaignState }>()
const emit = defineEmits<{ (e: 'prep'): void; (e: 'loaded', c: CampaignState): void; (e: 'toTitle'): void }>()

const manualSlots = SLOT_KEYS.filter((k) => k !== 'auto')
const notice = ref<string | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)

const current = computed(() => currentBattleId(props.campaign))
const cleared = computed(() => props.campaign.progress)
const rows = computed(() => CAMPAIGN_BATTLES.map((id, i) => ({
  id, name: battles[id]?.name ?? id,
  state: i < cleared.value ? 'cleared' : i === cleared.value ? 'current' : 'locked',
})))

// localStorage 读取无响应性，且连续保存同一档位时 notice 同值被 Object.is 短路——saveTick 自增是显式刷新信号
const saveTick = ref(0)
function infoOf(slot: SlotKey) { void saveTick.value; return slotInfo(localStorageAdapter, slot, gameData) }
function fmt(t: number | null) { return t === null ? '—' : new Date(t).toLocaleString() }

function save(slot: SlotKey): void {
  saveSlot(localStorageAdapter, slot, props.campaign)
  saveTick.value++
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
  reader.onerror = () => { notice.value = '导入失败：无法读取文件' }
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
