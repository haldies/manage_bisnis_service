import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { name, sku, categoryId, costPrice, basePrice, unit, rack, image } = req.body;
      const updated = await prisma.inventoryItem.update({
        where: { id: String(id) },
        data: { 
          name, sku, costPrice, basePrice, unit, rack, image,
          category: categoryId ? { connect: { id: categoryId } } : undefined
        },
        include: { stocks: true, category: true }
      });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating item' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Delete stocks first due to foreign key
      await prisma.stock.deleteMany({ where: { itemId: String(id) } });
      await prisma.inventoryItem.delete({ where: { id: String(id) } });
      return res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting item' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
