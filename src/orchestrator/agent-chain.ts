import type { AgentType, ExtendedTaskType, TaskContext, Assumption, Decision } from '../types/index.js';

export type { AgentType, TaskContext } from '../types/index.js';

/**
 * Agent chain for each task type per AGENTS.md specification
 * Maps ExtendedTaskType to ordered array of AgentType
 */
export const AGENT_CHAINS: Readonly<Record<ExtendedTaskType, readonly AgentType[]>> = {
  BUG: ['orchestrator', 'debugger', 'validator', 'reviewer'] as const,
  FEATURE_INTERNAL: ['orchestrator', 'researcher', 'architect', 'implementer', 'validator', 'reviewer'] as const,
  FEATURE_EXTERNAL: ['orchestrator', 'researcher', 'architect', 'implementer', 'validator', 'reviewer'] as const,
  REFACTOR: ['orchestrator', 'architect', 'implementer', 'validator', 'reviewer'] as const,
  PERFORMANCE: ['orchestrator', 'researcher', 'architect', 'implementer', 'validator', 'debugger', 'reviewer'] as const,
  SECURITY: ['orchestrator', 'researcher', 'architect', 'reviewer', 'implementer', 'validator', 'reviewer'] as const,
  ARCHITECTURE: ['orchestrator', 'researcher', 'architect', 'reviewer', 'implementer', 'validator', 'debugger', 'reviewer'] as const,
  KERNEL_DRIVER: ['orchestrator', 'researcher', 'architect', 'reviewer', 'implementer', 'validator', 'debugger', 'reviewer'] as const,
  BUILD_CI: ['orchestrator', 'implementer', 'validator', 'reviewer'] as const,
  TEST: ['orchestrator', 'validator', 'reviewer'] as const,
  DOCUMENTATION: ['orchestrator', 'implementer', 'reviewer'] as const,
};

/**
 * Phase names that each agent is responsible for
 */
export const AGENT_PHASES: Readonly<Record<AgentType, readonly string[]>> = {
  orchestrator: ['DISCOVERY', 'RESEARCH', 'ANALYSIS', 'PLANNING', 'IMPLEMENTATION', 'VALIDATION', 'DEBUGGING', 'REVIEW', 'COMPLETE'] as const,
  researcher: ['RESEARCH'] as const,
  architect: ['ANALYSIS', 'PLANNING'] as const,
  implementer: ['IMPLEMENTATION'] as const,
  validator: ['VALIDATION'] as const,
  debugger: ['DEBUGGING'] as const,
  reviewer: ['REVIEW'] as const,
};

/**
 * Gate requirements per phase transition
 * Each gate is a mechanical check (no LLM calls)
 */
export interface GateCheck {
  name: string;
  description: string;
  check: (context: TaskContext) => boolean;
}
export type { Assumption, Decision } from '../types/index.js';

/**
 * Gets the agent chain for a given task type
 * Returns ordered array of AgentType per AGENTS.md specification
 */
export function getChainForTask(type: ExtendedTaskType): readonly AgentType[] {
  return AGENT_CHAINS[type] ?? AGENT_CHAINS.FEATURE_INTERNAL;
}

/**
 * Gets the phases an agent is responsible for
 */
export function getPhasesForAgent(agent: AgentType): readonly string[] {
  return AGENT_PHASES[agent] ?? [];
}

/**
 * Checks if an agent can be spawned for the current phase
 * Mechanical check - no LLM calls
 */
export function canSpawnAgent(agent: AgentType, currentPhase: string, context: TaskContext): boolean {
  const agentPhases = getPhasesForAgent(agent);
  return agentPhases.includes(currentPhase);
}

/**
 * Gets the gate checks required before entering a phase
 * All gates are mechanical (no LLM calls)
 */
