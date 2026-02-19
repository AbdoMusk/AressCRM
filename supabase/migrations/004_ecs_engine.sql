-- ============================================================================
-- Migration 004: OMP Engine (Object-Module-Processor)
--
-- Creates the AressCRM composable business engine with Object-Module-Processor
-- architecture. Replaces hardcoded CRM tables with flexible, composable schema.
-- ============================================================================

-- ──────────────────────────────────────────────
-- 1. Drop old domain tables and functions
-- ──────────────────────────────────────────────

DROP FUNCTION IF EXISTS leads_count_by_status();
DROP FUNCTION IF EXISTS leads_monthly_evolution();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
DROP TRIGGER IF EXISTS update_lead_statuses_updated_at ON lead_statuses;
DROP TRIGGER IF EXISTS update_lead_sources_updated_at ON lead_sources;
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;

DROP TABLE IF EXISTS company_members CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS lead_statuses CASCADE;
DROP TABLE IF EXISTS lead_sources CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- ──────────────────────────────────────────────
-- 2. Module Registry (formerly "components")
-- ──────────────────────────────────────────────

CREATE TABLE modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon        TEXT,          -- lucide icon name
  schema      JSONB NOT NULL, -- field definitions
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE modules IS 'Registry of composable module types. Each module defines a data schema that can be attached to objects.';
COMMENT ON COLUMN modules.schema IS 'JSON schema defining fields: { fields: [{ key, type, label, required?, options?, min?, max?, default? }] }';

-- ──────────────────────────────────────────────
-- 3. Object Type Templates
-- ──────────────────────────────────────────────

CREATE TABLE object_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,          -- lucide icon name
  color        TEXT,          -- hex color for UI
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE object_types IS 'Template definitions. Defines what module combinations constitute a Contact, Deal, Company, etc.';

CREATE TABLE object_type_modules (
  object_type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  module_id      UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
  required       BOOLEAN NOT NULL DEFAULT true,
  position       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (object_type_id, module_id)
);

COMMENT ON TABLE object_type_modules IS 'Maps which modules an object type includes. Required modules must be provided on object creation.';

-- ──────────────────────────────────────────────
-- 4. Core Objects
-- ──────────────────────────────────────────────

CREATE TABLE objects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE RESTRICT,
  owner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by     UUID NOT NULL REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE objects IS 'Core object table. An object is just an ID with a type. All data lives in attached modules.';

-- ──────────────────────────────────────────────
-- 5. Object Module Data
-- ──────────────────────────────────────────────

CREATE TABLE object_modules (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
  data      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (object_id, module_id)
);

COMMENT ON TABLE object_modules IS 'Actual module data attached to objects. One instance per module type per object.';

-- ──────────────────────────────────────────────
-- 6. Object Relations (Graph)
-- ──────────────────────────────────────────────

CREATE TABLE object_relations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  to_object_id   UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  relation_type  TEXT NOT NULL,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_relation CHECK (from_object_id != to_object_id)
);

COMMENT ON TABLE object_relations IS 'Graph-based relationships between objects. Replaces hardcoded FK relationships.';
COMMENT ON COLUMN object_relations.relation_type IS 'Freeform relation type: works_for, belongs_to, assigned_to, parent_of, etc.';

-- ──────────────────────────────────────────────
-- 7. Permissions (OMP-aware)
-- ──────────────────────────────────────────────

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

-- Module-level permission matrix
CREATE TABLE role_module_permissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_id      UUID REFERENCES modules(id) ON DELETE CASCADE,     -- NULL = all modules
  object_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE, -- NULL = all types
  can_read       BOOLEAN NOT NULL DEFAULT false,
  can_write      BOOLEAN NOT NULL DEFAULT false,
  can_delete     BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (role_id, module_id, object_type_id)
);

COMMENT ON TABLE role_module_permissions IS 'Module-level access control. Determines which roles can read/write/delete specific module data.';

-- ──────────────────────────────────────────────
-- 8. Indexes
-- ──────────────────────────────────────────────

-- Object lookups
CREATE INDEX idx_objects_type ON objects(object_type_id);
CREATE INDEX idx_objects_owner ON objects(owner_id);
CREATE INDEX idx_objects_created_by ON objects(created_by);
CREATE INDEX idx_objects_created_at ON objects(created_at DESC);

-- Module data queries (GIN for JSONB)
CREATE INDEX idx_object_modules_object ON object_modules(object_id);
CREATE INDEX idx_object_modules_module ON object_modules(module_id);
CREATE INDEX idx_object_modules_data ON object_modules USING GIN (data);

-- Relation traversal
CREATE INDEX idx_object_relations_from ON object_relations(from_object_id);
CREATE INDEX idx_object_relations_to ON object_relations(to_object_id);
CREATE INDEX idx_object_relations_type ON object_relations(relation_type);

-- Permission lookups
CREATE INDEX idx_role_module_perms_role ON role_module_permissions(role_id);

-- ──────────────────────────────────────────────
-- 9. Triggers
-- ──────────────────────────────────────────────

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_object_types_updated_at
  BEFORE UPDATE ON object_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_objects_updated_at
  BEFORE UPDATE ON objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_object_modules_updated_at
  BEFORE UPDATE ON object_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────
