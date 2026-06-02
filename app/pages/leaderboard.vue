<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Trophy, ArrowLeft, Calendar, Award, RefreshCw, Star, Zap } from 'lucide-vue-next'

const router = useRouter()

// Tab state: 'today' | 'all'
const activeTab = ref<'today' | 'all'>('today')
const scores = ref<any[]>([])
const loading = ref(false)

const fetchLeaderboard = async () => {
  loading.value = true
  try {
    const endpoint = activeTab.value === 'today' ? '/api/leaderboard/today' : '/api/leaderboard'
    const res = await $fetch<any>(endpoint)
    if (res && res.success) {
      scores.value = res.data
    }
  } catch (err) {
    console.error('Failed to fetch leaderboard data:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLeaderboard()
})

watch(activeTab, () => {
  fetchLeaderboard()
})

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <main class="flex-grow flex flex-col items-center justify-start p-4 max-w-5xl mx-auto w-full py-8 animate-fade-in select-none">
    
    <!-- Header -->
    <div class="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/')"
          class="p-3 bg-slate-900 border border-slate-800 hover:border-slate-650 hover:text-purple-400 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-2xl md:text-3xl font-retro text-purple-400 text-glow-purple tracking-wide">
            LEADERBOARD
          </h1>
          <p class="text-xs text-slate-500 font-retro tracking-widest mt-1 uppercase">Student Rank Registry</p>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div class="flex bg-slate-900 p-1 rounded-2xl border border-slate-850">
        <button
          @click="activeTab = 'today'"
          class="px-5 py-2.5 rounded-xl font-retro text-xs tracking-wider transition-all duration-300 cursor-pointer"
          :class="activeTab === 'today' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'"
        >
          TODAY'S BEST
        </button>
        <button
          @click="activeTab = 'all'"
          class="px-5 py-2.5 rounded-xl font-retro text-xs tracking-wider transition-all duration-300 cursor-pointer"
          :class="activeTab === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'"
        >
          ALL-TIME BEST
        </button>
      </div>
    </div>

    <!-- Spinner Loader -->
    <div v-if="loading" class="flex-grow flex flex-col items-center justify-center py-24 gap-3">
      <RefreshCw class="w-8 h-8 animate-spin text-purple-500" />
      <p class="text-sm font-retro text-slate-500">Retrieving official grades...</p>
    </div>

    <div v-else-if="scores.length === 0" class="flex-grow flex flex-col items-center justify-center py-24">
      <Trophy class="w-12 h-12 text-slate-700 mb-3" />
      <p class="text-sm font-retro text-slate-500">No student records filed yet.</p>
      <button 
        @click="router.push('/')" 
        class="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-retro text-xs cursor-pointer"
      >
        START FIRST RUN
      </button>
    </div>

    <!-- Podium & Grid Table -->
    <div v-else class="w-full flex flex-col gap-8">
      
      <!-- TOP 3 PODIUM CARDS (Gold, Silver, Bronze in eSports layout) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center max-w-4xl mx-auto w-full pt-6">
        
        <!-- #2 Silver Card -->
        <div 
          v-if="scores.length >= 2"
          class="order-2 md:order-1 bg-slate-900/60 border-2 border-slate-400/30 rounded-3xl p-6 flex flex-col items-center text-center backdrop-blur-sm relative border-glow shadow-xl h-[260px] justify-between"
        >
          <div class="absolute -top-6 bg-slate-400 text-slate-950 font-retro text-sm w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-slate-950 shadow-md">
            2nd
          </div>
          <div class="mt-4 flex flex-col items-center gap-1">
            <span class="font-retro text-xs text-slate-300 uppercase tracking-wide truncate max-w-[150px]">{{ scores[1].name }}</span>
            <span class="text-xs text-slate-500 font-retro">SEMESTER RUNNER</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="text-2xl font-retro text-slate-300">{{ scores[1].score }}</div>
            <div class="text-[10px] text-slate-500 font-retro mt-1">{{ scores[1].time }}s | {{ scores[1].coins }} coins</div>
          </div>
          <div class="text-[10px] font-retro text-slate-600 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-900">
            {{ formatDate(scores[1].createdAt) }}
          </div>
        </div>

        <!-- #1 Gold Card -->
        <div 
          v-if="scores.length >= 1"
          class="order-1 md:order-2 bg-slate-900/90 border-2 border-yellow-500/60 rounded-3xl p-6 flex flex-col items-center text-center backdrop-blur-md relative shadow-2xl h-[300px] justify-between border-glow-yellow"
        >
          <div class="absolute -top-7 bg-yellow-500 text-slate-950 font-retro text-lg w-14 h-14 rounded-2xl flex items-center justify-center border-4 border-slate-950 shadow-lg text-glow-yellow animate-bounce">
            ★1
          </div>
          <div class="mt-6 flex flex-col items-center gap-1.5">
            <span class="font-retro text-sm text-yellow-400 text-glow-yellow uppercase tracking-widest truncate max-w-[180px]">{{ scores[0].name }}</span>
            <span class="text-[10px] text-yellow-500/80 font-retro flex items-center gap-1">
              <Zap class="w-3.5 h-3.5 fill-yellow-500" />
              VALEDICTORIAN
            </span>
          </div>
          <div class="flex flex-col items-center">
            <div class="text-3xl font-retro text-yellow-400 text-glow-yellow">{{ scores[0].score }}</div>
            <div class="text-[10px] text-slate-400 font-retro mt-1">{{ scores[0].time }}s | {{ scores[0].coins }} coins</div>
          </div>
          <div class="text-[10px] font-retro text-yellow-500/70 bg-yellow-500/10 px-4 py-1.5 rounded-full border border-yellow-500/20">
            {{ formatDate(scores[0].createdAt) }}
          </div>
        </div>

        <!-- #3 Bronze Card -->
        <div 
          v-if="scores.length >= 3"
          class="order-3 bg-slate-900/60 border-2 border-amber-700/30 rounded-3xl p-6 flex flex-col items-center text-center backdrop-blur-sm relative border-glow shadow-xl h-[230px] justify-between"
        >
          <div class="absolute -top-6 bg-amber-700 text-slate-950 font-retro text-xs w-10 h-10 rounded-2xl flex items-center justify-center border-4 border-slate-950 shadow-md">
            3rd
          </div>
          <div class="mt-3 flex flex-col items-center gap-1">
            <span class="font-retro text-xs text-amber-500 uppercase tracking-wide truncate max-w-[150px]">{{ scores[2].name }}</span>
            <span class="text-[10px] text-slate-500 font-retro">DEAN LIST</span>
          </div>
          <div class="flex flex-col items-center">
            <div class="text-xl font-retro text-amber-600">{{ scores[2].score }}</div>
            <div class="text-[10px] text-slate-500 font-retro mt-1">{{ scores[2].time }}s | {{ scores[2].coins }} coins</div>
          </div>
          <div class="text-[10px] font-retro text-slate-600 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-900">
            {{ formatDate(scores[2].createdAt) }}
          </div>
        </div>
      </div>

      <!-- SCROLLABLE LIST TABLE (Ranks 4-50) -->
      <div v-if="scores.length > 3" class="w-full bg-slate-900/40 border border-slate-900 rounded-3xl overflow-hidden shadow-xl max-w-4xl mx-auto">
        <div class="overflow-x-auto max-h-[400px]">
          <table class="w-full text-left border-collapse">
            <thead class="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-900/80 z-10">
              <tr class="font-retro text-[10px] tracking-wider">
                <th class="py-4 px-6 text-center">RANK</th>
                <th class="py-4 px-6">STUDENT</th>
                <th class="py-4 px-6 text-right">SCORE</th>
                <th class="py-4 px-6 text-center">TIME</th>
                <th class="py-4 px-6 text-center">GRADES</th>
                <th class="py-4 px-6 text-right">SUBMISSION DATE</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-900/40">
              <tr 
                v-for="(score, index) in scores.slice(3)" 
                :key="score.id"
                class="hover:bg-slate-900/30 transition-all duration-200 text-slate-300"
              >
                <!-- Rank -->
                <td class="py-4 px-6 text-center font-retro text-xs text-slate-500">
                  #{{ index + 4 }}
                </td>
                <!-- Name -->
                <td class="py-4 px-6 font-retro text-xs text-slate-200 uppercase tracking-wide truncate max-w-[140px]">
                  {{ score.name }}
                </td>
                <!-- Score -->
                <td class="py-4 px-6 text-right font-retro text-xs text-purple-400 text-glow-purple">
                  {{ score.score }}
                </td>
                <!-- Time -->
                <td class="py-4 px-6 text-center font-retro text-xs">
                  {{ score.time }}s
                </td>
                <!-- Coins -->
                <td class="py-4 px-6 text-center font-retro text-xs text-yellow-500">
                  {{ score.coins }}
                </td>
                <!-- Date -->
                <td class="py-4 px-6 text-right text-xs text-slate-500 font-sans">
                  {{ formatDate(score.createdAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}
</style>
