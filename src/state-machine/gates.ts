/**
 * Gate verification result type
 */
export interface GateVerificationResult {
  passed: boolean;
  reason: string;
  evidence: string[];
}

/**
 * Knowledge gap impact levels
 */
export enum ImpactLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Knowledge gap confidence levels
 */
export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Knowledge gap status
 */
export enum GapStatus {
  UNKNOWN = 'UNKNOWN',
  RESEARCHING = 'RESEARCHING',
  RESOLVED = 'RESOLVED',
}

/**
 * Knowledge gap interface
 */
export interface KnowledgeGap {
  id: string;
  description: string;
  category: string;
  impact: ImpactLevel;
  confidence: ConfidenceLevel;
  status: GapStatus;
  evidence?: string[];
  resolvedAt?: string;
}

/**
 * Architecture plan status
 */
export enum PlanStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Architecture plan interface
 */
export interface ArchitecturePlan {
  id: string;
  title: string;
  status: PlanStatus;
  approver?: string;
  approvedAt?: string;
  content: string;
  gatesPassed: string[];
}

/**
 * Implementation completion status
 */
export interface ImplementationStatus {
  complete: boolean;
  whyAnswered: boolean;
  filesModified: string[];
  testsAdded: string[];
  buildPassed: boolean;
}

/**
 * Validation levels
 */
export enum ValidationLevel {
  UNIT = 'UNIT',
  INTEGRATION = 'INTEGRATION',
  E2E = 'E2E',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
}

/**
 * Validation result
 */
export interface ValidationResult {
  level: ValidationLevel;
  passed: boolean;
  details: string;
}

/**
 * Review finding severity
 */
export enum FindingSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Review finding
 */
export interface ReviewFinding {
  id: string;
  category: string;
  severity: FindingSeverity;
  description: string;
  resolved: boolean;
}

/**
 * Review status
 */
export enum ReviewStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Review result
 */
export interface ReviewResult {
  status: ReviewStatus;
  findings: ReviewFinding[];
  reviewer: string;
  reviewedAt: string;
}

/**
 * Final checklist item
 */
export interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  evidence?: string;
}

/**
 * Discovery gate context
 */
export interface DiscoveryGateContext {
  repositoryInspected: boolean;
  inspectionEvidence: string[];
  relevantFilesFound: string[];
}

/**
 * Research gate context
 */
export interface ResearchGateContext {
  gaps: KnowledgeGap[];
}

/**
 * Architecture gate context
 */
export interface ArchitectureGateContext {
  plan: ArchitecturePlan | null;
}

/**
 * Implementation gate context
 */
export interface ImplementationGateContext {
  status: ImplementationStatus;
}

/**
 * Validation gate context
 */
export interface ValidationGateContext {
  results: ValidationResult[];
}

/**
 * Review gate context
 */
export interface ReviewGateContext {
  review: ReviewResult;
}

/**
 * Final gate context
 */
export interface FinalGateContext {
  checklist: ChecklistItem[];
}

/**
 * Verify Discovery Gate
 * Checks: repository inspected
 * Required: repositoryInspected = true with evidence
 */
export function verifyDiscoveryGate(context: DiscoveryGateContext): GateVerificationResult {
  const evidence: string[] = [];

  if (!context.repositoryInspected) {
    return {
      passed: false,
      reason: 'Repository has not been inspected',
      evidence: ['repositoryInspected = false'],
    };
  }

  if (!context.inspectionEvidence || context.inspectionEvidence.length === 0) {
    return {
      passed: false,
      reason: 'No inspection evidence provided',
      evidence: ['inspectionEvidence is empty'],
    };
  }

  evidence.push('Repository inspection completed');
  evidence.push(...context.inspectionEvidence);
  evidence.push(`Relevant files found: ${context.relevantFilesFound.length}`);

  return {
    passed: true,
    reason: 'Discovery gate passed - repository inspected with evidence',
    evidence,
  };
}

/**
 * Verify Research Gate
 * Checks: all HIGH impact gaps resolved, confidence >= MEDIUM
 * Required: No UNKNOWN + HIGH IMPACT gaps, all gaps have confidence >= MEDIUM
 */
