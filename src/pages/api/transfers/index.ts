import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const transfers = await prisma.stockTransfer.findMany({
      include: {
        fromBranch: true,
        toBranch: true,
        items: { include: { item: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(transfers);
  }

  if (req.method === 'POST') {
    const { fromBranchId, toBranchId, notes, items } = req.body;
    
    if (!fromBranchId || !toBranchId || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (fromBranchId === toBranchId) {
      return res.status(400).json({ message: 'Cannot transfer within the same branch' });
    }

    try {
      const transfer = await prisma.stockTransfer.create({
        data: {
          fromBranchId,
          toBranchId,
          notes,
          status: 'Pending',
          items: {
            create: items.map((it: any) => ({
              itemId: it.itemId,
              quantity: it.quantity
            }))
          }
        },
        include: {
          items: { include: { item: true } },
          fromBranch: true,
          toBranch: true
        }
      });
      return res.status(201).json(transfer);
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  }

  return res.status(405).end();
}
