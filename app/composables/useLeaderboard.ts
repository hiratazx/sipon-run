export interface ScoreInput {
  name: string
  score: number
  time: number
  coins: number
  kills: number
}

export interface ScoreRecord extends ScoreInput {
  id: string
  createdAt: string
}

const LOCAL_STORAGE_KEY = 'progress_run_leaderboard_scores'

// Default mock scores to prepopulate leaderboard if it's completely empty
const DEFAULT_SCORES: ScoreRecord[] = []

export function useLeaderboard() {
  const getScores = (): ScoreRecord[] => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!stored) {
        // Initialize with default scores if empty
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SCORES))
        return DEFAULT_SCORES
      }
      return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse local storage scores', e)
      return []
    }
  }

  const saveScoresList = (scores: ScoreRecord[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores))
    }
  }

  const getLeaderboard = (limit = 50): ScoreRecord[] => {
    const scores = getScores()
    // Sort logic: Sort by score (descending), then time (ascending)
    return scores
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, limit)
  }

  const getLeaderboardToday = (limit = 50): ScoreRecord[] => {
    const scores = getScores()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    return scores
      .filter(s => new Date(s.createdAt).getTime() >= todayStart.getTime())
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, limit)
  }

  const getRank = (score: number, time: number): number => {
    const scores = getScores()
    // Rank is the number of scores strictly better + 1
    const betterCount = scores.filter(
      s => s.score > score || (s.score === score && s.time < time)
    ).length
    return betterCount + 1
  }

  const saveScore = (data: ScoreInput): { record: ScoreRecord; rank: number } => {
    const scores = getScores()
    const newRecord: ScoreRecord = {
      id: 'score_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
      name: data.name.trim(),
      score: data.score,
      time: data.time,
      coins: data.coins,
      kills: data.kills,
      createdAt: new Date().toISOString()
    }

    scores.push(newRecord)
    saveScoresList(scores)

    const rank = getRank(data.score, data.time)
    return {
      record: newRecord,
      rank
    }
  }

  return {
    getLeaderboard,
    getLeaderboardToday,
    getRank,
    saveScore
  }
}
