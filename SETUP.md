# AressCRM OMP Platform — Complete Setup & Deployment Guide

## Overview
AressCRM uses an **Object-Module-Processor (OMP)** architecture. This guide covers:
- Database migration & schema
- First admin user bootstrap
- Initial data seeding
- Application configuration
- Verification steps

---

# PART I: DATABASE & AUTHENTICATION

## Phase 1: Database Setup

### 1.1 Push Migrations

```bash
supabase db push
```

This creates the complete OMP schema from migration `004_omp_engine.sql`:
- ✅ OMP tables (modules, object_types, objects, object_modules, object_relations)
- ✅ Permission tables (permissions, role_permissions, role_module_permissions)
- ✅ Automatic RLS policies (no manual RLS setup needed!)
- ✅ Indexes, triggers, helper functions
- ✅ Realtime subscriptions

**Result:** Tables are created with RLS already enabled and policies already in place.

---

## Phase 1.5: First Admin User Bootstrap 🔐

**Every platform needs a bootstrap path for the first admin.** Choose ONE option:

### Option A: API Endpoint (Recommended for Production)

**Workflow:**
1. User signs up at `/signup` (creates auth user + profile)
2. Run setup script to assign admin role

**Prerequisites:**
```bash
# Set environment variable
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Find it in Supabase Dashboard > Project Settings > API Keys > Service Role
```

**Execute:**
```bash
# Linux/Mac
./scripts/setup-admin.sh admin@example.com admin http://localhost:3000

# Windows PowerShell
$env:SUPABASE_SERVICE_ROLE_KEY = "your-key"
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/setup" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
  } `
  -Body '{"userEmail":"admin@example.com","role":"admin"}'
```

**Response:**
```json
{
  "success": true,
  "message": "User admin@example.com has been assigned the admin role",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin"
}
```

### Option B: SQL in Supabase Studio (Fastest)

After user signs up, open **Supabase Dashboard > SQL Editor** and run:

```sql
-- Find the user
SELECT id, full_name FROM profiles WHERE full_name = 'Your Name';

-- Assign admin role (replace uuid-here with the user's id)
INSERT INTO user_roles (user_id, role_id)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  (SELECT id FROM roles WHERE name = 'admin')
);
```

Refresh the page → User now has admin access!

### Option C: Seed Script (Development Only)

Edit `supabase/seed.sql` and uncomment the admin user creation section (lines ~230):

```sql
-- UNCOMMENT THESE LINES IN seed.sql FOR DEVELOPMENT TESTING
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('Admin@123456', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  now(),
  now(),
  false
);

-- Assign admin role
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.full_name = 'Admin User' AND r.name = 'admin';
```

Then run:
```bash
supabase db push
```

⚠️ **Dev only!** Password: `Admin@123456` — change immediately before deploying.

---

## Phase 2: Initial Data Seeding

### 2.1 Seed Roles & Permissions

Seed.sql automatically creates:
- **Roles:** admin, manager, sales_rep
- **Permissions:** object:*, module:manage, object_type:manage, etc.
- **Modules:** identity, organization, monetary, stage, assignment (5 core modules)
- **Object Types:** contact, company, deal (3 templates)

```bash
supabase db push
```

If seed.sql never runs, manually seed via SQL Editor:

```sql
-- Create roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access'),
  ('manager', 'Manage objects and view dashboard'),
  ('sales_rep', 'Create and manage own objects');

-- Create permissions
INSERT INTO permissions (action, description) VALUES
  ('object:create', 'Create new objects'),
  ('object:read', 'Read all objects'),
  ('object:read:own', 'Read own objects only'),
  ('object:update', 'Update any object'),
  ('object:update:own', 'Update own objects only'),
  ('object:delete', 'Delete any object'),
  ('object:delete:own', 'Delete own objects only'),
  ('module:manage', 'Create, edit, delete module definitions'),
  ('object_type:manage', 'Create, edit, delete object type templates');

-- Assign all permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';
```

---

# PART II: APPLICATION SETUP

## Phase 3: Environment & Dependencies

### 3.1 Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: For first admin setup
ADMIN_SETUP_ENABLED=true
```

**Get keys from:** Supabase Dashboard > Project Settings > API Keys

### 3.2 Install Dependencies

```bash
npm install
# or
yarn install
```

### 3.3 Run Development Server

```bash
npm run dev
# or
yarn dev
```

Visit: **http://localhost:3000**

---

# PART III: VERIFICATION & TESTING

## Phase 4: Test the Platform

### 4.1 User Signup Flow

1. Go to **http://localhost:3000/signup**
2. Create an account: `testuser@example.com / Password123!`
3. Email confirmed automatically (local dev)
4. Redirected to `/dashboard`

