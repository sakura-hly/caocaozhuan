<script setup lang="ts">
interface Props { canAttack: boolean; canCast: boolean; canItem: boolean; canUndo: boolean }
defineProps<Props>()
defineEmits<{ (e: 'attack'): void; (e: 'cast'): void; (e: 'item'): void; (e: 'wait'): void; (e: 'undo'): void }>()
</script>

<template>
  <div class="menu row">
    <button :disabled="!canAttack" @click="$emit('attack')">攻击</button>
    <button :disabled="!canCast" @click="$emit('cast')">法术</button>
    <button :disabled="!canItem" @click="$emit('item')">道具</button>
    <button @click="$emit('wait')">待机</button>
    <button v-if="canUndo" @click="$emit('undo')">撤销</button>
  </div>
</template>

<style scoped>
.menu { display: flex; gap: 6px; padding: 8px; background: rgba(16, 13, 10, 0.92); border: 1px solid #6a5c40; border-radius: 4px; }
.menu button {
  padding: 6px 18px; font-size: 14px; color: #f0e6c8; background: #2a241c;
  border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer;
}
.menu button:hover:not(:disabled) { background: #4a3f2c; }
.menu button:disabled { opacity: 0.45; cursor: default; }
</style>
