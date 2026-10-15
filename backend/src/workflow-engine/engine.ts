import { db } from "../lib/db.js";
import { v4 as uuidv4 } from "uuid";
import { WorkflowDefinition, WorkflowNode, WorkflowEdge } from "@flowpilot/shared";
import { validateWorkflowGraph } from "./graph-validator.js";
import { nodeHandlers, NodeExecutionContext } from "./node-registry.js";

export class WorkflowEngine {
  /**
   * Start a new workflow execution
   */
  async startExecution(params: {
    workflowId: string;
    inputData: Record<string, any>;
    organizationId: string;
    triggeredBy?: string;
    triggerType?: string;
    requestId?: string;
  }): Promise<{ executionId: string; status: string }> {
    const { workflowId, inputData, organizationId, triggeredBy, triggerType = "manual", requestId } = params;

    // 1. Fetch published workflow version
    const workflow = await db.queryOne<{
      id: string;
      name: string;
      status: string;
      current_published_version: number;
    }>("SELECT id, name, status, current_published_version FROM workflows WHERE id = ? AND organization_id = ?", [workflowId, organizationId]);

    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found.`);
    }

    if (workflow.status !== "active") {
      throw new Error(`Workflow '${workflow.name}' is currently ${workflow.status} and cannot accept new executions.`);
    }

    const version = await db.queryOne<{
      id: string;
      version: number;
      definition: string;
    }>(
      "SELECT id, version, definition FROM workflow_versions WHERE workflow_id = ? AND version = ?",
      [workflowId, workflow.current_published_version || 1]
    );

    if (!version) {
      throw new Error(`Published version for workflow '${workflowId}' not found.`);
    }

    const definition: WorkflowDefinition = JSON.parse(version.definition);

    // 2. Validate graph structure
    const validation = validateWorkflowGraph(definition);
    if (!validation.valid) {
      throw new Error(`Invalid workflow graph: ${validation.errors.join(", ")}`);
    }

    // 3. Create execution record
    const executionId = uuidv4();
    await db.execute(
      `INSERT INTO workflow_executions (
        id, organization_id, workflow_id, workflow_version_id, request_id,
        triggered_by, trigger_type, status, input_data, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, datetime('now'))`,
      [executionId, organizationId, workflowId, version.id, requestId || null, triggeredBy || null, triggerType, JSON.stringify(inputData)]
    );

    // 4. Audit event
    await db.execute(
      `INSERT INTO audit_events (id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, metadata)
       VALUES (?, ?, ?, 'user', 'workflow.execution.started', 'execution', ?, ?)`,
      [uuidv4(), organizationId, triggeredBy || null, executionId, JSON.stringify({ workflowName: workflow.name, triggerType })]
    );

    // 5. Begin execution from the trigger node
    const triggerNode = definition.nodes.find((n: WorkflowNode) => n.type === "trigger") || definition.nodes[0];
    const finalStatus = await this.runFromNode(executionId, triggerNode.id, definition, {
      organizationId,
      executionId,
      workflowId,
      workflowVersionId: version.id,
      requestId,
      userId: triggeredBy,
      inputData,
      stepOutputs: {},
    });

    return { executionId, status: finalStatus };
  }

  /**
   * Resume an execution paused for human approval or delay
   */
  async resumeExecution(params: {
    executionId: string;
    approved: boolean;
    decisionComment?: string;
    decidedBy?: string;
  }): Promise<{ executionId: string; status: string }> {
    const { executionId, approved, decisionComment, decidedBy } = params;

    const execution = await db.queryOne<{
      id: string;
      organization_id: string;
      workflow_id: string;
      workflow_version_id: string;
      request_id: string | null;
      status: string;
      current_node_id: string;
      input_data: string;
      output_data: string;
    }>("SELECT * FROM workflow_executions WHERE id = ?", [executionId]);

    if (!execution) {
      throw new Error(`Execution '${executionId}' not found.`);
    }

    if (execution.status !== "waiting_approval" && execution.status !== "waiting_delay") {
      throw new Error(`Execution is in '${execution.status}' state and cannot be resumed.`);
    }

    const version = await db.queryOne<{ definition: string }>(
      "SELECT definition FROM workflow_versions WHERE id = ?",
      [execution.workflow_version_id]
    );

    if (!version) {
      throw new Error("Workflow version definition not found.");
    }

    const definition: WorkflowDefinition = JSON.parse(version.definition);
    const inputData = JSON.parse(execution.input_data || "{}");
    const stepOutputs = JSON.parse(execution.output_data || "{}");

    // If rejected, complete/cancel the execution and request
    if (!approved) {
      await db.execute(
        `UPDATE workflow_executions 
         SET status = 'completed', completed_at = datetime('now'), output_data = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [JSON.stringify({ ...stepOutputs, approvalDecision: "rejected", decisionComment }), executionId]
      );

      if (execution.request_id) {
        await db.execute(
          "UPDATE requests SET status = 'rejected', updated_at = datetime('now') WHERE id = ?",
          [execution.request_id]
        );
      }

      await db.execute(
        `INSERT INTO audit_events (id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, metadata)
         VALUES (?, ?, ?, 'user', 'approval.rejected', 'execution', ?, ?)`,
        [uuidv4(), execution.organization_id, decidedBy || null, executionId, JSON.stringify({ decisionComment })]
      );

