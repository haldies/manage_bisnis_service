import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { itemId, branchId, quantity } = req.body;
      
      const updated = await prisma.stock.upsert({
        where: {
          itemId_branchId: {
            itemId: String(itemId),
            branchId: String(branchId)
          }
        },
        update: { quantity: Number(quantity) },
        create: {
          itemId: String(itemId),
          branchId: String(branchId),
          quantity: Number(quantity)
        }
      });
      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating stock' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
