# Codebase Concerns

**Analysis Date:** 2026-02-03

## Tech Debt

**Database Provider Mismatch:**
- Issue: `prisma/schema.prisma` uses SQLite provider but `.env.local` suggests mixed persistence strategy with Supabase falling back gracefully. This creates confusion—local development uses SQLite, but production/cloud scenarios depend on Supabase being configured.
- Files: `prisma/schema.prisma` (line 6), `lib/db.ts`, `lib/supabase.ts`, `lib/activity.ts`, `lib/rate-limit.ts`
- Impact: Data consistency issues if running both SQLite and Supabase simultaneously. SQLite data may not sync to Supabase. Schema validation fails if `DATABASE_URL` env var missing (P1012 error seen in `prisma_error.txt`).
- Fix approach: Clarify dual-database strategy: either commit fully to Supabase + migrate away from SQLite, or use SQLite exclusively and remove Supabase persistence. If keeping both, implement explicit data sync layer with transaction boundaries.

**Unbounded Context Growth in Agent Execution:**
- Issue: `lib/prism.ts` (lines 28-50) implements `MAX_CONTEXT_CHARS = 8000` limit, but this only truncates input to Planner. Subsequent agents (Researcher, Analyst) can accumulate unbounded context from previous steps. No circular buffer or sliding window prevents exponential token cost growth.
- Files: `lib/prism.ts` (lines 31-50, 47-49)
- Impact: Long-running scenarios will have inflated token counts and costs. Latency increases as context window fills. No ceiling on per-request costs.
- Fix approach: Implement sliding window context management across all agents. Track total accumulated tokens per scenario and reject or truncate if exceeding per-run budget (e.g., 50K tokens max).

**Weak Type Safety with `any` Types:**
- Issue: Widespread use of `any` type bypasses TypeScript safety:
  - `app/analytics/page.tsx`: `recentRuns: any[]`, `function KPICard({ label, value, icon, trend }: any)`
  - `app/api/datasets/route.ts`: `(c: any) =>`, `error: any`
  - `app/api/datasets/[id]/cases/route.ts`: `error: any`
  - Pattern repeats across 20+ API routes
- Files: All API route handlers, analytics page, component props
- Impact: Runtime type errors not caught at compile time. Refactoring is risky. IDE cannot provide accurate completions.
- Fix approach: Replace `any` with concrete interfaces. Create shared API response types in `lib/types.ts`. Use Zod for request/response validation.

**Rate Limiting Race Condition:**
- Issue: `lib/rate-limit.ts` (lines 42-82) implements non-atomic increment: reads usage count, then updates in separate call. Under concurrent requests, same user can bypass limit.
- Files: `lib/rate-limit.ts` (lines 42-82), `app/api/chat/route.ts` (lines 34, 96)
- Impact: Users can make more requests than allowed by timing overlapping requests. Limit enforcement is unreliable under load.
- Fix approach: Use Supabase RPC function for atomic increment, or implement Redis-backed rate limiter with atomic compare-and-swap. If using SQLite, add explicit transaction with SERIALIZABLE isolation.

**Unsafe Error Handling with Generic Messages:**
- Issue: Generic `catch (error: any)` blocks don't distinguish error types:
  - `app/api/datasets/route.ts`: `catch (error: any) { return ... { error: error.message } }`
  - No handling for Prisma-specific errors (unique constraint violations, connection timeouts)
  - Chat endpoint (`app/api/chat/route.ts` lines 127-132) returns generic 500 on any error
- Files: All API route handlers (66 instances found)
- Impact: Debugging is hard—all failures look the same. Network timeouts treated same as validation errors. Client can't distinguish recoverable from permanent failures.
- Fix approach: Create error-handling middleware. Map specific error types to appropriate HTTP status codes (409 for constraint violations, 503 for service unavailable, etc.).

**Unvalidated User Input in JSON Parsing:**
- Issue: `lib/evaluator.ts` (line 40, 43): `JSON.parse(judge.config || '{}')` and `JSON.parse(text)` without try-catch wrapping in second case. If stored config or LLM response contains invalid JSON, evaluation crashes.
- Files: `lib/evaluator.ts` (lines 40-50, 66-79)
- Impact: One malformed judge config breaks all evaluations using that judge. LLM response parsing failure silently returns null.
- Fix approach: Wrap JSON parsing in try-catch. Use Zod to validate parsed structure before using. Store validated JSON in database.

**Hard-coded OpenRouter Model in Evaluator:**
- Issue: `lib/evaluator.ts` (line 11): `const DEFAULT_JUDGE_MODEL = 'google/gemini-2.0-flash-001'` is hard-coded with no fallback if model becomes unavailable or quota exhausted.
- Files: `lib/evaluator.ts` (line 11)
- Impact: If Google model becomes unavailable, all LLM-based judgments fail. No graceful degradation to backup model.
- Fix approach: Move to config. Allow model selection per judge. Add retry logic with fallback models.