      return { executionId, status: "completed" };
    }

    // If approved, update status to running and advance to the next node
    await db.execute(
      "UPDATE workflow_executions SET status = 'running', updated_at = datetime('now') WHERE id = ?",
      [executionId]
    );

    const currentNodeId = execution.current_node_id;
    const outgoingEdge = definition.edges.find((e: WorkflowEdge) => e.source === currentNodeId);

    if (!outgoingEdge) {
      // No more nodes, complete execution
      await db.execute(
        "UPDATE workflow_executions SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
        [executionId]
      );
      return { executionId, status: "completed" };
    }

    const finalStatus = await this.runFromNode(executionId, outgoingEdge.target, definition, {
      organizationId: execution.organization_id,
      executionId,
      workflowId: execution.workflow_id,
      workflowVersionId: execution.workflow_version_id,
      requestId: execution.request_id || undefined,
      userId: decidedBy,
      inputData,
      stepOutputs: {
        ...stepOutputs,
        approvalDecision: "approved",
      },
    });

    return { executionId, status: finalStatus };
  }

  /**
   * Internal step-by-step node executor
   */
  private async runFromNode(
    executionId: string,
    startNodeId: string,
    definition: WorkflowDefinition,
    context: NodeExecutionContext
  ): Promise<string> {
    let currentNodeId: string | null = startNodeId;
    let stepOutputs: Record<string, any> = { ...context.stepOutputs };

    while (currentNodeId) {
      const node: WorkflowNode | undefined = definition.nodes.find((n: WorkflowNode) => n.id === currentNodeId);
      if (!node) {
        await this.failExecution(executionId, "NODE_NOT_FOUND", `Node '${currentNodeId}' not found in definition.`);
        return "failed";
      }

      // Update current node on execution
      await db.execute(
        "UPDATE workflow_executions SET current_node_id = ?, updated_at = datetime('now') WHERE id = ?",
        [node.id, executionId]
      );

      // Create or update execution step record
      const stepId = uuidv4();
      await db.execute(
        `INSERT INTO execution_steps (id, organization_id, execution_id, node_id, node_type, status, input_data, started_at)
         VALUES (?, ?, ?, ?, ?, 'running', ?, datetime('now'))
         ON CONFLICT (execution_id, node_id) DO UPDATE SET status = 'running', started_at = datetime('now')`,
        [stepId, context.organizationId, executionId, node.id, node.type, JSON.stringify(stepOutputs)]
      );

      const handler = nodeHandlers[node.type];
      if (!handler) {
        await this.failExecution(executionId, "UNKNOWN_NODE_TYPE", `No handler for node type '${node.type}'.`);
        return "failed";
      }

      let result;
      try {
        result = await handler(node, {
          ...context,
          stepOutputs,
        });
      } catch (err: any) {
        await db.execute(
          `UPDATE execution_steps SET status = 'failed', error_code = 'EXEC_EXCEPTION', error_message = ?, completed_at = datetime('now')
           WHERE execution_id = ? AND node_id = ?`,
          [err.message || "Unknown error", executionId, node.id]
        );
        await this.failExecution(executionId, "NODE_EXECUTION_ERROR", err.message || "Error running node.");
        return "failed";
      }

      // Record step completion
      stepOutputs[node.id] = result.output;
      await db.execute(
        `UPDATE execution_steps SET status = ?, output_data = ?, completed_at = datetime('now')
         WHERE execution_id = ? AND node_id = ?`,
        [result.status === "waiting" ? "waiting" : result.status === "completed" ? "completed" : "failed", JSON.stringify(result.output), executionId, node.id]
      );

      // If node returned waiting (approval or delay), pause execution
      if (result.status === "waiting") {
        const waitingStatus = node.type === "approval" ? "waiting_approval" : "waiting_delay";
        await db.execute(
          `UPDATE workflow_executions SET status = ?, output_data = ?, updated_at = datetime('now') WHERE id = ?`,
          [waitingStatus, JSON.stringify(stepOutputs), executionId]
        );
        return waitingStatus;
      }

      if (node.type === "end") {
        await db.execute(
          `UPDATE workflow_executions 
           SET status = 'completed', output_data = ?, completed_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
          [JSON.stringify(stepOutputs), executionId]
        );

        await db.execute(
          `INSERT INTO audit_events (id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, metadata)
           VALUES (?, ?, ?, 'system', 'workflow.execution.completed', 'execution', ?, ?)`,
          [uuidv4(), context.organizationId, context.userId || null, executionId, JSON.stringify({ completedAt: new Date().toISOString() })]
        );

        return "completed";
      }

      // Determine next node
      const outgoingEdges = definition.edges.filter((e: WorkflowEdge) => e.source === node.id);

      if (node.type === "condition") {
        // Choose edge matching condition branch
        const matchedEdge = outgoingEdges.find((e: WorkflowEdge) => e.conditionHandle === result.nextConditionHandle) || outgoingEdges[0];
        currentNodeId = matchedEdge ? matchedEdge.target : null;
      } else {
        currentNodeId = outgoingEdges.length > 0 ? outgoingEdges[0].target : null;
      }
    }

    // Reached end of connected path
    await db.execute(
      `UPDATE workflow_executions SET status = 'completed', output_data = ?, completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [JSON.stringify(stepOutputs), executionId]
    );

    return "completed";
  }

  private async failExecution(executionId: string, code: string, message: string) {
    await db.execute(
      `UPDATE workflow_executions 
       SET status = 'failed', error_code = ?, error_message = ?, completed_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [code, message, executionId]
    );
  }
}

export const workflowEngine = new WorkflowEngine();