export function verifyResearchGate(context: ResearchGateContext): GateVerificationResult {
  const evidence: string[] = [];
  const highImpactUnknowns = context.gaps.filter(
    g => g.impact === ImpactLevel.HIGH && g.status === GapStatus.UNKNOWN
  );

  if (highImpactUnknowns.length > 0) {
    return {
      passed: false,
      reason: `${highImpactUnknowns.length} HIGH impact gap(s) remain UNKNOWN`,
      evidence: highImpactUnknowns.map(g => `Gap ${g.id}: ${g.description}`),
    };
  }

  const lowConfidenceGaps = context.gaps.filter(
    g => g.confidence === ConfidenceLevel.LOW && g.status !== GapStatus.RESOLVED
  );

  if (lowConfidenceGaps.length > 0) {
    return {
      passed: false,
      reason: `${lowConfidenceGaps.length} gap(s) have LOW confidence`,
      evidence: lowConfidenceGaps.map(g => `Gap ${g.id}: ${g.description} (confidence: ${g.confidence})`),
    };
  }

  const unresolvedHighImpact = context.gaps.filter(
    g => g.impact === ImpactLevel.HIGH && g.status !== GapStatus.RESOLVED
  );

  if (unresolvedHighImpact.length > 0) {
    return {
      passed: false,
      reason: `${unresolvedHighImpact.length} HIGH impact gap(s) not resolved`,
      evidence: unresolvedHighImpact.map(g => `Gap ${g.id}: ${g.description} (status: ${g.status})`),
    };
  }

  evidence.push(`Total gaps: ${context.gaps.length}`);
  evidence.push(`Resolved: ${context.gaps.filter(g => g.status === GapStatus.RESOLVED).length}`);
  evidence.push(`HIGH impact resolved: ${context.gaps.filter(g => g.impact === ImpactLevel.HIGH && g.status === GapStatus.RESOLVED).length}`);
  evidence.push('All HIGH impact gaps resolved with confidence >= MEDIUM');

  return {
    passed: true,
    reason: 'Research gate passed - all HIGH impact gaps resolved, confidence >= MEDIUM',
    evidence,
  };
}

/**
 * Verify Architecture Gate
 * Checks: plan exists, status = APPROVED
 * Required: ArchitecturePlan exists and status === APPROVED
 */
export function verifyArchitectureGate(context: ArchitectureGateContext): GateVerificationResult {
  const evidence: string[] = [];

  if (!context.plan) {
    return {
      passed: false,
      reason: 'No architecture plan exists',
      evidence: ['plan is null'],
    };
  }

  if (context.plan.status !== PlanStatus.APPROVED) {
    return {
      passed: false,
      reason: `Architecture plan status is ${context.plan.status}, required APPROVED`,
      evidence: [`Plan ID: ${context.plan.id}`, `Status: ${context.plan.status}`],
    };
  }

  if (!context.plan.approver || !context.plan.approvedAt) {
    return {
      passed: false,
      reason: 'Architecture plan missing approver or approval timestamp',
      evidence: [`Approver: ${context.plan.approver ?? 'missing'}`, `ApprovedAt: ${context.plan.approvedAt ?? 'missing'}`],
    };
  }

  evidence.push(`Plan ID: ${context.plan.id}`);
  evidence.push(`Title: ${context.plan.title}`);
  evidence.push(`Status: ${context.plan.status}`);
  evidence.push(`Approver: ${context.plan.approver}`);
  evidence.push(`Approved at: ${context.plan.approvedAt}`);
  evidence.push(`Gates passed: ${context.plan.gatesPassed.join(', ') || 'none'}`);

  return {
    passed: true,
    reason: 'Architecture gate passed - plan exists and is APPROVED',
    evidence,
  };
}

/**
 * Verify Implementation Gate
 * Checks: implementation complete, WHY answered
 * Required: complete = true, whyAnswered = true, buildPassed = true
 */
export function verifyImplementationGate(context: ImplementationGateContext): GateVerificationResult {
  const evidence: string[] = [];
  const { status } = context;

  if (!status.complete) {
    return {
      passed: false,
      reason: 'Implementation not marked complete',
      evidence: ['complete = false'],
    };
  }

  if (!status.whyAnswered) {
    return {
      passed: false,
      reason: 'WHY questions not answered for implementation',
      evidence: ['whyAnswered = false'],
    };
  }

  if (!status.buildPassed) {
    return {
      passed: false,
      reason: 'Build did not pass',
      evidence: ['buildPassed = false'],
    };
  }

  evidence.push('Implementation marked complete');
  evidence.push('WHY questions answered');
  evidence.push('Build passed');
  evidence.push(`Files modified: ${status.filesModified.length}`);
  evidence.push(`Tests added: ${status.testsAdded.length}`);

  return {
    passed: true,
    reason: 'Implementation gate passed - complete, WHY answered, build passed',
    evidence,
  };
}

/**
 * Verify Validation Gate
 * Checks: validation levels passed
 * Required: At least UNIT and INTEGRATION passed, others as required by plan
 */
