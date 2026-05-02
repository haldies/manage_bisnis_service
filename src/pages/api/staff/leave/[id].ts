import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const data = req.body;
      const updated = await prisma.leaveRequest.update({
        where: { id: String(id) },
        data: {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        }
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating leave request' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
