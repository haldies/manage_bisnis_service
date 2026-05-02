import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const overtimes = await prisma.overtime.findMany({
        orderBy: { date: 'desc' }
      });
      return res.status(200).json(overtimes);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching overtime records' });
    }
  }

  if (req.method === 'POST') {
    try {
      const data = req.body;
      const overtime = await prisma.overtime.create({
        data: {
          employeeId: data.employeeId,
          hours: parseFloat(data.hours) || 0,
          date: new Date(data.date),
          reason: data.reason || "",
          status: "Pending"
        }
      });
      return res.status(200).json(overtime);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating overtime record' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, ...updates } = req.body;
      const overtime = await prisma.overtime.update({
        where: { id },
        data: updates
      });
      return res.status(200).json(overtime);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating overtime record' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
