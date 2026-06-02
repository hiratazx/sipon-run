import { prisma } from '../utils/prisma'

export interface ScoreInput {
  name: string
  score: number
  time: number
  coins: number
  kills: number
}

export interface ScoreRecord extends ScoreInput {
  id: number
  createdAt: Date
}

// In-Memory Database Fallback (only used if PostgreSQL is unavailable)
let inMemoryScores: ScoreRecord[] = []
let scoreIdCounter = 1
let useInMemory = false

// Helper to determine if we should fall back to memory
async function checkDatabaseAvailable(): Promise<boolean> {
  if (!prisma) {
    useInMemory = true
    return false
  }
  if (useInMemory) return false
  try {
    // Quick probe to check connection
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.warn('[Database] PostgreSQL connection failed. Falling back to In-Memory storage mode.', error)
    useInMemory = true
    return false
  }
}

export const dbService = {
  async saveScore(data: ScoreInput): Promise<ScoreRecord> {
    const isDbAvailable = await checkDatabaseAvailable()

    if (isDbAvailable && prisma) {
      try {
        const record = await prisma.score.create({
          data: {
            name: data.name,
            score: data.score,
            time: data.time,
            coins: data.coins,
            kills: data.kills
          }
        })
        return record
      } catch (error) {
        console.error('[Database] Error saving score with Prisma, falling back to memory:', error)
      }
    }

    // Memory save
    const newRecord: ScoreRecord = {
      id: scoreIdCounter++,
      ...data,
      createdAt: new Date()
    }
    inMemoryScores.push(newRecord)
    // Keep memory sorted for convenience
    inMemoryScores.sort((a, b) => b.score - a.score || a.time - b.time)
    return newRecord
  },

  async getLeaderboard(limit = 50): Promise<ScoreRecord[]> {
    const isDbAvailable = await checkDatabaseAvailable()

    if (isDbAvailable && prisma) {
      try {
        return await prisma.score.findMany({
          orderBy: [
            { score: 'desc' },
            { time: 'asc' }
          ],
          take: limit
        })
      } catch (error) {
        console.error('[Database] Error fetching leaderboard with Prisma, falling back to memory:', error)
      }
    }

    return inMemoryScores.slice(0, limit)
  },

  async getLeaderboardToday(limit = 50): Promise<ScoreRecord[]> {
    const isDbAvailable = await checkDatabaseAvailable()

    if (isDbAvailable && prisma) {
      try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        
        return await prisma.score.findMany({
          where: {
            createdAt: {
              gte: todayStart
            }
          },
          orderBy: [
            { score: 'desc' },
            { time: 'asc' }
          ],
          take: limit
        })
      } catch (error) {
        console.error('[Database] Error fetching today\'s leaderboard with Prisma, falling back to memory:', error)
      }
    }

    // Filter memory for today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return inMemoryScores
      .filter(s => s.createdAt.getTime() >= todayStart.getTime())
      .slice(0, limit)
  },

  async getRank(score: number, time: number): Promise<number> {
    const isDbAvailable = await checkDatabaseAvailable()

    if (isDbAvailable && prisma) {
      try {
        // Count how many scores are strictly better
        const betterCount = await prisma.score.count({
          where: {
            OR: [
              { score: { gt: score } },
              { score: score, time: { lt: time } }
            ]
          }
        })
        return betterCount + 1
      } catch (error) {
        console.error('[Database] Error counting rank, using memory approximation:', error)
      }
    }

    const betterInMemory = inMemoryScores.filter(s => s.score > score || (s.score === score && s.time < time))
    return betterInMemory.length + 1
  }
}
