import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const purchaseOrder = await prisma.purchaseOrder.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
          deletedAt: null,
        },
        include: {
          supplier: true,
          branch: true,
          items: {
            include: {
              item: true,
            },
          },
          goodsReceipts: true,
        },
      });

      if (!purchaseOrder) {
        return res.status(404).json({ message: 'Purchase Order tidak ditemukan' });
      }

      return res.status(200).json(purchaseOrder);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching purchase order' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const existing = await prisma.purchaseOrder.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
          deletedAt: null,
        },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Purchase Order tidak ditemukan' });
      }

      if (existing.status !== 'Draft') {
        return res.status(400).json({ message: 'Hanya PO berstatus Draft yang dapat diedit' });
      }

      const { supplierId, branchId, expectedDate, notes, items } = req.body;

      // Calculate new total if items are provided
      let totalAmount: number | undefined;
      if (items && Array.isArray(items)) {
        if (items.length === 0) {
          return res.status(400).json({ message: 'Items tidak boleh kosong' });
        }

        // Validate each item
        for (const item of items) {
          if (!item.itemId) {
            return res.status(400).json({ message: 'itemId wajib diisi untuk setiap item' });
          }
          if (!item.quantity || Number(item.quantity) <= 0) {
            return res.status(400).json({ message: 'Quantity harus lebih dari 0' });
          }
          if (item.unitPrice === undefined || item.unitPrice === null || Number(item.unitPrice) < 0) {
            return res.status(400).json({ message: 'Unit price tidak boleh negatif' });
          }
        }

        totalAmount = items.reduce(
          (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice),
          0
        );
      }

      const updatedPO = await prisma.$transaction(async (tx) => {
        // If items provided, delete existing and recreate
        if (items && Array.isArray(items)) {
          await tx.purchaseOrderItem.deleteMany({
            where: { poId: String(id) },
          });
        }

        const po = await tx.purchaseOrder.update({
          where: { id: String(id) },
          data: {
            ...(supplierId !== undefined && { supplierId: String(supplierId) }),
            ...(branchId !== undefined && { branchId: String(branchId) }),
            ...(expectedDate !== undefined && { expectedDate: expectedDate ? new Date(expectedDate) : null }),
            ...(notes !== undefined && { notes: notes || null }),
            ...(totalAmount !== undefined && { totalAmount }),
            ...(items && Array.isArray(items) && {
              items: {
                create: items.map((item: any) => ({
                  tenantId: 'default',
                  itemId: String(item.itemId),
                  quantity: Number(item.quantity),
                  unitPrice: Number(item.unitPrice),
                  receivedQty: 0,
                })),
              },
            }),
          },
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

        return po;
      });

      return res.status(200).json(updatedPO);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating purchase order' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
