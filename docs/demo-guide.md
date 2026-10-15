# FlowPilot AI — End-to-End Demonstration Guide

Welcome to the **FlowPilot AI** live demonstration walkthrough. This guide demonstrates how FlowPilot AI automates the busywork of repetitive business approvals while preserving strict human governance, auditable policy enforcement, and AI intelligence.

---

## 1. Demo Personas & Credentials

The database comes pre-seeded with 4 test personas:

| Persona | Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Chen** | Owner / Admin | `admin@flowpilot.ai` | `flowpilot123` | System settings, template designer, policy thresholds, metrics |
| **Marcus Brody** | Dept Manager | `manager@flowpilot.ai` | `flowpilot123` | Tier 2 & Tier 3 Stage 1 approvals, department oversight |
| **Elena Rostova** | Finance Approver | `approver@flowpilot.ai` | `flowpilot123` | Tier 1 & Tier 3 Stage 2 executive approvals |
| **David Kim** | Requester / Employee | `employee@flowpilot.ai` | `flowpilot123` | Submits purchase requests, reviews AI advisory, tracks timeline |

> **Pro Tip:** On the Login page (`/login`), click any of the **Quick Demo Persona** buttons to sign in with 1 click without typing.

---

## 2. Policy-Based Routing Rules

FlowPilot AI calculates all monetary thresholds in **integer minor units (paise for INR)** to eliminate floating-point rounding errors:

* **Tier 1 (≤ ₹5,000 / 500,000 paise):**
  Requires 1 authorized approver (`Elena Rostova` or `Marcus Brody`).
* **Tier 2 (> ₹5,000 and ≤ ₹25,000 / 2,500,000 paise):**
  Requires designated Department Manager sign-off (`Marcus Brody`).
* **Tier 3 (> ₹25,000 / 2,500,000 paise):**
  Automatically triggers dual sequential approval: Stage 1 (Department Manager `Marcus Brody`), followed by Stage 2 (Finance Approver `Elena Rostova`).
* **Strict Anti-Self-Approval Guard:**
  Requesters are strictly prohibited from approving their own purchase requests on the backend (returns HTTP 403 `SELF_APPROVAL_PROHIBITED`).

---

## 3. Step-by-Step Live Demonstration Journey

### Step 1: Log in as Employee (`David Kim`)
1. Open `http://localhost:5173/login`.
2. Click **David Kim (Requester)**.
3. You are redirected to the Dashboard (`/app/dashboard`).

### Step 2: Intelligent Request Intake with AI Assistant
1. Navigate to **New Request** (`/app/requests/new`).
2. In the AI Assistant prompt box, enter:
   > *"Need a 4K Dell UltraSharp monitor for engineering pair programming, costing roughly 15000 INR from TechSupply vendor."*
3. Click **AI Suggest Fields**.
4. Observe the Gemini AI assistant:
   - Sets title: *"Dell UltraSharp 4K Monitor for Engineering"*
   - Detects category: `procurement`
   - Parses amount: `₹15,000` (`1500000` paise)
   - Assigns priority: `normal`
   - Previews policy tier: **Tier 2 (Manager Approval Required)**
5. Click **Apply Suggestions**, then click **Submit Purchase Request**.
6. The request is created transactionally with status `awaiting_approval`.

### Step 3: Verify Anti-Self-Approval Defense
1. While logged in as `David Kim`, navigate to **Approvals** (`/app/approvals`).
2. Even if David attempts to approve his own request, the system displays an alert: *"Self-approval prohibited"*, and the backend returns `403 Forbidden`.

### Step 4: Department Manager Authorization
1. Switch personas: Log in as **Marcus Brody (Manager)** (`manager@flowpilot.ai`).
2. Open **Approvals** (`/app/approvals`).
3. You will see the pending `₹15,000` request in Marcus's inbox.
4. Review the details:
   - Item amount and business justification.
   - Deterministic policy requirement badge: `Tier 2 - Department Manager Approval`.
   - AI Advisory explanation: *"Request exceeds ₹5,000 single-approval threshold; routes to Marcus Brody (Engineering Manager)."*
5. Click **Approve Request**, enter an optional comment (*"Approved under Q4 hardware budget"*), and confirm.
6. The approval is recorded transactionally in an atomic database transaction.

### Step 5: Real-Time Notifications & Timeline
1. Switch back to **David Kim (Requester)**.
2. Notice the **Notification Bell** icon in the top navigation has updated.
3. Open **Notifications** (`/app/notifications`).
4. See the notification: *"Purchase Request Approved: Your request 'Dell UltraSharp 4K Monitor' has been approved."*
5. Click **View** to inspect the live audit timeline (`/app/requests/:requestId`), which displays timestamps for submission, policy evaluation, and manager approval.

### Step 6: Operational Metrics & Time-Saving Verification
1. Navigate to **Analytics & Reports** (`/app/reports`).
2. See the updated KPIs:
   - Total executions incremented.
   - Success rate at 100%.
   - Measured turnaround duration (under 2 minutes).
   - Audited time saved calculated against the 25-minute manual baseline.
3. Click **Export CSV** to download an audit spreadsheet with formula injection sanitization.
4. Click **AI Bottleneck Audit** to generate a Gemini diagnostic of approval latency.

---

## 4. Resetting or Reseeding Demo Data

At any point during testing or presentation:
1. Navigate to **Settings** (`/app/settings`) -> **Demo & Status** tab.
2. Click **Seed Demonstration Scenarios**.
3. High-fidelity synthetic requests across all 3 tiers will be populated instantly.
