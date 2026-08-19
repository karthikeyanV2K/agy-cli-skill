import { Agent, ToolRegistry, AgentResult, TaskContext } from './base.js';
import type {
  ComponentSpec,
  InterfaceSpec,
  DataFlowSpec,
  ConstraintSpec,
  Assumption,
  Decision,
  AgentConfig,
  KnowledgeState,
} from '../types/index.js';
import type { ResearchResultExtended } from './researcher.js';

export interface ArchitecturePlanExtended {
  taskId: string;
  goal: string;
  currentArchitecture: string;
  affectedComponents: string[];
  controlFlow: string;
  implementationStrategy: string[];
  alternativesConsidered: string[];
  whySelected: string;
  failureModes: string[];
  compatibilityConcerns: string[];
  testingStrategy: string[];
  components: ComponentSpec[];
  interfaces: InterfaceSpec[];
  dataFlow: DataFlowSpec[];
  constraints: ConstraintSpec[];
  assumptions: Assumption[];
  decisions: Decision[];
  dependencies: string[];
}

 export type ArchitectureGateStatus = 'APPROVED' | 'RESEARCH_REQUIRED' | 'REJECTED';

 export interface ArchitectureResult {
  plan: ArchitecturePlanExtended;
  status: ArchitectureGateStatus;
  rationale: string;
  assumptions: Assumption[];
  decisions: Decision[];
 }

/**
 * Architect Agent
 * Implements the Architect protocol from .agents/agents/architect/agent.md
 * - Creates Architecture Plan for Orchestrator gate
 * - Assigns Architecture Gate Status (APPROVED/RESEARCH_REQUIRED/REJECTED)
 * - Implementation is FORBIDDEN until Architecture Gate = APPROVED
 */
