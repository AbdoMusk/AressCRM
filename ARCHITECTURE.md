# Aress CRM — Architecture & Implementation Plan

**Stack:** Next.js 16 (App Router) · Supabase (Auth + Postgres + Realtime) · TypeScript  
**Date:** 14/02/2026

---

## Table of Contents

1. [Technology Wiring](#1-technology-wiring)
2. [Project Structure](#2-project-structure)
3. [Database Schema](#3-database-schema)
4. [RBAC Model](#4-rbac-model)
5. [Service Layer](#5-service-layer)
6. [Middleware & Permission Enforcement](#6-middleware--permission-enforcement)
7. [Audit Logging](#7-audit-logging)
8. [API Design](#8-api-design)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Realtime Sync](#10-realtime-sync)
11. [Security](#11-security)
12. [Testing Strategy](#12-testing-strategy)
13. [Delivery Plan](#13-delivery-plan)

---

## 1. Technology Wiring

### 1.1 Supabase Client Setup

Next.js 16 with App Router requires **three distinct Supabase client factories** using `@supabase/ssr` (NOT the deprecated `@supabase/auth-helpers-nextjs`).

#### Browser Client — `lib/supabase/client.ts`

Used exclusively in Client Components (`"use client"`).

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### Server Client — `lib/supabase/server.ts`

Used in Server Components, Server Actions, and Route Handlers. Reads/writes cookies via `next/headers`.

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore (cookies are read-only there).
            // The middleware will handle the refresh.
          }
        },
      },
    }
  );
}
```

#### Middleware Client — `lib/supabase/middleware.ts`

Used in `middleware.ts` to refresh the session on every request. This is the **session gate** — it ensures expired tokens are refreshed before they reach any page or API route.

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT call supabase.auth.getSession() — it doesn't
  // refresh the token. Always use getUser() which validates the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to /login (except public routes)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

#### Root Middleware — `middleware.ts`

```ts
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (static assets)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
```

### 1.2 Auth Callback Route — `app/auth/callback/route.ts`

Handles the OAuth/Magic Link redirect. Exchanges the `code` param for a session.

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

### 1.3 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # server-only, never exposed
```

### 1.4 Key Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.49.0",
    "@supabase/ssr": "^0.6.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^10.0.0",
    "recharts": "^2.15.0",
    "zod": "^3.24.0",
    "tailwindcss": "^4.0.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "supabase": "^2.15.0"
  }
}
```

---

## 2. Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout (Server Component)
│   ├── page.tsx                      # Redirect to /dashboard
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login page
│   │   └── layout.tsx                # Auth layout (no sidebar)
│   ├── (protected)/
│   │   ├── layout.tsx                # App shell: sidebar + topbar (Server Component)
│   │   ├── dashboard/page.tsx        # Dashboard
│   │   ├── leads/
│   │   │   ├── page.tsx              # Leads list (table view)
│   │   │   └── [id]/page.tsx         # Lead detail/edit
│   │   ├── pipeline/page.tsx         # Kanban board
│   │   └── settings/
│   │       ├── page.tsx              # Settings overview
│   │       ├── statuses/page.tsx     # Manage lead statuses
│   │       ├── sources/page.tsx      # Manage lead sources
│   │       └── roles/page.tsx        # Manage roles & permissions
│   ├── api/
│   │   ├── leads/
│   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   └── [id]/route.ts         # GET, PATCH, DELETE per lead
│   │   └── settings/
│   │       ├── statuses/route.ts     # CRUD lead statuses
│   │       └── sources/route.ts      # CRUD lead sources
│   └── auth/
│       └── callback/route.ts         # OAuth callback
│
├── modules/
│   ├── leads/
│   │   ├── services/
│   │   │   └── lead.service.ts       # Business logic for leads
│   │   ├── actions/
│   │   │   └── lead.actions.ts       # Server Actions (thin wrappers)
│   │   ├── components/
│   │   │   ├── LeadForm.tsx          # Create/Edit form
│   │   │   ├── LeadTable.tsx         # Table view
│   │   │   ├── LeadCard.tsx          # Kanban card
│   │   │   └── LeadFilters.tsx       # Filter controls
│   │   ├── hooks/
│   │   │   ├── useLeads.ts           # Client-side data hook
│   │   │   └── useLeadRealtime.ts    # Realtime subscription hook
│   │   ├── schemas/
│   │   │   └── lead.schema.ts        # Zod validation schemas
│   │   └── types/
│   │       └── lead.types.ts         # TypeScript interfaces
│   │
│   ├── pipeline/
│   │   ├── components/
│   │   │   ├── KanbanBoard.tsx       # Board container
│   │   │   └── KanbanColumn.tsx      # Status column
│   │   └── hooks/
│   │       └── usePipeline.ts        # Pipeline-specific logic
│   │
│   ├── dashboard/
│   │   ├── services/
│   │   │   └── dashboard.service.ts  # Aggregation queries
│   │   └── components/
│   │       ├── StatsCards.tsx         # KPI cards
│   │       ├── StatusChart.tsx        # Leads by status chart
│   │       └── MonthlyChart.tsx      # Monthly evolution chart
│   │
│   ├── auth/
│   │   ├── services/
│   │   │   └── auth.service.ts       # Auth logic + login/logout audit
│   │   ├── components/
│   │   │   └── LoginForm.tsx         # Login form
│   │   └── hooks/
│   │       └── useAuth.ts            # Auth state hook
│   │
│   └── settings/
│       ├── services/
│       │   ├── status.service.ts     # CRUD for lead_statuses
│       │   └── source.service.ts     # CRUD for lead_sources
│       ├── actions/
│       │   ├── status.actions.ts     # Server Actions for statuses
│       │   └── source.actions.ts     # Server Actions for sources
│       ├── components/
│       │   ├── StatusManager.tsx      # Status CRUD UI
│       │   └── SourceManager.tsx      # Source CRUD UI
│       ├── schemas/
│       │   └── settings.schema.ts    # Zod schemas for settings
│       └── types/
│           └── settings.types.ts     # TypeScript interfaces
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client factory
│   │   ├── server.ts                 # Server client factory
│   │   ├── middleware.ts             # Middleware client + session refresh
│   │   ├── admin.ts                  # Service-role client (admin ops)
│   │   └── database.types.ts         # Generated types (supabase gen types)
│   ├── permissions/
│   │   ├── rbac.ts                   # Permission checker
│   │   └── actions.ts                # Permission action constants
│   ├── audit/
│   │   └── logger.ts                 # Audit log writer
│   └── utils/
│       ├── errors.ts                 # AppError class + error codes
│       └── result.ts                 # Result<T, E> type for service returns
│
├── components/
│   └── ui/                           # Shared UI primitives (Button, Modal, etc.)
│
├── middleware.ts                      # Root Next.js middleware
└── types/
    └── global.d.ts                   # Global type augmentations
```

**Design rationale:**

- **`modules/`** follows **domain-driven grouping** — each feature owns its services, components, hooks, schemas, and types. This prevents cross-domain coupling and makes features independently portable.
- **`app/`** is thin — pages are composition shells that delegate to module components.
- **`lib/`** holds cross-cutting infrastructure (Supabase clients, RBAC, audit).
- Server Actions in `modules/*/actions/` are thin wrappers that validate input → check permissions → call services → log audit.

---

## 3. Database Schema

### 3.1 Entity Relationship

```
auth.users (Supabase managed)
    │
    ├──< profiles (1:1)
    │       │
    │       ├──< user_roles (M:M with roles)
    │       │       │
    │       │       └──> roles
    │       │              │
    │       │              └──< role_permissions (M:M with permissions)
    │       │                      │
    │       │                      └──> permissions
    │       │
    │       └──< leads (1:M — assigned_to / created_by)
    │               │
    │               ├──> lead_statuses (M:1 — dynamic lookup)
    │               │
    │               └──> lead_sources  (M:1 — dynamic lookup)
    │
    └──< audit_logs (1:M — actor; tracks ALL platform actions)

lead_statuses   (dynamic lookup table — CRUD at runtime)
lead_sources    (dynamic lookup table — CRUD at runtime)
```

> **Design decision:** `lead_statuses`, `lead_sources`, and `roles` are **not** Postgres enums.
> They are first-class tables with full CRUD. Any configurable value on the platform
> (statuses, sources, roles, permissions) can be created, updated, or deleted at runtime
> through the settings UI without a migration.

### 3.2 SQL Definitions

```sql
-- ============================================================
-- DYNAMIC LOOKUP TABLES (replace static enums)
-- ============================================================

-- Lead statuses — fully dynamic, managed via settings UI.
-- `position` controls display order (Kanban column order, dropdowns).
-- `is_win` / `is_loss` flags let the dashboard compute conversion rates
-- without hardcoding status names.
CREATE TABLE lead_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,          -- display label: 'New', 'Contacted', …
  slug        TEXT NOT NULL UNIQUE,          -- machine key: 'new', 'contacted', …
  color       TEXT DEFAULT '#6B7280',        -- hex color for Kanban column / badge
  position    INT  NOT NULL DEFAULT 0,       -- ordering index
  is_win      BOOLEAN NOT NULL DEFAULT false,-- marks terminal "won" statuses
  is_loss     BOOLEAN NOT NULL DEFAULT false,-- marks terminal "lost" statuses
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead sources — fully dynamic.
CREATE TABLE lead_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,          -- display label: 'LinkedIn', 'Referral', …
  slug        TEXT NOT NULL UNIQUE,          -- machine key: 'linkedin', 'referral', …
  icon        TEXT,                          -- optional icon identifier
  position    INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROLES & PERMISSIONS (RBAC)
-- ============================================================
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,       -- 'admin', 'manager', 'sales_rep'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL UNIQUE,       -- 'lead:create', 'lead:update', etc.
  description TEXT
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id  UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  company      TEXT,
  source_id    UUID NOT NULL REFERENCES lead_sources(id),
  status_id    UUID NOT NULL REFERENCES lead_statuses(id),
  notes        TEXT,
  assigned_to  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   UUID NOT NULL REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS — platform-wide, not just leads
-- ============================================================
-- Tracks EVERY sensitive action: auth events, data mutations,
-- settings changes, role/permission changes, profile updates.
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),            -- NULL for system events (e.g., failed login before profile exists)
  action      TEXT NOT NULL,                           -- e.g., 'auth:login', 'lead:create', 'settings:status:delete'
  category    TEXT NOT NULL DEFAULT 'data',            -- 'auth' | 'data' | 'settings' | 'admin' — for filtering
  entity_type TEXT,                                    -- 'lead', 'profile', 'lead_status', 'role', NULL for auth events
  entity_id   UUID,                                    -- ID of affected record (NULL for auth events)
  old_values  JSONB,                                   -- snapshot before change
  new_values  JSONB,                                   -- snapshot after change
  metadata    JSONB DEFAULT '{}'::jsonb,               -- IP address, user agent, session ID, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
-- Leads: most common queries are by status, assigned user, and creation date
CREATE INDEX idx_leads_status ON leads(status_id);
CREATE INDEX idx_leads_source ON leads(source_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_created_by ON leads(created_by);

-- Lookup tables: ordering
CREATE INDEX idx_lead_statuses_position ON lead_statuses(position);
CREATE INDEX idx_lead_sources_position ON lead_sources(position);

-- Audit logs: query by entity, user, category, and time
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RBAC: permission lookups
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_lead_statuses_updated_at
  BEFORE UPDATE ON lead_statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_lead_sources_updated_at
  BEFORE UPDATE ON lead_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.3 Seed Data — Statuses, Sources, Roles & Permissions

```sql
-- ============================================================
-- DEFAULT LEAD STATUSES
-- ============================================================
INSERT INTO lead_statuses (name, slug, color, position, is_win, is_loss) VALUES
  ('New',         'new',         '#3B82F6', 0, false, false),
  ('Contacted',   'contacted',   '#8B5CF6', 1, false, false),
  ('Interested',  'interested',  '#F59E0B', 2, false, false),
  ('Negotiation', 'negotiation', '#F97316', 3, false, false),
  ('Won',         'won',         '#10B981', 4, true,  false),
  ('Lost',        'lost',        '#EF4444', 5, false, true);

-- ============================================================
-- DEFAULT LEAD SOURCES
-- ============================================================
INSERT INTO lead_sources (name, slug, position) VALUES
  ('LinkedIn',   'linkedin',   0),
  ('Referral',   'referral',   1),
  ('Cold Call',  'cold_call',  2),
  ('Website',    'website',    3),
  ('Event',      'event',      4),
  ('Other',      'other',      5);

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (name, description) VALUES
  ('admin',     'Full system access'),
  ('manager',   'Manage leads and view dashboard'),
  ('sales_rep', 'Create and edit own leads');

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO permissions (action, description) VALUES
  -- Lead actions
  ('lead:create',     'Create a new lead'),
  ('lead:read',       'View leads'),
  ('lead:update',     'Edit any lead'),
  ('lead:update:own', 'Edit only own leads'),
  ('lead:delete',     'Delete any lead'),
  ('lead:move',       'Change lead status'),
  -- Dashboard
  ('dashboard:view',  'View dashboard analytics'),
  -- Settings (lookup tables)
  ('settings:status:read',   'View lead statuses'),
  ('settings:status:create', 'Create lead statuses'),
  ('settings:status:update', 'Edit lead statuses'),
  ('settings:status:delete', 'Delete lead statuses'),
  ('settings:source:read',   'View lead sources'),
  ('settings:source:create', 'Create lead sources'),
  ('settings:source:update', 'Edit lead sources'),
  ('settings:source:delete', 'Delete lead sources'),
  -- Admin
  ('user:manage',     'Manage users and roles'),
  ('role:manage',     'Create/edit/delete roles and permissions'),
  ('audit:view',      'View audit logs');

-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

-- Manager — leads + dashboard + settings (read) + audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.action IN (
    'lead:create','lead:read','lead:update','lead:delete','lead:move',
    'dashboard:view','audit:view',
    'settings:status:read','settings:source:read'
  );

-- Sales rep — own leads + dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep'
  AND p.action IN (
    'lead:create','lead:read','lead:update:own','lead:move',
    'dashboard:view',
    'settings:status:read','settings:source:read'
  );
```

---

## 4. RBAC Model

### 4.1 Permission Action Constants — `lib/permissions/actions.ts`

```ts
export const Actions = {
  // Lead actions
  LEAD_CREATE:     "lead:create",
  LEAD_READ:       "lead:read",
  LEAD_UPDATE:     "lead:update",
  LEAD_UPDATE_OWN: "lead:update:own",
  LEAD_DELETE:     "lead:delete",
  LEAD_MOVE:       "lead:move",

  // Dashboard
  DASHBOARD_VIEW:  "dashboard:view",

  // Settings — Lead Statuses
  SETTINGS_STATUS_READ:   "settings:status:read",
  SETTINGS_STATUS_CREATE: "settings:status:create",
  SETTINGS_STATUS_UPDATE: "settings:status:update",
  SETTINGS_STATUS_DELETE: "settings:status:delete",

  // Settings — Lead Sources
  SETTINGS_SOURCE_READ:   "settings:source:read",
  SETTINGS_SOURCE_CREATE: "settings:source:create",
  SETTINGS_SOURCE_UPDATE: "settings:source:update",
  SETTINGS_SOURCE_DELETE: "settings:source:delete",

  // Admin
  USER_MANAGE:     "user:manage",
  ROLE_MANAGE:     "role:manage",
  AUDIT_VIEW:      "audit:view",
} as const;

export type Action = (typeof Actions)[keyof typeof Actions];

/**
 * Audit-only actions — these are not permissions but action identifiers
 * used exclusively in audit_logs for tracking auth / system events.
 * They are never checked via requirePermission().
 */
export const AuditActions = {
  AUTH_LOGIN:          "auth:login",
  AUTH_LOGOUT:         "auth:logout",
  AUTH_LOGIN_FAILED:   "auth:login_failed",
  AUTH_PASSWORD_RESET: "auth:password_reset",
  AUTH_SIGNUP:         "auth:signup",
  PROFILE_UPDATE:      "profile:update",
} as const;
```

### 4.2 Permission Checker — `lib/permissions/rbac.ts`

```ts
import { createClient } from "@/lib/supabase/server";
import type { Action } from "./actions";

export interface AuthContext {
  userId: string;
  permissions: Set<string>;
}

/**
 * Loads the authenticated user's permissions from the database.
 * Designed to be called once per request and passed through the call chain.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Single query joining user_roles → role_permissions → permissions
  const { data: perms } = await supabase
    .from("user_roles")
    .select("roles:role_id ( role_permissions ( permissions:permission_id ( action ) ) )")
    .eq("user_id", user.id);

  const permissions = new Set<string>();
  perms?.forEach((ur: any) => {
    ur.roles?.role_permissions?.forEach((rp: any) => {
      if (rp.permissions?.action) permissions.add(rp.permissions.action);
    });
  });

  return { userId: user.id, permissions };
}

/**
 * Checks if the auth context has a specific permission.
 */
export function hasPermission(ctx: AuthContext, action: Action): boolean {
  return ctx.permissions.has(action);
}

/**
 * Throws if permission is missing. Used as a guard at the top of service methods.
 */
export function requirePermission(ctx: AuthContext, action: Action): void {
  if (!hasPermission(ctx, action)) {
    throw new AppError("FORBIDDEN", `Missing permission: ${action}`);
  }
}
```

### 4.3 How It's Used

Every server action / route handler follows this pattern:

```
Request → getAuthContext() → requirePermission(ctx, action) → service.method(ctx, data) → auditLog(ctx, ...)
```

Permissions are checked **per action, not per route**. A single route can require different permissions depending on the operation.

---

## 5. Service Layer

### 5.1 Design Principles

- Services are **plain async functions** grouped in modules — no classes (keeps tree-shaking friendly).
- Services receive `AuthContext` as first argument — they never import auth directly.
- Services return `Result<T>` or throw `AppError` on failure.
- Services handle **only business logic** — no HTTP concerns (status codes, headers).
- Services call `auditLog()` after successful mutations.

### 5.2 Result Type — `lib/utils/result.ts`

```ts
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### 5.3 Lead Service — `modules/leads/services/lead.service.ts`

```ts
import { createClient } from "@/lib/supabase/server";
import { requirePermission, type AuthContext } from "@/lib/permissions/rbac";
import { Actions } from "@/lib/permissions/actions";
import { auditLog } from "@/lib/audit/logger";
import { leadCreateSchema, leadUpdateSchema } from "../schemas/lead.schema";
import type { LeadInsert, LeadUpdate, LeadRow } from "../types/lead.types";

export async function getLeads(ctx: AuthContext): Promise<LeadRow[]> {
  requirePermission(ctx, Actions.LEAD_READ);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*, assigned_to_profile:assigned_to(full_name), created_by_profile:created_by(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw new AppError("DB_ERROR", error.message);
  return data;
}

export async function createLead(ctx: AuthContext, input: LeadInsert): Promise<LeadRow> {
  requirePermission(ctx, Actions.LEAD_CREATE);
  const validated = leadCreateSchema.parse(input);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...validated, created_by: ctx.userId })
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.LEAD_CREATE,
    entityType: "lead",
    entityId: data.id,
    newValues: data,
  });

  return data;
}

export async function updateLead(
  ctx: AuthContext,
  id: string,
  input: LeadUpdate
): Promise<LeadRow> {
  // Fetch existing to check ownership and capture old values
  const supabase = await createClient();
  const { data: existing } = await supabase.from("leads").select().eq("id", id).single();
  if (!existing) throw new AppError("NOT_FOUND", "Lead not found");

  // Permission check: need lead:update OR (lead:update:own AND ownership)
  const canUpdateAny = ctx.permissions.has(Actions.LEAD_UPDATE);
  const canUpdateOwn = ctx.permissions.has(Actions.LEAD_UPDATE_OWN) && existing.created_by === ctx.userId;
  if (!canUpdateAny && !canUpdateOwn) {
    throw new AppError("FORBIDDEN", "Cannot update this lead");
  }

  const validated = leadUpdateSchema.parse(input);

  const { data, error } = await supabase
    .from("leads")
    .update(validated)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.LEAD_UPDATE,
    entityType: "lead",
    entityId: id,
    oldValues: existing,
    newValues: data,
  });

  return data;
}

export async function updateLeadStatus(
  ctx: AuthContext,
  id: string,
  status: string
): Promise<LeadRow> {
  requirePermission(ctx, Actions.LEAD_MOVE);
  return updateLead(ctx, id, { status } as LeadUpdate);
}

export async function deleteLead(ctx: AuthContext, id: string): Promise<void> {
  requirePermission(ctx, Actions.LEAD_DELETE);
  const supabase = await createClient();

  const { data: existing } = await supabase.from("leads").select().eq("id", id).single();
  if (!existing) throw new AppError("NOT_FOUND", "Lead not found");

  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new AppError("DB_ERROR", error.message);

  await auditLog(ctx, {
    action: Actions.LEAD_DELETE,
    entityType: "lead",
    entityId: id,
    oldValues: existing,
  });
}
```

### 5.4 Dashboard Service — `modules/dashboard/services/dashboard.service.ts`

```ts
export async function getDashboardStats(ctx: AuthContext) {
  requirePermission(ctx, Actions.DASHBOARD_VIEW);
  const supabase = await createClient();

  // Total leads
  const { count: total } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  // Leads by status
  const { data: byStatus } = await supabase
    .rpc("leads_count_by_status");   // Postgres function for grouped count

  // Conversion rate: uses is_win/is_loss flags from dynamic statuses
  const won = byStatus?.filter((s: any) => s.is_win).reduce((sum: number, s: any) => sum + Number(s.count), 0) ?? 0;
  const lost = byStatus?.filter((s: any) => s.is_loss).reduce((sum: number, s: any) => sum + Number(s.count), 0) ?? 0;
  const conversionRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;

  // Monthly evolution (last 12 months)
  const { data: monthly } = await supabase.rpc("leads_monthly_evolution");

  return {
    total: total ?? 0,
    byStatus: byStatus ?? [],
    conversionRate: Math.round(conversionRate * 10) / 10,
    monthly: monthly ?? [],
  };
}
```

Supporting Postgres functions (join dynamic lookup tables instead of using enums):

```sql
-- Leads grouped by status — joins lead_statuses for display name, color, and order.
-- Uses is_win/is_loss flags for dashboard conversion calculations.
CREATE OR REPLACE FUNCTION leads_count_by_status()
RETURNS TABLE(status_id UUID, name TEXT, slug TEXT, color TEXT, is_win BOOLEAN, is_loss BOOLEAN, count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    ls.id AS status_id,
    ls.name,
    ls.slug,
    ls.color,
    ls.is_win,
    ls.is_loss,
    COUNT(l.id)
  FROM lead_statuses ls
  LEFT JOIN leads l ON l.status_id = ls.id
  GROUP BY ls.id, ls.name, ls.slug, ls.color, ls.is_win, ls.is_loss, ls.position
  ORDER BY ls.position;
$$;

-- Monthly lead creation (last 12 months)
CREATE OR REPLACE FUNCTION leads_monthly_evolution()
RETURNS TABLE(month TEXT, count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
    COUNT(*)
  FROM leads
  WHERE created_at >= date_trunc('month', now()) - INTERVAL '11 months'
  GROUP BY date_trunc('month', created_at)
  ORDER BY date_trunc('month', created_at);
$$;
```

---

## 6. Middleware & Permission Enforcement

### 6.1 Two Layers of Enforcement

| Layer | Purpose | Where |
|-------|---------|-------|
| **Next.js Middleware** (`middleware.ts`) | Session refresh + auth redirect | Edge — runs before every request |
| **Service-level guards** (`requirePermission`) | Granular RBAC per action | Server — inside each service call |

The Next.js middleware does NOT check permissions — it only ensures a valid session exists. Permission checks happen inside the service layer, **per action**, which is more granular and testable.

### 6.2 Server Actions as Thin Wrappers — `modules/leads/actions/lead.actions.ts`

Server Actions are the "controllers" — they orchestrate auth → validation → service → response.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as leadService from "../services/lead.service";
import type { LeadInsert, LeadUpdate } from "../types/lead.types";

export async function createLeadAction(input: LeadInsert) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const lead = await leadService.createLead(ctx, input);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return lead;
}

export async function updateLeadAction(id: string, input: LeadUpdate) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const lead = await leadService.updateLead(ctx, id, input);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return lead;
}

export async function moveLeadAction(id: string, status: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  const lead = await leadService.updateLeadStatus(ctx, id, status);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return lead;
}

export async function deleteLeadAction(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");

  await leadService.deleteLead(ctx, id);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}
```

---

## 7. Audit Logging

Audit logs are **platform-wide**. Every sensitive action is logged — not just lead mutations but auth events, settings changes, role/permission changes, profile updates, and any administrative operation.

### 7.1 Audit Logger — `lib/audit/logger.ts`

```ts
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthContext } from "@/lib/permissions/rbac";

