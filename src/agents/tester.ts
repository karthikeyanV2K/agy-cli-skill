import { Agent, ToolRegistry, AgentResult, TaskContext } from './base.js';
import type {
  ValidationResult,
  CheckResult,
  CoverageReport,
  ArchitecturePlan,
  AgentConfig,
  ConstraintSpec,
  ImplementationResultExtended,
} from '../types/index.js';

export type ValidationLevel = 
  | 'FORMAT' 
  | 'STATIC_ANALYSIS' 
  | 'BUILD' 
  | 'UNIT_TEST' 
  | 'INTEGRATION_TEST' 
  | 'E2E_TEST' 
  | 'REGRESSION_TEST'
  | 'SECURITY_SCAN'
  | 'QEMU_BOOT'
  | 'KERNEL_TESTS';

export interface ValidationLevelResult {
  level: ValidationLevel;
  passed: boolean;
  details: string;
  duration: number;
  artifacts?: string[];
}

export interface TestStrategy {
  levels: ValidationLevel[];
  projectType: 'rust' | 'node' | 'python' | 'kernel' | 'web' | 'unknown';
  changeType: 'formatting' | 'refactor' | 'feature' | 'api_integration' | 'security' | 'architecture' | 'kernel';
}

export interface TesterContext {
  architecturePlan: ArchitecturePlan;
  implementationResult: ImplementationResultExtended;
  constraints: ConstraintSpec[];
  changeType: string;
  projectType: string;
}

/**
 * Tester Agent
 * Implements the Tester protocol from .agents/agents/tester/agent.md
 * - Determines correct validation level for the change
 * - Runs validation at appropriate levels (FORMAT → STATIC → BUILD → UNIT → INTEGRATION → E2E → REGRESSION)
 * - Uses project-type validation matrices
 * - Output: ValidationResult with per-level results
 */
