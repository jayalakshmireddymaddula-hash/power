-- FlowPilot AI - Row Level Security Policies
-- Migration: 20261015000002_rls_policies.sql

-- Helper function: verify active organization membership
CREATE OR REPLACE FUNCTION public.is_active_org_member(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = check_org_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
$$;

-- Helper function: verify organization role
CREATE OR REPLACE FUNCTION public.has_org_role(check_org_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = check_org_id
          AND user_id = auth.uid()
          AND status = 'active'
          AND role = ANY(allowed_roles)
    );
$$;

-- Enable RLS across all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 1. Organizations Policies
CREATE POLICY "Members can view their organizations"
    ON public.organizations FOR SELECT
    USING (public.is_active_org_member(id));

CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update their organizations"
    ON public.organizations FOR UPDATE
    USING (public.has_org_role(id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_org_role(id, ARRAY['owner', 'admin']));

-- 2. Organization Members Policies
CREATE POLICY "Members can view members in their organization"
    ON public.organization_members FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Admins and owners can invite/manage members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['owner', 'admin'])
        OR (user_id = auth.uid() AND role = 'owner') -- Initial org creation
    );

CREATE POLICY "Admins and owners can update members"
    ON public.organization_members FOR UPDATE
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));

-- 3. Departments Policies
CREATE POLICY "Members can view departments"
    ON public.departments FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Admins and owners can manage departments"
    ON public.departments FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));

-- 4. Workflows Policies
CREATE POLICY "Members can view workflows"
    ON public.workflows FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Designers, admins, owners can manage workflows"
    ON public.workflows FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']));

-- 5. Workflow Versions Policies (Immutable snapshots)
CREATE POLICY "Members can view workflow versions"
    ON public.workflow_versions FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Designers can publish immutable workflow versions"
    ON public.workflow_versions FOR INSERT
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager']));

-- 6. Requests Policies
CREATE POLICY "Members can view requests in their organization"
    ON public.requests FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Active members can create requests"
    ON public.requests FOR INSERT
    WITH CHECK (
        public.is_active_org_member(organization_id)
        AND requested_by = auth.uid()
    );

CREATE POLICY "Requesters can update their draft requests"
    ON public.requests FOR UPDATE
    USING (
        requested_by = auth.uid()
        AND status IN ('draft', 'changes_requested')
    );

-- 7. Workflow Executions & Steps Policies
CREATE POLICY "Members can view executions"
    ON public.workflow_executions FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Members can view execution steps"
    ON public.execution_steps FOR SELECT
    USING (public.is_active_org_member(organization_id));

-- 8. Approval Tasks Policies
CREATE POLICY "Members can view approval tasks"
    ON public.approval_tasks FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Assigned approvers or admins can update decisions"
    ON public.approval_tasks FOR UPDATE
    USING (
        public.is_active_org_member(organization_id)
        AND (
            assigned_to = auth.uid()
            OR public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager'])
        )
    );

-- 9. General Tasks Policies
CREATE POLICY "Members can view tasks"
    ON public.tasks FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Assignees or creators can update tasks"
    ON public.tasks FOR UPDATE
    USING (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR public.has_org_role(organization_id, ARRAY['owner', 'admin', 'manager'])
    );

-- 10. Documents Policies
CREATE POLICY "Members can view documents"
    ON public.documents FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Members can upload documents"
    ON public.documents FOR INSERT
    WITH CHECK (
        public.is_active_org_member(organization_id)
        AND uploaded_by = auth.uid()
    );

-- 11. Notifications Policies
CREATE POLICY "Users can view and manage their own notifications"
    ON public.notifications FOR ALL
    USING (user_id = auth.uid());

-- 12. Audit Events Policies (Read-only for members, insert by server/worker)
CREATE POLICY "Members can view audit events"
    ON public.audit_events FOR SELECT
    USING (public.is_active_org_member(organization_id));

-- 13. AI Analyses Policies
CREATE POLICY "Members can view AI analyses"
    ON public.ai_analyses FOR SELECT
    USING (public.is_active_org_member(organization_id));

-- 14. Approval Policies Policies
CREATE POLICY "Members can view approval policies"
    ON public.approval_policies FOR SELECT
    USING (public.is_active_org_member(organization_id));

CREATE POLICY "Admins and owners can manage approval policies"
    ON public.approval_policies FOR ALL
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));