**Sensitive Credentials Stored in .env.local:**
- Issue: `.env.local` contains exposed API keys and Supabase credentials. This file was committed (visible in git status). Even with `.gitignore`, secrets are visible to anyone with repo access.
- Files: `.env.local` (lines 1-13)
- Impact: API keys can be revoked/rotated by attacker. Supabase data accessible to unauthorized parties. Jina and OpenRouter quotas at risk.
- Fix approach: Regenerate all exposed keys immediately. Use GitHub Secrets or environment management tool. Add pre-commit hook to prevent `.env.local` commits. Use `.env.local.example` template only.

## Known Bugs

**Line Ending Mismatch (CRLF/LF):**
- Symptoms: Git warnings about line ending conversions. Files like `app/layout.tsx`, `components/GlobalSidebar.tsx`, `.claude/settings.local.json` will have CRLF replaced by LF on next git touch.
- Files: Multiple files (see `git_error.txt`)
- Trigger: Using Windows line endings in a repo configured for Unix. Cross-platform team collaboration.
- Workaround: Run `git config core.autocrlf true` and recommit affected files. Or use `.gitattributes` to normalize.

**Invalid NUL File in Git Index:**
- Symptoms: `fatal: adding files failed` when running `git add .`. File `nul` exists at repo root.
- Files: `nul` (Windows special filename)
- Trigger: Previous command created invalid file. Windows PowerShell script error.
- Workaround: Delete `nul` file: `rm nul`. Run `git add .` again. This is blocking commits.

**Prisma Schema Validation Fails (P1012):**
- Symptoms: `prisma generate` fails with "Environment variable not found: DATABASE_URL" even though DATABASE_URL is set in `.env.local`.
- Files: `prisma/schema.prisma` (line 7)
- Trigger: Prisma CLI not loading `.env.local` (likely needs `.env` file instead or manual `--schema` flag)
- Workaround: Create `.env` file with `DATABASE_URL` value. Or use `SKIP_ENV_VALIDATION=1 prisma generate`.

## Security Considerations

**Unencrypted API Key Storage in Database:**
- Risk: `judge.config` field stores LLM configuration including potential model API keys or prompt injections. Stored as plain text in SQLite/Supabase.
- Files: `prisma/schema.prisma` (line 149 `Judge.config`), `lib/evaluator.ts` (line 40)
- Current mitigation: None. Config is readable by anyone with database access.
- Recommendations: Encrypt sensitive config fields. Use database-level encryption or application-level encryption with key rotation. Store API keys in Vault/Secrets Manager, not in config blobs.

**Prompt Injection in User Input:**
- Risk: `app/api/chat/route.ts` (lines 99-106) streams user input directly into agent. User message concatenated into prompts without sufficient delimiting (`sanitizeInput` only wraps with XML tags in `lib/prism.ts` line 67, but this is not enforced everywhere).
- Files: `app/api/chat/route.ts` (lines 10-11, 99-101), `lib/prism.ts` (lines 65-68)
- Current mitigation: Input wrapped with `<user_input>` tags in `lib/prism.ts`, but planner/researcher/analyst don't consistently use this wrapper.
- Recommendations: Add input validation to reject suspicious patterns (e.g., "ignore all previous instructions"). Implement prompt validation schema. Log flagged inputs for audit.

**Bearer Token Verification on Every Request:**
- Risk: `app/api/chat/route.ts` (lines 18-30) verifies Supabase token on each request, but token validation happens client-side without signature verification. If Supabase is misconfigured or token is replayed, auth bypass possible.
- Files: `app/api/chat/route.ts` (lines 18-30)
- Current mitigation: Token is verified against Supabase, but no additional server-side checks.
- Recommendations: Add signature verification or use short-lived JWTs. Implement rate limiting per user ID (already done) but also per API key. Log all auth failures.

**Activity Logging Failure Silent in Production:**
- Risk: `lib/activity.ts` (lines 35-37) silently swallows logging errors with `console.error` only. If Supabase is down, activity tracking fails unnoticed. No alert mechanism.
- Files: `lib/activity.ts` (lines 35-37)
- Current mitigation: None
- Recommendations: Log activity failures to stderr or health check. If activity logging is critical for compliance, fail request instead of silently dropping. Add health endpoint that verifies Supabase connectivity.

## Performance Bottlenecks

