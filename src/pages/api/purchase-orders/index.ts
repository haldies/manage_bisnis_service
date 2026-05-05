import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { generateDocNumber } from '@/lib/docNumber';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { status, supplierId, branchId, startDate, endDate } = req.query;

      const where: any = {
        tenantId: 'default',
        deletedAt: null,
      };

      if (status) {
        where.status = String(status);
      }

      if (supplierId) {
        where.supplierId = String(supplierId);
      }

      if (branchId) {
        where.branchId = String(branchId);
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(String(startDate));
        }
        if (endDate) {
          where.createdAt.lte = new Date(String(endDate));
        }
      }

      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          branch: true,
          items: {
            include: {
              item: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(purchaseOrders);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching purchase orders' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { supplierId, branchId, expectedDate, notes, items } = req.body;

      // Validate required fields
      if (!supplierId) {
        return res.status(400).json({ message: 'supplierId wajib diisi' });
      }

      if (!branchId) {
        return res.status(400).json({ message: 'branchId wajib diisi' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
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

      // Calculate total amount
      const totalAmount = items.reduce(
        (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice),
        0
      );

      // Generate PO number
      const poNumber = await generateDocNumber('PO', prisma.purchaseOrder);

      // Create PO with items in a transaction
      const purchaseOrder = await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.create({
          data: {
            tenantId: 'default',
            poNumber,
            supplierId: String(supplierId),
            branchId: String(branchId),
            status: 'Draft',
            expectedDate: expectedDate ? new Date(expectedDate) : null,
            notes: notes || null,
            totalAmount,
            items: {
              create: items.map((item: any) => ({
                tenantId: 'default',
                itemId: String(item.itemId),
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                receivedQty: 0,
              })),
            },
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

      return res.status(201).json(purchaseOrder);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating purchase order' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