export function getGatesForPhase(phase: string): readonly GateCheck[] {
  const gates: Record<string, readonly GateCheck[]> = {
    RESEARCH: [
      {
        name: 'repository_inspected',
        description: 'Repository inspection completed',
        check: (ctx) => ctx.repositoryInspected,
      },
      {
        name: 'requirements_decomposed',
        description: 'Requirements decomposed into actionable items',
        check: (ctx) => ctx.requirementsDecomposed,
      },
    ],
    ANALYSIS: [
      {
        name: 'knowledge_gaps_identified',
        description: 'Knowledge gaps identified and classified',
        check: (ctx) => ctx.knowledgeGapsIdentified,
      },
    ],
    PLANNING: [
      {
        name: 'research_completed',
        description: 'Required research completed with evidence',
        check: (ctx) => ctx.researchCompleted,
      },
      {
        name: 'research_cross_validated',
        description: 'Research findings cross-validated with codebase',
        check: (ctx) => ctx.researchCrossValidated,
      },
    ],
    IMPLEMENTATION: [
      {
        name: 'architecture_plan_created',
        description: 'Architecture plan created',
        check: (ctx) => ctx.architecturePlanCreated,
      },
      {
        name: 'architecture_gate_approved',
        description: 'Architecture gate = APPROVED',
        check: (ctx) => ctx.architectureGateApproved,
      },
    ],
    VALIDATION: [
      {
        name: 'implementation_completed',
        description: 'Implementation completed',
        check: (ctx) => ctx.implementationCompleted,
      },
      {
        name: 'build_successful',
        description: 'Build successful',
        check: (ctx) => ctx.buildSuccessful,
      },
    ],
    DEBUGGING: [
      {
        name: 'tests_failed',
        description: 'Tests failed - debugging required',
        check: (ctx) => !ctx.testsPassed,
      },
    ],
    REVIEW: [
      {
        name: 'tests_passed',
        description: 'All relevant tests passed',
        check: (ctx) => ctx.testsPassed,
      },
      {
        name: 'regression_checked',
        description: 'Regression checked',
        check: (ctx) => ctx.regressionChecked,
      },
      {
        name: 'diff_reviewed',
        description: 'Diff reviewed',
        check: (ctx) => ctx.diffReviewed,
      },
      {
        name: 'no_unexplained_hardcoding',
        description: 'No unexplained hardcoding',
        check: (ctx) => ctx.noUnexplainedHardcoding,
      },
      {
        name: 'no_known_unresolved_issues',
        description: 'No known unresolved issues',
        check: (ctx) => ctx.noKnownUnresolvedIssues,
      },
    ],
    COMPLETE: [
      {
        name: 'review_approved',
        description: 'Review approved',
        check: (ctx) => true, // Reviewer sets this
      },
    ],
  };

  return gates[phase] ?? [];
}

/**
 * Verifies all gates for a phase transition
 * Mechanical verification - no LLM calls
 */
export function verifyGates(phase: string, context: TaskContext): { passed: boolean; failedGates: string[] } {
  const gates = getGatesForPhase(phase);
  const failedGates: string[] = [];

  for (const gate of gates) {
    if (!gate.check(context)) {
      failedGates.push(gate.name);
    }
  }

  return {
    passed: failedGates.length === 0,
    failedGates,
  };
}

import { computeTaskComplexity, COMPLEXITY_BUDGET_TIERS, type TaskComplexityTier } from '../state-machine/budget.js';

/**
 * Budget limits per AGENTS.md default baseline
 */
export const DEFAULT_BUDGET = {
  research: 3,
  review: 2,
  debug: 5,
  total: 10,
} as const;

/**
 * Checks if budget allows continuing in a phase with Dynamic Caveman Budgeting
 */
export function checkBudget(
  context: TaskContext,
  phase: string,
  tierOverride?: TaskComplexityTier
): { allowed: boolean; reason?: string; tier: TaskComplexityTier } {
  const tier: TaskComplexityTier = tierOverride ?? computeTaskComplexity(
    context.taskType ?? 'FEATURE_INTERNAL',
    context.knowledgeGapsIdentified ? (context.researchResults?.length ?? 0) : 0,
    context.relevantFiles?.length ?? 0
  );

  const budgetLimits = COMPLEXITY_BUDGET_TIERS[tier] ?? DEFAULT_BUDGET;

  switch (phase) {
    case 'RESEARCH':
      if (context.researchRoundsUsed >= budgetLimits.research) {
        return { allowed: false, reason: `Research budget exhausted (${context.researchRoundsUsed}/${budgetLimits.research} rounds for tier ${tier})`, tier };
      }
      return { allowed: true, tier };
    case 'REVIEW':
      if (context.reviewRoundsUsed >= budgetLimits.review) {
        return { allowed: false, reason: `Review budget exhausted (${context.reviewRoundsUsed}/${budgetLimits.review} rounds for tier ${tier})`, tier };
      }
      return { allowed: true, tier };
    case 'DEBUGGING':
      if (context.debugIterationsUsed >= budgetLimits.debug) {
        return { allowed: false, reason: `Debug budget exhausted (${context.debugIterationsUsed}/${budgetLimits.debug} iterations for tier ${tier})`, tier };
      }
      return { allowed: true, tier };
    default:
      return { allowed: true, tier };
  }
}