<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAudio } from '../composables/useAudio'
import { 
  Trophy, Play, Award, Zap, ShieldAlert, Magnet, 
  ArrowRight, ShieldCheck, RefreshCw, Volume2, Heart, Award as IconAward
} from 'lucide-vue-next'

const router = useRouter()
const { startBGM, stopBGM, playSfx } = useAudio()

// Game states: 'lobby' | 'playing' | 'gameover'
const gameState = ref<'lobby' | 'playing' | 'gameover'>('lobby')
const playerName = ref('')
const nameInputError = ref('')
const top3 = ref<any[]>([])
const loadingLeaderboard = ref(false)

// Character appearance is locked to the PROGRESS uniform — no customization needed.

// Game HUD reference
const gameRef = ref<any>(null)
const hud = ref({
  hearts: 3,
  score: 0,
  coins: 0,
  timeRemaining: 120,
  activePowerup: null as string | null,
  powerupTimeLeft: 0
})

// End Game Statistics
const gameResults = ref({
  score: 0,
  time: 0,
  coins: 0,
  kills: 0,
  completed: false,
  rank: null as number | null,
  submitting: false,
  error: ''
})

// Cryptographic token generator for Anti-Cheat
async function generateHmacToken(name: string, score: number, time: number, coins: number, kills: number): Promise<string> {
  const salt = 'progress-run-exhibition-secret-salt-2026'
  const rawPayload = `${name.trim()}:${score}:${time}:${coins}:${kills}`
  
  const encoder = new TextEncoder()
  const keyData = encoder.encode(salt)
  const messageData = encoder.encode(rawPayload)
  
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await window.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  )
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const fetchTop3 = async () => {
  loadingLeaderboard.value = true
  try {
    const res = await $fetch<any>('/api/leaderboard?limit=3')
    if (res && res.success) {
      top3.value = res.data
    }
  } catch (err) {
    console.error('Failed to load top 3 leaderboard:', err)
  } finally {
    loadingLeaderboard.value = false
  }
}

onMounted(() => {
  // Load saved name
  const savedName = localStorage.getItem('progress_run_player_name')
  if (savedName) {
    playerName.value = savedName
  }
  fetchTop3()
})

const handleStartGame = () => {
  nameInputError.value = ''
  
  if (!playerName.value.trim()) {
    nameInputError.value = 'Please enter your name!'
    return
  }
  
  if (playerName.value.trim().length > 15) {
    nameInputError.value = 'Name must be 15 characters or less.'
    return
  }

  // Save player name
  localStorage.setItem('progress_run_player_name', playerName.value.trim())
  
  // Transition state & sound start
  gameState.value = 'playing'
  startBGM()
  playSfx('powerup')
}

const onUpdateHud = (newHud: any) => {
  hud.value = newHud
}

const onGameOver = async (stats: { score: number; time: number; coins: number; kills: number; completed: boolean }) => {
  stopBGM()
  gameState.value = 'gameover'
  
  gameResults.value = {
    score: stats.score,
    time: stats.time,
    coins: stats.coins,
    kills: stats.kills,
    completed: stats.completed,
    rank: null,
    submitting: true,
    error: ''
  }

  // Automatically submit score to database
  try {
    const token = await generateHmacToken(
      playerName.value,
      stats.score,
      stats.time,
      stats.coins,
      stats.kills
    )

    const res = await $fetch<any>('/api/score', {
      method: 'POST',
      body: {
        name: playerName.value.trim(),
        score: stats.score,
        time: stats.time,
        coins: stats.coins,
        kills: stats.kills,
        token
      }
    })

    if (res && res.success) {
      gameResults.value.rank = res.data.rank
    }
  } catch (err: any) {
    console.error('Failed to submit score:', err)
    gameResults.value.error = err.statusMessage || 'Validation failed. Cheating detected?'
  } finally {
    gameResults.value.submitting = false
    fetchTop3() // Refresh top 3
  }
}

const handleRestart = () => {
  gameState.value = 'playing'
  startBGM()
  playSfx('powerup')
}

const viewLeaderboard = () => {
  stopBGM()
  router.push('/leaderboard')
}
</script>

