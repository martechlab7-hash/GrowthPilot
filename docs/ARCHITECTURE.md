# Architecture

## Principles

1. **Consulting engine, not a chatbot.** The case moves through explicit states (`draft → discovery → validation → strategy → completed`) with gates enforced server-side.
2. **Deterministic where possible, AI where valuable.** Question selection, readiness, prioritisation, economics, maturity and progress are pure TypeScript — reproducible and testable. LLMs do diagnosis, hypotheses, recommendations, journeys, KPIs and narrative.
3. **Every statement has provenance.** Context fields and evidence carry `fact | inference | assumption`. A user fact is never overwritten by an AI value. Economics inputs are facts only when they match user-provided context.
4. **Structured outputs only.** Every agent returns JSON validated with Zod; the JSON Schema is embedded in the prompt; one automatic repair turn on validation failure.
5. **Never lose work.** All answers are persisted before any AI call. AI failures leave a resumable `pendingOperation` on the case.

## Request flow

```
Browser ──(Firebase ID token)──▶ Route handler (api() wrapper)
                                   ├─ verify token, load profile → orgId
                                   ├─ rate limit, RBAC permission
                                   ├─ Zod-validate body
                                   └─ service (cases / providers / org / usage)
                                         ├─ DataStore (Firestore | Memory) — every query scoped by organizationId
                                         └─ AIGateway
                                               ├─ PII mask → prompt → provider → parse/validate → PII restore
                                               ├─ retry (retryable errors, exponential backoff)
                                               ├─ fallback to next provider (priority order)
                                               └─ meter usage (tokens, latency, cost) + daily quota
```

## Information Value Engine

`engine/interview.ts`

```
priority = businessImpact × diagnosticValue × uncertainty × decisionRelevance
           × 1.5 if the question is especially diagnostic for the classified problem
           × 1.25 if critical
uncertainty = 1 unknown | 0.5 only inferred/assumed | 0 known fact or declared unknown
```

Questions below `MIN_PRIORITY` are never asked. A stage with known information and no remaining high-value questions produces "I have enough information on …". Discovery is **ready** when all critical questions are answered (or declared unknown) and ≥50% of relevant information value is captured. Proceeding earlier is allowed but logged in the decision log.

The Interview Agent can add adaptive questions (scored the same way). Partial disagreement with a hypothesis adds targeted clarifying questions to the interview.

## Agents

| Agent | Tier | Input | Output |
|---|---|---|---|
| Extraction | fast | problem statement / long answers | facts restricted to bank keys + valid options |
| Interview | fast | case context, covered questions | ≤3 adaptive questions + consultant note |
| Diagnostic | reasoning | context, selected frameworks, computed maturity | findings, confidence buckets, data gaps, assumptions |
| Hypothesis | reasoning | context, diagnosis, rejected hypotheses | 3–5 ranked, testable hypotheses |
| Refine | reasoning | hypothesis + user feedback | revised hypothesis + clarifying questions |
| Recommendation | reasoning | approved hypotheses only | recommendations with scores (priority computed in code) |
| Activation | reasoning | recommendations | journey map + executable activation flows |
| Measurement | reasoning | recommendations | North Star, KPI tree, experiments |
| Report | large | everything validated + deterministic economics | executive narrative, roadmap, risks |

Model tiers map to per-provider model names (`fast` / `reasoning` / `large`) configured in Settings → AI Providers.

## Data model (Firestore)

| Collection | Notes |
|---|---|
| `organizations` | plan |
| `users` | `organizationId`, role |
| `cases` | case document incl. context, transcript, diagnosis, hypotheses, recommendations, plan, economics, report; `revision` for concurrency, `analysisVersion` for snapshots |
| `case_versions` | immutable snapshots at major analysis steps |
| `decision_logs` | hypothesis reviews, gate overrides, strategy generation |
| `ai_providers` | encrypted key (`{v, iv, tag, data}`), mask, models, priority — server-only |
| `ai_usage`, `usage_counters` | metering and daily quotas — server-only |
| `audit_logs` | security-relevant actions — server-only |
| `brand_profiles` | per organization |

Case state is kept in one document so each mutation is a single atomic transaction (`transact`). The 1 MiB document limit is ample for a case; the transcript is capped at 400 entries. If cases outgrow this, move `transcript` and `context` to subcollections behind the same `DataStore` interface.

All client writes are denied by `firestore.rules`; reads are allowed only within the caller's organization, and never for credentials, usage or audit data.

## Security

- **API keys**: AES-256-GCM with versioned keys (`CREDENTIALS_ENCRYPTION_KEYS`), masked in responses, decrypted only in the gateway. Refuses to store credentials without a key outside demo mode.
- **Tenant isolation**: every service call loads the case and compares `organizationId`; cross-tenant access returns 404.
- **RBAC**: `server/permissions.ts` — viewer (read), analyst (+contribute answers/data), strategist (+manage cases & AI analysis), admin (+org settings), owner (+delete org).
- **PII**: emails, phone numbers, card numbers (Luhn-checked), IBAN, PAN, Aadhaar and IPs are tokenised before prompts leave the server and restored in responses.
- **Rate limiting**: per-user token bucket (per instance). For multi-instance production, back `rateLimit()` with Redis/Upstash or Firestore counters.
- **Headers**: `X-Frame-Options`, `nosniff`, referrer and permissions policies.
- **Exports**: generated on demand behind authentication; no public URLs.

## Observability

Structured JSON logs (`server/logger.ts`) for every request (route, status, latency, uid), rejected requests, AI attempt failures and unhandled errors. AI usage records capture provider, model, tokens, cost (when per-provider prices are configured), latency and success — surfaced in Settings → AI usage.

## Reports

`reports/model.ts` builds a single format-agnostic `ReportModel` (sections of paragraphs, bullets, tables, callouts) following the consulting storyline. Renderers: web (React), Markdown, DOCX (`docx`), PPTX (`pptxgenjs`, storyline slide order, paginated tables), PDF (`pdfkit`, cover, headers, footers, page numbers). Brand colours and font are applied to all formats.
