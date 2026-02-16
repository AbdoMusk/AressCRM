-- ============================================================
-- Migration: 001_foundation
-- Description: Core tables for profiles, RBAC, lookup tables, audit
-- ============================================================

-- ============================================================
-- DYNAMIC LOOKUP TABLES
-- ============================================================

-- Lead statuses — fully dynamic, managed via settings UI.
CREATE TABLE lead_statuses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  color       TEXT DEFAULT '#6B7280',
  position    INT  NOT NULL DEFAULT 0,
  is_win      BOOLEAN NOT NULL DEFAULT false,
  is_loss     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead sources — fully dynamic.
CREATE TABLE lead_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
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
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL UNIQUE,
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
-- AUDIT LOGS — platform-wide
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'data',
  entity_type TEXT,
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_leads_status ON leads(status_id);
CREATE INDEX idx_leads_source ON leads(source_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_created_by ON leads(created_by);

CREATE INDEX idx_lead_statuses_position ON lead_statuses(position);
CREATE INDEX idx_lead_sources_position ON lead_sources(position);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

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

-- ============================================================
-- POSTGRES FUNCTIONS FOR DASHBOARD
-- ============================================================
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

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_sources;
