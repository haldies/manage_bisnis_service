import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

const MODULES = ['Dashboard', 'POS', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Settings'];

const DEFAULT_ROLES: Record<string, Record<string, 'Full' | 'Read' | 'None'>> = {
  Owner: {
    Dashboard: 'Full', POS: 'Full', Service: 'Full', Inventory: 'Full',
    Finance: 'Full', Staff: 'Full', Transactions: 'Full', Settings: 'Full',
  },
  Cashier: {
    Dashboard: 'Read', POS: 'Full', Service: 'Read', Inventory: 'Read',
    Finance: 'None', Staff: 'None', Transactions: 'Read', Settings: 'Full',
  },
  Technician: {
    Dashboard: 'None', POS: 'None', Service: 'Full', Inventory: 'Read',
    Finance: 'None', Staff: 'None', Transactions: 'Read', Settings: 'None',
  },
  Admin: {
    Dashboard: 'Full', POS: 'Full', Service: 'Full', Inventory: 'Full',
    Finance: 'Read', Staff: 'Full', Transactions: 'Full', Settings: 'Full',
  },
};

function levelToFlags(level: 'Full' | 'Read' | 'None') {
  return {
    canRead:   level === 'Read' || level === 'Full',
    canCreate: level === 'Full',
    canUpdate: level === 'Full',
    canDelete: level === 'Full',
  };
}

/**
 * POST /api/roles/reset
 * Safe reset: creates new roles first, reassigns users, then deletes old roles.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Step 1: Create new roles with a temp prefix to avoid name conflicts
    const tempPrefix = '__reset__';
    const newRoles: any[] = [];

    for (const [roleName, perms] of Object.entries(DEFAULT_ROLES)) {
      // Use upsert-like approach: try to find existing, or create with temp name
      const tempName = `${tempPrefix}${roleName}`;
      const role = await prisma.role.create({
        data: {
          name: tempName,
          tenantId: 'default',
          permissions: {
            create: MODULES.map((m) => ({
              module: m,
              ...levelToFlags(perms[m] || 'None'),
            })),
          },
        },
        include: { permissions: true },
      });
      newRoles.push({ ...role, finalName: roleName });
    }

    // Step 2: Find the new Owner role and reassign ALL users to it
    const newOwnerRole = newRoles.find(r => r.finalName === 'Owner');
    if (newOwnerRole) {
      await prisma.user.updateMany({
        data: { roleId: newOwnerRole.id },
      });
    }

    // Step 3: Now safe to delete all old roles (users no longer reference them)
    // Delete roles that don't have the temp prefix (i.e., the old ones)
    await prisma.permission.deleteMany({
      where: { role: { name: { not: { startsWith: tempPrefix } } } },
    });
    await prisma.role.deleteMany({
      where: { name: { not: { startsWith: tempPrefix } } },
    });

    // Step 4: Rename temp roles to their final names
    const finalRoles: any[] = [];
    for (const role of newRoles) {
      const updated = await prisma.role.update({
        where: { id: role.id },
        data: { name: role.finalName },
        include: { permissions: true },
      });
      finalRoles.push(updated);
    }

    return res.status(200).json({
      message: 'Roles reset successfully',
      roles: finalRoles,
    });
  } catch (error: any) {
    console.error('[roles/reset]', error);
    return res.status(500).json({ message: error.message || 'Error resetting roles' });
  }
}
