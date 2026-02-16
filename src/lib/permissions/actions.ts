/**
 * Permission action constants.
 * These map to rows in the `permissions` table.
 */
export const Actions = {
  // Lead actions
  LEAD_CREATE: "lead:create",
  LEAD_READ: "lead:read",
  LEAD_READ_OWN: "lead:read:own",
  LEAD_UPDATE: "lead:update",
  LEAD_UPDATE_OWN: "lead:update:own",
  LEAD_DELETE: "lead:delete",
  LEAD_MOVE: "lead:move",
  LEAD_MOVE_OWN: "lead:move:own",

  // Company actions
  COMPANY_CREATE: "company:create",
  COMPANY_READ: "company:read",
  COMPANY_READ_OWN: "company:read:own",
  COMPANY_UPDATE: "company:update",
  COMPANY_UPDATE_OWN: "company:update:own",
  COMPANY_DELETE: "company:delete",
  COMPANY_LEADS_READ: "company:leads:read",
  COMPANY_LEADS_READ_OWN: "company:leads:read:own",
  COMPANY_MEMBERS_MANAGE: "company:members:manage",

  // Dashboard
  DASHBOARD_VIEW: "dashboard:view",

  // Settings — Lead Statuses
  SETTINGS_STATUS_READ: "settings:status:read",
  SETTINGS_STATUS_CREATE: "settings:status:create",
  SETTINGS_STATUS_UPDATE: "settings:status:update",
  SETTINGS_STATUS_DELETE: "settings:status:delete",

  // Settings — Lead Sources
  SETTINGS_SOURCE_READ: "settings:source:read",
  SETTINGS_SOURCE_CREATE: "settings:source:create",
  SETTINGS_SOURCE_UPDATE: "settings:source:update",
  SETTINGS_SOURCE_DELETE: "settings:source:delete",

  // Admin
  USER_MANAGE: "user:manage",
  ROLE_MANAGE: "role:manage",
  AUDIT_VIEW: "audit:view",
} as const;

export type Action = (typeof Actions)[keyof typeof Actions];

/**
 * Audit-only actions — not permissions, just identifiers for audit_logs.
 * Never checked via requirePermission().
 */
export const AuditActions = {
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_LOGIN_FAILED: "auth:login_failed",
  AUTH_PASSWORD_RESET: "auth:password_reset",
  AUTH_SIGNUP: "auth:signup",
  PROFILE_UPDATE: "profile:update",
} as const;
