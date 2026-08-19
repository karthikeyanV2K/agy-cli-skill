/**
 * AGY CLI - Main Entry Point
 * 
 * Mechanical engineering framework enforcement for AI-assisted development.
 * Implements the state machine: DISCOVERY → RESEARCH → ANALYSIS → PLANNING 
 * → IMPLEMENTATION → VALIDATION → DEBUGGING → REVIEW → COMPLETE
 */

import { loadConfig, getDefaultConfig, type Config } from './config/index.js';
import { Orchestrator } from './orchestrator/index.js';
import { TaskContext, Phase, BudgetSnapshot } from './types/index.js';

export interface CliOptions {
  verbose?: boolean;
  dryRun?: boolean;
  budgetTracking?: boolean;
  config?: string;
  agents?: string;
  type?: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  phase: Phase;
  budget: BudgetSnapshot;
  verification: {
    allGatesPassed: boolean;
    gateResults: Array<{ gate: string; status: string; details: string }>;
  };
  assumptions: any[];
  decisions: any[];
  errors?: string[];
}

export class AgyRuntime {
  private config: Config;
  private orchestrator: Orchestrator | null = null;
  private initialized = false;

  constructor(config?: Config) {
    this.config = config || loadConfig();
  }

  /**
   * Initialize the runtime - load config and create orchestrator
   */
  async initialize(configPath?: string): Promise<void> {
    if (this.initialized) return;
    
    if (configPath) {
      this.config = loadConfig(configPath);
    }
    
    // Import orchestrator dynamically to avoid circular dependencies
    const { Orchestrator } = await import('./orchestrator/index.js');
    
    this.orchestrator = new Orchestrator({
      agents: this.config.orchestrator.agents,
      defaultBudget: this.config.orchestrator.defaultBudget,
      maxConcurrentTasks: this.config.orchestrator.maxConcurrentTasks,
      gateTimeouts: this.config.orchestrator.gateTimeouts,
    });
    
    this.initialized = true;
  }

  /**
   * Execute a task through the full state machine
   */
  async executeTask(description: string, options: CliOptions = {}): Promise<TaskResult> {
    if (!this.initialized) {
      await this.initialize(options.config);
    }

    if (!this.orchestrator) {
      throw new Error('Orchestrator not initialized');
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Create task context
    const taskContext: TaskContext = {
      taskId,
      taskType: options.type || 'feature',
      description,
      phase: 'DISCOVERY',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        cliOptions: options,
        configVersion: this.config.version,
      },
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

    // Execute through orchestrator
    const verification = await this.orchestrator.executeTask(description);

    // Build result
    const result: TaskResult = {
      taskId,
      success: verification.signOff.approved,
      phase: 'COMPLETE',
      budget: verification.finalBudget,
      verification: {
        allGatesPassed: verification.gateResults.every(g => g.status === 'PASSED'),
        gateResults: verification.gateResults.map(g => ({
          gate: g.gate,
          status: g.status,
          details: g.details,
        })),
      },
      assumptions: taskContext.assumptions,
      decisions: taskContext.decisions,
    };

    return result;
  }

  /**
   * Get current configuration
   */
  getConfig(): Config {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): Config {
    return getDefaultConfig();
  }

  /**
   * Save configuration to file
   */
  saveConfig(outputPath?: string): void {
    const { saveConfig } = require('./config/index.js') as { saveConfig: (config: Config, path?: string) => void };
    saveConfig(this.config, outputPath);
  }
}

// Export singleton instance for convenience
let runtimeInstance: AgyRuntime | null = null;

export function getRuntime(config?: Config): AgyRuntime {
  if (!runtimeInstance) {
    runtimeInstance = new AgyRuntime(config);
  }
  return runtimeInstance;
}

export function setRuntime(runtime: AgyRuntime): void {
  runtimeInstance = runtime;
}

// Main CLI entry - delegates to cli.ts
export async function main(args: string[] = process.argv.slice(2)): Promise<number> {
  // This is a placeholder - actual CLI is in cli.ts
  // This allows programmatic usage
  const runtime = getRuntime();
  await runtime.initialize();
  
  if (args.length === 0) {
    console.log('AGY CLI - Use `agy --help` for usage');
    return 0;
  }

  // Simple command routing for programmatic use
  const [command, ...rest] = args;
  
  switch (command) {
    case 'task': {
      const description = rest.join(' ');
      const result = await runtime.executeTask(description);
      console.log(JSON.stringify(result, null, 2));
      return result.success ? 0 : 1;
    }
    case 'config': {
      const config = runtime.getConfig();
      console.log(JSON.stringify(config, null, 2));
      return 0;
    }
    default:
      console.error(`Unknown command: ${command}`);
      return 1;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}