export function verifyValidationGate(context: ValidationGateContext): GateVerificationResult {
  const evidence: string[] = [];
  const { results } = context;

  if (!results || results.length === 0) {
    return {
      passed: false,
      reason: 'No validation results provided',
      evidence: ['results array is empty'],
    };
  }

  const unitResult = results.find(r => r.level === ValidationLevel.UNIT);
  const integrationResult = results.find(r => r.level === ValidationLevel.INTEGRATION);

  if (!unitResult || !unitResult.passed) {
    return {
      passed: false,
      reason: 'UNIT validation failed or missing',
      evidence: unitResult ? [`UNIT: ${unitResult.details}`] : ['UNIT validation not run'],
    };
  }

  if (!integrationResult || !integrationResult.passed) {
    return {
      passed: false,
      reason: 'INTEGRATION validation failed or missing',
      evidence: integrationResult ? [`INTEGRATION: ${integrationResult.details}`] : ['INTEGRATION validation not run'],
    };
  }

  const failedValidations = results.filter(r => !r.passed);
  if (failedValidations.length > 0) {
    return {
      passed: false,
      reason: `${failedValidations.length} validation level(s) failed`,
      evidence: failedValidations.map(r => `${r.level}: ${r.details}`),
    };
  }

  evidence.push(...results.map(r => `${r.level}: ${r.passed ? 'PASSED' : 'FAILED'} - ${r.details}`));
  evidence.push('All required validation levels passed');

  return {
    passed: true,
    reason: 'Validation gate passed - all required levels passed',
    evidence,
  };
}

/**
 * Verify Review Gate
 * Checks: review status = APPROVED, no UNKNOWN HIGH findings
 * Required: status === APPROVED, no findings with severity HIGH/CRITICAL and resolved = false
 */
export function verifyReviewGate(context: ReviewGateContext): GateVerificationResult {
  const evidence: string[] = [];
  const { review } = context;

  if (review.status !== ReviewStatus.APPROVED) {
    return {
      passed: false,
      reason: `Review status is ${review.status}, required APPROVED`,
      evidence: [`Status: ${review.status}`, `Reviewer: ${review.reviewer}`, `Reviewed at: ${review.reviewedAt}`],
    };
  }

  const unresolvedHighFindings = review.findings.filter(
    f => (f.severity === FindingSeverity.HIGH || f.severity === FindingSeverity.CRITICAL) && !f.resolved
  );

  if (unresolvedHighFindings.length > 0) {
    return {
      passed: false,
      reason: `${unresolvedHighFindings.length} unresolved HIGH/CRITICAL finding(s)`,
      evidence: unresolvedHighFindings.map(f => `${f.category} (${f.severity}): ${f.description}`),
    };
  }

  evidence.push(`Review status: ${review.status}`);
  evidence.push(`Reviewer: ${review.reviewer}`);
  evidence.push(`Reviewed at: ${review.reviewedAt}`);
  evidence.push(`Total findings: ${review.findings.length}`);
  evidence.push(`Resolved: ${review.findings.filter(f => f.resolved).length}`);
  evidence.push('No unresolved HIGH/CRITICAL findings');

  return {
    passed: true,
    reason: 'Review gate passed - status APPROVED, no unresolved HIGH/CRITICAL findings',
    evidence,
  };
}

/**
 * Verify Final Gate
 * Checks: all 12 checklist items completed
 * Required: All 12 items from Law 9 have completed = true
 */
export function verifyFinalGate(context: FinalGateContext): GateVerificationResult {
  const evidence: string[] = [];
  const { checklist } = context;

  if (!checklist || checklist.length === 0) {
    return {
      passed: false,
      reason: 'No checklist provided',
      evidence: ['checklist is empty'],
    };
  }

  const incompleteItems = checklist.filter(item => !item.completed);

  if (incompleteItems.length > 0) {
    return {
      passed: false,
      reason: `${incompleteItems.length} of ${checklist.length} checklist items incomplete`,
      evidence: incompleteItems.map(item => `${item.id}: ${item.description}`),
    };
  }

  if (checklist.length < 12) {
    return {
      passed: false,
      reason: `Checklist has only ${checklist.length} items, expected 12 (Law 9)`,
      evidence: [`Expected 12 items, got ${checklist.length}`],
    };
  }

  evidence.push(`All ${checklist.length} checklist items completed`);
  evidence.push(...checklist.map(item => `${item.id}: ${item.description} - ${item.evidence ?? 'verified'}`));

  return {
    passed: true,
    reason: 'Final gate passed - all 12 checklist items completed',
    evidence,
  };
}