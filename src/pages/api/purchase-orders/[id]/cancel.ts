import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
        },
      });

      if (!purchaseOrder) {
        return res.status(404).json({ message: 'Purchase Order tidak ditemukan' });
      }

      if (purchaseOrder.status !== 'Draft' && purchaseOrder.status !== 'Sent') {
        return res.status(400).json({ message: 'Hanya PO berstatus Draft atau Sent yang dapat dibatalkan' });
      }

      const updated = await prisma.purchaseOrder.update({
        where: { id: String(id) },
        data: { status: 'Cancelled' },
        include: {
          supplier: true,
          branch: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error cancelling purchase order' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
