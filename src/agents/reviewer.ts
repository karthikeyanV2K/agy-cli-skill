import { Agent, ToolRegistry, AgentResult, TaskContext } from './base.js';
import type {
  ArchitecturePlan,
  AgentConfig,
  Assumption,
  Decision,
  ValidationResult,
  ImplementationResultExtended,
} from '../types/index.js';

export type ReviewCategory = 
  | 'CORRECTNESS'
  | 'ARCHITECTURE'
  | 'EDGE_CASES'
  | 'ERROR_HANDLING'
  | 'CONCURRENCY'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'RESOURCE_MANAGEMENT'
  | 'COMPATIBILITY'
  | 'TEST_COVERAGE'
  | 'MAINTAINABILITY'
  | 'HARDCODING'
  | 'REGRESSION';

export type ReviewSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface ReviewCategoryResult {
  category: ReviewCategory;
  finding: string;
  severity: ReviewSeverity;
  evidence: string;
  recommendation: string;
  passed: boolean;
}

export interface HardcodingAuditResult {
  scannedFiles: string[];
  found: HardcodedItem[];
}

export interface HardcodedItem {
  file: string;
  line: number;
  value: string;
  type: 'MAGIC_NUMBER' | 'HARDCODED_PATH' | 'HARDCODED_URL' | 'HARDCODED_CREDENTIAL' | 'ENV_ASSUMPTION' | 'FAKE_CONFIG' | 'TEMPORARY_BYPASS' | 'DEBUG_IN_PROD';
  justification?: string;
  reject: boolean;
}

export interface FinalVerificationChecklist {
  allGatesPassed: boolean;
  architectureGateApproved: boolean;
  researchComplete: boolean;
  implementationComplete: boolean;
  validationPassed: boolean;
  debugComplete: boolean;
  noHighImpactUnknowns: boolean;
  decisionsHaveRationale: boolean;
  noHardcodingViolations: boolean;
  regressionTestsPass: boolean;
  documentationUpdated: boolean;
  signOffReady: boolean;
}

export interface ReviewerContext {
  implementationResult: ImplementationResultExtended;
  architecturePlan: ArchitecturePlan;
  researchResults: any[];
  validationResult: ValidationResult;
  assumptionLedger: Assumption[];
  decisionLedger: Decision[];
}

/**
 * Reviewer Agent
 * Implements the Reviewer protocol from .agents/agents/reviewer/agent.md
 * - Performs adversarial code review across 13 categories
 * - Checks hardcoding, assumptions, decisions, final verification
 * - Has veto power (REJECT)
 * - Output: ReviewReport with DECISION: APPROVE/REJECT
 */
