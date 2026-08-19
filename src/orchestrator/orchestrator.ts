import { v4 as uuidv4 } from 'uuid';
import type { TaskContext, Phase, GateStatus, ResearchResult, ArchitecturePlan, FinalVerification, GateResult, BudgetSnapshot, SignOff, Assumption, Decision, ConstraintSpec, TestResult, ReviewFinding, FailureRecord, AgentConfig, BudgetConfig, ExtendedTaskType } from '../types/index.js';
import { classifyTask, toBaseTaskType } from './task-classifier.js';
import { getChainForTask, verifyGates, checkBudget, DEFAULT_BUDGET, type AgentType } from './agent-chain.js';
import { buildContext, buildDiscoveryContext, updateContextAfterAgent, AgentContextPackage } from './context-builder.js';

/**
 * Orchestrator state for a single task execution
 */
export interface OrchestratorState {
  taskId: string;
  description: string;
  taskType: ExtendedTaskType;
baseTaskType: TaskContext['taskType'];
  phase: Phase;
  agentChain: readonly AgentType[];
  currentAgentIndex: number;
  context: AgentContextPackage;
taskContext: TaskContext;
  previousResults: Map<AgentType, unknown>;
  assumptions: Assumption[];
  decisions: Decision[];
  gateHistory: GateResult[];
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'blocked' | 'failed';
  error?: string;
}

/**
 * Configuration for the Orchestrator
 */
export interface OrchestratorConfig {
  agents: AgentConfig[];
  defaultBudget: BudgetConfig;
  maxConcurrentTasks: number;
  gateTimeouts: Record<string, number>;
  traceStorage: string;
}

/**
 * Default orchestrator configuration per AGENTS.md
 */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  agents: [
    { type: 'orchestrator', name: 'Orchestrator', permissions: { read: ['*'], write: ['*'], execute: ['*'], network: [], budget: { research: 3, review: 2, debug: 5, total: 10 } } },
    { type: 'researcher', name: 'Researcher', permissions: { read: ['*'], write: [], execute: [], network: ['*'], budget: { research: 3, review: 0, debug: 0, total: 3 } } },
    { type: 'architect', name: 'Architect', permissions: { read: ['*'], write: [], execute: [], network: [], budget: { research: 0, review: 0, debug: 0, total: 0 } } },
    { type: 'implementer', name: 'Implementer', permissions: { read: ['*'], write: ['*'], execute: ['*'], network: [], budget: { research: 0, review: 0, debug: 5, total: 5 } } },
    { type: 'validator', name: 'Validator', permissions: { read: ['*'], write: ['tests'], execute: ['*'], network: [], budget: { research: 0, review: 0, debug: 0, total: 0 } } },
    { type: 'debugger', name: 'Debugger', permissions: { read: ['*'], write: ['*'], execute: ['*'], network: [], budget: { research: 0, review: 0, debug: 5, total: 5 } } },
    { type: 'reviewer', name: 'Reviewer', permissions: { read: ['*'], write: [], execute: ['*'], network: [], budget: { research: 0, review: 2, debug: 0, total: 2 } } },
  ],
  defaultBudget: { research: 3, review: 2, debug: 5, total: 10 },
  maxConcurrentTasks: 4,
  gateTimeouts: {
    DISCOVERY: 60,
    RESEARCH: 300,
    ANALYSIS: 180,
    PLANNING: 180,
    IMPLEMENTATION: 600,
    VALIDATION: 300,
    DEBUGGING: 300,
    REVIEW: 300,
    COMPLETE: 60,
  },
  traceStorage: '.agy/traces/',
};

/**
 * Main Orchestrator class
 * Enforces AGENTS.md state machine and gate verification mechanically
 * No LLM calls in gate checks
 */
