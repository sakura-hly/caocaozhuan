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
.menu { display: flex; flex-direction: column; gap: 6px; padding: 8px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px; min-width: 160px; }
.menu button {
  padding: 6px 18px; font-size: 14px; text-align: left; color: #f0e6c8; background: #2a241c;
  border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer;
}
.menu button:hover:not(:disabled) { background: #4a3f2c; }
.menu small { color: #9a8f7a; margin-left: 6px; }
.menu .back { text-align: center; }
</style>
