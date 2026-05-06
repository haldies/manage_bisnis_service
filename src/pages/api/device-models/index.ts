import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const models = await prisma.deviceModel.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json(models);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching device models' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, brand, type } = req.body;
      if (!name || !brand || !type) {
        return res.status(400).json({ message: 'name, brand, dan type wajib diisi' });
      }
      const model = await prisma.deviceModel.create({ data: { name, brand, type } });
      return res.status(201).json(model);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating device model' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
