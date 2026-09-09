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
.menu { display: flex; flex-direction: column; gap: 6px; padding: 8px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px; min-width: 180px; }
.menu button {
  padding: 6px 18px; font-size: 14px; text-align: left; color: #f0e6c8; background: #2a241c;
  border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer;
}
.menu button:hover:not(:disabled) { background: #4a3f2c; }
.menu small { color: #9a8f7a; margin-left: 6px; }
.menu .back { text-align: center; }
</style>
