import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { amount, reason, employeeId, date, status } = req.body;
      const newAdvance = await prisma.cashAdvance.create({
        data: {
          amount: parseFloat(amount),
          reason,
          employeeId,
          date: new Date(date),
          status: status || 'Pending'
        }
      });
      return res.status(201).json(newAdvance);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating cash advance' });
    }
  }

  if (req.method === 'GET') {
    const advances = await prisma.cashAdvance.findMany({
      orderBy: { date: 'desc' }
    });
    return res.status(200).json(advances);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
