<script setup lang="ts">
import type { Unit } from '../../engine/types'
import { gameData } from '../../data'
import { effectiveStats } from '../../engine/internal'

interface Props { unit: Unit; maxHp: number; maxMp: number }
const props = defineProps<Props>()

const heroName = (u: Unit): string => gameData.heroes[u.heroId]?.name ?? u.name
const className = (u: Unit): string => gameData.classes[u.classId]?.name ?? u.classId
const equipNames = (u: Unit): string[] =>
  Object.values(u.equipment)
    .filter((id): id is string => !!id)
    .map((id) => gameData.items[id]?.name ?? id)
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
      <span>敏 {{ stats().agi }}</span><span>智 {{ stats().spirit }}</span>
    </div>
    <div v-if="equipNames(unit).length" class="row equips">{{ equipNames(unit).join(' · ') }}</div>
    <div v-if="unit.statuses.length" class="row status">
      <span v-for="st in unit.statuses" :key="st.kind" class="tag">{{ STATUS_LABELS[st.kind] ?? st.kind }}({{ st.turns }})</span>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: absolute; left: 10px; bottom: 10px; width: 300px; padding: 10px 12px;
  background: rgba(16, 13, 10, 0.88); border: 1px solid #6a5c40; border-radius: 4px;
  color: #f0e6c8; font-size: 13px; pointer-events: none;
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
