import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

const MODULES = ['Cashier', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Printers'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const roles = await prisma.role.findMany({ include: { permissions: true } });
      return res.status(200).json(roles);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching roles' });
    }
  }

  // POST — create a new role with all permissions set to None
  if (req.method === 'POST') {
    try {
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: 'name is required' });

      const role = await prisma.role.create({
        data: {
          name: name.trim(),
          tenantId: 'default',
          permissions: {
            create: MODULES.map((m) => ({
              module: m,
              canRead: false,
              canCreate: false,
              canUpdate: false,
              canDelete: false,
            })),
          },
        },
        include: { permissions: true },
      });
      return res.status(201).json(role);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'P2002') return res.status(409).json({ message: 'Role name already exists' });
      return res.status(500).json({ message: 'Error creating role' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