type AuditCategory = "auth" | "data" | "settings" | "admin";

interface AuditEntry {
  action: string;                    // e.g., 'auth:login', 'lead:create', 'settings:status:delete'
  category: AuditCategory;           // for filtering in the audit viewer UI
  entityType?: string;               // 'lead', 'lead_status', 'role', 'profile', etc.
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;    // IP, user agent, session ID, etc.
}

/**
 * Log an audit entry for an authenticated user action.
 */
export async function auditLog(ctx: AuthContext, entry: AuditEntry): Promise<void> {
  const supabase = await createClient();

  await supabase.from("audit_logs").insert({
    user_id: ctx.userId,
    action: entry.action,
    category: entry.category,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    old_values: entry.oldValues ?? null,
    new_values: entry.newValues ?? null,
    metadata: entry.metadata ?? {},
  });
}

/**
 * Log an audit entry for system / unauthenticated events (e.g., failed login).
 * Uses the service-role client to bypass RLS.
 */
export async function auditLogSystem(entry: AuditEntry & { userId?: string }): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("audit_logs").insert({
    user_id: entry.userId ?? null,
    action: entry.action,
    category: entry.category,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    old_values: entry.oldValues ?? null,
    new_values: entry.newValues ?? null,
    metadata: entry.metadata ?? {},
  });
}
```

### 7.2 What Gets Logged

Audit logging covers **every category of sensitive platform action**:

#### Auth Events (category: `auth`)

| Action | Entity | Old Values | New Values | Metadata |
|--------|--------|------------|------------|----------|
| `auth:login` | — | — | `{ method: 'email' }` | IP, user agent |
| `auth:logout` | — | — | — | session duration |
| `auth:login_failed` | — | — | `{ email: '...' }` | IP, user agent, reason |
| `auth:signup` | profile | — | `{ email, full_name }` | IP |
| `auth:password_reset` | — | — | — | IP |

#### Data Mutations (category: `data`)

| Action | Entity | Old Values | New Values |
|--------|--------|------------|------------|
| `lead:create` | lead | — | full lead record |
| `lead:update` | lead | previous state | new state |
| `lead:move` | lead | `{ status_id: '...' }` | `{ status_id: '...' }` |
| `lead:delete` | lead | full lead record | — |

#### Settings Changes (category: `settings`)

| Action | Entity | Old Values | New Values |
|--------|--------|------------|------------|
| `settings:status:create` | lead_status | — | `{ name, slug, color }` |
| `settings:status:update` | lead_status | previous state | new state |
| `settings:status:delete` | lead_status | full record | — |
| `settings:source:create` | lead_source | — | `{ name, slug }` |
| `settings:source:update` | lead_source | previous state | new state |
| `settings:source:delete` | lead_source | full record | — |

#### Admin Actions (category: `admin`)

| Action | Entity | Old Values | New Values |
|--------|--------|------------|------------|
| `role:create` | role | — | `{ name, permissions }` |
| `role:update` | role | previous permissions | new permissions |
| `role:delete` | role | full record | — |
| `user:role_assign` | user_role | — | `{ user_id, role_id }` |
| `user:role_revoke` | user_role | `{ user_id, role_id }` | — |
| `profile:update` | profile | previous state | new state |

### 7.3 Auth Event Logging

Auth events are captured via a Supabase **Auth Hook** (webhook) or by wrapping the login/logout flows in the auth service:

```ts
// modules/auth/services/auth.service.ts
import { createClient } from "@/lib/supabase/server";
import { auditLog, auditLogSystem } from "@/lib/audit/logger";
import { AuditActions } from "@/lib/permissions/actions";

