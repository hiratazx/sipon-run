<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAudio } from '../composables/useAudio'

// Character appearance is fixed to the PROGRESS uniform — no customization props.
const props = defineProps<{
  playerName: string
}>()

const emit = defineEmits<{
  (e: 'game-over', stats: { score: number; time: number; coins: number; kills: number; completed: boolean }): void
  (e: 'update-hud', hud: { hearts: number; score: number; coins: number; timeRemaining: number; activePowerup: string | null; powerupTimeLeft: number }): void
}>()

const phaserContainer = ref<HTMLDivElement | null>(null)
let gameInstance: any = null
const { playSfx } = useAudio()

const surrenderBtnTop = ref(-100) // hidden initially
const surrenderBtnLeft = ref(-100)
const moveSurrenderBtn = () => {
  if (typeof window !== 'undefined') {
    surrenderBtnTop.value = Math.floor(Math.random() * (window.innerHeight - 60)) + 10
    surrenderBtnLeft.value = Math.floor(Math.random() * (window.innerWidth - 120)) + 10
  }
}

// --- PROGRESS UNIFORM COLOUR PALETTE (fixed) ---
const C = {
  black:    '#0d0d0d',  // main shirt body
  teal:     '#0d9488',  // collar, epaulettes, button strip, cuffs, lower diagonal
  tealDark: '#0a7568',  // teal shadow
  skin:     '#f5cba7',  // face
  skinSh:   '#e0a87a',  // face shadow
  hair:     '#1a1a1a',  // dark hair under cap
  pants:    '#1e293b',  // dark navy trousers
  pantsSh:  '#0f172a',  // trouser shadow
  shoes:    '#111827',  // shoes
  redFlag:  '#dc2626',  // Indonesian flag – red
  white:    '#f8fafc',  // flag white / logo text
  logo:     '#e2e8f0',  // PROGRESS badge
  gold:     '#fbbf24',  // small logo accent
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    surrenderBtnTop.value = 20
    surrenderBtnLeft.value = window.innerWidth / 2 - 50
  }

  // Dynamically import Phaser to bypass Nuxt SSR checks
  const Phaser = await import('phaser')

  // --- SPRITE PROCEDURAL GENERATOR ---
  // We draw pixel art on HTML Canvas at runtime and load them as Phaser textures!
  const generateTextures = (scene: Phaser.Scene) => {
    const createTexture = (key: string, width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawFn(ctx)
        scene.textures.addCanvas(key, canvas)
      }
    }

    // 1. PROGRESS Uniform Player Texture (32x32) — FIXED design, no customisation
    // Frames: stand, walk1, walk2, jump, hit
    const drawPlayer = (ctx: CanvasRenderingContext2D, frame: string) => {
      ctx.imageSmoothingEnabled = false

      // ── HAIR (dark, visible under open collar) ──
      ctx.fillStyle = C.hair
      ctx.fillRect(9, 2, 13, 5)   // hair top
      ctx.fillRect(8, 4, 2, 4)    // hair side left
      ctx.fillRect(21, 4, 2, 4)   // hair side right

      // ── FACE ──
      ctx.fillStyle = C.skin
      ctx.fillRect(9, 6, 13, 9)   // face
      // cheek shadow
      ctx.fillStyle = C.skinSh
      ctx.fillRect(9,  13, 2, 2)
      ctx.fillRect(19, 13, 2, 2)
      // eyes
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(11, 9, 2, 2)
      ctx.fillRect(18, 9, 2, 2)
      // mouth
      ctx.fillStyle = '#c47a5a'
      ctx.fillRect(13, 13, 5, 1)

      // ── TEAL COLLAR (wide spread) ──
      ctx.fillStyle = C.teal
      ctx.fillRect(9, 15, 13, 3)  // collar band
      // V-opening
      ctx.fillStyle = C.black
      ctx.fillRect(13, 16, 5, 4)  // V-neck cutout

      // ── BLACK SHIRT BODY ──
      ctx.fillStyle = C.black
      ctx.fillRect(6, 17, 19, 11) // torso

      // ── TEAL BUTTON STRIP (center) ──
      ctx.fillStyle = C.teal
      ctx.fillRect(14, 17, 3, 11)
      // small button dots
      ctx.fillStyle = C.tealDark
      ctx.fillRect(15, 18, 1, 1)
      ctx.fillRect(15, 21, 1, 1)
      ctx.fillRect(15, 24, 1, 1)

      // ── TEAL EPAULETTES (shoulder pads) ──
      ctx.fillStyle = C.teal
      ctx.fillRect(5, 17, 3, 2)   // left shoulder
      ctx.fillRect(23, 17, 3, 2)  // right shoulder
      ctx.fillStyle = C.tealDark
      ctx.fillRect(5, 18, 3, 1)
      ctx.fillRect(23, 18, 3, 1)

      // ── TEAL LOWER DIAGONAL PANEL (bottom of shirt) ──
      ctx.fillStyle = C.teal
      ctx.fillRect(6, 25, 5, 3)   // left lower panel
      ctx.fillRect(20, 25, 5, 3)  // right lower panel

      // ── POCKET FLAPS ──
      ctx.fillStyle = C.teal
      ctx.fillRect(8, 20, 4, 1)   // left pocket top
      ctx.fillRect(19, 20, 4, 1)  // right pocket top
      ctx.fillStyle = C.tealDark
      ctx.fillRect(8, 21, 4, 2)
      ctx.fillRect(19, 21, 4, 2)

      // ── INDONESIAN FLAG (left sleeve, right on sprite facing right) ──
      ctx.fillStyle = C.redFlag
      ctx.fillRect(5, 19, 3, 2)   // red half
      ctx.fillStyle = C.white
      ctx.fillRect(5, 21, 3, 2)   // white half
      // thin border
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 0.5
      ctx.strokeRect(5, 19, 3, 4)

      // ── PROGRESS LOGO BADGE (right chest) ──
      ctx.fillStyle = C.white
      ctx.fillRect(20, 22, 3, 3)  // badge background
      ctx.fillStyle = C.gold
      ctx.fillRect(21, 23, 1, 1)  // gold dot / flame icon

      // ── TEAL SLEEVE CUFFS ──
      ctx.fillStyle = C.teal
      if (frame === 'walk1' || frame === 'walk2') {
        ctx.fillRect(5, 24, 3, 2)   // left cuff
        ctx.fillRect(23, 24, 3, 2)  // right cuff
      } else {
        ctx.fillRect(5, 25, 3, 2)
        ctx.fillRect(23, 25, 3, 2)
      }

      // ── LEGS / TROUSERS (dark navy) ──
      ctx.fillStyle = C.pants
      if (frame === 'walk1') {
        ctx.fillRect(7,  28, 5, 4)   // left leg forward
        ctx.fillRect(17, 28, 5, 6)   // right leg back
      } else if (frame === 'walk2') {
        ctx.fillRect(7,  28, 5, 6)
        ctx.fillRect(17, 28, 5, 4)
      } else if (frame === 'jump') {
        ctx.fillRect(6,  27, 5, 4)   // legs bent
        ctx.fillRect(20, 27, 5, 4)
      } else {
        ctx.fillRect(7,  28, 5, 6)   // stand / hit
        ctx.fillRect(19, 28, 5, 6)
      }
      // trouser crease
      ctx.fillStyle = C.pantsSh
      if (frame === 'stand' || frame === 'hit') {
        ctx.fillRect(11, 28, 1, 6)
        ctx.fillRect(23, 28, 1, 6)
      }

      // ── SHOES ──
      ctx.fillStyle = C.shoes
      if (frame === 'walk1') {
        ctx.fillRect(6,  32, 6, 2)   // left
        ctx.fillRect(17, 34, 6, 2)   // right
      } else if (frame === 'walk2') {
        ctx.fillRect(6,  34, 6, 2)
        ctx.fillRect(17, 32, 6, 2)
      } else if (frame === 'jump') {
        ctx.fillRect(5,  31, 6, 2)
        ctx.fillRect(20, 31, 6, 2)
      } else {
        ctx.fillRect(6,  34, 6, 2)
        ctx.fillRect(18, 34, 6, 2)
      }

      // ── HIT FLASH OVERLAY ──
      if (frame === 'hit') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.55)'
        ctx.fillRect(0, 0, 32, 38)
      }
    }

    createTexture('player_stand', 32, 38, (ctx) => drawPlayer(ctx, 'stand'))
    createTexture('player_walk1', 32, 38, (ctx) => drawPlayer(ctx, 'walk1'))
    createTexture('player_walk2', 32, 38, (ctx) => drawPlayer(ctx, 'walk2'))
    createTexture('player_jump',  32, 38, (ctx) => drawPlayer(ctx, 'jump'))
    createTexture('player_hit',   32, 38, (ctx) => drawPlayer(ctx, 'hit'))

    // 2. Coin (Grade A+) (24x24)
    createTexture('coin', 24, 24, (ctx) => {
      // Golden circle
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.arc(12, 12, 10, 0, Math.PI * 2)
      ctx.fill()
      
      // Inside circle
      ctx.strokeStyle = '#ca8a04'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(12, 12, 8, 0, Math.PI * 2)
      ctx.stroke()

      // "A+" Text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('A+', 12, 12)
    })

    // 3. Gem (Diploma Scroll) (24x24)
    createTexture('gem', 24, 24, (ctx) => {
      // Draw shiny diploma scroll
      ctx.fillStyle = '#f8fafc' // white paper
      ctx.fillRect(4, 6, 16, 12)
      ctx.fillStyle = '#ef4444' // red ribbon tie
      ctx.fillRect(11, 6, 3, 12)
      ctx.strokeStyle = '#cbd5e1'
      ctx.strokeRect(4, 6, 16, 12)
    })

    // 4. Walker Enemy (Bug Assignment) (32x32)
    const drawBug = (ctx: CanvasRenderingContext2D, step: boolean) => {
      // Red body
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(8, 10, 16, 12)
      
      // Antennas
      ctx.strokeStyle = '#b91c1c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(10, 10)
      ctx.lineTo(6, 4)
      ctx.moveTo(22, 10)
      ctx.lineTo(26, 4)
      ctx.stroke()
      
      // Eyes
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(8, 12, 4, 4)
      ctx.fillRect(20, 12, 4, 4)
      ctx.fillStyle = '#000000'
      ctx.fillRect(8, 13, 2, 2)
      ctx.fillRect(22, 13, 2, 2)

      // Wobbly legs
      ctx.fillStyle = '#1e293b'
      if (step) {
        ctx.fillRect(6, 22, 3, 4)
        ctx.fillRect(13, 22, 3, 4)
        ctx.fillRect(20, 22, 3, 4)
      } else {
        ctx.fillRect(9, 22, 3, 4)
        ctx.fillRect(16, 22, 3, 4)
        ctx.fillRect(23, 22, 3, 4)
      }
    }
    createTexture('bug_walk1', 32, 32, (ctx) => drawBug(ctx, true))
    createTexture('bug_walk2', 32, 32, (ctx) => drawBug(ctx, false))

    // 5. Flying Enemy (Winged Final Exam) (32x32)
    const drawExam = (ctx: CanvasRenderingContext2D, wingUp: boolean) => {
      // Paper body
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(6, 8, 20, 16)
      ctx.strokeStyle = '#94a3b8'
      ctx.strokeRect(6, 8, 20, 16)
      
      // Horizontal lines on paper
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(8, 12)
      ctx.lineTo(24, 12)
      ctx.moveTo(8, 16)
      ctx.lineTo(24, 16)
      ctx.moveTo(8, 20)
      ctx.lineTo(20, 20)
      ctx.stroke()

      // Large Red F (Grade)
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 9px Arial'
      ctx.fillText('F', 20, 20)

      // Flapping wings
      ctx.fillStyle = '#cbd5e1'
      if (wingUp) {
        ctx.fillRect(0, 4, 6, 8)
        ctx.fillRect(26, 4, 6, 8)
      } else {
        ctx.fillRect(0, 12, 6, 8)
        ctx.fillRect(26, 12, 6, 8)
      }
    }
    createTexture('exam_wing1', 32, 32, (ctx) => drawExam(ctx, true))
    createTexture('exam_wing2', 32, 32, (ctx) => drawExam(ctx, false))

    // 6. Spikes (Deadline Trap) (32x32)
    createTexture('spikes', 32, 32, (ctx) => {
      ctx.fillStyle = '#64748b'
      // Draw 3 spikes
      for (let i = 0; i < 3; i++) {
        const x = i * 10 + 2
        ctx.beginPath()
        ctx.moveTo(x, 32)
        ctx.lineTo(x + 5, 8)
        ctx.lineTo(x + 10, 32)
        ctx.fill()
      }
      // Base plate
      ctx.fillStyle = '#475569'
      ctx.fillRect(0, 30, 32, 2)
    })

    // 7. Graduation Gate Flag (Graduation Podium) (48x80)
    createTexture('gate', 48, 80, (ctx) => {
      // Podium Base
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 68, 48, 12)
      ctx.fillStyle = '#475569'
      ctx.fillRect(6, 60, 36, 8)

      // Flagpole
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(21, 10, 6, 50)
      
      // Golden Cap ornament
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(24, 8, 5, 0, Math.PI*2)
      ctx.fill()

      // Large velvet red banner
      ctx.fillStyle = '#991b1b'
      ctx.fillRect(27, 14, 21, 24)
      
      // Gold tassel symbol on banner
      ctx.fillStyle = '#f59e0b'
      ctx.fillRect(36, 18, 4, 16)
    })

    // 8. Power-ups
    // Shield (Coffee) (24x24)
    createTexture('p_shield', 24, 24, (ctx) => {
      ctx.fillStyle = '#d97706' // Coffee brown cup
      ctx.fillRect(4, 8, 14, 12)
      // Cup handle
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(17, 14, 4, -Math.PI/2, Math.PI/2)
      ctx.stroke()
      // Cup lid (White cream)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(3, 5, 16, 3)
    })

    // Speed Boost (Energy Can) (24x24)
    createTexture('p_speed', 24, 24, (ctx) => {
      ctx.fillStyle = '#22c55e' // Bright green can
      ctx.fillRect(6, 4, 12, 16)
      // Lightning bolt icon on can
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.moveTo(12, 6)
      ctx.lineTo(8, 12)
      ctx.lineTo(11, 12)
      ctx.lineTo(10, 18)
      ctx.lineTo(15, 11)
      ctx.lineTo(12, 11)
      ctx.fill()
    })

    // Magnet (Scholarship Magnet) (24x24)
    createTexture('p_magnet', 24, 24, (ctx) => {
      // Red horseshoe magnet
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(12, 14, 6, Math.PI, 0, false)
      ctx.stroke()
      // Metal tips
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(6, 14, 4, 4)
      ctx.fillRect(14, 14, 4, 4)
    })

    // 9. Floor Block (128x60)
    createTexture('floor_block', 128, 60, (ctx) => {
      ctx.fillStyle = '#3b82f6' // Blue retro blocks
      ctx.fillRect(0, 0, 128, 60)
      ctx.strokeStyle = '#1d4ed8'
      ctx.lineWidth = 4
      ctx.strokeRect(0, 0, 128, 60)
    })

    // 10. Platform Block (128x20)
    createTexture('platform_block', 128, 20, (ctx) => {
      ctx.fillStyle = '#8b5cf6' // Purple theme
      ctx.fillRect(0, 0, 128, 20)
      ctx.strokeStyle = '#6d28d9'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, 128, 20)
    })

    // 11. Moving Platform Block (128x20)
    createTexture('moving_platform_block', 128, 20, (ctx) => {
      ctx.fillStyle = '#ec4899' // Pink theme
      ctx.fillRect(0, 0, 128, 20)
      ctx.strokeStyle = '#db2777'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, 128, 20)
    })

    // 12. Kaizo Block (Troll Face) (128x20)
    createTexture('kaizo_block', 128, 20, (ctx) => {
      ctx.fillStyle = '#ef4444' // Red Troll Block
      ctx.fillRect(0, 0, 128, 20)
      ctx.strokeStyle = '#991b1b'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, 128, 20)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px Arial'
      ctx.fillText('TROLL', 45, 14)
    })

    // 13. Fake Powerup (Poison Coffee) (24x24)
    createTexture('p_fake', 24, 24, (ctx) => {
      ctx.fillStyle = '#9333ea' // Purple poison cup
      ctx.fillRect(4, 8, 14, 12)
      ctx.strokeStyle = '#9333ea'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(17, 14, 4, -Math.PI/2, Math.PI/2)
      ctx.stroke()
      ctx.fillStyle = '#22c55e' // green toxic sludge lid
      ctx.fillRect(3, 5, 16, 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(9, 12, 4, 4) // skull eye
    })
  }

  // --- PHASER MAIN GAME SCENE ---
  class MainGameScene extends Phaser.Scene {
    player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    wasd!: any
    platforms!: Phaser.Physics.Arcade.StaticGroup
    movingPlatforms!: Phaser.Physics.Arcade.Group
    kaizoBlocks!: Phaser.Physics.Arcade.StaticGroup
    triggers!: Phaser.Physics.Arcade.StaticGroup
    coins!: Phaser.Physics.Arcade.StaticGroup
    gems!: Phaser.Physics.Arcade.StaticGroup
    powerups!: Phaser.Physics.Arcade.Group
    fakePowerups!: Phaser.Physics.Arcade.StaticGroup
    enemies!: Phaser.Physics.Arcade.Group
    spikes!: Phaser.Physics.Arcade.StaticGroup
    finishGate!: Phaser.Types.Physics.Arcade.ImageWithStaticBody
    
    // Game stats
    score = 0
    coinsCollected = 0
    kills = 0
    hearts = 9999
    deathCount = 0
    timeLeft = 9999 // Removed timer pressure
    timerEvent!: Phaser.Time.TimerEvent
    
    // Checkpoints
    spawnX = 80
    spawnY = 400
    
    // Invulnerability & Powerup states
    isInvulnerable = false
    activePowerup: 'shield' | 'speed' | 'magnet' | null = null
    powerupTimer = 0
    shieldBubble!: Phaser.GameObjects.Graphics
    trailGraphics!: Phaser.GameObjects.Graphics
    
    // Jump mechanics
    jumpCount = 0
    maxJumps = 2

    // Combo system
    comboCount = 0
    comboTimer = 0

    constructor() {
      super({ key: 'MainGameScene' })
    }

    preload() {
      generateTextures(this)
    }

    create() {
      const sceneWidth = 10000
      const sceneHeight = 600

      // Set physics bounds
      this.physics.world.setBounds(0, 0, sceneWidth, sceneHeight)
      this.physics.world.setBoundsCollision(true, true, true, false)
      this.cameras.main.setBounds(0, 0, sceneWidth, sceneHeight)

      // Background decorative retro grids (programmatically drawn)
      const grid = this.add.graphics()
      grid.lineStyle(1, 0x1e1e38, 0.4)
      for (let x = 0; x < sceneWidth; x += 40) {
        grid.lineBetween(x, 0, x, sceneHeight)
      }
      for (let y = 0; y < sceneHeight; y += 40) {
        grid.lineBetween(0, y, sceneWidth, y)
      }

      // Add simple visual gradient sky representation
      const sky = this.add.graphics()
      sky.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x1e1b4b, 1)
      sky.fillRect(0, 0, sceneWidth, sceneHeight)
      sky.depth = -2
      grid.depth = -1

      // 1. Create Animations
      if (!this.anims.exists('player_walk')) {
        this.anims.create({
          key: 'player_walk',
          frames: [{ key: 'player_walk1' }, { key: 'player_walk2' }],
          frameRate: 8,
          repeat: -1
        })
      }
      if (!this.anims.exists('bug_walk')) {
        this.anims.create({
          key: 'bug_walk',
          frames: [{ key: 'bug_walk1' }, { key: 'bug_walk2' }],
          frameRate: 6,
          repeat: -1
        })
      }
      if (!this.anims.exists('exam_fly')) {
        this.anims.create({
          key: 'exam_fly',
          frames: [{ key: 'exam_wing1' }, { key: 'exam_wing2' }],
          frameRate: 8,
          repeat: -1
        })
      }

      // 2. Initialize Groups
      this.platforms = this.physics.add.staticGroup()
      this.movingPlatforms = this.physics.add.group({ allowGravity: false, immovable: true })
      this.kaizoBlocks = this.physics.add.staticGroup()
      this.triggers = this.physics.add.staticGroup()
      this.coins = this.physics.add.staticGroup()
      this.gems = this.physics.add.staticGroup()
      this.powerups = this.physics.add.group({ allowGravity: false, immovable: true })
      this.fakePowerups = this.physics.add.staticGroup()
      this.enemies = this.physics.add.group()
      this.spikes = this.physics.add.staticGroup()

      // 3. Level Procedural Placement Grid (Troll layout)
      for (let x = 0; x < sceneWidth; x += 128) {
        // TROLL PITS (Very frequent)
        if ((x >= 800 && x < 1200) || (x >= 1800 && x < 2400) || (x >= 3000 && x < 3600) || 
            (x >= 4200 && x < 4800) || (x >= 5400 && x < 6000) || (x >= 6600 && x < 7200) || 
            (x >= 7800 && x < 8400) || (x >= 9000 && x < 9400)) {
          continue
        }
        this.platforms.create(x + 64, 570, 'floor_block')
      }

      const addPlatform = (x: number, y: number, w: number, h: number = 20) => {
        const plat = this.platforms.create(x + w / 2, y + h / 2, 'platform_block') as Phaser.Physics.Arcade.Sprite
        plat.setDisplaySize(w, h); plat.refreshBody(); return plat
      }

      // Gauntlet 1
      addPlatform(200, 440, 100)
      this.kaizoBlocks.create(350, 360, 'kaizo_block').setAlpha(0) // Troll block 1
      addPlatform(520, 380, 100)
      this.kaizoBlocks.create(750, 420, 'kaizo_block').setAlpha(0) // Blocks pit jump
      
      const mp1 = this.movingPlatforms.create(1000, 460, 'moving_platform_block') as any
      mp1.setDisplaySize(100, 20); mp1.setData('startX', 800); mp1.setData('endX', 1200); mp1.setData('speed', 2); mp1.body.setFriction(1, 0)
      this.spikes.create(1000, 440, 'spikes') // Spike on moving platform!

      // Gauntlet 2
      addPlatform(1400, 400, 140)
      this.fakePowerups.create(1450, 370, 'p_fake').setData('type', 'poison')
      this.coins.create(1500, 280, 'coin')
      this.kaizoBlocks.create(1500, 340, 'kaizo_block').setAlpha(0) // Under the coin

      addPlatform(1600, 320, 120)
      this.spikes.create(1650, 300, 'spikes') // Hidden spike on platform

      // Trigger zone for dropping enemies
      const trigger1 = this.triggers.create(1400, 300, null)
      trigger1.setSize(20, 400); trigger1.setData('triggered', false)
      trigger1.setData('onTrigger', () => {
         const enemy = this.enemies.create(1500, 50, 'bug_walk1')
         enemy.body.setGravityY(1000); enemy.setData('type', 'walker'); enemy.setData('speed', 150)
         enemy.setData('minX', 1400); enemy.setData('maxX', 1800); enemy.play('bug_walk')
      })

      // Checkpoints immediately after passing the voids
      const checkpointX = [1300, 2500, 3700, 4900, 6100, 7300, 8500, 9500]
      checkpointX.forEach(cx => {
        const cp = this.triggers.create(cx, 450, null).setAlpha(0)
        cp.setSize(20, 400); cp.setData('triggered', false)
        cp.setData('onTrigger', () => {
           this.spawnX = cx; this.spawnY = 400
           this.floatingText(cx, 400, 'CHECKPOINT!', '#fbbf24')
        })
      })

      // Anomaly 1: The Chasing Spike
      const chaseSpike = this.enemies.create(2200, 532, 'spikes')
      chaseSpike.body.setAllowGravity(false)
      chaseSpike.body.immovable = true
      const chaseTrigger = this.triggers.create(2000, 400, null).setAlpha(0)
      chaseTrigger.setSize(20, 400); chaseTrigger.setData('triggered', false)
      chaseTrigger.setData('onTrigger', () => {
         this.tweens.add({
           targets: chaseSpike, y: 450, duration: 150,
           onComplete: () => { chaseSpike.body.velocity.x = -350 } // shoot left at player!
         })
      })

      // Anomaly 2: The Falling Platform
      const fallPlat = this.platforms.create(4000, 350, 'platform_block') as any
      fallPlat.setDisplaySize(120, 20); fallPlat.refreshBody()
      const fallTrigger = this.triggers.create(4000, 330, null).setAlpha(0)
      fallTrigger.setSize(120, 40); fallTrigger.setData('triggered', false)
      fallTrigger.setData('onTrigger', () => {
         this.tweens.add({
           targets: fallPlat, y: 800, duration: 800, ease: 'Power2',
           onUpdate: () => fallPlat.refreshBody()
         })
      })

      // Anomaly 3: The Fake Goal
      const fakeGate = this.enemies.create(5000, 500, 'gate')
      fakeGate.body.setAllowGravity(false)
      fakeGate.setSize(30, 80)
      const gateTrigger = this.triggers.create(4850, 400, null).setAlpha(0)
      gateTrigger.setSize(20, 400); gateTrigger.setData('triggered', false)
      gateTrigger.setData('onTrigger', () => {
         fakeGate.body.velocity.x = -450 // gate charges at the player
         fakeGate.body.velocity.y = -200 // and jumps!
         this.floatingText(5000, 400, 'JUST KIDDING!', '#ef4444')
      })



      // Procedural Gauntlet for extreme length
      for(let tx = 2000; tx < 9500; tx += 250) {
        addPlatform(tx, Phaser.Math.Between(300, 450), 100)
        if (Math.random() > 0.5) {
          this.kaizoBlocks.create(tx + 50, Phaser.Math.Between(200, 400), 'kaizo_block').setAlpha(0)
        }
        if (Math.random() > 0.6) {
          this.spikes.create(tx + 20, 532, 'spikes')
        }
        if (Math.random() > 0.7) {
          const t = this.triggers.create(tx - 100, 300, null)
          t.setSize(20, 400); t.setData('triggered', false)
          t.setData('onTrigger', () => {
            const e = this.enemies.create(tx, 0, 'bug_walk1'); e.body.setGravityY(1000); e.setData('type', 'walker')
            e.setData('speed', 150); e.setData('minX', tx-200); e.setData('maxX', tx+200); e.play('bug_walk')
          })
        }
        if (Math.random() > 0.8) {
          this.fakePowerups.create(tx + 40, 280, 'p_fake')
        }
      }

      // 4. Create Graduation Gate (Flag) at end
      this.finishGate = this.physics.add.staticImage(9800, 500, 'gate')
      this.finishGate.setSize(30, 80)

      // 6. Spawn Student Player
      this.player = this.physics.add.sprite(80, 450, 'player_stand')
      this.player.setCollideWorldBounds(true)
      this.player.setBounce(0.0)
      this.player.body.setGravityY(1100) // Realistic heavy jump
      this.player.setSize(22, 30) // Tighter collision box

      // 7. Physics Colliders
      this.physics.add.collider(this.player, this.platforms)
      this.physics.add.collider(this.player, this.movingPlatforms)
      this.physics.add.collider(this.enemies, this.platforms)
      this.physics.add.collider(this.enemies, this.movingPlatforms)

      // Kaizo Block special collider logic
      this.physics.add.collider(this.player, this.kaizoBlocks, undefined, (p: any, b: any) => {
        if (b.alpha === 0) {
          // If hit from bottom while jumping up
          if (p.body.velocity.y < 0 && p.y > b.y + 5) {
            b.setAlpha(1)
            playSfx('damage') // Troll sound
            return true
          }
          return false
        }
        return true
      }, this)

      // Overlap triggers
      this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this)
      this.physics.add.overlap(this.player, this.gems, this.collectGem, undefined, this)
      this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, undefined, this)
      this.physics.add.overlap(this.player, this.fakePowerups, this.handleSpikeCollision, undefined, this) // Fake powerup kills
      this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this)
      this.physics.add.overlap(this.player, this.spikes, this.handleSpikeCollision, undefined, this)
      this.physics.add.overlap(this.player, this.finishGate, this.handleVictory, undefined, this)
      
      this.physics.add.overlap(this.player, this.triggers, (p: any, t: any) => {
        if (!t.getData('triggered')) {
          t.setData('triggered', true)
          const fn = t.getData('onTrigger')
          if (fn) fn()
        }
      }, undefined, this)

      // 8. Keyboards & Inputs
      this.cursors = this.input.keyboard!.createCursorKeys()
      this.wasd = this.input.keyboard!.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE
      })

      // Camera follow
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
      this.cameras.main.setLerp(0.1, 0.1)
      this.cameras.main.setFollowOffset(0, 50)

      // 9. Timer & Combos ticks
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: this.updateTimer,
        callbackScope: this,
        loop: true
      })

      // Graphics overlays for Shield / Trails
      this.shieldBubble = this.add.graphics()
      this.shieldBubble.depth = 10
      this.trailGraphics = this.add.graphics()
      this.trailGraphics.depth = -0.5

      // Push initial HUD state to Vue
      this.pushHud()
    }

    // --- GAMEPLAY TRIGGERS & LOGIC ---

    update(time: number, delta: number) {
      const onGround = this.player.body.blocked.down || this.player.body.touching.down
      const runSpeed = this.activePowerup === 'speed' ? 360 : 240

      if (onGround) {
        this.jumpCount = 0
      }

      // Horizontal controls
      if (this.cursors.left.isDown || this.wasd.left.isDown || (this.game as any).mobileLeft) {
        this.player.setVelocityX(-runSpeed)
        this.player.setFlipX(true)
        if (onGround) this.player.play('player_walk', true)
      } else if (this.cursors.right.isDown || this.wasd.right.isDown || (this.game as any).mobileRight) {
        this.player.setVelocityX(runSpeed)
        this.player.setFlipX(false)
        if (onGround) this.player.play('player_walk', true)
      } else {
        this.player.setVelocityX(0)
        if (onGround) {
          this.player.setTexture('player_stand')
        }
      }

      // Air animation
      if (!onGround) {
        this.player.setTexture('player_jump')
      }

      // Jump control (Aims to support clean double jumping)
      const justJumped = Phaser.Input.Keyboard.JustDown(this.cursors.space) || 
                         Phaser.Input.Keyboard.JustDown(this.wasd.space) ||
                         (this.game as any).mobileJumpTriggered

      if (justJumped) {
        if (onGround) {
          // First jump
          this.player.setVelocityY(-450)
          this.jumpCount = 1
          playSfx('jump')
          this.spawnDust()
        } else if (this.jumpCount < this.maxJumps) {
          // Double jump
          this.player.setVelocityY(-420)
          this.jumpCount++
          playSfx('jump')
          this.spawnDust()
          this.score += 50 // small style point
          this.pushHud()
        }
      }

      // Clear mobile jump trigger once consumed
      if ((this.game as any).mobileJumpTriggered) {
        (this.game as any).mobileJumpTriggered = false
      }

      // Out of bounds pit check
      if (this.player.y > 600) {
        this.takeDamage(true) // Instant death from pit
      }

      // Moving Platforms logic
      this.movingPlatforms.getChildren().forEach((child: any) => {
        if (!child) return
        
        const isPlayerRiding = (
          this.player.body.bottom >= child.body.top - 5 &&
          this.player.body.bottom <= child.body.top + 5 &&
          this.player.body.right > child.body.left &&
          this.player.body.left < child.body.right &&
          this.player.body.velocity.y >= 0
        )

        // Horizontal movement
        if (child.getData('startX') !== undefined) {
          const start = child.getData('startX')
          const end = child.getData('endX')
          const speed = child.getData('speed')
          
          child.x += speed
          if (isPlayerRiding) {
            this.player.x += speed
          }

          if (child.x >= end) {
            child.setData('speed', -Math.abs(speed))
          } else if (child.x <= start) {
            child.setData('speed', Math.abs(speed))
          }
        }
        // Vertical movement
        if (child.getData('startY') !== undefined) {
          const start = child.getData('startY')
          const end = child.getData('endY')
          const dir = child.getData('direction')
          const speed = child.getData('speed')
          
          child.y += speed * dir
          if (isPlayerRiding) {
            this.player.y += speed * dir
          }

          if (child.y >= end) {
            child.setData('direction', -1)
          } else if (child.y <= start) {
            child.setData('direction', 1)
          }
        }
      })

      // Enemy Patrol and AI
      this.enemies.getChildren().forEach((enemy: any) => {
        if (!enemy) return

        if (enemy.getData('type') === 'walker') {
          const minX = enemy.getData('minX')
          const maxX = enemy.getData('maxX')
          const speed = enemy.getData('speed')

          enemy.setVelocityX(speed)

          if (enemy.x >= maxX && speed > 0) {
            enemy.setData('speed', -Math.abs(speed))
            enemy.setFlipX(true)
          } else if (enemy.x <= minX && speed < 0) {
            enemy.setData('speed', Math.abs(speed))
            enemy.setFlipX(false)
          }
        } else if (enemy.getData('type') === 'flyer') {
          const startY = enemy.getData('startY')
          const rangeY = enemy.getData('rangeY')
          const speedX = enemy.getData('speedX')

          // Sinus wave flight
          enemy.x += speedX * (delta / 1000)
          enemy.y = startY + Math.sin(time / 200) * rangeY

          // Wrap flyer horizontal positions
          if (enemy.x < -50) {
            enemy.x = 3650
          }
        }
      })

      // Coin Magnet power-up logic
      if (this.activePowerup === 'magnet') {
        const magnetRadius = 150
        this.coins.getChildren().forEach((coin: any) => {
          if (!coin) return
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, coin.x, coin.y)
          if (dist < magnetRadius) {
            // Disable static body and slide coin to player
            if (coin.body.enable) {
              coin.body.enable = false // convert static to dynamic slide
            }
            const angle = Phaser.Math.Angle.Between(coin.x, coin.y, this.player.x, this.player.y)
            coin.x += Math.cos(angle) * 8
            coin.y += Math.sin(angle) * 8
            
            // Check manual overlap triggers since body is disabled
            if (dist < 20) {
              this.collectCoin(this.player, coin)
            }
          }
        })
      }

      // Render power-up visual helpers
      this.renderPowerupEffects()

      // Handle powerup timers
      if (this.activePowerup) {
        this.powerupTimer -= delta
        if (this.powerupTimer <= 0) {
          this.activePowerup = null
          this.pushHud()
        } else {
          this.pushHud()
        }
      }

      // Combo timers
      if (this.comboTimer > 0) {
        this.comboTimer -= delta
        if (this.comboTimer <= 0) {
          this.comboCount = 0
        }
      }
    }

    // --- GAME UTILITIES ---

    collectCoin(player: any, coin: any) {
      coin.destroy()
      playSfx('coin')
      this.coinsCollected++
      this.score += 100
      
      // Floating score particle text
      this.floatingText(coin.x, coin.y - 10, '+100', '#f59e0b')
      this.pushHud()
    }

    collectGem(player: any, gem: any) {
      gem.destroy()
      playSfx('powerup')
      this.score += 500
      this.floatingText(gem.x, gem.y - 10, '+500 DIPLOMA!', '#ef4444')
      this.pushHud()
    }

    collectPowerup(player: any, pUp: any) {
      const type = pUp.getData('type')
      pUp.destroy()
      playSfx('powerup')

      this.activePowerup = type
      this.powerupTimer = 8000 // 8 seconds active
      
      let label = ''
      let color = ''
      if (type === 'shield') { label = 'COFFEE SHIELD!'; color = '#d97706' }
      if (type === 'speed') { label = 'ENERGY RUSH!'; color = '#22c55e' }
      if (type === 'magnet') { label = 'GRADE MAGNET!'; color = '#a855f7' }

      this.floatingText(pUp.x, pUp.y - 15, label, color)
      this.pushHud()
    }

    handleEnemyCollision(player: any, enemy: any) {
      // Check if stomping (player is landing downwards onto the enemy)
      const playerFalling = player.body.velocity.y > 0
      const isAbove = player.y < enemy.y - 12
      
      if (playerFalling && isAbove) {
        // Bounce player
        player.setVelocityY(-350)
        this.jumpCount = 1
        
        // Defeat enemy
        enemy.destroy()
        playSfx('jump') // bounce sfx
        this.kills++
        this.comboCount++
        this.comboTimer = 2500 // 2.5 seconds to chain combo

        // Combo score logic: 200 base score + (combo * 50 bonus)
        const comboBonus = (this.comboCount - 1) * 50
        const points = 200 + comboBonus
        this.score += points
        
        this.floatingText(enemy.x, enemy.y - 10, `+${points} STOMP! ${this.comboCount > 1 ? `x${this.comboCount}` : ''}`, '#22c55e')
        this.pushHud()
      } else {
        // Take normal damage
        this.takeDamage()
      }
    }

    handleSpikeCollision(player: any, spike: any) {
      this.takeDamage()
    }

    takeDamage(instantDeath = false) {
      if (this.isInvulnerable && !instantDeath) return

      // Handle shield power-up absorption
      if (this.activePowerup === 'shield' && !instantDeath) {
        this.activePowerup = null
        this.isInvulnerable = true
        this.player.play('player_hit')
        playSfx('damage')
        this.cameras.main.shake(150, 0.015)
        
        this.time.delayedCall(1000, () => {
          this.isInvulnerable = false
          this.player.setTexture('player_stand')
        })
        
        this.floatingText(this.player.x, this.player.y - 20, 'SHIELD BROKEN!', '#ef4444')
        this.pushHud()
        return
      }

      // Troll damage/death
      this.deathCount++
      this.score = Math.max(0, this.score - 500)
      playSfx('damage')
      this.cameras.main.shake(200, 0.02)

      // Respawn at the checkpoint for true kaizo experience
      this.player.setVelocity(0, 0)
      this.player.x = this.spawnX
      this.player.y = this.spawnY
      
      this.isInvulnerable = true
      this.player.play('player_hit')
      
      this.time.delayedCall(1000, () => {
        this.isInvulnerable = false
        this.player.setTexture('player_stand')
      })
      
      this.floatingText(this.player.x, this.player.y - 20, 'DEATHS: ' + this.deathCount, '#ef4444')
      this.pushHud()
    }

    handleVictory() {
      // Completed level
      this.timerEvent.destroy()
      this.player.setVelocity(0)
      this.player.body.setEnable(false)
      
      playSfx('victory')

      // Calculate final scores
      const remainingTime = this.timeLeft
      const completionBonus = 2000
      const timeBonus = remainingTime * 50
      this.score += completionBonus + timeBonus
      this.pushHud()

      this.floatingText(this.player.x, this.player.y - 20, 'GRADUATED!', '#fbbf24')

      // Sparkly celebration tween
      this.tweens.add({
        targets: this.player,
        scaleX: 1.5,
        scaleY: 1.5,
        angle: 360,
        duration: 1200,
        onComplete: () => {
          emit('game-over', {
            score: this.score,
            time: 120 - this.timeLeft,
            coins: this.coinsCollected,
            kills: this.kills,
            completed: true
          })
        }
      })
    }

    updateTimer() {
      this.timeLeft--
      if (this.timeLeft <= 0) {
        this.timeLeft = 0
        this.takeDamage(true) // timeout results in death
      }
      this.pushHud()
    }

    // Emits statistics up to Vue for reactive display
    pushHud() {
      emit('update-hud', {
        hearts: this.hearts,
        score: this.score,
        coins: this.coinsCollected,
        timeRemaining: this.timeLeft,
        activePowerup: this.activePowerup,
        powerupTimeLeft: Math.max(0, Math.ceil(this.powerupTimer / 1000))
      })
    }

    // Dynamic visual styling overlays
    renderPowerupEffects() {
      this.shieldBubble.clear()
      this.trailGraphics.clear()

      if (this.activePowerup === 'shield') {
        // Glowing cyan shield overlay
        this.shieldBubble.fillStyle(0x06b6d4, 0.2)
        this.shieldBubble.lineStyle(1.5, 0x06b6d4, 0.8)
        this.shieldBubble.fillCircle(this.player.x, this.player.y, 22)
        this.shieldBubble.strokeCircle(this.player.x, this.player.y, 22)
      }

      if (this.activePowerup === 'speed') {
        // Green shadow trail effects
        this.trailGraphics.fillStyle(0x22c55e, 0.4)
        this.trailGraphics.fillRect(this.player.x - 12 - (this.player.body.velocity.x * 0.05), this.player.y - 15, 24, 30)
        this.trailGraphics.fillStyle(0x22c55e, 0.15)
        this.trailGraphics.fillRect(this.player.x - 12 - (this.player.body.velocity.x * 0.1), this.player.y - 15, 24, 30)
      }
    }

    // Floating text particle effects
    floatingText(x: number, y: number, text: string, color: string) {
      const ft = this.add.text(x, y, text, {
        fontFamily: '"Press Start 2P"',
        fontSize: '9px',
        color: color,
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5)

      this.tweens.add({
        targets: ft,
        y: y - 40,
        alpha: 0,
        duration: 1000,
        onComplete: () => ft.destroy()
      })
    }

    spawnDust() {
      for (let i = 0; i < 5; i++) {
        const dust = this.add.circle(this.player.x, this.player.y + 15, 3, 0xe2e8f0, 0.7)
        this.physics.add.existing(dust)
        const dBody = dust.body as Phaser.Physics.Arcade.Body
        dBody.setAllowGravity(false)
        dBody.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-20, -50))
        
        this.tweens.add({
          targets: dust,
          alpha: 0,
          scale: 0.2,
          duration: 400,
          onComplete: () => dust.destroy()
        })
      }
    }
  }

  // --- START PHASER APPLICATION INSTANCE ---
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: phaserContainer.value,
    width: Math.min(window.innerWidth - 32, 900),
    height: 520,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 300 },
        debug: false
      }
    },
    scene: [MainGameScene]
  }

  gameInstance = new Phaser.Game(config)

  // Listen to window resizing to keep game canvas centered
  const handleResize = () => {
    if (gameInstance) {
      gameInstance.scale.resize(Math.min(window.innerWidth - 32, 900), 520)
    }
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
})

