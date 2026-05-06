import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/types';

const MODULES = ['Dashboard', 'POS', 'Service', 'Inventory', 'Finance', 'Staff', 'Transactions', 'Settings'];

/**
 * Default permission matrix.
 * Each role maps to per-module CRUD flags.
 *
 * Naming convention:
 *   Full   = canRead + canCreate + canUpdate + canDelete
 *   Write  = canRead + canCreate + canUpdate  (no delete)
 *   Update = canRead + canUpdate              (no create/delete)
 *   Read   = canRead only
 *   None   = no access
 *
 * We use a helper below to convert these to the 4 boolean flags Prisma expects.
 */
const DEFAULT_ROLES: Record<string, Record<string, 'Full' | 'Write' | 'Update' | 'Read' | 'None'>> = {
  [ROLES.SUPER_ADMIN]: {
    Dashboard: 'Full', POS: 'Full', Service: 'Full', Inventory: 'Full',
    Finance: 'Full', Staff: 'Full', Transactions: 'Full', Settings: 'Full',
  },
  [ROLES.ADMIN]: {
    Dashboard: 'Full', POS: 'Full', Service: 'Full', Inventory: 'Full',
    Finance: 'Read', Staff: 'Full', Transactions: 'Full', Settings: 'Full',
  },
  [ROLES.MANAGER]: {
    Dashboard: 'Full', POS: 'Write', Service: 'Write', Inventory: 'Write',
    Finance: 'Read', Staff: 'Read', Transactions: 'Read', Settings: 'Read',
  },
  [ROLES.CASHIER]: {
    // Kasir: bisa registrasi & update tiket servis, tapi tidak bisa hapus
    Dashboard: 'Read', POS: 'Full', Service: 'Write', Inventory: 'Read',
    Finance: 'None', Staff: 'None', Transactions: 'Read', Settings: 'Update',
  },
  [ROLES.TECHNICIAN]: {
    // Teknisi: hanya bisa update tiket yang ditugaskan, tidak bisa buat/hapus
    Dashboard: 'None', POS: 'None', Service: 'Update', Inventory: 'Read',
    Finance: 'None', Staff: 'None', Transactions: 'Read', Settings: 'None',
  },
};

function levelToFlags(level: 'Full' | 'Write' | 'Update' | 'Read' | 'None') {
  return {
    canRead:   level !== 'None',
    canCreate: level === 'Full' || level === 'Write',
    canUpdate: level === 'Full' || level === 'Write' || level === 'Update',
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

    // Step 2: Find the new Super Admin role and reassign ALL users to it
    const newSuperAdminRole = newRoles.find(r => r.finalName === ROLES.SUPER_ADMIN);
    if (newSuperAdminRole) {
      await prisma.user.updateMany({
        data: { roleId: newSuperAdminRole.id },
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