export async function signIn(email: string, password: string, meta: { ip?: string; userAgent?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Log failed login — no auth context, use system logger
    await auditLogSystem({
      action: AuditActions.AUTH_LOGIN_FAILED,
      category: "auth",
      newValues: { email },
      metadata: { ip: meta.ip, userAgent: meta.userAgent, reason: error.message },
    });
    throw new AppError("UNAUTHORIZED", "Invalid credentials");
  }

  // Log successful login
  await auditLogSystem({
    userId: data.user.id,
    action: AuditActions.AUTH_LOGIN,
    category: "auth",
    newValues: { method: "email" },
    metadata: { ip: meta.ip, userAgent: meta.userAgent },
  });

  return data;
}

export async function signOut(ctx: AuthContext) {
  const supabase = await createClient();

  await auditLog(ctx, {
    action: AuditActions.AUTH_LOGOUT,
    category: "auth",
  });

  await supabase.auth.signOut();
}
```

---

## 8. API Design

### 8.1 Route Handlers (REST endpoints)

Used for programmatic access or external integrations. Server Actions are preferred for forms.

```
# Leads
GET    /api/leads          → List leads (paginated, filterable)
POST   /api/leads          → Create a lead
GET    /api/leads/:id      → Get lead by ID
PATCH  /api/leads/:id      → Update lead
DELETE /api/leads/:id      → Delete lead

