import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { organizationController } from "../controllers/organization.controller.js";
import { departmentController } from "../controllers/department.controller.js";
import { requestController } from "../controllers/request.controller.js";
import { approvalController } from "../controllers/approval.controller.js";
import { workflowController } from "../controllers/workflow.controller.js";
import { executionController } from "../controllers/execution.controller.js";
import { taskController } from "../controllers/task.controller.js";
import { documentController } from "../controllers/document.controller.js";
import { notificationController } from "../controllers/notification.controller.js";
import { reportController } from "../controllers/report.controller.js";
import { aiController } from "../controllers/ai.controller.js";
import { demoController } from "../controllers/demo.controller.js";
import { requireAuth, requireOrganization } from "../middleware/auth.js";
import { requireRole } from "../middleware/role-guard.js";

export const apiRouter = Router();

// Health Check
apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "flowpilot-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// 1. Authentication
apiRouter.post("/auth/signup", authController.signup);
apiRouter.post("/auth/login", authController.login);
apiRouter.get("/auth/me", requireAuth, authController.me);

// 2. Organizations
apiRouter.post("/organizations", requireAuth, organizationController.create);
apiRouter.get("/organizations/current", requireAuth, organizationController.current);
apiRouter.patch("/organizations/current", requireAuth, requireRole(["owner", "admin"]), organizationController.update);
apiRouter.get("/organizations/current/members", requireAuth, organizationController.members);
apiRouter.post("/organizations/current/invitations", requireAuth, requireRole(["owner", "admin"]), organizationController.inviteMember);
apiRouter.patch("/organizations/current/members/:memberId", requireAuth, requireRole(["owner", "admin"]), organizationController.updateMember);

// 3. Departments
apiRouter.get("/organizations/current/departments", requireAuth, departmentController.list);
apiRouter.post("/organizations/current/departments", requireAuth, requireRole(["owner", "admin", "manager"]), departmentController.create);

// 4. Requests (Intake)
apiRouter.get("/requests", requireAuth, requireOrganization, requestController.list);
apiRouter.post("/requests", requireAuth, requireOrganization, requestController.create);
apiRouter.get("/requests/:requestId", requireAuth, requireOrganization, requestController.getById);
apiRouter.get("/requests/:requestId/timeline", requireAuth, requireOrganization, requestController.getTimeline);
apiRouter.post("/requests/:requestId/cancel", requireAuth, requireOrganization, requestController.cancel);

// 5. Approvals (Human-in-the-Loop)
apiRouter.get("/approvals", requireAuth, requireOrganization, approvalController.list);
apiRouter.get("/approvals/:approvalId", requireAuth, requireOrganization, approvalController.getById);
apiRouter.post("/approvals/:approvalId/approve", requireAuth, requireOrganization, approvalController.approve);
apiRouter.post("/approvals/:approvalId/reject", requireAuth, requireOrganization, approvalController.reject);
apiRouter.post("/approvals/:approvalId/request-changes", requireAuth, requireOrganization, approvalController.requestChanges);

// 6. Workflows (Designer & Versioning)
apiRouter.get("/workflows", requireAuth, requireOrganization, workflowController.list);
apiRouter.get("/workflows/templates", requireAuth, workflowController.templates);
apiRouter.post("/workflows", requireAuth, requireOrganization, requireRole(["owner", "admin", "manager"]), workflowController.create);
apiRouter.get("/workflows/:workflowId", requireAuth, requireOrganization, workflowController.getById);
apiRouter.patch("/workflows/:workflowId", requireAuth, requireOrganization, requireRole(["owner", "admin", "manager"]), workflowController.update);
apiRouter.post("/workflows/:workflowId/publish", requireAuth, requireOrganization, requireRole(["owner", "admin", "manager"]), workflowController.publish);
apiRouter.post("/workflows/:workflowId/activate", requireAuth, requireOrganization, requireRole(["owner", "admin", "manager"]), workflowController.activate);
apiRouter.post("/workflows/:workflowId/pause", requireAuth, requireOrganization, requireRole(["owner", "admin", "manager"]), workflowController.pause);
apiRouter.post("/workflows/:workflowId/duplicate", requireAuth, requireOrganization, requireRole(["owner", "admin", "manager"]), workflowController.duplicate);

// 7. Executions
apiRouter.get("/executions", requireAuth, requireOrganization, executionController.list);
apiRouter.get("/executions/:executionId", requireAuth, requireOrganization, executionController.getById);
apiRouter.post("/executions/:executionId/retry", requireAuth, requireOrganization, executionController.retry);

// 8. Tasks
apiRouter.get("/tasks", requireAuth, requireOrganization, taskController.list);
apiRouter.post("/tasks", requireAuth, requireOrganization, taskController.create);
apiRouter.patch("/tasks/:taskId", requireAuth, requireOrganization, taskController.update);
apiRouter.post("/tasks/:taskId/complete", requireAuth, requireOrganization, taskController.complete);

// 9. Documents
apiRouter.get("/documents", requireAuth, requireOrganization, documentController.list);
apiRouter.post("/documents/upload-url", requireAuth, requireOrganization, documentController.upload);
apiRouter.get("/documents/:documentId", requireAuth, requireOrganization, documentController.getById);
apiRouter.post("/documents/:documentId/process", requireAuth, requireOrganization, documentController.process);

// 10. Notifications
apiRouter.get("/notifications", requireAuth, notificationController.list);
apiRouter.post("/notifications/read-all", requireAuth, notificationController.markAllRead);
apiRouter.post("/notifications/:notificationId/read", requireAuth, notificationController.markRead);

// 11. Dashboard & Reports
apiRouter.get("/dashboard/metrics", requireAuth, requireOrganization, reportController.getMetrics);
apiRouter.get("/reports/summary", requireAuth, requireOrganization, reportController.getSummary);
apiRouter.get("/reports/export.csv", requireAuth, requireOrganization, reportController.exportCsv);

// 12. AI Assistance
apiRouter.post("/ai/classify-request", requireAuth, aiController.classifyRequest);
apiRouter.post("/ai/structure-request", requireAuth, aiController.structureRequest);
apiRouter.post("/ai/extract-document", requireAuth, aiController.extractDocument);
apiRouter.post("/ai/analyze-bottlenecks", requireAuth, aiController.analyzeBottlenecks);
apiRouter.post("/ai/recommend-improvements", requireAuth, aiController.recommendImprovements);

// 13. Demo Seeding
apiRouter.post("/demo/seed", requireAuth, requireOrganization, demoController.seed);
apiRouter.post("/demo/reset", requireAuth, requireOrganization, demoController.reset);
