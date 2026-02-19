-- ============================================================================
-- Seed Data for OMP Engine (Object-Module-Processor)
-- Creates the 5 core modules, 3 object types, permissions, and role assignments
-- ============================================================================

-- ──────────────────────────────────────────────
-- 1. Core Modules
-- ──────────────────────────────────────────────

INSERT INTO modules (name, display_name, description, icon, schema) VALUES
(
  'identity',
  'Identity',
  'Basic identity information: name, email, phone',
  'User',
  '{
    "fields": [
      { "key": "name", "type": "text", "label": "Full Name", "required": true },
      { "key": "email", "type": "email", "label": "Email" },
      { "key": "phone", "type": "phone", "label": "Phone" },
      { "key": "avatar_url", "type": "url", "label": "Avatar URL" }
    ]
  }'::jsonb
),
(
  'organization',
  'Organization',
  'Company or organization details',
  'Building2',
  '{
    "fields": [
      { "key": "company_name", "type": "text", "label": "Company Name", "required": true },
      { "key": "industry", "type": "text", "label": "Industry" },
      { "key": "website", "type": "url", "label": "Website" },
      { "key": "address", "type": "textarea", "label": "Address" },
      { "key": "size", "type": "select", "label": "Company Size", "options": [
        { "value": "1-10", "label": "1-10" },
        { "value": "11-50", "label": "11-50" },
        { "value": "51-200", "label": "51-200" },
        { "value": "201-1000", "label": "201-1000" },
        { "value": "1000+", "label": "1000+" }
      ]}
    ]
  }'::jsonb
),
(
  'monetary',
  'Monetary',
  'Financial value, currency, and probability',
  'DollarSign',
  '{
    "fields": [
      { "key": "amount", "type": "number", "label": "Amount", "required": true, "min": 0 },
      { "key": "currency", "type": "select", "label": "Currency", "required": true, "default": "USD", "options": [
        { "value": "USD", "label": "USD" },
        { "value": "EUR", "label": "EUR" },
        { "value": "GBP", "label": "GBP" },
        { "value": "MAD", "label": "MAD" }
      ]},
      { "key": "probability", "type": "number", "label": "Probability (%)", "min": 0, "max": 100 }
    ]
  }'::jsonb
),
(
  'stage',
  'Stage',
  'Pipeline stage and status tracking',
  'Kanban',
  '{
    "fields": [
      { "key": "status", "type": "select", "label": "Status", "required": true, "default": "new", "options": [
        { "value": "new", "label": "New", "color": "#3B82F6" },
        { "value": "contacted", "label": "Contacted", "color": "#8B5CF6" },
        { "value": "interested", "label": "Interested", "color": "#F59E0B" },
        { "value": "negotiation", "label": "Negotiation", "color": "#F97316" },
        { "value": "won", "label": "Won", "color": "#10B981" },
        { "value": "lost", "label": "Lost", "color": "#EF4444" }
      ]},
      { "key": "pipeline", "type": "text", "label": "Pipeline", "default": "default" }
    ]
  }'::jsonb
),
(
  'assignment',
  'Assignment',
  'Assignment and priority tracking',
  'UserCheck',
  '{
    "fields": [
      { "key": "assigned_to", "type": "text", "label": "Assigned To" },
      { "key": "team", "type": "text", "label": "Team" },
      { "key": "priority", "type": "select", "label": "Priority", "default": "medium", "options": [
        { "value": "low", "label": "Low", "color": "#6B7280" },
        { "value": "medium", "label": "Medium", "color": "#F59E0B" },
        { "value": "high", "label": "High", "color": "#F97316" },
        { "value": "urgent", "label": "Urgent", "color": "#EF4444" }
      ]}
    ]
  }'::jsonb
);

-- ──────────────────────────────────────────────
-- 2. Object Types
-- ──────────────────────────────────────────────

INSERT INTO object_types (name, display_name, description, icon, color) VALUES
('contact', 'Contact', 'People and contacts', 'Users', '#3B82F6'),
('company', 'Company', 'Organizations and companies', 'Building2', '#8B5CF6'),
('deal', 'Deal', 'Sales opportunities and deals', 'DollarSign', '#10B981');

-- Contact = identity (required)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'contact' AND m.name = 'identity';

-- Company = organization (required)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'company' AND m.name = 'organization';

