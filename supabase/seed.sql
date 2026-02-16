-- ============================================================
-- Seed Data: Default statuses, sources, roles, permissions
-- ============================================================

-- Default lead statuses
INSERT INTO lead_statuses (name, slug, color, position, is_win, is_loss) VALUES
  ('New',         'new',         '#3B82F6', 0, false, false),
  ('Contacted',   'contacted',   '#8B5CF6', 1, false, false),
  ('Interested',  'interested',  '#F59E0B', 2, false, false),
  ('Negotiation', 'negotiation', '#F97316', 3, false, false),
  ('Won',         'won',         '#10B981', 4, true,  false),
  ('Lost',        'lost',        '#EF4444', 5, false, true);

-- Default lead sources
INSERT INTO lead_sources (name, slug, position) VALUES
  ('LinkedIn',   'linkedin',   0),
  ('Referral',   'referral',   1),
  ('Cold Call',  'cold_call',  2),
  ('Website',    'website',    3),
  ('Event',      'event',      4),
  ('Other',      'other',      5);

-- Roles
INSERT INTO roles (name, description) VALUES
  ('admin',     'Full system access'),
  ('manager',   'Manage leads and view dashboard'),
  ('sales_rep', 'Create and edit own leads');

-- Permissions
INSERT INTO permissions (action, description) VALUES
  ('lead:create',              'Create a new lead'),
  ('lead:read',                'View leads'),
  ('lead:read:own',            'View only own leads'),
  ('lead:update',              'Edit any lead'),
  ('lead:update:own',          'Edit only own leads'),
  ('lead:delete',              'Delete any lead'),
  ('lead:move',                'Change lead status'),
  ('lead:move:own',            'Change status of own leads only'),
  ('company:create',           'Create a new company'),
  ('company:read',             'View all companies'),
  ('company:read:own',         'View only own/assigned companies'),
  ('company:update',           'Edit any company'),
  ('company:update:own',       'Edit only own/assigned companies'),
  ('company:delete',           'Delete any company'),
  ('company:leads:read',       'View leads for any company'),
  ('company:leads:read:own',   'View leads only for own companies'),
  ('company:members:manage',   'Manage company member assignments'),
  ('dashboard:view',           'View dashboard analytics'),
  ('settings:status:read',     'View lead statuses'),
  ('settings:status:create',   'Create lead statuses'),
  ('settings:status:update',   'Edit lead statuses'),
  ('settings:status:delete',   'Delete lead statuses'),
  ('settings:source:read',     'View lead sources'),
  ('settings:source:create',   'Create lead sources'),
  ('settings:source:update',   'Edit lead sources'),
  ('settings:source:delete',   'Delete lead sources'),
  ('user:manage',              'Manage users and roles'),
  ('role:manage',              'Create/edit/delete roles and permissions'),
  ('audit:view',               'View audit logs');

-- Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin';

-- Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager'
  AND p.action IN (
    'lead:create','lead:read','lead:update','lead:delete','lead:move',
    'dashboard:view','audit:view',
    'settings:status:read','settings:source:read',
    'company:create','company:read','company:update',
    'company:leads:read','company:members:manage'
  );

-- Sales rep
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'sales_rep'
  AND p.action IN (
    'lead:create','lead:read','lead:read:own','lead:update:own','lead:move','lead:move:own',
    'dashboard:view',
    'settings:status:read','settings:source:read',
    'company:read:own','company:leads:read:own'
  );
