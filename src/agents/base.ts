import type {
  AgentType,
  AgentPermissions,
  AgentConfig,
  BudgetConfig,
  Phase,
  GateStatus,
} from '../types/index.js';

/**
 * Tool Registry Interface
 * Provides controlled access to tools based on agent permissions
 */
export interface ToolRegistry {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  grep: (pattern: string, path?: string) => Promise<string[]>;
  semanticSearch: (query: string, path?: string) => Promise<SearchResult[]>;
  executeShell: (command: string, cwd?: string) => Promise<ShellResult>;
  webSearch: (query: string) => Promise<WebSearchResult[]>;
}

export interface SearchResult {
  file: string;
  line: number;
  snippet: string;
  score: number;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Base result type for agent execution
 */
export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Abstract base class for all agents in the AGY system.
 * Enforces permission-based tool access and provides common infrastructure.
 */
export abstract class Agent {
  public readonly name: string;
  public readonly type: AgentType;
  public readonly permissions: AgentPermissions;
  public readonly config: AgentConfig;
  protected readonly toolRegistry: ToolRegistry;

  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    this.name = config.name;
    this.type = config.type;
    this.permissions = config.permissions;
    this.config = config;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Abstract execute method - each concrete agent must implement its protocol
   * @param context - Controlled task context (not full conversation)
   * @returns AgentResult with execution outcome
   */
  abstract execute(context: TaskContext): Promise<AgentResult>;

  /**
   * Verify that the agent has the required permission for an operation
   * @param required - The permission type to check
   * @param resource - Optional specific resource path
   * @throws Error if permission is not granted
   */
  protected verifyPermissions(
    required: 'read' | 'write' | 'execute' | 'network',
    resource?: string
  ): void {
    const allowedResources = this.permissions[required];
    
    if (!allowedResources || allowedResources.length === 0) {
      throw new Error(
        `Agent ${this.name} (${this.type}) lacks ${required} permission`
      );
    }

    if (resource) {
      const hasAccess = allowedResources.some((pattern) => this.matchPattern(pattern, resource));
      if (!hasAccess) {
        throw new Error(
          `Agent ${this.name} (${this.type}) denied ${required} access to ${resource}`
        );
      }
    }
  }

  /**
   * Get the tool registry for this agent
   * Tools are filtered by permissions at the registry level
   */
  protected getTools(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Check if the agent can transition to a specific phase
   * @param targetPhase - The phase to check
   * @returns True if transition is allowed
   */
  protected canTransitionTo(currentPhase: Phase, targetPhase: Phase): boolean {
    const phaseOrder: Phase[] = [
      'DISCOVERY',
      'RESEARCH',
      'ANALYSIS',
      'PLANNING',
      'IMPLEMENTATION',
      'VALIDATION',
      'DEBUGGING',
      'REVIEW',
      'COMPLETE',
    ];

    const currentIndex = phaseOrder.indexOf(currentPhase);
    const targetIndex = phaseOrder.indexOf(targetPhase);

    // Can only move forward or stay in same phase
    return targetIndex >= currentIndex;
  }

  /**
   * Consume budget for a specific category
   * @param category - Budget category to consume
   * @param amount - Amount to consume
   * @returns True if budget was available and consumed
   */
  protected consumeBudget(category: 'research' | 'review' | 'debug', amount: number): boolean {
    const budget = this.permissions.budget;
    const remaining = budget[category] - (this.config as any).budgetUsed?.[category] || 0;
    
    if (remaining < amount) {
      return false;
    }

    if (!this.config.budgetUsed) {
      (this.config as any).budgetUsed = { research: 0, review: 0, debug: 0 };
    }
    (this.config as any).budgetUsed[category] += amount;
    return true;
  }

  /**
   * Get remaining budget for a category
   */
  protected getRemainingBudget(category: 'research' | 'review' | 'debug'): number {
    const budget = this.permissions.budget;
    const used = (this.config as any).budgetUsed?.[category] || 0;
    return budget[category] - used;
  }

  /**
   * Simple glob pattern matching for permission checks
   */
  private matchPattern(pattern: string, resource: string): boolean {
    if (pattern === '**/*' || pattern === '*') return true;
    
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    
    return new RegExp(`^${regexPattern}$`).test(resource);
  }

  /**
   * Create a standardized success result
   */
  protected success<T>(data: T, metadata?: Record<string, unknown>): AgentResult<T> {
    return { success: true, data, metadata };
  }

  /**
   * Create a standardized error result
   */
  protected failure<T = unknown>(error: string, metadata?: Record<string, unknown>): AgentResult<T> {
    return { success: false, error, metadata };
  }
}

/**
 * Context provided to agent execute() method - controlled subset of full state
 */
export interface TaskContext {
  id: string;
  type: string;
  description: string;
  phase: Phase;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
  
  // Controlled inputs per agent type
  architecturePlan?: any;
  researchResults?: any[];
  repositorySummary?: string;
  constraints?: any[];
  assumptionLedger?: any[];
  decisionLedger?: any[];
  relevantFiles?: string[];
  
  // Budget tracking
  budgetUsed: { research: number; review: number; debug: number };
  budgetRemaining: { research: number; review: number; debug: number };
}

// Re-export for convenience - TaskContext is defined locally above
