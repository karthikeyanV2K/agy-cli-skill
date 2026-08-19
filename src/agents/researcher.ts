import { Agent, ToolRegistry, AgentResult, TaskContext } from './base.js';
import type {
  KnowledgeState,
  AgentConfig,
  AgentType,
} from '../types/index.js';

export interface ResearchGap {
  id: string;
  description: string;
  classification: 'REPOSITORY' | 'DEPENDENCY' | 'API' | 'LANGUAGE' | 'PROTOCOL' | 'SYSTEM' | 'ARCHITECTURE' | 'SECURITY' | 'TESTING';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  question: string;
}

export interface ResearchFinding {
  source: string;
  type: 'REPOSITORY' | 'DOCUMENTATION' | 'SOURCE_CODE' | 'SPECIFICATION' | 'MAINTAINER' | 'REFERENCE' | 'COMMUNITY';
  content: string;
  citation: string;
  version?: string;
  knowledgeState: KnowledgeState;
}

export interface ResearchResultExtended {
  taskId: string;
  gaps: ResearchGap[];
  findings: ResearchFinding[];
  recommendedApproach: string;
  alternativeApproaches: string[];
  risks: string[];
  unknowns: string[];
  sources: string[];
  confidence: number;
  knowledgeState: KnowledgeState;
  budgetUsed: number;
  budgetRemaining: number;
  crossValidated: boolean;
}

/**
 * Researcher Agent
 * Implements the Researcher protocol from .agents/agents/researcher/agent.md
 * - Identifies knowledge gaps
 * - Forms specific questions
 * - Searches authoritative sources (priority order)
 * - Extracts facts with evidence
 * - Cross-validates with codebase
 * - Produces structured ResearchResult
 */
