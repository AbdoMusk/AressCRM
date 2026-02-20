-- ============================================================
-- Migration 006: Views System
-- Saved view configurations per object type (table/kanban layout,
-- filters, sorts, visible fields).
-- ============================================================

CREATE TABLE IF NOT EXISTS views (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon          TEXT DEFAULT 'List',
  layout_type   TEXT NOT NULL DEFAULT 'table'
                  CHECK (layout_type IN ('table', 'kanban')),
  -- Kanban-specific: which module+field to group by
  kanban_field_key   TEXT,
  kanban_module_name TEXT,
  -- Saved filters: [{ field, module, operator, value }]
  filters       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Saved sorts: [{ field, module, direction }]
  sorts         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Visible fields: [{ module, field, width?, position }]
  visible_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Group-by for table view
  group_by_field  TEXT,
  group_by_module TEXT,
  -- Visibility
  is_default    BOOLEAN NOT NULL DEFAULT false,
  visibility    TEXT NOT NULL DEFAULT 'workspace'
                  CHECK (visibility IN ('workspace', 'unlisted')),
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_views_object_type ON views(object_type_id);
CREATE INDEX idx_views_created_by  ON views(created_by);

-- Updated-at trigger
CREATE TRIGGER set_views_updated_at
  BEFORE UPDATE ON views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE views ENABLE ROW LEVEL SECURITY;

CREATE POLICY views_select ON views FOR SELECT USING (
  visibility = 'workspace'
  OR created_by = auth.uid()
);

CREATE POLICY views_insert ON views FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY views_update ON views FOR UPDATE USING (
  created_by = auth.uid()
);

CREATE POLICY views_delete ON views FOR DELETE USING (
  created_by = auth.uid() AND is_default = false
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE views;
