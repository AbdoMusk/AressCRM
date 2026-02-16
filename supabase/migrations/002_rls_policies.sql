-- ============================================================
-- Migration: 002_rls_policies
-- Description: Row-Level Security policies for all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- LEADS
-- ============================================================
CREATE POLICY "Authenticated users can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own or assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid())
  WITH CHECK (true);

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- LEAD STATUSES / SOURCES — readable by all, writable via service role
-- ============================================================
CREATE POLICY "Authenticated users can read lead statuses"
  ON lead_statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages lead statuses"
  ON lead_statuses FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can read lead sources"
  ON lead_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages lead sources"
  ON lead_sources FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- RBAC TABLES — readable by all authenticated, writable via service role
-- ============================================================
CREATE POLICY "Authenticated users can read roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages roles"
  ON roles FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can read permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages permissions"
  ON permissions FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can read role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages role_permissions"
  ON role_permissions FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can read user_roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages user_roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- AUDIT LOGS — append-only for authenticated, readable by all authenticated
-- ============================================================
CREATE POLICY "Authenticated users can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role can insert system audit logs (e.g., failed login)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
