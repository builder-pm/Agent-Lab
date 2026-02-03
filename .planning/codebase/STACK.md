# Technology Stack

**Analysis Date:** 2026-02-03

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase including React components, API routes, and utilities
- JavaScript - Configuration files and Next.js metadata

**Secondary:**
- Python - Referenced via Pyodide integration for client-side execution (`pyodide` ^0.29.2)

## Runtime

**Environment:**
- Node.js 18+ (inferred from Next.js 16.1.5 requirements)
- Browser runtime for client components (React 19.2.3)

**Package Manager:**
- npm (8.x or later based on lock file)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.5 - Full-stack React framework for app routing, API routes, and server components
- React 19.2.3 - UI component library with Suspense boundaries and hooks

**UI & Visualization:**
- @radix-ui/react-collapsible ^1.1.12 - Accessible collapsible components
- @radix-ui/react-tabs ^1.1.13 - Accessible tab navigation
- @radix-ui/react-tooltip ^1.2.8 - Tooltip components
- @xyflow/react ^12.10.0 - Node-based graph visualization (agent graph canvas)
- Tailwind CSS 4 - Utility-first CSS framework for styling
- Lucide React ^0.563.0 - Icon library

**State & Data:**
- Zustand ^5.0.4 - Lightweight state management (used in `useAgentStore`)
- Zod ^4.3.6 - TypeScript-first schema validation

**Content Rendering:**
- React Markdown ^10.1.0 - Markdown parser for display
- Remark GFM ^4.0.1 - GitHub Flavored Markdown support
- React JSON Pretty ^2.2.0 - JSON visualization
- React Resizable Panels ^4.5.2 - Resizable layout panels

**Testing & Development:**
- ESLint 9.39.2 - Code linting with Next.js config
- TypeScript Compiler - For type checking

## AI & LLM Integration

**Primary:**
- ai ^6.0.53 - Vercel AI SDK for LLM abstractions and streaming
- @ai-sdk/openai ^3.0.20 - OpenAI provider (used to connect to OpenRouter)
- @ai-sdk/react ^3.0.55 - React hooks for AI integration

**Custom Packages:**
- @evilmartians/agent-prism-data ^0.0.9 - Data structures for agent execution
- @evilmartians/agent-prism-types ^0.0.9 - TypeScript types for agent system

## Data & Database

**ORM:**
- Prisma 6.19.2 - Database ORM with schema migrations
  - Client: `@prisma/client` ^6.19.2
  - Config: `prisma/schema.prisma`
  - Postinstall hook: Automatic `prisma generate`

**Database Provider:**
- SQLite (local development)
- PostgreSQL (production via Vercel compatibility flag)

**Cloud Database (Optional):**
- Supabase ^2.93.3 - PostgreSQL-backed cloud database for analytics/logging

## Search & Scraping

**Web Integration:**
- Duck Duck Scrape ^2.2.7 - Web scraping utility
- Jina AI API - Web search and content extraction (configured via `JINA_API_KEY`)

## Utilities

**Core:**
- classnames ^2.5.1 - Conditional CSS class building
- clsx ^2.1.1 - Smaller alternative to classnames
- tailwind-merge ^3.4.0 - Merge Tailwind classes without conflicts
- dotenv ^17.2.3 - Environment variable management

**Execution:**
- pyodide ^0.29.2 - Python runtime for browser-side Python code execution

## Configuration

**Environment:**
- `.env.local` - Local development secrets (not committed)
- `.env.example` - Template with required variables
- Variables required:
  - `OPENROUTER_API_KEY` - LLM API access
  - `JINA_API_KEY` - Web search/scraping
  - `DATABASE_URL` - Prisma database connection
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server-only)

**Build:**
- `tsconfig.json` - TypeScript configuration (ES2017 target, bundler resolution, path alias `@/*`)
- `next.config.ts` - Next.js configuration (minimal)
- `postcss.config.mjs` - PostCSS with Tailwind CSS 4 plugin
- `eslint.config.mjs` - ESLint configuration with Next.js rules

**TypeScript:**
- Compiler target: ES2017
- Module resolution: bundler
- Strict mode enabled
- Path alias: `@/*` maps to project root

## Platform Requirements

**Development:**
- Node.js 18+
- npm 8+
- SQLite (included with Prisma)
- Environment variables configured in `.env.local`

**Production:**
- Vercel (Next.js deployment target)
- PostgreSQL database (Supabase or self-hosted)
- OpenRouter API key for LLM access
- Jina API key for web search/scraping

## Command Scripts

```bash
npm run dev          # Start Next.js dev server (hot reload)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm postinstall      # Auto-runs: prisma generate (type generation)
```

---

*Stack analysis: 2026-02-03*
