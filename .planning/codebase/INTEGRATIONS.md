# External Integrations

**Analysis Date:** 2026-02-03

## APIs & External Services

**OpenRouter (LLM Provider):**
- Service: OpenRouter API for accessing multiple LLM models
- SDK/Client: `@ai-sdk/openai` configured with OpenRouter base URL
- Auth: Environment variable `OPENROUTER_API_KEY`
- Endpoint: `https://openrouter.ai/api/v1`
- Usage: Created in `lib/prism.ts` as `openrouter` client
- Models used:
  - `nvidia/nemotron-nano-9b-v2:free` - Fast model (default for tiering)
  - `google/gemini-2.0-flash-001` - Evaluation/judging model
  - `meta-llama/llama-3.3-70b-instruct:free` - Default in chat API

**Jina AI (Web Search & Scraping):**
- Service: Web search and URL content extraction
- Auth: Environment variable `JINA_API_KEY`
- Endpoints:
  - `https://s.jina.ai/` - Search API
  - `https://r.jina.ai/{url}` - Reader/scraper API
- Implementation: `lib/prism.ts` functions `jinaSearch()` and `jinaScrape()`
- Fallback: Returns error details when API key missing
- Rate limiting: Max 5 results per search query

**Duck Duck Scrape:**
- Package: `duck-duck-scrape` ^2.2.7
- Purpose: Additional web scraping capability
- Status: Included but not actively used in current codebase

## Data Storage

**Databases:**

*SQLite (Development):*
- Type: Local file-based SQLite database
- Connection: `DATABASE_URL="file:./dev.db"`
- Client: Prisma ORM (`@prisma/client`)
- Location: Root-level `dev.db` file (git-ignored)
- Tables: Scenarios, Agents Steps, Traces, Evaluations, Datasets, Test Runs, Judges
- Usage: All local development, temporary data, schema testing

*PostgreSQL (Production):*
- Type: Cloud or self-hosted PostgreSQL
- Provider: Supabase (optional) or any Postgres-compatible database
- Connection: Environment variable `DATABASE_URL` (configured per-environment)
- Client: Prisma ORM
- Schema: See `prisma/schema.prisma` for full data model

