<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ChoiceDef } from '../../data/battles/choices'
import { gameData } from '../../data'
import { drawPortrait } from '../../render/sprites'
import { heroOf } from './portraitLookup'

const props = defineProps<{ choice: ChoiceDef }>()
const emit = defineEmits<{ (e: 'picked', optionIndex: number): void }>()

const cv = ref<HTMLCanvasElement | null>(null)
/** 静态头像，挂载画一次（同 DialogueBox.paintPortrait 手法）。 */
onMounted(() => {
  const el = cv.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return
  ctx.clearRect(0, 0, el.width, el.height)
  drawPortrait(ctx, heroOf(props.choice.speaker), 0, 0, el.width)
})

const itemName = (id: string) => gameData.items[id]?.name ?? id
</script>

<template>
  <div class="choice">
    <canvas ref="cv" width="56" height="56" class="portrait" />
    <div class="body">
      <p class="prompt">{{ choice.prompt }}</p>
      <button v-for="(opt, i) in choice.options" :key="i" @click="$emit('picked', i)">
        {{ opt.label }}<template v-if="opt.itemRewards?.length">（得 {{ opt.itemRewards.map(itemName).join('、') }}）</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.choice { display: flex; gap: 12px; padding: 12px; background: rgba(12, 10, 7, 0.92); border: 2px solid #8a7a50; border-radius: 6px; }
.portrait { width: 56px; height: 56px; image-rendering: pixelated; border: 1px solid #6a5c40; align-self: flex-start; }
.body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.prompt { margin: 0; font-size: 15px; line-height: 1.6; color: #f0e6c8; }
button { padding: 8px 16px; text-align: left; background: #2a241c; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; font-size: 14px; }
button:hover { background: #3a3226; border-color: #d8b86a; }
</style>
