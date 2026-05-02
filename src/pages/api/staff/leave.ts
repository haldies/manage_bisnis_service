import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { type, reason, employeeId, startDate, endDate, status } = req.body;
      const newLeave = await prisma.leaveRequest.create({
        data: {
          type,
          reason,
          employeeId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: status || 'Pending'
        }
      });
      return res.status(201).json(newLeave);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating leave request' });
    }
  }

  if (req.method === 'GET') {
    const leaves = await prisma.leaveRequest.findMany({
      orderBy: { startDate: 'desc' }
    });
    return res.status(200).json(leaves);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