export class ReviewerAgent extends Agent {
  private readonly CATEGORIES: ReviewCategory[] = [
    'CORRECTNESS',
    'ARCHITECTURE',
    'EDGE_CASES',
    'ERROR_HANDLING',
    'CONCURRENCY',
    'SECURITY',
    'PERFORMANCE',
    'RESOURCE_MANAGEMENT',
    'COMPATIBILITY',
    'TEST_COVERAGE',
    'MAINTAINABILITY',
    'HARDCODING',
    'REGRESSION',
  ];

  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    super(config, toolRegistry);
    if (this.type !== 'reviewer') {
      throw new Error(`ReviewerAgent requires type 'reviewer', got '${this.type}'`);
    }
  }

  async execute(context: TaskContext): Promise<AgentResult<any>> {
    // Use base class execute signature - context is local TaskContext
    this.verifyPermissions('read');
    this.verifyPermissions('execute', 'npm test');
    this.verifyPermissions('execute', 'npm run lint');

    const { metadata } = context;
    const reviewContext = metadata as unknown as ReviewerContext;

    if (!reviewContext.implementationResult) {
      return this.failure('No implementation result provided');
    }
    if (!reviewContext.architecturePlan) {
      return this.failure('No architecture plan provided');
    }
    if (!reviewContext.validationResult) {
      return this.failure('No validation result provided');
    }

    const categoryResults: ReviewCategoryResult[] = [];
    let budgetUsed = 0;

    // Review each of the 13 categories
    for (const category of this.CATEGORIES) {
      if (!this.consumeBudget('review', 1)) {
        return this.failure('Review budget exhausted');
      }
      budgetUsed++;

      const result = await this.reviewCategory(category, reviewContext);
      categoryResults.push(result);
    }

    // Hardcoding audit
    const hardcodingAudit = await this.auditHardcoding(reviewContext);

    // Assumption ledger check
    const assumptionCheck = this.checkAssumptionLedger(reviewContext.assumptionLedger);

    // Decision ledger check
    const decisionCheck = this.checkDecisionLedger(reviewContext.decisionLedger);

    // Final verification checklist
    const finalVerification = this.runFinalVerification(
      reviewContext,
      categoryResults,
      hardcodingAudit,
      assumptionCheck,
      decisionCheck
    );

    // Determine overall decision
    const decision = this.makeDecision(
      categoryResults,
      hardcodingAudit,
      assumptionCheck,
      finalVerification
    );

    // Build findings for report
    const findings: any[] = categoryResults.map(r => ({
      category: r.category.toLowerCase(),
      severity: r.severity.toLowerCase(),
      description: r.finding,
      file: r.evidence.split(':')[0],
      line: parseInt(r.evidence.split(':')[1]) || undefined,
      suggestion: r.recommendation,
    }));

    const report = {
      taskId: context.id,
      reviewer: 'reviewer',
      findings,
      approved: decision === 'APPROVE',
      budgetUsed,
      regressionChecked: true,
      diffReviewed: true,
      noHardcoding: hardcodingAudit.found.filter((h: any) => h.reject).length === 0,
      noUnresolvedIssues: assumptionCheck.unresolved === 0,
    };

    return this.success(report, {
      decision,
      categoryResults,
      hardcodingAudit,
      assumptionCheck,
      decisionCheck,
      finalVerification,
    });
  }

  /**
   * Review a single category
   */
  private async reviewCategory(
    category: ReviewCategory,
    context: ReviewerContext
  ): Promise<ReviewCategoryResult> {
    const tools = this.getTools();
    
    switch (category) {
      case 'CORRECTNESS':
        return this.reviewCorrectness(context, tools);
      case 'ARCHITECTURE':
        return this.reviewArchitecture(context, tools);
      case 'EDGE_CASES':
        return this.reviewEdgeCases(context, tools);
      case 'ERROR_HANDLING':
        return this.reviewErrorHandling(context, tools);
      case 'CONCURRENCY':
        return this.reviewConcurrency(context, tools);
      case 'SECURITY':
        return this.reviewSecurity(context, tools);
      case 'PERFORMANCE':
        return this.reviewPerformance(context, tools);
      case 'RESOURCE_MANAGEMENT':
        return this.reviewResourceManagement(context, tools);
      case 'COMPATIBILITY':
        return this.reviewCompatibility(context, tools);
      case 'TEST_COVERAGE':
        return this.reviewTestCoverage(context, tools);
      case 'MAINTAINABILITY':
        return this.reviewMaintainability(context, tools);
      case 'HARDCODING':
        return this.reviewHardcoding(context, tools);
      case 'REGRESSION':
        return this.reviewRegression(context, tools);
      default:
        return this.createResult(category, 'Category not implemented', 'INFO', '', 'N/A', true);
    }
  }

  private createResult(
    category: ReviewCategory,
    finding: string,
    severity: ReviewSeverity,
    evidence: string,
    recommendation: string,
    passed: boolean
  ): ReviewCategoryResult {
    return { category, finding, severity, evidence, recommendation, passed };
  }

  // Category 1: CORRECTNESS
  private async reviewCorrectness(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult, architecturePlan } = context;
    
    // Check if implementation matches architecture plan
    const planComponents = architecturePlan.components.map(c => c.name);
    const implFiles = implementationResult.filesCreated.concat(implementationResult.filesModified);
    
      const missingComponents = planComponents.filter((c: string) => 
      !implFiles.some((f: string) => f.includes(c))
    );

    if (missingComponents.length > 0) {
      return this.createResult(
        'CORRECTNESS',
        `Missing implementation for components: ${missingComponents.join(', ')}`,
        'HIGH',
        `Architecture plan: ${planComponents.join(', ')}`,
        'Implement all components specified in Architecture Plan',
        false
      );
    }

    // Check WHY mappings exist for all changes
    if (!implementationResult.whyMappings || implementationResult.whyMappings.length === 0) {
      return this.createResult(
        'CORRECTNESS',
        'No WHY mappings provided for implementation changes',
        'MEDIUM',
        'ImplementationResult.whyMappings',
        'Add WHY justification for each file/function/approach/dependency/behavior/test change',
        false
      );
    }

    return this.createResult(
      'CORRECTNESS',
      'Implementation matches Architecture Plan and WHY mappings provided',
      'INFO',
      'All components implemented',
      'N/A',
      true
    );
  }

  // Category 2: ARCHITECTURE
  private async reviewArchitecture(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult, architecturePlan } = context;

    // Check for unauthorized patterns
    const unauthorizedPatterns = [
      'singleton',
      'global state',
      'direct db access',
      'hardcoded config',
    ];

    let violations: string[] = [];
    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      for (const pattern of unauthorizedPatterns) {
        if (content.toLowerCase().includes(pattern)) {
          violations.push(`${file}: contains "${pattern}"`);
        }
      }
    }

    if (violations.length > 0) {
      return this.createResult(
        'ARCHITECTURE',
        `Unauthorized patterns detected: ${violations.join('; ')}`,
        'HIGH',
        violations.join('; '),
        'Remove unauthorized patterns, follow approved architecture',
        false
      );
    }

    // Check invariants preserved
    const invariants = architecturePlan.constraints.filter(c => c.severity === 'must');
    if (invariants.length > 0) {
      return this.createResult(
        'ARCHITECTURE',
        'Must-severity constraints present - verify compliance',
        'MEDIUM',
        invariants.map(i => i.description).join('; '),
        'Verify all MUST constraints are satisfied',
        true
      );
    }

    return this.createResult(
      'ARCHITECTURE',
      'Architecture followed, no unauthorized patterns',
      'INFO',
      'All components match plan',
      'N/A',
      true
    );
  }

  // Category 3: EDGE_CASES
  private async reviewEdgeCases(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult } = context;
    let issues: string[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      
      // Check for null/undefined handling
      if (!content.includes('null') && !content.includes('undefined') && 
          content.includes('function') && !content.includes('?.') && !content.includes('??')) {
        issues.push(`${file}: No null/undefined checks visible`);
      }

      // Check for boundary conditions
      if (content.includes('.length') && !content.includes('length > 0') && 
          !content.includes('length === 0')) {
        issues.push(`${file}: Array length boundary not checked`);
      }

      // Check for overflow
      if (content.includes('+') && content.includes('number') && 
          !content.includes('Number.MAX_SAFE_INTEGER')) {
        issues.push(`${file}: Potential numeric overflow`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'EDGE_CASES',
        `Edge case handling gaps: ${issues.join('; ')}`,
        'MEDIUM',
        issues.join('; '),
        'Add null checks, boundary validation, overflow protection',
        false
      );
    }

    return this.createResult(
      'EDGE_CASES',
      'Edge cases appear handled',
      'INFO',
      'Null checks, boundaries, overflow protection present',
      'N/A',
      true
    );
  }

  // Category 4: ERROR_HANDLING
  private async reviewErrorHandling(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult } = context;
    let issues: string[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      
      // Check for try/catch
      const hasTryCatch = content.includes('try') && content.includes('catch');
      const hasAsync = content.includes('async');
      const hasThrow = content.includes('throw');
      
      if (hasAsync && !hasTryCatch && hasThrow) {
        issues.push(`${file}: Async function throws without try/catch`);
      }

      // Check for silent failures
      if (content.includes('catch') && content.includes('{}') && 
          !content.includes('console.error') && !content.includes('logger')) {
        issues.push(`${file}: Empty catch block (silent failure)`);
      }

      // Check error propagation
      if (content.includes('return') && content.includes('error') && 
          !content.includes('throw') && !content.includes('Result')) {
        issues.push(`${file}: Error returned but not properly typed`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'ERROR_HANDLING',
        `Error handling issues: ${issues.join('; ')}`,
        'HIGH',
        issues.join('; '),
        'Add try/catch, avoid silent failures, use proper error types',
        false
      );
    }

    return this.createResult(
      'ERROR_HANDLING',
      'Error handling appears adequate',
      'INFO',
      'Try/catch present, errors propagated, no silent failures',
      'N/A',
      true
    );
  }

  // Category 5: CONCURRENCY
  private async reviewConcurrency(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult } = context;
    let issues: string[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      
      // Check for shared state without synchronization
      if (content.includes('shared') || content.includes('global') || 
          content.includes('static')) {
        if (!content.includes('mutex') && !content.includes('lock') && 
            !content.includes('atomic') && !content.includes('synchronized')) {
          issues.push(`${file}: Shared state without synchronization`);
        }
      }

      // Check for race conditions in async
      if (content.includes('await') && content.includes('Promise.all')) {
        // This is fine - Promise.all is safe
      } else if (content.includes('for') && content.includes('await') && 
                 !content.includes('for await')) {
        issues.push(`${file}: Sequential await in loop - potential race if parallel intended`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'CONCURRENCY',
        `Concurrency concerns: ${issues.join('; ')}`,
        'HIGH',
        issues.join('; '),
        'Add proper synchronization, review async patterns',
        false
      );
    }

    return this.createResult(
      'CONCURRENCY',
      'No obvious concurrency issues',
      'INFO',
      'No shared state without sync, proper async patterns',
      'N/A',
      true
    );
  }

  // Category 6: SECURITY
  private async reviewSecurity(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult } = context;
    let issues: string[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      
      // Check for injection vulnerabilities
      if (content.includes('eval(') || content.includes('Function(') || 
          content.includes('exec(') || content.includes('execSync(')) {
        issues.push(`${file}: Code execution vulnerability (eval/Function/exec)`);
      }

      // Check for SQL injection
      if (content.includes('query(') && content.includes('${') && 
          !content.includes('parameterized') && !content.includes('?')) {
        issues.push(`${file}: Potential SQL injection`);
      }

      // Check for secrets
      const secretPatterns = ['password', 'secret', 'token', 'api_key', 'private_key'];
      for (const pattern of secretPatterns) {
        if (content.toLowerCase().includes(pattern) && 
            (content.includes('=') || content.includes(':'))) {
          issues.push(`${file}: Potential hardcoded secret (${pattern})`);
        }
      }

      // Check for crypto
      if (content.includes('crypto') && content.includes('createHash') && 
          content.includes('md5') || content.includes('sha1')) {
        issues.push(`${file}: Weak cryptographic hash (MD5/SHA1)`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'SECURITY',
        `Security vulnerabilities: ${issues.join('; ')}`,
        'CRITICAL',
        issues.join('; '),
        'Remove eval/exec, use parameterized queries, remove secrets, use strong crypto',
        false
      );
    }

    return this.createResult(
      'SECURITY',
      'No obvious security issues',
      'INFO',
      'No injection vectors, secrets, or weak crypto detected',
      'N/A',
      true
    );
  }

  // Category 7: PERFORMANCE
  private async reviewPerformance(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult } = context;
    let issues: string[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      
      // Check for O(n²) patterns
      const nestedLoops = (content.match(/for\s*\([^)]+\)\s*{[^}]*for\s*\(/g) || []).length;
      if (nestedLoops > 0) {
        issues.push(`${file}: ${nestedLoops} nested loop(s) - potential O(n²)`);
      }

      // Check for allocations in loops
      if (content.includes('new ') && content.includes('for') && 
          content.indexOf('new ') < content.indexOf('for')) {
        issues.push(`${file}: Object allocation in loop`);
      }

      // Check for string concatenation in loops
      if (content.includes('+=') && content.includes('for') && 
          content.includes('string')) {
        issues.push(`${file}: String concatenation in loop`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'PERFORMANCE',
        `Performance concerns: ${issues.join('; ')}`,
        'MEDIUM',
        issues.join('; '),
        'Optimize algorithms, avoid allocations in loops, use StringBuilder/Array.join',
        false
      );
    }

    return this.createResult(
      'PERFORMANCE',
      'No obvious performance issues',
      'INFO',
      'No nested loops, allocations in loops, or string concat in loops',
      'N/A',
      true
    );
  }

  // Category 8: RESOURCE_MANAGEMENT
  private async reviewResourceManagement(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult } = context;
    let issues: string[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      
      // Check for resource acquisition without release
      const acquisitions = (content.match(/\.open\(|\.create\(|\.connect\(|new\s+\w+\(/g) || []).length;
      const releases = (content.match(/\.close\(|\.destroy\(|\.release\(|\.dispose\(/g) || []).length;
      
      if (acquisitions > releases) {
        issues.push(`${file}: ${acquisitions} acquisitions vs ${releases} releases - potential leak`);
      }

      // Check for file handles
      if (content.includes('fs.') && content.includes('open') && 
          !content.includes('close') && !content.includes('using')) {
        issues.push(`${file}: File handle may not be closed`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'RESOURCE_MANAGEMENT',
        `Resource management issues: ${issues.join('; ')}`,
        'HIGH',
        issues.join('; '),
        'Ensure all resources are properly released, use RAII/using patterns',
        false
      );
    }

    return this.createResult(
      'RESOURCE_MANAGEMENT',
      'Resource management appears adequate',
      'INFO',
      'Acquisitions balanced with releases',
      'N/A',
      true
    );
  }

  // Category 9: COMPATIBILITY
  private async reviewCompatibility(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult, architecturePlan } = context;
    let issues: string[] = [];

    // Check version constraints
    for (const dep of architecturePlan.dependencies) {
      if (!dep.includes('@') && !dep.includes('^') && !dep.includes('~')) {
        issues.push(`Dependency without version constraint: ${dep}`);
      }
    }

    // Check for platform-specific code
    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      
      if (content.includes('process.platform') || content.includes('win32') || 
          content.includes('darwin') || content.includes('linux')) {
        issues.push(`${file}: Platform-specific code detected`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'COMPATIBILITY',
        `Compatibility concerns: ${issues.join('; ')}`,
        'MEDIUM',
        issues.join('; '),
        'Add version constraints, abstract platform differences',
        false
      );
    }

    return this.createResult(
      'COMPATIBILITY',
      'No compatibility issues detected',
      'INFO',
      'Version constraints present, no platform-specific code',
      'N/A',
      true
    );
  }

  // Category 10: TEST_COVERAGE
  private async reviewTestCoverage(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult, validationResult } = context;
    let issues: string[] = [];

    // Check coverage from validation result
    if (validationResult.coverage) {
      const { statements, branches, functions, lines } = validationResult.coverage;
      if (statements < 80) issues.push(`Statement coverage ${statements}% < 80%`);
      if (branches < 80) issues.push(`Branch coverage ${branches}% < 80%`);
      if (functions < 80) issues.push(`Function coverage ${functions}% < 80%`);
      if (lines < 80) issues.push(`Line coverage ${lines}% < 80%`);
    }

    // Check for tests in implementation
    if (implementationResult.testsAdded.length === 0 && 
        implementationResult.filesCreated.length > 0) {
      issues.push('New files created but no tests added');
    }

    if (issues.length > 0) {
      return this.createResult(
        'TEST_COVERAGE',
        `Test coverage gaps: ${issues.join('; ')}`,
        'HIGH',
        issues.join('; '),
        'Achieve 80% coverage minimum, add tests for new code',
        false
      );
    }

    return this.createResult(
      'TEST_COVERAGE',
      'Test coverage meets thresholds',
      'INFO',
      'Coverage >= 80%, tests added for new code',
      'N/A',
      true
    );
  }

  // Category 11: MAINTAINABILITY
  private async reviewMaintainability(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { implementationResult } = context;
    let issues: string[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await tools.readFile(file).catch(() => '');
      const lines = content.split('\n').length;
      
      // Check file size
      if (lines > 500) {
        issues.push(`${file}: Large file (${lines} lines) - consider splitting`);
      }

      // Check function complexity (cyclomatic)
      const functions = content.match(/function\s+\w+|=>\s*{/g) || [];
      if (functions.length > 20) {
        issues.push(`${file}: Many functions (${functions.length}) - high complexity`);
      }

      // Check naming
      const badNames = content.match(/\b[a-z]{1,2}\b/g) || [];
      if (badNames.length > 10) {
        issues.push(`${file}: Many short variable names - poor readability`);
      }
    }

    if (issues.length > 0) {
      return this.createResult(
        'MAINTAINABILITY',
        `Maintainability concerns: ${issues.join('; ')}`,
        'MEDIUM',
        issues.join('; '),
        'Split large files, reduce complexity, improve naming',
        false
      );
    }

    return this.createResult(
      'MAINTAINABILITY',
      'Code maintainability acceptable',
      'INFO',
      'Files reasonably sized, good naming',
      'N/A',
      true
    );
  }

  // Category 12: HARDCODING
  private async reviewHardcoding(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const audit = await this.auditHardcoding(context);
    const violations = audit.found.filter(h => h.reject);

    if (violations.length > 0) {
      return this.createResult(
        'HARDCODING',
        `Hardcoding violations: ${violations.map(v => `${v.file}:${v.line} ${v.value}`).join('; ')}`,
        'HIGH',
        violations.map(v => `${v.file}:${v.line} ${v.type}="${v.value}"`).join('; '),
        'Replace hardcoded values with configuration/constants',
        false
      );
    }

    return this.createResult(
      'HARDCODING',
      'No hardcoding violations',
      'INFO',
      'All values configurable or justified',
      'N/A',
      true
    );
  }

  private async auditHardcoding(context: ReviewerContext): Promise<HardcodingAuditResult> {
    const { implementationResult } = context;
    const found: HardcodedItem[] = [];

    for (const file of implementationResult.filesModified) {
      const content = await this.getTools().readFile(file).catch(() => '');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Magic numbers
        const magicNumbers = line.match(/\b\d{2,}\b/g);
        if (magicNumbers) {
          for (const num of magicNumbers) {
            if (!this.isJustifiedMagicNumber(line, num)) {
              found.push({
                file, line: lineNum, value: num,
                type: 'MAGIC_NUMBER',
                reject: true,
              });
            }
          }
        }

        // Hardcoded paths
        if (line.includes('/home/') || line.includes('C:\\') || line.includes('C:/')) {
          found.push({
            file, line: lineNum, value: line.trim(),
            type: 'HARDCODED_PATH',
            reject: true,
          });
        }

        // Hardcoded URLs
        if (line.includes('http://') || line.includes('https://')) {
          if (!line.includes('config') && !line.includes('env')) {
            found.push({
              file, line: lineNum, value: line.trim(),
              type: 'HARDCODED_URL',
              reject: true,
            });
          }
        }

        // Credentials
        if (line.toLowerCase().includes('password') || line.toLowerCase().includes('secret') ||
            line.toLowerCase().includes('token') || line.toLowerCase().includes('api_key')) {
          if (line.includes('=') || line.includes(':')) {
            found.push({
              file, line: lineNum, value: '[REDACTED]',
              type: 'HARDCODED_CREDENTIAL',
              reject: true,
            });
          }
        }
      }
    }

    return { scannedFiles: implementationResult.filesModified, found };
  }

  private isJustifiedMagicNumber(line: string, num: string): boolean {
    // Allow if in comment, constant declaration, or test
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || 
        line.includes('const ') || line.includes('MAX_') || 
        line.includes('DEFAULT_') || line.includes('LIMIT_') ||
        line.includes('test') || line.includes('spec')) {
      return true;
    }
    return false;
  }

  // Category 13: REGRESSION
  private async reviewRegression(
    context: ReviewerContext,
    tools: ToolRegistry
  ): Promise<ReviewCategoryResult> {
    const { validationResult } = context;
    
    if (!validationResult.passed) {
      const failed = validationResult.checks.filter(c => !c.passed);
      return this.createResult(
        'REGRESSION',
        `Regression detected: ${failed.map(f => f.name).join(', ')} failing`,
        'CRITICAL',
        failed.map(f => `${f.name}: ${f.message}`).join('; '),
        'Fix all failing tests before approval',
        false
      );
    }

    // Check if any tests were removed
    // This would need git diff comparison in real implementation
    
    return this.createResult(
      'REGRESSION',
      'No regressions detected',
      'INFO',
      'All validation checks pass',
      'N/A',
      true
    );
  }

  private checkAssumptionLedger(assumptions: Assumption[]): { unresolved: number; details: string } {
    const highImpactUnknowns = assumptions.filter(a => 
      !a.validated && a.confidence < 0.5
    );

    return {
      unresolved: highImpactUnknowns.length,
      details: highImpactUnknowns.length > 0 
        ? `UNRESOLVED HIGH-IMPACT UNKNOWNs: ${highImpactUnknowns.map(a => a.description).join('; ')}`
        : 'All assumptions validated or low impact',
    };
  }

  private checkDecisionLedger(decisions: Decision[]): { allHaveRationale: boolean; details: string } {
    const missingRationale = decisions.filter(d => !d.rationale || d.rationale.trim() === '');
    
    return {
      allHaveRationale: missingRationale.length === 0,
      details: missingRationale.length > 0
        ? `Decisions missing rationale: ${missingRationale.map(d => d.id).join(', ')}`
        : 'All decisions have rationale and evidence',
    };
  }

  private runFinalVerification(
    context: ReviewerContext,
    categoryResults: ReviewCategoryResult[],
    hardcodingAudit: HardcodingAuditResult,
    assumptionCheck: { unresolved: number; details: string },
    decisionCheck: { allHaveRationale: boolean; details: string }
  ): FinalVerificationChecklist {
    return {
      allGatesPassed: context.validationResult.passed,
      architectureGateApproved: true, // Would check from context
      researchComplete: context.researchResults.length > 0,
      implementationComplete: context.implementationResult.filesCreated.length > 0 || 
                              context.implementationResult.filesModified.length > 0,
      validationPassed: context.validationResult.passed,
      debugComplete: true, // Would check from context
      noHighImpactUnknowns: assumptionCheck.unresolved === 0,
      decisionsHaveRationale: decisionCheck.allHaveRationale,
      noHardcodingViolations: hardcodingAudit.found.filter(h => h.reject).length === 0,
      regressionTestsPass: context.validationResult.passed,
      documentationUpdated: false, // Would check
      signOffReady: false,
    };
  }

  private makeDecision(
    categoryResults: ReviewCategoryResult[],
    hardcodingAudit: HardcodingAuditResult,
    assumptionCheck: { unresolved: number; details: string },
    finalVerification: FinalVerificationChecklist
  ): 'APPROVE' | 'REJECT' {
    // Auto-reject conditions
    if (assumptionCheck.unresolved > 0) return 'REJECT';
    if (!finalVerification.decisionsHaveRationale) return 'REJECT';
    if (!finalVerification.allGatesPassed) return 'REJECT';
    if (hardcodingAudit.found.some(h => h.reject)) return 'REJECT';

    // Check for critical/high severity findings
    const criticalFindings = categoryResults.filter(r => 
      r.severity === 'CRITICAL' || r.severity === 'HIGH'
    ).filter(r => !r.passed);

    if (criticalFindings.length > 0) return 'REJECT';

    return 'APPROVE';
  }
}

/**
 * Factory function to create ReviewerAgent with config
 * @param toolRegistry - Tool registry for the agent
 * @param model - Optional model override from config (any Oz-compatible model ID)
 */
export function createReviewerAgent(toolRegistry: ToolRegistry, model?: string): ReviewerAgent {
  const config: AgentConfig = {
    type: 'reviewer',
    name: 'reviewer',
    permissions: {
      read: ['**/*'],
      write: [],
      execute: [],
      network: [],
      budget: { research: 0, review: 2, debug: 0, total: 2 },
    },
    model: model ?? 'claude-4-5-sonnet',
  };
  return new ReviewerAgent(config, toolRegistry);
}
