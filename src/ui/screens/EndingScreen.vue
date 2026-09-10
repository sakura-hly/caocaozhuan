<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ morality: number }>()
defineEmits<{ (e: 'toTitle'): void }>()

/** 分档：≥2 忠臣 / ≤−2 奸雄 / 其余中间（口径与 CampaignState.morality 注释一致）。 */
const kind = computed<'loyal' | 'tyrant' | 'middle'>(() => {
  if (props.morality >= 2) return 'loyal'
  if (props.morality <= -2) return 'tyrant'
  return 'middle'
})
const ENDINGS = {
  loyal: {
    title: '治世之能臣',
    lines: [
      '青州平贼不戮降，徐州安民，宛城抚卒，白门楼明正军法。',
      '世人评孟德：可信、可托、可寄生死。',
      '汉室虽衰，能臣之名，青史镌之。',
    ],
  },
  tyrant: {
    title: '乱世之奸雄',
    lines: [
      '屠徐州以泄私愤，诛降卒以绝后患，惜吕布之勇而忘其义。',
      '世人评孟德：治世之能臣，乱世之奸雄——君择其后者。',
      '天下汹汹，唯强者定之。',
    ],
  },
  middle: {
    title: '非常之人，超世之杰',
    lines: [
      '仁与威并施，义与利相权。乱世之中，君行于两者之间。',
      '不拘一德，不守一义，唯务实而进。',
      '非常之人，超世之杰——后人论之，毁誉参半。',
    ],
  },
} as const
const ending = computed(() => ENDINGS[kind.value])
</script>

<template>
  <div class="ending-screen">
    <p class="kicker">终章 · 八战功成</p>
    <h1>{{ ending.title }}</h1>
    <p v-for="(l, i) in ending.lines" :key="i" class="line">{{ l }}</p>
    <p class="meter">忠奸之评：{{ morality > 0 ? '+' : '' }}{{ morality }}</p>
    <button class="primary" @click="$emit('toTitle')">返回标题</button>
  </div>
</template>

<style scoped>
.ending-screen { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(ellipse at center, #2a241c 0%, #141210 75%); color: #f0e6c8; }
.kicker { color: #9a8f7a; letter-spacing: 6px; margin: 0; }
h1 { font-family: 'Songti SC', serif; font-size: 44px; letter-spacing: 12px; margin: 0 0 18px; color: #f0d28a; }
.line { margin: 0; letter-spacing: 2px; line-height: 1.9; }
.meter { margin-top: 16px; color: #9a8f7a; }
.primary { margin-top: 26px; padding: 12px 44px; font-size: 16px; letter-spacing: 6px; color: #141210; background: #d8b86a; border: none; border-radius: 4px; cursor: pointer; }
.primary:hover { background: #f0d28a; }
</style>
