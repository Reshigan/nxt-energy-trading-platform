import { Role, AdminLevel } from '../utils/types';

// Permission categories
export type Permission =
  | 'trading:full' | 'trading:view' | 'trading:carbon' | 'trading:bid'
  | 'contracts:full' | 'contracts:own' | 'contracts:view'
  | 'ipp:full' | 'ipp:view' | 'ipp:approve'
  | 'carbon:full' | 'carbon:view' | 'carbon:trade' | 'carbon:buy'
  | 'settlement:full' | 'settlement:own' | 'settlement:view' | 'settlement:metering'
  | 'admin:full'
  | 'admin:manage_staff' | 'admin:delete_users' | 'admin:edit_fees'
  | 'admin:manage_tenants' | 'admin:impersonate' | 'admin:halt_market'
  | 'admin:announcements' | 'admin:platform_config'
  | 'support:view_users' | 'support:reset_password' | 'support:unlock_account'
  | 'support:view_tickets' | 'support:respond_tickets'
  | 'participants:manage' | 'participants:view'
  | 'compliance:manage' | 'compliance:view'
  | 'marketplace:full' | 'marketplace:own' | 'marketplace:view';

// Role-permission matrix from spec
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'trading:full', 'contracts:full', 'ipp:full', 'carbon:full',
    'settlement:full', 'admin:full', 'participants:manage',
    'compliance:manage', 'marketplace:full',
  ],
  ipp: [
    'trading:view', 'contracts:own', 'ipp:full', 'carbon:view',
    'settlement:own', 'participants:view', 'compliance:view',
    'marketplace:own',
  ],
  trader: [
    'trading:full', 'contracts:own', 'ipp:view', 'carbon:trade',
    'settlement:own', 'participants:view', 'compliance:view',
    'marketplace:own',
  ],
  carbon_fund: [
    'trading:carbon', 'contracts:own', 'ipp:view', 'carbon:full',
    'settlement:own', 'participants:view', 'compliance:view',
    'marketplace:own',
  ],
  offtaker: [
    'trading:bid', 'contracts:own', 'ipp:view', 'carbon:buy',
    'settlement:own', 'participants:view', 'compliance:view',
    'marketplace:own',
  ],
  lender: [
    'trading:view', 'contracts:view', 'ipp:approve', 'carbon:view',
    'settlement:view', 'participants:view', 'compliance:view',
    'marketplace:view',
  ],
  grid: [
    'trading:view', 'contracts:own', 'ipp:view', 'carbon:view',
    'settlement:metering', 'participants:view', 'compliance:view',
    'marketplace:view',
  ],
  regulator: [
    'trading:view', 'contracts:view', 'ipp:view', 'carbon:view',
    'settlement:view', 'participants:view', 'compliance:manage',
    'marketplace:view',
  ],
  ipp_developer: [
    'trading:view', 'contracts:own', 'ipp:full', 'carbon:view',
    'settlement:own', 'participants:view', 'compliance:view',
    'marketplace:own',
  ],
  generator: [
    'trading:full', 'contracts:own', 'ipp:full', 'carbon:view',
    'settlement:metering', 'participants:view', 'compliance:view',
    'marketplace:own',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// Check if a role can access trading
export function canTrade(role: Role): boolean {
  return ['admin', 'trader', 'carbon_fund', 'offtaker', 'generator', 'ipp_developer'].includes(role);
}

// Check if a role can manage participants
export function canManageParticipants(role: Role): boolean {
  return role === 'admin';
}

// Check if a role can override statutory checks
export function canOverrideStatutory(role: Role): boolean {
  return role === 'admin';
}

// Admin level hierarchy: superadmin > admin > support
const ADMIN_LEVEL_RANK: Record<AdminLevel, number> = {
  superadmin: 3,
  admin: 2,
  support: 1,
};

/**
 * Check if a user's admin_level satisfies a required level.
 * superadmin satisfies all levels, admin satisfies admin+support, support only satisfies support.
 */
export function roleMatches(userLevel: AdminLevel | undefined, requiredLevel: AdminLevel): boolean {
  if (!userLevel) return false;
  return (ADMIN_LEVEL_RANK[userLevel] ?? 0) >= (ADMIN_LEVEL_RANK[requiredLevel] ?? 0);
}

/** Permissions for admin hierarchy levels */
const ADMIN_LEVEL_PERMISSIONS: Record<AdminLevel, Permission[]> = {
  superadmin: [
    'admin:full', 'admin:manage_staff', 'admin:delete_users', 'admin:edit_fees',
    'admin:manage_tenants', 'admin:impersonate', 'admin:halt_market',
    'admin:announcements', 'admin:platform_config',
    'support:view_users', 'support:reset_password', 'support:unlock_account',
    'support:view_tickets', 'support:respond_tickets',
  ],
  admin: [
    'admin:full', 'admin:edit_fees', 'admin:announcements', 'admin:platform_config',
    'support:view_users', 'support:reset_password', 'support:unlock_account',
    'support:view_tickets', 'support:respond_tickets',
  ],
  support: [
    'support:view_users', 'support:reset_password', 'support:unlock_account',
    'support:view_tickets', 'support:respond_tickets',
  ],
};

export function getAdminPermissions(level: AdminLevel): Permission[] {
  return ADMIN_LEVEL_PERMISSIONS[level] ?? [];
}

export function hasAdminPermission(level: AdminLevel | undefined, permission: Permission): boolean {
  if (!level) return false;
  return ADMIN_LEVEL_PERMISSIONS[level]?.includes(permission) ?? false;
}
