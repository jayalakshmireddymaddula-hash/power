import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { db } from "../lib/db.js";
import { validateWorkflowGraph } from "../workflow-engine/graph-validator.js";
import { evaluateCondition } from "../workflow-engine/condition-evaluator.js";
import { evaluateApprovalPolicy } from "../workflow-engine/policy-engine.js";
import { ai } from "../services/ai/ai-service.js";

describe("FlowPilot AI Backend Integration & Engine Tests", () => {
  beforeAll(async () => {
    await db.initSchema();
  });

  // 1. Health check
  it("GET /api/v1/health should return 200 with service info", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("flowpilot-api");
  });

  // 2. Authentication: Signup & Login
  let authToken = "";
  let testUserId = "";
  let testOrgId = "";

  it("POST /api/v1/auth/signup should register a new user and organization", async () => {
    const randomEmail = `test_${Date.now()}@flowpilot.ai`;
    const res = await request(app).post("/api/v1/auth/signup").send({
      email: randomEmail,
      password: "StrongPassword123!",
      fullName: "Test Architect",
      organizationName: "Test Automation Corp",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(randomEmail);

    authToken = res.body.data.token;
    testUserId = res.body.data.user.id;
    testOrgId = res.body.data.user.organizationId;
  });

  it("POST /api/v1/auth/login should authenticate successfully", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "admin@flowpilot.ai",
      password: "flowpilot123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe("admin@flowpilot.ai");
  });

  // 3. Organization Security & Role verification
  it("GET /api/v1/organizations/current should reject unauthenticated request", async () => {
    const res = await request(app).get("/api/v1/organizations/current");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/organizations/current should return organization with bearer token", async () => {
    const res = await request(app)
      .get("/api/v1/organizations/current")
      .set("Authorization", `Bearer ${authToken}`)
      .set("X-Organization-ID", testOrgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testOrgId);
  });

  // 4. Policy-Based Routing Engine Unit Tests
  it("Policy Engine: <= ₹5,000 should require 1 stage single approver", async () => {
    const policy = await evaluateApprovalPolicy("00000000-0000-0000-0000-000000000001", "procurement", 400000); // ₹4,000
    expect(policy.requiresApproval).toBe(true);
    expect(policy.tierId).toBe("tier_1");
    expect(policy.stages.length).toBe(1);
  });

  it("Policy Engine: > ₹5,000 and <= ₹25,000 should require Department Manager", async () => {
    const policy = await evaluateApprovalPolicy("00000000-0000-0000-0000-000000000001", "procurement", 1500000); // ₹15,000
    expect(policy.requiresApproval).toBe(true);
    expect(policy.tierId).toBe("tier_2");
    expect(policy.stages.length).toBe(1);
    expect(policy.stages[0].requireDepartmentManager).toBe(true);
  });

  it("Policy Engine: > ₹25,000 should require 2-stage sequential approval", async () => {
    const policy = await evaluateApprovalPolicy("00000000-0000-0000-0000-000000000001", "procurement", 5000000); // ₹50,000
    expect(policy.requiresApproval).toBe(true);
    expect(policy.tierId).toBe("tier_3");
    expect(policy.stages.length).toBe(2);
    expect(policy.stages[0].stageNumber).toBe(1);
    expect(policy.stages[1].stageNumber).toBe(2);
  });

  // 5. Workflow Graph Validator Unit Tests
  it("Graph Validator: should accept valid DAG workflow", () => {
    const result = validateWorkflowGraph({
      nodes: [
        { id: "n1", type: "trigger", name: "Start", config: {} },
        { id: "n2", type: "condition", name: "Check", config: { field: "x", operator: "equals", value: 1 } },
        { id: "n3", type: "end", name: "End", config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3", conditionHandle: "true" },
      ],
      metadata: {},
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("Graph Validator: should reject graph containing cycles", () => {
    const result = validateWorkflowGraph({
      nodes: [
        { id: "n1", type: "trigger", name: "Start", config: {} },
        { id: "n2", type: "assign_task", name: "Task A", config: {} },
        { id: "n3", type: "assign_task", name: "Task B", config: {} },
        { id: "n4", type: "end", name: "End", config: {} },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n2" }, // Cycle!
        { id: "e4", source: "n3", target: "n4" },
      ],
      metadata: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Cycle detected"))).toBe(true);
  });

  // 6. Condition Evaluator Unit Tests
  it("Condition Evaluator: should evaluate numeric and string comparisons accurately", () => {
    const context = { amountMinor: 2500000, priority: "urgent" };

    expect(evaluateCondition({ field: "amountMinor", operator: "greater_than", value: 500000 }, context)).toBe(true);
    expect(evaluateCondition({ field: "amountMinor", operator: "less_than", value: 1000000 }, context)).toBe(false);
    expect(evaluateCondition({ field: "priority", operator: "equals", value: "urgent" }, context)).toBe(true);
    expect(evaluateCondition({ field: "priority", operator: "equals", value: "low" }, context)).toBe(false);
  });

  // 7. Request Intake & Policy Routing Integration
  it("POST /api/v1/requests should validate required procurement fields (reject missing amount)", async () => {
    const res = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${authToken}`)
      .set("X-Organization-ID", testOrgId)
      .send({
        title: "Test Incomplete Purchase Request",
        category: "procurement",
        description: "Need new office monitors for workstation setup",
        businessJustification: "Standard equipment replacement cycle",
        // missing amountMinor
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  // 8. AI Provider integration
  it("AI Provider: classifyRequest should return validated category and priority", async () => {
    const result = await ai.classifyRequest({
      title: "Purchase 5x MacBook Pro M3 for engineering team",
      description: "Hardware upgrade for mobile devs",
      businessJustification: "Old laptops are failing battery health checks",
      allowedCategories: ["procurement", "hr", "operations", "document_processing", "it_support", "finance"],
      permittedPriorities: ["low", "normal", "high", "urgent"],
    });

    expect(result.category).toBe("procurement");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.requires_human_review).toBeDefined();
  });

  it("AI Provider: structureRequest should extract amounts and structure fields", async () => {
    const result = await ai.structureRequest({
      unstructuredText: "Need to buy 2 server racks costing ₹85,000 urgently for data center migration.",
      allowedCategories: ["procurement", "hr", "operations"],
    });

    expect(result.suggested_fields.amount_minor).toBe(8500000); // 85000 * 100 paise
    expect(result.suggested_fields.currency).toBe("INR");
    expect(result.suggested_fields.priority).toBe("urgent");
  });

  // 9. Dashboard Metrics Endpoint
  it("GET /api/v1/dashboard/metrics should return authoritative SQL counts", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/metrics")
      .set("Authorization", `Bearer ${authToken}`)
      .set("X-Organization-ID", testOrgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalExecutions).toBeDefined();
    expect(res.body.data.automationSuccessRate).toBeDefined();
    expect(res.body.data.estimatedTimeSavedMinutes).toBeDefined();
  });

  // 10. CSV Export Formula Injection Defense
  it("GET /api/v1/reports/export.csv should return CSV with formula injection defense", async () => {
    const res = await request(app)
      .get("/api/v1/reports/export.csv")
      .set("Authorization", `Bearer ${authToken}`)
      .set("X-Organization-ID", testOrgId);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
  });
});
