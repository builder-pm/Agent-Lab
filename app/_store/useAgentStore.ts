import { create } from 'zustand';
import { supabaseClient } from '@/lib/supabase-client';

// Available free models from OpenRouter
export const AVAILABLE_MODELS = [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct', provider: 'Meta' },
    { id: 'tngtech/deepseek-r1t2-chimera:free', name: 'DeepSeek R1T2 Chimera', provider: 'TNG Tech' },
    { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 0528', provider: 'DeepSeek' },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen 3 Coder', provider: 'Alibaba' },
    { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron 3 Nano 30B', provider: 'NVIDIA' },
] as const;

// Mock types for now, will replace with @evilmartians/agent-prism-types later
export type AgentType = 'planner' | 'researcher' | 'analyst' | 'synthesizer' | 'executor' | 'deep-planner' | 'worker' | 'aggregator' | 'orchestrator';

// Agent configuration for each agent type
export interface AgentConfig {
    id: AgentType;
    name: string;
    description: string;
    role: string;
    systemPrompt: string;
    guardrails: string[];
    maxInputTokens: number;
    maxOutputTokens: number;
    selectedModel: string;
    color: string;
    bgColor: string;
    tools: string[];
}

// Handover event when control passes between agents
export interface HandoverEvent {
    id: string;
    fromAgent: AgentType;
    toAgent: AgentType;
    fromStepId: string;
    toStepId: string;
    reason: string;
    promptConsumed: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cost: number;
    timestamp: number;
}

export interface AgentStep {
    id: string;
    parentIds?: string[]; // Support for multiple parents (DAG structure)
    type: 'input' | 'thought' | 'action' | 'output' | 'approval_requested' | 'process';
    label: string;
    content: string; // JSON or text
    timestamp: number;
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens: number;
        cost: number;
        reasoningTokens?: number;
    };
    metadata?: Record<string, any>;
    // Multi-agent support
    agent?: AgentType;
    // Handover tracking
    handoverFrom?: AgentType;
    handoverTo?: AgentType;
    handoverReason?: string;
    promptConsumed?: string;
    // Parallel/DAG support
    isParallel?: boolean;
    parallelGroup?: string;
    parallelLabel?: string;
    isFastRoute?: boolean;
    // Evaluation support
    evaluationResults?: Array<{
        metric: string;
        score: number;
        reasoning: string;
    }>;
    // Enriched Telemetry for Protocol View
    input?: string;
    inputFrom?: string;
    systemPrompt?: string;
    modelInfo?: {
        name: string;
        contextLimit?: string;
        outputLimit?: string;
    };
    reasoning?: string;
}

export interface AgentScenario {
    id: string;
    name: string;
    description: string;
    steps: AgentStep[];
}

export interface SavedSession {
    id: string;
    name: string;
    timestamp: number;
    scenario: AgentScenario;
}

interface AgentLabState {
    // Scenario
    currentScenario: AgentScenario | null;
    isLoading: boolean;
    isStreaming: boolean;
    error: string | null;
    rateLimitExceeded: boolean;
    showAnalytics: boolean;
    isConsoleOpen: boolean;
    isLabsEnabled: boolean;

    // Session History
    savedSessions: SavedSession[];

    // Playback State
    isPlaying: boolean;
    currentStepIndex: number; // -1 means start
    playbackSpeed: number; // ms per step
    isInspectorOpen: boolean;

    // Model Selection
    selectedModel: string;

    // Agent Configurations
    agentConfigs: Record<AgentType, AgentConfig>;
    selectedAgent: AgentType | null;
    selectedStepId: string | null;
    handovers: HandoverEvent[];

    // Actions
    loadScenario: (scenario: AgentScenario) => void;
    runScenario: (prompt: string) => Promise<void>;
    toggleAnalytics: () => void;
    toggleConsole: () => void;
    play: () => void;
    pause: () => void;
    nextStep: () => void;
    prevStep: () => void;
    seekTo: (index: number) => void;
    setInspectorOpen: (open: boolean) => void;
    setSelectedModel: (modelId: string) => void;
    evaluateStep: (stepId: string) => Promise<void>;

    // Agent Config Actions
    selectAgent: (agentId: AgentType | null) => void;
    setSelectedStepId: (stepId: string | null) => void;
    updateAgentConfig: (agentId: AgentType, config: Partial<AgentConfig>) => void;
    setAgentModel: (agentId: AgentType, modelId: string) => void;

    // Session History Actions
    saveCurrentSession: (name?: string) => void;
    loadSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    exportSession: (sessionId?: string) => string;

