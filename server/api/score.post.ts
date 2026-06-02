import { dbService } from '../services/db'
import { scoreValidationService } from '../services/scoreValidation'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Missing request body.'
      })
    }

    // Run anti-cheat verification
    const validation = scoreValidationService.validateScore(body)
    if (!validation.isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: `Anti-Cheat Violation: ${validation.reason}`
      })
    }

    // Save score
    const scoreRecord = await dbService.saveScore({
      name: body.name.trim(),
      score: body.score,
      time: body.time,
      coins: body.coins,
      kills: body.kills
    })

    // Get current rank for this score
    const rank = await dbService.getRank(scoreRecord.score, scoreRecord.time)

    return {
      success: true,
      data: {
        ...scoreRecord,
        rank
      }
    }
  } catch (error: any) {
    console.error('[API] Error in POST /api/score:', error)
    return createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal Server Error'
    })
  }
})
