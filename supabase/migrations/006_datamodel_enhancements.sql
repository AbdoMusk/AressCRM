-- ============================================================================
-- Migration 006: Data Model Enhancements
--
-- Adds is_active toggles for object types and modules, and a schema-level
-- relation definitions table for defining relations between object types.
-- ============================================================================

-- ──────────────────────────────────────────────
-- 1. Add is_active to object_types
-- ──────────────────────────────────────────────

ALTER TABLE object_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN object_types.is_active IS 'Whether this object type is active. Deactivated types are hidden from the UI but data is preserved.';

-- ──────────────────────────────────────────────
-- 2. Add is_active to modules  
-- ──────────────────────────────────────────────

ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN modules.is_active IS 'Whether this module is active. Deactivated modules are hidden but data is preserved.';

-- ──────────────────────────────────────────────
-- 3. Schema-level Relation Definitions
--    Defines relationships between object types (not instances)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS object_type_relations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type_id       UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  target_type_id       UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  relation_type        TEXT NOT NULL CHECK (relation_type IN ('one_to_many', 'many_to_one', 'many_to_many')),
  source_field_name    TEXT NOT NULL,  -- Field name displayed on source object (e.g., "Employees")
  target_field_name    TEXT NOT NULL,  -- Field name displayed on target object (e.g., "Company")
  is_active            BOOLEAN NOT NULL DEFAULT true,
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type_id, source_field_name)
);

COMMENT ON TABLE object_type_relations IS 'Schema-level relation definitions between object types. Defines how types relate (one-to-many, many-to-one, many-to-many).';
COMMENT ON COLUMN object_type_relations.source_field_name IS 'The label shown on the source object type for this relation (e.g., "Employees" on Company)';
COMMENT ON COLUMN object_type_relations.target_field_name IS 'The label shown on the target object type for this relation (e.g., "Company" on Person)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_otr_source ON object_type_relations(source_type_id);
CREATE INDEX IF NOT EXISTS idx_otr_target ON object_type_relations(target_type_id);
CREATE INDEX IF NOT EXISTS idx_otr_type ON object_type_relations(relation_type);

-- Trigger for updated_at
CREATE TRIGGER update_object_type_relations_updated_at
  BEFORE UPDATE ON object_type_relations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE object_type_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY otr_read ON object_type_relations FOR SELECT TO authenticated USING (true);

