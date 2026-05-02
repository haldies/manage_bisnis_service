import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const data = req.body;
      const updated = await prisma.cashAdvance.update({
        where: { id: String(id) },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
          amount: data.amount ? parseFloat(data.amount) : undefined,
        }
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating cash advance' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
