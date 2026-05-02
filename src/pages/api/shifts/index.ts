import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const shifts = await prisma.shift.findMany();
    return res.status(200).json(shifts);
  }

  if (req.method === 'POST') {
    try {
      const { name, startTime, endTime, branchId } = req.body;
      const newShift = await prisma.shift.create({
        data: { name, startTime, endTime, branchId }
      });
      return res.status(201).json(newShift);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating shift' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
