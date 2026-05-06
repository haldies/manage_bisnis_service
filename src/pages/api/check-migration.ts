
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const count = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "Transaction" WHERE "source" = 'SERVICE'`);
  return res.status(200).json({ count });
}
