import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg

let prisma: PrismaClient | null = null

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | null
}

try {
  if (globalForPrisma.prisma !== undefined) {
    prisma = globalForPrisma.prisma
  } else {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      console.warn('[Prisma] DATABASE_URL environment variable is not defined. Database features will fall back to in-memory mode.')
    } else {
      const pool = new Pool({ connectionString })
      const adapter = new PrismaPg(pool)
      prisma = new PrismaClient({ adapter })
      
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = prisma
      }
    }
  }
} catch (e) {
  console.error('[Prisma] Failed to initialize Prisma Client:', e)
}

export { prisma }
export default prisma