**Supabase (Analytics & Logging):**
- Type: PostgreSQL + managed services
- SDK: `@supabase/supabase-js` ^2.93.3
- Configuration:
  - URL: `NEXT_PUBLIC_SUPABASE_URL`
  - Public key (client): `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service key (server): `SUPABASE_SERVICE_ROLE_KEY`
- Tables queried:
  - `user_activity` - Activity logging (login, auth, queries, rate limits)
  - `agent_queries` - Detailed agent execution traces with metrics
- Created in: `lib/supabase.ts` (server-side) and `lib/supabase-client.ts` (client-side)
- Optional: Supabase is checked before use; system functions without it if unconfigured

## Authentication & Identity

**Auth Provider:**
- Type: Custom + Supabase Auth (optional)
- Implementation: `app/_context/AuthContext.tsx` manages auth state
- Callback route: `app/auth/callback/page.tsx` for OAuth redirects
- Token verification: Bearer token support in `/api/chat` route
- User identification:
  - Anonymous: Tracked by IP address
  - Authenticated: User ID extracted from Bearer token via Supabase

## Rate Limiting

**Implementation:**
- Location: `lib/rate-limit.ts`
- Strategy: Per-user or per-IP rate limiting
- Limits:
  - Authenticated users: 15 queries/day
  - Anonymous users: 3 queries/day
- Storage: In-memory or persistence (depends on implementation)
- Triggers logging when exceeded

## Monitoring & Observability

**Error Tracking:**
- Type: Console logging only
- Patterns: `console.error()` throughout codebase for debugging
- No external error tracking service integrated (Sentry, etc.)

**Activity Logging:**
- Type: Custom application logging
- Implementation: `lib/activity.ts` exports `logActivity()` function
- Event types: `login | auth_attempt | logout | query | rate_limited`
- Destination: Supabase `user_activity` table (if configured)
- Metadata captured:
  - User ID (if authenticated)
  - IP address
  - User-Agent
  - Event-specific details
  - Timestamp (auto)

**Analytics:**
- Endpoint: `/api/analytics` for analytics data retrieval
- Page: `app/analytics/page.tsx` displays analytics dashboard
- Data source: Supabase queries and database aggregation

**Detailed Execution Traces:**
- Logging destination: Dual persistence in `lib/prism.ts`
  1. SQLite via Prisma (primary)
  2. Supabase (secondary, optional)
- Fields: Step ID, agent type, input/output tokens, latency, cost, model name, execution mode
- Captured in: `persist()` and `persistToSupabase()` functions

## API Routes (Internal)

**Chat API:**
- Route: `/api/chat`
- Method: POST
- Purpose: Main agent orchestration endpoint
- Rate limiting: Checked before execution
- Activity logging: Query attempt logged
- Returns: Streaming JSON events via `ReadableStream`

**Datasets & Test Management:**
- Routes:
  - `/api/datasets` - CRUD operations on test datasets
  - `/api/datasets/[id]/cases` - Test cases within dataset
  - `/api/datasets/[id]/import` - Bulk import from CSV/JSON
  - `/api/datasets/[id]/run` - Execute test run
- Purpose: Test case management and batch execution
- Database: Prisma queries to Scenario, TestCase, TestRun models

**Scenarios:**
- Routes:
  - `/api/scenarios` - List and create scenarios
  - `/api/scenarios/[id]` - Get single scenario with trace history
- Purpose: Persist agent execution traces
- Persistence: Both SQLite and Supabase

**Evaluations:**
- Routes:
  - `/api/eval` - Execute evaluation against test case
  - `/api/judges` - Manage judge configurations
  - `/api/judges/[id]` - CRUD judges
- Implementation: `lib/evaluator.ts` handles LLM and heuristic evaluation
- Judge types: `LLM | HUMAN | HEURISTIC`
- Models used: Default is `google/gemini-2.0-flash-001` for judging

**Activity & Usage:**
- Routes:
  - `/api/activity` - Log custom activity events
  - `/api/usage` - Track API usage and quotas
- Purpose: Activity logging and usage tracking
- Destination: Supabase analytics tables

## Environment Configuration

**Required env vars:**
- `OPENROUTER_API_KEY` - LLM API access (essential)
- `JINA_API_KEY` - Web search/scraping (essential)
- `DATABASE_URL` - Prisma database URL (essential)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL (optional)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key (optional)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key (optional, server-only)

**Secrets location:**
- Development: `.env.local` (git-ignored)
- Production: Vercel environment variables dashboard
- Template: `.env.example` shows all required variables with setup links

## Webhooks & Callbacks

**Incoming:**
- Route: `app/auth/callback/page.tsx` - OAuth callback handler for Supabase Auth
- Purpose: Handle OAuth provider redirects (Google, GitHub, etc.)
- No other webhook endpoints detected

**Outgoing:**
- None detected - System does not make outbound webhooks to external services
- Note: Jina API calls are one-directional (request/response)

## Data Synchronization

**Dual Persistence Pattern:**
- SQLite: Immediate local persistence via Prisma for quick access
- Supabase: Asynchronous cloud persistence for analytics and backup
- Implementation: `persist()` in `lib/prism.ts` calls both in parallel
- Failure handling: Errors in Supabase don't block SQLite; logged to console

## Session Management

**State Store:**
- Framework: Zustand (`useAgentStore`)
- Location: `app/_store/useAgentStore.ts`
- Purpose: Client-side execution state, scenario history, settings
- Persistence: In-memory (cleared on page reload)

**Database Sessions:**
- Type: Implicit session tracking via user ID or IP
- No explicit session table; user identification from headers or auth tokens

---

*Integration audit: 2026-02-03*
