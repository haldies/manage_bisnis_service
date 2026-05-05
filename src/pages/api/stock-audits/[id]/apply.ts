import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      // Fetch audit with all items
      const stockAudit = await prisma.stockAudit.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
        },
        include: {
          items: {
            include: {
              item: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      });

      if (!stockAudit) {
        return res.status(404).json({ message: 'Stock Audit tidak ditemukan' });
      }

      // Validate audit is not already Completed
      if (stockAudit.status === 'Completed') {
        return res.status(400).json({
          message: 'Audit yang sudah Completed tidak dapat diterapkan kembali',
        });
      }

      // CP-5: Validate all items have physicalQty filled (not null/undefined)
      const unfilledItems = stockAudit.items.filter(
        (item) => item.physicalQty === null || item.physicalQty === undefined
      );

      if (unfilledItems.length > 0) {
        const unfilledNames = unfilledItems
          .map((item) => `${item.item.name} (${item.item.sku})`)
          .join(', ');
        return res.status(400).json({
          message: `Semua item harus diisi physicalQty sebelum audit dapat diterapkan. Item belum diisi: ${unfilledNames}`,
        });
      }

      // Apply audit results in a transaction
      const updatedAudit = await prisma.$transaction(async (tx) => {
        // CP-5: For each item, update Stock.quantity = physicalQty at the branch
        for (const auditItem of stockAudit.items) {
          const physicalQty = auditItem.physicalQty as number;

          // Upsert stock: update if exists, create if not
          await tx.stock.upsert({
            where: {
              itemId_branchId: {
                itemId: auditItem.itemId,
                branchId: stockAudit.branchId,
              },
            },
            update: {
              quantity: physicalQty,
            },
            create: {
              tenantId: 'default',
              itemId: auditItem.itemId,
              branchId: stockAudit.branchId,
              quantity: physicalQty,
            },
          });
        }

        // Set audit status to Completed and record completedAt
        const audit = await tx.stockAudit.update({
          where: { id: String(id) },
          data: {
            status: 'Completed',
            completedAt: new Date(),
          },
          include: {
            branch: true,
            items: {
              include: {
                item: {
                  select: { id: true, name: true, sku: true, unit: true },
                },
              },
            },
          },
        });

        return audit;
      });

      return res.status(200).json(updatedAudit);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error applying stock audit' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
