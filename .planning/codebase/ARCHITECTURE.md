# Architecture

**Analysis Date:** 2026-02-03

## Pattern Overview

**Overall:** Agent Lab Pro is a **multi-agent orchestration platform** built on Next.js with a client-server streaming architecture. The system implements a task-routing pipeline where execution control passes between specialized agents (planner → researcher → analyst → synthesizer) based on deterministic rules, with optional parallel execution and turbo mode shortcuts.

**Key Characteristics:**
- **Streaming-first data flow**: Backend emits typed events over HTTP streams, frontend processes in real-time
- **Zustand-based client state**: Single centralized store (`useAgentStore`) manages all UI, playback, and session state
- **Multi-agent handover pattern**: Execution passes between agents with metadata tracking for cost, latency, and token usage
- **DAG support**: Steps can have multiple parents enabling parallel and parallel group tracking
- **Database-backed scenarios**: Prisma ORM stores scenarios, test cases, datasets, and evaluation results for persistence and analytics

## Layers

**Presentation Layer:**
- Purpose: Interactive visualization of agent execution flows with real-time playback and telemetry
- Location: `app/page.tsx`, `app/_components/`, `components/`
- Contains: React components (AgentGraphCanvas, CommandCenter, SessionDetailModal, ExecutionNode, PrismHUD)
- Depends on: Zustand store, UI libraries (Radix, lucide-react, react-markdown), streaming events from `/api/chat`
- Used by: End users via browser; consumes typed events from backend

**State Management Layer:**
- Purpose: Single source of truth for agent configurations, execution state, playback timeline, and session history
- Location: `app/_store/useAgentStore.ts`, `app/_context/AuthContext.tsx`
- Contains: Zustand store with agent configs, scenario state, playback controls, settings, and session persistence to localStorage
- Depends on: Supabase client for auth token retrieval, localStorage API
- Used by: All React components via hooks (`useAgentStore`, `useAuth`)

**API/Server Layer:**
- Purpose: Handle streaming execution orchestration, rate limiting, activity logging, and data persistence
- Location: `app/api/`
- Contains: Route handlers for chat/stream, eval, datasets, scenarios, test runs, analytics, activity logging
- Depends on: Prisma ORM, external LLM providers (OpenRouter), Jina API, Supabase auth
- Used by: Frontend via fetch; Prisma for database operations

**Agent Orchestration Layer:**
- Purpose: Core multi-agent pipeline logic and event emission
- Location: `lib/prism.ts`
- Contains: `createAgent()` factory, streaming event generation, agent context management, tool execution (web scraping, code interpretation)
- Depends on: AI SDK (OpenRouter via OpenAI SDK), external APIs (Jina for search/scrape), Prisma for state persistence
- Used by: POST `/api/chat` route to process user prompts

**Data Persistence Layer:**
- Purpose: Structured storage of scenarios, test cases, evaluations, and metrics
- Location: `lib/db.ts`, `prisma/schema.prisma`
- Contains: Prisma client singleton, database models (Scenario, AgentStep, TestCase, TestRun, Dataset, Judge, EvaluationResult)
- Depends on: SQLite (dev) / PostgreSQL (prod via Vercel), Prisma migrations
- Used by: API routes for CRUD operations, evaluator for storing results

**Infrastructure Services:**
- Purpose: Cross-cutting concerns (auth, rate limiting, activity logging, evaluation)
- Location: `lib/supabase-client.ts`, `lib/rate-limit.ts`, `lib/activity.ts`, `lib/evaluator.ts`
- Contains: Supabase client setup, rate limit counters (Redis-like per user/IP), activity event logging, LLM-based evaluation
- Depends on: Supabase (auth), external LLM (evaluation), Prisma (activity logging)
- Used by: All API routes for middleware functionality

## Data Flow

**User Query Execution Flow:**

1. **User submits prompt** via CommandBar on `app/page.tsx`
   - Calls `useAgentStore.runScenario(prompt)`
   - Creates initial input step and sets loading state

2. **Frontend streams to backend** via POST `/api/chat`
   - Sends: user message, agentConfigs, executionMode ('linear'|'turbo'), modelTiering flag
   - Sends auth token if user is signed in (for rate limit personalization)
   - Omits token for anonymous users

