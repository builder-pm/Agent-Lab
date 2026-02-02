# AI Evals & Agent Lab: Market Analysis and Gap Assessment

## 1. What are AI Evals?
AI Evaluations (AI Evals) refer to the systematic process of assessing the performance, reliability, safety, and behavior of Artificial Intelligence systems, particularly Large Language Models (LLMs) and autonomous agents. Unlike traditional software testing which expects deterministic outputs (Pass/Fail), AI Evals measure probabilistic outputs against qualitative and quantitative standards.

## 2. Why are they used?
*   **Quality Assurance:** To ensure the model provides accurate, helpful, and relevant responses.
*   **Safety & Alignment:** To prevent hallucinations, bias, toxicity, and "jailbreaks".
*   **Performance Optimization:** To measure and improve latency, token usage, and operational costs.
*   **Regression Testing:** To ensure that changes to prompts, models, or RAG retrieval logic do not degrade performance over time.
*   **Agent Reliability:** Specifically for agents, to verify they can complete multi-step tasks, handle errors, and use tools correctly.

## 3. Who is using them?
*   **AI Engineers & ML Ops Teams:** For debugging pipelines and optimizing model parameters.
*   **Product Managers:** To verify if the AI feature meets user needs and business requirements before launch.
*   **Enterprise Compliance Teams:** To ensure AI deployments adhere to internal policies and regulatory standards.
*   **Application Developers:** Integrating LLMs into apps who need to verify "vibes" and correctness.

## 4. Available Tools in the Market

| Tool | Core Strength | Key Functionalities |
| :--- | :--- | :--- |
| **LangSmith** | LangChain Native | Deep integration with LangChain/LangGraph, trace visualization, dataset management, human annotation queues. |
| **Arize Phoenix** | Observability First | Open-source tracing, strong RAG analysis, "pre-flight" checks, embedding visualization, OpenTelemetry support. |
| **Weights & Biases (Weave)** | Experiment Tracking | robust experiment versioning, "LLM-as-a-judge" automated scoring, beautiful dashboards, strong ML roots. |
| **Braintrust** | Enterprise Evals | Focus on enterprise-grade logging, evaluation datasets, and prompt playground with regression testing. |
| **DeepEval** | Unit Testing | Developer-focused, Pytest integration, creating "unit tests" for LLMs using metrics like faithfulness and relevancy. |

## 5. What is Missing in Current Tools?
Despite the crowded market, several critical gaps remain, particularly for **Agentic Systems**:

*   **Agent Logic Visualization:** Most tools show a "chain" or a "list" of calls. They often fail to visualize the *branching logic*, loops, and state changes of a complex agent in a way that is intuitive for debugging logic errors.
*   **State-Aware Debugging:** Tools often treat every span as stateless. There is a lack of "Time Travel" debugging—the ability to step back to a specific point in an agent's execution, modify the state or prompt, and *replay* from there to test a fix.
*   **Deep Tool Simulation:** Evaluating how agents handle tool failures (e.g., API timeouts) usually requires complex mocking frameworks that existing tools don't provide out-of-the-box.
*   **Interactive "Human-in-the-Loop" Sandboxes:** Current tools are mostly "post-hoc" (analyze after run). There is a lack of interactive environments where a human can pause an agent, edit its "memory", and resume execution to steer it.

## 6. Why We Need Agent Lab
**Agent Lab** aims to fill the gap between "Passive Observability" (looking at logs) and "Active Development" (IDEs). It is not just a dashboard; it is a **workbench**.

We need Agent Lab to provide:
*   **Visual Cognition:** Turning textual logs into visual graphs that represent the agent's "mind" and decision tree.
*   **Interventionist Debugging:** Allowing developers to inject themselves into the agent's loop—pausing, editing memory, modifying tool outputs, and guiding the agent.
*   **Standardized Agent Protocols:** A agnostic platform that can trace and control agents regardless of the underlying framework (LangChain, AutoGen, custom loops).

## 7. Critique of Current Agent Lab (Based on Codebase)
Comparing the *aspirational goals* with the *current codebase* (`agent-lab-standalone`), here is what is missing:

### A. Missing Core Evaluation Primitives
*   **No "Judges":** The current schema (`AgentStep`, `TraceSnapshot`) tracks *what happened*, but there is no entity for *scoring* what happened. We need a `EvaluationResult` model to store pass/fail/score metrics derived from LLM-as-a-judge or heuristic rules.
*   **No Comparison/Diff View:** The UI allows viewing a session (`SessionNode`, `TimelineBar`), but there is no mechanism to select two distinct runs (e.g., "Scenario A - v1" vs "Scenario A - v2") and see a side-by-side diff of steps, costs, or outputs.

### B. Limited Integration
*   **Mock-Heavy:** The `_data/mockScenarios.ts` suggests reliance on static data. Real integration via API endpoints or an SDK that allows external agents to "report in" to Agent Lab is minimal or hard-coded to a simple `api/chat` route.
*   **No Dataset/Test Set Management:** There is a `Scenario` model, but no obvious UI or logic to import CSV/JSONL files of test cases (golden datasets) to run in batch.

### C. "Active" Features are Nascent
*   **Pyodide Isolation:** The `PyodideExecutor` is a great start for safe code execution, but it seems isolated. It needs to be integrated into the *flow* so users can write ad-hoc Python evaluation scripts to assert conditions on agent outputs directly in the UI.
*   **State Inspection is Read-Only:** While `TraceSnapshot` exists, the UI for *modifying* that state and forking a session (branching timelines) seems to be in early stages or effectively "read-only" in the current `SessionDetailModal`.

### D. Architectural Gaps
*   **Scalability:** SQLite (`dev.db`) is fine for a standalone prototype, but heavy trace data (especially if storing full `stateData` JSON blobs for every step) will bloat quickly.
*   **User/Team Management:** No concept of users, teams, or API keys in the schema, making it purely a single-user local tool for now.
