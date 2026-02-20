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
)
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────
-- 2. Object Types
-- ──────────────────────────────────────────────

INSERT INTO object_types (name, display_name, description, icon, color) VALUES
('contact', 'Contact', 'People and contacts', 'Users', '#3B82F6'),
('company', 'Company', 'Organizations and companies', 'Building2', '#8B5CF6'),
('deal', 'Deal', 'Sales opportunities and deals', 'DollarSign', '#10B981'),
('project', 'Project', 'Projects and proposals for products or services', 'FolderKanban', '#F59E0B'),
('proposal', 'Proposal', 'Sales proposals from salespersons applying to projects', 'FileText', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- Contact = identity (required)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'contact' AND m.name = 'identity'
ON CONFLICT DO NOTHING;

-- Company = organization (required)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'company' AND m.name = 'organization'
ON CONFLICT DO NOTHING;

-- Deal = identity (required) + monetary (required) + stage (required) + assignment (optional)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'identity'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 1
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'monetary'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 2
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'stage'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, false, 3
FROM object_types ot, modules m
WHERE ot.name = 'deal' AND m.name = 'assignment'
ON CONFLICT DO NOTHING;

-- Project = identity (required) + stage (required) + monetary (optional) + assignment (optional)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'project' AND m.name = 'identity'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 1
FROM object_types ot, modules m
WHERE ot.name = 'project' AND m.name = 'stage'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, false, 2
FROM object_types ot, modules m
WHERE ot.name = 'project' AND m.name = 'monetary'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, false, 3
FROM object_types ot, modules m
WHERE ot.name = 'project' AND m.name = 'assignment'
ON CONFLICT DO NOTHING;

-- Proposal = identity (required) + monetary (required) + stage (required) + assignment (optional)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'proposal' AND m.name = 'identity'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 1
FROM object_types ot, modules m
WHERE ot.name = 'proposal' AND m.name = 'monetary'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 2
FROM object_types ot, modules m
WHERE ot.name = 'proposal' AND m.name = 'stage'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, false, 3
FROM object_types ot, modules m
WHERE ot.name = 'proposal' AND m.name = 'assignment'
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 3. Roles (keep existing from migration 001)
-- ──────────────────────────────────────────────

INSERT INTO roles (name, description) VALUES
  ('admin',     'Full system access'),
  ('manager',   'Manage objects and view dashboard'),
  ('sales_rep', 'Create and manage own objects')
ON CONFLICT (name) DO NOTHING;

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
  ('settings:manage',      'Manage system settings')
ON CONFLICT (action) DO NOTHING;

-- ──────────────────────────────────────────────
-- 5. Role Permission Assignments
-- ──────────────────────────────────────────────

-- Admin gets ALL
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager gets object CRUD (all), relations, dashboard, audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.action IN (
    'object:create', 'object:read', 'object:update', 'object:delete',
    'relation:create', 'relation:delete',
    'dashboard:view', 'audit:view'
  )
ON CONFLICT DO NOTHING;

-- Sales Rep gets object CRUD (own), dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep'
  AND p.action IN (
    'object:create', 'object:read:own', 'object:update:own', 'object:delete:own',
    'relation:create',
    'dashboard:view'
  )
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 6. Module-Level Permissions
-- ──────────────────────────────────────────────

-- Admin: full access to all modules (NULL = all)
INSERT INTO role_module_permissions (role_id, module_id, object_type_id, can_read, can_write, can_delete)
SELECT r.id, NULL, NULL, true, true, true
FROM roles r WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Manager: full access to all modules
INSERT INTO role_module_permissions (role_id, module_id, object_type_id, can_read, can_write, can_delete)
SELECT r.id, NULL, NULL, true, true, true
FROM roles r WHERE r.name = 'manager'
ON CONFLICT DO NOTHING;

-- Sales Rep: read/write all modules, no delete
INSERT INTO role_module_permissions (role_id, module_id, object_type_id, can_read, can_write, can_delete)
SELECT r.id, NULL, NULL, true, true, false
FROM roles r WHERE r.name = 'sales_rep'
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 7. Sample CRM Data (Contacts, Companies, Deals)
-- ──────────────────────────────────────────────
-- Creates realistic CRM objects to demonstrate the OMP engine.
-- Uses a DO block so we can reference generated UUIDs across inserts.

DO $$
DECLARE
  v_admin_id uuid;
  -- Module IDs
  v_mod_identity uuid;
  v_mod_org uuid;
  v_mod_monetary uuid;
  v_mod_stage uuid;
  v_mod_assign uuid;
  -- Object type IDs
  v_ot_contact uuid;
  v_ot_company uuid;
  v_ot_deal uuid;
  v_ot_project uuid;
  v_ot_proposal uuid;
  -- Object IDs
  v_contact1 uuid;
  v_contact2 uuid;
  v_contact3 uuid;
  v_contact4 uuid;
  v_contact5 uuid;
  v_contact6 uuid;
  v_contact7 uuid;
  v_contact8 uuid;
  v_company1 uuid;
  v_company2 uuid;
  v_company3 uuid;
  v_company4 uuid;
  v_company5 uuid;
  v_deal1 uuid;
  v_deal2 uuid;
  v_deal3 uuid;
  v_deal4 uuid;
  v_deal5 uuid;
  v_deal6 uuid;
  v_deal7 uuid;
  v_deal8 uuid;
  v_project1 uuid;
  v_project2 uuid;
  v_project3 uuid;
  v_proposal1 uuid;
  v_proposal2 uuid;
  v_proposal3 uuid;
  v_proposal4 uuid;
  v_proposal5 uuid;
  -- Page ID
  v_page1 uuid;
  v_page2 uuid;
BEGIN
  -- Try to get an admin user (first user with admin role, or first user)
  SELECT ur.user_id INTO v_admin_id
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'admin'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  END IF;

  -- If no users exist, skip sample data
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No users found — skipping sample CRM data. Sign up first, then re-run seed.';
    RETURN;
  END IF;

  -- Look up module IDs
  SELECT id INTO v_mod_identity FROM modules WHERE name = 'identity';
  SELECT id INTO v_mod_org FROM modules WHERE name = 'organization';
  SELECT id INTO v_mod_monetary FROM modules WHERE name = 'monetary';
  SELECT id INTO v_mod_stage FROM modules WHERE name = 'stage';
  SELECT id INTO v_mod_assign FROM modules WHERE name = 'assignment';

  -- Look up object type IDs
  SELECT id INTO v_ot_contact FROM object_types WHERE name = 'contact';
  SELECT id INTO v_ot_company FROM object_types WHERE name = 'company';
  SELECT id INTO v_ot_deal FROM object_types WHERE name = 'deal';
  SELECT id INTO v_ot_project FROM object_types WHERE name = 'project';
  SELECT id INTO v_ot_proposal FROM object_types WHERE name = 'proposal';

  -- ── Contacts (8 total) ──
  v_contact1 := gen_random_uuid();
  v_contact2 := gen_random_uuid();
  v_contact3 := gen_random_uuid();
  v_contact4 := gen_random_uuid();
  v_contact5 := gen_random_uuid();
  v_contact6 := gen_random_uuid();
  v_contact7 := gen_random_uuid();
  v_contact8 := gen_random_uuid();

  INSERT INTO objects (id, object_type_id, owner_id, created_by) VALUES
    (v_contact1, v_ot_contact, v_admin_id, v_admin_id),
    (v_contact2, v_ot_contact, v_admin_id, v_admin_id),
    (v_contact3, v_ot_contact, v_admin_id, v_admin_id),
    (v_contact4, v_ot_contact, v_admin_id, v_admin_id),
    (v_contact5, v_ot_contact, v_admin_id, v_admin_id),
    (v_contact6, v_ot_contact, v_admin_id, v_admin_id),
    (v_contact7, v_ot_contact, v_admin_id, v_admin_id),
    (v_contact8, v_ot_contact, v_admin_id, v_admin_id);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_contact1, v_mod_identity, '{"name": "Sarah Johnson", "email": "sarah@techcorp.com", "phone": "+1-555-0101"}'::jsonb),
    (v_contact2, v_mod_identity, '{"name": "Michael Chen", "email": "m.chen@innovate.io", "phone": "+1-555-0202"}'::jsonb),
    (v_contact3, v_mod_identity, '{"name": "Emma Williams", "email": "emma.w@dataflow.com", "phone": "+44-20-7946-001"}'::jsonb),
    (v_contact4, v_mod_identity, '{"name": "Ahmed Hassan", "email": "ahmed@globalserv.ma", "phone": "+212-522-001122"}'::jsonb),
    (v_contact5, v_mod_identity, '{"name": "Lisa Park", "email": "lisa.park@startup.io", "phone": "+1-555-0505"}'::jsonb),
    (v_contact6, v_mod_identity, '{"name": "James Rodriguez", "email": "j.rodriguez@salesforce.com", "phone": "+1-555-0606"}'::jsonb),
    (v_contact7, v_mod_identity, '{"name": "Fatima Zahra", "email": "fatima@greentech.ma", "phone": "+212-661-334455"}'::jsonb),
    (v_contact8, v_mod_identity, '{"name": "David Kim", "email": "d.kim@cloudops.io", "phone": "+1-555-0808"}'::jsonb);

  -- ── Companies (5 total) ──
  v_company1 := gen_random_uuid();
  v_company2 := gen_random_uuid();
  v_company3 := gen_random_uuid();
  v_company4 := gen_random_uuid();
  v_company5 := gen_random_uuid();

  INSERT INTO objects (id, object_type_id, owner_id, created_by) VALUES
    (v_company1, v_ot_company, v_admin_id, v_admin_id),
    (v_company2, v_ot_company, v_admin_id, v_admin_id),
    (v_company3, v_ot_company, v_admin_id, v_admin_id),
    (v_company4, v_ot_company, v_admin_id, v_admin_id),
    (v_company5, v_ot_company, v_admin_id, v_admin_id);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_company1, v_mod_org, '{"company_name": "TechCorp Inc.", "industry": "Technology", "website": "https://techcorp.com", "size": "51-200", "address": "123 Silicon Valley, CA 94025"}'::jsonb),
    (v_company2, v_mod_org, '{"company_name": "Innovate.io", "industry": "SaaS", "website": "https://innovate.io", "size": "11-50"}'::jsonb),
    (v_company3, v_mod_org, '{"company_name": "Global Services Morocco", "industry": "Consulting", "website": "https://globalserv.ma", "size": "201-1000", "address": "Casablanca, Morocco"}'::jsonb),
    (v_company4, v_mod_org, '{"company_name": "GreenTech Solutions", "industry": "Renewable Energy", "website": "https://greentech.ma", "size": "51-200", "address": "Rabat, Morocco"}'::jsonb),
    (v_company5, v_mod_org, '{"company_name": "CloudOps Systems", "industry": "Cloud Infrastructure", "website": "https://cloudops.io", "size": "11-50"}'::jsonb);

  -- ── Deals (8 total, more variety in stages) ──
  v_deal1 := gen_random_uuid();
  v_deal2 := gen_random_uuid();
  v_deal3 := gen_random_uuid();
  v_deal4 := gen_random_uuid();
  v_deal5 := gen_random_uuid();
  v_deal6 := gen_random_uuid();
  v_deal7 := gen_random_uuid();
  v_deal8 := gen_random_uuid();

  INSERT INTO objects (id, object_type_id, owner_id, created_by) VALUES
    (v_deal1, v_ot_deal, v_admin_id, v_admin_id),
    (v_deal2, v_ot_deal, v_admin_id, v_admin_id),
    (v_deal3, v_ot_deal, v_admin_id, v_admin_id),
    (v_deal4, v_ot_deal, v_admin_id, v_admin_id),
    (v_deal5, v_ot_deal, v_admin_id, v_admin_id),
    (v_deal6, v_ot_deal, v_admin_id, v_admin_id),
    (v_deal7, v_ot_deal, v_admin_id, v_admin_id),
    (v_deal8, v_ot_deal, v_admin_id, v_admin_id);

  -- Deal identity modules
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_deal1, v_mod_identity, '{"name": "Enterprise License — TechCorp"}'::jsonb),
    (v_deal2, v_mod_identity, '{"name": "SaaS Platform Integration"}'::jsonb),
    (v_deal3, v_mod_identity, '{"name": "Consulting Retainer — Q3"}'::jsonb),
    (v_deal4, v_mod_identity, '{"name": "Data Migration Project"}'::jsonb),
    (v_deal5, v_mod_identity, '{"name": "Annual Support Contract"}'::jsonb),
    (v_deal6, v_mod_identity, '{"name": "Cloud Infrastructure Setup"}'::jsonb),
    (v_deal7, v_mod_identity, '{"name": "Mobile App Development"}'::jsonb),
    (v_deal8, v_mod_identity, '{"name": "Security Audit Package"}'::jsonb);

  -- Deal monetary modules
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_deal1, v_mod_monetary, '{"amount": 75000, "currency": "USD", "probability": 80}'::jsonb),
    (v_deal2, v_mod_monetary, '{"amount": 32000, "currency": "EUR", "probability": 60}'::jsonb),
    (v_deal3, v_mod_monetary, '{"amount": 120000, "currency": "MAD", "probability": 90}'::jsonb),
    (v_deal4, v_mod_monetary, '{"amount": 15000, "currency": "USD", "probability": 40}'::jsonb),
    (v_deal5, v_mod_monetary, '{"amount": 48000, "currency": "GBP", "probability": 95}'::jsonb),
    (v_deal6, v_mod_monetary, '{"amount": 95000, "currency": "USD", "probability": 70}'::jsonb),
    (v_deal7, v_mod_monetary, '{"amount": 180000, "currency": "EUR", "probability": 35}'::jsonb),
    (v_deal8, v_mod_monetary, '{"amount": 22000, "currency": "USD", "probability": 85}'::jsonb);

  -- Deal stage modules (spread across all statuses)
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_deal1, v_mod_stage, '{"status": "negotiation", "pipeline": "default"}'::jsonb),
    (v_deal2, v_mod_stage, '{"status": "interested", "pipeline": "default"}'::jsonb),
    (v_deal3, v_mod_stage, '{"status": "won", "pipeline": "default"}'::jsonb),
    (v_deal4, v_mod_stage, '{"status": "contacted", "pipeline": "default"}'::jsonb),
    (v_deal5, v_mod_stage, '{"status": "won", "pipeline": "default"}'::jsonb),
    (v_deal6, v_mod_stage, '{"status": "new", "pipeline": "default"}'::jsonb),
    (v_deal7, v_mod_stage, '{"status": "interested", "pipeline": "default"}'::jsonb),
    (v_deal8, v_mod_stage, '{"status": "lost", "pipeline": "default"}'::jsonb);

  -- Deal assignment modules
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_deal1, v_mod_assign, '{"assigned_to": "Sales Team", "priority": "high"}'::jsonb),
    (v_deal2, v_mod_assign, '{"assigned_to": "Partnerships", "priority": "medium"}'::jsonb),
    (v_deal4, v_mod_assign, '{"assigned_to": "Technical", "priority": "low"}'::jsonb),
    (v_deal6, v_mod_assign, '{"assigned_to": "James Rodriguez", "priority": "high"}'::jsonb),
    (v_deal7, v_mod_assign, '{"assigned_to": "Fatima Zahra", "priority": "urgent"}'::jsonb),
    (v_deal8, v_mod_assign, '{"assigned_to": "Sales Team", "priority": "medium"}'::jsonb);

  -- ── Projects (company creates a project to sell a product) ──
  v_project1 := gen_random_uuid();
  v_project2 := gen_random_uuid();
  v_project3 := gen_random_uuid();

  INSERT INTO objects (id, object_type_id, owner_id, created_by) VALUES
    (v_project1, v_ot_project, v_admin_id, v_admin_id),
    (v_project2, v_ot_project, v_admin_id, v_admin_id),
    (v_project3, v_ot_project, v_admin_id, v_admin_id);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_project1, v_mod_identity, '{"name": "Solar Panel Distribution — Morocco"}'::jsonb),
    (v_project2, v_mod_identity, '{"name": "Enterprise CRM Rollout — TechCorp"}'::jsonb),
    (v_project3, v_mod_identity, '{"name": "Cloud Migration — Global Services"}'::jsonb);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_project1, v_mod_stage, '{"status": "interested", "pipeline": "default"}'::jsonb),
    (v_project2, v_mod_stage, '{"status": "new", "pipeline": "default"}'::jsonb),
    (v_project3, v_mod_stage, '{"status": "negotiation", "pipeline": "default"}'::jsonb);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_project1, v_mod_monetary, '{"amount": 500000, "currency": "MAD", "probability": 50}'::jsonb),
    (v_project2, v_mod_monetary, '{"amount": 250000, "currency": "USD", "probability": 75}'::jsonb),
    (v_project3, v_mod_monetary, '{"amount": 85000, "currency": "EUR", "probability": 60}'::jsonb);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_project1, v_mod_assign, '{"assigned_to": "GreenTech Solutions", "priority": "high"}'::jsonb),
    (v_project2, v_mod_assign, '{"assigned_to": "TechCorp Inc.", "priority": "urgent"}'::jsonb),
    (v_project3, v_mod_assign, '{"assigned_to": "Global Services Morocco", "priority": "medium"}'::jsonb);

  -- ── Proposals (salespersons apply to projects) ──
  v_proposal1 := gen_random_uuid();
  v_proposal2 := gen_random_uuid();
  v_proposal3 := gen_random_uuid();
  v_proposal4 := gen_random_uuid();
  v_proposal5 := gen_random_uuid();

  INSERT INTO objects (id, object_type_id, owner_id, created_by) VALUES
    (v_proposal1, v_ot_proposal, v_admin_id, v_admin_id),
    (v_proposal2, v_ot_proposal, v_admin_id, v_admin_id),
    (v_proposal3, v_ot_proposal, v_admin_id, v_admin_id),
    (v_proposal4, v_ot_proposal, v_admin_id, v_admin_id),
    (v_proposal5, v_ot_proposal, v_admin_id, v_admin_id);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_proposal1, v_mod_identity, '{"name": "Proposal: Solar Panels — James R."}'::jsonb),
    (v_proposal2, v_mod_identity, '{"name": "Proposal: Solar Panels — Fatima Z."}'::jsonb),
    (v_proposal3, v_mod_identity, '{"name": "Proposal: CRM Rollout — Michael C."}'::jsonb),
    (v_proposal4, v_mod_identity, '{"name": "Proposal: Cloud Migration — David K."}'::jsonb),
    (v_proposal5, v_mod_identity, '{"name": "Proposal: Cloud Migration — Sarah J."}'::jsonb);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_proposal1, v_mod_monetary, '{"amount": 480000, "currency": "MAD", "probability": 60}'::jsonb),
    (v_proposal2, v_mod_monetary, '{"amount": 520000, "currency": "MAD", "probability": 45}'::jsonb),
    (v_proposal3, v_mod_monetary, '{"amount": 240000, "currency": "USD", "probability": 80}'::jsonb),
    (v_proposal4, v_mod_monetary, '{"amount": 78000, "currency": "EUR", "probability": 55}'::jsonb),
    (v_proposal5, v_mod_monetary, '{"amount": 90000, "currency": "EUR", "probability": 70}'::jsonb);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_proposal1, v_mod_stage, '{"status": "contacted", "pipeline": "default"}'::jsonb),
    (v_proposal2, v_mod_stage, '{"status": "new", "pipeline": "default"}'::jsonb),
    (v_proposal3, v_mod_stage, '{"status": "interested", "pipeline": "default"}'::jsonb),
    (v_proposal4, v_mod_stage, '{"status": "negotiation", "pipeline": "default"}'::jsonb),
    (v_proposal5, v_mod_stage, '{"status": "won", "pipeline": "default"}'::jsonb);

  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_proposal1, v_mod_assign, '{"assigned_to": "James Rodriguez", "priority": "high"}'::jsonb),
    (v_proposal2, v_mod_assign, '{"assigned_to": "Fatima Zahra", "priority": "medium"}'::jsonb),
    (v_proposal3, v_mod_assign, '{"assigned_to": "Michael Chen", "priority": "high"}'::jsonb),
    (v_proposal4, v_mod_assign, '{"assigned_to": "David Kim", "priority": "medium"}'::jsonb),
    (v_proposal5, v_mod_assign, '{"assigned_to": "Sarah Johnson", "priority": "low"}'::jsonb);

  -- ── Relations ──
  -- Contact → Company (works_for)
  INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
    (v_contact1, v_company1, 'works_for'),
    (v_contact2, v_company2, 'works_for'),
    (v_contact4, v_company3, 'works_for'),
    (v_contact6, v_company1, 'works_for'),
    (v_contact7, v_company4, 'works_for'),
    (v_contact8, v_company5, 'works_for');

  -- Deal → Company (belongs_to)
  INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
    (v_deal1, v_company1, 'belongs_to'),
    (v_deal2, v_company2, 'belongs_to'),
    (v_deal3, v_company3, 'belongs_to'),
    (v_deal6, v_company5, 'belongs_to'),
    (v_deal7, v_company4, 'belongs_to');

  -- Deal → Contact (assigned_to / related_to)
  INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
    (v_deal1, v_contact1, 'assigned_to'),
    (v_deal2, v_contact2, 'assigned_to'),
    (v_deal3, v_contact4, 'related_to'),
    (v_deal6, v_contact8, 'assigned_to'),
    (v_deal7, v_contact7, 'assigned_to');

  -- Project → Company (created_by_company)
  INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
    (v_project1, v_company4, 'created_by'),
    (v_project2, v_company1, 'created_by'),
    (v_project3, v_company3, 'created_by');

  -- Proposal → Project (applies_to)
  INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
    (v_proposal1, v_project1, 'applies_to'),
    (v_proposal2, v_project1, 'applies_to'),
    (v_proposal3, v_project2, 'applies_to'),
    (v_proposal4, v_project3, 'applies_to'),
    (v_proposal5, v_project3, 'applies_to');

  -- Proposal → Contact (submitted_by salesperson)
  INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
    (v_proposal1, v_contact6, 'submitted_by'),
    (v_proposal2, v_contact7, 'submitted_by'),
    (v_proposal3, v_contact2, 'submitted_by'),
    (v_proposal4, v_contact8, 'submitted_by'),
    (v_proposal5, v_contact1, 'submitted_by');

  -- ── Timeline Events ──
  INSERT INTO timeline_events (object_id, event_type, title, description, metadata, created_by) VALUES
    (v_deal1, 'status_change', 'Status → Negotiation', 'Deal moved from Interested to Negotiation', '{"from": "interested", "to": "negotiation"}'::jsonb, v_admin_id),
    (v_deal1, 'note', 'Initial meeting scheduled', 'Scheduled demo call for next Tuesday. CTO will attend.', '{}'::jsonb, v_admin_id),
    (v_deal1, 'relation_added', 'Linked to TechCorp Inc.', NULL, jsonb_build_object('target_id', v_company1), v_admin_id),
    (v_deal2, 'status_change', 'Status → Interested', 'Prospect expressed interest after webinar', '{"from": "contacted", "to": "interested"}'::jsonb, v_admin_id),
    (v_deal2, 'note', 'Follow-up sent', 'Sent proposal document via email', '{}'::jsonb, v_admin_id),
    (v_deal3, 'status_change', 'Status → Won', 'Contract signed', '{"from": "negotiation", "to": "won"}'::jsonb, v_admin_id),
    (v_deal3, 'note', 'Contract finalized', 'Q3 retainer agreement signed for 120k MAD', '{}'::jsonb, v_admin_id),
    (v_deal5, 'status_change', 'Status → Won', 'Annual renewal approved', '{"from": "negotiation", "to": "won"}'::jsonb, v_admin_id),
    (v_deal6, 'note', 'New lead from webinar', 'CloudOps systems showed interest in infrastructure setup', '{}'::jsonb, v_admin_id),
    (v_deal7, 'status_change', 'Status → Interested', 'GreenTech wants a mobile app for field workers', '{"from": "new", "to": "interested"}'::jsonb, v_admin_id),
    (v_deal8, 'status_change', 'Status → Lost', 'Budget cut by client', '{"from": "contacted", "to": "lost"}'::jsonb, v_admin_id),
    (v_contact1, 'note', 'Key stakeholder', 'Sarah is the primary decision maker at TechCorp for enterprise licenses', '{}'::jsonb, v_admin_id),
    (v_company1, 'note', 'Strategic account', 'TechCorp is our #1 prospect. Focus on enterprise licensing + support bundle.', '{}'::jsonb, v_admin_id),
    (v_project1, 'note', 'Project kickoff', 'Solar panel distribution project initiated by GreenTech Solutions', '{}'::jsonb, v_admin_id),
    (v_project1, 'status_change', 'Status → Interested', 'Two salespersons have submitted proposals', '{"from": "new", "to": "interested"}'::jsonb, v_admin_id),
    (v_proposal1, 'note', 'Proposal submitted', 'James Rodriguez submitted a competitive proposal for 480k MAD', '{}'::jsonb, v_admin_id),
    (v_proposal3, 'status_change', 'Status → Interested', 'Michael submitted CRM rollout proposal, TechCorp reviewing', '{"from": "new", "to": "interested"}'::jsonb, v_admin_id),
    (v_proposal5, 'status_change', 'Status → Won', 'Sarah''s proposal for cloud migration was accepted', '{"from": "negotiation", "to": "won"}'::jsonb, v_admin_id);

  -- ── Sample Custom Page: Sales Dashboard ──
  v_page1 := gen_random_uuid();

  INSERT INTO pages (id, name, slug, description, icon, is_public, created_by, layout) VALUES
    (v_page1, 'Sales Overview', 'sales-overview', 'Key sales metrics and pipeline status', 'BarChart3', true, v_admin_id, '{"columns": 4}'::jsonb)
  ON CONFLICT (slug) DO NOTHING;

  -- Always resolve the real page ID (in case the page already existed)
  SELECT id INTO v_page1 FROM pages WHERE slug = 'sales-overview';

  -- Only insert widgets if none exist yet for this page
  IF NOT EXISTS (SELECT 1 FROM page_widgets WHERE page_id = v_page1) THEN
    INSERT INTO page_widgets (page_id, widget_type, title, config, position, width) VALUES
      (v_page1, 'stat_card', 'Total Deals', '{"objectType": "deal", "aggType": "count", "color": "#3B82F6"}'::jsonb, 0, 1),
      (v_page1, 'stat_card', 'Total Revenue', '{"objectType": "deal", "moduleName": "monetary", "fieldKey": "amount", "aggType": "sum", "color": "#10B981"}'::jsonb, 1, 1),
      (v_page1, 'stat_card', 'Avg Deal Size', '{"objectType": "deal", "moduleName": "monetary", "fieldKey": "amount", "aggType": "avg", "color": "#F59E0B"}'::jsonb, 2, 1),
      (v_page1, 'stat_card', 'Total Contacts', '{"objectType": "contact", "aggType": "count", "color": "#8B5CF6"}'::jsonb, 3, 1),
      (v_page1, 'chart', 'Pipeline Distribution', '{"objectType": "deal", "chartType": "pie", "groupByModule": "stage", "groupByField": "status"}'::jsonb, 4, 2),
      (v_page1, 'pipeline', 'Deal Pipeline', '{"objectType": "deal"}'::jsonb, 5, 2),
      (v_page1, 'object_list', 'Recent Contacts', '{"objectType": "contact", "limit": 5}'::jsonb, 6, 2),
      (v_page1, 'timeline', 'Recent Activity', '{"limit": 10}'::jsonb, 7, 2);
  END IF;

  -- ── Sample Custom Page: Projects & Proposals ──
  v_page2 := gen_random_uuid();

  INSERT INTO pages (id, name, slug, description, icon, is_public, created_by, layout) VALUES
    (v_page2, 'Projects & Proposals', 'projects-proposals', 'Track projects and salesperson proposals', 'FolderKanban', true, v_admin_id, '{"columns": 2}'::jsonb)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_page2 FROM pages WHERE slug = 'projects-proposals';

  IF NOT EXISTS (SELECT 1 FROM page_widgets WHERE page_id = v_page2) THEN
    INSERT INTO page_widgets (page_id, widget_type, title, config, position, width) VALUES
      (v_page2, 'stat_card', 'Active Projects', '{"objectType": "project", "aggType": "count", "color": "#F59E0B"}'::jsonb, 0, 1),
      (v_page2, 'stat_card', 'Proposals Submitted', '{"objectType": "proposal", "aggType": "count", "color": "#EC4899"}'::jsonb, 1, 1),
      (v_page2, 'object_list', 'Projects', '{"objectType": "project", "limit": 10}'::jsonb, 2, 1),
      (v_page2, 'object_list', 'Recent Proposals', '{"objectType": "proposal", "limit": 10}'::jsonb, 3, 1),
      (v_page2, 'table_view', 'All Proposals Detail', '{"objectType": "proposal", "limit": 20}'::jsonb, 4, 2),
      (v_page2, 'chart', 'Proposal Status', '{"objectType": "proposal", "chartType": "bar", "groupByModule": "stage", "groupByField": "status"}'::jsonb, 5, 2);
  END IF;

  RAISE NOTICE 'Sample CRM data created: 8 contacts, 5 companies, 8 deals, 3 projects, 5 proposals, relations, timeline events, and 2 custom pages.';
END $$;

-- ──────────────────────────────────────────────
-- 8. OPTIONAL: First Admin User (Development/Testing)
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