3. **Backend rate limiting & activity logging**
   - `checkRateLimit(userId, ipAddress)` in `/api/chat`
   - If limited: return 429 with remaining quota
   - Otherwise: log activity event (query_start) to `activity` table

4. **Agent orchestration begins** via `createAgent()` → `agent.stream()`
   - Executor routes based on planner output (NEEDS_ANALYSIS flag)
   - Each agent receives agentConfig (systemPrompt, tools, max tokens, model)
   - Linear mode: planner → researcher → analyst → synthesizer
   - Turbo mode: planner (fast) → researcher → synthesizer (skip analyst)

5. **Stream events emitted** from backend as newline-delimited JSON
   - Event types: step_start, tool_call, tool_result, step_finish, finish, approval_requested
   - Each event includes: stepId, agent, type, input/output, usage (tokens), latencyMs

6. **Frontend processes stream** in `runScenario()` ReadableStream handler
   - Maps events to `AgentStep` via `mapEventToStep()`
   - Updates Zustand state: adds/merges steps into `currentScenario.steps`
   - Detects agent handovers (agent change) and creates `HandoverEvent` records
   - Supports DAG: sets `parentIds` based on previous step

7. **Database persistence** (if enabled)
   - Backend can save scenario to `Scenario` table
   - Each step saved to `AgentStep` table with tokens, cost, latency
   - Handovers and evaluation results linked via IDs

8. **Playback & Timeline**
   - Frontend maintains `currentStepIndex` for step-by-step playback
   - `TimelineBar` component visualizes full execution path
   - Users can seek, pause, resume at any step

**State Management:**

- All UI state centralized in `useAgentStore`:
  - Scenario: `currentScenario` (AgentScenario with steps array)
  - Playback: `isPlaying`, `currentStepIndex`, `playbackSpeed`
  - Session: `savedSessions` (persisted to localStorage)
  - Settings: `executionMode`, `modelTiering`, `autoSave` (persisted to localStorage)
  - Selection: `selectedAgent`, `selectedStepId`, `viewedSession`
  - Errors: `error`, `isLoading`, `isStreaming`

- Auth state managed via React Context (`AuthContext.tsx`):
  - User/session from Supabase
  - Sign-in via Google OAuth redirect to `app/auth/callback`

## Key Abstractions

**AgentConfig:**
- Purpose: Encapsulates specialized AI agent configuration
- Examples: `agentConfigs.planner`, `agentConfigs.researcher`, `agentConfigs.analyst`, `agentConfigs.synthesizer`, `agentConfigs.executor`
- Pattern: Record<AgentType, AgentConfig> where AgentType = 'planner' | 'researcher' | 'analyst' | 'synthesizer' | 'executor'
- Contains: systemPrompt, role, guardrails, maxInputTokens, maxOutputTokens, selectedModel, color, tools

**AgentStep:**
- Purpose: Represents a single execution unit within an agent
- Examples: thought (reasoning), action (tool call), output (result), approval_requested
- Pattern: Base fields (id, timestamp, type, label, content) + agent-specific metadata (agent, handoverFrom, evaluationResults)
- Supports DAG via `parentIds: string[]` for tracking dependencies
- Supports parallel execution via `parallelGroup` and `isParallel` flags

**HandoverEvent:**
- Purpose: Tracks control transfer between agents with metrics
- Examples: planner → researcher (after plan generated), researcher → analyst (data gathered)
- Pattern: Captures fromAgent, toAgent, fromStepId, toStepId, reason, tokens, latency, cost
- Used by frontend to draw connections and visualize agent communication

**PrismEvent:**
- Purpose: Streaming event emitted by backend agent
- Examples: { type: 'step_start', stepId, input, agent } → { type: 'tool_call', tool, args, stepId }
- Pattern: Union type over 6 variants, each with required and optional fields
- Maps to AgentStep via `mapEventToStep()` function

**Session & Scenario:**
- Purpose: Container for a complete multi-agent execution with all steps
- Pattern: Scenario = { id, name, steps: AgentStep[] }
- SavedSession = { id, name, timestamp, scenario } — persisted to localStorage (max 20 sessions)

