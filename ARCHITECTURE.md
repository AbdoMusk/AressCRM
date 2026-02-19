# AressCRM — OMP Composable Business Engine

**Stack:** Next.js 16 (App Router) · Supabase (Auth + Postgres) · TypeScript · Zod 4  
**Pattern:** Object-Module-Processor (OMP). Every business record is an **Object**; behaviour is defined by **Modules** attached at runtime. **Processors** operate on module combinations to implement business logic.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Project Structure](#2-project-structure)
3. [Database Schema](#3-database-schema)
4. [RBAC & Permissions](#4-rbac--permissions)
5. [Engine Module](#5-engine-module)
6. [Processor Layer](#6-processor-layer)
7. [API Design](#7-api-design)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Supabase Client Setup](#9-supabase-client-setup)
10. [Audit Logging](#10-audit-logging)
11. [Key Conventions](#11-key-conventions)

---

## 1. Philosophy

AressCRM is **not** a traditional CRM with hardcoded tables for contacts, companies, and deals. Instead it is a **composable business engine** inspired by:

| Inspiration | What we borrowed |
|---|---|
| **Salesforce** | Configurable object model — admins define object types and fields |
| **Shopify** | Clean data → query → mutation separation |
| **Game Engine ECS** | Objects are IDs; Modules carry data & schema; Processors act on module sets |

### Core Concepts

- **Object** — A UUID row. Has no inherent fields except a type and owner.
- **Module** — A named behaviour block with a JSONB schema (e.g. `identity`, `organization`, `monetary`, `stage`, `assignment`). Modules define fields, validation rules, and defaults.
- **Object Type** — A template that declares which modules an object must (required) or may (optional) have. Example: a *Contact* requires `identity`; a *Deal* requires `identity` + `monetary` + `stage`.
- **Processor** — A stateless business-logic unit that operates on objects based on their **module composition**, not their type. A ReportingProcessor acts on any object with a `monetary` module, regardless of whether it's a Deal, Invoice, or custom type.
- **Relation** — A typed, directed edge between two objects (e.g. *works_for*, *parent_of*).

### Why OMP?

1. **Zero-code extensibility** — Add a new business object (e.g. Ticket, Project) by creating a new Object Type and attaching existing modules. No migration needed.
2. **Composability** — A Contact can gain `monetary` data later without a schema change. Processors automatically start acting on it.
3. **Uniform operations** — One service layer, one API surface, one UI form builder for *all* objects.
4. **Smart business logic** — Processors respond to module composition: `if (object.has(MonetaryModule))` NOT `if (object.type === "deal")`.

---

## 2. Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Login / Signup (public)
│   ├── (protected)/              # Authenticated pages
│   │   ├── dashboard/            # Aggregated stats
│   │   ├── objects/              # Object list, create, detail
│   │   │   ├── page.tsx          # List all objects (filterable by type)
│   │   │   ├── new/page.tsx      # Create object form
│   │   │   └── [id]/page.tsx     # Object detail (view, edit, relations)
│   │   ├── registry/page.tsx     # Admin: manage Modules & Object Types
│   │   └── settings/             # Roles, Users
│   └── api/                      # REST route handlers
│       ├── objects/              # CRUD + module attach/detach
│       ├── modules/              # Module definition CRUD
│       ├── object-types/         # Object Type CRUD
│       ├── dashboard/            # Aggregation queries
│       └── audit/                # Audit log
├── components/layout/            # Sidebar, Topbar, LogoutButton
├── lib/
│   ├── audit/logger.ts           # auditLog() helper
│   ├── permissions/
│   │   ├── actions.ts            # Permission constants (OMP actions)
│   │   └── rbac.ts               # getAuthContext(), requirePermission()
│   ├── supabase/                 # Client factories (browser, server, admin)
│   └── utils/                    # AppError, API helpers
├── modules/
│   ├── engine/                   # ★ Core OMP module
│   │   ├── types/                # TypeScript interfaces
│   │   ├── schemas/              # Zod validators (dynamic + static)
│   │   ├── services/             # Pure async service functions
│   │   ├── actions/              # Server Actions (thin wrappers)
│   │   ├── processors/           # ★ Processor layer (business logic)
│   │   └── components/           # React UI: DynamicForm, ObjectList, etc.
│   ├── auth/                     # Auth service, login/signup forms
│   ├── audit/                    # AuditLogViewer
│   ├── roles/                    # Role management
│   └── users/                    # User management
└── types/global.d.ts             # Global TS helpers (TableRow, ActionResult)
```

---

## 3. Database Schema

### Migration: `005_rename_omp.sql`

Seven core tables form the OMP engine (renamed from ECS tables in migration 005):

| Table | Purpose |
|---|---|
| `modules` | Module definitions with JSONB schema |
| `object_types` | Templates (contact, company, deal, …) |
| `object_type_modules` | M:N mapping: which modules belong to which type |
| `objects` | Every business record — just a UUID + type + owner |
| `object_modules` | Instance data: one row per module attached to an object |
| `object_relations` | Directed typed edges between objects |
| `role_module_permissions` | Per-role, per-module read/write/delete flags |

### Key Design Decisions

- **JSONB for module data** — `object_modules.data` stores all fields for a module instance.  
  A GIN index (`idx_object_modules_data`) enables efficient JSONB queries.
- **Schema-in-DB** — `modules.schema` stores a `ModuleSchema` JSON object: `{ fields: [{ key, type, label, required, default, options, ... }] }`. The UI reads this to render forms dynamically.
- **RLS policies** on every table; admin client (`service_role`) bypasses RLS for cross-tenant operations.
- **Helper functions** in SQL: `count_objects_by_type()`, `aggregate_module_field()`, `count_by_module_field()`.

### Seed Data (5 Modules, 3 Object Types)

**Modules:**
- `identity` — first_name, last_name, email, phone, title
- `organization` — company_name, industry, website, size, address
- `monetary` — amount, currency, probability
- `stage` — stage (select: lead/qualified/proposal/negotiation/closed_won/closed_lost), priority, expected_close_date
- `assignment` — assigned_to, team, notes

**Object Types:**
- `contact` — requires: identity
- `company` — requires: organization
- `deal` — requires: identity, monetary, stage; optional: assignment

---

## 4. RBAC & Permissions

### Architecture

```
Request → getAuthContext() → requirePermission(ctx, action) → service(ctx, data) → auditLog()
```

`AuthContext` carries:
```ts
{
  userId: string;
  roleId: string;
  roleName: string;
  permissions: Set<string>;
  modulePermissions: Map<string, ModulePermission>;
}
```

### OMP Permissions

| Permission | Description |
|---|---|
| `object:create`, `object:read`, `object:update`, `object:delete` | Object CRUD |
| `object:read:own`, `object:update:own`, `object:delete:own` | Own-object operations |
| `module:manage` | Create/edit/delete module definitions |
| `object_type:manage` | Create/edit/delete object types |
| `relation:create`, `relation:delete` | Manage object relations |
| `dashboard:view` | View dashboard stats |
| `audit:view` | Read audit logs |
| `settings:manage` | System settings |
| `user:manage` | Manage users |
| `role:manage` | Manage roles |

### Module-Level Permissions

The `role_module_permissions` table enables fine-grained access:
```sql
-- Sales reps can read but not write organization module data
INSERT INTO role_module_permissions (role_id, module_id, can_read, can_write, can_delete)
VALUES ('sales_rep_role_id', 'org_module_id', true, false, false);
```

---

## 5. Engine Module

### Types (`src/modules/engine/types/`)

| Type | Key Fields |
|---|---|
| `ModuleSchema` | `{ fields: ModuleFieldDef[] }` — 11 field types supported |
| `ModuleRowTyped` | DB row with parsed schema |
| `AttachedModule` | camelCase: `moduleId`, `moduleName`, `displayName`, `schema`, `data` |
| `ObjectWithModules` | Object row + `object_type` + `modules: AttachedModule[]` + derived `displayName` |
| `ObjectTypeWithModules` | Object type row + modules array (`module_id`, `module_name`, `display_name`, `required`, `position`) |
| `ObjectTypeWithSchemas` | Same as above + `schema: ModuleSchema` on each module — used by UI forms |
| `RelatedObject` | `{ relationId, relationType, direction, object: { id, objectType, displayName } }` |
| `ObjectCreateInput` | `{ objectTypeId, modules: Record<moduleName, data> }` |
| `RelationCreateInput` | `{ fromObjectId, toObjectId, relationType }` |
| `ObjectQueryParams` | `{ objectType?, page?, limit?, filters? }` |

### Services (`src/modules/engine/services/`)

Five service files — all pure async functions receiving `AuthContext`:

| Service | Key Functions |
|---|---|
| `module.service.ts` | `getModules`, `getModule`, `createModule`, `updateModule`, `deleteModule` |
| `object-type.service.ts` | `getObjectTypes`, `getObjectType`, `getObjectTypeByName`, `createObjectType`, `updateObjectType`, `deleteObjectType` |
| `object.service.ts` | `getObjects` → `{ objects, total }`, `getObject`, `createObject`, `updateObjectModule`, `deleteObject`, `attachModule`, `detachModule` |
| `relation.service.ts` | `getRelations`, `createRelation`, `deleteRelation` |
| `query.service.ts` | `getDashboardStats`, `aggregateField`, `countByField` |

### Dynamic Validation (`src/modules/engine/schemas/dynamic-validator.ts`)

At runtime, `buildModuleValidator(schema)` converts a `ModuleSchema` into a Zod object:
```ts
const validator = buildModuleValidator(identitySchema);
const result = validator.safeParse(userInput);
```

Each `ModuleFieldType` maps to a Zod type. Required fields become `.min(1)`, selects validate against allowed values, numbers respect `min`/`max`.

### Server Actions (`src/modules/engine/actions/`)

Thin wrappers around services. Each action:
1. Calls `getAuthContext()`
2. Delegates to service
3. Calls `revalidatePath()`
4. Returns `ActionResult<T>`

---

## 6. Processor Layer

### Design Principle

Processors are **stateless business-logic units** that operate on objects based on their **module composition**, never their object type.

```ts
// ✅ Correct — module-based eligibility
if (object.modules.some(m => m.moduleName === "monetary")) { … }

// ❌ Wrong — type-based check
if (object.object_type.name === "deal") { … }
```

### Base Processor (`src/modules/engine/processors/base.processor.ts`)

```ts
abstract class BaseProcessor<TResult> {
  abstract spec: ProcessorSpec; // name, description, requiredModules, optionalModules
  abstract process(ctx: ProcessorContext): Promise<ProcessorResult<TResult>>;

  isEligible(object: ObjectWithModules): boolean;   // all requiredModules present?
  getModule(object, moduleName): AttachedModule;     // extract module by name
  getFieldValue<T>(object, module, field): T;        // extract field value
  execute(ctx): Promise<ProcessorResult<TResult>>;   // eligibility + error handling
}
```

### Built-in Processors

| Processor | Required Modules | Optional | Purpose |
|---|---|---|---|
| **ReportingProcessor** | `monetary` | `stage`, `identity` | Revenue aggregation, weighted pipeline values, win/loss tracking |
| **TicketProcessor** | `stage` | `identity`, `notes` | Status transition rules, staleness detection, priority management |
| **ProjectProcessor** | `organization` + `stage` | `monetary`, `notes` | Health scoring (0-100), completeness analysis, budget tracking |

### Processor Registry

```ts
import { initProcessors, runProcessors, getEligibleProcessors } from "@/modules/engine/processors";

// Initialize once at startup
initProcessors();

// Run all eligible processors on an object
const results = await runProcessors(authCtx, objectWithModules);

// Check which processors apply
const eligible = getEligibleProcessors(objectWithModules);
```

### Processor Examples

**ReportingProcessor** on a Deal (has `monetary` + `stage`):
```json
{
  "value": 50000,
  "currency": "USD",
  "stage": "negotiation",
  "isClosed": false,
  "isWon": false,
  "weightedValue": 35000,
  "attribution": { "name": "John Doe" }
}
```

**TicketProcessor** on a Lead (has `stage`):
```json
{
  "currentStage": "contacted",
  "validTransitions": ["interested", "negotiation", "lost"],
  "isTerminal": false,
  "priority": "medium",
  "ageDays": 12,
  "isStale": true
}
```

**ProjectProcessor** on a Deal (has `organization` + `stage`):
```json
{
  "organizationName": "Acme Corp",
  "healthScore": 72,
  "healthLabel": "healthy",
  "completeness": { "percentage": 85 },
  "daysSinceUpdate": 3
}
```

---

## 7. API Design

All endpoints live under `/api/` and follow REST conventions.

| Method | Path | Description |
|---|---|---|
| GET | `/api/objects?type=&page=&limit=` | List objects |
| POST | `/api/objects` | Create object |
| GET | `/api/objects/:id` | Get object detail |
| DELETE | `/api/objects/:id` | Delete object |
| GET/POST | `/api/modules` | List / Create module definitions |
| GET/PATCH/DELETE | `/api/modules/:id` | Get / Update / Delete module |
| GET/POST | `/api/object-types` | List / Create object types |
| GET/PATCH/DELETE | `/api/object-types/:id` | Get / Update / Delete object type |
| GET | `/api/dashboard` | Aggregated stats |
| GET | `/api/dashboard?aggregate=module.field.sum` | Numeric aggregation |
| GET | `/api/dashboard?countBy=module.field` | Field distribution |
| GET | `/api/audit` | Audit log |

### Request Flow

```
Route Handler → getAuthContext() → requirePermission() → service.*() → NextResponse.json()
```

All errors return `{ error: string }` with appropriate HTTP status codes.

---

## 8. Frontend Architecture

### Dynamic Form Builder

The UI **never** hardcodes field names. Instead:

1. `ModuleSchema` defines fields (type, label, required, options, etc.)
2. `DynamicField` renders the correct input control for each field type
3. `DynamicForm` maps a schema's fields array to `DynamicField` components
4. `ObjectCreateForm` loads `ObjectTypeWithSchemas[]`, shows forms per module
5. `ObjectEditForm` shows existing `AttachedModule` data for editing

### Key UI Components (`src/modules/engine/components/`)

| Component | Purpose |
|---|---|
| `DynamicField` | Renders one field: text, email, phone, number, date, select, multiselect, boolean, textarea, url |
| `DynamicForm` | Renders all fields for one module schema |
| `ObjectCreateForm` | Full creation flow: pick type → fill module forms → submit |
| `ObjectEditForm` | Edit existing object's module data; attach/detach optional modules |
| `ObjectDetailView` | Read-only display of object module data |
| `ObjectList` | Table view with type filter |
| `RelationManager` | View/create/delete relations; search objects to link |
| `ModuleManager` | Admin: CRUD for module definitions with field builder |
| `ObjectTypeManager` | Admin: CRUD for object types + module assignment |
| `DashboardView` | Stat cards: total objects, by type, recent activity |

### Styling

- **Tailwind CSS v4** with dark mode (`dark:` classes)
- Shared style constants via `tw` object in `DynamicField.tsx`
- No component library — all custom UI
- Responsive: mobile-first with `sm:`/`lg:` breakpoints

### Sidebar

Dynamic sidebar reads object types from the database and renders shortcuts:
```
Dashboard
Objects    ←  main object list
  → Contacts   (filtered by type)
  → Companies
  → Deals
Registry   ←  admin: Modules & Object Types
Audit Logs
Settings
  → Roles & Permissions
  → User Management
```

---

## 9. Supabase Client Setup

Three client factories following `@supabase/ssr` patterns:

| Client | File | Usage |
|---|---|---|
| **Browser** | `lib/supabase/client.ts` | Client Components. Singleton via `createBrowserClient()` |
| **Server** | `lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers. Per-request, reads cookies |
| **Admin** | `lib/supabase/admin.ts` | `service_role` key. Bypasses RLS. Used by services for cross-user queries |

---

## 10. Audit Logging

Every mutation is logged via `auditLog()`:
```ts
await auditLog(ctx, {
  action: "object:create",
  category: "data",
  entityType: "object",
  entityId: newObject.id,
  metadata: { objectTypeName, moduleCount },
});
```

The `audit_logs` table records: user, action, category, entity reference, metadata JSON, IP, user agent, and timestamp.

---

## 11. Key Conventions

### TypeScript
- Strict mode, `@/*` path alias → `./src/*`
- `TableRow<T>` global helper extracts `Database["public"]["Tables"][T]["Row"]`
- `ActionResult<T>` global helper: `{ success: true; data: T } | { success: false; error: string }`
- Zod v4 import: `import { z } from "zod/v4"`
- `z.email()`, `z.url()` (v4 API, not `.string().email()`)

### Naming
- DB columns / API params: `snake_case`
- TypeScript interfaces: `PascalCase`
- Derived/computed properties in rich types: `camelCase` (e.g. `displayName`, `moduleId`)
- Module names: `lowercase_with_underscores` (regex: `^[a-z_][a-z0-9_]*$`)

### OMP Terminology Mapping (from ECS)
| Old (ECS) | New (OMP) |
|---|---|
| Entity | Object |
| Component | Module |
| System | Processor |
| `entities` table | `objects` table |
| `components` table | `modules` table |
| `entity_types` | `object_types` |
| `entity_components` | `object_modules` |
| `entity_relations` | `object_relations` |
| `entity_type_components` | `object_type_modules` |
| `role_component_permissions` | `role_module_permissions` |

### Next.js 16 Patterns
- Dynamic route params: `params: Promise<{ id: string }>`
- Search params: `searchParams: Promise<{ page?: string }>`
- Server Actions in `"use server"` files
- `revalidatePath()` after mutations

### Error Handling
- `AppError` class with code: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `DB_ERROR`, `UNAUTHORIZED`
- Services throw `AppError`; actions catch and return `ActionResult`
- Route handlers catch and return `{ error }` with HTTP status