    // UI State
    viewedSession: { agent: AgentType, steps: AgentStep[] } | null;
    setViewedSession: (session: { agent: AgentType, steps: AgentStep[] } | null) => void;

    // Settings
    executionMode: 'linear' | 'turbo' | 'deep';
    modelTiering: boolean;
    autoSave: boolean;
    isSettingsOpen: boolean;

    // Settings Actions
    toggleSettings: () => void;
    setExecutionMode: (mode: 'linear' | 'turbo' | 'deep') => void;
    setModelTiering: (enabled: boolean) => void;
    setAutoSave: (enabled: boolean) => void;
    toggleLabs: () => void;
    clearRateLimitExceeded: () => void;
}



export const useAgentStore = create<AgentLabState>((set, get) => ({
    currentScenario: null,
    isLoading: false,
    isStreaming: false,
    error: null,
    rateLimitExceeded: false,
    savedSessions: loadSessionsFromStorage(),
    isPlaying: false,
    currentStepIndex: -1,
    playbackSpeed: 1000,
    isInspectorOpen: false,
    showAnalytics: false,
    isConsoleOpen: true,
    selectedModel: AVAILABLE_MODELS[0].id,

    // Agent Configurations
    agentConfigs: {
        planner: {
            id: 'planner',
            name: 'Planner',
            description: 'Creates detailed research plans analyzing the query, identifying focus areas, and structuring the approach. Falls back to fast deterministic routing for quick requests.',
            role: 'Strategic Planning',
            systemPrompt: `You are a strategic research planner. Analyze the user's query and create a structured execution plan.

You MUST output these fields at the top (exactly as shown):
**SEARCH_QUERY:** <optimized search query>
**SCRAPE_URL:** <URL or "none">
**NEEDS_ANALYSIS:** <yes or no>

Then provide:

## Approach
Briefly describe the research strategy.

## Focus Areas
- 3-5 specific aspects to investigate

## Expected Output
Describe the ideal answer format.

---
EXAMPLE for "Compare React vs Vue":

**SEARCH_QUERY:** React vs Vue comparison 2024 performance developer experience
**SCRAPE_URL:** none
**NEEDS_ANALYSIS:** yes

## Approach
Gather comparative data on performance, learning curve, ecosystem, and use cases.

## Focus Areas
- Performance benchmarks
- Learning curve and documentation
- Ecosystem and community
- Best use cases for each

## Expected Output
Comparison table with pros/cons for each framework.`,
            guardrails: ['Always output structured fields', 'Optimize search queries', 'Identify when analysis is needed'],
            maxInputTokens: 128000,
            maxOutputTokens: 1024,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-violet-400',
            bgColor: 'bg-violet-500/20',
            tools: []
        },
        researcher: {
            id: 'researcher',
            name: 'Researcher',
            description: 'Searches the web or scrapes URLs, then summarizes findings.',
            role: 'Data Gathering',
            systemPrompt: `You are a research assistant. Extract key facts from the provided data.

Rules:
1. Cite sources as markdown links: [Source Title](URL)
2. Use bullet points, not paragraphs
3. Keep under 500 words
4. State explicitly if data is insufficient

Example citation:
- Tesla sold 1.8M vehicles in 2023 [Reuters](https://reuters.com/...)`,
            guardrails: ['Cite sources as markdown links', 'Keep under 500 words'],
            maxInputTokens: 32000,
            maxOutputTokens: 2048,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/20',
            tools: ['jina_search', 'jina_scraper']
        },
        analyst: {
            id: 'analyst',
            name: 'Analyst',
            description: 'Structures data into comparisons, rankings, or assessments.',
            role: 'Data Analysis',
            systemPrompt: `You are a data analyst. Structure the research into clear insights.

Format selection:
- COMPARISONS → Use markdown tables
- EVALUATIONS → Use Pros/Cons lists
- RANKINGS → Use numbered lists with scores
- TRENDS → Use bullet points with dates

Rules:
- Be objective and data-driven
- Flag assumptions: "[Assumption: ...]" 
- Note data gaps: "[Gap: ...]" 
- Keep under 400 words`,
            guardrails: ['Flag assumptions', 'Note data gaps', 'Use correct format'],
            maxInputTokens: 32000,
            maxOutputTokens: 3072,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/20',
            tools: ['code_interpreter']
        },
        synthesizer: {
            id: 'synthesizer',
            name: 'Synthesizer',
            description: 'Delivers the final polished answer to the user.',
            role: 'Final Synthesis',
            systemPrompt: `Deliver the final answer to the user.

Rules:
- Start directly with the answer (no "Sure!" or "Here's...")
- Never mention agents, pipelines, or internal processes
- Be concise but complete
- End with a brief "Key takeaway:" summary (1-2 sentences)

Match the tone to the question:
- Factual questions → direct, informative
- How-to questions → step-by-step
- Opinion questions → balanced with recommendation`,
            guardrails: ['No meta-talk', 'Match tone to question type'],
            maxInputTokens: 64000,
            maxOutputTokens: 4096,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/20',
            tools: []
        },
        executor: {
            id: 'executor',
            name: 'Executor',
            description: 'Deterministic state machine that routes between agents. No LLM — uses pattern matching.',
            role: 'Orchestration',
            systemPrompt: `[INFO] This agent does not use an LLM. It routes deterministically based on the planner's NEEDS_ANALYSIS flag:
- If NEEDS_ANALYSIS=yes: planner → researcher → analyst → synthesizer
- If NEEDS_ANALYSIS=no: planner → researcher → synthesizer
- In turbo mode: planner (fast) → researcher → synthesizer`,
            guardrails: ['Zero-latency routing', 'Graceful error fallback'],
            maxInputTokens: 128000,
            maxOutputTokens: 256,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-zinc-400',
            bgColor: 'bg-zinc-800/50',
            tools: ['task_router']
        },
        'deep-planner': {
            id: 'deep-planner',
            name: 'Deep Planner',
            description: 'Deconstructs complex queries into multiple parallel sub-tasks.',
            role: 'Map Phase',
            systemPrompt: 'Break down the user query into independent research directions.',
            guardrails: [],
            maxInputTokens: 128000,
            maxOutputTokens: 2048,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-violet-400',
            bgColor: 'bg-violet-500/20',
            tools: []
        },
        'worker': {
            id: 'worker',
            name: 'Field Researcher',
            description: 'Executes specific sub-queries in parallel.',
            role: 'Worker Phase',
            systemPrompt: 'Search and summarize findings for a specific topic.',
            guardrails: [],
            maxInputTokens: 32000,
            maxOutputTokens: 2048,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/20',
            tools: ['jina_search', 'jina_scraper']
        },
        'aggregator': {
            id: 'aggregator',
            name: 'Synthesizer',
            description: 'Combines multiple research threads into a cohesive report.',
            role: 'Reduce Phase',
            systemPrompt: 'Synthesize the provided summaries into a final answer.',
            guardrails: [],
            maxInputTokens: 128000,
            maxOutputTokens: 4096,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/20',
            tools: []
        },
        'orchestrator': {
            id: 'orchestrator',
            name: 'Orchestrator',
            description: 'Manages the deep research workflow.',
            role: 'System',
            systemPrompt: 'System Controller',
            guardrails: [],
            maxInputTokens: 0,
            maxOutputTokens: 0,
            selectedModel: 'nvidia/nemotron-nano-9b-v2:free',
            color: 'text-zinc-400',
            bgColor: 'bg-zinc-800/50',
            tools: []
        }
    },
    selectedAgent: null,
    selectedStepId: null,
    handovers: [],

    loadScenario: (scenario) => set({
        currentScenario: scenario,
        currentStepIndex: -1,
        isPlaying: false,
        error: null,
        isStreaming: false,
        handovers: []
    }),

    runScenario: async (prompt) => {
        set({
            isLoading: true,
            isStreaming: true,
            error: null,
            currentScenario: {
                id: 'live',
                name: 'Live Execution',
                description: `Prompt: ${prompt}`,
                steps: [{
                    id: `step-${Date.now()}-input`,
                    agent: 'executor', // Acts as the system entry point
                    type: 'input',
                    label: 'User Request',
                    content: prompt,
                    timestamp: Date.now(),
                    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 }
                }]
            },
            currentStepIndex: 0,
            handovers: []
        });

        try {
            const { selectedModel, executionMode, modelTiering, agentConfigs } = get();

            // Get current session token for rate limiting
            const { data: { session } } = await supabaseClient.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    agentConfigs: agentConfigs,
                    executionMode: executionMode,
                    modelTiering: modelTiering,
                    isLabsEnabled: get().isLabsEnabled,
                }),
            });

            // Handle rate limit exceeded (429)
            if (response.status === 429) {
                const errorData = await response.json();
                set({
                    error: errorData.message || 'Rate limit exceeded',
                    isLoading: false,
                    isStreaming: false,
                    rateLimitExceeded: true  // Flag for UI to show credit exhausted modal
                });
                return;
            }

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Process all complete lines
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);

                        // Map backend event to frontend step
                        const newStep: AgentStep = mapEventToStep(event);

                        set(state => {
                            if (!state.currentScenario) return state;
                            const steps = [...state.currentScenario.steps];
                            const existingStepIndex = steps.findIndex(s => s.id === newStep.id);
                            const prevStep = steps.length > 0 ? steps[steps.length - 1] : null;

                            // Handle merging if step already exists
                            if (existingStepIndex !== -1) {
                                const existingStep = steps[existingStepIndex];

                                // Merge logic: Update content, usage, metadata, label if they are more "complete"
                                steps[existingStepIndex] = {
                                    ...existingStep,
                                    ...newStep,
                                    // Preserve original timestamp to maintain waterfall order
                                    timestamp: existingStep.timestamp,
                                    // If newStep has content, it might be the "finish" output. 
                                    // If existingStep already had similar content, don't overwrite with empty
                                    content: newStep.content || existingStep.content,
                                    label: newStep.label || existingStep.label,
                                    usage: newStep.usage || existingStep.usage,
                                    // Preserve enriched telemetry if not provided in newStep
                                    input: newStep.input || existingStep.input,
                                    inputFrom: newStep.inputFrom || existingStep.inputFrom,
                                    systemPrompt: newStep.systemPrompt || existingStep.systemPrompt,
                                    modelInfo: newStep.modelInfo || existingStep.modelInfo,
                                    reasoning: newStep.reasoning || existingStep.reasoning,
                                    handoverTo: newStep.handoverTo || existingStep.handoverTo,
                                    // Ensure type transition (e.g., thought -> output)
                                    type: newStep.type !== 'thought' ? newStep.type : existingStep.type
                                };

                                return {
                                    currentScenario: {
                                        ...state.currentScenario,
                                        steps
                                    }
                                };
                            }

                            // Support DAG structure via parentIds
                            if (prevStep) {
                                newStep.parentIds = [prevStep.id];
                            }

                            // Check for handover
                            if (prevStep && prevStep.agent !== newStep.agent && newStep.agent) {
                                const handover: HandoverEvent = {
                                    id: `ho-${Date.now()}-${steps.length}`,
                                    fromAgent: prevStep.agent!,
                                    toAgent: newStep.agent!,
                                    fromStepId: prevStep.id,
                                    toStepId: newStep.id,
                                    reason: 'Task completion and next step transition',
                                    promptConsumed: newStep.content.slice(0, 100) + '...',
                                    inputTokens: newStep.usage?.inputTokens || 0,
                                    outputTokens: newStep.usage?.outputTokens || 0,
                                    latencyMs: Date.now() - prevStep.timestamp,
                                    cost: newStep.usage?.cost || 0,
                                    timestamp: Date.now()
                                };

                                newStep.handoverFrom = prevStep.agent;
                                newStep.handoverReason = handover.reason;
                                newStep.promptConsumed = handover.promptConsumed;

                                return {
                                    currentScenario: {
                                        ...state.currentScenario,
                                        steps: [...steps, newStep]
                                    },
                                    currentStepIndex: steps.length,
                                    handovers: [...state.handovers, handover]
                                };
                            }

                            const updatedSteps = [...steps, newStep];
                            return {
                                currentScenario: {
                                    ...state.currentScenario,
                                    steps: updatedSteps
                                },
                                // Auto-advance if streaming
                                currentStepIndex: updatedSteps.length - 1
                            };
                        });

                    } catch (e) {
                        console.error('Error parsing line:', line, e);
                    }
                }
            }
        } catch (err: any) {
            set({ error: err.message });
        } finally {
            set({ isLoading: false, isStreaming: false });
        }
    },

    toggleAnalytics: () => set(state => ({ showAnalytics: !state.showAnalytics })),

    play: () => {
        const { currentScenario, currentStepIndex } = get();
        if (currentScenario && currentStepIndex < currentScenario.steps.length - 1) {
            set({ isPlaying: true });
        }
    },
    pause: () => set({ isPlaying: false }),

    nextStep: () => {
        const { currentScenario, currentStepIndex } = get();
        if (!currentScenario) return;
        if (currentStepIndex < currentScenario.steps.length - 1) {
            set({ currentStepIndex: currentStepIndex + 1 });
        } else {
            set({ isPlaying: false }); // Stop at end
        }
    },

    prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > -1) {
            set({ currentStepIndex: currentStepIndex - 1 });
        }
    },

    seekTo: (index) => set({ currentStepIndex: index, isInspectorOpen: index !== -1 }),
    setInspectorOpen: (open) => set({ isInspectorOpen: open }),

    toggleConsole: () => set((state) => ({ isConsoleOpen: !state.isConsoleOpen })),

    setSelectedModel: (modelId) => set({ selectedModel: modelId }),

    evaluateStep: async (stepId) => {
        const { currentScenario } = get();
        if (!currentScenario) return;

        try {
            const res = await fetch('/api/eval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stepId }),
            });
            const data = await res.json();

            if (data.success && data.results) {
                set(state => {
                    if (!state.currentScenario) return state;
                    const steps = state.currentScenario.steps.map(step => {
                        if (step.id === stepId) {
                            return { ...step, evaluationResults: data.results };
                        }
                        return step;
                    });
                    return {
                        currentScenario: { ...state.currentScenario, steps }
                    };
                });
            }
        } catch (error) {
            console.error('Failed to evaluate step:', error);
        }
    },

    // Agent Config Actions
    selectAgent: (agentId) => set({ selectedAgent: agentId }),
    setSelectedStepId: (stepId) => set({ selectedStepId: stepId }),
    updateAgentConfig: (agentId, config) => set(state => ({
        agentConfigs: {
            ...state.agentConfigs,
            [agentId]: { ...state.agentConfigs[agentId], ...config }
        }
    })),
    setAgentModel: (agentId, modelId) => set(state => ({
        agentConfigs: {
            ...state.agentConfigs,
            [agentId]: { ...state.agentConfigs[agentId], selectedModel: modelId }
        }
    })),

    // Session History Actions
    saveCurrentSession: (name) => {
        const { currentScenario, savedSessions } = get();
        if (!currentScenario || currentScenario.steps.length === 0) return;

        const session: SavedSession = {
            id: `session-${Date.now()}`,
            name: name || currentScenario.name || `Session ${savedSessions.length + 1}`,
            timestamp: Date.now(),
            scenario: { ...currentScenario }
        };

        const updatedSessions = [session, ...savedSessions].slice(0, 20); // Keep max 20 sessions
        set({ savedSessions: updatedSessions });
        saveSessionsToStorage(updatedSessions);
    },

    loadSession: (sessionId) => {
        const { savedSessions } = get();
        const session = savedSessions.find(s => s.id === sessionId);
        if (session) {
            set({
                currentScenario: { ...session.scenario },
                currentStepIndex: -1,
                isPlaying: false,
                error: null,
                handovers: []
            });
        }
    },

    deleteSession: (sessionId) => {
        const { savedSessions } = get();
        const updatedSessions = savedSessions.filter(s => s.id !== sessionId);
        set({ savedSessions: updatedSessions });
        saveSessionsToStorage(updatedSessions);
    },

    exportSession: (sessionId) => {
        const { currentScenario, savedSessions } = get();
        let scenario: AgentScenario | null = null;

        if (sessionId) {
            const session = savedSessions.find(s => s.id === sessionId);
            scenario = session?.scenario || null;
        } else {
            scenario = currentScenario;
        }

        if (!scenario) return '';

        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            scenario
        }, null, 2);
    },

    viewedSession: null,
    setViewedSession: (session) => set({ viewedSession: session }),

    // Settings (loaded from localStorage)
    executionMode: loadSettingsFromStorage().executionMode || 'linear',
    modelTiering: loadSettingsFromStorage().modelTiering || false,
    autoSave: loadSettingsFromStorage().autoSave || true,
    isLabsEnabled: loadSettingsFromStorage().isLabsEnabled || false,
    isSettingsOpen: false,

    // Settings Actions
    toggleSettings: () => set(state => ({ isSettingsOpen: !state.isSettingsOpen })),
    setExecutionMode: (mode) => {
        set({ executionMode: mode });
        saveSettingsToStorage({ ...get(), executionMode: mode });
    },
    toggleLabs: () => {
        const newState = !get().isLabsEnabled;
        set({ isLabsEnabled: newState });
        saveSettingsToStorage({ ...get(), isLabsEnabled: newState });
    },
    setModelTiering: (enabled) => {
        set({ modelTiering: enabled });
        saveSettingsToStorage({ ...get(), modelTiering: enabled });
    },
    setAutoSave: (enabled) => {
        set({ autoSave: enabled });
        saveSettingsToStorage({ ...get(), autoSave: enabled });
    },
    clearRateLimitExceeded: () => set({ rateLimitExceeded: false }),
}));

