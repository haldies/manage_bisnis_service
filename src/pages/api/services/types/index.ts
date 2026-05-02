import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const types = await prisma.serviceType.findMany();
      return res.status(200).json(types);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching service types' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, price, category } = req.body;
      const newType = await prisma.serviceType.create({
        data: { name, price: parseFloat(price), category }
      });
      return res.status(201).json(newType);
    } catch (error) {
      return res.status(500).json({ message: 'Error creating service type' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
