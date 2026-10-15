import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../app.js";

describe("End-to-End Purchase Approval Lifecycle & Policy Enforcement", () => {
  let employeeToken: string;
  let employeeId: string;
  let managerToken: string;
  let managerId: string;
  let orgId: string;
  let requestId: string;
  let executionId: string;
  let approvalTaskId: string;

  beforeAll(async () => {
    // 1. Log in as default employee persona
    const empLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "employee@flowpilot.ai", password: "flowpilot123" });
    expect(empLogin.status).toBe(200);
    employeeToken = empLogin.body.data.token;
    employeeId = empLogin.body.data.user.id;
    orgId = empLogin.body.data.activeOrganization.id;

    // 2. Log in as default department manager persona
    const mgrLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "manager@flowpilot.ai", password: "flowpilot123" });
    expect(mgrLogin.status).toBe(200);
    managerToken = mgrLogin.body.data.token;
    managerId = mgrLogin.body.data.user.id;
  });

  it("Step 1: Submits Tier 2 purchase request (₹15,000) exceeding single-approver threshold", async () => {
    const res = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${employeeToken}`)
      .set("X-Organization-ID", orgId)
      .send({
        title: "Dell UltraSharp 4K Monitor for Engineering",
        category: "procurement",
        description: "Primary display hardware upgrade for developer workstation.",
        businessJustification: "Critical display for high-density multi-repo pair programming.",
        amountMinor: 1500000, // ₹15,000 in paise
        currency: "INR",
        priority: "normal",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    requestId = res.body.data.id;
  });

  it("Step 2: Workflow engine paused execution and created pending approval task", async () => {
    const approvalsRes = await request(app)
      .get("/api/v1/approvals")
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Organization-ID", orgId);

    expect(approvalsRes.status).toBe(200);
    const matchingApproval = approvalsRes.body.data.find((a: any) => a.request_id === requestId || a.requestId === requestId);
    expect(matchingApproval).toBeDefined();
    expect(matchingApproval.status).toBe("pending");
    approvalTaskId = matchingApproval.id;
  });

  it("Step 3: Enforces self-approval prohibition — requester cannot approve own request", async () => {
    const selfApproveRes = await request(app)
      .post(`/api/v1/approvals/${approvalTaskId}/approve`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .set("X-Organization-ID", orgId)
      .send({ comment: "Trying to self-approve" });

    // Must be rejected with 403 Forbidden!
    expect(selfApproveRes.status).toBe(403);
    expect(selfApproveRes.body.error.code).toBe("SELF_APPROVAL_PROHIBITED");
  });

  it("Step 4: Authorized department manager approves the request", async () => {
    const approveRes = await request(app)
      .post(`/api/v1/approvals/${approvalTaskId}/approve`)
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Organization-ID", orgId)
      .send({ comment: "Verified and approved within department budget." });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe("approved");
  });

  it("Step 5: Verifies audit log captured transactional approval and workflow state", async () => {
    const timelineRes = await request(app)
      .get(`/api/v1/requests/${requestId}/timeline`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .set("X-Organization-ID", orgId);

    expect(timelineRes.status).toBe(200);
    expect(Array.isArray(timelineRes.body.data)).toBe(true);
    const actions = timelineRes.body.data.map((item: any) => item.action);
    expect(actions).toContain("request.created");
    expect(actions).toContain("approval.decision");
  });

  it("Step 6: Verifies in-app notification was dispatched to requester", async () => {
    const notificationsRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${employeeToken}`)
      .set("X-Organization-ID", orgId);

    expect(notificationsRes.status).toBe(200);
    const relatedNotif = notificationsRes.body.data.find(
      (n: any) => n.resource_id === requestId || n.resourceId === requestId || n.title?.includes("Approved")
    );
    expect(relatedNotif).toBeDefined();
  });

  it("Step 7: Prevents duplicate decision replay on already completed approval", async () => {
    const duplicateApprove = await request(app)
      .post(`/api/v1/approvals/${approvalTaskId}/approve`)
      .set("Authorization", `Bearer ${managerToken}`)
      .set("X-Organization-ID", orgId)
      .send({ comment: "Duplicate attempt" });

    expect([400, 409]).toContain(duplicateApprove.status);
    expect(duplicateApprove.body.error.code).toBe("ALREADY_DECIDED");
  });
});
