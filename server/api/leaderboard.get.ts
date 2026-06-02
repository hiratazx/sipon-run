import { dbService } from '../services/db'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const limit = query.limit ? parseInt(query.limit as string, 10) : 50

    const leaderboard = await dbService.getLeaderboard(limit)

    return {
      success: true,
      data: leaderboard
    }
  } catch (error: any) {
    console.error('[API] Error in GET /api/leaderboard:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
})
