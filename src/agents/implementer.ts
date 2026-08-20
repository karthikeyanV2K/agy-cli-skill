import { Agent, ToolRegistry, AgentResult, TaskContext } from './base.js';
import type {
  ArchitecturePlan,
  ComponentSpec,
  Assumption,
  Decision,
  AgentConfig,
  ConstraintSpec,
  ImplementationResult,
} from '../types/index.js';
import type { ResearchResultExtended } from './researcher.js';

export interface WhyMapping {
  file: string;
  function?: string;
  approach: string;
  dependency?: string;
  behavior?: string;
  test?: string;
  evidence: string;
}

export interface ImplementationResultExtended extends ImplementationResult {
  whyMappings: WhyMapping[];
  assumptionsHonored: string[];
  decisionsFollowed: string[];
  qualityGates: QualityGateResult[];
}

export interface QualityGateResult {
  gate: 'COMPILE' | 'LINT' | 'FORMAT' | 'UNIT_TEST' | 'WARNINGS';
  passed: boolean;
  details: string;
}

export interface ImplementationContext {
  architecturePlan: ArchitecturePlan;
  researchFindings: ResearchResultExtended[];
  repositorySummary: string;
  constraints: ConstraintSpec[];
  assumptionLedger: Assumption[];
  decisionLedger: Decision[];
  relevantFiles: string[];
}

/**
 * Implementer Agent
 * Implements the Implementer protocol from .agents/agents/implementer/agent.md
 * - Implements features per Architecture Plan
 * - Answers WHY questions for every change
 * - Uses: readFile, writeFile, executeShell (build/lint/test)
 * - Output: ImplementationResult with diff and WHY mapping
 */
