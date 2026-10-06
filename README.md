# GrowthPilot

**An AI-powered Marketing Strategy & Diagnostic Workbench that thinks like a senior strategist.**

GrowthPilot doesn't answer "retention is down" with "launch a loyalty programme". It runs a structured consulting engagement:

```
Problem → Context → Diagnosis → Evidence → Hypothesis → Human validation
        → Recommendation → Activation → Measurement → Economics → Report
```

The product name is configuration (`NEXT_PUBLIC_PRODUCT_NAME`), so the platform can be renamed or white-labelled without code changes.

## What's in this build

| Area | Status |
|---|---|
| Auth (Firebase email/password + Google), organizations, roles (owner/admin/strategist/analyst/viewer) | ✅ |
| Case creation with optional context, problem classification, industry detection | ✅ |
| **Information Value Engine**: 62 classified questions (incl. a grouped MarTech vendor picker: Adobe, Salesforce, Braze, MoEngage, Segment…), priority = impact × diagnostic value × uncertainty × decision relevance, industry/problem relevance rules, "why am I asking this?", sufficiency statements, never re-asks | ✅ |
| Structured question UI (chips, multi-select, numbers, text) + AI adaptive follow-ups | ✅ |
| Case context with **fact / inference / assumption** provenance on every value | ✅ |
| B-D-C-D-T-A-M-E progress, diagnostic readiness gate (overridable, logged) | ✅ |
| Framework selection engine (40 frameworks across strategy, brand, pricing, B2B, paid, SEO, measurement, app, MarTech), industry library (18 industries) | ✅ |
| Specialised agents: extraction, interview, diagnostic, hypothesis, refine, recommendation, activation, measurement, report | ✅ |
| **Hypothesis approval gate**: agree / partially agree (AI refines + clarifying questions) / disagree (reason required, excluded) / edit / add information | ✅ |
| Recommendations with deterministic prioritisation (Impact × Confidence × Fit ÷ Effort → P0–P3), user can challenge scores, 2×2 matrix | ✅ |
| Customer journey map, activation journeys, KPI tree, North Star, experiments | ✅ |
| Deterministic economics engine: scenarios, revenue vs profit, ROI, payback, provenance labelling | ✅ |
| MarTech maturity assessment (6 dimensions, levels 1–6, capability gaps) | ✅ |
| Data-gap engine, assumption register, decision log, versioning + version compare | ✅ |
| Reports: web, **PDF, Word, PowerPoint**, Markdown — one report model, branded | ✅ |
| AI gateway: OpenAI, Anthropic, Gemini, OpenRouter, any OpenAI-compatible; tiered model routing; retry → fallback provider → resumable failure | ✅ |
| API keys: AES-256-GCM at rest with key rotation, masked, server-only, test connection | ✅ |
| PII masking before any LLM call, restored on the way back | ✅ |
| Usage & cost metering, plan limits, rate limiting, audit log, structured logs | ✅ |
| Privacy: export case JSON, delete case, delete account (cascades org data) | ✅ |
| Firestore + Storage security rules (tenant isolation; credentials server-only) | ✅ |
| **Pilot the owl** (mascot): guides AI-provider setup, shows live backend activity, reacts to success/failure | ✅ |
| **Case assistant**: chat that answers only from the completed case, with citations and out-of-scope refusal | ✅ |
| Knowledge base resource links (shared with the AI agents as titles + notes), collapsible sidebar, name-first account menu | ✅ |
| Brand: logo upload, heading/body fonts, tagline, colour presets, live cover preview — applied to all exports | ✅ |
| File upload & data analysis, logo/template uploads, RAG, SSO, collaboration invites | Roadmap (see below) |

## Quick start (local demo — no Firebase needed)

```bash
npm install
GROWTHPILOT_DEMO_MODE=true NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

Open http://localhost:3000, create a workspace, then add an AI provider under **AI Providers** (any OpenAI, Anthropic or Gemini key, or an OpenAI-compatible endpoint). Demo mode uses a single local user and stores data in `.data/demo-db.json`. **Never enable demo mode in production.**

## Production setup (Firebase)

1. Create a Firebase project; enable **Authentication** (Email/Password, Google), **Firestore**, **Storage**.
2. Copy `.env.example` → `.env.local` and fill in the web config and a service account (or rely on Application Default Credentials on Cloud Run).
3. Generate the credential encryption key: `openssl rand -base64 32` → `CREDENTIALS_ENCRYPTION_KEYS=v1:<key>`. To rotate, append `v2:<new>`; old secrets still decrypt.
4. Deploy rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes,storage`.
5. Deploy the Next.js app to Vercel (or Cloud Run). Long AI routes declare `maxDuration`.
   On Vercel, add every variable from `.env.example` under Project → Settings → Environment Variables, then **redeploy** (`NEXT_PUBLIC_*` values are inlined at build time). `GET /api/health` reports any missing server variables; the UI shows a "Setup required" screen if the Firebase web config is missing.

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit + end-to-end lifecycle tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

The lifecycle test drives a full case through the real services with an in-memory store and a fake LLM: interview → readiness gate → diagnosis → approval gate → recommendations → plan → economics → report → PDF/DOCX/PPTX/MD export, plus tenant isolation and AI-failure recovery.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
src/
  domain/       Zod schemas: Case, context, hypotheses, recommendations, economics…
  knowledge/    Question bank, industry library, diagnostic framework library
  engine/       Deterministic engines: interview (information value), context,
                classification, framework selection, prioritisation, economics,
                maturity, progress, PII masking
  ai/           Provider adapters, gateway (routing/retry/fallback/metering),
                structured-output parsing, specialised agents & prompts
  server/       Auth, RBAC, HTTP wrapper, encryption, rate limiting, storage
                abstraction (Firestore / in-memory), services
  reports/      Report model + Markdown / DOCX / PPTX / PDF renderers
  app/          Next.js App Router pages and /api route handlers
  components/   UI primitives, charts, case workspace
```

## Roadmap

- **Phase 2**: file upload (Excel/CSV/PDF/PPT) with extraction into case context and descriptive/cohort/RFM analysis; logo, brand-guideline PDF and PPT template uploads (Firebase Storage + signed URLs); malware scanning.
- **Phase 3**: RAG knowledge layer (vector search over frameworks, case studies, internal methodologies); collaboration (invites, comments); queued background jobs for long AI runs.
- **Phase 4**: enterprise SSO, private knowledge bases, benchmarking, agentic workflows, platform admin console.

## Credits

The mascot is adapted from [page-mascot](https://github.com/nilbuild/page-mascot) by Kamran Ahmed (MIT License). See `src/components/mascot/Mascot.tsx`.
