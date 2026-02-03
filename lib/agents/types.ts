
export interface AgentConfig {
    agentMode: 'linear' | 'deep';
    modelTiering: boolean;
    maxParallelSteps: number;
    isLabsEnabled: boolean;
    agentConfigs?: Record<string, any>;
    scenarioId?: string;
}

export type AgentType = 'planner' | 'executor' | 'researcher' | 'analyst' | 'synthesizer' | 'user';

export type AgentEvent =
    | { type: 'step_start'; stepId: string; input: string; agent?: string; consumedPrompt?: string; isParallel?: boolean; parallelGroup?: string; parallelLabel?: string; isFastRoute?: boolean; label?: string; meta?: any }
    | { type: 'tool_call'; tool: string; args: any; stepId: string; agent?: string; isParallel?: boolean; parallelGroup?: string }
    | { type: 'tool_result'; tool: string; result: any; stepId: string; agent?: string; isParallel?: boolean; parallelGroup?: string }
    | { type: 'step_finish'; stepId: string; output: string; usage?: any; latencyMs?: number; agent?: string; meta?: any; isParallel?: boolean; parallelGroup?: string; parallelLabel?: string; label?: string }
    | { type: 'finish'; content: string; usage?: any; agent?: string; stepId?: string }
    | { type: 'approval_requested'; agent: string; stepId: string };

export type PrismEvent = AgentEvent;

export interface AgentContext {
    userPrompt: string;
    chatHistory: string;
    plannerOutput: any;
    researcherOutput: string;
    analystOutput: string;
}

export interface AgentInterface {
    stream(params: { prompt: string; chatHistory: any[] }): AsyncGenerator<AgentEvent, void, unknown>;
}