export class ImplementerAgent extends Agent {
  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    super(config, toolRegistry);
    if (this.type !== 'implementer') {
      throw new Error(`ImplementerAgent requires type 'implementer', got '${this.type}'`);
    }
  }

  async execute(context: TaskContext): Promise<AgentResult<ImplementationResultExtended>> {
    // Use base class execute signature - context is local TaskContext
    this.verifyPermissions('read');
    this.verifyPermissions('write', 'src/**/*');
    this.verifyPermissions('write', 'tests/**/*');
    this.verifyPermissions('execute', 'npm test');
    this.verifyPermissions('execute', 'npm run build');
    this.verifyPermissions('execute', 'npx tsc*');

    const { metadata } = context;
    const implContext = metadata as unknown as ImplementationContext;

    if (!implContext.architecturePlan) {
      return this.failure('No architecture plan provided - cannot implement');
    }

    // Verify Architecture Gate is APPROVED
    if (implContext.architecturePlan && !(implContext.architecturePlan as any).gateApproved) {
      return this.failure('Architecture Gate not APPROVED - implementation forbidden');
    }

    const whyMappings: WhyMapping[] = [];
    const filesCreated: string[] = [];
    const filesModified: string[] = [];
    const qualityGates: QualityGateResult[] = [];

    try {
      // Implement each component from architecture plan
      for (const component of implContext.architecturePlan.components) {
        if (!this.consumeBudget('debug', 1)) {
          return this.failure('Implementation budget exhausted');
        }

        const result = await this.implementComponent(
          component,
          implContext,
          whyMappings
        );
        
        if (result.created) filesCreated.push(...result.created);
        if (result.modified) filesModified.push(...result.modified);
      }

      // Run quality gates
      qualityGates.push(await this.runCompileCheck());
      qualityGates.push(await this.runLintCheck());
      qualityGates.push(await this.runFormatCheck());
      qualityGates.push(await this.runUnitTests());
      qualityGates.push(await this.runWarningCheck());

      const allPassed = qualityGates.every(g => g.passed);
      if (!allPassed) {
        return this.failure('Quality gates failed', { qualityGates });
      }

      const result: ImplementationResultExtended = {
        taskId: context.id,
        filesCreated,
        filesModified,
        testsAdded: [], // Would be populated by test implementation
        linesAdded: this.countLinesAdded(filesCreated, filesModified),
        linesRemoved: 0,
        compileErrors: [],
        whyMappings,
        assumptionsHonored: implContext.assumptionLedger
          .filter(a => a.validated)
          .map(a => a.id),
        decisionsFollowed: implContext.decisionLedger.map(d => d.id),
        qualityGates,
      };

      return this.success(result, {
        componentsImplemented: implContext.architecturePlan.components.length,
        qualityGatesPassed: qualityGates.filter(g => g.passed).length,
      });

    } catch (error) {
      return this.failure(`Implementation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Implement a single component per the architecture plan
   */
  private async implementComponent(
    component: ComponentSpec,
    context: ImplementationContext,
    whyMappings: WhyMapping[]
  ): Promise<{ created: string[]; modified: string[] }> {
    const tools = this.getTools();
    const created: string[] = [];
    const modified: string[] = [];

    // Determine target file(s) for this component
    const targetFiles = this.resolveTargetFiles(component, context.relevantFiles);

    for (const targetFile of targetFiles) {
      const existingContent = await tools.readFile(targetFile).catch(() => null);
      const isNew = !existingContent;

      // Generate implementation based on component spec
      const newContent = await this.generateImplementation(
        component,
        context,
        existingContent || ''
      );

      // Answer WHY questions before writing
      const whyAnswers = this.answerWhyQuestions(component, targetFile, context);
      whyMappings.push(...whyAnswers);

      // Write file
      if (isNew) {
        await tools.writeFile(targetFile, newContent);
        created.push(targetFile);
      } else {
        await tools.writeFile(targetFile, newContent);
        modified.push(targetFile);
      }
    }

    return { created, modified };
  }

  /**
   * Answer mandatory WHY questions before making changes
   */
  private answerWhyQuestions(
    component: ComponentSpec,
    targetFile: string,
    context: ImplementationContext
  ): WhyMapping[] {
    const mappings: WhyMapping[] = [];

    // WHY THIS FILE?
    mappings.push({
      file: targetFile,
      approach: 'File selected per Architecture Plan affected components',
      evidence: `Architecture Plan specifies ${component.name} as affected component`,
    });

    // WHY THIS APPROACH?
    const relevantResearch = context.researchFindings.find(r => 
      r.findings.some(f => f.content.includes(component.name))
    );
    mappings.push({
      file: targetFile,
      approach: 'Implementation follows recommended approach from research',
      evidence: relevantResearch?.recommendedApproach || 'Based on architectural patterns',
    });

    // WHY THESE DEPENDENCIES?
    if (component.dependencies.length > 0) {
      mappings.push({
        file: targetFile,
        dependency: component.dependencies.join(', '),
        approach: 'Dependencies match Architecture Plan component specification',
        evidence: `Architecture Plan component.dependencies: ${component.dependencies.join(', ')}`,
      });
    }

    // WHY THIS BEHAVIOR?
    for (const responsibility of component.responsibilities) {
      mappings.push({
        file: targetFile,
        behavior: responsibility,
        approach: 'Behavior implements component responsibility from Architecture Plan',
        evidence: `Architecture Plan component.responsibilities includes: ${responsibility}`,
      });
    }

    return mappings;
  }

  /**
   * Generate implementation code for a component
   */
  private async generateImplementation(
    component: ComponentSpec,
    context: ImplementationContext,
    existingContent: string
  ): Promise<string> {
    // This is a simplified implementation generator
    // In practice, this would use an LLM with the full context
    
    const header = this.generateFileHeader(component, context);
    const imports = this.generateImports(component, context);
    const body = this.generateComponentBody(component, context);
    const exports = this.generateExports(component);

    return `${header}\n\n${imports}\n\n${body}\n\n${exports}`;
  }

  private generateFileHeader(component: ComponentSpec, context: ImplementationContext): string {
    return `/**
 * ${component.name}
 * ${component.responsibilities.join('; ')}
 * 
 * AUTO-GENERATED by Implementer Agent
 * Architecture Plan: ${context.architecturePlan.taskId}
 * DO NOT EDIT MANUALLY - Changes will be overwritten
 */`;
  }

  private generateImports(component: ComponentSpec, context: ImplementationContext): string {
    const imports: string[] = [];

    // Add dependencies as imports
    for (const dep of component.dependencies) {
      if (dep.startsWith('.')) {
        imports.push(`import { } from '${dep}';`);
      } else {
        imports.push(`import { } from '${dep}';`);
      }
    }

    // Add types from architecture plan interfaces
    for (const iface of context.architecturePlan.interfaces) {
      imports.push(`import type { ${iface.name} } from './interfaces';`);
    }

    return imports.join('\n');
  }

  private generateComponentBody(component: ComponentSpec, context: ImplementationContext): string {
    const lines: string[] = [];

    // Generate class or module based on type
    if (component.type === 'class') {
      lines.push(`export class ${this.toClassName(component.name)} {`);
      lines.push('  constructor() {}');
      
      for (const responsibility of component.responsibilities) {
        const methodName = this.toMethodName(responsibility);
        lines.push(`  async ${methodName}(): Promise<void> {`);
        lines.push(`    // TODO: Implement ${responsibility}`);
        lines.push(`    throw new Error('Not implemented: ${responsibility}');`);
        lines.push(`  }`);
        lines.push('');
      }
      
      lines.push('}');
    } else {
      // Module with functions
      for (const responsibility of component.responsibilities) {
        const funcName = this.toMethodName(responsibility);
        lines.push(`export async function ${funcName}(): Promise<void> {`);
        lines.push(`  // TODO: Implement ${responsibility}`);
        lines.push(`  throw new Error('Not implemented: ${responsibility}');`);
        lines.push(`}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private generateExports(component: ComponentSpec): string {
    if (component.type === 'class') {
      return `export default ${this.toClassName(component.name)};`;
    }
    return '';
  }

  private resolveTargetFiles(component: ComponentSpec, relevantFiles: string[]): string[] {
    // Map component to actual file paths
    const mapped = relevantFiles.filter(f => 
      f.includes(component.name) || component.name.includes(f)
    );
    
    if (mapped.length > 0) return mapped;
    
    // Default: create new file in src/
    const baseName = component.name.replace(/[\\/]/g, '-');
    return [`src/${baseName}.ts`];
  }

  private toClassName(name: string): string {
    return name
      .split(/[\\/-]/)
      .pop()!
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^\w/, c => c.toUpperCase());
  }

  private toMethodName(responsibility: string): string {
    return responsibility
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private countLinesAdded(created: string[], modified: string[]): number {
    // Simplified - would actually count diff lines
    return (created.length + modified.length) * 50;
  }

  // Quality gate implementations
  private async runCompileCheck(): Promise<QualityGateResult> {
    const tools = this.getTools();
    const result = await tools.executeShell('npx tsc --noEmit');
    return {
      gate: 'COMPILE',
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'TypeScript compilation successful' : result.stderr,
    };
  }

  private async runLintCheck(): Promise<QualityGateResult> {
    const tools = this.getTools();
    const result = await tools.executeShell('npm run lint');
    return {
      gate: 'LINT',
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Linting passed' : result.stderr,
    };
  }

  private async runFormatCheck(): Promise<QualityGateResult> {
    const tools = this.getTools();
    const result = await tools.executeShell('npm run fmt --check');
    return {
      gate: 'FORMAT',
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Formatting correct' : result.stderr,
    };
  }

  private async runUnitTests(): Promise<QualityGateResult> {
    const tools = this.getTools();
    const result = await tools.executeShell('npm run test:unit');
    return {
      gate: 'UNIT_TEST',
      passed: result.exitCode === 0,
      details: result.exitCode === 0 ? 'Unit tests passed' : result.stderr,
    };
  }

  private async runWarningCheck(): Promise<QualityGateResult> {
    const tools = this.getTools();
    const result = await tools.executeShell('npm run build');
    const hasWarnings = result.stderr.includes('warning') || result.stdout.includes('warning');
    return {
      gate: 'WARNINGS',
      passed: !hasWarnings && result.exitCode === 0,
      details: hasWarnings ? 'Build produced warnings' : 'No warnings',
    };
  }
}

/**
 * Factory function to create ImplementerAgent with config
 * @param toolRegistry - Tool registry for the agent
 * @param model - Optional model override from config (any Oz-compatible model ID)
 */
export function createImplementerAgent(toolRegistry: ToolRegistry, model?: string): ImplementerAgent {
  const config: AgentConfig = {
    type: 'implementer',
    name: 'implementer',
    permissions: {
      read: ['**/*'],
      write: ['src/**/*', 'tests/**/*'],
      execute: ['npm test', 'npm run build', 'npx tsc*'],
      network: [],
      budget: { research: 0, review: 1, debug: 3, total: 4 },
    },
    model: model ?? 'claude-4-5-sonnet',
  };
  return new ImplementerAgent(config, toolRegistry);
}