**Large Files Blocking Rendering:**
- Problem: `app/_store/useAgentStore.ts` (788 lines), `lib/prism.ts` (783 lines), `app/datasets/[id]/page.tsx` (539 lines) are all >500 lines. Large components lead to slow recompilation.
- Files: `app/_store/useAgentStore.ts`, `lib/prism.ts`, `app/datasets/[id]/page.tsx`, `app/_components/CommandCenter.tsx` (459 lines)
- Cause: Monolithic files mixing multiple concerns (state management, UI, business logic).
- Improvement path: Split useAgentStore into separate slices (scenario state, config state, UI state). Extract agent logic from prism.ts into smaller modules (planner.ts, researcher.ts, etc.). Extract page logic into smaller components.

**Unbounded Query Results:**
- Problem: `app/api/analytics/route.ts`, `app/api/datasets/route.ts` fetch all records with `.findMany()` without pagination. If dataset has 10K test cases, fetching all stalls rendering.
- Files: `app/api/analytics/route.ts`, `app/api/datasets/route.ts`, `app/api/eval/route.ts`
- Cause: No cursor-based pagination or limit clauses.
- Improvement path: Add pagination with `take` and `skip`. Use cursor-based pagination for infinite scroll. Add sorting with `orderBy`. Consider denormalization for hot queries (e.g., test counts in Dataset model).

**Synchronous Prisma Calls in Serial Chain:**
- Problem: `app/api/datasets/[id]/run/route.ts` likely fetches judges, then creates test runs, then evaluates—all serially. If 100 test cases, this is 3*100 sequential DB calls.
- Files: `app/api/datasets/[id]/run/route.ts`
- Cause: No batch operations or parallel execution.
- Improvement path: Use `prisma.$transaction` with array of promises for parallel execution. Use `createMany` instead of multiple `create` calls.

**Full-Text Search Not Indexed:**
- Problem: No mention of full-text search or indexing on searchable fields like `Scenario.name`, `TestCase.prompt`. Filtering in-memory on large datasets.
- Files: No search implementation found, but could block future search feature
- Cause: Schema doesn't define indexes or full-text search columns.
- Improvement path: Add database indexes on frequently filtered fields. Implement full-text search if needed (PostgreSQL tsvector or external search like Elasticsearch).

## Fragile Areas

**Agent Orchestration State Machine:**
- Files: `lib/prism.ts` (entire file), `app/_store/useAgentStore.ts` (lines 1-788)
- Why fragile: Complex state transitions between 5 agents (planner, researcher, analyst, synthesizer, executor) not modeled as state machine. Step transitions are implicit based on prompt matching and regex patterns (lines 159-210 in prism.ts). If one agent's output format changes, downstream agents fail silently.
- Safe modification: Add explicit state transition logging. Validate each agent output against schema before passing to next agent. Add integration tests for each handover path.
- Test coverage: No end-to-end agent tests found. CommandCenter has rendering tests but not orchestration logic tests.

**Evaluation Result Persistence:**
- Files: `lib/evaluator.ts` (lines 82-102), `prisma/schema.prisma` (lines 117-143)
- Why fragile: Evaluation results are persisted after LLM judge runs. If persistence fails (network error, constraint violation), the evaluation is lost but marked as complete in scenario. No audit trail of which judge ran which scenario.
- Safe modification: Separate evaluation computation from persistence. Use transactional writes with explicit rollback. Add idempotent keys (e.g., `(scenarioId, judgeId, metricId)` unique constraint).
- Test coverage: No tests for evaluator persistence. Only happy-path logic visible.

**Real-time Data Sync Between SQLite and Supabase:**
- Files: `lib/prism.ts` (lines 254-275), `lib/activity.ts`, `lib/rate-limit.ts`
- Why fragile: Dual persistence to SQLite and Supabase (lines 242-274 in prism.ts) with two separate Promise chains. If Supabase write fails, SQLite succeeds—data becomes inconsistent. No compensation logic.
- Safe modification: Make Supabase persistence optional (feature-flag). Or use queue (Redis/Bull) to ensure Supabase write before confirming to client. Test both success and failure scenarios.
- Test coverage: No integration tests for dual-database scenario.

**Fuzzy JSON Parsing in Judge Config:**
- Files: `lib/evaluator.ts` (lines 40, 43, 73)
- Why fragile: `JSON.parse` used without strict validation. First parse of judge.config can fail silently (caught at line 48-49), but second parse at line 73 can fail unpredictably if LLM returns malformed JSON.
- Safe modification: Use JSON schema validation library (Zod, Ajv). Validate LLM response format before parsing. Add fallback parsing (e.g., try JSON, fall back to text extraction).
- Test coverage: No tests for malformed JSON inputs.

## Scaling Limits

**Single-File Zustand Store:**
- Current capacity: ~788 lines in `app/_store/useAgentStore.ts` managing all agent state. Handles ~10-20 concurrent scenarios before re-renders become visible.
- Limit: State updates on every step cause full store re-render. If scenarios have >100 steps, UI becomes sluggish.
- Scaling path: Split store into slices (scenarios, UI state, config). Implement selector memoization. Consider Jotai or separate stores per scenario.

