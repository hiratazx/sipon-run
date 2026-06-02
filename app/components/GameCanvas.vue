<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAudio } from '../composables/useAudio'

const props = withDefaults(defineProps<{
  playerName: string
  capColor?: string
  shirtColor?: string
  pantsColor?: string
}>(), {
  capColor: '#a855f7',
  shirtColor: '#06b6d4',
  pantsColor: '#334155'
})

const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt)
  const B = Math.max(0, (num & 0x0000ff) - amt)
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

const emit = defineEmits<{
  (e: 'game-over', stats: { score: number; time: number; coins: number; kills: number; completed: boolean }): void
  (e: 'update-hud', hud: { hearts: number; score: number; coins: number; timeRemaining: number; activePowerup: string | null; powerupTimeLeft: number }): void
}>()

const phaserContainer = ref<HTMLDivElement | null>(null)
let gameInstance: any = null
const { playSfx } = useAudio()

onMounted(async () => {
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

    // 1. Student Player Texture (32x32)
    // We create frames: stand, walk1, walk2, jump, hit
    const drawPlayer = (ctx: CanvasRenderingContext2D, frame: string) => {
      ctx.imageSmoothingEnabled = false
      
      const cap = props.capColor
      const visor = darkenColor(props.capColor, 20)
      const shirt = props.shirtColor
      const pants = props.pantsColor

      // Hair (Retro Brown Cap)
      ctx.fillStyle = cap
      ctx.fillRect(8, 2, 16, 6)
      ctx.fillStyle = visor
      ctx.fillRect(20, 5, 6, 2)
      
      // Face
      ctx.fillStyle = '#ffedd5' // Skin tone
      ctx.fillRect(8, 8, 14, 8)
      ctx.fillStyle = '#1e293b' // Eyes
      ctx.fillRect(16, 10, 2, 2)
      
      // Shirt / Torso
      ctx.fillStyle = shirt
      ctx.fillRect(6, 16, 18, 10)
      
      // Backpack
      ctx.fillStyle = '#f59e0b' // Amber backpack
      ctx.fillRect(3, 15, 4, 8)

      // Legs / Pants
      ctx.fillStyle = pants
      if (frame === 'walk1') {
        ctx.fillRect(6, 26, 4, 6)
        ctx.fillRect(16, 26, 4, 4) // leg up
      } else if (frame === 'walk2') {
        ctx.fillRect(8, 26, 4, 4)
        ctx.fillRect(18, 26, 4, 6) // leg up
      } else if (frame === 'jump') {
        ctx.fillRect(5, 25, 4, 4)
        ctx.fillRect(17, 25, 4, 4)
      } else { // stand / hit
        ctx.fillRect(7, 26, 4, 6)
        ctx.fillRect(17, 26, 4, 6)
      }

      // If hit, draw overlay flashing
      if (frame === 'hit') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'
        ctx.fillRect(0, 0, 32, 32)
      }
    }

    createTexture('player_stand', 32, 32, (ctx) => drawPlayer(ctx, 'stand'))
    createTexture('player_walk1', 32, 32, (ctx) => drawPlayer(ctx, 'walk1'))
    createTexture('player_walk2', 32, 32, (ctx) => drawPlayer(ctx, 'walk2'))
    createTexture('player_jump', 32, 32, (ctx) => drawPlayer(ctx, 'jump'))
    createTexture('player_hit', 32, 32, (ctx) => drawPlayer(ctx, 'hit'))

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
  }

  // --- PHASER MAIN GAME SCENE ---
  class MainGameScene extends Phaser.Scene {
    player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    wasd!: any
    platforms!: Phaser.Physics.Arcade.StaticGroup
    movingPlatforms!: Phaser.Physics.Arcade.Group
    coins!: Phaser.Physics.Arcade.StaticGroup
    gems!: Phaser.Physics.Arcade.StaticGroup
    powerups!: Phaser.Physics.Arcade.Group
    enemies!: Phaser.Physics.Arcade.Group
    spikes!: Phaser.Physics.Arcade.StaticGroup
    finishGate!: Phaser.Types.Physics.Arcade.ImageWithStaticBody
    
    // Game stats
    score = 0
    coinsCollected = 0
    kills = 0
    hearts = 3
    timeLeft = 120 // 120 seconds level time
    timerEvent!: Phaser.Time.TimerEvent
    
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
      const sceneWidth = 3600
      const sceneHeight = 600

      // Set physics bounds
      this.physics.world.setBounds(0, 0, sceneWidth, sceneHeight)
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
          frames: [
            { key: 'player_walk1' },
            { key: 'player_walk2' }
          ],
          frameRate: 8,
          repeat: -1
        })
      }
      if (!this.anims.exists('bug_walk')) {
        this.anims.create({
          key: 'bug_walk',
          frames: [
            { key: 'bug_walk1' },
            { key: 'bug_walk2' }
          ],
          frameRate: 6,
          repeat: -1
        })
      }
      if (!this.anims.exists('exam_fly')) {
        this.anims.create({
          key: 'exam_fly',
          frames: [
            { key: 'exam_wing1' },
            { key: 'exam_wing2' }
          ],
          frameRate: 8,
          repeat: -1
        })
      }

      // 2. Initialize Groups
      this.platforms = this.physics.add.staticGroup()
      this.movingPlatforms = this.physics.add.group({
        allowGravity: false,
        immovable: true
      })
      this.coins = this.physics.add.staticGroup()
      this.gems = this.physics.add.staticGroup()
      this.powerups = this.physics.add.group({
        allowGravity: false,
        immovable: true
      })
      this.enemies = this.physics.add.group()
      this.spikes = this.physics.add.staticGroup()

      // 3. Level Procedural Placement Grid
      // We divide the 3600px width into horizontal segments.
      // Floor is at height 540px.
      
      // Ground Platforms
      for (let x = 0; x < sceneWidth; x += 128) {
        // Pit falls at 800-950, 1600-1750, 2400-2550
        if ((x >= 800 && x < 960) || (x >= 1700 && x < 1900) || (x >= 2600 && x < 2800)) {
          continue
        }
        this.platforms.create(x + 64, 570, 'floor_block')
      }

      // Floating Platforms & Obstacles
      const addPlatform = (x: number, y: number, w: number, h: number = 20) => {
        const plat = this.platforms.create(x + w / 2, y + h / 2, 'platform_block') as Phaser.Physics.Arcade.Sprite
        plat.setDisplaySize(w, h)
        plat.refreshBody()
      }

      // Segment 1 (x: 0 - 800)
      addPlatform(200, 440, 100)
      addPlatform(350, 360, 120)
      addPlatform(520, 280, 100)
      addPlatform(680, 380, 80)
      
      // Coins in Segment 1
      this.coins.create(250, 400, 'coin')
      this.coins.create(410, 320, 'coin')
      this.coins.create(570, 240, 'coin')

      // Segment 2 (x: 800 - 1700) (Pit jump section)
      // Moving Platform over the first pit
      const mp1 = this.movingPlatforms.create(880, 460, 'moving_platform_block') as any
      mp1.setDisplaySize(100, 20)
      mp1.setData('startX', 800)
      mp1.setData('endX', 960)
      mp1.setData('speed', 1.5)
      mp1.body.setFriction(1, 0)
      
      addPlatform(1050, 400, 140)
      addPlatform(1250, 320, 120)
      addPlatform(1450, 420, 100)
      
      // Coins/Gems in Segment 2
      this.coins.create(1120, 360, 'coin')
      this.coins.create(1310, 280, 'coin')
      this.coins.create(1500, 380, 'coin')
      this.gems.create(1310, 220, 'gem') // Diploma

      // Spikes in Segment 2
      this.spikes.create(1120, 532, 'spikes')

      // Segment 3 (x: 1700 - 2600)
      // Moving platform vertical
      const mp2 = this.movingPlatforms.create(1800, 420, 'moving_platform_block') as any
      mp2.setDisplaySize(80, 20)
      mp2.setData('startY', 350)
      mp2.setData('endY', 500)
      mp2.setData('direction', 1)
      mp2.setData('speed', 1.2)
      
      addPlatform(1950, 320, 160)
      // Hidden block high up
      addPlatform(2150, 200, 60)
      addPlatform(2250, 320, 120)
      addPlatform(2420, 400, 100)

      this.coins.create(2030, 280, 'coin')
      this.coins.create(2180, 160, 'coin') // hidden coin
      this.coins.create(2310, 280, 'coin')
      this.gems.create(2180, 130, 'gem') // hidden diploma

      this.spikes.create(2030, 532, 'spikes')
      this.spikes.create(2310, 532, 'spikes')

      // Segment 4 (x: 2600 - 3600)
      // Moving horizontal platform
      const mp3 = this.movingPlatforms.create(2700, 420, 'moving_platform_block') as any
      mp3.setDisplaySize(90, 20)
      mp3.setData('startX', 2620)
      mp3.setData('endX', 2780)
      mp3.setData('speed', 1.8)

      addPlatform(2880, 380, 120)
      addPlatform(3050, 280, 140)
      addPlatform(3250, 400, 120)

      this.coins.create(2940, 340, 'coin')
      this.coins.create(3120, 240, 'coin')
      this.coins.create(3310, 360, 'coin')

      // Power-up locations
      // Shield (Coffee)
      this.powerups.create(600, 510, 'p_shield').setData('type', 'shield')
      // Speed Boost
      this.powerups.create(1450, 280, 'p_speed').setData('type', 'speed')
      // Magnet
      this.powerups.create(2250, 280, 'p_magnet').setData('type', 'magnet')

      // 4. Create Graduation Gate (Flag)
      this.finishGate = this.physics.add.staticImage(3450, 500, 'gate')
      this.finishGate.setSize(30, 80)

      // 5. Spawn Enemies (Bugs & Exams)
      const spawnWalker = (x: number, y: number, minX: number, maxX: number) => {
        const walker = this.enemies.create(x, y, 'bug_walk1')
        walker.setCollideWorldBounds(true)
        walker.setData('minX', minX)
        walker.setData('maxX', maxX)
        walker.setData('speed', 100)
        walker.setData('type', 'walker')
        walker.play('bug_walk')
        walker.body.setGravityY(600)
        return walker
      }

      const spawnFlyer = (x: number, y: number, rangeY: number) => {
        const flyer = this.enemies.create(x, y, 'exam_wing1')
        flyer.body.setAllowGravity(false)
        flyer.setData('startY', y)
        flyer.setData('rangeY', rangeY)
        flyer.setData('speedX', -80)
        flyer.setData('type', 'flyer')
        flyer.play('exam_fly')
        return flyer
      }

      // Walkers on ground/platforms
      spawnWalker(450, 500, 300, 600)
      spawnWalker(1120, 350, 1050, 1180)
      spawnWalker(1500, 350, 1450, 1540)
      spawnWalker(2030, 250, 1960, 2100)
      spawnWalker(2310, 250, 2260, 2360)
      spawnWalker(3120, 200, 3060, 3180)

      // Flyers in the air
      spawnFlyer(1000, 240, 60)
      spawnFlyer(1600, 200, 80)
      spawnFlyer(2500, 250, 70)
      spawnFlyer(2950, 180, 50)

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

      // Overlap triggers
      this.physics.add.overlap(this.player, this.coins, this.collectCoin, undefined, this)
      this.physics.add.overlap(this.player, this.gems, this.collectGem, undefined, this)
      this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, undefined, this)
      this.physics.add.overlap(this.player, this.enemies, this.handleEnemyCollision, undefined, this)
      this.physics.add.overlap(this.player, this.spikes, this.handleSpikeCollision, undefined, this)
      this.physics.add.overlap(this.player, this.finishGate, this.handleVictory, undefined, this)

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
        
        // Horizontal movement
        if (child.getData('startX') !== undefined) {
          const start = child.getData('startX')
          const end = child.getData('endX')
          const speed = child.getData('speed')
          
          child.x += speed
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

      // Normal damage
      this.hearts = instantDeath ? 0 : this.hearts - 1
      playSfx('damage')
      this.cameras.main.shake(200, 0.02)

      if (this.hearts <= 0) {
        // Game Over trigger
        this.timerEvent.destroy()
        this.player.setVelocity(0, 0)
        this.player.body.setEnable(false)
        playSfx('gameover')
        
        // Let player fall off screen
        this.tweens.add({
          targets: this.player,
          y: 650,
          angle: 180,
          duration: 800,
          onComplete: () => {
            emit('game-over', {
              score: this.score,
              time: 120 - this.timeLeft,
              coins: this.coinsCollected,
              kills: this.kills,
              completed: false
            })
          }
        })
      } else {
        // Temporary invulnerability
        this.isInvulnerable = true
        this.player.play('player_hit')
        
        // Bounce player back
        this.player.setVelocity(-150, -250)

        this.time.delayedCall(1000, () => {
          this.isInvulnerable = false
          this.player.setTexture('player_stand')
        })
      }
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
  <div class="flex flex-col items-center select-none w-full">
    <!-- Game Viewport Frame -->
    <div
      ref="phaserContainer"
      class="border-4 border-slate-700 bg-slate-900 shadow-2xl rounded-2xl overflow-hidden max-w-full border-glow-purple"
    ></div>
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
