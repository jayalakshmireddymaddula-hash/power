import { Request, Response, NextFunction } from "express";
import { db } from "../lib/db.js";
import { AppError } from "../middleware/error-handler.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "node:crypto";
import { createWorkflowSchema, updateWorkflowSchema, WORKFLOW_TEMPLATES, WorkflowDefinition } from "@flowpilot/shared";
import { validateWorkflowGraph } from "../workflow-engine/graph-validator.js";

export const workflowController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");

      const workflows = await db.query(
        `SELECT w.*, u.full_name as creator_name,
                (SELECT COUNT(*) FROM workflow_executions WHERE workflow_id = w.id) as execution_count
         FROM workflows w
         LEFT JOIN users u ON u.id = w.created_by
         WHERE w.organization_id = ?
         ORDER BY w.created_at DESC`,
        [req.organizationId]
      );

      return res.json({
        success: true,
        data: workflows.map((w) => ({
          id: w.id,
          organizationId: w.organization_id,
          name: w.name,
          description: w.description,
          category: w.category,
          status: w.status,
          currentPublishedVersion: w.current_published_version,
          createdBy: w.created_by,
          creatorName: w.creator_name,
          executionCount: Number(w.execution_count || 0),
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { workflowId } = req.params;

      const workflow = await db.queryOne<{
        id: string;
        organization_id: string;
        name: string;
        description: string;
        category: string;
        status: string;
        current_published_version: number | null;
        created_by: string;
        created_at: string;
        updated_at: string;
      }>("SELECT * FROM workflows WHERE id = ? AND organization_id = ?", [workflowId, req.organizationId]);

      if (!workflow) throw new AppError(404, "NOT_FOUND", "Workflow not found");

      // Fetch published version definition if available
      let publishedDefinition: WorkflowDefinition | null = null;
      if (workflow.current_published_version) {
        const ver = await db.queryOne<{ definition: string }>(
          "SELECT definition FROM workflow_versions WHERE workflow_id = ? AND version = ?",
          [workflowId, workflow.current_published_version]
        );
        if (ver) {
          publishedDefinition = JSON.parse(ver.definition);
        }
      }

      // If no published version, check latest version
      if (!publishedDefinition) {
        const latestVer = await db.queryOne<{ definition: string }>(
          "SELECT definition FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC LIMIT 1",
          [workflowId]
        );
        if (latestVer) {
          publishedDefinition = JSON.parse(latestVer.definition);
        }
      }

      // Fetch executions
      const recentExecutions = await db.query(
        "SELECT id, status, started_at, completed_at FROM workflow_executions WHERE workflow_id = ? ORDER BY created_at DESC LIMIT 10",
        [workflowId]
      );

      return res.json({
        success: true,
        data: {
          ...workflow,
          definition: publishedDefinition,
          recentExecutions,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const data = createWorkflowSchema.parse(req.body);

      const workflowId = uuidv4();
      const versionId = uuidv4();

      // Fallback definition with minimal valid trigger -> end if not supplied
      const initialDefinition: WorkflowDefinition = data.definition || {
        nodes: [
          {
            id: "node_trigger",
            type: "trigger",
            name: "Workflow Trigger",
            config: { event: "manual" },
            position: { x: 100, y: 150 },
          },
          {
            id: "node_end",
            type: "end",
            name: "Completion Node",
            config: {},
            position: { x: 500, y: 150 },
          },
        ],
        edges: [{ id: "e1", source: "node_trigger", target: "node_end" }],
        metadata: {},
      };

      const defString = JSON.stringify(initialDefinition);
      const defHash = crypto.createHash("sha256").update(defString).digest("hex");

      await db.execute(
        `INSERT INTO workflows (id, organization_id, name, description, category, status, current_published_version, created_by)
         VALUES (?, ?, ?, ?, ?, 'draft', 1, ?)`,
        [workflowId, req.organizationId, data.name, data.description || "", data.category, req.user.id]
      );

      await db.execute(
        `INSERT INTO workflow_versions (id, organization_id, workflow_id, version, definition, definition_hash, validation_result, published_by, published_at)
         VALUES (?, ?, ?, 1, ?, ?, '{"valid": true}', ?, datetime('now'))`,
        [versionId, req.organizationId, workflowId, defString, defHash, req.user.id]
      );

      return res.status(201).json({
        success: true,
        data: {
          id: workflowId,
          name: data.name,
          category: data.category,
          status: "draft",
          currentPublishedVersion: 1,
          definition: initialDefinition,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { workflowId } = req.params;
      const data = updateWorkflowSchema.parse(req.body);

      const workflow = await db.queryOne<{ id: string }>(
        "SELECT id FROM workflows WHERE id = ? AND organization_id = ?",
        [workflowId, req.organizationId]
      );
      if (!workflow) throw new AppError(404, "NOT_FOUND", "Workflow not found");

      const updates: string[] = [];
      const args: any[] = [];

      if (data.name) {
        updates.push("name = ?");
        args.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push("description = ?");
        args.push(data.description);
      }
      if (data.category) {
        updates.push("category = ?");
        args.push(data.category);
      }
      if (data.status) {
        updates.push("status = ?");
        args.push(data.status);
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        args.push(workflowId);
        await db.execute(`UPDATE workflows SET ${updates.join(", ")} WHERE id = ?`, args);
      }

      // If definition changed, update the draft version
      if (data.definition) {
        const validation = validateWorkflowGraph(data.definition);
        const defString = JSON.stringify(data.definition);
        const defHash = crypto.createHash("sha256").update(defString).digest("hex");

        await db.execute(
          `INSERT INTO workflow_versions (id, organization_id, workflow_id, version, definition, definition_hash, validation_result, published_by)
           VALUES (?, ?, ?, (SELECT COALESCE(MAX(version), 0) + 1 FROM workflow_versions WHERE workflow_id = ?), ?, ?, ?, ?)`,
          [uuidv4(), req.organizationId, workflowId, workflowId, defString, defHash, JSON.stringify(validation), req.user.id]
        );
      }

      return res.json({
        success: true,
        data: { id: workflowId, updated: true },
      });
    } catch (err) {
      next(err);
    }
  },

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { workflowId } = req.params;

      const workflow = await db.queryOne<{ id: string; name: string }>(
        "SELECT id, name FROM workflows WHERE id = ? AND organization_id = ?",
        [workflowId, req.organizationId]
      );
      if (!workflow) throw new AppError(404, "NOT_FOUND", "Workflow not found");

      // Get latest version definition
      const latest = await db.queryOne<{ version: number; definition: string }>(
        "SELECT version, definition FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC LIMIT 1",
        [workflowId]
      );
      if (!latest) throw new AppError(400, "NO_VERSION", "No workflow version exists to publish.");

      const definition: WorkflowDefinition = JSON.parse(latest.definition);
      const validation = validateWorkflowGraph(definition);

      if (!validation.valid) {
        throw new AppError(422, "INVALID_GRAPH", `Cannot publish invalid workflow: ${validation.errors.join(", ")}`);
      }

      const nextVersion = latest.version + 1;
      const defString = latest.definition;
      const defHash = crypto.createHash("sha256").update(defString).digest("hex");

      const versionId = uuidv4();
      await db.execute(
        `INSERT INTO workflow_versions (id, organization_id, workflow_id, version, definition, definition_hash, validation_result, published_by, published_at)
         VALUES (?, ?, ?, ?, ?, ?, '{"valid": true}', ?, datetime('now'))`,
        [versionId, req.organizationId, workflowId, nextVersion, defString, defHash, req.user.id]
      );

      // Point workflow to newly published version and mark active
      await db.execute(
        "UPDATE workflows SET current_published_version = ?, status = 'active', updated_at = datetime('now') WHERE id = ?",
        [nextVersion, workflowId]
      );

      return res.json({
        success: true,
        data: {
          workflowId,
          publishedVersion: nextVersion,
          status: "active",
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { workflowId } = req.params;

      await db.execute(
        "UPDATE workflows SET status = 'active', updated_at = datetime('now') WHERE id = ? AND organization_id = ?",
        [workflowId, req.organizationId]
      );

      return res.json({ success: true, data: { id: workflowId, status: "active" } });
    } catch (err) {
      next(err);
    }
  },

  async pause(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { workflowId } = req.params;

      await db.execute(
        "UPDATE workflows SET status = 'paused', updated_at = datetime('now') WHERE id = ? AND organization_id = ?",
        [workflowId, req.organizationId]
      );

      return res.json({ success: true, data: { id: workflowId, status: "paused" } });
    } catch (err) {
      next(err);
    }
  },

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.organizationId || !req.user) throw new AppError(400, "NO_ACTIVE_ORG", "Organization required");
      const { workflowId } = req.params;

      const original = await db.queryOne<{
        name: string;
        description: string;
        category: string;
        current_published_version: number;
      }>("SELECT * FROM workflows WHERE id = ? AND organization_id = ?", [workflowId, req.organizationId]);

      if (!original) throw new AppError(404, "NOT_FOUND", "Workflow not found");

      const latestVer = await db.queryOne<{ definition: string }>(
        "SELECT definition FROM workflow_versions WHERE workflow_id = ? ORDER BY version DESC LIMIT 1",
        [workflowId]
      );

      const newWorkflowId = uuidv4();
      await db.execute(
        `INSERT INTO workflows (id, organization_id, name, description, category, status, current_published_version, created_by)
         VALUES (?, ?, ?, ?, ?, 'draft', 1, ?)`,
        [newWorkflowId, req.organizationId, `${original.name} (Copy)`, original.description, original.category, req.user.id]
      );

      if (latestVer) {
        await db.execute(
          `INSERT INTO workflow_versions (id, organization_id, workflow_id, version, definition, definition_hash, validation_result, published_by)
           VALUES (?, ?, ?, 1, ?, 'copy-hash', '{"valid": true}', ?)`,
          [uuidv4(), req.organizationId, newWorkflowId, latestVer.definition, req.user.id]
        );
      }

      return res.status(201).json({
        success: true,
        data: { id: newWorkflowId, name: `${original.name} (Copy)` },
      });
    } catch (err) {
      next(err);
    }
  },

  async templates(_req: Request, res: Response) {
    return res.json({
      success: true,
      data: WORKFLOW_TEMPLATES,
    });
  },
};
