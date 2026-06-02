<script setup lang="ts">
import { useAudio } from '../composables/useAudio'
import { Volume2, VolumeX } from 'lucide-vue-next'

const { isMuted, toggleMute } = useAudio()
</script>

<template>
  <button
    @click="toggleMute"
    class="fixed top-4 right-4 z-50 p-3 bg-slate-900/90 border border-slate-700 hover:border-purple-500 rounded-xl text-slate-300 hover:text-purple-400 backdrop-blur-md transition-all duration-300 shadow-lg cursor-pointer flex items-center justify-center"
    title="Toggle Mute"
    aria-label="Toggle Mute"
  >
    <VolumeX v-if="isMuted" class="w-6 h-6 animate-pulse text-red-400" />
    <Volume2 v-else class="w-6 h-6 text-cyan-400" />
  </button>
</template>
