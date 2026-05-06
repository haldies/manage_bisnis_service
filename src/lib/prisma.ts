import { PrismaClient } from '../../prisma/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL

const pool = new pg.Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 10000, // fail fast if can't connect in 10s
  allowExitOnIdle: false,     // keep pool alive between requests
})

const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prismaV9: PrismaClient }

export const prisma = globalForPrisma.prismaV9 || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaV9 = prisma
