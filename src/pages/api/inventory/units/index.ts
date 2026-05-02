import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const units = await prisma.inventoryUnit.findMany({
      orderBy: { entryDate: 'desc' }
    });
    return res.status(200).json(units);
  }

  if (req.method === 'POST') {
    const { itemId, branchId, serialNumber, costPrice, status } = req.body;
    
    try {
      const unit = await prisma.inventoryUnit.create({
        data: {
          itemId,
          branchId,
          serialNumber,
          costPrice: costPrice ? Number(costPrice) : null,
          status: status || 'Available'
        }
      });
      
      // Optionally increment stock quantity if needed, but Stock and InventoryUnit should be synced
      // For now, assume InventoryUnit is a detailed record
      
      return res.status(201).json(unit);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  }

  return res.status(405).end();
}
