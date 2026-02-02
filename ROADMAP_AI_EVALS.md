# Agent Lab: AI Evaluation Product Roadmap

## 🎯 Goal
Transform Agent Lab from a single-trace inspector into a comprehensive **AI Evaluation Workbench** that allows engineers to measure, compare, and improve agent performance systematically.

---

## Phase 1: The "Gym" (Datasets & Regression Testing)
*Goal: Move beyond single-prompt testing. Allow users to run a suite of "Golden Questions" to verify agent reliability.*

### 1.1 Data Models (Prisma/Supabase)
- [ ] Create `Dataset` model (collection of test cases).
- [ ] Create `TestCase` model (input prompt, expected output/assertions).
- [ ] Create `TestRun` model (links a Dataset to a Batch of Scenarios).

### 1.2 Dataset Management UI
- [ ] **Upload/Import:** UI to upload CSV/JSONL files containing test prompts.
- [x] **Test Case Editor:** Interface to add/edit expected behaviors (e.g., "Must contain 'Paris'", "Latency < 2s").
- [ ] **Dataset List:** Sidebar view to manage different test suites (e.g., "Smoke Tests", "Complex Reasoning").

### 1.3 Batch Runner Engine
- [ ] **Queue System:** Backend service to iterate through a Dataset and spawn Agent Scenarios for each case.
- [ ] **Concurrency Control:** Limit to X parallel runs to avoid rate limits.
- [x] **Progress UI:** Real-time progress bar for batch execution (e.g., "Running 5/20...").

---

## Phase 2: The "Arena" (Visual Comparison)
*Goal: Enable side-by-side analysis of two agent runs to spot regressions or improvements.*

### 2.1 Comparison View
- [x] **Split-Screen UI:** A new route `/compare?base=ID&candidate=ID` to show two traces side-by-side.
- [x] **Step Alignment:** Logic to visually align steps (e.g., align "Search" in Run A with "Search" in Run B).
- [x] **Diff Highlighting:** Visual diff of text outputs (Red/Green highlighting for changes).

### 2.2 Metrics Diff
- [ ] **Scoreboard:** Top-level comparison of costs, tokens, and eval scores (e.g., "Faithfulness: +5%").
- [ ] **Winner/Loser Badges:** Automatically highlight which run performed better.

---

## Phase 3: Analytics Dashboard
*Goal: High-level metrics to track agent health over time.*

### 3.1 Aggregation Backend
- [ ] API endpoint to calculate average scores, P99 latency, and total cost per Scenario or Dataset.
- [ ] Support for filtering by date range and model version.

### 3.2 Visualization (Charts)
- [ ] **Trend Lines:** Line charts showing "Faithfulness" score over the last 30 runs.
- [ ] **Cost Breakdown:** Pie chart of cost by Agent Type (Planner vs. Researcher).
- [ ] **Scatter Plot:** Latency vs. Quality score (find slow & bad responses).

---

## Phase 4: Custom "Judges"
*Goal: Allow users to define their own success criteria.*

### 4.1 Judge Editor
- [x] **Prompt Builder:** UI to write custom system prompts for the LLM Judge.
- [ ] **Rule-Based Evaluators:** UI to create regex/keyword matchers (cheaper/faster than LLM).
- [ ] **Code Evaluators:** (Advanced) Python script assertion (already partially supported by Pyodide).

### 4.2 Configuration
- [ ] **Judge Profiles:** Save "Strict Legal Judge" vs. "Creative Writing Judge".
- [ ] **Metric Weights:** Define that "Safety" is weighted 2x more than "Conciseness" in the final score.
- [x] **Auto-Eval Trigger:** Automatically trigger evaluations when a batch run completes if the test cases have `expectedOutput` or defined assertions.

---

## 🏁 Recommended Immediate Next Step
**Start with Phase 1 (The "Gym").**
Without datasets, users are just manually "vibing" one prompt at a time. Datasets are the foundation of systematic engineering.
