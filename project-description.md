# Aress CRM – Project Description

**Created:** 11/02/2026
**Updated:** 12/02/2026
**Deadline:** 19/02/2026 (1 week delivery)
**Technologies:** NextJS / Supabase

---

## 1. 🧩 Project Context

We are building a platform that connects companies with independent sales professionals.

To support internal operations, we need a **simplified CRM system** that allows us to:

* Track incoming leads
* Manage their commercial lifecycle
* Monitor performance and conversion metrics

This CRM will be used internally to structure and optimize our sales pipeline.

---

## 2. 🎯 Project Goal

Develop a simplified but well-structured CRM system that enables:

* Lead management
* Status tracking across a sales pipeline
* Performance visualization through a dashboard

This project is designed to evaluate:

* Code quality and structure
* Database design and modeling
* Business logic implementation
* UX/UI decisions
* Product reasoning and technical justification

The focus is not only on functionality but also on how decisions are made and explained.

---

## 3. ⚙️ Minimum Required Features

### 1️⃣ Lead Management

The system must allow users to:

* Add a lead
* Edit a lead
* Delete a lead
* View a list of leads

Each lead must contain the following fields:

* Name
* Email
* Phone number
* Company source (LinkedIn, Referral, Cold Call, etc.)
* Status (New, Contacted, Interested, Negotiation, Won, Lost)
* Creation date
* Notes

---

### 2️⃣ Visual Pipeline (Kanban View)

Create a Kanban-style board that:

* Displays leads grouped by status
* Allows moving a lead between statuses (drag & drop if possible)
* Automatically updates the database when a status changes

The pipeline should reflect real-time state consistency between UI and database.

---

### 3️⃣ Simple Dashboard

Provide a dashboard that displays:

* Total number of leads
* Number of leads per status
* Conversion rate
* A simple chart showing monthly lead evolution

The dashboard should provide clear and actionable insights.

---

## 5. 🔐 Bonus Features (Optional but Highly Valued)

* Basic authentication
* Multi-user support
* Action history tracking (audit log)
* Unit testing
* Documented API

These are not mandatory but will positively impact evaluation.

---

## 6. 📦 Deliverables

By the deadline (19/02/2026), the candidate must provide:

* Working application (deployed or runnable locally)
* Clear project structure
* Setup instructions (README)
* Explanation of technical choices
* Any relevant documentation

---

## 7. ⚙️ Initial Setup Instructions

### First-Time User Setup

After signing up or creating your user account via SQL, you must assign yourself a role to access the application. Follow these steps:

#### Option 1: Using the Setup Endpoint (Recommended)

```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"userEmail": "your-email@example.com", "role": "admin"}'
```

Or use the provided script:
```bash
bash scripts/setup-admin.sh
```

**Available roles:**
- `admin` - Full system access (all permissions)
- `manager` - Manage leads and view dashboard
- `sales_rep` - Create and edit own leads

#### Option 2: Direct Database Assignment

```sql
-- Get your user ID (from auth.users table)
-- Then assign a role:
INSERT INTO user_roles (user_id, role_id)
SELECT (SELECT id FROM profiles WHERE id = 'YOUR_USER_ID'),
       (SELECT id FROM roles WHERE name = 'admin');
```

### Permission Model

- **Users** are assigned one or more **Roles** via the `user_roles` table
- Each **Role** has multiple **Permissions** via the `role_permissions` table
- **Permissions** control access to features:
  - `dashboard:view` - Access dashboard analytics
  - `lead:read` - View leads
  - `lead:create` - Create new leads
  - `lead:update` - Edit any lead
  - `lead:delete` - Delete leads
  - `settings:status:*` - Manage lead statuses
  - `settings:source:*` - Manage lead sources
  - `audit:view` - View audit logs

### Error Handling

If you see **"Access Denied"** message:
1. Check that your user has a role assigned
2. Use `/api/admin/setup` to assign a role
3. Refresh the page

---

