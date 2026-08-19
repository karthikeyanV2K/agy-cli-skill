// Orchestrator module exports
export { Orchestrator, DEFAULT_ORCHESTRATOR_CONFIG, type OrchestratorConfig, type OrchestratorState } from './orchestrator.js';
export { classifyTask, toBaseTaskType, getAllTaskTypes, type ExtendedTaskType } from './task-classifier.js';
export { getChainForTask, getPhasesForAgent, canSpawnAgent, getGatesForPhase, verifyGates, checkBudget, DEFAULT_BUDGET, type GateCheck } from './agent-chain.js';
export { buildContext, buildDiscoveryContext, updateContextAfterAgent, type AgentContextPackage } from './context-builder.js';
export type { TaskContext, Assumption, Decision, BudgetSnapshot } from '../types/index.js';
