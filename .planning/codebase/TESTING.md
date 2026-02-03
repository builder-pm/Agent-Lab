# Testing Patterns

**Analysis Date:** 2026-02-03

## Test Framework

**Runner:**
- Not detected - No test framework configured
- No `jest.config.*`, `vitest.config.*`, or test runner scripts in `package.json`
- **Note:** Project currently has no automated testing infrastructure

**Assertion Library:**
- Not applicable - No testing framework in place

**Run Commands:**
```bash
npm run lint              # Run ESLint
npm run dev              # Development server
npm run build            # Build for production
npm run start            # Start production server
```

## Test File Organization

**Current Status:**
- **Zero test files** in application code (`app/`, `lib/`, `components/`)
- Test files exist only in `node_modules/` (dependencies like zod, tsconfig-paths)
- No `__tests__/`, `tests/`, or `.test.ts`/`.spec.ts` files in source

**Recommended Pattern (Not Currently Implemented):**
- Co-located tests with source code
- File naming: `[filename].test.ts` or `[filename].test.tsx`
- Location: Same directory as source file

## Test Structure

**Not Currently Implemented**

Since the project has no testing infrastructure, the following patterns should be adopted when tests are added:

**Recommended Jest/Vitest Suite Structure:**
```typescript
describe('functionName', () => {
  it('should do X when Y', () => {
    // Arrange
    const input = ...;

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe(...);
  });

  it('should handle error case', () => {
    // Test error handling
  });
});
```

**Setup/Teardown:**
- Use `beforeEach()` for test data initialization
- Use `afterEach()` for cleanup (clear mocks, reset state)

## Mocking

**Framework:**
- Not configured - Would typically use `jest.mock()` or Vitest equivalents

**Patterns to Implement:**
- Mock Supabase client in service tests
- Mock OpenRouter API calls in `lib/prism.ts` tests
- Mock Prisma client for database tests

**What to Mock:**
- External API calls (Supabase, OpenRouter, Jina API)
- Database operations via Prisma
- File system operations
- Environment variables in tests

**What NOT to Mock:**
- Core business logic functions
- Utility functions like `cn()`, `truncateToLimit()`
- Local state management (Zustand store)

## Fixtures and Factories

**Test Data (Not Currently Implemented):**

When tests are added, create fixtures for:
- Agent configurations: `AVAILABLE_MODELS`, `AgentConfig`
- Agent steps: Sample `AgentStep` objects with various types ('input', 'thought', 'action', 'output')
- Scenarios: Sample `AgentScenario` data for testing orchestration
- Activity events: Sample activity logs with various event types

**Recommended Location:**
```
tests/
├── fixtures/
│   ├── agents.fixture.ts
│   ├── steps.fixture.ts
│   └── scenarios.fixture.ts
├── mocks/
│   ├── supabase.mock.ts
│   ├── prisma.mock.ts
│   └── openrouter.mock.ts
└── utils/
    └── test-helpers.ts
```

**Example Fixture Pattern (Not Yet Implemented):**
```typescript
// tests/fixtures/agents.fixture.ts
export const mockAgentConfig: AgentConfig = {
  id: 'planner',
  name: 'Planner',
  selectedModel: 'meta-llama/llama-3.3-70b-instruct:free',
  // ... other properties
};
```

## Coverage

**Requirements:**
- Not enforced - No coverage configuration present
- **Recommended:** Establish coverage targets when testing framework is added (minimum 70%)

**View Coverage:**
```bash
# When testing framework is added:
npm run test:coverage    # Generate coverage report
```

## Test Types

**Unit Tests (Not Implemented):**
- Would test individual functions and utilities
- Focus areas for future implementation:
  - `lib/activity.ts` - Activity logging function
  - `lib/evaluator.ts` - Evaluation scoring logic
  - `lib/rate-limit.ts` - Rate limiting calculations
  - `lib/utils.ts` - Utility functions like `cn()`

**Integration Tests (Not Implemented):**
- Would test API routes with database interactions
- Focus areas:
  - `app/api/chat/route.ts` - Chat endpoint with rate limiting
  - `app/api/eval/route.ts` - Evaluation endpoint
  - `app/api/scenarios/route.ts` - Scenario CRUD operations
  - Supabase client integration

**E2E Tests (Not Implemented):**
- Would benefit the UI: `app/_components/`, `app/page.tsx`
- Candidate framework: Playwright or Cypress
- Critical user flows:
  - Login flow
  - Agent execution flow
  - Console interaction
  - Session playback

## Test Priorities for Implementation

**High Priority (Core Logic):**

1. **Rate Limiting** (`lib/rate-limit.ts`)
   - Test GUEST_LIMIT (3) enforcement
   - Test PRO_LIMIT (15) enforcement
   - Test daily reset logic
   - Test edge cases (concurrent requests)

2. **Evaluation** (`lib/evaluator.ts`)
   - Test heuristic judge with regex patterns
   - Test LLM judge JSON parsing
   - Test null handling for missing scenarios/judges
   - Test metric creation and result persistence

3. **Activity Logging** (`lib/activity.ts`)
   - Test all event types: 'login', 'auth_attempt', 'logout', 'query', 'rate_limited'
   - Test error handling when Supabase unavailable
   - Test parameter variations (userId, ipAddress, etc.)

**Medium Priority (API Routes):**

1. **Chat Route** (`app/api/chat/route.ts`)
   - Test rate limit enforcement
   - Test activity logging trigger
   - Test error responses (429, 400)
   - Test rate limit response format

2. **Dataset Operations** (`app/api/datasets/route.ts`, related)
   - Test CRUD operations
   - Test test case management
   - Test batch run execution

**Lower Priority (UI Components):**

1. React component snapshot tests
2. User interaction tests (click, input, navigation)
3. Visual regression tests

## Known Testing Gaps

**Areas Without Test Coverage:**
- `lib/prism.ts` - Core multi-agent orchestration logic (32KB file, critical)
- `app/api/chat/route.ts` - Main API endpoint
- `app/_store/useAgentStore.ts` - Global state management
- `app/_components/*.tsx` - UI components
- Database models and migrations
- Authentication flow

**Risk Assessment:**
- **HIGH:** Multi-agent orchestration logic could have bugs that go undetected
- **HIGH:** API rate limiting and activity logging crucial for service reliability
- **MEDIUM:** State management changes could break UI unexpectedly
- **MEDIUM:** Component refactoring without tests risks regression

## Recommended Testing Strategy

**Phase 1 (Immediate):**
1. Set up Jest or Vitest with Next.js support
2. Add tests for `lib/rate-limit.ts`, `lib/activity.ts`, `lib/evaluator.ts`
3. Target 70% coverage for critical paths

**Phase 2 (Short-term):**
1. Add integration tests for API routes
2. Test database operations with Prisma
3. Test Supabase client interactions

**Phase 3 (Medium-term):**
1. Add E2E tests for critical user flows
2. Add component snapshot tests
3. Improve coverage to 80%+

---

*Testing analysis: 2026-02-03*