# Dashboard
GET    /api/dashboard      → Get dashboard stats

# Settings — dynamic lookup tables
GET    /api/settings/statuses       → List lead statuses (ordered)
POST   /api/settings/statuses       → Create a lead status
PATCH  /api/settings/statuses/:id   → Update a lead status
DELETE /api/settings/statuses/:id   → Delete a lead status
GET    /api/settings/sources        → List lead sources (ordered)
POST   /api/settings/sources        → Create a lead source
PATCH  /api/settings/sources/:id    → Update a lead source
DELETE /api/settings/sources/:id    → Delete a lead source

# Audit
GET    /api/audit          → List audit logs (paginated, filterable by category)
```

#### Example: `app/api/leads/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/permissions/rbac";
import * as leadService from "@/modules/leads/services/lead.service";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leads = await leadService.getLeads(ctx);
    return NextResponse.json({ data: leads });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const lead = await leadService.createLead(ctx, body);
    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

function handleApiError(err: unknown) {
  if (err instanceof AppError) {
    const statusMap = { FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION: 422, DB_ERROR: 500 };
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: statusMap[err.code] ?? 500 }
    );
  }
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
```

### 8.2 Server Actions vs Route Handlers

| Mechanism | Use Case |
|-----------|----------|
| **Server Actions** | Form submissions, UI mutations (create/update/delete lead, move status) |
| **Route Handlers** | External API access, webhook endpoints, data fetching for client components |

Server Actions are the **primary mutation path** — they integrate with `revalidatePath` and `useActionState`.

---

## 9. Frontend Architecture

### 9.1 Data Fetching Strategy

| Context | Method | Example |
|---------|--------|---------|
| **Server Component (page)** | Direct service call via `createClient()` | Dashboard stats, lead list (initial load) |
| **Client Component (mutation)** | Server Action via `useActionState` | Create/edit/delete lead |
| **Client Component (realtime)** | Supabase browser client subscription | Kanban board live updates |

#### Server Component Fetching (Dashboard Page)

```tsx
// app/(protected)/dashboard/page.tsx — Server Component
import { getAuthContext } from "@/lib/permissions/rbac";
import { getDashboardStats } from "@/modules/dashboard/services/dashboard.service";
import { StatsCards } from "@/modules/dashboard/components/StatsCards";
import { StatusChart } from "@/modules/dashboard/components/StatusChart";
import { MonthlyChart } from "@/modules/dashboard/components/MonthlyChart";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const stats = await getDashboardStats(ctx);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <StatsCards total={stats.total} conversionRate={stats.conversionRate} byStatus={stats.byStatus} />
      <div className="grid grid-cols-2 gap-6">
        <StatusChart data={stats.byStatus} />
        <MonthlyChart data={stats.monthly} />
      </div>
    </div>
  );
}
```

### 9.2 Kanban Board — Client Component with Realtime

```tsx
// modules/pipeline/components/KanbanBoard.tsx
"use client";

