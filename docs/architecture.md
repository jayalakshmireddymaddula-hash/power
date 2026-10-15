# FlowPilot AI — Architecture & System Design

## 1. System Overview & Monorepo Boundaries

FlowPilot AI is architected as a modular monorepo enforcing a strict physical and logical boundary between **Frontend (Client Layer)**, **Backend (Application & Engine Layer)**, **Worker (Async Processing Layer)**, and **Shared (Contract Layer)**.

```
                      +-------------------------------------------------------------+
                      |                      FRONTEND (apps/web)                    |
                      |  React 18 • TypeScript • Vite 6 • Tailwind CSS • Recharts   |
                      |  • Presentation & Routing (/app/*)                          |
                      |  • User Input & Form UX                                     |
                      |  • Client-Side Pre-Validation                               |
                      |  • Reactive UI State (TanStack Query)                       |
                      +------------------------------+------------------------------+
                                                     |
                                                     | HTTPS / REST JSON (/api/v1)
                                                     | Headers: Authorization (JWT), X-Organization-ID
                                                     v
                      +-------------------------------------------------------------+
                      |                      BACKEND (apps/api)                     |
                      |  Node.js • Express.js • TypeScript • Zod • LibSQL / Postgres|
                      |  • Authoritative Auth Verification (JWT + Org Scope)        |
                      |  • Multi-Tier Policy Engine (Paise integer math)            |
                      |  • Anti-Self-Approval Enforcement (403 Forbidden)           |
                      |  • DAG Acyclic Workflow Engine & State Machine              |
                      |  • Gemini AI Advisory Integration (@google/genai)           |
                      |  • ACID Database Transactions & Audit Event Log             |
                      +--------------+------------------------------+---------------+
                                     |                              |
                                     | Internal IPC / DB Poll       | Job Enqueue
                                     v                              v
                      +------------------------------+  +---------------------------+
                      |      WORKER (apps/worker)    |  |     PERSISTENT STORAGE    |
                      |  • Durable Job Queue Runner  |  |  • LibSQL SQLite / Supabase|
                      |  • Atomic Lease Locks        |  |  • 16 Relational Tables   |
                      |  • Bounded Exponential Retry |  |  • Row-Level Security     |
                      |  • Delayed / Scheduled Jobs  |  |  • Append-Only Audit Log  |
                      +------------------------------+  +---------------------------+
                                                     ^
                                                     |
                      +------------------------------+------------------------------+
                      |                   SHARED CONTRACT (packages/shared)          |
                      |  Zod Schemas • Domain Types • Pre-Built Workflow Templates  |
                      |  (Single source of truth compiled to pure ESM)              |
                      +-------------------------------------------------------------+
```

---

## 2. Frontend vs. Backend Differentiation

| Characteristic | Frontend (`apps/web`) | Backend (`apps/api` & `apps/worker`) |
| :--- | :--- | :--- |
| **Primary Role** | Presentation, interactive user experience, navigation, form intake, and data visualization. | Authoritative business logic, deterministic policy rules, state orchestration, security, and persistence. |
| **Runtime Environment** | User's Web Browser (Chrome, Firefox, Safari, Edge). Untrusted environment. | Secure Node.js Server / Container environment (`node dist/server.js`). Privileged execution. |
| **Port / Base URL** | `http://localhost:5173` | `http://localhost:3000` (API root `/api/v1`) |
| **Tech Stack** | React 18, Vite 6, Tailwind CSS, Lucide React, Recharts, TanStack Query, React Router v7. | Node.js, Express.js, `@libsql/client`, `@google/genai`, bcryptjs, jsonwebtoken, helmet, cors. |
| **Secrets & Keys** | **None.** No API keys, database credentials, or service-role tokens allowed. | Holds `GEMINI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. |
| **Monetary Calculations** | Displays human-readable currency (`₹15,000.00`). | Evaluates all thresholds in **integer minor units (`paise` for INR)**: `1500000`. |
| **Data Validation** | Immediate UX feedback via React Hook Form / Zod resolver (warns user before submit). | Authoritative Zod schema parsing. Rejects any invalid or tampered payload with HTTP 422. |
| **State Management** | Ephemeral browser state & cached server state via TanStack Query (`queryClient`). | Persistent relational database (LibSQL / Supabase PostgreSQL) with ACID transactions. |
| **Approval Authorization**| Shows "Approve" button if user's local role allows it. | **Transactionally checks**: Active org membership + Role match + Self-approval guard (403). |
| **AI Role** | Renders AI suggestion box and lets user review/edit values before submission. | Invokes Gemini SDK, sanitizes prompt, validates JSON response against Zod, records audit token usage. |
| **Failure Handling** | Displays toast notifications, modal errors, and retry buttons for network hiccups. | Dead-letter handling, atomic lease locking, exponential backoff retries, rollback on error. |

---

## 3. Communication Contract & Protocol

The frontend and backend interact exclusively through standard HTTP REST endpoints under `/api/v1`.

### 3.1 Request Headers Sent by Frontend
1. `Authorization: Bearer <JWT>`: Authenticates the user session.
2. `X-Organization-ID: <UUID>`: Declares the active organization context.
3. `Content-Type: application/json`: All payloads are structured JSON.

### 3.2 Standardized Response Envelope Sent by Backend
Every response follows a strict, predictable JSON structure:

```json
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 45 } // Optional pagination
}

// Error Response
{
  "success": false,
  "error": {
    "code": "SELF_APPROVAL_PROHIBITED",
    "message": "Requesters cannot approve their own purchase requests.",
    "requestId": "req_uuid_12345",
    "details": null
  }
}
```

---

## 4. Security & Trust Boundaries

```
[ UNTRUSTED ZONE: FRONTEND ]
    │
    │  Users can tamper with client memory, DevTools, or network requests.
    │  Frontend cannot be trusted to enforce permissions or compute monetary rules.
    ▼
──────────── HTTP REST API BOUNDARY (CORS, Rate Limiting, Helmet) ────────────
    ▲
    │  Backend treats every incoming request as potentially hostile.
    │
[ TRUSTED ZONE: BACKEND & DATABASE ]
    1. Verify JWT signature and token expiration.
    2. Verify user is an active member of X-Organization-ID in the database.
    3. Verify role is authorized for the specific resource (RBAC).
    4. Prohibit requester self-approval transactionally.
    5. Evaluate policy thresholds using integer paise.
    6. Run workflow engine in an isolated, sandboxed step runner (no eval, no shell).
    7. Treat Gemini AI outputs as advisory data, never authoritative commands.
```

---

## 5. The Shared Package (`packages/shared`)

To prevent code duplication while preserving strict runtime decoupling, the monorepo includes `@flowpilot/shared`:

* **What it contains**:
  - Domain TypeScript interfaces (`Request`, `Workflow`, `ApprovalTask`, `User`).
  - Validation schemas (`createRequestSchema`, `workflowDefinitionSchema`).
  - 6 Pre-built workflow templates (`WORKFLOW_TEMPLATES`).
  - Status enums and category constants.
* **How it is compiled**:
  - Built as a pure, dependency-light ESM module (`dist/index.js` and `dist/index.d.ts`).
  - Both `apps/web` and `apps/api` import from `@flowpilot/shared` at compile time.
  - Zero runtime coupling: the frontend never imports backend controllers or database drivers.
