# Progetto Gare — Statement of Work (SOW)

> **Date:** February 2026  
> **Client:** TBD  
> **Vendor:** TBD

---

## 1. Executive Summary

Progetto Gare is an AI-powered platform for managing Italian public procurement tenders ("gare d'appalto"). It helps companies upload and classify tender documents, automatically extract requirements into an operational checklist, match company evidence against those requirements, and generate draft technical proposals — all powered by AI.

**Core capabilities:**
- Document upload with AI classification (10 categories)
- Automated requirement extraction into an operational checklist
- Requirement–evidence matching with gap analysis
- Context-aware AI chat with document references
- Draft technical proposal editor with per-section AI generation
- Company workspace (profile, certifications, CVs, reference documents)
- Authentication, team management, and role-based access

**What needs to happen next:** A paid discovery phase to align on the final product direction — especially around the chat interface, requirements dashboard, and output generation — followed by a structured build-out in 4 macro areas.

---

## 2. Paid Discovery Phase

> **Objective:** Align on deliverables, UX direction, and acceptance criteria before committing to the full build.  
> **Output:** Product brief, wireframes, validated user flows, and a finalized backlog.

| Activity | Description | Hours |
|----------|-------------|-------|
| Discovery workshop | Stakeholder interviews combined with chat interface and requirements dashboard design sessions — understand end-user workflows, define what the chat should do vs. structured UI, rethink the dashboard layout and information hierarchy | 8h |
| Wireframes & clickable prototype | Low-fi wireframes for the main views (chat, requirements dashboard, output) | 6h |
| Product brief & backlog | Write acceptance criteria, define scope, prioritize features, estimate effort | 4h |
| Alignment presentation | Final walkthrough with client, sign-off on scope | 2h |

| | |
|---|---|
| **Discovery Total** | **20 hours** |
| **Discovery Output** | Product brief, wireframes, finalized backlog with acceptance criteria |

---

## 3. Macro Areas Breakdown

### Area 1 — Chat & AI Interaction Layer
> Refine how users interact with the AI across the platform.

The current chat is a single conversational panel. The key design question is: **what belongs in the chat vs. what belongs in structured UI?** The chat should not be a catch-all — it should be the "thinking partner" while structured panels handle execution.

| Task | Description | Hours |
|------|-------------|-------|
| Context management | Build proper context windowing — needs smart context selection based on active task and relevant documents | 10h |
| Chat ↔ sidebar integration | Actions from chat should update the sidebar in real-time (e.g., "mark requirement X as done" from chat) | 8h |
| Prompt engineering & guardrails | Harden prompts, add output validation, handle hallucinations, structured error recovery | 6h |

| | |
|---|---|
| **Area 1 Total** | **24 hours** |

---

### Area 2 — Requirements Dashboard & Output
> The operational heart of the product — from requirements tracking to deliverable generation.

This area covers both the requirements dashboard and the output panel (draft proposal). The focus is on getting the UI right for managing requirements and producing a usable output document.

| Task | Description | Hours |
|------|-------------|-------|
| Dashboard UX overhaul | Redesign card layout, introduce filtering/sorting/grouping by type, source, status, owner | 10h |
| Bulk operations | Multi-select requirements, bulk status update, bulk assignment, bulk AI auto-fill | 4h |
| Output editor & export | Integrate a lightweight rich text editor for the draft proposal, with AI-assisted per-section generation and PDF/DOCX export | 12h |

| | |
|---|---|
| **Area 2 Total** | **26 hours** |

---

### Area 3 — Document Intelligence
> From "upload and classify" to a robust document intelligence layer — for both tender documents and company documents.

| Task | Description | Hours |
|------|-------------|-------|
| Document viewer | In-app read-only PDF viewer with source traceability (link requirements back to source pages) | 6h |
| Source linking | Every extracted requirement links back to the exact page/paragraph in the source document | 8h |
| Bando intelligence | Advanced extraction from tender documents: structured parsing of requirements, deadlines, thresholds, evaluation criteria, and cross-referencing across document types | 8h |
| Company document intelligence | AI extraction from company docs: auto-tag capabilities, certifications, project references, CV parsing | 6h |
| LLM model testing & evaluation | Test and benchmark multiple LLM providers/models for extraction quality, classification accuracy, and cost-efficiency across real tender documents | 4h |
| Batch upload & processing | Upload multiple files with progress indicators, retry on failure, background processing | 4h |

| | |
|---|---|
| **Area 3 Total** | **36 hours** |

---

### Area 4 — Platform, Admin & Production Readiness
> Everything needed to deliver a production-ready, maintainable product.