import { useEffect, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";
import { moveLeadAction } from "@/modules/leads/actions/lead.actions";
import { KanbanColumn } from "./KanbanColumn";
import type { LeadRow } from "@/modules/leads/types/lead.types";

// Statuses are fetched from the database — not hardcoded.
// The server page queries lead_statuses ordered by `position`
// and passes them as a prop.
interface StatusColumn {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
}

interface Props {
  initialLeads: LeadRow[];
  statuses: StatusColumn[];   // dynamic — from lead_statuses table
}

export function KanbanBoard({ initialLeads, statuses }: Props) {
  const [leads, setLeads] = useState(initialLeads);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLeads((prev) => [payload.new as LeadRow, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((l) => (l.id === payload.new.id ? (payload.new as LeadRow) : l))
            );
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;

    const newStatusId = over.id as string;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status_id: newStatusId } : l))
    );

    try {
      await moveLeadAction(leadId, newStatusId);
    } catch {
      // Revert on failure — realtime will also reconcile
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? initialLeads.find((il) => il.id === leadId)! : l))
      );
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            leads={leads.filter((l) => l.status_id === status.id)}
          />
        ))}
      </div>
    </DndContext>
  );
}
```

### 9.3 How User Data Is Fetched Without Breaking Caching

In Next.js 16 App Router, user-specific data must be fetched in **Server Components using cookies**, which makes the route **dynamically rendered** (not cached). This is correct and expected for authenticated pages.

```
(protected)/layout.tsx → getAuthContext() → passes userId, permissions down via props or context
```

We do NOT put user data in `generateStaticParams` or try to cache it. Authenticated pages are always dynamic.

For data that is shared across users but **dynamic** (e.g., lead_statuses, lead_sources), fetch it server-side per request (they are small tables, ~10 rows). Use `unstable_cache` with a short revalidation if needed, but **never hardcode these values** — always query the lookup tables.

Lookup data is passed from Server Components to Client Components as props:

```tsx
// app/(protected)/pipeline/page.tsx — Server Component
const supabase = await createClient();
const { data: statuses } = await supabase.from("lead_statuses").select().order("position");
const { data: leads } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

