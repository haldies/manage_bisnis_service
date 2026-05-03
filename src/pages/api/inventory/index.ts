import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const items = await prisma.inventoryItem.findMany({ include: { stocks: true, category: true } });
    return res.status(200).json(items);
  }

  if (req.method === 'POST') {
    try {
      const { name, sku, categoryId, costPrice, basePrice, unit, rack, image, branchId, initialStock } = req.body;

      // Validate required fields
      if (!name || !sku || !categoryId || costPrice == null || basePrice == null || !unit) {
        return res.status(400).json({ message: 'Missing required fields: name, sku, categoryId, costPrice, basePrice, unit' });
      }

      // Validate category exists
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({ message: `Category with id "${categoryId}" not found` });
      }

      // Validate branchId if provided
      const resolvedBranchId = branchId || null;
      if (resolvedBranchId) {
        const branch = await prisma.branch.findUnique({ where: { id: resolvedBranchId } });
        if (!branch) {
          return res.status(400).json({ message: `Branch with id "${resolvedBranchId}" not found` });
        }
      }

      const newItem = await prisma.inventoryItem.create({
        data: {
          name,
          sku,
          costPrice,
          basePrice,
          unit,
          rack,
          image,
          category: {
            connect: { id: categoryId }
          },
          ...(resolvedBranchId && {
            stocks: {
              create: {
                branchId: resolvedBranchId,
                quantity: initialStock || 0
              }
            }
          })
        },
        include: { stocks: true, category: true }
      });
      return res.status(201).json(newItem);
    } catch (error: any) {
      console.error('Error creating inventory item:', error);

      // Prisma unique constraint violation (e.g. duplicate SKU)
      if (error.code === 'P2002') {
        const field = error.meta?.target?.join(', ') ?? 'field';
        return res.status(409).json({ message: `Duplicate value: ${field} already exists` });
      }

      // Prisma foreign key / record not found
      if (error.code === 'P2025') {
        return res.status(400).json({ message: error.meta?.cause ?? 'Related record not found' });
      }

      return res.status(500).json({ message: error.message ?? 'Error creating inventory item' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
