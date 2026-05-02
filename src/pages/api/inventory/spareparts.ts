import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// Keywords that identify sparepart categories
const SPAREPART_KEYWORDS = [
  'sparepart', 'spare part', 'suku cadang', 'komponen',
  'part', 'lcd', 'baterai', 'battery', 'aksesoris servis',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { branchId } = req.query;

    // Build OR conditions for category name matching
    const categoryConditions = SPAREPART_KEYWORDS.map((kw) => ({
      category: { name: { contains: kw, mode: 'insensitive' as const } },
    }));

    // Also include items explicitly marked as not for POS
    const items = await prisma.inventoryItem.findMany({
      where: {
        OR: [
          { showInPos: false },
          ...categoryConditions,
        ],
      },
      include: {
        category: true,
        stocks: branchId
          ? { where: { branchId: String(branchId) } }
          : true,
      },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching spareparts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
