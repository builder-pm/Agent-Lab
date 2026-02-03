# Codebase Structure

**Analysis Date:** 2026-02-03

## Directory Layout

```
agent-lab-standalone/
├── app/                      # Next.js App Router (all routes and pages)
│   ├── layout.tsx           # Root layout with AuthProvider, GlobalSidebar, fonts
│   ├── page.tsx             # Main interactive agent lab page (/)
│   ├── globals.css          # Global styles (Tailwind)
│   ├── _components/         # Page-specific React components
│   │   ├── AgentGraphCanvas.tsx       # Main execution flow visualization (DAG)
│   │   ├── AgentPillar.tsx            # Visual pillar for single agent
│   │   ├── ExecutionNode.tsx          # Individual step node in canvas
│   │   ├── CommandBar.tsx             # Floating prompt input bar
│   │   ├── CommandCenter.tsx          # Right panel (telemetry, chat, metrics)
│   │   ├── TelemetryDrawer.tsx        # Execution metrics display
│   │   ├── SessionDetailModal.tsx     # Modal for viewing session details
│   │   ├── SessionNode.tsx            # Container for agent session
│   │   ├── SettingsModal.tsx          # Settings/configuration modal
│   │   ├── AuthButton.tsx             # Sign-in/sign-out button
│   │   ├── PrismHUD.tsx               # Heads-up display for metrics
│   │   └── ... (other components)
│   ├── _store/              # Zustand state management
│   │   └── useAgentStore.ts # Centralized app state (scenarios, playback, settings, sessions)
│   ├── _context/            # React Context providers
│   │   └── AuthContext.tsx  # Supabase auth context with Google OAuth
│   ├── _data/               # (Directory for data utilities if needed)
│   ├── api/                 # Server-side API routes (Next.js Route Handlers)
│   │   ├── chat/
│   │   │   └── route.ts     # POST /api/chat - Main streaming agent orchestration
│   │   ├── eval/
│   │   │   └── route.ts     # POST/GET /api/eval - Evaluation scoring
│   │   ├── activity/
│   │   │   └── route.ts     # Activity logging endpoints
│   │   ├── analytics/
│   │   │   └── route.ts     # Analytics aggregation
│   │   ├── datasets/
│   │   │   ├── route.ts     # GET/POST /api/datasets
│   │   │   └── [id]/
│   │   │       ├── route.ts # GET/PUT/DELETE specific dataset
│   │   │       ├── cases/
│   │   │       │   └── route.ts     # Test case CRUD
│   │   │       ├── import/
│   │   │       │   └── route.ts     # Dataset import
│   │   │       └── run/
│   │   │           └── route.ts     # Trigger test run
│   │   ├── scenarios/
│   │   │   ├── route.ts     # Scenario CRUD
│   │   │   └── [id]/
│   │   │       └── route.ts # Specific scenario
│   │   ├── judges/
│   │   │   ├── route.ts     # Judge CRUD
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── runs/
│   │   │   └── [id]/
│   │   │       └── route.ts # Get test run results
│   │   ├── testcases/
│   │   │   └── [caseId]/
│   │   │       └── route.ts # Individual test case
│   │   └── usage/
│   │       └── route.ts     # Usage statistics
│   ├── auth/
│   │   └── callback/
│   │       └── page.tsx     # Supabase OAuth callback handler
│   ├── datasets/
│   │   ├── page.tsx         # Dataset management page (/datasets)
│   │   └── [id]/
│   │       └── page.tsx     # Dataset detail page
│   ├── analytics/
│   │   └── page.tsx         # Analytics dashboard page (/analytics)
│   ├── history/
│   │   └── page.tsx         # Session history page (/history)
│   ├── judges/
│   │   └── page.tsx         # Judge management page (/judges)
│   ├── compare/
│   │   └── page.tsx         # Comparison view page (/compare)
│
├── components/              # Shared UI components (not page-specific)
│   ├── GlobalSidebar.tsx   # Navigation sidebar (all pages)
│   └── ui/
│       └── brutal.tsx      # Custom "brutal" badge component
│
├── lib/                     # Utilities and server-side logic
│   ├── prism.ts            # Core agent orchestration, createAgent(), streaming logic
│   ├── db.ts               # Prisma client singleton
│   ├── supabase.ts         # Server-side Supabase client
│   ├── supabase-client.ts  # Client-side Supabase client
│   ├── rate-limit.ts       # Rate limiting logic (per user/IP)
│   ├── activity.ts         # Activity event logging
│   ├── evaluator.ts        # LLM-based evaluation scoring
│   ├── utils.ts            # Utility functions (cn for tailwind merge)
│   └── crawler/            # Web scraping utilities
│       └── (crawler modules)
│
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Complete data models (Scenario, AgentStep, TestCase, TestRun, etc.)
│   └── (migrations/)       # Auto-generated migration files (not committed, created by prisma migrate)
│
├── public/                 # Static assets
│   ├── logo.svg
│   ├── naman-favicon.svg
│   └── pyodide/           # Pyodide runtime assets for Python execution
│
├── .planning/              # GSD planning documents
│   └── codebase/          # This analysis output
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
│
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies, scripts
├── next.config.js         # Next.js configuration (if present)
├── tailwind.config.js     # Tailwind CSS configuration (if present)
├── .env.local             # Local environment variables (not committed)
└── .gitignore            # Git ignore rules
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router directory containing all pages, routes, and page-level components
- Contains: Page files (page.tsx), API routes (api/*/route.ts), layouts, and feature-specific components
- Key files: `layout.tsx` (root), `page.tsx` (main), `api/chat/route.ts` (core orchestration)

**app/_components/:**
- Purpose: Page-specific React components used only in `/app/page.tsx` (main lab interface)
- Contains: Specialized visualization components (AgentGraphCanvas, ExecutionNode, CommandCenter)
- Never imported from pages outside `app/page.tsx` — indicates tight coupling to main interface

**app/_store/:**
- Purpose: Client-side state management via Zustand
- Contains: Single store definition (useAgentStore) with all UI, scenario, playback, and settings state
- Patterns: Pure functions with set/get, localStorage persistence helpers, event mapping utilities

**app/_context/:**
- Purpose: React Context providers for cross-app concerns
- Contains: AuthContext for Supabase authentication and OAuth flow
- Pattern: createContext + custom hook (useAuth) for type-safe access

**app/api/:**
- Purpose: Server-side route handlers for all external I/O (LLM, database, auth, streaming)
- Contains: POST/GET/DELETE route handlers following Next.js conventions
- Patterns: Async functions in `route.ts` files, JSON request/response bodies, streaming via ReadableStream

**app/[page]/ (datasets/, analytics/, history/, judges/):**
- Purpose: Top-level pages accessible from GlobalSidebar navigation
- Pattern: Each has `page.tsx` (page component) and optional `[id]/` sub-route for detail views
- Responsibility: Fetch data from `/api/` routes, manage page-local state, render with GlobalSidebar

**components/:**
- Purpose: Shared reusable UI components used across multiple pages
- Contains: GlobalSidebar (on every page), custom UI primitives (BrutalBadge)
- Pattern: Client components ("use client"), no page-specific logic

**lib/:**
- Purpose: Shared utilities, business logic, and service clients
- Contains: Agent orchestration (prism.ts), database (db.ts), auth (supabase*.ts), middleware (rate-limit, activity, evaluator)
- Pattern: Importable from any route or component; stateless functions or singletons

**prisma/:**
- Purpose: Data layer definition and schema management
- Contains: `schema.prisma` with all data models and relationships
- Pattern: `prisma generate` auto-generates TypeScript types; migrations stored in `prisma/migrations/`
- Generator: `postinstall` script in package.json runs `prisma generate` after npm install

**public/:**
- Purpose: Static assets served directly by Next.js
- Contains: Images (logo.svg, favicon), Pyodide runtime for Python sandbox execution
- Pattern: Referenced in HTML/JSX as `/path` (e.g., `<img src="/logo.svg" />`)

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout with AuthProvider, GlobalSidebar, fonts setup
- `app/page.tsx`: Main interactive agent lab (the core interface)
- `app/auth/callback/page.tsx`: OAuth callback handler from Supabase

**Configuration:**
- `package.json`: Dependencies, scripts (dev, build, start, lint, postinstall)
- `tsconfig.json`: TypeScript compiler options, path aliases (`@/*` → project root)
- `prisma/schema.prisma`: Complete database schema definition

**Core Logic:**
- `app/api/chat/route.ts`: POST endpoint for streaming agent execution
- `lib/prism.ts`: Agent orchestration, event streaming, LLM integration
- `app/_store/useAgentStore.ts`: Central state store with all UI and execution state
- `lib/rate-limit.ts`: Per-user/IP rate limiting logic
- `lib/evaluator.ts`: LLM-based evaluation scoring

**Visualization:**
- `app/_components/AgentGraphCanvas.tsx`: Main execution flow visualization (DAG rendering)
- `app/_components/CommandCenter.tsx`: Right panel with telemetry, chat, metrics
- `app/_components/PrismHUD.tsx`: Performance metrics and status display

**Testing & Data:**
- `app/api/datasets/route.ts`: Dataset CRUD operations
- `app/api/eval/route.ts`: Evaluation scoring endpoint
- `prisma/schema.prisma`: Test case, test run, dataset, evaluation models

**Utilities:**
- `lib/utils.ts`: Tailwind className merging utility (cn function)
- `lib/supabase-client.ts`: Client-side Supabase instance
- `lib/activity.ts`: Activity event logging to database
- `lib/crawler/`: Web scraping utilities (Jina API integration)

## Naming Conventions

**Files:**
- Components: PascalCase with .tsx extension (e.g., `AgentGraphCanvas.tsx`, `CommandCenter.tsx`)
- Pages: `page.tsx` for route pages; `layout.tsx` for layout files; `route.ts` for API handlers
- Utilities: camelCase with .ts extension (e.g., `useAgentStore.ts`, `supabase-client.ts`)
- Config: lowercase with dots (e.g., `tsconfig.json`, `next.config.js`)

**Directories:**
- Feature-based: `datasets/`, `analytics/`, `history/` (organized by feature, not layer)
- Prefixed with underscore for non-routable: `_components/`, `_store/`, `_context/`, `_data/`
- Route dynamic segments in brackets: `[id]/` for dynamic routes (e.g., `app/api/datasets/[id]/route.ts`)

**Functions:**
- Custom hooks: `use` prefix (e.g., `useAgentStore`, `useAuth`)
- Store actions: verb + subject (e.g., `loadScenario`, `runScenario`, `toggleConsole`)
- Component event handlers: `handle` + action (e.g., `handleCreate`, `handleDelete`, `startResizing`)

**Types & Interfaces:**
- PascalCase, descriptive names (e.g., `AgentConfig`, `AgentStep`, `HandoverEvent`, `SavedSession`)
- Union types named explicitly (e.g., `AgentType`, `PrismEvent`)

**CSS & Styling:**
- Tailwind utility classes directly in className attributes
- Custom component variants in files (e.g., `BrutalBadge` wrapper component)
- Global styles in `app/globals.css`

## Where to Add New Code

**New Feature (e.g., new agent type, new visualization):**
- Primary code: `app/_components/` (for feature UI) + `lib/prism.ts` (if agent logic)
- Tests: Co-located with component (if unit test) or `__tests__/` directory
- State: Add to `useAgentStore.ts` if crosses components
- API: Add route to `app/api/[feature]/route.ts`

**New Component/Module:**
- Shared across pages: `components/` (e.g., `components/ui/MyComponent.tsx`)
- Page-specific only: `app/_components/MyComponent.tsx`
- Non-visual utilities: `lib/myUtility.ts`
- Custom hooks: `lib/useCustomHook.ts`

**New Page/Section:**
- Route: Create `app/[section]/page.tsx` (shows in GlobalSidebar if listed in navItems)
- Sub-routes: Create `app/[section]/[id]/page.tsx`
- Layout: Share root `app/layout.tsx` or create `app/[section]/layout.tsx`
- API endpoints: Create `app/api/[section]/route.ts`

**Database/Schema Changes:**
- Edit: `prisma/schema.prisma`
- Generate: Run `npm run postinstall` or `prisma generate`
- Migrate: Run `prisma migrate dev --name description` (creates new migration file)
- Seed data: Create `prisma/seed.ts` and call in postinstall

**Utilities & Helpers:**
- Small reusable: `lib/utils.ts`
- Domain-specific: New file in `lib/` (e.g., `lib/vectorStore.ts`)
- Path aliases: Use `@/` prefix for imports from project root (configured in `tsconfig.json` paths)

## Special Directories

**node_modules/:**
- Purpose: Installed npm packages
- Generated: Yes (npm install)
- Committed: No (.gitignore)

**.next/:**
- Purpose: Build output and dev server cache
- Generated: Yes (next build / next dev)
- Committed: No (.gitignore)

**prisma/migrations/:**
- Purpose: Database migration history
- Generated: Yes (prisma migrate)
- Committed: Yes (part of version control)

**.claude/:**
- Purpose: AI assistant context/history
- Generated: Yes (user interaction)
- Committed: No (.gitignore)

**.planning/codebase/:**
- Purpose: GSD (Grand System Design) codebase analysis documents
- Generated: Yes (by /gsd:map-codebase command)
- Committed: Yes (reference documentation)

---

*Structure analysis: 2026-02-03*
