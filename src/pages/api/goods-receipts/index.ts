import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { generateDocNumber } from '@/lib/docNumber';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { poId, branchId, startDate, endDate } = req.query;

      const where: any = {
        tenantId: 'default',
      };

      if (poId) {
        where.poId = String(poId);
      }

      if (branchId) {
        where.branchId = String(branchId);
      }

      if (startDate || endDate) {
        where.receiptDate = {};
        if (startDate) {
          where.receiptDate.gte = new Date(String(startDate));
        }
        if (endDate) {
          where.receiptDate.lte = new Date(String(endDate));
        }
      }

      const goodsReceipts = await prisma.goodsReceipt.findMany({
        where,
        include: {
          po: {
            include: {
              supplier: true,
            },
          },
          branch: true,
          items: {
            include: {
              item: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(goodsReceipts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching goods receipts' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { poId, receiptDate, notes, items } = req.body;

      // Validate required fields
      if (!poId) {
        return res.status(400).json({ message: 'poId wajib diisi' });
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

      // Fetch PO with items to validate
      const po = await prisma.purchaseOrder.findFirst({
        where: {
          id: String(poId),
          tenantId: 'default',
          deletedAt: null,
        },
        include: {
          items: true,
        },
      });

      if (!po) {
        return res.status(404).json({ message: 'Purchase Order tidak ditemukan' });
      }

      // CP-4 / US-3.1: PO must be Sent or Partial
      if (po.status !== 'Sent' && po.status !== 'Partial') {
        return res.status(400).json({
          message: `Goods Receipt hanya dapat dibuat dari PO berstatus Sent atau Partial. Status PO saat ini: ${po.status}`,
        });
      }

      // CP-6: Validate received qty does not exceed remaining PO qty per item
      for (const grItem of items) {
        const poItem = po.items.find((pi) => pi.itemId === String(grItem.itemId));

        if (!poItem) {
          return res.status(400).json({
            message: `Item ${grItem.itemId} tidak ditemukan dalam Purchase Order ini`,
          });
        }

        const remainingQty = poItem.quantity - poItem.receivedQty;
        if (Number(grItem.quantity) > remainingQty) {
          return res.status(400).json({
            message: `Qty diterima untuk item ${grItem.itemId} (${grItem.quantity}) melebihi sisa PO (${remainingQty})`,
          });
        }
      }

      // Generate GR number
      const grNumber = await generateDocNumber('GR', prisma.goodsReceipt);

      // Execute everything in a transaction
      const goodsReceipt = await prisma.$transaction(async (tx) => {
        // 1. Create GR record
        const gr = await tx.goodsReceipt.create({
          data: {
            tenantId: 'default',
            grNumber,
            poId: String(poId),
            branchId: po.branchId,
            receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
            notes: notes || null,
            items: {
              create: items.map((item: any) => ({
                tenantId: 'default',
                itemId: String(item.itemId),
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
              })),
            },
          },
          include: {
            po: {
              include: {
                supplier: true,
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

        // 2. For each item: increment Stock.quantity at the PO's target branch (upsert)
        for (const grItem of items) {
          await tx.stock.upsert({
            where: {
              itemId_branchId: {
                itemId: String(grItem.itemId),
                branchId: po.branchId,
              },
            },
            update: {
              quantity: { increment: Number(grItem.quantity) },
            },
            create: {
              tenantId: 'default',
              itemId: String(grItem.itemId),
              branchId: po.branchId,
              quantity: Number(grItem.quantity),
            },
          });
        }

        // 3. Update PurchaseOrderItem.receivedQty for each received item
        for (const grItem of items) {
          await tx.purchaseOrderItem.updateMany({
            where: {
              poId: String(poId),
              itemId: String(grItem.itemId),
            },
            data: {
              receivedQty: {
                increment: Number(grItem.quantity),
              },
            },
          });
        }

        // 4. Recalculate PO status (Partial or Received)
        const updatedPOItems = await tx.purchaseOrderItem.findMany({
          where: { poId: String(poId) },
        });

        const allReceived = updatedPOItems.every(
          (pi) => pi.receivedQty >= pi.quantity
        );
        const anyReceived = updatedPOItems.some((pi) => pi.receivedQty > 0);

        const newStatus = allReceived ? 'Received' : anyReceived ? 'Partial' : po.status;

        await tx.purchaseOrder.update({
          where: { id: String(poId) },
          data: { status: newStatus },
        });

        return gr;
      });

      return res.status(201).json(goodsReceipt);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating goods receipt' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
