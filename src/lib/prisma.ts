import { PrismaClient } from '../../prisma/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = global as unknown as { prismaV9: PrismaClient }

export const prisma = globalForPrisma.prismaV9 || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaV9 = prisma
