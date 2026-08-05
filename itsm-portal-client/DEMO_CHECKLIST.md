# Kyro ITSM — Sales Demo Checklist

A guided walkthrough for presenting Kyro to prospective customers. Follow the persona order below;
each step names the screen to show, the story to tell, and the problem it solves. Total runtime: ~15-20 minutes.

> **Before every demo:** log in as `admin@itsm.local` / `Admin@123`, open **Admin → Demo mode**, and click
> **Reset demo data**. This regenerates a clean set of tickets, assets, service requests, approvals, and
> automation activity in seconds — no risk of showing a broken or stale environment. Users, departments,
> knowledge articles, and automation rules are untouched.

---

## 1. Employee experience — "I just need help fast"
Login: `employee@northwind.demo` / `Northwind@123` (Sofia Rivera, Service Desk)

| Screen | Story | Problem solved |
|---|---|---|
| **Dashboard** | "Every employee lands on a simple, personalized view of their open requests — no clutter, no ticket-queue overwhelm." | Reduces support-channel noise; self-service visibility. |
| **Create Ticket** → type a real issue (e.g. "VPN keeps disconnecting during video calls") → click **✨ Suggest with AI** | "Instead of guessing a category or priority, the employee describes the problem in plain language and Kyro's AI instantly suggests a title, priority, category, and the right team to route it to." | Removes friction from intake; improves routing accuracy from day one. |
| **Service Catalog** | "Employees can browse pre-approved services — new laptop, software license, access request — instead of filing a generic ticket." | Standardizes common requests; sets expectations (SLA, approval steps) up front. |
| **My Requests** | "Full transparency into request status without needing to email or call the help desk." | Cuts 'status check' interruptions to the service desk. |
| **Knowledge Base** | "Self-service articles let employees solve common issues (password reset, VPN setup) without ever opening a ticket." | Deflects low-value tickets, frees up technician time. |

---

## 2. Technician experience — "Help me work faster, not harder"
Login: `technician@northwind.demo` / `Northwind@123` (Leo Chen, Infrastructure)

| Screen | Story | Problem solved |
|---|---|---|
| **Tickets → Queue & triage** | "Technicians see a prioritized, filterable queue — Critical and High priority issues surface immediately." | Prevents high-impact tickets from getting lost in a flat list. |
| **Ticket Detail** (open a Critical/In-Progress ticket, e.g. "Production API returning intermittent 500 errors") | "Here's the full context: requester, asset, SLA, history — all in one place." | Eliminates context-switching across email/chat/spreadsheets. |
| **AI Assist panel → Get AI suggestions** | "With one click, Kyro drafts a customer-ready response, proposes a likely root cause, and lists concrete next steps — the technician reviews and sends instead of starting from a blank page." | Speeds up first response time; standardizes ticket handling quality even for junior technicians. |
| **Assets** | "Each ticket can link to the affected asset, and technicians can see warranty/lifecycle status at a glance (e.g. an asset expiring soon)." | Connects incidents to root-cause hardware/software, informs replacement decisions. |
| **Automation Activity** | "Behind the scenes, rules already escalated this critical ticket and notified the right people automatically." | Shows automation is real and auditable, not a black box. |

---

## 3. Manager experience — "Show me it's under control"
Login: `manager@northwind.demo` / `Northwind@123` (Mina Patel, Service Desk) or `manager2@northwind.demo`

| Screen | Story | Problem solved |
|---|---|---|
| **Dashboard** | "Managers get the same fast overview, but with team-wide SLA health and open/pending counts." | Instant health check without building a report. |
| **Approval Center** → open a pending service request | "Approvals for access requests, purchases, or service requests happen in-app with full context and one-click approve/reject." | Removes email approval chains; creates an audit trail. |
| **Reports** | "Resolution time, ticket volume, and SLA breach trends are already calculated — no spreadsheet exports needed." | Gives managers data to justify staffing/process decisions. |
| **Automation Rules** | "Managers (with Admin) can see and tune the rules that auto-escalate, auto-notify, and auto-route work — the engine that keeps things moving without manual triage." | Demonstrates configurability, not just a fixed workflow. |

---

## 4. Admin experience — "Show me control and safety"
Login: `admin@itsm.local` / `Admin@123`

| Screen | Story | Problem solved |
|---|---|---|
| **Admin → Team access** | "Full user/role/department management in one table — bulk role changes, department reassignment, activate/deactivate." | Standard IT-admin governance without a separate identity tool. |
| **Admin → Company branding** | "White-label the workspace name, logo, and color to match the customer's brand in minutes." | Reinforces this is *their* platform, not a generic template. |
| **Admin → SLA policies** | "Response/resolution targets per priority are configurable, not hardcoded." | Matches each customer's existing SLA commitments. |
| **Admin → Demo mode / Reset demo data** | "This button is for *our* use during the demo, but it illustrates a broader point: environments can be reset to a known-good state safely — useful for the customer's own sandbox/training instances." | Reassures the room that nothing shown today can "break" during the pitch. |

---

## Closing notes for the presenter
- If a click produces unexpected data, it is safe to hit **Admin → Reset demo data** live — this is a selling
  point, not a workaround, and takes about 2 seconds.
- The AI features (Suggest with AI, AI Assist) run against a real backend service; if a customer asks
  "is this really AI," the honest answer is: heuristic/template-based analysis today, with a plug-in point
  (`IAIProvider`) already wired for OpenAI/Azure OpenAI to add generative responses without further UI changes.
- The floating **Meyon** assistant (bottom-right chat bubble) is a separate, general-purpose portal assistant
  (creating tickets, summarizing incidents, guiding self-service) — distinct from the ticket-level **AI Assist**
  panel. Frame them as complementary: Meyon for "get me started," AI Assist for "help me resolve this specific
  ticket."
