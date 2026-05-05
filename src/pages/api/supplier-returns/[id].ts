import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const supplierReturn = await prisma.supplierReturn.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
        },
        include: {
          supplier: true,
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

      if (!supplierReturn) {
        return res.status(404).json({ message: 'Supplier Return tidak ditemukan' });
      }

      return res.status(200).json(supplierReturn);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching supplier return' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const existing = await prisma.supplierReturn.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
        },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Supplier Return tidak ditemukan' });
      }

      // Only Draft SRs can be edited
      if (existing.status !== 'Draft') {
        return res.status(400).json({
          message: 'Hanya Supplier Return berstatus Draft yang dapat diedit',
        });
      }

      const { notes, returnDate, grId, items } = req.body;

      // Validate items if provided
      if (items !== undefined) {
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ message: 'Items tidak boleh kosong' });
        }

        const validReasons = ['Defective', 'WrongItem', 'Overstock', 'Other'];
        for (const item of items) {
          if (!item.itemId) {
            return res.status(400).json({ message: 'itemId wajib diisi untuk setiap item' });
          }
          if (!item.quantity || Number(item.quantity) <= 0) {
            return res.status(400).json({ message: 'Quantity harus lebih dari 0' });
          }
          if (!item.reason || !validReasons.includes(String(item.reason))) {
            return res.status(400).json({
              message: `reason tidak valid. Nilai yang diizinkan: ${validReasons.join(', ')}`,
            });
          }
        }
      }

      // Validate optional GR reference if provided
      if (grId !== undefined && grId !== null && grId !== '') {
        const gr = await prisma.goodsReceipt.findFirst({
          where: { id: String(grId), tenantId: 'default' },
        });
        if (!gr) {
          return res.status(404).json({ message: 'Goods Receipt tidak ditemukan' });
        }
      }

      const updatedSR = await prisma.$transaction(async (tx) => {
        // If items provided, replace all items
        if (items !== undefined && Array.isArray(items)) {
          await tx.supplierReturnItem.deleteMany({
            where: { srId: String(id) },
          });
        }

        const sr = await tx.supplierReturn.update({
          where: { id: String(id) },
          data: {
            ...(notes !== undefined && { notes: notes || null }),
            ...(returnDate !== undefined && { returnDate: returnDate ? new Date(returnDate) : new Date() }),
            ...(grId !== undefined && { grId: grId ? String(grId) : null }),
            ...(items !== undefined && Array.isArray(items) && {
              items: {
                create: items.map((item: any) => ({
                  tenantId: 'default',
                  itemId: String(item.itemId),
                  quantity: Number(item.quantity),
                  reason: item.reason as any,
                })),
              },
            }),
          },
          include: {
            supplier: true,
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

        return sr;
      });

      return res.status(200).json(updatedSR);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating supplier return' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
