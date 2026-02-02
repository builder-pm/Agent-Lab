import { AgentScenario } from "../_store/useAgentStore";

export const MOCK_SCENARIOS: AgentScenario[] = [
    {
        id: "multi-agent-tree",
        name: "DAG Reasoning: Market Expansion",
        description: "Demonstrates complex handoffs and parallel research branches.",
        steps: [
            {
                id: "step-0",
                type: "input",
                label: "User Query",
                content: "Evaluate SolarTech expansion into the Brazilian market.",
                timestamp: Date.now() - 60000,
                agent: "executor"
            },
            {
                id: "step-1",
                parentIds: ["step-0"],
                type: "thought",
                label: "Analyze Query",
                content: "User wants market expansion strategy. Routing to Planner to define scope.",
                timestamp: Date.now() - 55000,
                agent: "executor"
            },
            {
                id: "step-2",
                parentIds: ["step-1"],
                type: "thought",
                label: "Planning Phase",
                content: "Plan: 1. Economic trends (Researcher), 2. Competitor landscape (Researcher), 3. Comparative Analysis (Analyst).",
                timestamp: Date.now() - 50000,
                agent: "planner"
            },
            {
                id: "step-3",
                parentIds: ["step-2"],
                type: "thought",
                label: "Delegating Tasks",
                content: "Executing parallel research tracks for Macro and Micro data.",
                timestamp: Date.now() - 45000,
                agent: "executor"
            },
            {
                id: "step-4",
                parentIds: ["step-3"],
                type: "action",
                label: "Macro Economic Research",
                content: "Searching Snowflake Cortex for Brazilian economic indicators 2024-2025.",
                timestamp: Date.now() - 40000,
                agent: "researcher"
            },
            {
                id: "step-5",
                parentIds: ["step-3"],
                type: "action",
                label: "Web Search: Competitors",
                content: "Tavily search for 'Solar energy competitors in Brazil 2024'.",
                timestamp: Date.now() - 38000,
                agent: "researcher"
            },
            {
                id: "step-6",
                parentIds: ["step-4"],
                type: "output",
                label: "Macro Findings",
                content: "Brazil shows 15% YoY growth in residential solar. Tax incentives verified.",
                timestamp: Date.now() - 35000,
                agent: "researcher"
            },
            {
                id: "step-7",
                parentIds: ["step-5"],
                type: "output",
                label: "Competitor Data",
                content: "Local players dominate 40% market; Rivian Solar entering soon.",
                timestamp: Date.now() - 32000,
                agent: "researcher"
            },
            {
                id: "step-8",
                parentIds: ["step-6", "step-7"],
                type: "thought",
                label: "Comparative Analysis",
                content: "Synthesizing macro growth with micro competitive threats. Opportunity score: 8/10.",
                timestamp: Date.now() - 25000,
                agent: "analyst"
            },
            {
                id: "step-9",
                parentIds: ["step-8"],
                type: "output",
                label: "Final Strategy",
                content: "Recommend expansion via local partnership to bypass high import tariffs. Focus on Sao Paulo region.",
                timestamp: Date.now() - 10000,
                agent: "synthesizer"
            }
        ]
    }
];