**Dataset & TestCase:**
- Purpose: Training/evaluation data for batch runs
- Pattern: Dataset has many TestCases; TestRun executes all cases via agent pipeline
- Models stored in `prisma/schema.prisma`: Dataset, TestCase, TestRun, Scenario

## Entry Points

**Web Application Root:**
- Location: `app/layout.tsx`
- Triggers: HTTP request to /
- Responsibilities: Wraps app with AuthProvider, GlobalSidebar, fonts (Space Grotesk, Space Mono), analytics, Google Tag Manager

**Main Interactive Page:**
- Location: `app/page.tsx`
- Triggers: GET /
- Responsibilities: Renders agent graph canvas, command bar (floating), timeline, command center (right panel), session modal, settings modal; manages console/telemetry panel width with resize

**Chat/Streaming Endpoint:**
- Location: `app/api/chat/route.ts`
- Triggers: POST /api/chat (from useAgentStore.runScenario)
- Responsibilities: Rate limiting, auth verification, agent orchestration via createAgent, stream event emission, activity logging

**Evaluation Endpoint:**
- Location: `app/api/eval/route.ts`
- Triggers: POST /api/eval (from useAgentStore.evaluateStep)
- Responsibilities: Fetch scenario, run LLM judge, store results, return evaluation scores

**Dataset Management Routes:**
- Location: `app/api/datasets/route.ts`, `app/api/datasets/[id]/route.ts`, etc.
- Triggers: CRUD operations from `/datasets` page
- Responsibilities: Create, read, update, delete datasets and test cases; trigger batch runs

**History Page:**
- Location: `app/history/page.tsx`
- Triggers: GET /history
- Responsibilities: List saved sessions from localStorage, load/delete sessions, export as JSON

**Analytics Page:**
- Location: `app/analytics/page.tsx`
- Triggers: GET /analytics
- Responsibilities: Visualize metrics across sessions (tokens, latency, cost), filtering by date range

## Error Handling

**Strategy:** Multi-layered approach with exponential backoff retry, user-facing messages, and server-side logging.

**Patterns:**

1. **Streaming Errors (Frontend):**
   - Reader.read() errors are caught in `runScenario()`
   - Empty response.body check before streaming
   - Buffer parsing errors caught per-line to prevent total stream failure
   - User sees error message in error toast + console log

2. **Rate Limit Errors:**
   - Route: `app/api/chat/route.ts` (line 34-57)
   - Returns 429 with readable message for authenticated vs anonymous users
   - Logs rate_limited activity event
   - Frontend displays: "You have reached your daily limit of X queries"

3. **Backend Retry Logic:**
   - File: `lib/prism.ts` (withRetry function, lines 74-96)
   - Used for LLM calls, tool invocations
   - Exponential backoff: baseDelayMs * 2^(attempt-1)
   - Default: 3 attempts, 1000ms base delay
   - Throws last error after all retries exhaust

4. **Evaluation Errors:**
   - Route: `app/api/eval/route.ts`
   - Missing scenarioId validation (400 response)
   - Evaluation failure check: returns error if no valid scenario
   - Try-catch wraps entire handler, returns 500 with error.message

5. **Database Errors:**
   - Prisma singleton pattern in `lib/db.ts` prevents connection pooling issues
   - Errors from Prisma operations bubble to route handlers
   - API routes catch and return 500 with error message

## Cross-Cutting Concerns

**Logging:**
- Approach: Console.error for client errors; server-side activity logging to Prisma `activity` table
- Activity events: query (start), rate_limited, completion; includes userId, ipAddress, eventType, status, details, timestamp
- File: `lib/activity.ts` (logActivity function)

**Validation:**
- Input sanitization: `sanitizeInput()` wraps user input with `<user_input>` delimiters to prevent prompt injection (`lib/prism.ts` line 65)
- Schema validation: Prisma enforces field types and constraints
- Request validation: Route handlers check for required fields (e.g., scenarioId, userId)

**Authentication:**
- Supabase Google OAuth: redirect to `app/auth/callback` after provider login
- Token verification: Bearer token in Authorization header verified server-side in `/api/chat`
- Context hook: `useAuth()` provides user/session/loading state to components

---

*Architecture analysis: 2026-02-03*