export class Orchestrator {
  private config: OrchestratorConfig;
  private state: OrchestratorState | null = null;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config };
  }

  /**
   * Executes a task through the full state machine
   * DISCOVERY → RESEARCH → ANALYSIS → PLANNING → IMPLEMENTATION → VALIDATION → DEBUGGING → REVIEW → COMPLETE
   * With rejection transitions as per AGENTS.md
   */
  async executeTask(description: string): Promise<FinalVerification> {
    // Initialize state
    this.state = this.initializeState(description);

    try {
      // Run through all phases
      await this.runPhase('DISCOVERY');
      await this.runPhase('RESEARCH');
      await this.runPhase('ANALYSIS');
      await this.runPhase('PLANNING');
      await this.runPhase('IMPLEMENTATION');
      await this.runPhase('VALIDATION');
      await this.runPhase('DEBUGGING');
      await this.runPhase('REVIEW');
      await this.runPhase('COMPLETE');

      this.state.status = 'completed';
      this.state.endTime = new Date();

      return this.produceFinalVerification();
    } catch (error) {
      this.state.status = 'failed';
      this.state.endTime = new Date();
      this.state.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Initializes orchestrator state for a new task
   */
  private initializeState(description: string): OrchestratorState {
    const taskId = uuidv4();
    const taskType = classifyTask(description);
    const baseTaskType = toBaseTaskType(taskType);
    const agentChain = getChainForTask(taskType);

    const discoveryContext = buildDiscoveryContext(taskId, description, taskType);

const now = new Date();
const taskContext: TaskContext = {
      taskId,
      taskType,
      description,
      phase: 'DISCOVERY',
      createdAt: now,
      updatedAt: now,
      metadata: {},
      repositoryInspected: false,
      requirementsDecomposed: false,
      knowledgeGapsIdentified: false,
      researchCompleted: false,
      researchCrossValidated: false,
      architecturePlanCreated: false,
      architectureGateApproved: false,
      implementationCompleted: false,
      buildSuccessful: false,
      testsPassed: false,
      regressionChecked: false,
      diffReviewed: false,
      noUnexplainedHardcoding: false,
      noKnownUnresolvedIssues: false,
      researchRoundsUsed: 0,
      reviewRoundsUsed: 0,
      debugIterationsUsed: 0,
      assumptions: [],
      decisions: [],
    };

    return {
      taskId,
      description,
      taskType,
      baseTaskType,
      phase: 'DISCOVERY',
      agentChain,
      currentAgentIndex: 0,
      context: discoveryContext,
      taskContext,
      previousResults: new Map(),
      assumptions: [],
      decisions: [],
      gateHistory: [],
      startTime: new Date(),
      status: 'running',
    };
  }

  /**
   * Runs a single phase with gate verification
   */
  private async runPhase(phase: Phase): Promise<void> {
    if (!this.state) throw new Error('Orchestrator not initialized');

    // Verify gates before entering phase (except DISCOVERY)
    if (phase !== 'DISCOVERY') {
      const gateResult = verifyGates(phase, this.state.taskContext);
this.state.gateHistory.push(...gateResult.failedGates.map((g: string) => ({
        gate: g,
        status: 'FAILED' as GateStatus,
        details: `Gate ${g} failed for phase ${phase}`,
      })));

      if (!gateResult.passed) {
        // Handle rejection transitions
        const rejectionPhase = this.getRejectionTarget(phase);
        if (rejectionPhase) {
          await this.handleRejection(phase, rejectionPhase, gateResult.failedGates);
          return;
        }
        throw new Error(`Gate verification failed for phase ${phase}: ${gateResult.failedGates.join(', ')}`);
      }

      // Record passed gates
      const gatesForPhase = this.getGatesForPhase(phase);
      for (const gate of gatesForPhase) {
        this.state.gateHistory.push({
          gate: gate.name,
          status: 'PASSED',
          details: gate.description,
        });
      }
    }

    // Check budget
    const budgetCheck = checkBudget(this.state.taskContext, phase);
    if (!budgetCheck.allowed) {
      this.state.status = 'blocked';
      throw new Error(budgetCheck.reason ?? `Budget exhausted for phase ${phase}`);
    }

    this.state.phase = phase;
    this.state.context = { ...this.state.context, phase };

    // Spawn and run agents for this phase
    await this.runAgentsForPhase(phase);
  }

  /**
   * Gets the rejection target phase per AGENTS.md
   */
  private getRejectionTarget(phase: Phase): Phase | null {
    const rejectionMap: Record<Phase, Phase | null> = {
      DISCOVERY: null,
      RESEARCH: 'RESEARCH',
      ANALYSIS: 'RESEARCH',
      PLANNING: 'RESEARCH',
      IMPLEMENTATION: 'PLANNING',
      VALIDATION: 'DEBUGGING',
      DEBUGGING: 'DEBUGGING',
      REVIEW: 'IMPLEMENTATION',
      COMPLETE: null,
    };
    return rejectionMap[phase] ?? null;
  }

  /**
   * Handles rejection by transitioning to earlier phase
   */
  private async handleRejection(fromPhase: Phase, toPhase: Phase, failedGates: string[]): Promise<void> {
    if (!this.state) throw new Error('Orchestrator not initialized');

    // Log rejection
    this.state.gateHistory.push({
      gate: `rejection_${fromPhase}_to_${toPhase}`,
      status: 'FAILED',
      details: `Rejected from ${fromPhase} to ${toPhase}: ${failedGates.join(', ')}`,
    });

    // Increment appropriate budget counter
    if (toPhase === 'RESEARCH') {
      this.state.taskContext.researchRoundsUsed++;
    } else if (toPhase === 'REVIEW') {
      this.state.taskContext.reviewRoundsUsed++;
    } else if (toPhase === 'DEBUGGING') {
      this.state.taskContext.debugIterationsUsed++;
    }

    // Reset phase-specific flags
    this.resetPhaseFlags(toPhase);

    // Re-run from rejection target
    await this.runPhase(toPhase);
  }

  /**
   * Resets phase-specific flags when rejected back
   */
  private resetPhaseFlags(targetPhase: Phase): void {
    if (!this.state) return;

    switch (targetPhase) {
      case 'RESEARCH':
        this.state.taskContext.researchCompleted = false;
        this.state.taskContext.researchCrossValidated = false;
        this.state.taskContext.architecturePlanCreated = false;
        this.state.taskContext.architectureGateApproved = false;
        // Fall through
      case 'ANALYSIS':
        this.state.taskContext.knowledgeGapsIdentified = false;
        // Fall through
      case 'PLANNING':
        this.state.taskContext.implementationCompleted = false;
        this.state.taskContext.buildSuccessful = false;
        // Fall through
      case 'IMPLEMENTATION':
        this.state.taskContext.testsPassed = false;
        this.state.taskContext.regressionChecked = false;
        this.state.taskContext.diffReviewed = false;
        this.state.taskContext.noUnexplainedHardcoding = false;
        this.state.taskContext.noKnownUnresolvedIssues = false;
        break;
    }
  }

  /**
   * Runs all agents assigned to a phase
   */
  private async runAgentsForPhase(phase: Phase): Promise<void> {
    if (!this.state) throw new Error('Orchestrator not initialized');

    const agentsForPhase = this.getAgentsForPhase(phase);

    for (const agent of agentsForPhase) {
      // Find agent in chain
      const agentIndex = this.state.agentChain.indexOf(agent);
      if (agentIndex === -1) continue;

      this.state.currentAgentIndex = agentIndex;

      // Build context for this agent
      this.state.context = buildContext(
        this.state.taskContext as unknown as TaskContext,
        agent,
        phase,
        this.state.previousResults
      );

      // Spawn agent (in real implementation, this would call the actual agent)
      const result = await this.spawnAgent(agent, this.state.context);

      // Store result
      this.state.previousResults.set(agent, result);

      // Update context with agent results
      this.state.context = updateContextAfterAgent(this.state.context, agent, result);

      // Update task context based on agent results
      this.updateTaskContextFromAgent(agent, result);
    }
  }

  /**
   * Gets agents that should run in a given phase
   */
  private getAgentsForPhase(phase: Phase): AgentType[] {
    const phaseAgentMap: Record<Phase, AgentType[]> = {
      DISCOVERY: ['orchestrator'],
      RESEARCH: ['researcher'],
      ANALYSIS: ['architect'],
      PLANNING: ['architect'],
      IMPLEMENTATION: ['implementer'],
      VALIDATION: ['validator'],
      DEBUGGING: ['debugger'],
      REVIEW: ['reviewer'],
      COMPLETE: ['orchestrator'],
    };
    return phaseAgentMap[phase] ?? [];
  }

  /**
   * Spawns an agent with the given context
   * In real implementation, this would invoke the actual agent process
   */
  private async spawnAgent(agent: AgentType, context: AgentContextPackage): Promise<unknown> {
    // This is a stub - in real implementation, would spawn actual agent
    // For now, return mock results based on agent type
    switch (agent) {
      case 'orchestrator':
        if (this.state?.phase === 'DISCOVERY') {
          return this.mockDiscoveryResult();
        }
        if (this.state?.phase === 'COMPLETE') {
          return this.mockCompleteResult();
        }
        break;
      case 'researcher':
        return this.mockResearchResult();
      case 'architect':
        return this.mockArchitectureResult();
      case 'implementer':
        return this.mockImplementationResult();
      case 'validator':
        return this.mockValidationResult();
      case 'debugger':
        return this.mockDebugResult();
      case 'reviewer':
        return this.mockReviewResult();
    }
    return {};
  }

  /**
   * Updates task context flags based on agent results
   * Mechanical updates - no LLM calls
   */
  private updateTaskContextFromAgent(agent: AgentType, result: unknown): void {
    if (!this.state) return;

    switch (agent) {
      case 'orchestrator':
        if (this.state.phase === 'DISCOVERY') {
          this.state.taskContext.repositoryInspected = true;
          this.state.taskContext.requirementsDecomposed = true;
        }
        break;
      case 'researcher':
        if (result && typeof result === 'object' && 'completed' in result) {
          this.state.taskContext.researchCompleted = (result as { completed: boolean }).completed;
        }
        if (result && typeof result === 'object' && 'crossValidated' in result) {
          this.state.taskContext.researchCrossValidated = (result as { crossValidated: boolean }).crossValidated;
        }
        this.state.taskContext.researchRoundsUsed++;
        break;
      case 'architect':
        if (result && typeof result === 'object' && 'planCreated' in result) {
          this.state.taskContext.architecturePlanCreated = (result as { planCreated: boolean }).planCreated;
        }
        if (result && typeof result === 'object' && 'gateApproved' in result) {
          this.state.taskContext.architectureGateApproved = (result as { gateApproved: boolean }).gateApproved;
        }
        if (result && typeof result === 'object' && 'gapsIdentified' in result) {
          this.state.taskContext.knowledgeGapsIdentified = (result as { gapsIdentified: boolean }).gapsIdentified;
        }
        break;
      case 'implementer':
        if (result && typeof result === 'object' && 'completed' in result) {
          this.state.taskContext.implementationCompleted = (result as { completed: boolean }).completed;
        }
        if (result && typeof result === 'object' && 'buildSuccess' in result) {
          this.state.taskContext.buildSuccessful = (result as { buildSuccess: boolean }).buildSuccess;
        }
        break;
      case 'validator':
        if (result && typeof result === 'object' && 'passed' in result) {
          this.state.taskContext.testsPassed = (result as { passed: boolean }).passed;
        }
        break;
      case 'debugger':
        this.state.taskContext.debugIterationsUsed++;
        if (result && typeof result === 'object' && 'resolved' in result) {
          this.state.taskContext.testsPassed = (result as { resolved: boolean }).resolved;
        }
        break;
      case 'reviewer':
        this.state.taskContext.reviewRoundsUsed++;
        if (result && typeof result === 'object') {
          const res = result as Record<string, unknown>;
          if (typeof res.regressionChecked === 'boolean') this.state.taskContext.regressionChecked = res.regressionChecked;
          if (typeof res.diffReviewed === 'boolean') this.state.taskContext.diffReviewed = res.diffReviewed;
          if (typeof res.noHardcoding === 'boolean') this.state.taskContext.noUnexplainedHardcoding = res.noHardcoding;
          if (typeof res.noUnresolvedIssues === 'boolean') this.state.taskContext.noKnownUnresolvedIssues = res.noUnresolvedIssues;
        }
        break;
    }
  }

  /**
   * Gets gate definitions for a phase
   */
  private getGatesForPhase(phase: Phase): { name: string; description: string }[] {
    const gates: Record<Phase, { name: string; description: string }[]> = {
      DISCOVERY: [],
      RESEARCH: [
        { name: 'repository_inspected', description: 'Repository inspection completed' },
        { name: 'requirements_decomposed', description: 'Requirements decomposed into actionable items' },
      ],
      ANALYSIS: [
        { name: 'knowledge_gaps_identified', description: 'Knowledge gaps identified and classified' },
      ],
      PLANNING: [
        { name: 'research_completed', description: 'Required research completed with evidence' },
        { name: 'research_cross_validated', description: 'Research findings cross-validated with codebase' },
      ],
      IMPLEMENTATION: [
        { name: 'architecture_plan_created', description: 'Architecture plan created' },
        { name: 'architecture_gate_approved', description: 'Architecture gate = APPROVED' },
      ],
      VALIDATION: [
        { name: 'implementation_completed', description: 'Implementation completed' },
        { name: 'build_successful', description: 'Build successful' },
      ],
      DEBUGGING: [
        { name: 'tests_failed', description: 'Tests failed - debugging required' },
      ],
      REVIEW: [
        { name: 'tests_passed', description: 'All relevant tests passed' },
        { name: 'regression_checked', description: 'Regression checked' },
        { name: 'diff_reviewed', description: 'Diff reviewed' },
        { name: 'no_unexplained_hardcoding', description: 'No unexplained hardcoding' },
        { name: 'no_known_unresolved_issues', description: 'No known unresolved issues' },
      ],
      COMPLETE: [
        { name: 'review_approved', description: 'Review approved' },
      ],
    };
    return gates[phase] ?? [];
  }

  /**
   * Produces final verification report
   */
  private produceFinalVerification(): FinalVerification {
    if (!this.state) throw new Error('Orchestrator not initialized');

    const allGatesPassed = this.state.gateHistory.every(g => g.status === 'PASSED');

    return {
      taskId: this.state.taskId,
      allGatesPassed,
      gateResults: this.state.gateHistory,
      finalBudget: {
        research: { used: this.state.taskContext.researchRoundsUsed, limit: DEFAULT_BUDGET.research },
        review: { used: this.state.taskContext.reviewRoundsUsed, limit: DEFAULT_BUDGET.review },
        debug: { used: this.state.taskContext.debugIterationsUsed, limit: DEFAULT_BUDGET.debug },
        total: {
          used: this.state.taskContext.researchRoundsUsed +
                this.state.taskContext.reviewRoundsUsed +
                this.state.taskContext.debugIterationsUsed,
          limit: DEFAULT_BUDGET.total,
        },
      },
      signOff: {
        approved: allGatesPassed && this.state.status === 'completed',
        approver: 'orchestrator',
        timestamp: new Date(),
        conditions: allGatesPassed ? undefined : this.state.gateHistory
          .filter(g => g.status === 'FAILED')
          .map(g => g.gate),
      },
    };
  }

  // Mock result generators for testing
  private mockDiscoveryResult(): { repositoryInspected: boolean; requirementsDecomposed: boolean } {
    return { repositoryInspected: true, requirementsDecomposed: true };
  }

  private mockResearchResult(): { completed: boolean; crossValidated: boolean; findings: ResearchResult[] } {
    return { completed: true, crossValidated: true, findings: [] };
  }

  private mockArchitectureResult(): { planCreated: boolean; gateApproved: boolean; gapsIdentified: boolean } {
    return { planCreated: true, gateApproved: true, gapsIdentified: true };
  }

  private mockImplementationResult(): { completed: boolean; buildSuccess: boolean; filesModified: string[] } {
    return { completed: true, buildSuccess: true, filesModified: [] };
  }

  private mockValidationResult(): { passed: boolean; checks: TestResult[] } {
    return { passed: true, checks: [] };
  }

  private mockDebugResult(): { resolved: boolean } {
    return { resolved: true };
  }

  private mockReviewResult(): { regressionChecked: boolean; diffReviewed: boolean; noHardcoding: boolean; noUnresolvedIssues: boolean; approved: boolean } {
    return { regressionChecked: true, diffReviewed: true, noHardcoding: true, noUnresolvedIssues: true, approved: true };
  }

  private mockCompleteResult(): { allChecksPassed: boolean } {
    return { allChecksPassed: true };
  }

  /**
   * Gets current orchestrator state
   */
  getState(): OrchestratorState | null {
    return this.state;
  }
}