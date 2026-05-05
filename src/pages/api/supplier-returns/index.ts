import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { generateDocNumber } from '@/lib/docNumber';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { supplierId, branchId, status } = req.query;

      const where: any = {
        tenantId: 'default',
      };

      if (supplierId) {
        where.supplierId = String(supplierId);
      }

      if (branchId) {
        where.branchId = String(branchId);
      }

      if (status) {
        where.status = String(status);
      }

      const supplierReturns = await prisma.supplierReturn.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, code: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(supplierReturns);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching supplier returns' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { supplierId, branchId, grId, returnDate, notes, items } = req.body;

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

      // Validate supplier exists
      const supplier = await prisma.supplier.findFirst({
        where: { id: String(supplierId), tenantId: 'default', deletedAt: null },
      });
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier tidak ditemukan' });
      }

      // Validate branch exists
      const branch = await prisma.branch.findFirst({
        where: { id: String(branchId), tenantId: 'default', deletedAt: null },
      });
      if (!branch) {
        return res.status(404).json({ message: 'Cabang tidak ditemukan' });
      }

      // Validate optional GR reference
      if (grId) {
        const gr = await prisma.goodsReceipt.findFirst({
          where: { id: String(grId), tenantId: 'default' },
        });
        if (!gr) {
          return res.status(404).json({ message: 'Goods Receipt tidak ditemukan' });
        }
      }

      // Generate SR number
      const srNumber = await generateDocNumber('SR', prisma.supplierReturn);

      // Create SR with status Draft — do NOT decrement stock on Draft creation
      const supplierReturn = await prisma.supplierReturn.create({
        data: {
          tenantId: 'default',
          srNumber,
          supplierId: String(supplierId),
          branchId: String(branchId),
          grId: grId ? String(grId) : null,
          status: 'Draft',
          returnDate: returnDate ? new Date(returnDate) : new Date(),
          notes: notes || null,
          items: {
            create: items.map((item: any) => ({
              tenantId: 'default',
              itemId: String(item.itemId),
              quantity: Number(item.quantity),
              reason: item.reason as any,
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

      return res.status(201).json(supplierReturn);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating supplier return' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
