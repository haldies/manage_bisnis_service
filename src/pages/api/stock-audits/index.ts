import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { generateDocNumber } from '@/lib/docNumber';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { branchId, status, tenantId } = req.query;

      const where: any = {
        tenantId: tenantId ? String(tenantId) : 'default',
      };

      if (branchId) {
        where.branchId = String(branchId);
      }

      if (status) {
        where.status = String(status);
      }

      const stockAudits = await prisma.stockAudit.findMany({
        where,
        include: {
          branch: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(stockAudits);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching stock audits' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { branchId, notes } = req.body;

      // Validate required fields
      if (!branchId) {
        return res.status(400).json({ message: 'branchId wajib diisi' });
      }

      // Validate branch exists
      const branch = await prisma.branch.findFirst({
        where: { id: String(branchId), tenantId: 'default', deletedAt: null },
      });
      if (!branch) {
        return res.status(404).json({ message: 'Cabang tidak ditemukan' });
      }

      // Get all Stock records for the branch (with item details) as snapshot
      const stocks = await prisma.stock.findMany({
        where: {
          branchId: String(branchId),
          tenantId: 'default',
          deletedAt: null,
        },
        include: {
          item: {
            select: { id: true, name: true, sku: true, deletedAt: true },
          },
        },
      });

      // Filter out items that have been soft-deleted
      const activeStocks = stocks.filter((s) => s.item.deletedAt === null);

      // Generate audit number
      const auditNumber = await generateDocNumber('AUD', prisma.stockAudit);

      // Create StockAudit with snapshot of current stock quantities
      const stockAudit = await prisma.stockAudit.create({
        data: {
          tenantId: 'default',
          auditNumber,
          branchId: String(branchId),
          status: 'Open',
          notes: notes || null,
          items: {
            create: activeStocks.map((stock) => ({
              tenantId: 'default',
              itemId: stock.itemId,
              systemQty: stock.quantity,
              physicalQty: null,
              discrepancy: null,
            })),
          },
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

      return res.status(201).json(stockAudit);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating stock audit' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
