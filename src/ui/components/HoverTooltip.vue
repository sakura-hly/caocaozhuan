<script setup lang="ts">
interface Props { x: number; y: number; title: string; lines: string[] }
defineProps<Props>()
</script>

<template>
  <div class="tooltip" :style="{ left: x + 'px', top: y + 'px' }">
    <div class="tt-title">{{ title }}</div>
    <div v-for="(l, i) in lines" :key="i" class="tt-line">{{ l }}</div>
  </div>
</template>

<style scoped>
.tooltip {
  position: absolute; padding: 6px 10px; background: rgba(16, 13, 10, 0.92);
  border: 1px solid #6a5c40; border-radius: 4px; color: #e8dfc8; font-size: 12px;
  pointer-events: none; z-index: 10; transform: translate(14px, -50%); white-space: nowrap;
}
.tt-title { font-weight: bold; color: #f0d28a; margin-bottom: 2px; }
.tt-line { color: #b8af98; }
</style>
