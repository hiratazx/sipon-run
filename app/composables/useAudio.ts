import { ref, watch, onMounted } from 'vue'

const isMuted = ref(false)
let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let bgmInterval: number | null = null
let bgmTimeouts: number[] = []
let currentStep = 0

// Simple retro 8-bit melody sequencer
// Bassline notes (frequencies)
const BASS_LINE = [
  110, 110, 130, 130, 146, 146, 165, 165, // A2, C3, D3, E3
  110, 110, 130, 130, 165, 146, 110, 82,  // A2, C3, E3, D3, A2, E2
]

// Lead melody notes (frequencies, 0 represents rest)
const MELODY_LINE = [
  440, 0, 494, 523, 587, 0, 523, 494,
  440, 523, 587, 659, 587, 523, 440, 329,
  440, 0, 494, 523, 587, 0, 659, 587,
  523, 587, 698, 659, 587, 494, 440, 0
]

function initAudio() {
  if (audioCtx) return
  
  // Create Audio Context
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContextClass) return
  
  audioCtx = new AudioContextClass()
  
  // Create Master Gain Node
  masterGain = audioCtx.createGain()
  masterGain.gain.setValueAtTime(isMuted.value ? 0 : 0.25, audioCtx.currentTime)
  masterGain.connect(audioCtx.destination)
}

function playNote(freq: number, type: OscillatorType, duration: number, startTime: number, volume = 0.3) {
  if (!audioCtx || !masterGain || isMuted.value) return
  if (freq === 0) return

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)

  gain.gain.setValueAtTime(volume, startTime)
  // Exponential decay
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.connect(gain)
  gain.connect(masterGain)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function useAudio() {
  // Read mute preference from localStorage on client side
  onMounted(() => {
    const savedMute = localStorage.getItem('progress_run_muted')
    if (savedMute !== null) {
      isMuted.value = savedMute === 'true'
    }
  })

  // Watch isMuted to update master volume instantly
  watch(isMuted, (muted) => {
    localStorage.setItem('progress_run_muted', String(muted))
    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(muted ? 0 : 0.25, audioCtx.currentTime)
    }
  })

  const toggleMute = () => {
    initAudio()
    // Resume context if suspended (browser security policy)
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    isMuted.value = !isMuted.value
  }

  const startBGM = () => {
    initAudio()
    if (!audioCtx) return
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    if (bgmInterval) return // Already running

    const stepDuration = 0.25 // 250ms per step
    currentStep = 0

    const scheduler = () => {
      if (!audioCtx || isMuted.value) return
      
      const now = audioCtx.currentTime
      const lookAhead = 0.1 // 100ms lookahead

      // Schedule notes for the next step
      const bassFreq = BASS_LINE[currentStep % BASS_LINE.length]
      const leadFreq = MELODY_LINE[currentStep % MELODY_LINE.length]

      // Play bass (triangle wave, warmer sound)
      if (bassFreq > 0) {
        playNote(bassFreq, 'triangle', stepDuration - 0.05, now, 0.4)
      }

      // Play lead melody (square wave, retro 8-bit pulse sound)
      if (leadFreq > 0 && currentStep % 2 === 0) {
        playNote(leadFreq, 'square', stepDuration * 1.5, now, 0.15)
      }

      currentStep++
    }

    // Run scheduler immediately and on interval
    scheduler()
    bgmInterval = window.setInterval(scheduler, stepDuration * 1000)
  }

  const stopBGM = () => {
    if (bgmInterval) {
      clearInterval(bgmInterval)
      bgmInterval = null
    }
    bgmTimeouts.forEach(clearTimeout)
    bgmTimeouts = []
  }

  const playSfx = (type: 'jump' | 'coin' | 'damage' | 'victory' | 'powerup' | 'gameover') => {
    initAudio()
    if (!audioCtx || isMuted.value) return
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    const now = audioCtx.currentTime

    if (type === 'jump') {
      // 8-bit Jump: swift sweep up on triangle wave
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(150, now)
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.15)
      gain.gain.setValueAtTime(0.3, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
      osc.connect(gain)
      gain.connect(masterGain!)
      osc.start(now)
      osc.stop(now + 0.15)
    } 
    else if (type === 'coin') {
      // 8-bit Coin: twin tone sine wave (bing!)
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(987.77, now) // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08) // E6
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.setValueAtTime(0.25, now + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.connect(gain)
      gain.connect(masterGain!)
      osc.start(now)
      osc.stop(now + 0.25)
    } 
    else if (type === 'damage') {
      // 8-bit Hit/Damage: harsh noise sweep down
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(300, now)
      osc.frequency.linearRampToValueAtTime(50, now + 0.3)
      
      // Add slight frequency modulation to sound explosive
      const mod = audioCtx.createOscillator()
      const modGain = audioCtx.createGain()
      mod.frequency.setValueAtTime(60, now)
      modGain.gain.setValueAtTime(100, now)
      mod.connect(modGain)
      modGain.connect(osc.frequency)
      
      gain.gain.setValueAtTime(0.4, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3)
      osc.connect(gain)
      gain.connect(masterGain!)
      
      mod.start(now)
      osc.start(now)
      mod.stop(now + 0.3)
      osc.stop(now + 0.3)
    }
    else if (type === 'powerup') {
      // 8-bit Powerup: chromatic rise on triangle wave
      const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50] // E4, G4, C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx!.createOscillator()
        const gain = audioCtx!.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.04)
        gain.gain.setValueAtTime(0.2, now + idx * 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.1)
        osc.connect(gain)
        gain.connect(masterGain!)
        osc.start(now + idx * 0.04)
        osc.stop(now + idx * 0.04 + 0.1)
      })
    }
    else if (type === 'victory') {
      // Short victory fan-fare
      const notes = [
        { f: 523.25, d: 0.1, t: 0 },    // C5
        { f: 659.25, d: 0.1, t: 0.1 },  // E5
        { f: 783.99, d: 0.1, t: 0.2 },  // G5
        { f: 1046.50, d: 0.2, t: 0.3 }, // C6
        { f: 783.99, d: 0.1, t: 0.5 },  // G5
        { f: 1046.50, d: 0.4, t: 0.6 }  // C6
      ]
      notes.forEach((note) => {
        const osc = audioCtx!.createOscillator()
        const gain = audioCtx!.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(note.f, now + note.t)
        gain.gain.setValueAtTime(0.25, now + note.t)
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d)
        osc.connect(gain)
        gain.connect(masterGain!)
        osc.start(now + note.t)
        osc.stop(now + note.t + note.d)
      })
    }
    else if (type === 'gameover') {
      // Sad downward arpeggio
      const notes = [
        { f: 392.00, d: 0.15, t: 0 },   // G4
        { f: 349.23, d: 0.15, t: 0.15 }, // F4
        { f: 311.13, d: 0.15, t: 0.3 },  // Eb4
        { f: 261.63, d: 0.5, t: 0.45 }   // C4
      ]
      notes.forEach((note) => {
        const osc = audioCtx!.createOscillator()
        const gain = audioCtx!.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(note.f, now + note.t)
        gain.gain.setValueAtTime(0.3, now + note.t)
        gain.gain.linearRampToValueAtTime(0.001, now + note.t + note.d)
        osc.connect(gain)
        gain.connect(masterGain!)
        osc.start(now + note.t)
        osc.stop(now + note.t + note.d)
      })
    }
  }

  return {
    isMuted,
    toggleMute,
    startBGM,
    stopBGM,
    playSfx
  }
}
