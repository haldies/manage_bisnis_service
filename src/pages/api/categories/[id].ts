import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name } = req.body;
    try {
      const category = await prisma.category.update({
        where: { id: String(id) },
        data: { name },
      });
      return res.status(200).json(category);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update category' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.category.delete({
        where: { id: String(id) },
      });
      return res.status(200).json({ message: 'Category deleted' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
