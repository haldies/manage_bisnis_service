import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name, price, category } = req.body;
      const updated = await prisma.serviceType.update({
        where: { id: String(id) },
        data: { name, price: price ? parseFloat(price) : undefined, category }
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating service type' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.serviceType.delete({ where: { id: String(id) } });
      return res.status(200).json({ message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting service type' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
