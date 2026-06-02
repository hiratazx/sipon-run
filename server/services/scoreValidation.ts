import crypto from 'crypto'

export interface ScoreSubmission {
  name: string
  score: number
  time: number
  coins: number
  kills: number
  token?: string
}

const MAX_COINS = 80       // Max grades placed in the level
const MAX_ENEMIES = 30     // Max exam/task enemies spawned
const MIN_PLAY_TIME = 10   // Minimum physical seconds to speedrun the level
const MAX_PLAY_TIME = 300  // Maximum seconds (5 minutes)
const LEVEL_TIME_LIMIT = 120 // Game clock starts at 120 seconds

export const scoreValidationService = {
  validateScore(payload: ScoreSubmission): { isValid: boolean; reason?: string } {
    const { name, score, time, coins, kills, token } = payload

    // 1. Basic Type and Null Checks
    if (typeof name !== 'string' || name.trim().length === 0) {
      return { isValid: false, reason: 'Invalid or missing name.' }
    }
    if (name.length > 20) {
      return { isValid: false, reason: 'Name must be 20 characters or less.' }
    }
    if (
      typeof score !== 'number' ||
      typeof time !== 'number' ||
      typeof coins !== 'number' ||
      typeof kills !== 'number'
    ) {
      return { isValid: false, reason: 'Score, time, coins, and kills must be numbers.' }
    }

    // 2. Range Checks
    if (score < 0 || time < 0 || coins < 0 || kills < 0) {
      return { isValid: false, reason: 'Values cannot be negative.' }
    }

    // 3. Physical Gameplay Bounds Checks
    if (time < MIN_PLAY_TIME) {
      return { isValid: false, reason: `Impossible completion time: ${time}s.` }
    }
    if (time > MAX_PLAY_TIME) {
      return { isValid: false, reason: 'Game took too long (timed out).' }
    }
    if (coins > MAX_COINS) {
      return { isValid: false, reason: `Impossible number of coins collected: ${coins}.` }
    }
    if (kills > MAX_ENEMIES) {
      return { isValid: false, reason: `Impossible number of enemy kills: ${kills}.` }
    }

    // 4. Mathematical Limit Checks
    // Max theoretical score logic:
    // - Coins: 100 pts each
    // - Gems: 500 pts each (let's assume max 10 gems in the world) -> 5,000 pts
    // - Kills: 200 pts each
    // - Completion: 2,000 pts
    // - Time Bonus: (120 - time) * 50 pts
    // - Combo Multiplier buffer (let's say combo adds up to 5,000 pts maximum)
    const timeBonus = Math.max(0, LEVEL_TIME_LIMIT - time) * 50
    const maxTheoreticalScore = 
      (coins * 100) + 
      (10 * 500) + 
      (kills * 200) + 
      2000 + 
      timeBonus + 
      5000 // combo buffer

    if (score > maxTheoreticalScore) {
      return { isValid: false, reason: `Score is mathematically impossible (${score} > ${maxTheoreticalScore}).` }
    }

    // 5. Cryptographic Anti-Cheat Token Validation
    const salt = process.env.SCORE_SECRET_SALT || 'progress-run-exhibition-secret-salt-2026'
    
    // We construct the raw string to hash in the exact same way as the client
    const rawPayload = `${name.trim()}:${score}:${time}:${coins}:${kills}`
    const expectedHash = crypto
      .createHmac('sha256', salt)
      .update(rawPayload)
      .digest('hex')

    if (!token || token !== expectedHash) {
      console.warn(`[Anti-Cheat] Token mismatch. Expected: ${expectedHash}, Received: ${token}`)
      return { isValid: false, reason: 'Anti-cheat integrity verification failed.' }
    }

    return { isValid: true }
  }
}
