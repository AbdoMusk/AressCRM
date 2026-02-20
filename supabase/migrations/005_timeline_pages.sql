-- ============================================================================
-- Migration 005: Timeline Events & Custom Pages
-- Adds timeline tracking for object lifecycle and user-customizable pages
-- ============================================================================

-- ──────────────────────────────────────────────
-- 1. Timeline Events — tracks lifecycle changes on any object
-- ──────────────────────────────────────────────

CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,        -- 'status_change', 'note', 'relation_added', 'module_attached', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',     -- flexible payload (old_value, new_value, etc.)
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_events_object ON timeline_events(object_id, created_at DESC);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);

-- ──────────────────────────────────────────────
-- 2. Custom Pages — user-created pages with widget layout
-- ──────────────────────────────────────────────

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'FileText',
  layout JSONB NOT NULL DEFAULT '{"columns": 2}',   -- layout configuration
  is_public BOOLEAN NOT NULL DEFAULT false,          -- visible to all users
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE page_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,         -- 'stat_card', 'chart', 'object_list', 'pipeline', 'timeline', 'processor_report'
  title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}', -- widget-specific configuration
  position INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 1,       -- grid columns (1 or 2)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_widgets_page ON page_widgets(page_id, position);

-- ──────────────────────────────────────────────
-- 3. RLS Policies
-- ──────────────────────────────────────────────

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_widgets ENABLE ROW LEVEL SECURITY;

-- Timeline: viewable by all authenticated, writable by object owner/admin
CREATE POLICY "timeline_events_select" ON timeline_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "timeline_events_insert" ON timeline_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Pages: public pages visible to all, private to creator
CREATE POLICY "pages_select" ON pages
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "pages_insert" ON pages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "pages_update" ON pages
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "pages_delete" ON pages
  FOR DELETE USING (created_by = auth.uid());

-- Page widgets: follow parent page access
CREATE POLICY "page_widgets_select" ON page_widgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_widgets.page_id
        AND (p.is_public = true OR p.created_by = auth.uid())
    )
  );

CREATE POLICY "page_widgets_insert" ON page_widgets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_widgets.page_id AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "page_widgets_update" ON page_widgets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_widgets.page_id AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "page_widgets_delete" ON page_widgets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pages p
      WHERE p.id = page_widgets.page_id AND p.created_by = auth.uid()
    )
  );

-- ──────────────────────────────────────────────
-- 4. Triggers
-- ──────────────────────────────────────────────

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_page_widgets_updated_at
  BEFORE UPDATE ON page_widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────
-- 5. Helper Functions
-- ──────────────────────────────────────────────

-- Get pipeline distribution for objects with a stage module
CREATE OR REPLACE FUNCTION pipeline_distribution(p_object_type TEXT DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT, color TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(om.data->>'status', 'unknown') AS status,
    COUNT(*)::BIGINT AS count,
    COALESCE(
      (SELECT opt->>'color'
       FROM modules m2,
            jsonb_array_elements(m2.schema->'fields') AS f,
            jsonb_array_elements(f->'options') AS opt
       WHERE m2.name = 'stage'
         AND f->>'key' = 'status'
         AND opt->>'value' = COALESCE(om.data->>'status', 'unknown')
       LIMIT 1),
      '#6B7280'
    ) AS color
  FROM object_modules om
  JOIN modules m ON m.id = om.module_id AND m.name = 'stage'
  JOIN objects o ON o.id = om.object_id
  LEFT JOIN object_types ot ON ot.id = o.object_type_id
  WHERE (p_object_type IS NULL OR ot.name = p_object_type)
  GROUP BY om.data->>'status'
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get monetary summary across all objects (or filtered by type)
CREATE OR REPLACE FUNCTION monetary_summary(p_object_type TEXT DEFAULT NULL)
RETURNS TABLE(
  total_value NUMERIC,
  avg_value NUMERIC,
  total_weighted NUMERIC,
  deal_count BIGINT,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM((om.data->>'amount')::NUMERIC), 0) AS total_value,
    COALESCE(AVG((om.data->>'amount')::NUMERIC), 0) AS avg_value,
    COALESCE(SUM(
      (om.data->>'amount')::NUMERIC *
      COALESCE((om.data->>'probability')::NUMERIC / 100.0, 0.5)
    ), 0) AS total_weighted,
    COUNT(*)::BIGINT AS deal_count,
    COALESCE(MODE() WITHIN GROUP (ORDER BY om.data->>'currency'), 'USD') AS currency
  FROM object_modules om
  JOIN modules m ON m.id = om.module_id AND m.name = 'monetary'
  JOIN objects o ON o.id = om.object_id
  LEFT JOIN object_types ot ON ot.id = o.object_type_id
  WHERE (p_object_type IS NULL OR ot.name = p_object_type);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get conversion rate (won / (won + lost))
CREATE OR REPLACE FUNCTION conversion_rate(p_object_type TEXT DEFAULT NULL)
RETURNS TABLE(won_count BIGINT, lost_count BIGINT, total_closed BIGINT, rate NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE om.data->>'status' IN ('won', 'completed'))::BIGINT AS won_count,
    COUNT(*) FILTER (WHERE om.data->>'status' = 'lost')::BIGINT AS lost_count,
    COUNT(*) FILTER (WHERE om.data->>'status' IN ('won', 'completed', 'lost'))::BIGINT AS total_closed,
    CASE
      WHEN COUNT(*) FILTER (WHERE om.data->>'status' IN ('won', 'completed', 'lost')) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE om.data->>'status' IN ('won', 'completed'))::NUMERIC /
        COUNT(*) FILTER (WHERE om.data->>'status' IN ('won', 'completed', 'lost'))::NUMERIC * 100,
        1
      )
    END AS rate
  FROM object_modules om
  JOIN modules m ON m.id = om.module_id AND m.name = 'stage'
  JOIN objects o ON o.id = om.object_id
  LEFT JOIN object_types ot ON ot.id = o.object_type_id
  WHERE (p_object_type IS NULL OR ot.name = p_object_type);
END;
$$ LANGUAGE plpgsql STABLE;

-- Monthly object creation evolution
CREATE OR REPLACE FUNCTION monthly_object_evolution(p_months INT DEFAULT 6)
RETURNS TABLE(month TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month,
    COUNT(*)::BIGINT AS count
  FROM objects o
  WHERE o.created_at >= date_trunc('month', now()) - (p_months || ' months')::INTERVAL
  GROUP BY date_trunc('month', o.created_at)
  ORDER BY date_trunc('month', o.created_at);
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_events;
