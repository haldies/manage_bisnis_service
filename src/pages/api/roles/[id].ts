import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/roles/[id]
 * Body: { name?: string, permissions?: { module: string, level: 'None'|'Read'|'Full' }[] }
 *
 * DELETE /api/roles/[id]
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid id' });
  }

  // PUT — update role name and/or permissions
  if (req.method === 'PUT') {
    try {
      const { name, permissions } = req.body as {
        name?: string;
        permissions?: { module: string; level: 'None' | 'Read' | 'Full' }[];
      };

      // Update role name if provided
      if (name?.trim()) {
        await prisma.role.update({ where: { id }, data: { name: name.trim() } });
      }

      // Update permissions if provided
      if (Array.isArray(permissions) && permissions.length > 0) {
        for (const { module, level } of permissions) {
          const canRead = level === 'Read' || level === 'Full';
          const canCreate = level === 'Full';
          const canUpdate = level === 'Full';
          const canDelete = level === 'Full';

          await prisma.permission.upsert({
            where: { roleId_module: { roleId: id, module } },
            update: { canRead, canCreate, canUpdate, canDelete },
            create: { roleId: id, module, canRead, canCreate, canUpdate, canDelete },
          });
        }
      }

      const updated = await prisma.role.findUnique({
        where: { id },
        include: { permissions: true },
      });
      return res.status(200).json(updated);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'P2002') return res.status(409).json({ message: 'Role name already exists' });
      return res.status(500).json({ message: 'Error updating role' });
    }
  }

  // DELETE — remove role (only if no users are assigned)
  if (req.method === 'DELETE') {
    try {
      const usersWithRole = await prisma.user.count({ where: { roleId: id } });
      if (usersWithRole > 0) {
        return res.status(409).json({
          message: `Tidak bisa menghapus role ini karena masih digunakan oleh ${usersWithRole} pengguna.`,
        });
      }
      await prisma.role.delete({ where: { id } });
      return res.status(200).json({ message: 'Deleted' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting role' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
