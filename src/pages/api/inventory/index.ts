import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const items = await prisma.inventoryItem.findMany({ include: { stocks: true, category: true } });
    return res.status(200).json(items);
  }

  if (req.method === 'POST') {
    try {
      const { name, sku, categoryId, costPrice, basePrice, unit, rack, image, branchId, initialStock } = req.body;
      
      const newItem = await prisma.inventoryItem.create({
        data: {
          name, sku, costPrice, basePrice, unit, rack, image,
          category: {
            connect: { id: categoryId }
          },
          stocks: {
            create: {
              branchId: branchId || 'b1',
              quantity: initialStock || 0
            }
          }
        },
        include: { stocks: true, category: true }
      });
      return res.status(201).json(newItem);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating inventory item' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