return <KanbanBoard initialLeads={leads} statuses={statuses} />;
```

---

## 10. Realtime Sync

### 10.1 Supabase Realtime Setup

Realtime is enabled per-table in the Supabase dashboard (or via migration):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_sources;
```

Subscribing to `lead_statuses` and `lead_sources` ensures that when an admin renames a status or changes its color, all connected clients see the update instantly (e.g., Kanban column headers update without refresh).

### 10.2 Subscription Pattern

All realtime subscriptions follow a reusable hook pattern:

```ts
// modules/leads/hooks/useLeadRealtime.ts
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeadRow } from "../types/lead.types";

type LeadChangeHandler = {
  onInsert?: (lead: LeadRow) => void;
  onUpdate?: (lead: LeadRow) => void;
  onDelete?: (oldLead: Partial<LeadRow>) => void;
};

export function useLeadRealtime(handlers: LeadChangeHandler) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("leads-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (p) => {
        handlers.onInsert?.(p.new as LeadRow);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, (p) => {
        handlers.onUpdate?.(p.new as LeadRow);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "leads" }, (p) => {
        handlers.onDelete?.(p.old as Partial<LeadRow>);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);  // stable — handlers should be memoized by the consumer
}
```

### 10.3 Consistency Model

```
User drags card → optimistic UI update → Server Action → DB write → Supabase realtime event → all connected clients update
```

- **Optimistic updates** in the initiating client for instant feedback.
- **Realtime broadcast** to all other connected clients.
- **Revert on error** if the Server Action fails (the optimistic state is rolled back).

---

## 11. Security

### 11.1 Row-Level Security (RLS)

RLS is the **last line of defense** — even if application code has a bug, the database itself enforces access.

