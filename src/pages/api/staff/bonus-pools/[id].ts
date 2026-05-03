import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid id' });
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.bonusPool.delete({ where: { id } });
      return res.status(200).json({ message: 'Deleted' });
    } catch (error) {
      console.error('Error deleting bonus pool:', error);
      return res.status(500).json({ message: 'Error deleting bonus pool' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