-- 10. Row-Level Security
-- ──────────────────────────────────────────────

-- Modules (registry) — read for all authenticated, write via service_role
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY modules_read ON modules FOR SELECT TO authenticated USING (true);

-- Object Types — read for all, write via service_role
ALTER TABLE object_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY object_types_read ON object_types FOR SELECT TO authenticated USING (true);

-- Object Type Modules — read for all, write via service_role
ALTER TABLE object_type_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY object_type_modules_read ON object_type_modules FOR SELECT TO authenticated USING (true);

-- Objects — owner or admin via service_role
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY objects_read ON objects FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY objects_insert ON objects FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY objects_update ON objects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid());
CREATE POLICY objects_delete ON objects FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR created_by = auth.uid());

-- Object Modules
ALTER TABLE object_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY object_modules_read ON object_modules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = object_modules.object_id
        AND (o.owner_id = auth.uid() OR o.created_by = auth.uid())
    )
  );
CREATE POLICY object_modules_insert ON object_modules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = object_modules.object_id
        AND (o.owner_id = auth.uid() OR o.created_by = auth.uid())
    )
  );
CREATE POLICY object_modules_update ON object_modules FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = object_modules.object_id
        AND (o.owner_id = auth.uid() OR o.created_by = auth.uid())
    )
  );
CREATE POLICY object_modules_delete ON object_modules FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = object_modules.object_id
        AND (o.owner_id = auth.uid() OR o.created_by = auth.uid())
    )
  );

-- Object Relations
ALTER TABLE object_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY object_relations_read ON object_relations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE (o.id = object_relations.from_object_id OR o.id = object_relations.to_object_id)
        AND (o.owner_id = auth.uid() OR o.created_by = auth.uid())
    )
  );
CREATE POLICY object_relations_insert ON object_relations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = object_relations.from_object_id
        AND (o.owner_id = auth.uid() OR o.created_by = auth.uid())
    )
  );
CREATE POLICY object_relations_delete ON object_relations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM objects o
      WHERE (o.id = object_relations.from_object_id OR o.id = object_relations.to_object_id)
        AND (o.owner_id = auth.uid() OR o.created_by = auth.uid())
    )
  );

-- Permissions — read for all authenticated, write via service_role
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY permissions_read ON permissions FOR SELECT TO authenticated USING (true);

-- Role Permissions — read for all, write via service_role
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_permissions_read ON role_permissions FOR SELECT TO authenticated USING (true);

-- Role Module Permissions
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY role_module_permissions_read ON role_module_permissions FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────
-- 11. Realtime
-- ──────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE objects;
ALTER PUBLICATION supabase_realtime ADD TABLE object_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE object_relations;

-- ──────────────────────────────────────────────
-- 12. Helper Functions
-- ──────────────────────────────────────────────

-- Count objects grouped by type
CREATE OR REPLACE FUNCTION count_objects_by_type()
RETURNS TABLE (
  object_type_id uuid,
  type_name text,
  display_name text,
  icon text,
  color text,
  count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ot.id AS object_type_id,
    ot.name AS type_name,
    ot.display_name,
    COALESCE(ot.icon, 'Box') AS icon,
    COALESCE(ot.color, '#6B7280') AS color,
    COUNT(o.id) AS count
  FROM object_types ot
  LEFT JOIN objects o ON o.object_type_id = ot.id
  GROUP BY ot.id, ot.name, ot.display_name, ot.icon, ot.color
  ORDER BY ot.name;
END;
$$;

-- Aggregate a numeric field from a module's JSONB data
CREATE OR REPLACE FUNCTION aggregate_module_field(
  p_module_name text,
  p_field_key text,
  p_agg_type text DEFAULT 'sum'
)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result numeric;
  agg_fn text;
BEGIN
  -- Validate aggregation type
  agg_fn := CASE p_agg_type
    WHEN 'sum' THEN 'SUM'
    WHEN 'avg' THEN 'AVG'
    WHEN 'count' THEN 'COUNT'
    WHEN 'min' THEN 'MIN'
    WHEN 'max' THEN 'MAX'
    ELSE 'SUM'
  END;
  
  EXECUTE format(
    'SELECT %s((om.data->>%L)::numeric)
     FROM object_modules om
     JOIN modules m ON m.id = om.module_id
     WHERE m.name = %L',
    agg_fn, p_field_key, p_module_name
  ) INTO result;
  RETURN COALESCE(result, 0);
END;
$$;

-- Count objects by a module field value (group by)
CREATE OR REPLACE FUNCTION count_by_module_field(
  p_module_name text,
  p_field_key text
)
RETURNS TABLE (field_value text, count bigint) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.data->>p_field_key AS field_value,
    COUNT(*) AS count
  FROM object_modules om
  JOIN modules m ON m.id = om.module_id
  WHERE m.name = p_module_name
    AND om.data->>p_field_key IS NOT NULL
  GROUP BY om.data->>p_field_key
  ORDER BY count DESC;
END;
$$;
