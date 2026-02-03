# Coding Conventions

**Analysis Date:** 2026-02-03

## Naming Patterns

**Files:**
- PascalCase for component files: `SessionDetailModal.tsx`, `ExecutionNode.tsx`, `CommandBar.tsx`
- camelCase for utility/service files: `prism.ts`, `evaluator.ts`, `activity.ts`, `rate-limit.ts`
- kebab-case for directory names: `_components`, `_store`, `_context`, `_data`
- Directories prefixed with underscore are private/local app directories: `app/_components`, `app/_store`

**Functions:**
- camelCase for all function names
- Async functions explicitly marked with `async` keyword
- Arrow functions (`const myFunction = () => {}`) preferred in modern code
- Helper functions use descriptive names: `truncateToLimit()`, `formatChatHistory()`, `checkRateLimit()`

**Variables:**
- camelCase for local variables and constants
- SCREAMING_SNAKE_CASE for constants: `MAX_CONTEXT_CHARS`, `GUEST_LIMIT`, `PRO_LIMIT`, `DEFAULT_JUDGE_MODEL`
- React hooks prefixed with `use`: `useAgentStore()`, `useState()`, `useCallback()`, `useEffect()`
- Private/internal variables may use leading underscore when needed

**Types:**
- PascalCase for interfaces and types: `AgentConfig`, `AgentStep`, `SessionDetailModalProps`, `BrutalButtonProps`
- Suffix `Props` for React component prop interfaces: `ExecutionNodeProps`, `SessionDetailModalProps`, `BrutalProps`
- Union types use camelCase: `eventType`, `stepType`
- Export type definitions for external use: `export type ActivityEventType = 'login' | 'auth_attempt' | ...`

## Code Style

**Formatting:**
- 4-space indentation (observed in TypeScript files)
- Semicolons required (enforced by ESLint config)
- Trailing commas in multiline objects/arrays
- Double quotes for JSX attributes: `className="flex items-center"`
- Template strings for dynamic values: ``const msg = `${item.content}` ``

**Linting:**
- ESLint with Next.js configuration: `eslint-config-next`
- Config file: `eslint.config.mjs` (flat config format)
- Core Web Vitals checks enabled via `eslint-config-next/core-web-vitals`
- TypeScript strict mode enabled
- ESLint ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

**Line Breaking:**
- Long lines broken at reasonable points (~80-100 characters typical, longer acceptable for class names)
- Ternary operators broken across lines for readability
- Function parameters may span multiple lines if numerous

## Import Organization

**Order:**
1. React and Next.js core imports: `import React from "react"`, `import Link from "next/link"`
2. Third-party libraries: `import { generateText } from 'ai'`, `import { create } from 'zustand'`
3. Type imports and icons: `import { AgentStep, useAgentStore } from "../_store/useAgentStore"`, `import { Send, Clock, Zap } from "lucide-react"`
4. Utility and helper imports: `import { cn } from "@/lib/utils"`
5. Component imports: `import { CommandBar } from "./_components/CommandBar"`

**Path Aliases:**
- `@/*` maps to repository root
- Used extensively: `@/lib/utils`, `@/lib/prism`, `@/components/GlobalSidebar`, `@/lib/supabase-client`
- Configured in `tsconfig.json`: `"paths": { "@/*": ["./*"] }`

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: Used in `evaluateScenarioResult()`, `logActivity()`, `checkRateLimit()`
- Error logging to console with context: `console.error('Failed to log activity:', error)`
- Graceful fallbacks when services unavailable: `if (!supabase) return null;`
- Error codes checked explicitly: `if (error && error.code !== 'PGRST116')`
- HTTP error responses standardized with status codes and JSON payloads:
  ```typescript
  return new Response(JSON.stringify({ error: 'message' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' }
  });
  ```

**Error Recovery:**
- Database errors fail open with default values: `return { allowed: true, remaining: 999, limit: 999 }`
- JSON parsing wrapped in try-catch: `try { JSON.parse() } catch (e) { ... }`
- Optional chaining used extensively: `data?.query_count`, `step.usage?.totalTokens`
- Nullish coalescing for defaults: `messages[messages.length - 1]?.content || ''`

## Logging

**Framework:** console (native browser/Node.js APIs)

**Patterns:**
- Development/debug logs: `console.log()` for informational messages
- Error logs: `console.error('context message:', error)` with error context
- No logging framework (Pino, Winston, etc.) in place currently
- Errors include context: `console.error('LLM Judge Error:', error);`
- Activity logging uses dedicated `logActivity()` function for structured events

## Comments

**When to Comment:**
- Explanation of non-obvious logic (see `prism.ts` comments on context management)
- Section dividers for major code blocks:
  ```typescript
  // --- Rate Limiting Logic ---
  // --- End Rate Limiting Logic ---
  ```
- Inline comments for error codes: `// PGRST116 is "no rows returned"`
- Comments on workarounds or design decisions: `// FIX #1: Prevent unbounded context growth`

**JSDoc/TSDoc:**
- Used sparingly and selectively
- Component prop interfaces documented when complex: `interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`
- Function parameters documented in comments when not obvious
- Example from `brutal.tsx`:
  ```typescript
  /**
   * BrutalCard: Hard borders, hard shadows, default white background.
   */
  ```

## Function Design

**Size:**
- Functions kept reasonably small (most under 50 lines)
- Component render functions often 80-150 lines (acceptable for Next.js pages)
- Utility functions extract reusable logic: `truncateToLimit()`, `formatChatHistory()`

**Parameters:**
- Destructured in parameter list when multiple related values: `const SessionDetailModal = ({ agent, steps, onClose })`
- Props interface defined when component accepts many props
- Type-safe with TypeScript interfaces

**Return Values:**
- Consistent typing: All functions have explicit return types
- Async functions return Promise: `async function logActivity(...): Promise<void>`
- Union types for complex returns: `EvalResult | null`
- HTTP routes return `Response` object with proper headers

## Module Design

**Exports:**
- Named exports preferred for utilities and services: `export async function logActivity()`
- Default exports for page/layout components: `export default function AgentLabPage()`
- Components export with `export const`: `export const ExecutionNode = ({ step, isLast }: ExecutionNodeProps) => {}`

**Barrel Files:**
- Not extensively used
- Component directories may export from single index file (pattern not observed in current codebase)
- Each component file self-contained

**Zustand Store Pattern:**
- Store defined with `create()` hook: `const useAgentStore = create<AgentLabState>((set) => ({ ... }))`
- State and actions in single definition
- Store file: `app/_store/useAgentStore.ts`
- Destructuring when using: `const { isConsoleOpen, toggleConsole } = useAgentStore()`

## Data Flow Conventions

**React Props:**
- Props interface always defined for components with parameters
- Extends from HTML attributes when applicable: `interface BrutalProps extends React.HTMLAttributes<HTMLDivElement>`
- Callback functions typed properly: `onClose: () => void`

**State Management:**
- Zustand for global state (`useAgentStore`)
- React.useState for local component state
- useCallback for memoized event handlers
- Dependencies array always provided for useEffect and useCallback

**API Communication:**
- Next.js API routes in `app/api/` directory
- Request/response handled with Next.js `NextRequest` and `Response`
- JSON parsing and error handling in route handlers
- Bearer token extraction from Authorization header

---

*Convention analysis: 2026-02-03*
