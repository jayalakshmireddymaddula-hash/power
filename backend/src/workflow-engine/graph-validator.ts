import { WorkflowDefinition, NodeType, WorkflowNode, WorkflowEdge } from "@flowpilot/shared";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ALLOWED_NODE_TYPES: NodeType[] = [
  "trigger",
  "condition",
  "ai_classify",
  "ai_extract",
  "approval",
  "assign_task",
  "notification",
  "delay",
  "generate_report",
  "end",
];

export function validateWorkflowGraph(definition: WorkflowDefinition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { nodes, edges } = definition;

  if (!nodes || nodes.length < 2) {
    errors.push("Workflow must contain at least 2 nodes (including a trigger and an end node).");
    return { valid: false, errors, warnings };
  }

  // 1. Check for trigger and end nodes
  const triggerNodes = nodes.filter((n: WorkflowNode) => n.type === "trigger");
  const endNodes = nodes.filter((n: WorkflowNode) => n.type === "end");

  if (triggerNodes.length === 0) {
    errors.push("Workflow must have at least one trigger node.");
  }
  if (triggerNodes.length > 1) {
    warnings.push("Multiple trigger nodes detected. Workflow will trigger on any matching trigger.");
  }
  if (endNodes.length === 0) {
    errors.push("Workflow must have at least one end node.");
  }

  // 2. Validate node types and uniqueness
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node identifier found: '${node.id}'.`);
    }
    nodeIds.add(node.id);

    if (!ALLOWED_NODE_TYPES.includes(node.type)) {
      errors.push(`Unsupported or dangerous node type '${node.type}' on node '${node.id}'.`);
    }
  }

  // 3. Validate edges
  const adjacencyList = new Map<string, string[]>();
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source '${edge.source}' does not exist.`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target '${edge.target}' does not exist.`);
    }

    if (edge.source === edge.target) {
      errors.push(`Self-referencing loop detected on node '${edge.source}'.`);
    }

    if (adjacencyList.has(edge.source)) {
      adjacencyList.get(edge.source)!.push(edge.target);
    }
  }

  // 4. Validate Condition Node Branching
  for (const node of nodes) {
    if (node.type === "condition") {
      const outgoing = edges.filter((e: WorkflowEdge) => e.source === node.id);
      if (outgoing.length < 2) {
        warnings.push(`Condition node '${node.id}' should have at least 2 outgoing branches (true/false).`);
      }
    }
  }

  // 5. Cycle Detection using DFS (White/Gray/Black graph coloring)
  const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  for (const id of nodeIds) {
    visited.set(id, 0);
  }

  function hasCycle(nodeId: string): boolean {
    visited.set(nodeId, 1);
    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor);
      if (state === 1) {
        return true; // Cycle detected
      }
      if (state === 0 && hasCycle(neighbor)) {
        return true;
      }
    }
    visited.set(nodeId, 2);
    return false;
  }

  for (const id of nodeIds) {
    if (visited.get(id) === 0) {
      if (hasCycle(id)) {
        errors.push("Cycle detected in workflow graph. Workflows must be directed acyclic graphs (DAG).");
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
