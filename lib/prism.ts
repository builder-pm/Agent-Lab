
import { AgentConfig, AgentInterface } from './agents/types';
import { LinearAgent } from './agents/linearAgent';
import { DeepResearchAgent } from './agents/deepResearchAgent';
import prisma from './db';

// Re-export types for backward compatibility if needed
export type { PrismEvent } from './agents/types';

export function createAgent(config: any) {
    // Validate or Normalize Config
    const agentConfig: AgentConfig = {
        agentMode: config.agentMode || 'linear',
        modelTiering: config.modelTiering || false,
        maxParallelSteps: config.maxParallelSteps || 3,
        isLabsEnabled: config.isLabsEnabled || false,
        agentConfigs: config.agentConfigs,
        scenarioId: config.scenarioId
    };

    // Factory Logic
    if (agentConfig.agentMode === 'deep') {
        return new DeepResearchAgent(agentConfig);
    } else {
        return new LinearAgent(agentConfig);
    }
}
