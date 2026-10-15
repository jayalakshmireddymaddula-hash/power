# FlowPilot AI — Security Architecture

## 1. Principles
- **No Client Privilege Escalation**: Role assignment and organization memberships are verified strictly on the backend.
- **Row Level Security (RLS)**: Every organization-scoped table has RLS enabled with explicit tenant isolation policies.
- **AI Separation**: AI suggestions are advisory only and never directly authorize purchases, transfer funds, or mutate permissions.
- **No Arbitrary Code Execution**: Workflow nodes and condition evaluators run in restricted sandbox parsers; no `eval()`, shell commands, or arbitrary JavaScript execution.
- **Immutable Published Workflows**: Published workflow versions cannot be edited in place. Editing creates a new draft version. Running workflows stay attached to their instantiated version.
- **Self-Approval Prevention**: An employee cannot approve their own purchase request unless explicitly overridden by an organization-wide setting.
- **Spreadsheet Injection Defense**: CSV exports escape formulas starting with `=`, `+`, `-`, `@` to prevent spreadsheet exploitation.
- **Audit Logging**: Sensitive and consequential actions generate append-only immutable audit events.
