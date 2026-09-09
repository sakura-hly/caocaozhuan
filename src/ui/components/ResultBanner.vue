<script setup lang="ts">
interface Props { won: boolean; turn: number; rewards?: string[] }
withDefaults(defineProps<Props>(), { rewards: () => [] })
defineEmits<{ (e: 'restart'): void; (e: 'exit'): void }>()
</script>

<template>
  <div class="overlay">
    <h2>{{ won ? '胜 利' : '败 北' }}</h2>
    <p>第 {{ turn }} 回合{{ won ? '告捷' : '战罢' }}</p>
    <ul v-if="rewards.length" class="rewards">
      <li v-for="r in rewards" :key="r">获得 {{ r }}</li>
    </ul>
    <div class="btns">
      <button @click="$emit('restart')">重新开始</button>
      <button @click="$emit('exit')">返回标题</button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: rgba(10, 8, 6, 0.82); color: #f0e6c8; }
h2 { font-family: 'Songti SC', serif; font-size: 56px; letter-spacing: 20px; margin: 0; color: #f0d28a; }
.rewards { list-style: none; padding: 0; color: #d8b86a; }
.btns { display: flex; gap: 12px; }
button { padding: 8px 28px; background: #3a3226; color: #f0e6c8; border: 1px solid #6a5c40; border-radius: 3px; cursor: pointer; }
</style>
