# Agent Lab Pro: Architecture Remediation

## What This Is

Architecture remediation for Agent Lab Pro, a multi-agent orchestration platform with streaming execution and DAG visualization. This milestone focuses on splitting monolithic god objects into focused modules and establishing comprehensive test coverage.

## Core Value

A maintainable, testable codebase where each module has a single responsibility and changes can be made with confidence.

## Requirements

### Validated

These capabilities exist and must remain functional throughout remediation:

- ✓ Multi-agent orchestration (planner → researcher → analyst → synthesizer) — existing
- ✓ Streaming execution with real-time typed events — existing
- ✓ DAG visualization of agent flows with handover tracking — existing
- ✓ OpenRouter LLM integration with model tiering — existing
- ✓ Jina web search and URL scraping — existing
- ✓ Dual persistence to SQLite and Supabase — existing
- ✓ Rate limiting per user/IP — existing
- ✓ Activity logging and analytics — existing
- ✓ Dataset and test case management — existing
- ✓ LLM-based evaluation with configurable judges — existing
- ✓ Session history with localStorage persistence — existing
- ✓ Playback controls for execution timeline — existing

### Active

- [ ] Split lib/prism.ts into agent modules (lib/agents/) and core infrastructure (lib/core/)
- [ ] Split useAgentStore.ts into domain-specific stores
- [ ] Set up Vitest testing infrastructure
- [ ] Add agent pipeline tests (orchestration flow)
- [ ] Add state transition tests (store updates, event mapping)
- [ ] Add API route tests (rate limiting, error handling, streaming)
- [ ] Add integration tests with mocked LLM responses

### Out of Scope

- Fixing dual-database anti-pattern — deferred, focus on structure first
- Adding new features — pure remediation, no feature work
- Migrating to different state management — keep Zustand, just split stores
- Performance optimizations — structural improvements only

## Context

**Current state from architectural audit (2026-02-03):**

| File | Lines | Problem |
|------|-------|---------|
| lib/prism.ts | 784 | 8+ responsibilities mixed: LLM client, retry logic, Jina APIs, intent classification, plan parsing, message builders, orchestration, dual-DB persistence |
| useAgentStore.ts | 789 | God object: scenario, playback, config, sessions, settings, 35+ actions in one interface |

**Key technical debt:**
- Implicit state machine for agent transitions (no formal model)
- No abstraction layer for LLM providers or persistence
- Zero test coverage on critical orchestration paths
- Every store update triggers full component tree re-renders

**Codebase mapping available:** `.planning/codebase/` contains ARCHITECTURE.md, STACK.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md

## Constraints

- **Backward compatibility**: All existing APIs and component interfaces must remain unchanged
- **Incremental delivery**: Each phase should produce working code that can be merged independently
- **Tech stack**: Next.js 16, React 19, Zustand 5, TypeScript 5.9, Vitest for testing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Agents in lib/agents/, infra in lib/core/ | Clean separation of domain logic from infrastructure | — Pending |
| Domain slices for Zustand | Prevents full-store re-renders, enables focused subscriptions | — Pending |
| Vitest over Jest | Native ESM support, faster execution, better Next.js integration | — Pending |
| Keep dual-database for now | Structural refactoring first, persistence cleanup later | — Pending |

---
*Last updated: 2026-02-03 after initialization*
