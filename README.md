# FlowPilot AI — Intelligent Workflow Automation Platform
> **Automate the Busywork. Accelerate the Work.**

FlowPilot AI is an enterprise-grade, full-stack, AI-powered Smart Automation platform designed to eliminate repetitive administrative workflows, automate policy-based routing, empower human approvers with advisory intelligence, and measure operational efficiency with audited telemetry.

---

## 1. Executive Summary & Core Mission

Organizations waste substantial human capital on routine operational workflows: delayed multi-level purchase approvals, manual data entry, inconsistent policy enforcement, lost accountability, and opaque bottlenecks.

FlowPilot AI addresses this by providing:
1. **Intelligent Intake & AI Advisory**: Natural-language request structuring, category classification, and risk evaluation powered by the official `@google/genai` Gemini SDK.
2. **Deterministic Multi-Tier Policy Engine**: Server-side policy matrix evaluating integer minor units (`paise` for INR) without floating-point inaccuracies.
3. **Human-in-the-Loop Governance**: Strict anti-self-approval protection, transactional state transitions, and role-based access control (RBAC).
4. **Visual Declarative Workflow Engine**: DAG acyclic workflow designer with 10 node types, pausing on approval gates and resuming after authorized decisions.
5. **Durable Job Queue & Worker**: PostgreSQL/SQLite-backed queue supporting atomic lease locks, bounded exponential backoff retries, and dead-letter handling.
6. **Operational Telemetry & Reporting**: Authoritative SQL-aggregated metrics, Recharts visualizations, AI bottleneck diagnostics, and formula-injection-safe CSV exports.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web App** | React 18, TypeScript, Vite 6, Tailwind CSS, TanStack Query, React Router v7, Recharts, Lucide React, Zod |
| **Backend REST API** | Node.js, Express.js, TypeScript, Zod, Helmet, CORS, JWT Auth, Bcrypt, UUID |
| **Workflow Engine** | Custom DAG Acyclic Evaluator, Declarative Node Registry, Restricted Condition Evaluator |
| **AI Integration** | Google `@google/genai` SDK (`gemini-2.5-flash`), Deterministic Demo Provider fallback, Zod output validation |
| **Database & Queue** | LibSQL / PostgreSQL durable database, Supabase Auth & RLS schema compatibility, durable job queue |
| **Testing** | Vitest, Supertest, TypeScript strict checking |

---

## 3. Monorepo Architecture

```
power/
├── apps/
│   ├── web/                     # React 18 + Vite frontend
│   │   ├── src/
│   │   │   ├── components/      # UI primitives (Card, Badge, Button, Modal, LoadingState)
│   │   │   ├── context/         # AuthContext & Multi-Tenant Persona Switcher
│   │   │   ├── pages/           # 17 Complete Production Pages
│   │   │   └── lib/api.ts       # Typed API client with tenant isolation headers
│   │   └── vite.config.ts
│   ├── api/                     # Express.js REST API
│   │   ├── src/
│   │   │   ├── controllers/     # Auth, Requests, Approvals, Workflows, Reports, AI, Demo
│   │   │   ├── workflow-engine/ # DAG Graph Validator, Engine, Policy Engine, Node Registry
│   │   │   ├── services/ai/     # Gemini SDK + Deterministic Demo Provider + AI Service
│   │   │   ├── jobs/queue.ts    # Durable Job Queue with atomic lease locks
│   │   │   ├── lib/db.ts        # Durable LibSQL Database with auto-seeding
│   │   │   └── __tests__/       # Vitest Unit & Integration Suites
│   │   └── package.json
│   └── worker/                  # Standalone Durable Queue Worker
├── packages/
│   └── shared/                  # Common TypeScript types, Zod schemas, 6 pre-built templates
├── supabase/
│   └── migrations/              # Production PostgreSQL DDL, Indexes, and RLS Policies
├── docs/                        # Architecture, API, Database, Demo Guide, Security docs
├── scripts/
│   ├── start-all.js             # Unified multi-process launcher
│   └── seed-demo.ts
├── .env.example
└── README.md
```

---

## 4. Policy-Based Routing & Anti-Self-Approval Model

All financial operations are evaluated on the backend in **paise (integer minor units)**:

* **Tier 1 (≤ ₹5,000 / 500,000 paise):**
  Single authorized approver sign-off required (`approver` or `manager`).
* **Tier 2 (> ₹5,000 and ≤ ₹25,000 / 2,500,000 paise):**
  Designated Department Manager sign-off required (`manager`).
* **Tier 3 (> ₹25,000 / 2,500,000 paise):**
  2-Stage Sequential approval: Stage 1 (Department Manager) followed by Stage 2 (Designated Finance Executive).