// LocalStorage helpers
function loadSessionsFromStorage(): SavedSession[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem('agent-lab-sessions');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveSessionsToStorage(sessions: SavedSession[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem('agent-lab-sessions', JSON.stringify(sessions));
    } catch (e) {
        console.error('Failed to save sessions to localStorage:', e);
    }
}

// Settings helpers
function loadSettingsFromStorage(): { executionMode: 'linear' | 'turbo' | 'deep'; modelTiering: boolean; autoSave: boolean; isLabsEnabled: boolean } {
    if (typeof window === 'undefined') return { executionMode: 'linear', modelTiering: false, autoSave: true, isLabsEnabled: false };
    try {
        const stored = localStorage.getItem('agent-lab-settings');
        return stored ? JSON.parse(stored) : { executionMode: 'linear', modelTiering: false, autoSave: true, isLabsEnabled: false };
    } catch {
        return { executionMode: 'linear', modelTiering: false, autoSave: true, isLabsEnabled: false };
    }
}

function saveSettingsToStorage(state: any): void {
    if (typeof window === 'undefined') return;
    try {
        const settings = {
            executionMode: state.executionMode,
            modelTiering: state.modelTiering,
            autoSave: state.autoSave,
            isLabsEnabled: state.isLabsEnabled
        };
        localStorage.setItem('agent-lab-settings', JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings to localStorage:', e);
    }
}

// Helper to map backend events to UI steps
let stepCounter = 0; // Counter to ensure uniqueness
function mapEventToStep(event: any): AgentStep {
    stepCounter++;

    // Use usage from backend if available, otherwise estimate
    const usage = event.usage || (() => {
        const content = event.output || event.content || JSON.stringify(event.args || event.result || "") || "";
        const estimatedInputTokens = Math.floor(content.length / 4) + 10;
        const estimatedOutputTokens = event.type === 'tool_result' ? 0 : Math.floor(content.length / 4) + 20;
        const totalTokens = estimatedInputTokens + estimatedOutputTokens;
        return {
            inputTokens: estimatedInputTokens,
            outputTokens: estimatedOutputTokens,
            totalTokens: totalTokens,
            cost: (totalTokens / 1000) * 0.01, // Default heuristic
            reasoningTokens: event.meta?.reasoningTokens || 0
        };
    })();

    // Ensure usage has reasoningTokens if passed in meta
    if (usage && event.meta?.reasoningTokens) {
        usage.reasoningTokens = event.meta.reasoningTokens;
    }

    const base: AgentStep = {
        id: event.stepId || `evt-${Date.now()}-${stepCounter}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
        metadata: event,
        usage: usage,
        agent: event.agent || 'executor',
        promptConsumed: event.consumedPrompt || event.input || undefined,
        type: 'thought' as any, // Placeholder
        label: '',
        content: '',
        isParallel: event.isParallel,
        parallelGroup: event.parallelGroup,
        isFastRoute: event.isFastRoute,
        // Enriched Telemetry from meta
        input: event.meta?.input,
        inputFrom: event.meta?.inputFrom,
        systemPrompt: event.meta?.systemPrompt,
        modelInfo: event.meta?.modelInfo,
        reasoning: event.meta?.reasoning,
        handoverTo: event.meta?.handoverTo,
        parallelLabel: event.parallelLabel
    };

    // determine latency
    (base as any).latencyMs = event.latencyMs;

    switch (event.type) {
        case 'step_start':
            return {
                ...base,
                type: 'thought',
                label: event.label || event.parallelLabel || 'Reasoning',
                content: event.input || 'Initializing phase...',
            };
        case 'approval_requested':
            return {
                ...base,
                type: 'approval_requested',
                label: 'Authorization Required',
                content: 'Waiting for user approval...',
                agent: event.agent
            };
        case 'tool_call':
            return {
                ...base,
                type: 'action',
                label: `Call: ${event.tool}`,
                content: JSON.stringify(event.args, null, 2),
            };
        case 'tool_result':
            return {
                ...base,
                type: 'output',
                label: `Result: ${event.tool}`,
                content: typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2),
            };
        case 'step_finish':
        case 'finish':
            return {
                ...base,
                type: 'output',
                label: event.label || 'Final Answer',
                content: event.output || event.content || '',
            };
        default:
            return {
                ...base,
                type: 'thought',
                label: event.type,
                content: JSON.stringify(event),
            };
    }
}

