# Agent Lab Pro — Standalone

An interactive multi-agent AI orchestration platform built with Next.js 16, featuring a cyber-brutalism UI, real-time streaming telemetry, and a deterministic high-speed orchestration engine. Designed as an educational tool to visualize how AI agents collaborate — plan, research, analyze, and synthesize — in real time.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [The Five Agents](#the-five-agents)
- [Orchestration Engine](#orchestration-engine)
- [Web Search and Scraping (Jina AI)](#web-search-and-scraping-jina-ai)
- [Streaming Protocol](#streaming-protocol)
- [Execution Modes](#execution-modes)
- [Model Tiering](#model-tiering)
- [Database Design](#database-design)
- [Tech Stack and Decisions](#tech-stack-and-decisions)
- [Project Structure](#project-structure)
- [UI Components](#ui-components)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Architecture Overview

```
User Prompt
    |
    v
[/api/chat POST] ── Next.js API Route (Node.js runtime, 60s max)
    |
    v
[createAgent()] ── Agent factory in lib/prism.ts
    |
    v
[Deterministic Router] ── classifyIntent() — 0ms, no LLM call
    |
    |── URL detected? ──> jina_scraper (r.jina.ai)
    |── No URL? ────────> jina_search  (s.jina.ai)
    |
    v
[Researcher LLM] ── Summarizes raw search/scrape data (1 LLM call)
    |
    |── Analysis keywords detected? ──> [Analyst LLM] (1 LLM call)
    |
    v
[Synthesizer LLM] ── Produces final polished answer (1 LLM call)
    |
    v
NDJSON stream ── Events sent to frontend via chunked transfer
    |
    v
[Zustand Store] ── mapEventToStep() maps events to AgentStep objects
    |
    v
[UI Components] ── Graph canvas, waterfall, telemetry, command center
```

The entire pipeline produces **2 LLM calls** for simple queries (researcher + synthesizer) or **3 LLM calls** for analysis queries (researcher + analyst + synthesizer). This is a deliberate design choice — see [Orchestration Engine](#orchestration-engine) for the reasoning.

---

## The Five Agents

Each agent has a distinct role, a dedicated color in the UI, and configurable system prompts and models.

| Agent | Role | Color | LLM Call? | Description |
|-------|------|-------|-----------|-------------|
| **Planner** | Fast Routing | Violet | No (deterministic) | Classifies user intent via regex pattern matching. Decides the pipeline: which agents run in which order. Emits events so the UI can visualize the routing decision, but never makes an LLM call. |
| **Executor** | Orchestration | Zinc | No (deterministic) | State machine that transitions between agents. Emits routing events for UI visualization (e.g., "RESEARCHER", "ANALYST", "SYNTHESIZER") but all decisions are hardcoded transitions. |
| **Researcher** | Data Gathering | Cyan | Yes (1 call) | Receives raw data from Jina AI (search results or scraped markdown) and uses a single LLM call to extract and summarize the most relevant facts. Cites sources inline. |
| **Analyst** | Data Analysis | Amber | Yes (1 call, conditional) | Only activated when the user prompt contains analysis keywords (compare, benchmark, chart, trend, etc.). Structures research into tables, pros/cons, or ranked lists. Can generate matplotlib code for charts. |
| **Synthesizer** | Final Synthesis | Emerald | Yes (1 call) | Produces the final user-facing answer. Strips all meta-talk about internal agents or pipelines. Ends with a bold takeaway line. |

### Why five agents instead of one?

A single LLM call with "search the web, analyze, and answer" would be simpler but loses **observability**. The multi-agent design lets users:

1. **See each step in the graph canvas** — understand what data was gathered, how it was analyzed, and how the final answer was composed.
2. **Inspect prompts and token usage per agent** — the telemetry drawer shows exactly what prompt each agent consumed and how many tokens it used.
3. **Swap models per agent** — use a fast model for research and a stronger model for synthesis.
4. **Replay and debug** — the waterfall timeline lets users step through the execution frame by frame.

The educational value is in the visibility, not the raw output.

---

## Orchestration Engine

### The problem we solved

The original orchestration used **6 sequential LLM calls** per request:

```
Planner LLM (~3s) → DB write → Executor LLM (~2s) → DB write →
Researcher tool-select LLM (~2s) → Jina API (~1s) →
Researcher summary LLM (~3s) → DB write →
Executor LLM (~2s) → DB write → Synthesizer LLM (~3s) → DB write
= ~16-20 seconds, 6 LLM round-trips
```

Three of those LLM calls were **routing decisions** (planner, executor, tool selection) — they just returned a single word like "researcher" or "serp_api". Paying for a full LLM round-trip to get a single routing token is wasteful.

### The solution: deterministic routing

We replaced all routing LLM calls with **regex pattern matching** that executes in 0ms:

```typescript
// URL detection → scrape vs search
const URL_PATTERN = /https?:\/\/[^\s)>\]]+/;

// Analysis detection → include analyst or skip
const ANALYSIS_PATTERN = /compar|analyz|chart|graph|plot|visualiz|benchmark|evaluat|trend/i;
```

The `classifyIntent()` function runs these patterns against the user prompt and builds the pipeline deterministically. This is correct for ~95% of queries — a user who pastes a URL wants that URL scraped, and a user who says "compare X vs Y" wants analysis.

The remaining 5% edge cases (ambiguous prompts) are handled gracefully because the researcher still uses a full LLM call to interpret the data, and the synthesizer can compensate for any routing misjudgment.

### Fire-and-forget persistence

Database writes (Prisma → SQLite) used to block the pipeline with `await`. Each write added ~50-200ms of synchronous latency. We switched to fire-and-forget:

```typescript
function persist(scenarioId: string, data: Record<string, any>) {
    prisma.agentStep.create({ data: { ... } })
        .catch((e: any) => console.error('DB persist error:', e));
}
```

DB persistence is non-critical — the UI streams events directly from the generator, not from the database. The DB is only used for session history and replay. If a write fails silently, no user-facing functionality breaks.

### Final performance

```
Deterministic route (0ms) → Jina API (~1s) →
Researcher LLM (~3s) → Synthesizer LLM (~3s)
= ~7 seconds, 2 LLM calls (simple query)

With Analyst: +1 LLM call = ~10 seconds, 3 LLM calls (analysis query)
```

---

## Web Search and Scraping (Jina AI)

### Why Jina AI over SerpAPI + Crawl4AI

The original stack used **SerpAPI** for web search and **Crawl4AI** (Python subprocess) for page scraping. We replaced both with Jina AI's unified API for three reasons:

1. **No Python dependency.** Crawl4AI required a Python runtime and `asyncio` subprocess execution (`child_process.exec`). This meant the Node.js server had to shell out to Python for every scrape request — adding process spawn overhead, cross-language error handling, and a hard dependency on Python being installed. Jina's reader API (`r.jina.ai`) is a simple HTTP call that returns markdown directly.

2. **Single API key, two capabilities.** SerpAPI and Crawl4AI were separate systems with separate dependencies. Jina AI provides both search (`s.jina.ai`) and scraping (`r.jina.ai`) under one API key and one auth header.

3. **Markdown-first output.** Jina's reader API returns clean markdown, which is exactly what LLMs consume best. No HTML parsing, no DOM traversal, no extraction logic.

### Jina Search API

```
GET https://s.jina.ai/?q=<query>
Headers:
  Authorization: Bearer <JINA_API_KEY>
  Accept: application/json
  X-Respond-With: no-content    ← Returns metadata only, no page content
```

Returns an array of `{ title, url, description }` objects. The `X-Respond-With: no-content` header is important — without it, Jina would fetch and return the full content of every search result, which is slow and wastes tokens.

### Jina Reader API

```
GET https://r.jina.ai/<target_url>
Headers:
  Authorization: Bearer <JINA_API_KEY>
  Accept: application/json
```

Returns `{ title, content (markdown), images }` for any URL. The content is clean markdown suitable for direct injection into an LLM prompt.

### Tool selection is deterministic

The original code used an LLM call to decide "should I search or scrape?". This was a full round-trip just to return `"jina_search"` or `"jina_scraper"`. We replaced it with URL detection:

```typescript
const urlMatch = prompt.match(/https?:\/\/[^\s)>\]]+/);
// URL present → scrape it. No URL → search.
```

This is correct in all practical cases. If a user pastes a URL, they want that page read. If they type a question, they want a web search.

---

## Streaming Protocol

The backend (`lib/prism.ts`) is an **async generator** that yields events. The API route (`app/api/chat/route.ts`) wraps this in a `ReadableStream` and sends events as newline-delimited JSON (NDJSON):

```
{"type":"step_start","stepId":"step-1","agent":"planner","isFastRoute":true}\n
{"type":"step_finish","stepId":"step-1","output":"Fast-route: researcher → synthesizer","latencyMs":0}\n
{"type":"step_start","stepId":"step-2","agent":"executor","isFastRoute":true}\n
{"type":"step_finish","stepId":"step-2","output":"RESEARCHER","latencyMs":0}\n
{"type":"tool_call","tool":"jina_search","args":{"query":"..."},"stepId":"step-3"}\n
{"type":"tool_result","tool":"jina_search","result":[...],"stepId":"step-3"}\n
{"type":"step_finish","stepId":"step-3","output":"...","agent":"researcher","latencyMs":4200}\n
{"type":"finish","content":"...","agent":"synthesizer"}\n
```

### Event types

| Event | Meaning |
|-------|---------|
| `step_start` | An agent begins processing. Shows "Reasoning" in the UI. |
| `tool_call` | An agent invokes a tool (jina_search, jina_scraper, code_interpreter). Shows "Call: tool_name". |
| `tool_result` | A tool returns data. Shows "Result: tool_name". |
| `step_finish` | An agent completes. Contains the output text, token usage, and latency. |
| `finish` | The entire pipeline is complete. Contains the final answer. |
| `approval_requested` | (Reserved) An agent requests user approval before proceeding. |

### Why NDJSON instead of SSE?

Server-Sent Events (SSE) require `text/event-stream` content type and `data:` prefixes. NDJSON is simpler to parse — each line is a complete JSON object. The frontend reads via `ReadableStream.getReader()` and splits on `\n`. No EventSource polyfills or reconnection logic needed.

### Frontend event mapping

The Zustand store's `mapEventToStep()` function transforms backend events into `AgentStep` objects that the UI components consume. It handles:

- **Step merging** — when a `step_finish` arrives for an existing `step_start`, it merges the output into the existing step rather than creating a duplicate.
- **Handover detection** — when consecutive events have different `agent` values, a `HandoverEvent` is created and the UI draws a transition edge in the graph canvas.
- **DAG structure** — each new step gets `parentIds` linking it to the previous step, enabling directed acyclic graph visualization.
- **Token estimation** — if the backend doesn't provide usage data, the store estimates tokens from content length (`Math.floor(content.length / 4)`).

---

## Execution Modes

### Linear (default)

All agents run sequentially: researcher → analyst (if needed) → synthesizer. Each agent waits for the previous one to complete before starting.

Best for: Accuracy. The analyst gets the full researcher output before starting. The synthesizer gets everything.

### Turbo

Skips the analyst entirely, even if the prompt contains analysis keywords. The synthesizer receives the raw researcher output and handles both analysis and final formatting in a single LLM call.

Best for: Speed. Reduces the pipeline from 3 LLM calls to 2 LLM calls for all queries regardless of complexity.

The `executionMode` setting is persisted in `localStorage` and sent to the backend with every request.

---

## Model Tiering

When **Model Tiering** is enabled, all agent LLM calls use `google/gemini-2.0-flash-exp:free` (the fastest free model on OpenRouter) regardless of each agent's individually configured model.

When disabled, each agent uses its own `selectedModel` — configurable per-agent from the settings panel.

### Available models (via OpenRouter, all free tier)

| Model | Provider | Use case |
|-------|----------|----------|
| DeepSeek R1T2 Chimera | TNG Tech | Default for researcher/analyst/synthesizer — good reasoning |
| Llama 3.3 70B Instruct | Meta | Strong general-purpose |
| Gemini 2.0 Flash Exp | Google | Fastest — used for tiering mode |
| Qwen 2.5 Coder 32B | Alibaba | Code-heavy tasks |
| Nemotron 3 Nano 30B | NVIDIA | Lightweight alternative |

### Why OpenRouter instead of direct OpenAI

OpenRouter is a unified gateway to multiple model providers. This gives us:

1. **Free tier access** — all five models above are free on OpenRouter, making the project zero-cost to run for demos and education.
2. **One API key, many models** — swap between DeepSeek, Llama, Gemini, Qwen, and Nemotron with a config change, no new SDK or API key needed.
3. **Vercel AI SDK compatibility** — the `@ai-sdk/openai` provider works with any OpenAI-compatible API by setting `baseURL`. OpenRouter speaks the OpenAI chat completions protocol, so no custom adapter was needed.

---

## Database Design

SQLite via Prisma ORM. Chosen for zero-config local persistence — no external database server needed.

### Schema

```
Scenario (1) ──> (*) AgentStep
Scenario (1) ──> (*) TraceSnapshot
```

**Scenario** — One per user prompt submission. Stores the prompt name and timestamps.

**AgentStep** — One per agent execution step. Stores:
- `agent` — which agent ran (planner, researcher, analyst, synthesizer, executor)
- `stepType` — thought, action, or output
- `content` — the main output text
- `promptConsumed` — the exact prompt sent to the LLM (for debugging)
- `inputTokens`, `outputTokens`, `totalTokens`, `cost` — usage metrics
- `latencyMs` — wall-clock time for this step
- `handoverFrom`, `handoverReason` — tracks agent transitions
- `timestamp` — `BigInt` for millisecond precision (SQLite doesn't have a native ms-precision datetime)

**TraceSnapshot** — Full serialized store state for session replay. Stores a JSON blob of the entire Zustand state at a point in time.

### Why BigInt timestamps?

JavaScript `Date.now()` returns milliseconds. SQLite's `DATETIME` type only has second precision. Using `BigInt` preserves the exact millisecond ordering needed for the waterfall timeline display.

### Why fire-and-forget writes?

The UI streams events directly from the async generator via NDJSON — it never reads from the database during live execution. The database is only read when loading saved sessions from history. This means DB write latency is invisible to the user, so we can write asynchronously without blocking the pipeline.

---

## Tech Stack and Decisions

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router) | Server-side API routes colocated with frontend. App Router for streaming responses. |
| **Runtime** | Node.js | API route uses `export const runtime = 'nodejs'` because Jina AI fetch calls and Prisma need Node APIs (not Edge). |
| **UI Library** | React 19 | Concurrent features, `use` hook for future Suspense integration with streaming. |
| **Styling** | Tailwind CSS v4 | Utility-first CSS. v4 for native CSS layers and improved performance. |
| **State** | Zustand | Minimal boilerplate. Supports complex nested state updates needed for real-time step merging. No context provider wrapper needed. |
| **Graph Viz** | @xyflow/react (React Flow) | Interactive node-based canvas with automatic edge routing. Renders the agent DAG as a visual graph. |
| **AI SDK** | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | `generateText()` with OpenRouter-compatible provider. Handles streaming, tool calling protocol, and token usage reporting. |
| **LLM Gateway** | OpenRouter | Single API key for free-tier access to 5 models from different providers. |
| **Web Search** | Jina AI Search (`s.jina.ai`) | Single HTTP call, JSON response, no Python dependency. |
| **Web Scraping** | Jina AI Reader (`r.jina.ai`) | Returns clean markdown from any URL. Replaced Crawl4AI Python subprocess. |
| **Database** | SQLite via Prisma | Zero-config, file-based. No Docker, no external DB. Prisma gives type-safe queries. |
| **Markdown** | react-markdown + remark-gfm | Renders agent outputs with GitHub Flavored Markdown (tables, strikethrough, task lists). |
| **Fonts** | Space Grotesk + Space Mono | Geometric sans-serif + monospace pairing. Fits the cyber-brutalism aesthetic. |
| **Icons** | Lucide React | Tree-shakeable icon library. Each agent type has a dedicated icon (Search, Activity, Cpu, etc.). |
| **Panels** | react-resizable-panels | The main layout splits into graph canvas + command center with a draggable divider. |

---

## Project Structure

```
agent-lab-standalone/
|
+-- app/
|   +-- layout.tsx                  # Root layout — Space Grotesk + Space Mono fonts
|   +-- page.tsx                    # Main page — graph canvas + command center split layout
|   +-- globals.css                 # Cyber-brutalism theme variables
|   |
|   +-- api/
|   |   +-- chat/
|   |       +-- route.ts            # POST endpoint — creates agent, streams NDJSON events
|   |
|   +-- _components/
|   |   +-- AgentGraphCanvas.tsx    # XY Flow canvas — renders agent nodes + edges as a DAG
|   |   +-- AgentGraphSession.tsx   # Session graph variant for history replay
|   |   +-- AgentPillar.tsx         # Sidebar pillar showing agent roles + icons
|   |   +-- CommandBar.tsx          # Prompt input bar with execution controls
|   |   +-- CommandCenter.tsx       # Right panel — live output feed, step inspector
|   |   +-- ConceptTooltip.tsx      # Educational tooltips explaining agent concepts
|   |   +-- ExecutionNode.tsx       # Custom React Flow node for each execution step
|   |   +-- OrchestrationMap.tsx    # Simplified orchestration flow visualization
|   |   +-- PrismHUD.tsx            # Head-up display overlay with system metrics
|   |   +-- PyodideExecutor.tsx     # In-browser Python execution for analyst chart code
|   |   +-- SessionDetailModal.tsx  # Modal for viewing saved session details
|   |   +-- SessionNode.tsx         # Node component for session graph view
|   |   +-- SettingsModal.tsx       # Settings panel — execution mode, model tiering, auto-save
|   |   +-- TelemetryDrawer.tsx     # Slide-out drawer — token usage, latency, prompt inspection
|   |   +-- TimelineBar.tsx         # Horizontal timeline with playback controls (play/pause/seek)
|   |   +-- WaterfallPanel.tsx      # Vertical waterfall view of all steps with latency bars
|   |
|   +-- _store/
|   |   +-- useAgentStore.ts        # Zustand store — agent configs, scenario state, event mapping
|   |
|   +-- _data/
|       +-- mockScenarios.ts        # Pre-built demo scenarios for offline exploration
|
+-- components/
|   +-- ui/
|       +-- brutal.tsx              # Shared cyber-brutalism UI primitives (badges, buttons)
|
+-- lib/
|   +-- prism.ts                    # Orchestration engine — deterministic routing, Jina tools, LLM calls
|   +-- db.ts                       # Prisma client singleton
|   +-- utils.ts                    # Utility functions (cn for classNames)
|   +-- crawler/
|       +-- crawl_service.py        # (Legacy) Crawl4AI Python script — no longer called
|
+-- prisma/
|   +-- schema.prisma               # Database schema — Scenario, AgentStep, TraceSnapshot
|   +-- dev.db                      # SQLite database file
|
+-- .env.example                    # Environment variable template
+-- .env.local                      # Actual API keys (gitignored)
+-- package.json                    # Dependencies and scripts
+-- tsconfig.json                   # TypeScript configuration
+-- next.config.ts                  # Next.js configuration
```

---

## UI Components

### Graph Canvas (`AgentGraphCanvas.tsx`)

The centerpiece of the UI. Uses `@xyflow/react` to render agent execution as an interactive directed acyclic graph (DAG). Each agent type is a column (planner, executor, researcher, analyst, synthesizer) and steps flow downward. Edges show handovers between agents. Steps with `isFastRoute: true` get a visual indicator showing they were deterministically routed (0ms).

### Command Center (`CommandCenter.tsx`)

The right panel that shows the live feed of execution events. Each step is rendered as a card with the agent's color badge, the output content (rendered as markdown), and expandable metadata. The synthesizer's final output is highlighted as the "Final Answer". Includes a step inspector that shows the raw JSON event data.

### Waterfall Panel (`WaterfallPanel.tsx`)

A vertical timeline showing all steps with horizontal latency bars. Color-coded by agent type. Steps with 0ms latency (deterministic routing) appear as thin lines, while LLM calls show proportional bars. This makes the speed improvement immediately visible — planner and executor bars are invisible while researcher and synthesizer bars dominate.

### Telemetry Drawer (`TelemetryDrawer.tsx`)

Slide-out panel that shows detailed metrics for a selected step: input/output token counts, latency in milliseconds, the exact prompt consumed (what was sent to the LLM), and handover information (which agent handed off to this one and why).

### Timeline Bar (`TimelineBar.tsx`)

Horizontal scrubber with play/pause/step-forward/step-backward controls. Allows frame-by-frame replay of any execution. Useful for teaching — you can pause at the tool_call event to see exactly what the researcher asked Jina, then step forward to see the raw results, then step again to see the researcher's summary.

### Settings Modal (`SettingsModal.tsx`)

Configuration panel for execution mode (linear/turbo), model tiering toggle, auto-save toggle, and per-agent model selection.

### PyodideExecutor (`PyodideExecutor.tsx`)

In-browser Python runtime using Pyodide (WebAssembly CPython). When the analyst generates matplotlib code, this component can execute it directly in the browser without a backend Python process.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Initialize the database

```bash
npx prisma generate
npx prisma db push
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
JINA_API_KEY=your_jina_api_key
```

Get your keys:
- **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys) (free tier available)
- **Jina AI**: [jina.ai](https://jina.ai/) (free tier available)

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Try it

Type a prompt like:
- `"What is quantum computing?"` — triggers search → researcher → synthesizer (2 LLM calls)
- `"Compare React vs Vue vs Svelte"` — triggers search → researcher → analyst → synthesizer (3 LLM calls)
- `"https://example.com summarize this page"` — triggers scrape → researcher → synthesizer (2 LLM calls)

Watch the graph canvas light up as each agent executes in sequence.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | API key for OpenRouter (LLM gateway). Get one at [openrouter.ai/keys](https://openrouter.ai/keys). All models used are free tier. |
| `JINA_API_KEY` | Yes | API key for Jina AI search and reader APIs. Used by the researcher agent for web search (`s.jina.ai`) and page scraping (`r.jina.ai`). |
| `DATABASE_URL` | No | Prisma database connection string. Defaults to `file:./dev.db` (local SQLite). Only needed if you want to use a different database. |

---

## License

MIT