// Mobile inputs bridges to update Phaser globally
const triggerMobileLeft = (val: boolean) => {
  if (gameInstance) {
    const scene = gameInstance.scene.getScene('MainGameScene')
    if (scene) {
      (gameInstance as any).mobileLeft = val
    }
  }
}

const triggerMobileRight = (val: boolean) => {
  if (gameInstance) {
    const scene = gameInstance.scene.getScene('MainGameScene')
    if (scene) {
      (gameInstance as any).mobileRight = val
    }
  }
}

const triggerMobileJump = () => {
  if (gameInstance) {
    const scene = gameInstance.scene.getScene('MainGameScene')
    if (scene) {
      (gameInstance as any).mobileJumpTriggered = true
    }
  }
}

defineExpose({
  triggerMobileLeft,
  triggerMobileRight,
  triggerMobileJump
})
</script>

<template>
  <div class="flex flex-col items-center select-none w-full relative">
    <!-- Game Viewport Frame -->
    <div
      ref="phaserContainer"
      class="border-4 border-slate-700 bg-slate-900 shadow-2xl rounded-2xl overflow-hidden max-w-full border-glow-purple"
    ></div>

    <!-- The troll surrender button -->
    <button
      class="fixed z-50 bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg border-2 border-red-800 transition-all duration-100 ease-in-out hover:bg-red-500 active:bg-red-700 font-mono text-sm"
      :style="{ top: surrenderBtnTop + 'px', left: surrenderBtnLeft + 'px' }"
      @mouseover="moveSurrenderBtn"
      @click.prevent="moveSurrenderBtn"
    >
      Surrender
    </button>
  </div>
</template>

<style scoped>
/* Canvas wrapper styling updates */
canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
  margin: 0 auto;
}
</style>