**SQLite Database on Local Filesystem:**
- Current capacity: SQLite works for ~50K rows before query performance degrades (depends on indexes). Concurrent writes lock the database.
- Limit: Each agent step creates database writes. 100 scenarios with 50 steps each = 5K writes. Under high concurrency (10 users simultaneously), writes queue and timeout.
- Scaling path: Migrate to PostgreSQL (Vercel Postgres) or Supabase. Add connection pooling. Batch writes with transactions.

**OpenRouter Rate Limits:**
- Current capacity: OpenRouter free tier has rate limits per model. Using `meta-llama/llama-3.3-70b-instruct:free` for all agents will hit limit at ~50-100 concurrent users.
- Limit: No circuit breaker or rate limit aware retry in `lib/prism.ts`. If hitting limit, all agent calls fail with error.
- Scaling path: Implement exponential backoff with jitter. Use model fallbacks (if llama fails, try deepseek). Add per-user quota tracking.

**Jina API Quota:**
- Current capacity: Jina free tier allows ~100 requests/month. Used for web search and scraping in agent execution.
- Limit: Each scenario using search exhausts quota quickly. No quota tracking in `lib/prism.ts`.
- Scaling path: Cache search results by query. Implement quota checking before initiating search. Use alternative search APIs (SerpAPI, Perplexity) as fallback.

## Dependencies at Risk

**@ai-sdk/openai and ai SDK Version Pinning:**
- Risk: `package.json` pins `ai` at `^6.0.53` and `@ai-sdk/openai` at `^3.0.20`. Breaking changes in minor versions not immediately tested.
- Impact: New dependency version could introduce incompatible API changes (e.g., streaming response format). No locked dependency file in git.
- Migration plan: Lock versions with exact pins (`6.0.53` instead of `^6.0.53`). Add pre-release testing before upgrading. Monitor ai-sdk changelog for breaking changes.

**Prisma Version 6.19.2 with SQLite to PostgreSQL Migration:**
- Risk: Schema uses SQLite but codebase expects PostgreSQL (schema comments mention "Vercel Postgres"). Prisma migration from SQLite to PostgreSQL requires data export/import.
- Impact: Current schema won't work on PostgreSQL without migration (SQLite-specific defaults, BigInt handling). If switching providers, old data lost.
- Migration plan: Create explicit migration script (using Prisma migrate). Test on staging. Plan data export from SQLite before provider switch.

**Supabase SDK Optional Dependency:**
- Risk: Supabase client is optional (`if (!supabase)` checks everywhere). If Supabase keys are misconfigured, all activity logging silently fails. No warning to operator.
- Impact: Audit trail missing. Rate limiting degraded. Analytics incomplete. Operator unaware of degradation.
- Migration plan: Make Supabase a required dependency with explicit startup checks. Or fully remove Supabase and use SQLite exclusively for now.

## Test Coverage Gaps

**No Agent Orchestration Tests:**
- What's not tested: Agent handover logic, state transitions between planner/researcher/analyst, retry logic with exponential backoff.
- Files: `lib/prism.ts` (entire agent orchestration), `app/api/chat/route.ts` (streaming and error handling)
- Risk: Refactoring agent state machine could break agent flow without detection. Handover logic regression unnoticed.
- Priority: High - this is the core value proposition.

**No Database Persistence Tests:**
- What's not tested: Dual-database persistence (SQLite + Supabase), transaction boundaries, constraint violation handling.
- Files: `lib/prism.ts` (lines 240-275 persist functions), `lib/evaluator.ts` (lines 82-102 evaluation persistence)
- Risk: Silent data loss if Supabase write fails while SQLite succeeds. Schema constraint violations unhandled.
- Priority: High - data integrity critical.

**No API Error Handling Tests:**
- What's not tested: Rate limit exceeded behavior, invalid JSON parsing, missing auth headers, Prisma errors.
- Files: All API routes in `app/api/*/route.ts`
- Risk: Production errors not caught. Error responses untested. Client error handling might break.
- Priority: Medium - affects user experience but not core logic.

**No Rate Limiter Concurrency Tests:**
- What's not tested: Race condition in `checkRateLimit` and `incrementUsage` under concurrent requests.
- Files: `lib/rate-limit.ts` (lines 42-82)
- Risk: Rate limiting bypassed under load. Service degradation.
- Priority: High - security and performance impact.

**No Evaluation Pipeline Tests:**
- What's not tested: Judge config parsing, LLM judge response format, evaluation persistence, metrics calculation.
- Files: `lib/evaluator.ts` (entire file), evaluation-related API routes
- Risk: Evaluation results unreliable or incorrectly stored. No way to validate judge correctness.
- Priority: Medium - evals are feature but not user-facing initially.

---

*Concerns audit: 2026-02-03*
