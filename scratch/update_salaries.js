const { PrismaClient } = require('../prisma/generated/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const connectionString = "postgresql://postgres.odejolwlygfcjidvjzds:WDrtlZ8WZEET4oUC@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"; 
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding all staff salary data...');

  const staffData = [
    { email: 'admin@kasirai.com', salary: 7500000 },
    { email: 'dedi@kasirai.com', salary: 6000000 },
    { email: 'rudi@kasirai.com', salary: 6000000 },
    { email: 'siti@kasirai.com', salary: 4500000 },
    { email: 'ani@kasirai.com', salary: 4500000 },
    { email: 'ina@kasirai.com', salary: 4500000 },
    { email: 'agus@kasirai.com', salary: 5000000 },
    { email: 'iwan@kasirai.com', salary: 5000000 },
    { email: 'yanto@kasirai.com', salary: 5000000 },
    { email: 'budi@kasirai.com', salary: 6000000 },
  ];

  for (const s of staffData) {
    await prisma.user.updateMany({
      where: { email: s.email },
      data: { baseSalary: s.salary }
    });
  }

  console.log('Update completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
