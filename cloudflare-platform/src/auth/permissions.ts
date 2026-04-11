import { Role } from '../utils/types';

// Permission categories
export type Permission =
  | 'trading:full' | 'trading:view' | 'trading:carbon' | 'trading:bid'
  | 'contracts:full' | 'contracts:own' | 'contracts:view'
  | 'ipp:full' | 'ipp:view' | 'ipp:approve'
  | 'carbon:full' | 'carbon:view' | 'carbon:trade' | 'carbon:buy'
  | 'settlement:full' | 'settlement:own' | 'settlement:view' | 'settlement:metering'
  | 'admin:full'
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
