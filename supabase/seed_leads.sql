-- ============================================================================
-- Leads Seed Data
-- Adds a Lead object type with a lead_info module, sample leads, and
-- relations to existing contacts, companies, deals, projects, and proposals.
-- Run AFTER the main seed.sql.
-- ============================================================================

-- ──────────────────────────────────────────────
-- 1. Lead-Specific Module: lead_info
-- ──────────────────────────────────────────────

INSERT INTO modules (name, display_name, description, icon, schema) VALUES
(
  'lead_info',
  'Lead Info',
  'Lead-specific details: source, score, temperature, and conversion status',
  'Target',
  '{
    "fields": [
      { "key": "source", "type": "select", "label": "Lead Source", "required": true, "default": "website", "options": [
        { "value": "website", "label": "Website", "color": "#3B82F6" },
        { "value": "referral", "label": "Referral", "color": "#10B981" },
        { "value": "cold_call", "label": "Cold Call", "color": "#F59E0B" },
        { "value": "social_media", "label": "Social Media", "color": "#8B5CF6" },
        { "value": "trade_show", "label": "Trade Show", "color": "#EC4899" },
        { "value": "advertisement", "label": "Advertisement", "color": "#6366F1" },
        { "value": "partner", "label": "Partner", "color": "#14B8A6" },
        { "value": "other", "label": "Other", "color": "#6B7280" }
      ]},
      { "key": "temperature", "type": "select", "label": "Temperature", "required": true, "default": "warm", "options": [
        { "value": "cold", "label": "Cold", "color": "#3B82F6" },
        { "value": "warm", "label": "Warm", "color": "#F59E0B" },
        { "value": "hot", "label": "Hot", "color": "#EF4444" }
      ]},
      { "key": "score", "type": "number", "label": "Lead Score", "min": 0, "max": 100, "default": 50 },
      { "key": "converted", "type": "select", "label": "Conversion Status", "default": "open", "options": [
        { "value": "open", "label": "Open", "color": "#3B82F6" },
        { "value": "qualified", "label": "Qualified", "color": "#8B5CF6" },
        { "value": "converted", "label": "Converted", "color": "#10B981" },
        { "value": "disqualified", "label": "Disqualified", "color": "#EF4444" }
      ]},
      { "key": "notes", "type": "textarea", "label": "Notes" }
    ]
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────
-- 2. Lead Object Type
-- ──────────────────────────────────────────────

INSERT INTO object_types (name, display_name, description, icon, color) VALUES
('lead', 'Lead', 'Sales leads and prospects', 'Target', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- Lead = identity (required) + lead_info (required) + stage (required) + assignment (optional)
INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 0
FROM object_types ot, modules m
WHERE ot.name = 'lead' AND m.name = 'identity'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 1
FROM object_types ot, modules m
WHERE ot.name = 'lead' AND m.name = 'lead_info'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, true, 2
FROM object_types ot, modules m
WHERE ot.name = 'lead' AND m.name = 'stage'
ON CONFLICT DO NOTHING;

INSERT INTO object_type_modules (object_type_id, module_id, required, position)
SELECT ot.id, m.id, false, 3
FROM object_types ot, modules m
WHERE ot.name = 'lead' AND m.name = 'assignment'
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────
-- 3. Sample Lead Data
-- ──────────────────────────────────────────────

DO $$
DECLARE
  v_admin_id uuid;
  -- Module IDs
  v_mod_identity uuid;
  v_mod_lead_info uuid;
  v_mod_stage uuid;
  v_mod_assign uuid;
  -- Object type IDs
  v_ot_lead uuid;
  v_ot_contact uuid;
  v_ot_company uuid;
  v_ot_deal uuid;
  v_ot_project uuid;
  v_ot_proposal uuid;
  -- Lead IDs
  v_lead1 uuid;
  v_lead2 uuid;
  v_lead3 uuid;
  v_lead4 uuid;
  v_lead5 uuid;
  v_lead6 uuid;
  v_lead7 uuid;
  v_lead8 uuid;
  v_lead9 uuid;
  v_lead10 uuid;
  -- Existing object IDs for relations
  v_contact1 uuid;
  v_contact2 uuid;
  v_contact5 uuid;
  v_contact7 uuid;
  v_contact8 uuid;
  v_company1 uuid;
  v_company2 uuid;
  v_company3 uuid;
  v_company4 uuid;
  v_company5 uuid;
  v_deal1 uuid;
  v_deal2 uuid;
  v_deal6 uuid;
  v_project1 uuid;
  v_project2 uuid;
  v_proposal3 uuid;
BEGIN
  -- Get admin user
  SELECT ur.user_id INTO v_admin_id
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'admin'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No users found — skipping lead seed data.';
    RETURN;
  END IF;

  -- Look up module IDs
  SELECT id INTO v_mod_identity FROM modules WHERE name = 'identity';
  SELECT id INTO v_mod_lead_info FROM modules WHERE name = 'lead_info';
  SELECT id INTO v_mod_stage FROM modules WHERE name = 'stage';
  SELECT id INTO v_mod_assign FROM modules WHERE name = 'assignment';

  -- Look up object type IDs
  SELECT id INTO v_ot_lead FROM object_types WHERE name = 'lead';
  SELECT id INTO v_ot_contact FROM object_types WHERE name = 'contact';
  SELECT id INTO v_ot_company FROM object_types WHERE name = 'company';
  SELECT id INTO v_ot_deal FROM object_types WHERE name = 'deal';
  SELECT id INTO v_ot_project FROM object_types WHERE name = 'project';
  SELECT id INTO v_ot_proposal FROM object_types WHERE name = 'proposal';

  -- Look up some existing objects for relations
  -- (pick deterministic ones by name via identity module data)
  SELECT o.id INTO v_contact1 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_contact AND om.data->>'name' = 'Sarah Johnson' LIMIT 1;
  SELECT o.id INTO v_contact2 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_contact AND om.data->>'name' = 'Michael Chen' LIMIT 1;
  SELECT o.id INTO v_contact5 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_contact AND om.data->>'name' = 'Lisa Park' LIMIT 1;
  SELECT o.id INTO v_contact7 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_contact AND om.data->>'name' = 'Fatima Zahra' LIMIT 1;
  SELECT o.id INTO v_contact8 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_contact AND om.data->>'name' = 'David Kim' LIMIT 1;

  SELECT o.id INTO v_company1 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_company AND om.data->>'company_name' = 'TechCorp Inc.' LIMIT 1;
  SELECT o.id INTO v_company2 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_company AND om.data->>'company_name' = 'Innovate.io' LIMIT 1;
  SELECT o.id INTO v_company3 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_company AND om.data->>'company_name' = 'Global Services Morocco' LIMIT 1;
  SELECT o.id INTO v_company4 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_company AND om.data->>'company_name' = 'GreenTech Solutions' LIMIT 1;
  SELECT o.id INTO v_company5 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_company AND om.data->>'company_name' = 'CloudOps Systems' LIMIT 1;

  SELECT o.id INTO v_deal1 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_deal AND om.data->>'name' = 'Enterprise License — TechCorp' LIMIT 1;
  SELECT o.id INTO v_deal2 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_deal AND om.data->>'name' = 'SaaS Platform Integration' LIMIT 1;
  SELECT o.id INTO v_deal6 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_deal AND om.data->>'name' = 'Cloud Infrastructure Setup' LIMIT 1;

  SELECT o.id INTO v_project1 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_project AND om.data->>'name' = 'Solar Panel Distribution — Morocco' LIMIT 1;
  SELECT o.id INTO v_project2 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_project AND om.data->>'name' = 'Enterprise CRM Rollout — TechCorp' LIMIT 1;

  SELECT o.id INTO v_proposal3 FROM objects o
    JOIN object_modules om ON om.object_id = o.id
    WHERE o.object_type_id = v_ot_proposal AND om.data->>'name' = 'Proposal: CRM Rollout — Michael C.' LIMIT 1;

  -- ── Create 10 Leads ──
  v_lead1  := gen_random_uuid();
  v_lead2  := gen_random_uuid();
  v_lead3  := gen_random_uuid();
  v_lead4  := gen_random_uuid();
  v_lead5  := gen_random_uuid();
  v_lead6  := gen_random_uuid();
  v_lead7  := gen_random_uuid();
  v_lead8  := gen_random_uuid();
  v_lead9  := gen_random_uuid();
  v_lead10 := gen_random_uuid();

  INSERT INTO objects (id, object_type_id, owner_id, created_by) VALUES
    (v_lead1,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead2,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead3,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead4,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead5,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead6,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead7,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead8,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead9,  v_ot_lead, v_admin_id, v_admin_id),
    (v_lead10, v_ot_lead, v_admin_id, v_admin_id);

  -- Lead identity modules
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_lead1,  v_mod_identity, '{"name": "Lead: Omar Benali — ERP Consultation", "email": "omar.benali@atlas-group.ma", "phone": "+212-661-112233"}'::jsonb),
    (v_lead2,  v_mod_identity, '{"name": "Lead: Priya Sharma — Cloud Migration", "email": "priya@cloudnext.in", "phone": "+91-98765-43210"}'::jsonb),
    (v_lead3,  v_mod_identity, '{"name": "Lead: John Smith — Security Audit", "email": "j.smith@fortisec.com", "phone": "+1-555-9901"}'::jsonb),
    (v_lead4,  v_mod_identity, '{"name": "Lead: Amina El Fassi — Solar Partnership", "email": "amina@greenmena.com", "phone": "+212-522-778899"}'::jsonb),
    (v_lead5,  v_mod_identity, '{"name": "Lead: Carlos Mendoza — Mobile App", "email": "carlos@appvista.mx", "phone": "+52-55-1234-5678"}'::jsonb),
    (v_lead6,  v_mod_identity, '{"name": "Lead: Wei Zhang — Data Analytics", "email": "wei.zhang@databridge.cn", "phone": "+86-10-12345678"}'::jsonb),
    (v_lead7,  v_mod_identity, '{"name": "Lead: Sophia Laurent — SaaS Platform", "email": "sophia@digisaas.fr", "phone": "+33-1-23-45-67-89"}'::jsonb),
    (v_lead8,  v_mod_identity, '{"name": "Lead: Youssef Alami — E-Commerce", "email": "youssef@shopma.ma", "phone": "+212-661-445566"}'::jsonb),
    (v_lead9,  v_mod_identity, '{"name": "Lead: Emily Davis — HR Platform", "email": "emily.d@peopleops.co", "phone": "+1-555-7722"}'::jsonb),
    (v_lead10, v_mod_identity, '{"name": "Lead: Kenji Tanaka — Manufacturing IoT", "email": "kenji@smartfactory.jp", "phone": "+81-3-1234-5678"}'::jsonb);

  -- Lead info modules (source, temperature, score, conversion status)
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_lead1,  v_mod_lead_info, '{"source": "referral", "temperature": "hot", "score": 85, "converted": "qualified", "notes": "Referred by Global Services Morocco. Looking for full ERP overhaul."}'::jsonb),
    (v_lead2,  v_mod_lead_info, '{"source": "website", "temperature": "warm", "score": 65, "converted": "open", "notes": "Filled out contact form. Interested in cloud migration services."}'::jsonb),
    (v_lead3,  v_mod_lead_info, '{"source": "trade_show", "temperature": "warm", "score": 60, "converted": "open", "notes": "Met at CyberSec Expo 2024. Wants a penetration testing package."}'::jsonb),
    (v_lead4,  v_mod_lead_info, '{"source": "partner", "temperature": "hot", "score": 90, "converted": "converted", "notes": "Partner referral from GreenTech. Already signed initial agreement."}'::jsonb),
    (v_lead5,  v_mod_lead_info, '{"source": "social_media", "temperature": "cold", "score": 35, "converted": "open", "notes": "Engaged via LinkedIn ad. Needs follow-up."}'::jsonb),
    (v_lead6,  v_mod_lead_info, '{"source": "cold_call", "temperature": "cold", "score": 25, "converted": "open", "notes": "Initial call made. Decision maker unavailable, scheduled callback."}'::jsonb),
    (v_lead7,  v_mod_lead_info, '{"source": "advertisement", "temperature": "warm", "score": 55, "converted": "qualified", "notes": "Responded to Google Ads campaign. Wants SaaS demo."}'::jsonb),
    (v_lead8,  v_mod_lead_info, '{"source": "website", "temperature": "hot", "score": 78, "converted": "qualified", "notes": "Downloaded e-commerce whitepaper. Requested pricing."}'::jsonb),
    (v_lead9,  v_mod_lead_info, '{"source": "referral", "temperature": "warm", "score": 70, "converted": "open", "notes": "Referred by Emily''s network. Evaluating HR platforms."}'::jsonb),
    (v_lead10, v_mod_lead_info, '{"source": "trade_show", "temperature": "hot", "score": 82, "converted": "qualified", "notes": "Met at IoT World 2024. Has budget approved for Q2."}'::jsonb);

  -- Lead stage modules (spread across statuses)
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_lead1,  v_mod_stage, '{"status": "interested", "pipeline": "default"}'::jsonb),
    (v_lead2,  v_mod_stage, '{"status": "contacted", "pipeline": "default"}'::jsonb),
    (v_lead3,  v_mod_stage, '{"status": "contacted", "pipeline": "default"}'::jsonb),
    (v_lead4,  v_mod_stage, '{"status": "won", "pipeline": "default"}'::jsonb),
    (v_lead5,  v_mod_stage, '{"status": "new", "pipeline": "default"}'::jsonb),
    (v_lead6,  v_mod_stage, '{"status": "new", "pipeline": "default"}'::jsonb),
    (v_lead7,  v_mod_stage, '{"status": "interested", "pipeline": "default"}'::jsonb),
    (v_lead8,  v_mod_stage, '{"status": "negotiation", "pipeline": "default"}'::jsonb),
    (v_lead9,  v_mod_stage, '{"status": "contacted", "pipeline": "default"}'::jsonb),
    (v_lead10, v_mod_stage, '{"status": "negotiation", "pipeline": "default"}'::jsonb);

  -- Lead assignment modules
  INSERT INTO object_modules (object_id, module_id, data) VALUES
    (v_lead1,  v_mod_assign, '{"assigned_to": "James Rodriguez", "priority": "high"}'::jsonb),
    (v_lead2,  v_mod_assign, '{"assigned_to": "Sarah Johnson", "priority": "medium"}'::jsonb),
    (v_lead3,  v_mod_assign, '{"assigned_to": "David Kim", "priority": "medium"}'::jsonb),
    (v_lead4,  v_mod_assign, '{"assigned_to": "Fatima Zahra", "priority": "high"}'::jsonb),
    (v_lead5,  v_mod_assign, '{"assigned_to": "Sales Team", "priority": "low"}'::jsonb),
    (v_lead7,  v_mod_assign, '{"assigned_to": "Michael Chen", "priority": "medium"}'::jsonb),
    (v_lead8,  v_mod_assign, '{"assigned_to": "Fatima Zahra", "priority": "high"}'::jsonb),
    (v_lead10, v_mod_assign, '{"assigned_to": "David Kim", "priority": "urgent"}'::jsonb);

  -- ── Relations: Lead → Contact (related_to / converted_from) ──
  IF v_contact1 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead2, v_contact1, 'related_to')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_contact2 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead7, v_contact2, 'assigned_to')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_contact7 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead4, v_contact7, 'related_to')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_contact8 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead3, v_contact8, 'related_to')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Relations: Lead → Company (belongs_to) ──
  IF v_company1 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead2, v_company1, 'belongs_to')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_company3 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead1, v_company3, 'belongs_to')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_company4 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead4, v_company4, 'belongs_to')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_company5 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead6, v_company5, 'belongs_to')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Relations: Lead → Deal (generated_deal — lead converted to deal) ──
  IF v_deal1 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead1, v_deal1, 'generated')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_deal2 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead7, v_deal2, 'generated')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_deal6 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead6, v_deal6, 'generated')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Relations: Lead → Project (interested_in) ──
  IF v_project1 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead4, v_project1, 'interested_in')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_project2 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead2, v_project2, 'interested_in')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Relations: Lead → Proposal (resulted_in) ──
  IF v_proposal3 IS NOT NULL THEN
    INSERT INTO object_relations (from_object_id, to_object_id, relation_type) VALUES
      (v_lead7, v_proposal3, 'resulted_in')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Timeline Events for Leads ──
  INSERT INTO timeline_events (object_id, event_type, title, description, metadata, created_by) VALUES
    (v_lead1, 'note', 'High-value referral lead', 'Referred by Ahmed from Global Services Morocco. Interested in full ERP solution.', '{}'::jsonb, v_admin_id),
    (v_lead1, 'status_change', 'Status → Interested', 'Lead responded positively after initial call.', '{"from": "new", "to": "interested"}'::jsonb, v_admin_id),
    (v_lead2, 'note', 'Website inquiry', 'Priya from CloudNext filled out the website form requesting cloud consultation.', '{}'::jsonb, v_admin_id),
    (v_lead3, 'note', 'Trade show contact', 'Met John at CyberSec Expo. Exchanged cards, follow-up scheduled.', '{}'::jsonb, v_admin_id),
    (v_lead4, 'status_change', 'Status → Won', 'Lead converted! Amina signed initial solar partnership agreement.', '{"from": "negotiation", "to": "won"}'::jsonb, v_admin_id),
    (v_lead5, 'note', 'Social media lead', 'Carlos clicked on LinkedIn ad for mobile app development.', '{}'::jsonb, v_admin_id),
    (v_lead7, 'status_change', 'Status → Interested', 'Sophia requested a SaaS platform demo after seeing our ad.', '{"from": "contacted", "to": "interested"}'::jsonb, v_admin_id),
    (v_lead8, 'note', 'Hot website lead', 'Youssef downloaded our e-commerce guide and requested pricing the same day.', '{}'::jsonb, v_admin_id),
    (v_lead8, 'status_change', 'Status → Negotiation', 'Pricing discussion started. Budget looks good.', '{"from": "interested", "to": "negotiation"}'::jsonb, v_admin_id),
    (v_lead10, 'note', 'IoT World 2024 lead', 'Kenji has approved budget for manufacturing IoT pilot. Q2 target.', '{}'::jsonb, v_admin_id),
    (v_lead10, 'status_change', 'Status → Negotiation', 'Contract terms under review by Kenji''s legal team.', '{"from": "interested", "to": "negotiation"}'::jsonb, v_admin_id);

  RAISE NOTICE 'Lead seed data created: 10 leads with relations to contacts, companies, deals, projects, and proposals.';
END $$;