| Task | Description | Hours |
|------|-------------|-------|
| Admin panel | Full admin experience: team management, role assignment, user permissions, company settings, usage overview | 8h |
| Error handling & resilience | Error boundaries, retry logic, offline indicators, graceful degradation when AI is slow/down | 4h |
| Authentication hardening | Remove dev shortcuts, add rate limiting, session refresh, account recovery | 4h |
| Testing | Unit tests for business logic, integration tests for API routes, E2E tests for critical flows | 10h |
| Performance optimization | Lazy loading, code splitting, API response caching, pagination | 4h |
| Security audit | Input sanitization, CORS hardening, file upload validation, data isolation verification | 4h |
| CI/CD pipeline | Automated lint, test, type-check, preview deployments, production deploy | 4h |
| Monitoring & observability | Error tracking, AI usage/cost tracking, basic analytics | 4h |
| Documentation | API docs, deployment runbook, onboarding guide | 2h |
| Infrastructure planning & cost modeling | Define hosting architecture, set up cost monitoring | 4h |

| | |
|---|---|
| **Area 4 Total** | **48 hours** |

---

## 4. Effort Summary

| Phase | Hours | Notes |
|-------|-------|-------|
| **Discovery (paid)** | 20h | Must happen first. Output: product brief + wireframes + backlog |
| **Area 1** — Chat & AI Interaction | 24h | Highest product-risk area |
| **Area 2** — Requirements Dashboard & Output | 26h | Core value prop of the product |
| **Area 3** — Document Intelligence | 36h | Differentiator — bando + company intelligence |
| **Area 4** — Platform, Admin & Production | 48h | Non-negotiable for production |
| | | |
| **Total** | **154 hours** | **~5 weeks at 30h/week** |

> **Note:** These are development hours only. They do not include project management, client communication, or QA cycles, which typically add 15–20% overhead.

---

## 5. Risks & Technical Difficulties

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **LLM output unpredictability** | LLMs can produce inconsistent structures, hallucinate requirements, or miss critical details. The extraction quality directly determines product value. | Strict output schemas with validation; fallback/retry logic; human-in-the-loop review on every extraction; confidence scoring per requirement |
| **Requirements dashboard complexity** | The dashboard is doing too much in one panel: checklist, evidence, matching, editing, progress, team assignments. Risk of becoming unusable as data grows. | Discovery phase must nail the information architecture. Consider splitting into multiple views or introducing a detail-drawer pattern |
| **Chat vs. structured UI boundary** | Unclear what should happen via chat (natural language) vs. via direct manipulation (clicks, forms). Wrong boundary = confused users or redundant UI. | Dedicated workshop in discovery. Principle: chat for exploration/thinking, structured UI for execution/tracking |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **AI token costs** | Extraction, chat, and matching calls consume significant tokens. Costs grow with document volume per tender. | Implement token budgets per operation; cache responses; use lighter models for classification tasks; monitor spend |
| **Document parsing quality** | PDF text extraction is unreliable for scanned documents, tables, complex layouts common in Italian public procurement. | Add OCR pipeline; implement quality checks on extracted text; allow manual text correction |

---

## 6. Recommended Sequencing

```
Phase 0: Discovery (20h)
    ↓
Phase 1: Core Product (Area 1 + Area 2 — in parallel)       ~50h
    ↓
Phase 2: Document Intelligence (Area 3)                      ~36h
    ↓
Phase 3: Production Readiness (Area 4)                        ~48h
```

**Rationale:** Discovery must come first to validate direction. Chat and requirements dashboard are the product's core — build them in parallel. Document intelligence unlocks the differentiating value (bando intelligence, source traceability). Platform hardening and admin wrap up before launch.

---

## 7. Deliverables

| Phase | Deliverable |
|-------|------------|
| Discovery | Product brief, wireframes, clickable prototype, finalized backlog |
| Phase 1 | Refined chat interface, redesigned requirements dashboard, output editor with export |
| Phase 2 | In-app document viewer, source-linked requirements, bando + company intelligence, LLM benchmarks |
| Phase 3 | Admin panel, test suite, CI/CD pipeline, monitoring, documentation, production deployment |

---

## 8. Assumptions & Exclusions

**Assumptions:**
- Client provides access to real tender documents for testing during development
- Estimates assume dedicated development resources

**Exclusions:**
- Mobile app (responsive web only)
- Economic proposal generation (only technical proposal in scope)
- Integration with third-party procurement platforms (e.g., ANAC, MePA)
- Custom AI model training or fine-tuning
- Data migration from other tools

