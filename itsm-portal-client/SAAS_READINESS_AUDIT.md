# ITSM Portal — SaaS Demo Readiness Audit

**Date:** Audit conducted via full codebase review + live functional testing (backend PID running on `:5069`, frontend Vite dev server on `:5173`).
**Scope:** Backend (`ITSM.Portal.API`) + Frontend (`itsm-portal-client`). No code changes made in this pass — findings only, per request.

---

## 1. Executive Summary

The product has a genuinely strong foundation: real multi-tenancy, JWT auth with refresh tokens, RBAC, AI-assisted ticket creation, automation rules, SLA tracking, an approval center, and a polished visual design system ("Kyro"). It is **not** a toy — most core ITSM flows (tickets, assets, catalog, knowledge base, approvals, automation) are real, DB-backed, and functional.

However, in this pass I found **several visible bugs that would actively embarrass a demo** (contradictory numbers on the first screen a buyer sees, a raw database GUID displayed as a person's name), and **one structural gap that blocks the exact workflow you described** (a brand-new company cannot self-serve signup → create org in one flow). None of these are architecturally hard to fix — most are hours, not weeks — but they should be fixed before showing this to a buyer.

---

## 2. Product Gaps (with evidence)

### 🔴 Critical — fix before any demo

| # | Gap | Evidence | Why it matters |
|---|-----|----------|-----------------|
| 1 | **Sidebar shows hardcoded, fake stats that contradict the real dashboard** | [src/Components/Sidebar.jsx](src/Components/Sidebar.jsx#L79-L86) literally hardcodes `<strong>24</strong> Open` and `<strong>8</strong> In review`. On a freshly-seeded demo org with only 2 real open tickets, the sidebar says "24 Open" while the dashboard card two inches away says "Open Tickets: 2" and "Total Tickets: 3". | This is the **first thing visible after login**. A buyer will notice the numbers don't match within seconds — it's the single most damaging "looks unfinished" bug found. |
| 2 | **Reports page displays a raw user GUID instead of a technician's name** | Backend [Controllers/DashboardController.cs](../ITSM.Portal.API/Controllers/DashboardController.cs) builds `technicianWorkload` by grouping tickets on `t.AssignedTo` (a raw ID) and using it directly as the display `Label`, with no join to resolve a name/email. Confirmed live: Reports → "Technician workload" shows `7c9000e0-2481-4f8b-8a26-8be6c32ec7e4` instead of a person's name. | Exposing raw internal IDs to end users is a classic "internal dev tool" tell, and looks broken/unprofessional on a management report a buyer would specifically want to see. |
| 3 | **No true self-service "new company" signup flow** | The public Register form ([Components/Register.jsx](src/Components/Register.jsx)) only collects email + password — no company name field at all. Backend [Controllers/AuthController.cs](../ITSM.Portal.API/Controllers/AuthController.cs) (`Register` action) auto-assigns the new user to an existing org only if (a) their email domain matches an existing user, or (b) **there is exactly one organization in the whole system** (a dangerous fallback — during early customer onboarding, when you legitimately only have 1 org seeded, any unrelated stranger who registers with a new email domain is silently placed inside your first paying customer's tenant). Otherwise the account is created with `OrganizationId = null` and is completely unusable until an admin manually fixes it. Creating a **new** organization requires calling `POST /api/organizations/onboard`, which requires `[Authorize]` (an already-logged-in user) — there is no public "sign up as a new company" screen at all. | This directly blocks the exact workflow you asked for: *"Company admin signs up. Creates organization."* Today that is not one flow, it's a confusing sequence of API calls with no dedicated UI, and the domain-fallback behavior is a real tenant-isolation risk during the very first customer onboarding. |
| 4 | **Client-side "mock auth" bypass ships in every dev build by default** | [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx#L5) — `MOCK_AUTH_ENABLED = import.meta.env.DEV && VITE_ENABLE_MOCK_AUTH !== 'false'` (**on by default**, must be explicitly disabled). If a login call fails with a network-level error (backend down, 502, CORS hiccup — exactly the kind of thing that can happen on a live demo laptop/hotel wifi), `shouldUseMockAuth()` silently logs the user in as a **fake local Admin** with a `mock-token` and zero real data. | If the backend hiccups mid-demo, instead of a clear "reconnecting…" message, the presenter gets silently dropped into a fake, empty "Admin" session — confusing and hard to debug live, and a lingering security smell (client-side auth bypass) even though it's dev-gated. |

### 🟠 High — fix before selling, not necessarily before an internal demo

| # | Gap | Evidence | Why it matters |
|---|-----|----------|-----------------|
| 5 | **No real billing/subscription enforcement** | `SubscriptionController.GetPlans()` and `SubscriptionPlanService` return `UserLimit`, `AssetLimit`, `AiUsageLimit` per plan, but a workspace-wide search confirms these numbers are **never checked anywhere** — no seat-limit enforcement on user invite, no asset-limit check, no AI-usage metering. There's no Stripe/payment integration, no trial-expiry logic, no upgrade/downgrade flow. `Organization.SubscriptionTier` is just a free-text string set once at onboarding. | Fine for a live demo (nobody expects to see billing mid-demo), but this is the single biggest gap between "impressive demo" and "sellable product" — SMB buyers will ask "how do I pay you" and "what happens if we exceed our plan" almost immediately after saying yes. |
| 6 | **"Tickets" nav item is mislabeled and doesn't lead to a ticket queue** | [Sidebar.jsx](src/Components/Sidebar.jsx#L9) labels the nav item "Tickets — Queue & triage" but routes it to `/tickets/new` (the **create** form). The actual filterable/sortable ticket table lives embedded inside the Dashboard page. There is no dedicated `/tickets` list route at all, and a full component for it (`src/Components/TicketsTable.jsx`) exists but is **never imported or used anywhere** — dead code, likely a partially-finished refactor. | Clicking "Tickets" expecting to triage the queue and instead landing on a blank "create new ticket" form is a jarring first impression for a technician/manager persona in a demo. |
| 7 | **Inconsistent loading/empty/error state handling across pages** | The shared `EmptyState`, `LoadingSpinner`, and `ErrorBanner` components exist and are well-built, but a workspace-wide check shows they're only used in **6 of ~24 pages** (Admin, AiHelpManager, Dashboard, KnowledgeArticle, KnowledgeBase, Reports). Pages like Assets, AssetDetail, ApprovalCenter, ApprovalDetail, AutomationRules, AutomationActivity, CreateAsset, CreateTicket, MyRequests, ProfilePage, ServiceCatalog, ServiceDetail, TicketDetail do **not** use them — each has its own ad-hoc (or missing) handling. | Inconsistent polish is exactly the "feels like an internal tool, not a commercial product" signal you asked me to look for — some screens feel finished, others don't, in the same session. |
| 8 | **`OrganizationService.CreateOrganizationAsync` is not transactional** (carried over from last session, not yet fixed) | If admin-user creation fails after the `Organization` row is saved (e.g. duplicate email), an orphaned, empty organization is left behind permanently. Reproduced live last session (orphaned "Acme Corp" org). | Data-integrity bug that will quietly accumulate junk organizations in your platform-admin org list as real customers sign up and occasionally fat-finger the form. |
| 9 | **No frontend for the new Platform Admin capabilities** | The backend `PlatformAdminController` (organizations list, metrics, activate/deactivate) built last session has **zero corresponding UI** — it's API/Swagger-only today. | Not customer-facing, so lower priority for buyer demos, but you (as the vendor) currently have no dashboard of your own to manage customers as they onboard. |

### 🟡 Medium / Low

| # | Gap | Evidence |
|---|-----|----------|
| 10 | Any authenticated user (even a freshly-registered Employee) can call `POST /api/organizations/onboard` and spin up an unrelated brand-new organization — no role restriction on that endpoint. | `OrganizationsController.Onboard` is `[Authorize]` only, no role check. |
| 11 | Dev environment wipes the entire database on every backend restart (`EnsureDeleted()+EnsureCreated()`). Correctly gated to dev-only (production uses `Migrate()`), but means any manually-onboarded second/third demo org must be re-created after every restart — easy to forget mid-demo prep. | `Program.cs` |
| 12 | Login/Register are not real routes (`/login`, `/register` don't exist in the router — they're a local `useState` toggle inside `App.jsx` shown only when `!user`). Refreshing the page while on the "Create account" screen silently drops you back to Login; there's no shareable/bookmarkable login URL. | `App.jsx` lines ~28-34 |

---

## 3. Recommended Priorities (by business impact)

1. **Fix the sidebar hardcoded stats (#1)** — highest visibility, lowest effort, must-fix before any buyer sees the product.
2. **Fix the technician-name GUID bug on Reports (#2)** — same category, very cheap fix (join to `ApplicationUser` for display name).
3. **Design and build one real "Sign up your company" flow (#3)** — combine register + onboard into a single guided screen: company name → admin email/password → done, landing straight in a seeded demo-ish workspace. This is the centerpiece of the "customer-facing workflow" you described in Task 3 and currently doesn't exist as a single flow.
4. **Remove/neutralize the mock-auth fallback (#4)**, or at minimum make it opt-in only for local development with a very loud on-screen banner, never silent.
5. **Wire up a real `/tickets` queue route (#6)** and delete or use `TicketsTable.jsx` — decide which ticket-table implementation is canonical.
6. **Roll out consistent Loading/Empty/Error components to all pages (#7)** — mechanical, page-by-page work, big cumulative polish payoff.
7. Decide scope of billing before selling (#5) — even a "Contact us to upgrade" placeholder with real seat-limit warnings is better than the current fully-cosmetic plan cards.
8. Everything else (transactional org creation, platform-admin UI, onboard endpoint role restriction) can follow after the above.

---

## 4. Estimated Effort

| Item | Estimate |
|---|---|
| #1 Sidebar hardcoded stats | Trivial — wire to real ticket counts already computed on Dashboard |
| #2 GUID → technician name | Small — one join in `DashboardController`, plus DTO field |
| #3 Unified company signup flow | Medium — new frontend screen + reuse of existing onboard endpoint + decide domain-matching/fallback policy (remove the "only 1 org" auto-join) |
| #4 Mock-auth fallback | Small — remove or gate behind explicit opt-in + visible banner |
| #6 Real ticket queue route | Small–Medium — mostly wiring existing `TicketsTable`/`TicketList` + filters into a `/tickets` route |
| #7 Consistent empty/loading/error states | Medium, spread across ~18 pages — mechanical but time-consuming |
| #5 Billing enforcement (seat limits at minimum) | Medium–Large — real payment integration is Large; basic seat/asset-limit enforcement using existing plan data is Medium |
| #8 Transactional org creation | Small |
| #10 Restrict onboard endpoint | Trivial |
| #9 Platform Admin UI | Medium (new admin-facing app section) |

---

## 5. What Would Make This Sellable to Small/Medium Businesses

- **A believable, self-serve first-run experience.** SMB buyers expect "sign up → see value in minutes" with no help from you. That means fixing #3 above is the single highest-leverage change for sellability.
- **No visibly fake or contradictory data anywhere** (#1, #2). SMB buyers are evaluating trust as much as features in the first 5 minutes.
- **A believable pricing story**, even if billing isn't fully automated yet — at minimum, plan limits should be *real* (enforced), not decorative.
- **Consistent polish across every screen** — SMBs comparing you to Freshservice/Zendesk/Jira Service Management will notice if some pages feel unfinished next to others.
- **Confidence that a demo won't break on flaky wifi** — the mock-auth fallback should never be the thing standing between "everything works" and "confusing fake session" during a sales call.
- **Clear multi-tenant safety story** — you already did excellent work removing the Platform Admin heuristic and fixing the fail-closed tenant filter last session; the onboarding/domain-matching gap (#3, #10) is the one remaining loose thread in that story worth closing before you have real paying customers.

---

## 6. Demo Tenant Experience Plan

**Goal: a new company understands the product within 5 minutes of logging in.**

1. **Seed a richer demo organization** than the current minimal seed data. Recommended composition for a single demo org ("Northwind Digital" or a new dedicated "Demo Co"):
   - **Users**: 1 Admin, 1–2 Managers, 3–4 Technicians across 2–3 departments, 8–10 Employees.
   - **Departments**: Service Desk, Infrastructure, Security, Facilities (realistic org chart feel).
   - **Tickets**: 25–40 tickets spanning a realistic mix — some open, some in progress, some resolved/closed, spread across the last 30–60 days (not all created "today", so trend charts have real shape), with a mix of priorities and a couple of intentionally SLA-breached tickets so the SLA Health widget isn't just "100%, nothing to show."
   - **Assets**: 15–25 assets (laptops, monitors, phones, software licenses) assigned to various employees, a couple flagged for maintenance/retirement so the "Asset Alerts" widget has real content.
   - **SLA policies**: 2–3 tiered policies (e.g. Critical = 4h response, High = 8h, Standard = 48h) already configured and visibly tied to real tickets.
   - **Knowledge base**: 6–10 articles covering common issues (password reset, VPN setup, hardware request) so the AI assistant and self-service search both have something real to surface.
   - **Reports**: with the above volume, priority/department/technician breakdowns and the ticket trend chart will look populated and credible instead of near-empty.
   - **Automation rules**: 2–3 pre-built rules (auto-assign critical tickets, auto-escalate SLA-at-risk tickets, auto-tag by keyword) with visible execution history in Automation Activity.
2. **Fix the sidebar/report bugs (#1, #2) first** — no amount of good demo data fixes a screen that visibly contradicts itself.
3. Consider a **"Reset demo data" button** (platform-admin only) so you can re-seed a clean, impressive state before every sales call without re-running the whole dev pipeline.

---

## 7. Customer-Facing Workflow — Current State vs. What's Missing

| Step | Status | Notes |
|---|---|---|
| Company admin signs up | ⚠️ Partial | Public form exists but collects no company info and can't create a new org in one step (#3). |
| Creates organization | ⚠️ Partial | Works via API (`/api/organizations/onboard`) and via the in-app "Setup Wizard" (Admin page) — good UI already exists there — but only reachable *after* already being authenticated into some org. Not reachable from the public signup screen. |
| Invites employees | ✅ Works | Admin → user management supports role/department assignment. Domain-based auto-join at registration is a nice existing mechanism, once the "only 1 org" fallback risk (#3/#10) is removed. |
| Employees submit tickets | ✅ Works well | `CreateTicket` flow is polished — asset linking, priority, category, description all present. |
| AI assistant helps create tickets | ✅ Works | Meyon assistant widget is present globally, with quick-action prompts including "Create a ticket for my Outlook issue." |
| IT team manages SLA and resolution | ✅ Mostly works | SLA policies, ticket detail, comments, and automation rules are all real and functional. |
| Admin views analytics | ⚠️ Partial | Reports page is good but has the GUID display bug (#2), and business-metric numbers should be double-checked for consistency with dashboard/sidebar. |

---

## 8. UI/UX Review Summary

- **Visual design system is strong** — consistent typography, color, card layout ("Kyro" branding) across most screens. This does not look like a bare-bones internal tool at a glance.
- **Where it feels unfinished**: contradictory numbers (#1), raw IDs (#2), inconsistent state handling (#7), a nav item that doesn't do what it says (#6), and the dead-code `TicketsTable` component suggesting an incomplete refactor.
- **Branding/onboarding**: company branding (logo, primary color) is already configurable per-org via Admin → Workspace identity — genuinely good multi-tenant white-labeling groundwork. The gap is entirely in the *first* few minutes (signup/org-creation), not in ongoing use.
- **Empty states**: where implemented (`EmptyState` component), they're clean and on-brand. The problem is coverage, not quality.

---

## 9. Demo Checklist — What to Show a Buyer, in Order

1. **Login** → land on **Dashboard**. *Problem solved: instant, credible overview of service health.* (Fix #1/#2 first.)
2. **Tickets** (once #6 is fixed — a real queue) → filter/sort/assign. *Problem solved: day-to-day triage efficiency.*
3. **Create Ticket** → show the clean form + asset linking. *Problem solved: easy request intake for employees.*
4. **Meyon AI assistant** → "Create a ticket for my Outlook issue" live. *Problem solved: reduces friction/support load via AI.*
5. **Ticket Detail** → comments, attachments, SLA countdown, status changes. *Problem solved: full lifecycle visibility.*
6. **Approval Center** → show a pending access/service request approval. *Problem solved: governance/compliance for access requests.*
7. **Automation Rules + Activity** → show a live rule (auto-escalate) and its execution history. *Problem solved: less manual triage work, faster SLA compliance.*
8. **Assets** → inventory, ownership, linked tickets. *Problem solved: IT asset lifecycle tracking.*
9. **Knowledge Base** → self-service article search. *Problem solved: deflection of repetitive tickets.*
10. **Reports** (after #2 fixed) → SLA compliance, ticket trends, department/priority breakdown. *Problem solved: management visibility/KPIs.*
11. **Admin → Workspace administration** → branding, SLA policy editor, user/role management, Setup Wizard. *Problem solved: this is genuinely "yours" — a self-service, multi-tenant, brandable workspace, not a shared generic tool.*
12. **(Once built) Company signup flow** — ideally the *first* thing you'd show a brand-new prospect if selling self-serve, but until #3 is fixed, open with Dashboard instead and describe the intended flow verbally.

---

## Appendix — Testing Performed This Session

- Live browser walkthrough as Admin (`admin@itsm.local`): Dashboard, Create Ticket, Admin panel, Reports, Register/Login screens.
- Confirmed contradictory sidebar vs. dashboard ticket counts live.
- Confirmed raw GUID rendering on Reports → Technician Workload live, traced to root cause in `DashboardController.cs`.
- Traced full Register → Organization assignment logic in `AuthController.cs` and confirmed the "only 1 org in the system" auto-join fallback.
- Confirmed `TicketsTable.jsx` is unused dead code via workspace-wide reference search.
- Confirmed `EmptyState`/`LoadingSpinner`/`ErrorBanner` usage is limited to 6 of ~24 pages via workspace-wide search.
- Confirmed Subscription plan limits (`UserLimit`, `AssetLimit`, `AiUsageLimit`) are defined but never enforced anywhere in the backend via workspace-wide search.
- Reviewed `AuthContext.jsx` mock-auth fallback logic end-to-end.
- No destructive actions taken; no code modified in this pass.