```sql
-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

-- Leads: authenticated users can read all leads
CREATE POLICY "Authenticated users can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Leads: users can insert leads (created_by = their ID)
CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Leads: users can update leads assigned to them or created by them
-- (Broader admin updates are enforced at the app level via RBAC, 
--  but RLS ensures no one touches data without being authenticated)
CREATE POLICY "Users can update own or assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (true);

-- Leads: only creators can delete (admin override via service role)
CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Profiles: users can read all profiles
CREATE POLICY "Users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Profiles: users can update own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Audit logs: readable by authenticated users (filtered by role in app layer)
CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- Audit logs: insert only (no update/delete)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Lead statuses / sources: readable by all authenticated users
CREATE POLICY "Authenticated users can read lead statuses"
  ON lead_statuses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read lead sources"
  ON lead_sources FOR SELECT TO authenticated USING (true);

-- Lead statuses / sources: mutations restricted to service role
-- (app-level RBAC enforces who can manage settings;
--  RLS ensures only admin client can write)
CREATE POLICY "Service role manages lead statuses"
  ON lead_statuses FOR ALL TO service_role USING (true);

CREATE POLICY "Service role manages lead sources"
  ON lead_sources FOR ALL TO service_role USING (true);
```

**Note:** For admin operations that bypass RLS (e.g., admin deleting any lead), use the **Supabase service role client** (`lib/supabase/admin.ts`) — this client bypasses RLS entirely. It is only used on the server for admin-escalated operations.

```ts
// lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

### 11.2 Session Security

- **Middleware** refreshes tokens on every request (via `supabase.auth.getUser()`).
- **Never use `getSession()`** on the server — it reads from client-provided cookies without validating the JWT. Always use `getUser()` which makes a round-trip to Supabase Auth.
- **HTTP-only cookies** are used for session storage (handled by `@supabase/ssr` automatically).

### 11.3 Input Validation

All inputs are validated with **Zod schemas** before touching the database:

```ts
// modules/leads/schemas/lead.schema.ts
import { z } from "zod";

// source_id and status_id are UUIDs referencing dynamic lookup tables —
// no hardcoded enum values. The UI populates dropdowns by fetching
// from lead_statuses / lead_sources tables.
export const leadCreateSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  source_id: z.string().uuid(),
  status_id: z.string().uuid(),
  notes: z.string().max(5000).optional(),
  assigned_to: z.string().uuid().optional(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

// Settings schemas — for managing lookup tables
export const statusCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6B7280"),
  position: z.number().int().min(0),
  is_win: z.boolean().default(false),
  is_loss: z.boolean().default(false),
});

export const sourceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  icon: z.string().max(50).optional(),
  position: z.number().int().min(0),
});
```

---

## 12. Testing Strategy

### 12.1 Test Pyramid

```
              ┌─────────┐
              │   E2E   │   Playwright (critical paths only)
              ├─────────┤
          ┌───┤  Integ  │   Vitest + Supabase local (API route tests)
          │   ├─────────┤
      ┌───┤   │  Unit   │   Vitest (services, RBAC, schemas, utils)
      │   │   └─────────┘
```

### 12.2 Unit Tests — Services

Test services by mocking the Supabase client:

```ts
// modules/leads/services/__tests__/lead.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { createLead } from "../lead.service";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "uuid-1", name: "Test Lead", status: "new" },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe("createLead", () => {
  it("creates a lead with valid input", async () => {
    const ctx = { userId: "user-1", permissions: new Set(["lead:create"]) };
    const result = await createLead(ctx, {
      name: "Test Lead",
      source: "linkedin",
    });

    expect(result.id).toBe("uuid-1");
    expect(result.status).toBe("new");
  });

  it("throws FORBIDDEN without lead:create permission", async () => {
    const ctx = { userId: "user-1", permissions: new Set([]) };
    await expect(createLead(ctx, { name: "X", source: "linkedin" }))
      .rejects.toThrow("Missing permission");
  });
});
```

### 12.3 Unit Tests — RBAC

```ts
// lib/permissions/__tests__/rbac.test.ts
describe("hasPermission", () => {
  it("returns true when permission exists", () => {
    const ctx = { userId: "u1", permissions: new Set(["lead:create", "lead:read"]) };
    expect(hasPermission(ctx, "lead:create")).toBe(true);
  });

  it("returns false when permission missing", () => {
    const ctx = { userId: "u1", permissions: new Set(["lead:read"]) };
    expect(hasPermission(ctx, "lead:delete")).toBe(false);
  });
});
```

### 12.4 Integration Tests — API Routes

Use Supabase CLI's local dev environment (`supabase start`) for integration tests against a real database:

```ts
// app/api/leads/__tests__/route.integration.test.ts
import { describe, it, expect, beforeAll } from "vitest";

