# FlowPilot AI — API Reference

Base URL: `/api/v1`

## Authentication & Organization
- `POST /auth/signup` — Register new user account.
- `POST /auth/login` — Authenticate and obtain JWT token.
- `GET /auth/me` — Retrieve active user session and organizations.
- `POST /organizations` — Create organization (caller becomes `owner`).
- `GET /organizations/current` — Current active organization details.
- `PATCH /organizations/current` — Update organization settings.
- `GET /organizations/current/members` — List members and roles.
- `POST /organizations/current/invitations` — Provision/invite a member.
- `PATCH /organizations/current/members/:memberId` — Update member role (`admin`, `manager`, `approver`, `member`).
- `GET /organizations/current/departments` — List departments.
- `POST /organizations/current/departments` — Create department.

## Requests & Purchase Approvals
- `GET /requests` — Paginated list of requests with category and status filters.
- `POST /requests` — Submit new request (evaluates policy and triggers workflow).
- `GET /requests/:requestId` — Full request details, timeline, and audit history.
- `PATCH /requests/:requestId` — Update draft or changes-requested request.
- `POST /requests/:requestId/cancel` — Cancel pending request.

## Approvals (Human-in-the-Loop)
- `GET /approvals` — Pending approval inbox for the authenticated approver.
- `GET /approvals/:approvalId` — View request, AI recommendation, and policy rules.
- `POST /approvals/:approvalId/approve` — Approve request and resume workflow.
- `POST /approvals/:approvalId/reject` — Reject with mandatory reason.
- `POST /approvals/:approvalId/request-changes` — Request changes from submitter.

## Workflows & Execution
- `GET /workflows` — List organization workflows.
- `POST /workflows` — Create new workflow draft.
- `GET /workflows/:workflowId` — Workflow definition and published version.
- `PATCH /workflows/:workflowId` — Update workflow draft.
- `POST /workflows/:workflowId/publish` — Validate and create immutable version.
- `POST /workflows/:workflowId/activate` — Activate workflow for intake.
- `POST /workflows/:workflowId/pause` — Pause workflow.
- `POST /workflows/:workflowId/duplicate` — Duplicate workflow.
- `GET /workflows/templates` — Fetch pre-built templates.
- `GET /executions` — List executions across workflows.
- `GET /executions/:executionId` — Execution state, steps timeline, errors.
- `POST /executions/:executionId/retry` — Retry eligible failed execution.

## AI Assistance
- `POST /ai/classify-request` — Advisory category, priority, and risk analysis.
- `POST /ai/structure-request` — Convert natural-language text into structured fields.
- `POST /ai/extract-document` — Extract structured invoice/document fields.
- `POST /ai/analyze-bottlenecks` — Analyze execution delays and recommend improvements.

## Tasks, Documents, Notifications & Reports
- `GET /tasks`, `POST /tasks`, `PATCH /tasks/:taskId`, `POST /tasks/:taskId/complete`
- `GET /documents`, `POST /documents/upload-url`, `POST /documents/:documentId/process`
- `GET /notifications`, `POST /notifications/:notificationId/read`, `POST /notifications/read-all`
- `GET /dashboard/metrics` — Authorized KPIs, turnaround, success rates.
- `GET /reports/summary`, `GET /reports/export.csv` — CSV export with injection defense.
- `POST /demo/seed` — Explicitly seed realistic demonstration records.