-- Deal = identity (required) + monetary (required) + stage (required) + assignment (optional)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'identity';

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 1
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'monetary';

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 2
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'stage';

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, false, 3
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'assignment';

-- ──────────────────────────────────────────────
-- 3. Roles (keep existing from migration 001)
-- ──────────────────────────────────────────────

INSERT INTO roles (name, description) VALUES
  ('admin',     'Full system access'),
  ('manager',   'Manage objects and view dashboard'),
  ('sales_rep', 'Create and manage own objects');

-- ──────────────────────────────────────────────
-- 4. OMP Permissions
-- ──────────────────────────────────────────────

INSERT INTO permissions (action, description) VALUES
  ('object:create',        'Create new objects'),
  ('object:read',          'Read all objects'),
  ('object:read:own',      'Read own objects only'),
  ('object:update',        'Update any object'),
  ('object:update:own',    'Update own objects only'),
  ('object:delete',        'Delete any object'),
  ('object:delete:own',    'Delete own objects only'),
  ('relation:create',      'Create object relations'),
  ('relation:delete',      'Delete object relations'),
  ('module:manage',        'Create, edit, delete module definitions'),
  ('object_type:manage',   'Create, edit, delete object type templates'),
  ('dashboard:view',       'View dashboard and analytics'),
  ('audit:view',           'View audit logs'),
  ('role:manage',          'Manage roles and permissions'),
  ('user:manage',          'Manage users and role assignments'),
  ('settings:manage',      'Manage system settings');

-- ──────────────────────────────────────────────
-- 5. Role Permission Assignments
-- ──────────────────────────────────────────────

-- Admin gets ALL
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

-- Manager gets object CRUD (all), relations, dashboard, audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.action IN (
    'object:create', 'object:read', 'object:update', 'object:delete',
    'relation:create', 'relation:delete',
    'dashboard:view', 'audit:view'
  );

-- Sales Rep gets object CRUD (own), dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep'
  AND p.action IN (
    'object:create', 'object:read:own', 'object:update:own', 'object:delete:own',
    'relation:create',
    'dashboard:view'
  );

-- ──────────────────────────────────────────────
-- 6. Module-Level Permissions
-- ──────────────────────────────────────────────

-- Admin: full access to all modules (NULL = all)
INSERT INTO role_module_permissions (role_id, module_id, object_type_id, can_read, can_write, can_delete)
SELECT r.id, NULL, NULL, true, true, true
FROM roles r WHERE r.name = 'admin';

-- Manager: full access to all modules
INSERT INTO role_module_permissions (role_id, module_id, object_type_id, can_read, can_write, can_delete)
SELECT r.id, NULL, NULL, true, true, true
FROM roles r WHERE r.name = 'manager';

-- Sales Rep: read/write all modules, no delete
INSERT INTO role_module_permissions (role_id, module_id, object_type_id, can_read, can_write, can_delete)
SELECT r.id, NULL, NULL, true, true, false
FROM roles r WHERE r.name = 'sales_rep';
-- ──────────────────────────────────────────────
-- 7. OPTIONAL: First Admin User (Development/Testing)
-- ──────────────────────────────────────────────
-- INSTRUCTIONS:
-- 1. Create this user manually via Supabase Auth dashboard, OR
-- 2. Sign up via the /signup form, then manually run the SQL below to assign admin role, OR
-- 3. Use the /api/admin/setup endpoint (requires SUPABASE_SERVICE_ROLE_KEY)
--
-- To enable this seed for development, uncomment the lines below.
-- In production, use the API endpoint or manually assign roles via dashboard.

-- SAMPLE: Create a test admin user account (UNCOMMENT TO USE)
-- NOTE: Password is set to "Admin@123456" — change immediately in production!
-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password, 
--   email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
--   created_at, updated_at, is_super_admin
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'admin@example.com',
--   crypt('Admin@123456', gen_salt('bf')),
--   now(),
--   '{"provider":"email","providers":["email"]}',
--   '{"full_name":"Admin User"}',
--   now(),
--   now(),
--   false
-- );

-- SAMPLE: Assign the admin role to that user (UNCOMMENT AFTER CREATING USER)
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT p.id, r.id
-- FROM profiles p, roles r
-- WHERE p.full_name = 'Admin User' AND r.name = 'admin'
-- ON CONFLICT DO NOTHING;