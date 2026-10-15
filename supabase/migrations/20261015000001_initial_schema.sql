-- FlowPilot AI - Initial PostgreSQL Schema Migration
-- Migration: 20261015000001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
    slug text NOT NULL UNIQUE,
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Organization Members
CREATE TABLE public.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'approver', 'member')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
    invited_by uuid,
    joined_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id)
);

-- 3. Departments
CREATE TABLE public.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 100),
    manager_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name),
    UNIQUE (organization_id, id)
);

-- 4. Workflows
CREATE TABLE public.workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 3 AND 150),
    description text NOT NULL DEFAULT '',
    category text NOT NULL,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    current_published_version integer,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, id)
);

-- 5. Workflow Versions (Immutable snapshots)
CREATE TABLE public.workflow_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workflow_id uuid NOT NULL,
    version integer NOT NULL CHECK (version > 0),
    definition jsonb NOT NULL,
    definition_hash text NOT NULL,
    validation_result jsonb NOT NULL DEFAULT '{}'::jsonb,
    published_by uuid,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workflow_id, version),
    UNIQUE (organization_id, id),
    FOREIGN KEY (organization_id, workflow_id) REFERENCES public.workflows(organization_id, id) ON DELETE CASCADE
);

-- 6. Requests
CREATE TABLE public.requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    request_number bigint GENERATED ALWAYS AS IDENTITY,
    title text NOT NULL CHECK (length(trim(title)) BETWEEN 5 AND 150),
    category text NOT NULL,
    description text NOT NULL,
    business_justification text NOT NULL DEFAULT '',
    amount_minor bigint CHECK (amount_minor IS NULL OR amount_minor > 0),
    currency text,
    department_id uuid,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'draft', 'submitted', 'processing', 'awaiting_approval',
        'changes_requested', 'approved', 'rejected', 'completed', 'cancelled'
    )),
    requested_by uuid NOT NULL,
    needed_by timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, request_number),
    UNIQUE (organization_id, id),
    FOREIGN KEY (organization_id, department_id) REFERENCES public.departments(organization_id, id),
    UNIQUE (organization_id, requested_by, idempotency_key)
);

-- 7. Workflow Executions
CREATE TABLE public.workflow_executions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workflow_id uuid NOT NULL,
    workflow_version_id uuid NOT NULL,
    request_id uuid,
    triggered_by uuid,
    trigger_type text NOT NULL DEFAULT 'manual',
    status text NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued', 'running', 'waiting_approval', 'waiting_delay',
        'completed', 'failed', 'cancelled'
    )),
    input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    current_node_id text,
    error_code text,
    error_message text,
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, workflow_id) REFERENCES public.workflows(organization_id, id),
    FOREIGN KEY (organization_id, workflow_version_id) REFERENCES public.workflow_versions(organization_id, id),
    FOREIGN KEY (organization_id, request_id) REFERENCES public.requests(organization_id, id)
);

-- 8. Execution Steps
CREATE TABLE public.execution_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    node_id text NOT NULL,
    node_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'skipped')),
    input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_code text,
    error_message text,
    attempt_count integer NOT NULL DEFAULT 0,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (execution_id, node_id),
    UNIQUE (organization_id, id)
);

-- 9. Approval Tasks
CREATE TABLE public.approval_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    request_id uuid NOT NULL,
    execution_id uuid NOT NULL,
    assigned_to uuid,
    required_role text,
    stage integer NOT NULL DEFAULT 1 CHECK (stage > 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'changes_requested', 'cancelled'
    )),
    decision_comment text,
    decided_by uuid,
    decided_at timestamptz,
    due_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, request_id) REFERENCES public.requests(organization_id, id),
    FOREIGN KEY (organization_id, execution_id) REFERENCES public.workflow_executions(organization_id, id)
);

-- 10. General Tasks
CREATE TABLE public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    execution_id uuid REFERENCES public.workflow_executions(id),
    title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 200),
    description text NOT NULL DEFAULT '',
    assigned_to uuid,
    created_by uuid,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_at timestamptz,
    completed_at timestamptz,
    idempotency_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Documents
CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    uploaded_by uuid NOT NULL,
    request_id uuid REFERENCES public.requests(id),
    original_filename text NOT NULL,
    storage_path text NOT NULL UNIQUE,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    checksum_sha256 text,
    status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed', 'deleted')),
    extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    extraction_confidence numeric(5,4),
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Notifications
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    resource_type text,
    resource_id uuid,
    deduplication_key text,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, deduplication_key)
);

-- 13. Audit Events (Append-only)
CREATE TABLE public.audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_user_id uuid,
    actor_type text NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'worker')),
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    correlation_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 14. AI Analysis Records
CREATE TABLE public.ai_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    requested_by uuid,
    resource_type text NOT NULL,
    resource_id uuid,
    analysis_type text NOT NULL,
    model_name text NOT NULL,
    prompt_version text NOT NULL,
    result jsonb NOT NULL,
    confidence numeric(5,4),
    status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'review_required')),
    token_usage jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 15. Approval Policies
CREATE TABLE public.approval_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL,
    configuration jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    active boolean NOT NULL DEFAULT true,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name, version)
);

-- 16. Durable Jobs Queue
CREATE TABLE public.jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    queue_name text NOT NULL DEFAULT 'default',
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5,
    scheduled_for timestamptz NOT NULL DEFAULT now(),
    leased_until timestamptz,
    leased_by text,
    error_message text,
    idempotency_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, idempotency_key)
);

-- Performance Indexes
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_requests_org_status ON public.requests(organization_id, status);
CREATE INDEX idx_requests_requester ON public.requests(requested_by);
CREATE INDEX idx_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_executions_org_status ON public.workflow_executions(organization_id, status);
CREATE INDEX idx_approval_tasks_assigned ON public.approval_tasks(assigned_to, status);
CREATE INDEX idx_approval_tasks_org ON public.approval_tasks(organization_id, status);
CREATE INDEX idx_tasks_assigned_org ON public.tasks(assigned_to, organization_id, status);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_jobs_pending ON public.jobs(queue_name, status, scheduled_for);
CREATE INDEX idx_audit_events_resource ON public.audit_events(organization_id, resource_type, resource_id);
