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
