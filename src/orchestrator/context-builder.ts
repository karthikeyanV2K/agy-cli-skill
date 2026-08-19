import type { TaskContext, ResearchResult, ArchitecturePlan, ConstraintSpec, TestResult, ReviewFinding, FailureRecord, ExtendedTaskType, AgentType, BudgetSnapshot, Assumption, Decision } from '../types/index.js';

/**
 * Context package for each agent - contains only relevant data
 * Per AGENTS.md: "Agents receive controlled context packages, NOT full conversation"
 */

export interface AgentContextPackage {
  agent: AgentType;
  task: string;
  requirements: string[];
  repositorySummary: string;
  relevantFiles: string[];
  researchFindings: ResearchResult[];
  architecturePlan: ArchitecturePlan | null;
  constraints: ConstraintSpec[];
  previousFailures: FailureRecord[];
  testResults: TestResult[];
  reviewerFindings: ReviewFinding[];
  phase: string;
  budget: BudgetSnapshot;
  assumptions: Assumption[];
  decisions: Decision[];
}
export type { BudgetSnapshot, Assumption, Decision } from '../types/index.js';


/**
 * Relevance filters per agent type - determines what data each agent needs
 */
const AGENT_RELEVANCE: Record<AgentType, {
  needsResearch: boolean;
  needsArchitecture: boolean;
  needsTestResults: boolean;
  needsReviewerFindings: boolean;
  needsPreviousFailures: boolean;
  maxFiles: number;
}> = {
  orchestrator: {
    needsResearch: true,
    needsArchitecture: true,
    needsTestResults: true,
    needsReviewerFindings: true,
    needsPreviousFailures: true,
    maxFiles: 50,
  },
  researcher: {
    needsResearch: true,
    needsArchitecture: false,
    needsTestResults: false,
    needsReviewerFindings: false,
    needsPreviousFailures: true,
    maxFiles: 20,
  },
  architect: {
    needsResearch: true,
    needsArchitecture: true,
    needsTestResults: false,
    needsReviewerFindings: true,
    needsPreviousFailures: true,
    maxFiles: 30,
  },
  implementer: {
    needsResearch: false,
    needsArchitecture: true,
    needsTestResults: false,
    needsReviewerFindings: false,
    needsPreviousFailures: true,
    maxFiles: 25,
  },
  validator: {
    needsResearch: false,
    needsArchitecture: true,
    needsTestResults: true,
    needsReviewerFindings: false,
    needsPreviousFailures: true,
    maxFiles: 20,
  },
  debugger: {
    needsResearch: false,
    needsArchitecture: true,
    needsTestResults: true,
    needsReviewerFindings: false,
    needsPreviousFailures: true,
    maxFiles: 15,
  },
  reviewer: {
    needsResearch: true,
    needsArchitecture: true,
    needsTestResults: true,
    needsReviewerFindings: true,
    needsPreviousFailures: true,
    maxFiles: 40,
  },
};

/**
 * Builds a context package for a specific agent
 * Extracts only relevant data per AGENTS.md Context Package Protocol
 */
export function buildContext(
  taskContext: TaskContext,
  agent: AgentType,
  phase: string,
  previousResults: Map<AgentType, unknown>
): AgentContextPackage {
  const relevance = AGENT_RELEVANCE[agent];

  // Extract relevant files based on agent needs
  const relevantFiles = extractRelevantFiles(taskContext, agent, relevance.maxFiles);

  // Filter research findings
  const researchFindings = relevance.needsResearch
    ? taskContext.researchFindings ?? []
    : [];

  // Include architecture plan if needed
  const architecturePlan = relevance.needsArchitecture
    ? taskContext.architecturePlan ?? null
    : null;

  // Include constraints
  const constraints = taskContext.constraints ?? [];

  // Include previous failures if relevant
  const previousFailures = relevance.needsPreviousFailures
    ? taskContext.previousFailures ?? []
    : [];

  // Include test results if relevant
  const testResults = relevance.needsTestResults
    ? taskContext.testResults ?? []
    : [];

  // Include reviewer findings if relevant
  const reviewerFindings = relevance.needsReviewerFindings
    ? taskContext.reviewerFindings ?? []
    : [];

  // Build budget snapshot
  const budget = buildBudgetSnapshot(taskContext);

  // Extract assumptions and decisions from previous results
  const { assumptions, decisions } = extractAssumptionsAndDecisions(previousResults, taskContext);

  return {
    agent,
    task: taskContext.description,
    requirements: extractRequirements(taskContext),
    repositorySummary: buildRepositorySummary(taskContext),
    relevantFiles,
    researchFindings,
    architecturePlan,
    constraints,
    previousFailures,
    testResults,
    reviewerFindings,
    phase,
    budget,
    assumptions,
    decisions,
  };
}

/**
 * Extracts relevant files for the agent based on task context and agent type
 */
