import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { generateDocNumber } from '@/lib/docNumber';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { type, branchId, startDate, endDate, itemId } = req.query;

      const where: any = {
        tenantId: 'default',
      };

      if (type) {
        where.type = String(type);
      }

      if (branchId) {
        where.branchId = String(branchId);
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(String(startDate));
        }
        if (endDate) {
          where.date.lte = new Date(String(endDate));
        }
      }

      if (itemId) {
        where.items = {
          some: {
            itemId: String(itemId),
          },
        };
      }

      const stockOuts = await prisma.stockOut.findMany({
        where,
        include: {
          branch: true,
          items: {
            include: {
              item: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(stockOuts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching stock outs' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { branchId, type, date, reason, notes, createdBy, items } = req.body;

      // Validate required fields
      if (!branchId) {
        return res.status(400).json({ message: 'branchId wajib diisi' });
      }

      if (!type) {
        return res.status(400).json({ message: 'type wajib diisi' });
      }

      const validTypes = ['InternalUse', 'Damaged', 'Lost', 'Adjustment'];
      if (!validTypes.includes(String(type))) {
        return res.status(400).json({
          message: `type tidak valid. Nilai yang diizinkan: ${validTypes.join(', ')}`,
        });
      }

      if (!reason) {
        return res.status(400).json({ message: 'reason wajib diisi' });
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
      }

      // CP-2: Check stock availability for each item before creating the record
      for (const item of items) {
        const stock = await prisma.stock.findUnique({
          where: {
            itemId_branchId: {
              itemId: String(item.itemId),
              branchId: String(branchId),
            },
          },
        });

        const availableQty = stock?.quantity ?? 0;
        if (availableQty < Number(item.quantity)) {
          // Fetch item name for a clearer error message
          const inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: String(item.itemId) },
            select: { name: true, sku: true },
          });
          const itemLabel = inventoryItem
            ? `${inventoryItem.name} (${inventoryItem.sku})`
            : item.itemId;

          return res.status(400).json({
            message: `Stok tidak mencukupi untuk item ${itemLabel}. Stok tersedia: ${availableQty}, qty diminta: ${item.quantity}`,
          });
        }
      }

      // Generate SO number
      const soNumber = await generateDocNumber('SO', prisma.stockOut);

      // Execute everything in a transaction: create StockOut + decrement stock atomically
      const stockOut = await prisma.$transaction(async (tx) => {
        // 1. Create StockOut record with items
        const so = await tx.stockOut.create({
          data: {
            tenantId: 'default',
            soNumber,
            branchId: String(branchId),
            type: type as any,
            date: date ? new Date(date) : new Date(),
            reason: String(reason),
            notes: notes || null,
            createdBy: createdBy || null,
            items: {
              create: items.map((item: any) => ({
                tenantId: 'default',
                itemId: String(item.itemId),
                quantity: Number(item.quantity),
              })),
            },
          },
          include: {
            branch: true,
            items: {
              include: {
                item: true,
              },
            },
          },
        });

        // 2. Decrement Stock.quantity for each item at the branch
        for (const item of items) {
          await tx.stock.update({
            where: {
              itemId_branchId: {
                itemId: String(item.itemId),
                branchId: String(branchId),
              },
            },
            data: {
              quantity: { decrement: Number(item.quantity) },
            },
          });
        }

        return so;
      });

      return res.status(201).json(stockOut);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating stock out' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