export class TesterAgent extends Agent {
  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    super(config, toolRegistry);
    if (this.type !== 'validator') {
      throw new Error(`TesterAgent requires type 'validator', got '${this.type}'`);
    }
  }

  async execute(context: TaskContext): Promise<AgentResult<any>> {
    // Use base class execute signature - context is local TaskContext
    this.verifyPermissions('read');
    this.verifyPermissions('execute', 'npm test');
    this.verifyPermissions('execute', 'npm run lint');
    this.verifyPermissions('execute', 'npx tsc --noEmit');
    this.verifyPermissions('write', 'tests/**/*');

    const { metadata } = context;
    const testerContext = metadata as unknown as TesterContext;

    if (!testerContext.architecturePlan) {
      return this.failure('No architecture plan provided');
    }
    if (!testerContext.implementationResult) {
      return this.failure('No implementation result provided');
    }

    // Determine test strategy
    const strategy = this.determineTestStrategy(testerContext);
    
    // Run validation levels
    const levelResults: ValidationLevelResult[] = [];
    const checks: CheckResult[] = [];
    let overallPassed = true;

    for (const level of strategy.levels) {
      if (!this.consumeBudget('review', 1)) {
        return this.failure('Test budget exhausted');
      }

      const startTime = Date.now();
      const result = await this.runValidationLevel(level, testerContext);
      const duration = Date.now() - startTime;

      levelResults.push({ ...result, duration, level });
      
      checks.push({
        name: level,
        passed: result.passed,
        message: result.details,
        severity: result.passed ? 'info' : 'error',
      });

      if (!result.passed) {
        overallPassed = false;
        // Continue running other levels for full picture
      }
    }

    // Calculate coverage
    const coverage = await this.calculateCoverage();

    const result = {
      taskId: context.id,
      passed: overallPassed,
      checks,
      coverage,
      levelResults,
    };

    return this.success(result, {
      strategy: strategy.levels.join(' → '),
      projectType: strategy.projectType,
      changeType: strategy.changeType,
      levelsRun: levelResults.length,
      levelsPassed: levelResults.filter(r => r.passed).length,
      levelResults,
    });
  }

  /**
   * Determine test strategy based on project type and change type
   * Per the Validation Matrices in the protocol
   */
  private determineTestStrategy(context: TesterContext): TestStrategy {
    const projectType = this.detectProjectType(context);
    const changeType = this.classifyChangeType(context);

    let levels: ValidationLevel[] = [];

    // Base levels for all projects
    const baseLevels: ValidationLevel[] = ['FORMAT', 'STATIC_ANALYSIS', 'BUILD', 'UNIT_TEST', 'REGRESSION_TEST'];

    switch (projectType) {
      case 'rust':
      case 'kernel':
        levels = [
          'FORMAT',  // cargo fmt
          'STATIC_ANALYSIS',  // cargo clippy
          'BUILD',  // cargo build
          'UNIT_TEST',  // cargo test
          'INTEGRATION_TEST',
        ];
        if (projectType === 'kernel') {
          levels.push('QEMU_BOOT', 'KERNEL_TESTS');
        }
        levels.push('REGRESSION_TEST');
        break;

      case 'node':
      case 'web':
        levels = [
          'FORMAT',  // npm run fmt / prettier
          'STATIC_ANALYSIS',  // npm run lint / eslint
          'BUILD',  // npm run build / tsc
          'UNIT_TEST',  // npm run test:unit
          'INTEGRATION_TEST',  // npm run test:integration
        ];
        if (changeType === 'api_integration' || changeType === 'feature') {
          levels.push('E2E_TEST');  // npm run test:e2e
        }
        levels.push('REGRESSION_TEST');  // npm run test:regression
        break;

      case 'python':
        levels = [
          'FORMAT',  // black --check
          'STATIC_ANALYSIS',  // ruff check / mypy
          'BUILD',  // (implicit)
          'UNIT_TEST',  // pytest unit
          'INTEGRATION_TEST',  // pytest integration
          'E2E_TEST',  // pytest e2e
          'REGRESSION_TEST',  // pytest --cov
        ];
        break;

      default:
        levels = baseLevels;
    }

    // Adjust for change type
    levels = this.adjustLevelsForChangeType(levels, changeType);

    return { levels, projectType, changeType };
  }

  private detectProjectType(context: TesterContext): TestStrategy['projectType'] {
    // Check package.json for Node
    // Check Cargo.toml for Rust
    // Check pyproject.toml for Python
    // Check for kernel indicators
    
    const files = context.implementationResult.filesCreated.concat(
      context.implementationResult.filesModified
    );

    const hasCargo = files.some((f: string) => f.includes('Cargo.toml')) || 
      context.architecturePlan.dependencies.some((d: string) => d.includes('cargo'));
    const hasPackageJson = files.some((f: string) => f.includes('package.json')) ||
      context.architecturePlan.dependencies.some((d: string) => d.includes('npm'));
    const hasPyProject = files.some((f: string) => f.includes('pyproject.toml') || f.includes('requirements.txt'));
    const hasKernel = files.some((f: string) => f.includes('kernel') || f.includes('driver')) ||
      context.architecturePlan.dependencies.some((d: string) => d.includes('kernel'));

    if (hasKernel) return 'kernel';
    if (hasCargo) return 'rust';
    if (hasPackageJson) return 'node';
    if (hasPyProject) return 'python';
    return 'unknown';
  }

  private classifyChangeType(context: TesterContext): TestStrategy['changeType'] {
    const files = context.implementationResult.filesCreated.concat(
      context.implementationResult.filesModified
    );

    // Check for formatting only
    if (files.every((f: string) => f.endsWith('.md') || f.includes('fmt') || f.includes('prettier'))) {
      return 'formatting';
    }

    // Check for security
    if (context.constraints.some(c => c.type === 'security')) {
      return 'security';
    }

    // Check for architecture change
    if (context.architecturePlan.components.length > 5) {
      return 'architecture';
    }

    // Check for external API
    const hasExternalApi = context.architecturePlan.dependencies.some(d => 
      d.includes('http') || d.includes('api') || d.includes('grpc') || d.includes('rest')
    );
    if (hasExternalApi) {
      return 'api_integration';
    }

    // Check for new feature vs refactor
    if (context.implementationResult.filesCreated.length > 0) {
      return 'feature';
    }
    // (filesCreated exists on ImplementationResultExtended from types)

    return 'refactor';
  }

  private adjustLevelsForChangeType(
    levels: ValidationLevel[], 
    changeType: TestStrategy['changeType']
  ): ValidationLevel[] {
    const adjusted = [...levels];

    switch (changeType) {
      case 'formatting':
        return ['FORMAT'];
      case 'refactor':
        return adjusted.filter(l => !['E2E_TEST', 'SECURITY_SCAN'].includes(l));
      case 'security':
        if (!adjusted.includes('SECURITY_SCAN')) {
          adjusted.splice(adjusted.indexOf('BUILD') + 1, 0, 'SECURITY_SCAN');
        }
        return adjusted;
      case 'architecture':
        if (!adjusted.includes('E2E_TEST')) {
          adjusted.push('E2E_TEST');
        }
        return adjusted;
      case 'api_integration':
        if (!adjusted.includes('E2E_TEST')) {
          adjusted.push('E2E_TEST');
        }
        return adjusted;
      default:
        return adjusted;
    }
  }

  /**
   * Run a specific validation level
   */
  private async runValidationLevel(
    level: ValidationLevel,
    context: TesterContext
  ): Promise<{ passed: boolean; details: string; artifacts?: string[] }> {
    const tools = this.getTools();

    switch (level) {
      case 'FORMAT':
        return this.runFormat(tools);
      case 'STATIC_ANALYSIS':
        return this.runStaticAnalysis(tools, context);
      case 'BUILD':
        return this.runBuild(tools);
      case 'UNIT_TEST':
        return this.runUnitTests(tools);
      case 'INTEGRATION_TEST':
        return this.runIntegrationTests(tools);
      case 'E2E_TEST':
        return this.runE2ETests(tools);
      case 'REGRESSION_TEST':
        return this.runRegressionTests(tools);
      case 'SECURITY_SCAN':
        return this.runSecurityScan(tools);
      case 'QEMU_BOOT':
        return this.runQemuBoot(tools);
      case 'KERNEL_TESTS':
        return this.runKernelTests(tools);
      default:
        return { passed: false, details: `Unknown validation level: ${level}` };
    }
  }

  private async runFormat(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('npm run fmt --check');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Formatting check passed' : result.stderr,
    };
  }

  private async runStaticAnalysis(
    tools: ToolRegistry, 
    context: TesterContext
  ): Promise<{ passed: boolean; details: string }> {
    // Try multiple static analysis tools
    const commands = [
      'npm run lint',
      'npx tsc --noEmit',
      'npx eslint .',
    ];

    for (const cmd of commands) {
      const result = await tools.executeShell(cmd);
      if (result.exitCode !== 0) {
        return { passed: false, details: `${cmd} failed: ${result.stderr}` };
      }
    }

    return { passed: true, details: 'Static analysis passed' };
  }

  private async runBuild(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('npm run build');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Build successful' : result.stderr,
    };
  }

  private async runUnitTests(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('npm run test:unit');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Unit tests passed' : result.stderr,
    };
  }

  private async runIntegrationTests(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('npm run test:integration');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Integration tests passed' : result.stderr,
    };
  }

  private async runE2ETests(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('npm run test:e2e');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'E2E tests passed' : result.stderr,
    };
  }

  private async runRegressionTests(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('npm run test:regression');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Regression tests passed' : result.stderr,
    };
  }

  private async runSecurityScan(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('npm audit');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'No vulnerabilities found' : result.stdout,
    };
  }

  private async runQemuBoot(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    // Kernel-specific - would run QEMU
    const result = await tools.executeShell('cargo run --example qemu_boot 2>&1 | head -20');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'QEMU boot successful' : result.stderr,
    };
  }

  private async runKernelTests(tools: ToolRegistry): Promise<{ passed: boolean; details: string }> {
    const result = await tools.executeShell('cargo test --test kernel_tests');
    return {
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Kernel tests passed' : result.stderr,
    };
  }

  private async calculateCoverage(): Promise<CoverageReport> {
    // Would run coverage tool and parse results
    // For now, return default
    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    };
  }
}

/**
 * Factory function to create TesterAgent with default config
 */
export function createTesterAgent(toolRegistry: ToolRegistry): TesterAgent {
  const config: AgentConfig = {
    type: 'validator',
    name: 'tester',
    permissions: {
      read: ['**/*'],
      write: ['tests/**/*'],
      execute: ['npm test', 'npm run lint', 'npx tsc --noEmit', 'cargo test', 'cargo clippy'],
      network: [],
      budget: { research: 0, review: 1, debug: 1, total: 2 },
    },
    model: 'claude-4-5-sonnet',
  };
  return new TesterAgent(config, toolRegistry);
}