import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const goodsReceipt = await prisma.goodsReceipt.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
        },
        include: {
          po: {
            include: {
              supplier: true,
              items: {
                include: {
                  item: true,
                },
              },
            },
          },
          branch: true,
          items: {
            include: {
              item: true,
            },
          },
        },
      });

      if (!goodsReceipt) {
        return res.status(404).json({ message: 'Goods Receipt tidak ditemukan' });
      }

      return res.status(200).json(goodsReceipt);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching goods receipt' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
