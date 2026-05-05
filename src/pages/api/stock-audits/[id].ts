import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const stockAudit = await prisma.stockAudit.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
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

      if (!stockAudit) {
        return res.status(404).json({ message: 'Stock Audit tidak ditemukan' });
      }

      return res.status(200).json(stockAudit);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching stock audit' });
    }
  }

  if (req.method === 'PUT') {
    try {
      // Fetch existing audit
      const existing = await prisma.stockAudit.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
        },
        include: {
          items: true,
        },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Stock Audit tidak ditemukan' });
      }

      // Cannot update a completed audit
      if (existing.status === 'Completed') {
        return res.status(400).json({
          message: 'Audit yang sudah Completed tidak dapat diubah',
        });
      }

      const { items } = req.body;

      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'items wajib diisi dan tidak boleh kosong' });
      }

      for (const item of items) {
        if (!item.itemId) {
          return res.status(400).json({ message: 'itemId wajib diisi untuk setiap item' });
        }
        if (item.physicalQty === undefined || item.physicalQty === null) {
          return res.status(400).json({ message: 'physicalQty wajib diisi untuk setiap item' });
        }
        if (Number(item.physicalQty) < 0) {
          return res.status(400).json({ message: 'physicalQty tidak boleh negatif' });
        }
      }

      // Determine new status: if currently Open, move to InProgress
      const newStatus = existing.status === 'Open' ? 'InProgress' : existing.status;

      // Update each audit item's physicalQty and calculate discrepancy
      const updatedAudit = await prisma.$transaction(async (tx) => {
        for (const item of items) {
          // Find the matching audit item to get systemQty
          const auditItem = existing.items.find((ai) => ai.itemId === String(item.itemId));
          if (!auditItem) {
            throw new Error(`Item ${item.itemId} tidak ditemukan dalam audit ini`);
          }

          const physicalQty = Number(item.physicalQty);
          const discrepancy = physicalQty - auditItem.systemQty;

          await tx.stockAuditItem.update({
            where: { id: auditItem.id },
            data: {
              physicalQty,
              discrepancy,
            },
          });
        }

        // Update audit status if it was Open
        const audit = await tx.stockAudit.update({
          where: { id: String(id) },
          data: {
            status: newStatus as any,
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
    } catch (error: any) {
      console.error(error);
      if (error.message && error.message.includes('tidak ditemukan dalam audit')) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Error updating stock audit' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