---

## 9. Estimated Running Costs

Monthly operational costs to keep the platform running after go-live.

### Infrastructure

| Service | What it covers | Estimated Monthly |
|---------|---------------|-------------------|
| Cloud hosting | Application server, serverless functions, CDN, SSL | €20–50 |
| Database | Reads, writes, storage | €30–80 |
| Object storage | Document files (PDFs, DOCs), generated exports | €10–25 |
| Email service | Authentication, notifications | €0–20 |
| Error tracking & monitoring | Error reporting, uptime monitoring | €0–30 |
| Domain & DNS | Custom domain, DNS management | ~€5 |

| | |
|---|---|
| **Infrastructure subtotal** | **€70–200/month** |

### AI API Costs

| Activity | Cost per operation (approx.) |
|----------|------------------------------|
| Document classification | €0.01–0.05 |
| Full requirement extraction | €0.10–0.50 |
| Chat message (with context) | €0.02–0.10 |
| Requirement–evidence matching | €0.10–0.40 |
| Draft section generation | €0.10–0.50 |

Estimated monthly AI cost depends on usage volume:

| Usage | Tenders/month | Estimated AI Cost/month |
|-------|---------------|------------------------|
| Standard | 3–5 tenders | €80–200 |
| Active | 8–15 tenders | €200–500 |
| Heavy | 20+ tenders | €500–1,000 |

### Total Estimated Running Cost

| | Monthly | Annual |
|--|---------|--------|
| Infrastructure | €70–200 | €840–2,400 |
| AI API | €80–500 | €960–6,000 |
| **Total** | **€150–700** | **€1,800–8,400** |

---

## 10. Commercial Proposal — 3-Year Agreement

### Deal Structure: ~€100K / 3 Years

The platform is delivered as a **fully managed solution**. The client gets a hosted, maintained, and supported product — no infrastructure to manage, no technical operations required. All software licenses, hosting, and AI costs are included.

#### Year 1 — Build & Launch: €40,000

| Includes | |
|----------|--|
| Discovery phase (20h) | Product brief, wireframes, backlog |
| Full platform development (134h) | All 4 macro areas delivered |
| Software licenses & tooling | All third-party libraries, editor components, CI/CD, monitoring tools |
| Deployment & go-live | Production environment, DNS, SSL, monitoring |
| Onboarding & training | User training sessions, admin walkthrough |
| 12 months platform access | Full access from go-live date |
| Infrastructure & AI costs | Covered for Year 1 |
| Standard support | Bug fixes, security patches, prompt tuning (8–12h/month) |

#### Year 2 — Operate & Improve: €30,000

| Includes | |
|----------|--|
| 12 months platform access | Continued full access |
| Software licenses & tooling | All renewals and updates included |
| Infrastructure & AI costs | Covered (see usage terms below) |
| Standard support | Bug fixes, security patches, dependency updates (8–12h/month) |
| Minor improvements | Small feature enhancements and UX refinements |
| AI model updates | Test and integrate improved models as they become available |

#### Year 3 — Operate & Improve: €30,000

| Includes | |
|----------|--|
| Same as Year 2 | Continued access, support, infra, licenses, and improvements |

### Usage Terms

| Parameter | Included |
|-----------|----------|
| **User seats** | Up to 15 users |
| **Tenders per year** | Up to 50 active tenders |
| **Documents per tender** | Up to 30 documents |
| **Storage** | Up to 10 GB document storage |
| **AI usage** | Included up to Active tier (~€500/month) |
| **Support** | 8–12h/month standard |

Usage beyond these parameters is billed separately or triggers a plan adjustment.

### What the Client Gets

- **Zero operational burden** — hosting, database, storage, AI APIs, monitoring, backups, security, and all software licenses are fully managed
- **Continuous improvement** — AI models, prompts, and features are updated throughout the contract
- **Predictable cost** — fixed annual fee, all-inclusive, no surprise bills
- **Data ownership** — client retains full ownership of all uploaded documents and generated outputs
- **Data portability** — full data export available at any time

### Optional Add-Ons

| Add-on | Description | Estimated |
|--------|-------------|-----------|
| Additional seats | Beyond 15 users | €150/seat/year |
| Heavy usage | >50 tenders/year or >30 docs/tender | Custom pricing |
| Priority support | 4h response SLA, dedicated channel, 16–20h/month | +€6,000/year |
| Custom integrations | ANAC, MePA, or third-party platform connectors | Scoped separately |

---

*This document is a living estimate. Final scope, hours, pricing, and priorities will be confirmed after the paid discovery phase.*
