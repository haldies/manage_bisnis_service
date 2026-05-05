import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'POST') {
    try {
      // Fetch SR with items
      const supplierReturn = await prisma.supplierReturn.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
        },
        include: {
          items: true,
        },
      });

      if (!supplierReturn) {
        return res.status(404).json({ message: 'Supplier Return tidak ditemukan' });
      }

      // Must be in Draft status to send
      if (supplierReturn.status !== 'Draft') {
        return res.status(400).json({
          message: `Hanya Supplier Return berstatus Draft yang dapat dikirim. Status saat ini: ${supplierReturn.status}`,
        });
      }

      // CP-3: Validate stock availability for each item at the SR's branchId
      for (const item of supplierReturn.items) {
        const stock = await prisma.stock.findUnique({
          where: {
            itemId_branchId: {
              itemId: item.itemId,
              branchId: supplierReturn.branchId,
            },
          },
        });

        const availableQty = stock?.quantity ?? 0;
        if (availableQty < item.quantity) {
          // Fetch item name for a clearer error message
          const inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: item.itemId },
            select: { name: true, sku: true },
          });
          const itemLabel = inventoryItem
            ? `${inventoryItem.name} (${inventoryItem.sku})`
            : item.itemId;

          return res.status(400).json({
            message: `Stok tidak mencukupi untuk item ${itemLabel}. Stok tersedia: ${availableQty}, qty return: ${item.quantity}`,
          });
        }
      }

      // Execute status update + stock decrement in a single transaction
      const updated = await prisma.$transaction(async (tx) => {
        // 1. Decrement Stock.quantity for each item at branchId
        for (const item of supplierReturn.items) {
          await tx.stock.update({
            where: {
              itemId_branchId: {
                itemId: item.itemId,
                branchId: supplierReturn.branchId,
              },
            },
            data: {
              quantity: { decrement: item.quantity },
            },
          });
        }

        // 2. Update SR status to Sent
        const sr = await tx.supplierReturn.update({
          where: { id: String(id) },
          data: { status: 'Sent' },
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

      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error sending supplier return' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