* **Anti-Self-Approval Enforcement:**
  A requester can never approve their own purchase request. The server enforces this transactionally and returns HTTP 403 `SELF_APPROVAL_PROHIBITED`.

---

## 5. Quick Start & Installation

### Prerequisites
* Node.js v18+ or v20+
* npm v9+

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd power

# Install all workspace dependencies
npm install
```

### 2. Environment Configuration (Separated Frontend & Backend)

FlowPilot AI separates configuration cleanly between frontend and backend:

#### A. Backend Server Configuration (`apps/api/.env`)
Contains privileged database credentials, Gemini SDK secrets, and JWT signing keys:
```bash
# Copy backend environment template
cp apps/api/.env.example apps/api/.env
```
Key settings in `apps/api/.env`:
* `API_PORT=3000`
* `AI_PROVIDER=demo` (or `"gemini"` with `GEMINI_API_KEY`)
* `JWT_SECRET=super-secret-jwt-key...`
* `DATABASE_TYPE=sqlite`

#### B. Frontend Client Configuration (`apps/web/.env`)
Contains only client-safe, public variables prefixed with `VITE_` (no server secrets):
```bash
# Copy frontend environment template
cp apps/web/.env.example apps/web/.env
```
Key settings in `apps/web/.env`:
* `VITE_API_URL="/api/v1"`
* `VITE_APP_NAME="FlowPilot AI"`
* `VITE_DEFAULT_CURRENCY="INR"`

---

### 3. Build & Run Services

#### Running Concurrently (Recommended)
```bash
npm run dev:all
```

#### Or Running Frontend & Backend Separately
```bash
# Start backend API server only (Port 3000)
npm run dev:backend

# Start frontend web client only (Port 5173)
npm run dev:frontend

# Start persistent queue worker only
npm run dev:worker
```

---

## 6. Pre-Seeded Demonstration Personas

On the login page (`http://localhost:5173/login`), click any quick-fill persona button to authenticate with 1 click:

| Persona Name | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Sarah Chen** | Owner / Admin | `admin@flowpilot.ai` | `flowpilot123` |
| **Marcus Brody** | Dept Manager | `manager@flowpilot.ai` | `flowpilot123` |
| **Elena Rostova** | Finance Approver | `approver@flowpilot.ai` | `flowpilot123` |
| **David Kim** | Requester / Employee | `employee@flowpilot.ai` | `flowpilot123` |

---

## 7. Running the Automated Test Suite

FlowPilot AI includes comprehensive unit and end-to-end integration test suites:

```bash
# Run Vitest test suite on the API and Workflow Engine
npm test --workspace=@flowpilot/api
```

### Verified Test Coverage
* ✅ **Health & Readiness Check**: `/api/v1/health` verifies DB and service responsiveness.
* ✅ **User Authentication & RBAC**: Signup, JWT signing, password hashing with bcrypt.
* ✅ **Multi-Tenant Data Isolation**: Cross-organization requests rejected.
* ✅ **Multi-Tier Policy Evaluation**: Accurate threshold tiers evaluated in integer paise.
* ✅ **DAG Graph Validator**: Detects and rejects cyclic workflow graphs.
* ✅ **Condition Evaluator**: Evaluates numeric/string comparisons without unrestricted code execution.
* ✅ **Request Intake Validation**: Strict Zod schemas reject invalid currencies, negative amounts, and missing justifications.
* ✅ **Gemini AI Integration**: Request structuring and classification with confidence scores.
* ✅ **Full Purchase Approval Lifecycle**: Intake -> Paused Execution -> Self-approval rejection -> Manager approval -> Resumption -> In-app notification -> Audit timeline.
* ✅ **Security Defense**: Spreadsheet CSV formula injection sanitization.

---

## 8. End-to-End Walkthrough Scenario

1. **Submit Request**: Log in as `David Kim` (`employee@flowpilot.ai`), navigate to **New Request**, and use the Gemini natural language assistant to suggest fields for a `₹15,000` monitor.
2. **Policy Routing**: The backend deterministically flags this as **Tier 2 (Manager Approval Required)** and starts the purchase approval workflow.
3. **Anti-Self-Approval Check**: Attempting to approve the request as `David Kim` is rejected with `403 Forbidden`.
4. **Manager Approval**: Log in as `Marcus Brody` (`manager@flowpilot.ai`), review the pending request in **Approvals**, and approve it with a budget note.
5. **Workflow Resumption**: The execution engine resumes, transitions the request status to `approved`, and emits an immutable audit event.
6. **Notification**: Switch back to `David Kim` to view the in-app notification and inspected audit timeline.
7. **Telemetry**: View **Analytics & Reports** to observe the updated turnaround duration and audited time-saved metrics.

---

## 9. License & Attribution

Designed and engineered for enterprise workflow excellence. Built with Google Gemini SDK (`@google/genai`), React 18, and Node.js.