<template>
  <main class="flex-grow flex flex-col items-center justify-center p-4 max-w-5xl mx-auto w-full">
    
    <!-- 1. LOBBY STATE UI -->
    <div v-if="gameState === 'lobby'" class="w-full flex flex-col items-center gap-8 py-8 animate-fade-in">
      <!-- Title Section -->
      <div class="text-center relative select-none">
        <h1 class="text-4xl md:text-6xl font-retro tracking-wider text-purple-400 text-glow-purple mb-3">
          SYPON ADVENTURE
        </h1>
        <p class="text-xs md:text-sm font-retro text-cyan-400 text-glow-cyan tracking-widest uppercase">
          System Points and Onward Navigation
        </p>
        <div class="mt-2 text-xs text-slate-400">UKM PROGRESS — Stand Kampus Edition</div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <!-- Play / Name Input Column -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between shadow-2xl relative border-glow-purple overflow-hidden">
          <div class="space-y-4">
            <h2 class="text-lg font-retro text-purple-300">START RUN</h2>
            <p class="text-slate-400 text-sm">
              Enter your student name to begin navigating semesters. Avoid exams, finish assignments, and run towards graduation!
            </p>

            <div class="space-y-2 mt-4">
              <label class="block text-xs font-retro text-cyan-400">STUDENT NAME</label>
              <input
                type="text"
                v-model="playerName"
                placeholder="NIM / Name..."
                maxlength="15"
                @keyup.enter="handleStartGame"
                class="w-full bg-slate-950 border border-slate-850 focus:border-purple-500 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none transition-all duration-300 font-retro text-sm uppercase tracking-wider"
              />
              <p v-if="nameInputError" class="text-xs text-red-500 font-semibold">{{ nameInputError }}</p>
            </div>

            <!-- PROGRESS Uniform Badge (fixed design, no customization) -->
            <div class="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3 bg-slate-950/60 rounded-2xl px-4 py-3 border border-slate-800/60">
              <div class="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-800/40 shrink-0">
                <span class="text-teal-400 text-lg leading-none">🎽</span>
              </div>
              <div>
                <div class="text-[10px] font-retro text-teal-400 tracking-wider">PROGRESS UNIFORM</div>
                <div class="text-[9px] text-slate-500 font-retro mt-0.5">UKM PROGRESS — Programming of STIKOM Bali</div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3 mt-8">
            <button
              @click="handleStartGame"
              class="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-2xl font-retro text-sm tracking-wider cursor-pointer shadow-lg hover:shadow-purple-500/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              <Play class="w-4 h-4 fill-white" />
              INSERT COIN & START
            </button>

            <button
              @click="viewLeaderboard"
              class="w-full py-3 bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200 rounded-2xl font-retro text-xs tracking-wider cursor-pointer active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Trophy class="w-4 h-4" />
              ALL-TIME LEADERBOARD
            </button>
          </div>
        </div>

        <!-- Leaderboard Preview & Controls -->
        <div class="flex flex-col gap-6">
          <!-- Top 3 Preview Card -->
          <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex-grow">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg font-retro text-yellow-500 flex items-center gap-2 text-glow-yellow">
                <Trophy class="w-5 h-5" />
                TOP STUDENTS
              </h2>
              <span class="text-[10px] font-retro text-slate-500 animate-arcade-blink">HALL OF FAME</span>
            </div>

            <div v-if="loadingLeaderboard" class="flex flex-col items-center justify-center py-12 gap-2">
              <RefreshCw class="w-6 h-6 animate-spin text-purple-500" />
              <p class="text-xs font-retro text-slate-500">Grading sheets...</p>
            </div>

            <div v-else-if="top3.length === 0" class="flex items-center justify-center py-12">
              <p class="text-xs font-retro text-slate-500">No grades submitted yet.</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(player, idx) in top3"
                :key="player.id"
                class="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-850 hover:border-purple-900/60 transition-all duration-300"
              >
                <div class="flex items-center gap-3">
                  <!-- Badges for Rank -->
                  <div
                    class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-retro border"
                    :class="{
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-glow-yellow': idx === 0,
                      'bg-slate-300/20 text-slate-300 border-slate-400/50': idx === 1,
                      'bg-amber-700/20 text-amber-500 border-amber-600/50': idx === 2
                    }"
                  >
                    #{{ idx + 1 }}
                  </div>
                  <div class="font-retro text-xs uppercase tracking-wider text-slate-300 max-w-[120px] truncate">
                    {{ player.name }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-retro text-xs text-purple-400 text-glow-purple">{{ player.score }}</div>
                  <div class="text-[10px] text-slate-500 font-retro">{{ player.time }}s</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Gameplay Guide -->
          <div class="bg-slate-900/40 border border-slate-900 rounded-3xl p-5 backdrop-blur-md">
            <h3 class="text-xs font-retro text-slate-400 mb-3 tracking-wider uppercase">How to Play:</h3>
            <div class="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 font-retro">
              <div class="bg-slate-950 p-2 rounded-xl border border-slate-850">
                <div class="text-cyan-400 mb-1">A / D</div>
                <div>Run</div>
              </div>
              <div class="bg-slate-950 p-2 rounded-xl border border-slate-850">
                <div class="text-purple-400 mb-1">SPACE</div>
                <div>Jump</div>
              </div>
              <div class="bg-slate-950 p-2 rounded-xl border border-slate-850">
                <div class="text-yellow-400 mb-1">2x SPACE</div>
                <div>Double Jump</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. GAMEPLAY STATE UI -->
    <div v-if="gameState === 'playing'" class="w-full flex flex-col items-center gap-4 relative py-4">
      
      <!-- HUD Overlay -->
      <div class="w-full max-w-[900px] flex items-center justify-between p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md z-30 select-none">
        
        <!-- Lives (Hearts) -->
        <div class="flex items-center gap-1 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-850">
          <Heart 
            v-for="i in 3" 
            :key="i"
            class="w-5 h-5" 
            :class="i <= hud.hearts ? 'fill-red-500 text-red-500' : 'text-slate-700'"
          />
        </div>

        <!-- Grade Coins -->
        <div class="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-850">
          <span class="text-xs font-retro text-yellow-500">GRADES</span>
          <span class="text-sm font-retro text-slate-100">{{ hud.coins }}</span>
        </div>

        <!-- Active Powerup Slot -->
        <div class="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-850 min-w-[120px] justify-center">
          <div v-if="hud.activePowerup" class="flex items-center gap-1.5 text-xs font-retro text-glow-cyan">
            <ShieldCheck v-if="hud.activePowerup === 'shield'" class="w-4 h-4 text-amber-500" />
            <Zap v-if="hud.activePowerup === 'speed'" class="w-4 h-4 text-green-500" />
            <Magnet v-if="hud.activePowerup === 'magnet'" class="w-4 h-4 text-purple-500" />
            <span class="uppercase text-[10px]">{{ hud.activePowerup }} ({{ hud.powerupTimeLeft }}s)</span>
          </div>
          <span v-else class="text-[9px] font-retro text-slate-600">NO COFFEE</span>
        </div>

        <!-- Timer -->
        <div class="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-850">
          <span class="text-xs font-retro text-cyan-400">TIME</span>
          <span class="text-sm font-retro text-slate-100" :class="hud.timeRemaining < 20 ? 'text-red-500 animate-pulse' : ''">
            {{ hud.timeRemaining }}s
          </span>
        </div>

        <!-- Total Score -->
        <div class="flex flex-col items-end bg-purple-950/30 px-4 py-1.5 rounded-xl border border-purple-900/40">
          <span class="text-[9px] font-retro text-purple-400 tracking-wider">SCORE</span>
          <span class="text-sm font-retro text-purple-300 text-glow-purple">{{ hud.score }}</span>
        </div>
      </div>

      <!-- Embedded Phaser Game Canvas -->
      <GameCanvas
        ref="gameRef"
        :playerName="playerName"
        @update-hud="onUpdateHud"
        @game-over="onGameOver"
      />

      <!-- Mobile Touch Controller -->
      <div class="w-full max-w-[900px] grid grid-cols-2 p-2 select-none md:hidden bg-slate-950/40 rounded-xl">
        <!-- D-Pad Left/Right -->
        <div class="flex items-center gap-3 justify-start p-2">
          <button
            @touchstart.prevent="gameRef?.triggerMobileLeft(true)"
            @touchend.prevent="gameRef?.triggerMobileLeft(false)"
            class="w-16 h-16 bg-slate-800/80 border border-slate-700 active:bg-purple-600 rounded-full flex items-center justify-center font-retro text-lg text-slate-300 shadow-md touch-none"
          >
            ◀
          </button>
          <button
            @touchstart.prevent="gameRef?.triggerMobileRight(true)"
            @touchend.prevent="gameRef?.triggerMobileRight(false)"
            class="w-16 h-16 bg-slate-800/80 border border-slate-700 active:bg-purple-600 rounded-full flex items-center justify-center font-retro text-lg text-slate-300 shadow-md touch-none"
          >
            ▶
          </button>
        </div>
        
        <!-- Jump Action Button -->
        <div class="flex items-center justify-end p-2">
          <button
            @touchstart.prevent="gameRef?.triggerMobileJump()"
            class="w-16 h-16 bg-cyan-600/80 border border-cyan-500 active:bg-cyan-500 rounded-full flex items-center justify-center font-retro text-xs text-white shadow-md touch-none"
          >
            JUMP
          </button>
        </div>
      </div>
    </div>

    <!-- 3. GAME OVER STATE UI -->
    <div v-if="gameState === 'gameover'" class="w-full max-w-lg bg-slate-900 border-4 border-slate-700 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative border-glow-purple overflow-hidden text-center animate-fade-in select-none">
      
      <!-- Sparkle visual elements -->
      <div class="absolute inset-0 bg-gradient-to-b from-purple-900/10 to-cyan-900/10 pointer-events-none"></div>

      <!-- Header: Completed vs Died -->
      <div class="relative z-10 mb-6">
        <h2 
          class="text-2xl md:text-3xl font-retro tracking-wide mb-2"
          :class="gameResults.completed ? 'text-yellow-400 text-glow-yellow' : 'text-red-500 text-glow-purple'"
        >
          {{ gameResults.completed ? 'SEMESTER SURVIVED!' : 'ACADEMIC PROBATION!' }}
        </h2>
        <p class="text-[10px] font-retro text-slate-500 uppercase tracking-widest">
          {{ gameResults.completed ? 'Grade: Graduated Cum Laude' : 'Grade: Failed / Drop Out' }}
        </p>
      </div>

      <!-- Main Results Cards -->
      <div class="relative z-10 grid grid-cols-2 gap-4 mb-8">
        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-850">
          <div class="text-[9px] font-retro text-slate-500 mb-1 uppercase">FINAL SCORE</div>
          <div class="text-xl font-retro text-purple-400 text-glow-purple">{{ gameResults.score }}</div>
        </div>
        <div class="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-center">
          <div class="text-[9px] font-retro text-slate-500 mb-1 uppercase">LEADERBOARD RANK</div>
          <div v-if="gameResults.submitting" class="text-slate-400 animate-pulse text-xs font-retro">Submitting...</div>
          <div v-else-if="gameResults.error" class="text-red-500 text-[9px] font-retro">{{ gameResults.error }}</div>
          <div v-else-if="gameResults.rank" class="text-xl font-retro text-cyan-400 text-glow-cyan flex items-center justify-center gap-1">
            <IconAward class="w-5 h-5 text-cyan-400" />
            #{{ gameResults.rank }}
          </div>
          <div v-else class="text-slate-500 text-xs font-retro">-</div>
        </div>
        <div class="bg-slate-950 p-3 rounded-2xl border border-slate-850">
          <div class="text-[9px] font-retro text-slate-500 mb-1 uppercase">TIME</div>
          <div class="text-sm font-retro text-slate-300">{{ gameResults.time }}s</div>
        </div>
        <div class="bg-slate-950 p-3 rounded-2xl border border-slate-850">
          <div class="text-[9px] font-retro text-slate-500 mb-1 uppercase">GRADES (COINS)</div>
          <div class="text-sm font-retro text-slate-300">{{ gameResults.coins }} / 50</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="relative z-10 flex flex-col gap-3">
        <button
          @click="handleRestart"
          class="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-2xl font-retro text-sm tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group"
        >
          <RefreshCw class="w-4 h-4 group-hover:rotate-180 transition-all duration-500" />
          PLAY AGAIN
        </button>

        <button
          @click="viewLeaderboard"
          class="w-full py-3 bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200 rounded-2xl font-retro text-xs tracking-wider cursor-pointer active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Trophy class="w-4 h-4" />
          VIEW LEADERBOARD
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}
.pixelated {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
