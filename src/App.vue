<script setup lang="ts">
import { ref } from 'vue'
import BattleScreen from './ui/screens/BattleScreen.vue'

const started = ref(false)
</script>

<template>
  <div v-if="!started" class="title-screen">
    <h1>三国志 · 曹操传</h1>
    <p class="sub">Web 复刻 · 核心可玩版</p>
    <button class="start" @click="started = true">开始颍川之战</button>
  </div>
  <BattleScreen v-else battle-id="yingchuan" @exit="started = false" />
</template>

<style scoped>
.title-screen {
  width: 100vw; height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 18px;
  background: radial-gradient(ellipse at center, #2a241c 0%, #141210 75%);
  color: #f0e6c8;
}
h1 { font-family: 'Songti SC', serif; font-size: 52px; letter-spacing: 14px; margin: 0; }
.sub { color: #9a8f7a; letter-spacing: 4px; margin: 0; }
.start {
  margin-top: 24px; padding: 12px 44px; font-size: 18px; letter-spacing: 6px;
  color: #141210; background: #d8b86a; border: none; border-radius: 4px; cursor: pointer;
}
.start:hover { background: #f0d28a; }
</style>
