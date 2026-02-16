-- ============================================================
-- Migration: 003_companies
-- Description: Companies as first-class entities, new permissions
-- ============================================================

-- ============================================================
-- COMPANIES TABLE
-- ============================================================
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  industry    TEXT,
  website     TEXT,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPANY MEMBERS (users assigned to companies)
-- ============================================================
CREATE TABLE company_members (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);

-- ============================================================
-- ADD company_id FK TO LEADS (keeps legacy company TEXT)
-- ============================================================
ALTER TABLE leads ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_companies_assigned_to ON companies(assigned_to);
CREATE INDEX idx_companies_created_by ON companies(created_by);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_leads_company_id ON leads(company_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Companies: readable by all authenticated, writable via service_role
CREATE POLICY "Authenticated users can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own or assigned companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Users can delete own companies"
  ON companies FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Service role manages companies"
  ON companies FOR ALL
  TO service_role
  USING (true);

-- Company members: readable by all authenticated, writable via service_role
CREATE POLICY "Authenticated users can read company members"
  ON company_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages company members"
  ON company_members FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE companies;

-- ============================================================
-- NEW PERMISSIONS
-- ============================================================
INSERT INTO permissions (action, description) VALUES
  ('lead:move:own',            'Change status of own leads only'),
  ('lead:read:own',            'View only own leads'),
  ('company:create',           'Create a new company'),
  ('company:read',             'View all companies'),
  ('company:read:own',         'View only own/assigned companies'),
  ('company:update',           'Edit any company'),
  ('company:update:own',       'Edit only own/assigned companies'),
  ('company:delete',           'Delete any company'),
  ('company:leads:read',       'View leads for any company'),
  ('company:leads:read:own',   'View leads only for own companies'),
  ('company:members:manage',   'Manage company member assignments')
ON CONFLICT (action) DO NOTHING;

-- Admin gets all new permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.action IN (
    'lead:move:own','lead:read:own',
    'company:create','company:read','company:read:own',
    'company:update','company:update:own','company:delete',
    'company:leads:read','company:leads:read:own',
    'company:members:manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets company read/create/update + leads read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.action IN (
    'company:create','company:read','company:update',
    'company:leads:read','company:members:manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Sales rep gets company read + own leads
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep'
  AND p.action IN (
    'lead:move:own','lead:read:own',
    'company:read:own','company:leads:read:own'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