export class ArchitectAgent extends Agent {
  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    super(config, toolRegistry);
    if (this.type !== 'architect') {
      throw new Error(`ArchitectAgent requires type 'architect', got '${this.type}'`);
    }
  }

  async execute(context: TaskContext): Promise<AgentResult<ArchitectureResult>> {
    // Use base class execute signature - context is local TaskContext
    this.verifyPermissions('read');
    this.verifyPermissions('write', '**/*.md');
    this.verifyPermissions('write', '**/docs/**');

    const { description, metadata } = context;
    const researchResults = metadata.researchResults as ResearchResultExtended[] | undefined;
    const repositorySummary = metadata.repositorySummary as string | undefined;
    const assumptionLedger = metadata.assumptionLedger as Assumption[] | undefined;
    const decisionLedger = metadata.decisionLedger as Decision[] | undefined;

    if (!researchResults || researchResults.length === 0) {
      return this.failure('No research results provided - cannot create architecture plan');
    }

    // Check for HIGH IMPACT UNKNOWNs in assumption ledger
    const highImpactUnknowns = assumptionLedger?.filter(
      a => !a.validated && a.confidence < 0.5
    ) || [];

    if (highImpactUnknowns.length > 0) {
      return this.success({
        plan: this.createEmptyPlan(context.id),
        status: 'RESEARCH_REQUIRED',
        rationale: `Found ${highImpactUnknowns.length} HIGH IMPACT UNKNOWN assumptions that must be resolved`,
        assumptions: assumptionLedger || [],
        decisions: decisionLedger || [],
      });
    }

    // Create architecture plan
    const plan = await this.createArchitecturePlan(
      context,
      researchResults,
      repositorySummary,
      assumptionLedger || [],
      decisionLedger || []
    );

    // Validate plan completeness
    const validation = this.validatePlan(plan);
    
    let status: ArchitectureGateStatus = 'APPROVED';
    let rationale = 'Architecture plan complete and validated';

    if (!validation.valid) {
      status = 'REJECTED';
      rationale = `Plan validation failed: ${validation.errors.join('; ')}`;
    } else if (validation.warnings.length > 0) {
      // Still approved but with warnings
      rationale += `; Warnings: ${validation.warnings.join('; ')}`;
    }

    return this.success({
      plan,
      status,
      rationale,
      assumptions: assumptionLedger || [],
      decisions: decisionLedger || [],
    }, {
      gateStatus: status,
      validationErrors: validation.errors,
      validationWarnings: validation.warnings,
    });
  }

  /**
   * Create comprehensive Architecture Plan per the required format
   */
  private async createArchitecturePlan(
    context: TaskContext,
    researchResults: ResearchResultExtended[],
    repositorySummary: string | undefined,
    assumptions: Assumption[],
    decisions: Decision[]
  ): Promise<ArchitecturePlanExtended> {
    const tools = this.getTools();
    
    // Analyze affected components from research and repository
    const affectedComponents = this.identifyAffectedComponents(researchResults, repositorySummary);
    
    // Extract components and interfaces from research
    const components = await this.designComponents(researchResults, affectedComponents, tools);
    const interfaces = await this.designInterfaces(researchResults, tools);
    const dataFlow = this.designDataFlow(components, interfaces);
    const constraints = this.extractConstraints(researchResults, assumptions);

    return {
      taskId: context.id,
      goal: context.description,
      currentArchitecture: repositorySummary || 'No existing architecture summary provided',
      affectedComponents,
      dataFlow,
      controlFlow: this.designControlFlow(researchResults),
      dependencies: this.extractDependencies(researchResults),
      implementationStrategy: this.createImplementationStrategy(components, researchResults),
      alternativesConsidered: this.extractAlternatives(researchResults),
      whySelected: this.synthesizeRationale(researchResults, decisions),
      failureModes: this.identifyFailureModes(components, constraints),
      compatibilityConcerns: this.identifyCompatibilityConcerns(researchResults, assumptions),
      testingStrategy: this.defineTestingStrategy(researchResults),
      components,
      interfaces,
      constraints,
      assumptions,
      decisions,
    };
  }

  private identifyAffectedComponents(
    researchResults: ResearchResultExtended[],
    repositorySummary: string | undefined
  ): string[] {
    const components = new Set<string>();
    
    for (const result of researchResults) {
      for (const finding of result.findings) {
        // Extract file paths from citations
        const fileMatches = finding.citation.match(/([\w\\/-]+\.(ts|js|rs|go|py|md))/g);
        if (fileMatches) {
          fileMatches.forEach(f => components.add(f));
        }
      }
    }

    return Array.from(components).slice(0, 20);
  }

  private async designComponents(
    researchResults: ResearchResultExtended[],
    affectedComponents: string[],
    tools: ToolRegistry
  ): Promise<ComponentSpec[]> {
    const components: ComponentSpec[] = [];

    // Create component specs for affected files
    for (const file of affectedComponents.slice(0, 10)) {
      const content = await tools.readFile(file).catch(() => '');
      const responsibilities = this.extractResponsibilities(content);
      const dependencies = this.extractFileDependencies(content);

      components.push({
        name: file,
        type: this.inferComponentType(file, content),
        responsibilities,
        dependencies,
      });
    }

    return components;
  }

  private async designInterfaces(
    researchResults: ResearchResultExtended[],
    tools: ToolRegistry
  ): Promise<InterfaceSpec[]> {
    const interfaces: InterfaceSpec[] = [];

    // Extract interface definitions from research findings
    for (const result of researchResults) {
      for (const finding of result.findings) {
        if (finding.content.includes('interface') || finding.content.includes('export interface')) {
          const methods = this.extractMethods(finding.content);
          if (methods.length > 0) {
            interfaces.push({
              name: this.extractInterfaceName(finding.content) || 'ExtractedInterface',
              methods,
              events: [],
            });
          }
        }
      }
    }

    return interfaces;
  }

  private designDataFlow(
    components: ComponentSpec[],
    interfaces: InterfaceSpec[]
  ): DataFlowSpec[] {
    const flows: DataFlowSpec[] = [];

    // Create data flows based on component dependencies
    for (const component of components) {
      for (const dep of component.dependencies) {
        const targetComponent = components.find(c => c.name.includes(dep) || dep.includes(c.name));
        if (targetComponent) {
          flows.push({
            from: component.name,
            to: targetComponent.name,
            dataType: 'messages',
            transformation: 'validation',
          });
        }
      }
    }

    return flows;
  }

  private designControlFlow(researchResults: ResearchResultExtended[]): string {
    const flows: string[] = [];
    
    for (const result of researchResults) {
      if (result.recommendedApproach) {
        flows.push(result.recommendedApproach);
      }
    }

    return flows.join(' -> ') || 'Sequential processing';
  }

  private extractDependencies(researchResults: ResearchResultExtended[]): string[] {
    const deps = new Set<string>();
    
    for (const result of researchResults) {
      for (const finding of result.findings) {
        // Look for import/require statements
        const imports = finding.content.match(/(?:import|require|from)\s+['"]([^'"]+)['"]/g);
        if (imports) {
          imports.forEach(i => {
            const match = i.match(/['"]([^'"]+)['"]/);
            if (match) deps.add(match[1]);
          });
        }
      }
    }

    return Array.from(deps).slice(0, 20);
  }

  private extractConstraints(
    researchResults: ResearchResultExtended[],
    assumptions: Assumption[]
  ): ConstraintSpec[] {
    const constraints: ConstraintSpec[] = [];

    // From research risks
    for (const result of researchResults) {
      for (const risk of result.risks) {
        if (risk.includes('perform')) {
          constraints.push({ type: 'performance', description: risk, severity: 'must' });
        } else if (risk.includes('secur') || risk.includes('auth')) {
          constraints.push({ type: 'security', description: risk, severity: 'must' });
        } else if (risk.includes('compat') || risk.includes('version')) {
          constraints.push({ type: 'compatibility', description: risk, severity: 'should' });
        } else {
          constraints.push({ type: 'resource', description: risk, severity: 'nice' });
        }
      }
    }

    // From assumptions
    for (const assumption of assumptions) {
      if (!assumption.validated) {
        constraints.push({
          type: 'compatibility',
          description: `Unvalidated assumption: ${assumption.description}`,
          severity: 'must',
        });
      }
    }

    return constraints;
  }

  private createImplementationStrategy(
    components: ComponentSpec[],
    researchResults: ResearchResultExtended[]
  ): string[] {
    const strategy: string[] = [];

    // Phase 1: Core types and interfaces
    strategy.push('Define core types and interfaces per Architecture Plan');
    
    // Phase 2: Component implementation
    for (const component of components) {
      strategy.push(`Implement ${component.name}: ${component.responsibilities.join(', ')}`);
    }

    // Phase 3: Integration
    strategy.push('Integrate components and verify data flows');
    
    // Phase 4: Testing
    strategy.push('Write unit tests for each component');
    strategy.push('Run integration tests per testing strategy');

    return strategy;
  }

  private extractAlternatives(researchResults: ResearchResultExtended[]): string[] {
    const alternatives = new Set<string>();
    for (const result of researchResults) {
      result.alternativeApproaches.forEach(a => alternatives.add(a));
    }
    return Array.from(alternatives);
  }

  private synthesizeRationale(
    researchResults: ResearchResultExtended[],
    decisions: Decision[]
  ): string {
    const rationales: string[] = [];

    for (const result of researchResults) {
      if (result.confidence > 0.7) {
        rationales.push(`High confidence (${Math.round(result.confidence * 100)}%): ${result.recommendedApproach}`);
      }
    }

    for (const decision of decisions) {
      rationales.push(`Decision: ${decision.chosen} - ${decision.rationale}`);
    }

    return rationales.join('; ') || 'Based on research findings and architectural principles';
  }

  private identifyFailureModes(
    components: ComponentSpec[],
    constraints: ConstraintSpec[]
  ): string[] {
    const modes: string[] = [];

    for (const component of components) {
      modes.push(`${component.name}: Null input handling`);
      modes.push(`${component.name}: Network/IO failure`);
      modes.push(`${component.name}: Concurrency issues`);
    }

    for (const constraint of constraints) {
      if (constraint.severity === 'must') {
        modes.push(`Constraint violation: ${constraint.description}`);
      }
    }

    return modes.slice(0, 10);
  }

  private identifyCompatibilityConcerns(
    researchResults: ResearchResultExtended[],
    assumptions: Assumption[]
  ): string[] {
    const concerns: string[] = [];

    for (const result of researchResults) {
      for (const unknown of result.unknowns) {
        concerns.push(`Unknown: ${unknown}`);
      }
    }

    for (const assumption of assumptions) {
      if (assumption.confidence < 0.7) {
        concerns.push(`Low confidence assumption: ${assumption.description}`);
      }
    }

    return concerns;
  }

  private defineTestingStrategy(researchResults: ResearchResultExtended[]): string[] {
    const strategy: string[] = [
      'FORMAT: Code formatting check',
      'STATIC: Static analysis (linting, type checking)',
      'BUILD: Compilation verification',
      'UNIT: Unit tests for each component',
      'INTEGRATION: Component interaction tests',
      'REGRESSION: Full regression suite',
    ];

    // Add project-specific based on research
    for (const result of researchResults) {
      for (const finding of result.findings) {
        if (finding.content.includes('kernel') || finding.content.includes('driver')) {
          strategy.push('QEMU: Kernel boot test');
          strategy.push('KERNEL_TESTS: Kernel-specific test suite');
          break;
        }
        if (finding.content.includes('web') || finding.content.includes('api')) {
          strategy.push('E2E: End-to-end workflow tests');
          break;
        }
      }
    }

    return strategy;
  }

  private validatePlan(plan: ArchitecturePlanExtended): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plan.goal) errors.push('Missing goal');
    if (!plan.components || plan.components.length === 0) errors.push('No components defined');
    if (!plan.implementationStrategy || plan.implementationStrategy.length === 0) errors.push('No implementation strategy');
    if (!plan.testingStrategy || plan.testingStrategy.length === 0) warnings.push('No testing strategy defined');
    if (plan.failureModes.length === 0) warnings.push('No failure modes identified');
    if (plan.compatibilityConcerns.length === 0) warnings.push('No compatibility concerns documented');

    return { valid: errors.length === 0, errors, warnings };
  }

  private createEmptyPlan(taskId: string): ArchitecturePlanExtended {
    return {
      taskId,
      goal: '',
      currentArchitecture: '',
      affectedComponents: [],
      dataFlow: [],
      controlFlow: '',
      dependencies: [],
      implementationStrategy: [],
      alternativesConsidered: [],
      whySelected: '',
      failureModes: [],
      compatibilityConcerns: [],
      testingStrategy: [],
      components: [],
      interfaces: [],
      constraints: [],
      assumptions: [],
      decisions: [],
    };
  }

  // Helper methods
  private extractResponsibilities(content: string): string[] {
    const responsibilities: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('//') || line.includes('/*') || line.includes('*')) {
        const comment = line.replace(/\/\/|\/\*|\*\//g, '').trim();
        if (comment && comment.length > 10) responsibilities.push(comment);
      }
    }
    return responsibilities.slice(0, 5);
  }

  private extractFileDependencies(content: string): string[] {
    const deps = new Set<string>();
    const imports = content.match(/(?:import|require)\s+.*?from\s+['"]([^'"]+)['"]/g);
    if (imports) {
      imports.forEach(i => {
        const match = i.match(/['"]([^'"]+)['"]/);
        if (match) deps.add(match[1]);
      });
    }
    return Array.from(deps);
  }

  private inferComponentType(file: string, content: string): string {
    if (file.includes('test')) return 'test';
    if (file.includes('type') || file.includes('interface')) return 'types';
    if (file.includes('util') || file.includes('helper')) return 'utility';
    if (content.includes('class ') || content.includes('export class')) return 'class';
    if (content.includes('export function') || content.includes('export const')) return 'module';
    return 'module';
  }

  private extractMethods(content: string): InterfaceSpec['methods'] {
    const methods: InterfaceSpec['methods'] = [];
    const methodRegex = /(\w+)\s*\(([^)]*)\)\s*:\s*(\w+)/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      methods.push({
        name: match[1],
        params: match[2].split(',').map(p => p.trim()).filter(Boolean).map(p => ({
          name: p.split(':')[0]?.trim() || p,
          type: p.split(':')[1]?.trim() || 'unknown',
          optional: p.includes('?'),
        })),
        returnType: match[3],
        async: content.includes('async ' + match[1]),
      });
    }
    return methods;
  }

  private extractInterfaceName(content: string): string | null {
    const match = content.match(/interface\s+(\w+)/);
    return match ? match[1] : null;
  }
}

/**
 * Factory function to create ArchitectAgent with default config
 */
export function createArchitectAgent(toolRegistry: ToolRegistry): ArchitectAgent {
  const config: AgentConfig = {
    type: 'architect',
    name: 'architect',
    permissions: {
      read: ['**/*'],
      write: ['**/*.md', '**/docs/**'],
      execute: [],
      network: [],
      budget: { research: 1, review: 1, debug: 1, total: 3 },
    },
    model: 'claude-4-5-sonnet',
  };
  return new ArchitectAgent(config, toolRegistry);
}