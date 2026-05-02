import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
      await prisma.inventoryUnit.delete({
        where: { id: id as string }
      });
      return res.status(200).json({ message: 'Deleted' });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  }

  return res.status(405).end();
}
