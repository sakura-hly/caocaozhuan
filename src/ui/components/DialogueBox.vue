<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { DialogueLine } from '../../data/battles/shared'
import type { HeroDef } from '../../engine/types'
import { gameData } from '../../data'
import { drawPortrait } from '../../render/sprites'

interface Props { lines: DialogueLine[] }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'finished'): void }>()

const idx = ref(0)
const shown = ref('')
const canvasEl = ref<HTMLCanvasElement | null>(null)
let timer = 0

const line = computed<DialogueLine | null>(() => props.lines[idx.value] ?? null)
const fullText = computed<string>(() => line.value?.text ?? '')

/** 说话人 → 武将定义（查不到给通用兜底：同色相、默认兵种）。 */
function heroOf(speaker: string): HeroDef {
  const found = Object.values(gameData.heroes).find((h) => h.name === speaker)
  if (found) return found
  return { id: `npc:${speaker}`, name: speaker, classId: 'infantry', portraitHue: 210 } as unknown as HeroDef
}

function paintPortrait(): void {
  const cv = canvasEl.value
  const l = line.value
  if (!cv || !l) return
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, cv.width, cv.height)
  drawPortrait(ctx, heroOf(l.speaker), 0, 0, cv.width)
}

function startTyping(): void {
  clearInterval(timer)
  shown.value = ''
  void nextTick(paintPortrait)
  timer = window.setInterval(() => {
    if (shown.value.length < fullText.value.length) shown.value += fullText.value[shown.value.length]!
    else clearInterval(timer)
  }, 28)
}

watch(() => [props.lines, idx.value], startTyping, { immediate: true })

function advance(): void {
  if (shown.value.length < fullText.value.length) { // 先补全本行
    shown.value = fullText.value
    return
  }
  if (idx.value < props.lines.length - 1) idx.value += 1
  else emit('finished')
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div v-if="line" class="dialogue" @click="advance">
    <canvas ref="canvasEl" width="72" height="72" class="portrait" />
    <div class="body">
      <div class="speaker">{{ line.speaker }}</div>
      <p class="text">{{ shown }}<i v-if="shown.length >= fullText.length" class="cursor">▼</i></p>
    </div>
  </div>
</template>

<style scoped>
.dialogue {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  width: min(720px, 92%);
  padding: 12px 16px;
  background: rgba(12, 10, 7, 0.92);
  border: 2px solid #8a7a50;
  border-radius: 6px;
  color: #f0e6c8;
  cursor: pointer;
  z-index: 20;
}
.portrait { width: 72px; height: 72px; image-rendering: pixelated; border: 1px solid #6a5c40; }
.speaker { color: #f0d28a; font-weight: bold; letter-spacing: 2px; margin-bottom: 4px; }
.text { margin: 0; font-size: 16px; line-height: 1.7; min-height: 54px; }
.cursor { font-style: normal; color: #f0d28a; animation: blink 0.8s infinite; margin-left: 4px; }
@keyframes blink { 50% { opacity: 0; } }
</style>