### 4.2 Assign Admin Role

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
./scripts/setup-admin.sh testuser@example.com admin http://localhost:3000
```

Expected response:
```json
{"success": true, "message": "User testuser@example.com has been assigned the admin role"}
```

### 4.3 Test Admin Access

1. Refresh **http://localhost:3000/dashboard**
2. Navigate to **/registry** (admin-only)
3. Create a new object type
4. Create a new module
5. Navigate to **/objects** and create an object

### 4.4 Verify RLS (Row-Level Security)

1. Create a test object as User A
2. Log in as User B
3. Visit `/objects` → Object from User A should NOT be visible ✅ RLS working!

---

## Phase 5: Processors (Optional Advanced Feature)

Processors derive insights from module combinations:

```typescript
import { runProcessors } from '@/modules/engine/processors';

const objectWithModules = {
  id: 'obj-123',
  object_type_id: 'type-deal',
  object_modules: [
    { module_id: 'mod-monetary', data: { amount: 50000, currency: 'USD' } },
    { module_id: 'mod-stage', data: { status: 'negotiation' } }
  ]
};

const processors = await runProcessors(objectWithModules);
// processors = [
//   { processor: 'reporting', result: { value: 50000, isClosed: false, ... } },
//   { processor: 'ticket', result: { currentStage: 'negotiation', ... } }
// ]
```

Three processors available:
- **Reporting:** Monetary value calculations (requires monetary module)
- **Ticket:** Stage workflow logic (requires stage module)
- **Project:** Health scores (requires organization + stage modules)

---

# TROUBLESHOOTING

## "Row level security" / "permission denied"

**Cause:** RLS policies blocking access
**Fix:**
1. Verify user is authenticated: Check `auth.uid()` in browser DevTools
2. Verify RLS policies exist: Supabase Dashboard > Tables > objects > RLS
3. Verify user owns object: Check `objects.owner_id = ? OR objects.created_by = ?`

## "Modules not found"

**Cause:** seed.sql never executed
**Fix:** Manually seed core modules (see Phase 2.1)

## "POST /api/admin/setup returns 401"

**Cause:** Invalid or missing SUPABASE_SERVICE_ROLE_KEY
**Fix:**
```bash
echo $SUPABASE_SERVICE_ROLE_KEY  # Verify it's set
# Get fresh key from Supabase Dashboard > Settings > API Keys
export SUPABASE_SERVICE_ROLE_KEY="new-key-here"
```

## "POST /api/admin/setup returns 404"

**Cause:** User not found in auth.users
**Fix:** User must sign up first at `/signup` or be created in Supabase Auth

## TypeScript Errors on Build

**Fix:**
```bash
npx tsc --noEmit
# Should show 0 errors if setup is correct
```

---

# DEPLOYMENT CHECKLIST

- [ ] **Phase 1:** `supabase db push` ✅ Tables created
- [ ] **Phase 1.5:** First admin bootstrapped (Option A/B/C) ✅ Admin user created
- [ ] **Phase 2:** `supabase db push` for seed ✅ Roles, permissions, modules created
- [ ] **Phase 3.1:** `.env.local` configured with Supabase keys
- [ ] **Phase 3.2:** `npm install` ✅ Dependencies installed
- [ ] **Phase 3.3:** `npm run dev` ✅ Dev server running
- [ ] **Phase 4.1:** Sign up test user ✅ Auth working
- [ ] **Phase 4.2:** Assign admin role ✅ API endpoint working
- [ ] **Phase 4.3:** Admin can access `/registry` ✅ Permissions enforced
- [ ] **Phase 4.4:** RLS verified (user can't see others' objects) ✅ Security working
- [ ] **Phase 5:** (Optional) Test processors with sample data

---

# ARCHITECTURE SUMMARY

| Layer | What | Where |
|-------|------|-------|
| **Database** | OMP schema + RLS | `supabase/migrations/004_omp_engine.sql` |
| **Auth** | Users, roles, permissions | Supabase Auth + `profiles`, `roles`, `user_roles` |
| **Bootstrap** | First admin setup | `src/app/api/admin/setup/route.ts` + `scripts/setup-admin.sh` |
| **Core Engine** | Objects, modules, processors | `src/modules/engine/*` |
| **UI** | Pages, components | `src/app/(protected)/{objects,registry,dashboard}` |
| **Seed Data** | Initial modules, types | `supabase/seed.sql` |

---

# Next Steps

1. ✅ Database initialized with OMP schema
2. ✅ First admin user assigned
3. ✅ Permissions & roles seeded
4. ⏭️ **Create your first object type** → Go to `/registry` > "Object Types" > Create
5. ⏭️ **Create modules** → Go to `/registry` > "Modules" > Create
6. ⏭️ **Use the platform** → Go to `/objects` > Create, read, update, relate objects
7. ⏭️ **Add team members** → New users sign up, admin assigns roles

---

**Questions?** Check [ARCHITECTURE.md](ARCHITECTURE.md) for deep technical details.
