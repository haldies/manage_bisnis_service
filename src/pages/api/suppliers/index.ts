import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: {
          tenantId: 'default',
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json(suppliers);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching suppliers' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { code, name, phone, email, address, notes } = req.body;

      if (!name || !code) {
        return res.status(400).json({ message: 'Nama dan kode supplier wajib diisi' });
      }

      // Check uniqueness of code per tenant
      const existing = await prisma.supplier.findFirst({
        where: {
          code: String(code).trim(),
          tenantId: 'default',
          deletedAt: null,
        },
      });
      if (existing) {
        return res.status(409).json({ message: 'Kode supplier sudah digunakan' });
      }

      // Check uniqueness of name per tenant
      const existingName = await prisma.supplier.findFirst({
        where: {
          name: String(name).trim(),
          tenantId: 'default',
          deletedAt: null,
        },
      });
      if (existingName) {
        return res.status(409).json({ message: 'Nama supplier sudah digunakan' });
      }

      const supplier = await prisma.supplier.create({
        data: {
          tenantId: 'default',
          code: String(code).trim(),
          name: String(name).trim(),
          phone: phone || null,
          email: email || null,
          address: address || null,
          notes: notes || null,
          isActive: true,
        },
      });

      return res.status(201).json(supplier);
    } catch (error: any) {
      console.error(error);
      // Handle unique constraint violation (code + tenantId)
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Kode supplier sudah digunakan' });
      }
      return res.status(500).json({ message: 'Error creating supplier' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