describe("GET /api/leads", () => {
  it("returns 401 without session", async () => {
    const res = await fetch("http://localhost:3000/api/leads");
    expect(res.status).toBe(401);
  });
});
```

### 12.5 Schema Validation Tests

```ts
// modules/leads/schemas/__tests__/lead.schema.test.ts
describe("leadCreateSchema", () => {
  it("rejects empty name", () => {
    expect(() => leadCreateSchema.parse({ name: "", source: "linkedin" })).toThrow();
  });

  it("accepts valid input", () => {
    const result = leadCreateSchema.parse({ name: "John", source: "linkedin" });
    expect(result.status).toBe("new"); // default
  });
});
```

---

## 13. Delivery Plan

### Phase 1: Foundation (Day 1 — Feb 14)

| # | Task | Output |
|---|------|--------|
| 1.1 | Initialize Next.js 16 project with TypeScript, Tailwind v4 | Boilerplate running |
| 1.2 | Initialize Supabase (local + remote) | `supabase init`, link project |
| 1.3 | Set up Supabase client factories (browser, server, middleware, admin) | `lib/supabase/*` files |
| 1.4 | Set up root middleware for session refresh | `middleware.ts` |
| 1.5 | Auth callback route | `app/auth/callback/route.ts` |
| 1.6 | Create database migration: profiles, roles, permissions, user_roles, role_permissions, lead_statuses, lead_sources | `supabase/migrations/001_*` |
| 1.7 | Seed roles, permissions, default statuses, default sources | `supabase/seed.sql` |
| 1.8 | Set up RBAC module (`actions.ts`, `rbac.ts`) | `lib/permissions/*` |
| 1.9 | Set up audit logger (platform-wide, with category support) | `lib/audit/logger.ts` |
| 1.10 | Error handling utilities (`AppError`, `Result`) | `lib/utils/*` |

### Phase 2: Lead Management (Day 2-3 — Feb 15-16)

| # | Task | Output |
|---|------|--------|
| 2.1 | Create database migration: leads table (FK to lead_statuses/lead_sources), indexes, RLS | `supabase/migrations/002_*` |
| 2.2 | Generate Supabase TypeScript types | `database.types.ts` |
| 2.3 | Lead Zod schemas (UUID refs for status/source, not enums) | `modules/leads/schemas/lead.schema.ts` |
| 2.4 | Lead service (CRUD + status change) | `modules/leads/services/lead.service.ts` |
| 2.5 | Lead Server Actions | `modules/leads/actions/lead.actions.ts` |
| 2.6 | Lead API route handlers (GET, POST, PATCH, DELETE) | `app/api/leads/*` |
| 2.7 | Login page + LoginForm + auth audit logging | `app/(auth)/login/page.tsx` |
| 2.8 | Protected layout (sidebar, topbar) | `app/(protected)/layout.tsx` |
| 2.9 | Leads list page (table view, dynamic filters from lookup tables) | `app/(protected)/leads/page.tsx` |
| 2.10 | Lead create/edit form (dropdowns populated from lead_statuses/lead_sources) | `modules/leads/components/LeadForm.tsx` |
| 2.11 | Lead delete confirmation | Delete flow with confirmation modal |
| 2.12 | Unit tests for lead service & schemas | `__tests__/*` |

### Phase 3: Kanban Pipeline + Settings (Day 4 — Feb 17)

| # | Task | Output |
|---|------|--------|
| 3.1 | Enable Supabase Realtime on leads, lead_statuses, lead_sources | Migration + `ALTER PUBLICATION` |
| 3.2 | Realtime hook (`useLeadRealtime`) | `modules/leads/hooks/useLeadRealtime.ts` |
| 3.3 | Kanban board with drag-and-drop (`@dnd-kit`) — dynamic columns from lead_statuses | `modules/pipeline/components/*` |
| 3.4 | Optimistic updates + realtime reconciliation | Inside `KanbanBoard.tsx` |
| 3.5 | Settings module — status CRUD service + UI | `modules/settings/*`, `app/(protected)/settings/statuses/` |
| 3.6 | Settings module — source CRUD service + UI | `modules/settings/*`, `app/(protected)/settings/sources/` |
| 3.7 | Unit tests for pipeline + settings logic | Status transition + settings CRUD tests |

### Phase 4: Dashboard (Day 5 — Feb 18)

| # | Task | Output |
|---|------|--------|
| 4.1 | Database functions (`leads_count_by_status`, `leads_monthly_evolution`) | Migration |
| 4.2 | Dashboard service | `modules/dashboard/services/dashboard.service.ts` |
| 4.3 | Stats cards component | KPI cards (total, by status, conversion rate) |
| 4.4 | Status distribution chart (Recharts) | Bar/pie chart |
| 4.5 | Monthly evolution chart (Recharts) | Line/area chart |
| 4.6 | Dashboard page composition | `app/(protected)/dashboard/page.tsx` |

### Phase 5: Polish & Deployment (Day 6 — Feb 19)

| # | Task | Output |
|---|------|--------|
| 5.1 | Audit log viewer page (filterable by category: auth/data/settings/admin) | `app/(protected)/audit/page.tsx` |
| 5.2 | Responsive design pass | Mobile-friendly layout |
| 5.3 | Error boundaries and loading states | `error.tsx`, `loading.tsx` per route |
| 5.4 | README with setup instructions | `README.md` |
| 5.5 | Deploy to Vercel | Production URL |
| 5.6 | Final QA and fix regressions | Manual testing pass |

---

## Appendix A: Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **`@supabase/ssr` over `@supabase/auth-helpers-nextjs`** | The auth-helpers package is deprecated. `@supabase/ssr` is the official replacement, designed for App Router and RSC. |
| **`getUser()` over `getSession()`** | `getSession()` reads from cookies without JWT validation — insecure on the server. `getUser()` makes a round-trip to verify the token. |
| **Service layer with `AuthContext`** | Decouples business logic from HTTP/framework concerns. Services are testable without spinning up Next.js. |
| **RBAC at service level, not middleware** | Per-action granularity (e.g., `lead:update` vs `lead:update:own`). Route-level checks are too coarse. |
| **Optimistic updates + realtime** | Instant UI feedback when dragging cards. Realtime subscription ensures all clients converge to the true state. |
| **Zod validation** | Runtime type safety at the boundary. Catches malformed data before it reaches the database. |
| **RLS as defense-in-depth** | Even if app code has a vulnerability, the database enforces row-level access. Belt and suspenders. |
| **Server Actions for mutations** | Built-in CSRF protection, automatic `revalidatePath`, progressive enhancement. Route Handlers reserved for external/programmatic API. |
| **Domain-centric `modules/` folder** | Scales better than feature-by-type (`components/`, `services/`, `hooks/`). Each domain is self-contained. |
| **Dynamic lookup tables over Postgres enums** | Enums require migrations to modify — impossible at runtime. Lookup tables (`lead_statuses`, `lead_sources`) allow admins to add/rename/reorder values from the UI without developer intervention. `is_win`/`is_loss` flags decouple dashboard logic from status names. |
| **Platform-wide audit logging** | Every sensitive action (auth, data, settings, admin) is logged with category, old/new values, and metadata. Enables compliance, debugging, and user accountability. `auditLogSystem()` handles unauthenticated events (failed logins). |
| **Postgres functions for aggregations** | Complex aggregation queries run in SQL (close to the data). Avoids pulling large datasets to the app layer. |
| **`@dnd-kit` over alternatives** | Accessible, performant, headless — no opinionated styling. Better maintained than `react-beautiful-dnd` (deprecated). |
| **Vitest over Jest** | Faster, native ESM support, better TypeScript integration. Aligns with Vite ecosystem. |
| **Tailwind v4** | Utility-first CSS, consistent with Next.js 16 defaults. v4 has CSS-first configuration. |

---

## Appendix B: Error Handling — `lib/utils/errors.ts`

```ts
export type ErrorCode = "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "DB_ERROR" | "UNAUTHORIZED";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}
```
