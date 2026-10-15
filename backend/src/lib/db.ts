import { createClient, Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";
import { config } from "../config.js";
import { WORKFLOW_TEMPLATES } from "@flowpilot/shared";
import bcrypt from "bcryptjs";

// Ensure data directory exists
const dbDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFilePath = path.join(dbDir, "flowpilot.db");
const dbUrl = config.DATABASE_URL || `file:${dbFilePath}`;

export const client: Client = createClient({
  url: dbUrl,
});

// Configure WAL mode and busy timeout for concurrent safety
try {
  await client.execute("PRAGMA journal_mode = WAL;");
  await client.execute("PRAGMA busy_timeout = 10000;");
  await client.execute("PRAGMA synchronous = NORMAL;");
} catch {
  // Remote HTTP client may not support local pragmas
}

export interface DatabaseService {
  query<T = any>(sql: string, args?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, args?: any[]): Promise<T | null>;
  execute(sql: string, args?: any[]): Promise<{ rowsAffected: number; lastInsertRowid?: bigint | number }>;
  transaction<T>(fn: (tx: Client) => Promise<T>): Promise<T>;
  initSchema(): Promise<void>;
  seedInitialData(): Promise<void>;
}

export const db: DatabaseService = {
  async query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    const res = await client.execute({ sql, args });
    return res.rows as unknown as T[];
  },

  async queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
    const res = await client.execute({ sql, args });
    if (!res.rows || res.rows.length === 0) return null;
    return res.rows[0] as unknown as T;
  },

  async execute(sql: string, args: any[] = []): Promise<{ rowsAffected: number; lastInsertRowid?: bigint | number }> {
    const res = await client.execute({ sql, args });
    return {
      rowsAffected: res.rowsAffected,
      lastInsertRowid: res.lastInsertRowid,
    };
  },

  async transaction<T>(fn: (tx: Client) => Promise<T>): Promise<T> {
    const tx = await client.transaction("write");
    try {
      const result = await fn(tx as unknown as Client);
      await tx.commit();
      return result;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  },

  async initSchema(): Promise<void> {
    // Initialize schema matching PostgreSQL / Supabase tables
    await client.batch([
      // Users table (for Auth simulation and Supabase compatibility)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        avatar_url TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Organizations
      `CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        settings TEXT NOT NULL DEFAULT '{}',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Organization Members
      `CREATE TABLE IF NOT EXISTS organization_members (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'approver', 'member')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
        invited_by TEXT,
        joined_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (organization_id, user_id)
      );`,

      // Departments
      `CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        manager_user_id TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (organization_id, name)
      );`,

      // Workflows
      `CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
        current_published_version INTEGER,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Workflow Versions
      `CREATE TABLE IF NOT EXISTS workflow_versions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        definition TEXT NOT NULL,
        definition_hash TEXT NOT NULL,
        validation_result TEXT NOT NULL DEFAULT '{}',
        published_by TEXT,
        published_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (workflow_id, version)
      );`,

      // Requests
      `CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        request_number INTEGER,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        business_justification TEXT NOT NULL DEFAULT '',
        amount_minor INTEGER,
        currency TEXT,
        department_id TEXT REFERENCES departments(id),
        priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
          'draft', 'submitted', 'processing', 'awaiting_approval',
          'changes_requested', 'approved', 'rejected', 'completed', 'cancelled'
        )),
        requested_by TEXT NOT NULL REFERENCES users(id),
        needed_by TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        idempotency_key TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (organization_id, requested_by, idempotency_key)
      );`,

      // Workflow Executions
      `CREATE TABLE IF NOT EXISTS workflow_executions (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        workflow_id TEXT NOT NULL REFERENCES workflows(id),
        workflow_version_id TEXT NOT NULL REFERENCES workflow_versions(id),
        request_id TEXT REFERENCES requests(id),
        triggered_by TEXT,
        trigger_type TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
          'queued', 'running', 'waiting_approval', 'waiting_delay',
          'completed', 'failed', 'cancelled'
        )),
        input_data TEXT NOT NULL DEFAULT '{}',
        output_data TEXT NOT NULL DEFAULT '{}',
        current_node_id TEXT,
        error_code TEXT,
        error_message TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Execution Steps
      `CREATE TABLE IF NOT EXISTS execution_steps (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        execution_id TEXT NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
        node_id TEXT NOT NULL,
        node_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'waiting', 'completed', 'failed', 'skipped')),
        input_data TEXT NOT NULL DEFAULT '{}',
        output_data TEXT NOT NULL DEFAULT '{}',
        error_code TEXT,
        error_message TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (execution_id, node_id)
      );`,

      // Approval Tasks
      `CREATE TABLE IF NOT EXISTS approval_tasks (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        request_id TEXT NOT NULL REFERENCES requests(id),
        execution_id TEXT NOT NULL REFERENCES workflow_executions(id),
        assigned_to TEXT,
        required_role TEXT,
        stage INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'approved', 'rejected', 'changes_requested', 'cancelled'
        )),
        decision_comment TEXT,
        decided_by TEXT,
        decided_at TEXT,
        due_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Tasks
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        execution_id TEXT REFERENCES workflow_executions(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        assigned_to TEXT,
        created_by TEXT,
        priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        due_at TEXT,
        completed_at TEXT,
        idempotency_key TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Documents
      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        uploaded_by TEXT NOT NULL,
        request_id TEXT,
        original_filename TEXT NOT NULL,
        storage_path TEXT UNIQUE NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        checksum_sha256 TEXT,
        status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed', 'deleted')),
        extracted_data TEXT NOT NULL DEFAULT '{}',
        extraction_confidence REAL,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Notifications
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        deduplication_key TEXT,
        read_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (user_id, deduplication_key)
      );`,

      // Audit Events
      `CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        actor_user_id TEXT,
        actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'worker')),
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        correlation_id TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // AI Analyses
      `CREATE TABLE IF NOT EXISTS ai_analyses (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        requested_by TEXT,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        analysis_type TEXT NOT NULL,
        model_name TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        result TEXT NOT NULL,
        confidence REAL,
        status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'review_required')),
        token_usage TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );`,

      // Approval Policies
      `CREATE TABLE IF NOT EXISTS approval_policies (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        configuration TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        active INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (organization_id, name, version)
      );`,

      // Durable Jobs
      `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        queue_name TEXT NOT NULL DEFAULT 'default',
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        scheduled_for TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        leased_until TEXT,
        leased_by TEXT,
        error_message TEXT,
        idempotency_key TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE (organization_id, idempotency_key)
      );`,
    ]);

    // Check if demo data needs seeding
    const orgCount = await db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM organizations");
    if (!orgCount || Number(orgCount.count) === 0) {
      await db.seedInitialData();
    }
  },

  async seedInitialData(): Promise<void> {
    const defaultOrgId = "00000000-0000-0000-0000-000000000001";
    const adminUserId = "00000000-0000-0000-0000-000000000010";
    const managerUserId = "00000000-0000-0000-0000-000000000020";
    const approverUserId = "00000000-0000-0000-0000-000000000030";
    const employeeUserId = "00000000-0000-0000-0000-000000000040";

    const passwordHash = await bcrypt.hash("flowpilot123", 10);

    // 1. Seed demo users
    await client.batch([
      {
        sql: `INSERT OR IGNORE INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)`,
        args: [adminUserId, "admin@flowpilot.ai", passwordHash, "Sarah Chen (Admin/Owner)"],
      },
      {
        sql: `INSERT OR IGNORE INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)`,
        args: [managerUserId, "manager@flowpilot.ai", passwordHash, "Marcus Vance (Dept Manager)"],
      },
      {
        sql: `INSERT OR IGNORE INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)`,
        args: [approverUserId, "approver@flowpilot.ai", passwordHash, "Elena Rostova (Senior Approver)"],
      },
      {
        sql: `INSERT OR IGNORE INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)`,
        args: [employeeUserId, "employee@flowpilot.ai", passwordHash, "Arun Kumar (Requester)"],
      },
    ]);

    // 2. Seed Organization
    await client.execute({
      sql: `INSERT OR IGNORE INTO organizations (id, name, slug, settings, created_by) VALUES (?, ?, ?, ?, ?)`,
      args: [
        defaultOrgId,
        "Acme Global Enterprises",
        "acme-global",
        JSON.stringify({
          defaultCurrency: "INR",
          allowSelfApproval: false,
          autoRemindOverdueHours: 24,
          baselineManualMinutes: {
            procurement: 120,
            hr: 90,
            operations: 60,
            document_processing: 45,
            default: 60,
          },
        }),
        adminUserId,
      ],
    });

    // 3. Seed Organization Members
    await client.batch([
      {
        sql: `INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, status) VALUES (?, ?, ?, ?, ?)`,
        args: ["om-1", defaultOrgId, adminUserId, "owner", "active"],
      },
      {
        sql: `INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, status) VALUES (?, ?, ?, ?, ?)`,
        args: ["om-2", defaultOrgId, managerUserId, "manager", "active"],
      },
      {
        sql: `INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, status) VALUES (?, ?, ?, ?, ?)`,
        args: ["om-3", defaultOrgId, approverUserId, "approver", "active"],
      },
      {
        sql: `INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role, status) VALUES (?, ?, ?, ?, ?)`,
        args: ["om-4", defaultOrgId, employeeUserId, "member", "active"],
      },
    ]);

    // 4. Seed Departments
    const engDeptId = "10000000-0000-0000-0000-000000000001";
    const finDeptId = "10000000-0000-0000-0000-000000000002";
    const opsDeptId = "10000000-0000-0000-0000-000000000003";
    const hrDeptId = "10000000-0000-0000-0000-000000000004";

    await client.batch([
      {
        sql: `INSERT OR IGNORE INTO departments (id, organization_id, name, manager_user_id) VALUES (?, ?, ?, ?)`,
        args: [engDeptId, defaultOrgId, "Engineering & Technology", managerUserId],
      },
      {
        sql: `INSERT OR IGNORE INTO departments (id, organization_id, name, manager_user_id) VALUES (?, ?, ?, ?)`,
        args: [finDeptId, defaultOrgId, "Finance & Accounting", adminUserId],
      },
      {
        sql: `INSERT OR IGNORE INTO departments (id, organization_id, name, manager_user_id) VALUES (?, ?, ?, ?)`,
        args: [opsDeptId, defaultOrgId, "Operations & Logistics", managerUserId],
      },
      {
        sql: `INSERT OR IGNORE INTO departments (id, organization_id, name, manager_user_id) VALUES (?, ?, ?, ?)`,
        args: [hrDeptId, defaultOrgId, "People Operations (HR)", managerUserId],
      },
    ]);

    // 5. Seed Default Procurement Policy
    const policyId = "20000000-0000-0000-0000-000000000001";
    const defaultPolicyConfig = {
      tiers: [
        {
          id: "tier_1",
          name: "Standard Purchase (Up to ₹5,000)",
          minAmountMinor: 0,
          maxAmountMinor: 500000,
          currency: "INR",
          stages: [
            {
              stageNumber: 1,
              name: "Single Approver Review",
              requiredRole: "approver",
              requireDepartmentManager: false,
              requireFinanceApprover: false,
              timeoutHours: 48,
            },
          ],
        },
        {
          id: "tier_2",
          name: "Department Manager Review (₹5,000 to ₹25,000)",
          minAmountMinor: 500001,
          maxAmountMinor: 2500000,
          currency: "INR",
          stages: [
            {
              stageNumber: 1,
              name: "Department Manager Approval",
              requiredRole: "manager",
              requireDepartmentManager: true,
              requireFinanceApprover: false,
              timeoutHours: 48,
            },
          ],
        },
        {
          id: "tier_3",
          name: "Executive & Finance Multi-stage Approval (Above ₹25,000)",
          minAmountMinor: 2500001,
          maxAmountMinor: null,
          currency: "INR",
          stages: [
            {
              stageNumber: 1,
              name: "Stage 1: Department Manager Approval",
              requiredRole: "manager",
              requireDepartmentManager: true,
              requireFinanceApprover: false,
              timeoutHours: 48,
            },
            {
              stageNumber: 2,
              name: "Stage 2: Finance Executive Authorization",
              requiredRole: "admin",
              requireDepartmentManager: false,
              requireFinanceApprover: true,
              timeoutHours: 48,
            },
          ],
        },
      ],
      allowSelfApproval: false,
      requireSupportingDocumentAboveMinor: 1000000,
      allowedCurrencies: ["INR", "USD", "EUR", "GBP"],
      autoEscalateHours: 72,
    };

    await client.execute({
      sql: `INSERT OR IGNORE INTO approval_policies (id, organization_id, name, category, configuration, version, active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [policyId, defaultOrgId, "Standard Corporate Procurement Policy", "procurement", JSON.stringify(defaultPolicyConfig), 1, adminUserId],
    });

    // 6. Seed Workflows from Templates
    for (const tpl of WORKFLOW_TEMPLATES) {
      const workflowId = `wf-${tpl.id}`;
      const versionId = `ver-${tpl.id}-v1`;

      await client.execute({
        sql: `INSERT OR IGNORE INTO workflows (id, organization_id, name, description, category, status, current_published_version, created_by)
              VALUES (?, ?, ?, ?, ?, 'active', 1, ?)`,
        args: [workflowId, defaultOrgId, tpl.name, tpl.description, tpl.category, adminUserId],
      });

      await client.execute({
        sql: `INSERT OR IGNORE INTO workflow_versions (id, organization_id, workflow_id, version, definition, definition_hash, validation_result, published_by, published_at)
              VALUES (?, ?, ?, 1, ?, 'sha256-seed-v1', '{"valid": true}', ?, datetime('now'))`,
        args: [versionId, defaultOrgId, workflowId, JSON.stringify(tpl.definition), adminUserId],
      });
    }

    console.log("✅ FlowPilot database initialized and seeded with demo organization, users, policies, and workflows.");
  },
};