function extractRelevantFiles(
  taskContext: TaskContext,
  agent: AgentType,
  maxFiles: number
): string[] {
  // In a real implementation, this would analyze the task and return
  // files relevant to the specific agent's work
  // For now, return empty array - to be populated by actual file discovery
  return [];
}

/**
 * Extracts requirements from task context
 */
function extractRequirements(taskContext: TaskContext): string[] {
  // Parse requirements from task description or metadata
  const requirements = taskContext.metadata?.requirements;
  if (Array.isArray(requirements)) {
    return requirements as string[];
  }
  if (typeof requirements === 'string') {
    return requirements.split('\n').filter(r => r.trim().length > 0);
  }
  return [taskContext.description];
}

/**
 * Builds a repository summary for the context package
 */
function buildRepositorySummary(taskContext: TaskContext): string {
  const summary = taskContext.metadata?.repositorySummary;
  if (typeof summary === 'string') {
    return summary;
  }
  return `Task: ${taskContext.taskType} - ${taskContext.description}`;
}

/**
 * Builds budget snapshot from task context
 */
function buildBudgetSnapshot(taskContext: TaskContext): BudgetSnapshot {
  return {
    research: {
      used: taskContext.researchRoundsUsed ?? 0,
      limit: 3,
    },
    review: {
      used: taskContext.reviewRoundsUsed ?? 0,
      limit: 2,
    },
    debug: {
      used: taskContext.debugIterationsUsed ?? 0,
      limit: 5,
    },
    total: {
      used: (taskContext.researchRoundsUsed ?? 0) +
            (taskContext.reviewRoundsUsed ?? 0) +
            (taskContext.debugIterationsUsed ?? 0),
      limit: 10,
    },
  };
}

/**
 * Extracts assumptions and decisions from previous agent results
 */
function extractAssumptionsAndDecisions(
  previousResults: Map<AgentType, unknown>,
  taskContext: TaskContext
): { assumptions: Assumption[]; decisions: Decision[] } {
  const assumptions: Assumption[] = [];
  const decisions: Decision[] = [];

  // Extract from task context
  if (taskContext.assumptions) {
    assumptions.push(...taskContext.assumptions);
  }
  if (taskContext.decisions) {
    decisions.push(...taskContext.decisions);
  }

  // Extract from previous agent results
  for (const [agent, result] of previousResults) {
    if (result && typeof result === 'object') {
      const res = result as Record<string, unknown>;
      if (Array.isArray(res.assumptions)) {
        assumptions.push(...res.assumptions as Assumption[]);
      }
      if (Array.isArray(res.decisions)) {
        decisions.push(...res.decisions as Decision[]);
      }
    }
  }

  return { assumptions, decisions };
}

/**
 * Creates a minimal context for discovery phase
 */
export function buildDiscoveryContext(
  taskId: string,
  description: string,
  taskType: ExtendedTaskType
): AgentContextPackage {
  return {
    agent: 'orchestrator',
    task: description,
    requirements: [description],
    repositorySummary: 'Initial discovery - repository not yet inspected',
    relevantFiles: [],
    researchFindings: [],
    architecturePlan: null,
    constraints: [],
    previousFailures: [],
    testResults: [],
    reviewerFindings: [],
    phase: 'DISCOVERY',
    budget: {
      research: { used: 0, limit: 3 },
      review: { used: 0, limit: 2 },
      debug: { used: 0, limit: 5 },
      total: { used: 0, limit: 10 },
    },
    assumptions: [],
    decisions: [],
  };
}

/**
 * Updates context after an agent completes its work
 */
export function updateContextAfterAgent(
  context: AgentContextPackage,
  agent: AgentType,
  result: unknown
): AgentContextPackage {
  const updated = { ...context };

  // Update relevant fields based on agent type
  switch (agent) {
    case 'researcher':
      if (result && typeof result === 'object' && 'findings' in result) {
        updated.researchFindings = (result as { findings: ResearchResult[] }).findings;
      }
      break;
    case 'architect':
      if (result && typeof result === 'object' && 'plan' in result) {
        updated.architecturePlan = (result as { plan: ArchitecturePlan | null }).plan;
      }
      break;
    case 'implementer':
      if (result && typeof result === 'object' && 'filesModified' in result) {
        updated.relevantFiles = [
          ...new Set([...updated.relevantFiles, ...(result as { filesModified: string[] }).filesModified])
        ];
      }
      break;
    case 'validator':
      if (result && typeof result === 'object' && 'checks' in result) {
        updated.testResults = (result as { checks: TestResult[] }).checks;
      }
      break;
    case 'debugger':
      if (result && typeof result === 'object' && 'resolution' in result) {
        updated.previousFailures = [
          ...updated.previousFailures,
          (result as { issue: string; resolution?: string; steps: unknown[] }) as FailureRecord
        ];
      }
      break;
    case 'reviewer':
      if (result && typeof result === 'object' && 'findings' in result) {
        updated.reviewerFindings = (result as { findings: ReviewFinding[] }).findings;
      }
      break;
  }

  return updated;
}