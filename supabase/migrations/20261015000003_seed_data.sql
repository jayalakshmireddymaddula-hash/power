-- FlowPilot AI - Initial Seed Data for Demo & Standard Organizations
-- Migration: 20261015000003_seed_data.sql

-- Creates default demo organization and user records if needed
INSERT INTO public.organizations (id, name, slug, settings, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Acme Global Enterprises',
    'acme-global',
    '{
        "defaultCurrency": "INR",
        "allowSelfApproval": false,
        "autoRemindOverdueHours": 24,
        "baselineManualMinutes": {
            "procurement": 120,
            "hr": 90,
            "operations": 60,
            "document_processing": 45,
            "default": 60
        }
    }'::jsonb,
    '00000000-0000-0000-0000-000000000010'
) ON CONFLICT (slug) DO NOTHING;

-- Seed departments
INSERT INTO public.departments (id, organization_id, name)
VALUES 
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering & Technology'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Finance & Accounting'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Operations & Logistics'),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'People Operations (HR)')
ON CONFLICT (organization_id, name) DO NOTHING;

-- Seed default procurement policy
INSERT INTO public.approval_policies (id, organization_id, name, category, configuration, version, active, created_by)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Standard Corporate Procurement Policy',
    'procurement',
    '{
        "tiers": [
            {
                "id": "tier_1",
                "name": "Standard Purchase (Up to ₹5,000)",
                "minAmountMinor": 0,
                "maxAmountMinor": 500000,
                "currency": "INR",
                "stages": [
                    {
                        "stageNumber": 1,
                        "name": "Single Approver Review",
                        "requiredRole": "approver",
                        "requireDepartmentManager": false,
                        "requireFinanceApprover": false,
                        "timeoutHours": 48
                    }
                ]
            },
            {
                "id": "tier_2",
                "name": "Department Manager Review (₹5,000 to ₹25,000)",
                "minAmountMinor": 500001,
                "maxAmountMinor": 2500000,
                "currency": "INR",
                "stages": [
                    {
                        "stageNumber": 1,
                        "name": "Department Manager Approval",
                        "requiredRole": "manager",
                        "requireDepartmentManager": true,
                        "requireFinanceApprover": false,
                        "timeoutHours": 48
                    }
                ]
            },
            {
                "id": "tier_3",
                "name": "Executive & Finance Multi-stage Approval (Above ₹25,000)",
                "minAmountMinor": 2500001,
                "maxAmountMinor": null,
                "currency": "INR",
                "stages": [
                    {
                        "stageNumber": 1,
                        "name": "Department Manager Approval",
                        "requiredRole": "manager",
                        "requireDepartmentManager": true,
                        "requireFinanceApprover": false,
                        "timeoutHours": 48
                    },
                    {
                        "stageNumber": 2,
                        "name": "Finance Executive Authorization",
                        "requiredRole": "admin",
                        "requireDepartmentManager": false,
                        "requireFinanceApprover": true,
                        "timeoutHours": 48
                    }
                ]
            }
        ],
        "allowSelfApproval": false,
        "requireSupportingDocumentAboveMinor": 1000000,
        "allowedCurrencies": ["INR", "USD", "EUR", "GBP"],
        "autoEscalateHours": 72
    }'::jsonb,
    1,
    true,
    '00000000-0000-0000-0000-000000000010'
) ON CONFLICT (organization_id, name, version) DO NOTHING;
