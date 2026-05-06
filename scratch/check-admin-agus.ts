
import { PrismaClient } from '../prisma/generated/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { username: 'admin' },
    include: { role: true }
  });
  const agus = await prisma.user.findFirst({
    where: { username: 'agus' },
    include: { role: true }
  });
  console.log('ADMIN:', JSON.stringify(admin, null, 2));
  console.log('AGUS:', JSON.stringify(agus, null, 2));
}

main().catch(console.error);
