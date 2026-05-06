import { usePosStore, hasModuleAccess, getUserAccessLevel } from "@/lib/store";
import { 
  isSuperAdmin, isAdmin, isTechnician, isManager, isCashier, 
  ModuleName, AccessLevel, Permission, ROLES
} from "@/lib/types";
import { useMemo, useEffect, useRef } from "react";

type CrudAction = 'read' | 'create' | 'update' | 'delete';

// ─── Debug logger ─────────────────────────────────────────────────────────────
// Logs once per user session change (not on every render).
// Output visible in browser DevTools console under the [useAuth] prefix.

const MODULES: ModuleName[] = [
  'Dashboard', 'POS', 'Service', 'Inventory',
  'Finance', 'Staff', 'Transactions', 'Settings',
];

function logAuthState(
  user: ReturnType<typeof usePosStore.getState>['currentUser'],
  rolePermissions: Record<string, Record<ModuleName, AccessLevel>>
) {
  if (!user) {
    console.log('%c[useAuth] No user logged in', 'color:#888');
    return;
  }

  const roleName = user.role?.name ?? '(no role)';
  const dbPerms  = (user.role as any)?.permissions ?? [];

  // Build a compact permission table for this user
  const permTable: Record<string, string> = {};
  for (const mod of MODULES) {
    const level = getUserAccessLevel(user, mod, rolePermissions);
    // Also show raw DB flags for comparison
    const raw = dbPerms.find((p: any) => p.module?.toLowerCase() === mod.toLowerCase());
    const flags = raw
      ? `DB[${raw.canRead?'R':''}${raw.canCreate?'C':''}${raw.canUpdate?'U':''}${raw.canDelete?'D':''}]`
      : 'DB[no entry]';
    permTable[mod] = `${level} ${flags}`;
  }

  // Hardcoded store entry for this role (for comparison)
  const storeEntry =
    rolePermissions[roleName] ??
    Object.entries(rolePermissions).find(
      ([k]) => k.toLowerCase() === roleName.toLowerCase()
    )?.[1];

  console.groupCollapsed(
    `%c[useAuth] 👤 ${user.username ?? user.name}  |  role: "${roleName}"`,
    'color:#6366f1;font-weight:bold'
  );
  console.log('User ID      :', user.id);
  console.log('Branch ID    :', user.branchId ?? '(none)');
  console.log('Role name    :', roleName);
  console.log('isSuperAdmin :', isSuperAdmin(roleName));
  console.log('isAdmin      :', isAdmin(roleName));
  console.log('isTechnician :', isTechnician(roleName));
  console.log('isManager    :', isManager(roleName));
  console.log('isCashier    :', isCashier(roleName));
  console.log('');
  console.log('Store rolePermissions entry for this role:',
    storeEntry ?? '⚠️  NOT FOUND — will fall back to DB granular perms');
  console.log('');
  console.log('Effective permissions per module:');
  console.table(permTable);
  console.log('');
  console.log('Raw DB permissions array:', dbPerms);
  console.groupEnd();
}

// ─── resolvePermission ────────────────────────────────────────────────────────

/**
 * Resolve granular CRUD permission for a module from the user's role.permissions array.
 * Falls back to AccessLevel-based inference when granular data is unavailable.
 */
function resolvePermission(
  user: ReturnType<typeof usePosStore.getState>['currentUser'],
  module: ModuleName,
  action: CrudAction,
  rolePermissions: Record<string, Record<ModuleName, AccessLevel>>
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user.role?.name)) return true;

  // 1. Granular: read directly from role.permissions (populated by login API)
  const perms: Permission[] | undefined = (user.role as any)?.permissions;
  if (Array.isArray(perms) && perms.length > 0) {
    // Case-insensitive module match — DB may store 'SERVICE' while code uses 'Service'
    const p = perms.find((p) => p.module?.toLowerCase() === module.toLowerCase());
    if (p) {
      if (action === 'read')   return p.canRead;
      if (action === 'create') return p.canCreate;
      if (action === 'update') return p.canUpdate;
      if (action === 'delete') return p.canDelete;
    }
    return false;
  }

  // 2. Fallback: infer from AccessLevel (store hardcoded map)
  const roleName = user.role?.name ?? '';
  const storePerms =
    rolePermissions[roleName] ??
    Object.entries(rolePermissions).find(
      ([k]) => k.toLowerCase() === roleName.toLowerCase()
    )?.[1];
  const level: AccessLevel = storePerms?.[module] ?? 'None';
  if (action === 'read')   return level === 'Read' || level === 'Full';
  if (action === 'delete') return level === 'Full';
  return level === 'Full'; // create / update
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth Hook
 * Provides a clean interface for accessing current user data and role permissions.
 *
 * Debug: open browser DevTools → Console → look for [useAuth] groups.
 * A full permission table is logged once whenever the logged-in user changes.
 */
export function useAuth() {
  const { currentUser, rolePermissions, currentBranch, setBranch, logout, login, branches } = usePosStore();

  // Log once per user identity change (userId + rolePermissions reference)
  const lastLoggedRef = useRef<string>('');
  useEffect(() => {
    const key = `${currentUser?.id ?? 'none'}::${Object.keys(rolePermissions).join(',')}`;
    if (key !== lastLoggedRef.current) {
      lastLoggedRef.current = key;
      logAuthState(currentUser, rolePermissions);
    }
  }, [currentUser, rolePermissions]);

  const auth = useMemo(() => {
    const roleName = currentUser?.role?.name;

    return {
      user: currentUser,
      branch: currentBranch,
      branches,
      role: roleName,
      
      // Role Helpers
      isSuperAdmin: isSuperAdmin(roleName),
      /** @deprecated use isSuperAdmin */
      isOwner: isSuperAdmin(roleName),
      isAdmin: isAdmin(roleName),
      isTechnician: isTechnician(roleName),
      isManager: isManager(roleName),
      isCashier: isCashier(roleName),

      /**
       * Coarse-grained check: does the user have at least `level` on `module`?
       * Use for page-level guards (Layout, AppSidebar).
       */
      canAccess: (module: ModuleName, level: AccessLevel = 'Read') => {
        return hasModuleAccess(currentUser, module, level, rolePermissions);
      },

      /**
       * Fine-grained CRUD check.
       * Use for button/field-level guards inside pages.
       */
      can: (module: ModuleName, action: CrudAction) => {
        return resolvePermission(currentUser, module, action, rolePermissions);
      },

      // Actions
      login,
      setBranch,
      logout,
    };
  }, [currentUser, rolePermissions, currentBranch, setBranch, logout, login, branches]);

  return auth;
}
