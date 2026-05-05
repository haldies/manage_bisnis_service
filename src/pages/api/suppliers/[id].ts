import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
          deletedAt: null,
        },
        include: {
          _count: {
            select: { purchaseOrders: true },
          },
        },
      });

      if (!supplier) {
        return res.status(404).json({ message: 'Supplier tidak ditemukan' });
      }

      return res.status(200).json(supplier);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching supplier' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { code, name, phone, email, address, notes, isActive } = req.body;

      const existing = await prisma.supplier.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
          deletedAt: null,
        },
      });

      if (!existing) {
        return res.status(404).json({ message: 'Supplier tidak ditemukan' });
      }

      // If code is being changed, check uniqueness
      if (code && String(code).trim() !== existing.code) {
        const codeConflict = await prisma.supplier.findFirst({
          where: {
            code: String(code).trim(),
            tenantId: 'default',
            deletedAt: null,
            id: { not: String(id) },
          },
        });
        if (codeConflict) {
          return res.status(409).json({ message: 'Kode supplier sudah digunakan' });
        }
      }

      // If name is being changed, check uniqueness
      if (name && String(name).trim() !== existing.name) {
        const nameConflict = await prisma.supplier.findFirst({
          where: {
            name: String(name).trim(),
            tenantId: 'default',
            deletedAt: null,
            id: { not: String(id) },
          },
        });
        if (nameConflict) {
          return res.status(409).json({ message: 'Nama supplier sudah digunakan' });
        }
      }

      const updated = await prisma.supplier.update({
        where: { id: String(id) },
        data: {
          ...(code !== undefined && { code: String(code).trim() }),
          ...(name !== undefined && { name: String(name).trim() }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(email !== undefined && { email: email || null }),
          ...(address !== undefined && { address: address || null }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      });

      return res.status(200).json(updated);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Kode supplier sudah digunakan' });
      }
      return res.status(500).json({ message: 'Error updating supplier' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: String(id),
          tenantId: 'default',
          deletedAt: null,
        },
      });

      if (!supplier) {
        return res.status(404).json({ message: 'Supplier tidak ditemukan' });
      }

      // Check if supplier has any purchase orders
      const poCount = await prisma.purchaseOrder.count({
        where: {
          supplierId: String(id),
          tenantId: 'default',
        },
      });

      if (poCount > 0) {
        // Supplier has POs — only deactivate, do not soft delete
        const deactivated = await prisma.supplier.update({
          where: { id: String(id) },
          data: { isActive: false },
        });
        return res.status(200).json({
          ...deactivated,
          message: 'Supplier dinonaktifkan karena memiliki Purchase Order terkait',
        });
      }

      // No POs — soft delete
      const deleted = await prisma.supplier.update({
        where: { id: String(id) },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      return res.status(200).json(deleted);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting supplier' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
