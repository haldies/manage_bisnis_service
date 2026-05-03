import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const pools = await prisma.bonusPool.findMany({
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json(pools);
    } catch (error) {
      console.error('Error fetching bonus pools:', error);
      return res.status(500).json({ message: 'Error fetching bonus pools' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, amount, month, year, roleId, branchId, employeeId } = req.body;
      if (!name || amount == null || !month || !year) {
        return res.status(400).json({ message: 'name, amount, month, year are required' });
      }
      const pool = await prisma.bonusPool.create({
        data: {
          name,
          amount: Number(amount),
          month: Number(month),
          year: Number(year),
          roleId: roleId || null,
          branchId: branchId || null,
          employeeId: employeeId || null,
        },
        include: { role: true },
      });
      return res.status(201).json(pool);
    } catch (error) {
      console.error('Error creating bonus pool:', error);
      return res.status(500).json({ message: 'Error creating bonus pool' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
