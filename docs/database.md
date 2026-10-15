# FlowPilot AI — Database Architecture & Migrations

## 1. PostgreSQL & Supabase Migrations

All migrations live under `supabase/migrations/`:
- `20261015000001_initial_schema.sql`: Core tables, relational constraints, foreign keys, and indexes.
- `20261015000002_rls_policies.sql`: Row Level Security policies and helper security functions (`is_active_org_member`, `has_org_role`).
- `20261015000003_seed_data.sql`: Seed data for demo and initial templates.

## 2. Table Specifications
- `organizations`: Multi-tenant organization boundaries.
- `organization_members`: Users scoped to an organization with role (`owner`, `admin`, `manager`, `approver`, `member`).
- `departments`: Organizational business units with designated department managers.
- `workflows`: Workflow definitions, categories, and published version pointer.
- `workflow_versions`: Immutable version snapshots with cryptographic definition hashes.
- `requests`: Purchase and operational requests with integer minor units (`amount_minor`) and currency.
- `workflow_executions`: Running/paused/completed executions tracking state and current node.
- `execution_steps`: Node-by-node audit log with inputs, outputs, timestamps, and error codes.
- `approval_tasks`: Multi-stage human approval tasks with self-approval guards.
- `tasks`: General operational tasks assigned to team members.
- `documents`: Private document references, MIME checks, and AI-extracted data.
- `notifications`: In-app notification queue with deduplication keys.
- `audit_events`: Append-only audit trail capturing all critical actions.
- `ai_analyses`: Traceability log for model calls, prompt versions, confidence, and token usage.
- `approval_policies`: Configurable multi-tier monetary thresholds and approval stages.
- `jobs`: Durable PostgreSQL-backed / SQLite-backed queue with leasing and retry limits.

## 3. Monetary Modeling
Monetary values are stored strictly as positive 64-bit integers in minor units (e.g. 500,000 paise = ₹5,000.00). Floating-point arithmetic is strictly prohibited in policy evaluation.
