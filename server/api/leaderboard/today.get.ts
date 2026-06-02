import { dbService } from '../../services/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50

    const leaderboardToday = await dbService.getLeaderboardToday(limit)

    return {
      success: true,
      data: leaderboardToday
    }
  } catch (error: any) {
    console.error('[API] Error in GET /api/leaderboard/today:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})
