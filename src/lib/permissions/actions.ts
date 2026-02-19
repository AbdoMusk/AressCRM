/**
 * OMP Permission Actions
 *
 * Defines all permission action constants for the Object-Module-Processor engine.
 * These map to rows in the `permissions` table.
 */

export const Actions = {
  // Object operations
  OBJECT_CREATE: "object:create",
  OBJECT_READ: "object:read",
  OBJECT_READ_OWN: "object:read:own",
  OBJECT_UPDATE: "object:update",
  OBJECT_UPDATE_OWN: "object:update:own",
  OBJECT_DELETE: "object:delete",
  OBJECT_DELETE_OWN: "object:delete:own",

  // Relation operations
  RELATION_CREATE: "relation:create",
  RELATION_DELETE: "relation:delete",

  // Registry management (admin)
  MODULE_MANAGE: "module:manage",
  OBJECT_TYPE_MANAGE: "object_type:manage",

  // System
  DASHBOARD_VIEW: "dashboard:view",
  AUDIT_VIEW: "audit:view",
  ROLE_MANAGE: "role:manage",
  USER_MANAGE: "user:manage",
  SETTINGS_MANAGE: "settings:manage",
} as const;

export type Action = (typeof Actions)[keyof typeof Actions];

/**
 * Audit action constants used by auth service.
 */
export const AuditActions = {
  AUTH_LOGIN: "auth:login",
  AUTH_LOGIN_FAILED: "auth:login_failed",
  AUTH_SIGNUP: "auth:signup",
  AUTH_LOGOUT: "auth:logout",
} as const;
