<script setup lang="ts">
import { computed, ref, toRaw } from 'vue'
import type { CampaignState, RosterMember } from '../../game/campaign'
import { equipItem, unequipItem, assignItem, unassignItem } from '../../game/campaign'
import { battles } from '../../data/battles'
import { gameData } from '../../data'
import type { ItemSlot } from '../../engine/types'

const props = defineProps<{ campaign: CampaignState; battleId: string }>()
const emit = defineEmits<{ (e: 'start', c: CampaignState): void; (e: 'back'): void }>()

/** 工作副本：整备中的所有改动先落在这里，出征才上交。 */
const work = ref<CampaignState>(structuredClone(toRaw(props.campaign)))
const selectedId = ref<string>(work.value.roster[0]?.heroId ?? '')
const notice = ref<string | null>(null)

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