export class ResearcherAgent extends Agent {
  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    super(config, toolRegistry);
    if (this.type !== 'researcher') {
      throw new Error(`ResearcherAgent requires type 'researcher', got '${this.type}'`);
    }
  }

  async execute(context: TaskContext): Promise<AgentResult<ResearchResultExtended>> {
    this.verifyPermissions('read');
    this.verifyPermissions('execute'); // For verification commands

    const { description, metadata } = context;
    const gaps = metadata.gaps as ResearchGap[] | undefined;
    
    if (!gaps || gaps.length === 0) {
      return this.failure('No research gaps provided in context');
    }

    const allFindings: ResearchFinding[] = [];
    let totalBudgetUsed = 0;

    // Process each gap
    for (const gap of gaps) {
      if (!this.consumeBudget('research', 1)) {
        return this.failure('Research budget exhausted');
      }
      totalBudgetUsed++;

      const findings = await this.researchGap(gap, context);
      allFindings.push(...findings);
    }

    // Cross-validate with codebase
    const validatedFindings = await this.crossValidateWithCodebase(allFindings, context);

    // Produce research result
    const result = this.produceResearchResult(gaps, validatedFindings, context);
    
    return this.success(result, {
      budgetUsed: totalBudgetUsed,
      budgetRemaining: this.getRemainingBudget('research'),
      gapsProcessed: gaps.length,
      findingsCount: validatedFindings.length,
    });
  }

  /**
   * Step 1-3: Research a single gap following the protocol
   */
  private async researchGap(gap: ResearchGap, context: TaskContext): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = [];
    const tools = this.getTools();

    // Priority 1: Existing repository code
    const repoFindings = await this.searchRepository(gap, tools, context);
    findings.push(...repoFindings);

    // Priority 2: Official documentation
    const docFindings = await this.searchDocumentation(gap, tools, context);
    findings.push(...docFindings);

    // Priority 3: Official source code (if dependency)
    if (gap.classification === 'DEPENDENCY') {
      const sourceFindings = await this.searchOfficialSource(gap, tools);
      findings.push(...sourceFindings);
    }

    // Priority 4: Standards/specifications
    const specFindings = await this.searchSpecifications(gap, tools);
    findings.push(...specFindings);

    // Priority 5: Maintainer documentation
    const maintainerFindings = await this.searchMaintainerDocs(gap, tools);
    findings.push(...maintainerFindings);

    // Priority 6: High-quality technical references
    const refFindings = await this.searchTechnicalReferences(gap, tools);
    findings.push(...refFindings);

    return findings;
  }

  private async searchRepository(gap: ResearchGap, tools: ToolRegistry, context: TaskContext): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = [];
    
    // Use grep for exact symbols
    const grepResults = await tools.grep(gap.question, context.metadata.projectRoot as string);
    for (const result of grepResults.slice(0, 20)) {
      findings.push({
        source: 'repository',
        type: 'REPOSITORY',
        content: result,
        citation: `grep: ${result}`,
        knowledgeState: 'CONFIRMED',
      });
    }

    // Use semantic search for broader concepts
    const semanticResults = await tools.semanticSearch(gap.description, context.metadata.projectRoot as string);
    for (const result of semanticResults.slice(0, 10)) {
      findings.push({
        source: 'repository',
        type: 'REPOSITORY',
        content: result.snippet,
        citation: `${result.file}:${result.line}`,
        knowledgeState: 'CONFIRMED',
      });
    }

    return findings;
  }

  private async searchDocumentation(gap: ResearchGap, tools: ToolRegistry, context: TaskContext): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = [];
    
    // Search for README, CHANGELOG, docs
    const docPatterns = ['**/README*', '**/CHANGELOG*', '**/docs/**/*.md', '**/doc/**/*.md'];
    
    for (const pattern of docPatterns) {
      const results = await tools.grep(gap.question, pattern);
      for (const result of results.slice(0, 5)) {
        findings.push({
          source: 'documentation',
          type: 'DOCUMENTATION',
          content: result,
          citation: `doc: ${pattern}`,
          knowledgeState: 'VERIFIED',
        });
      }
    }

    return findings;
  }

  private async searchOfficialSource(gap: ResearchGap, tools: ToolRegistry): Promise<ResearchFinding[]> {
    // In a real implementation, this would fetch from GitHub API
    // For now, return empty - would be implemented with web search
    return [];
  }

  private async searchSpecifications(gap: ResearchGap, tools: ToolRegistry): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = [];
    
    // Search for RFC, ISO, POSIX, language specs
    const specTerms = ['RFC', 'ISO', 'POSIX', 'ECMAScript', 'TypeScript', 'WebAssembly'];
    
    for (const term of specTerms) {
      const results = await tools.webSearch(`${gap.question} ${term} specification`);
      for (const result of results.slice(0, 3)) {
        findings.push({
          source: 'specification',
          type: 'SPECIFICATION',
          content: result.snippet,
          citation: `${term}: ${result.url}`,
          knowledgeState: 'VERIFIED',
        });
      }
    }

    return findings;
  }

  private async searchMaintainerDocs(gap: ResearchGap, tools: ToolRegistry): Promise<ResearchFinding[]> {
    // Search for design docs, ADRs, mailing lists
    const results = await tools.webSearch(`${gap.question} design doc ADR`);
    const findings: ResearchFinding[] = [];
    
    for (const result of results.slice(0, 3)) {
      findings.push({
        source: 'maintainer',
        type: 'MAINTAINER',
        content: result.snippet,
        citation: `maintainer: ${result.url}`,
        knowledgeState: 'INFERRED',
      });
    }

    return findings;
  }

  private async searchTechnicalReferences(gap: ResearchGap, tools: ToolRegistry): Promise<ResearchFinding[]> {
    const findings: ResearchFinding[] = [];
    
    const refSources = ['kernel.org', 'MSDN', 'man pages', 'MDN'];
    
    for (const source of refSources) {
      const results = await tools.webSearch(`${gap.question} ${source}`);
      for (const result of results.slice(0, 2)) {
        findings.push({
          source: 'reference',
          type: 'REFERENCE',
          content: result.snippet,
          citation: `${source}: ${result.url}`,
          knowledgeState: 'INFERRED',
        });
      }
    }

    return findings;
  }

  /**
   * Step 5: Cross-validate findings with actual codebase
   */
  private async crossValidateWithCodebase(
    findings: ResearchFinding[],
    context: TaskContext
  ): Promise<ResearchFinding[]> {
    const tools = this.getTools();
    const validated: ResearchFinding[] = [];

    for (const finding of findings) {
      if (finding.type === 'REPOSITORY') {
        // Already from codebase - confirmed
        validated.push(finding);
        continue;
      }

      // Verify external findings against codebase
      const relatedCode = await tools.semanticSearch(finding.content, context.metadata.projectRoot as string);
      
      if (relatedCode.length > 0) {
        // Cross-validated
        validated.push({
          ...finding,
          knowledgeState: 'VERIFIED',
          citation: `${finding.citation} | validated: ${relatedCode[0].file}:${relatedCode[0].line}`,
        });
      } else {
        // No codebase match - keep as INFERRED but flag
        validated.push({
          ...finding,
          knowledgeState: 'INFERRED',
          citation: `${finding.citation} | NO CODEBASE MATCH`,
        });
      }
    }

    return validated;
  }

  /**
   * Step 6: Produce structured Research Result
   */
  private produceResearchResult(
    gaps: ResearchGap[],
    findings: ResearchFinding[],
    context: TaskContext
  ): ResearchResultExtended {
    const highImpactGaps = gaps.filter(g => g.impact === 'HIGH');
    const highImpactResolved = highImpactGaps.every(gap => 
      findings.some(f => f.content.includes(gap.question) && f.knowledgeState !== 'UNKNOWN')
    );

    const confidence = this.calculateConfidence(findings, highImpactResolved);

    return {
      taskId: context.id,
      findings,  // ResearchFinding[] as defined in interface
      sources: [...new Set(findings.map(f => f.citation))],
      confidence,
      knowledgeState: highImpactResolved ? 'CONFIRMED' : 'INFERRED',
      budgetUsed: context.budgetUsed.research,
      budgetRemaining: this.getRemainingBudget('research'),
      gaps,
      recommendedApproach: this.synthesizeRecommendation(findings),
      alternativeApproaches: this.identifyAlternatives(findings),
      risks: this.identifyRisks(findings),
      unknowns: this.identifyUnknowns(gaps, findings),
      crossValidated: true,
    };
  }

  private calculateConfidence(findings: ResearchFinding[], highImpactResolved: boolean): number {
    if (!highImpactResolved) return 0.3;
    
    const confirmed = findings.filter(f => f.knowledgeState === 'CONFIRMED').length;
    const verified = findings.filter(f => f.knowledgeState === 'VERIFIED').length;
    const total = findings.length;
    
    if (total === 0) return 0.1;
    
    return Math.min(0.9, (confirmed * 1.0 + verified * 0.8) / total);
  }

  private synthesizeRecommendation(findings: ResearchFinding[]): string {
    const confirmed = findings.filter(f => f.knowledgeState === 'CONFIRMED');
    if (confirmed.length > 0) {
      return `Follow repository patterns: ${confirmed[0].content.substring(0, 200)}`;
    }
    const verified = findings.filter(f => f.knowledgeState === 'VERIFIED');
    if (verified.length > 0) {
      return `Follow documented approach: ${verified[0].content.substring(0, 200)}`;
    }
    return 'Insufficient evidence for strong recommendation';
  }

  private identifyAlternatives(findings: ResearchFinding[]): string[] {
    const alternatives = new Set<string>();
    for (const finding of findings) {
      if (finding.content.includes('alternative') || finding.content.includes('option')) {
        alternatives.add(finding.content.substring(0, 200));
      }
    }
    return Array.from(alternatives).slice(0, 5);
  }

  private identifyRisks(findings: ResearchFinding[]): string[] {
    const risks = new Set<string>();
    for (const finding of findings) {
      if (finding.content.includes('deprecat') || finding.content.includes('break') || 
          finding.content.includes('risk') || finding.content.includes('warn')) {
        risks.add(finding.content.substring(0, 200));
      }
    }
    return Array.from(risks).slice(0, 5);
  }

  private identifyUnknowns(gaps: ResearchGap[], findings: ResearchFinding[]): string[] {
    const unknowns: string[] = [];
    for (const gap of gaps) {
      const hasFinding = findings.some(f => f.content.includes(gap.question));
      if (!hasFinding) {
        unknowns.push(`UNRESOLVED: ${gap.description} (${gap.impact} impact)`);
      }
    }
    return unknowns;
  }
}

/**
 * Factory function to create ResearcherAgent with default config
 */
export function createResearcherAgent(toolRegistry: ToolRegistry): ResearcherAgent {
  const config: AgentConfig = {
    type: 'researcher',
    name: 'researcher',
    permissions: {
      read: ['**/*'],
      write: [],
      execute: [],
      network: ['*'],
      budget: { research: 3, review: 0, debug: 0, total: 3 },
    },
    model: 'claude-4-5-sonnet',
  };
  return new ResearcherAgent(config, toolRegistry);
}