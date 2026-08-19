export type TaskType =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'research'
  | 'documentation'
  | 'test';

export type AgentType =
  | 'orchestrator'
  | 'researcher'
  | 'architect'
  | 'implementer'
  | 'validator'
  | 'debugger'
  | 'reviewer';

export type Phase =
  | 'DISCOVERY'
  | 'RESEARCH'
  | 'ANALYSIS'
  | 'PLANNING'
  | 'IMPLEMENTATION'
  | 'VALIDATION'
  | 'DEBUGGING'
  | 'REVIEW'
  | 'COMPLETE';

export type GateStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'BLOCKED';

export type KnowledgeState =
  | 'UNKNOWN'
  | 'INFERRED'
  | 'VERIFIED'
  | 'CONFIRMED';

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ValidationLevel =
  | 'FORMAT'
  | 'STATIC_ANALYSIS'
  | 'BUILD'
  | 'UNIT_TEST'
  | 'INTEGRATION_TEST'
  | 'E2E_TEST'
  | 'REGRESSION_TEST';

export type TaskContext = {
  taskId: string;
  taskType: string;
  description: string;
  phase: Phase;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
  repositoryInspected: boolean;
  requirementsDecomposed: boolean;
  knowledgeGapsIdentified: boolean;
  researchCompleted: boolean;
  researchCrossValidated: boolean;
  architecturePlanCreated: boolean;
  architectureGateApproved: boolean;
  implementationCompleted: boolean;
  buildSuccessful: boolean;
  testsPassed: boolean;
  regressionChecked: boolean;
  diffReviewed: boolean;
  noUnexplainedHardcoding: boolean;
  noKnownUnresolvedIssues: boolean;
  researchRoundsUsed: number;
  reviewRoundsUsed: number;
  debugIterationsUsed: number;
  assumptions: any[];
  decisions: any[];
  architecturePlan?: any;
  researchResults?: any[];
  repositorySummary?: string;
  constraints?: any[];
  assumptionLedger?: any[];
  decisionLedger?: any[];
  relevantFiles?: string[];
  implementationResult?: any;
  validationResult?: any;
  debugRecord?: any;
  reviewReport?: any;
  researchFindings?: ResearchResult[];
  previousFailures?: FailureRecord[];
  testResults?: TestResult[];
  reviewerFindings?: ReviewFinding[];
};

export interface ResearchFinding {
  question: string;
  answer: string;
  evidence: string[];
  sources: string[];
  knowledgeState: KnowledgeState;
  impact: ImpactLevel;
  confidence: number;
}

export interface ResearchResult {
  taskId: string;
  findings: ResearchFinding[];
  sources: string[];
  confidence: number;
  knowledgeState: KnowledgeState;
  budgetUsed: number;
  budgetRemaining: number;
  gapsIdentified: string[];
  crossValidated: boolean;
}

export interface ResearchResultExtended extends ResearchResult {
  gaps: KnowledgeGap[];
}

export interface KnowledgeGap {
  id: string;
  type: 'REPOSITORY' | 'DEPENDENCY' | 'API' | 'LANGUAGE' | 'PROTOCOL' | 'SYSTEM' | 'ARCHITECTURE' | 'SECURITY' | 'TESTING';
  description: string;
  impact: ImpactLevel;
  question: string;
  resolved: boolean;
}

export interface ArchitecturePlan {
  taskId: string;
  components: any[];
  interfaces: any[];
  dataFlow: any[];
  constraints: any[];
  assumptions: any[];
  decisions: any[];
  dependencies: string[];
  testingStrategy: ValidationLevel[];
}

export interface ArchitecturePlanExtended extends ArchitecturePlan {
  gateStatus: 'APPROVED' | 'RESEARCH_REQUIRED' | 'REJECTED';
  gateRationale: string;
}

export interface ComponentSpec {
  name: string;
  type: string;
  responsibilities: string[];
  dependencies: string[];
}

export interface InterfaceSpec {
  name: string;
  methods: any[];
  events: any[];
}

export interface MethodSpec {
  name: string;
  params: any[];
  returnType: string;
  async: boolean;
}

export interface ParamSpec {
  name: string;
  type: string;
  optional: boolean;
}

export interface EventSpec {
  name: string;
  payload: string;
}

export interface DataFlowSpec {
  from: string;
  to: string;
  dataType: string;
  transformation?: string;
}

export interface ConstraintSpec {
  type: 'performance' | 'security' | 'compatibility' | 'resource';
  description: string;
  severity: 'must' | 'should' | 'nice';
}

export interface ImplementationResult {
  taskId: string;
  filesCreated: string[];
  filesModified: string[];
  testsAdded: string[];
  linesAdded: number;
  linesRemoved: number;
  compileErrors: string[];
}

export interface ImplementationResultExtended extends ImplementationResult {
  whyMappings: any[];
  assumptionsHonored: string[];
  decisionsFollowed: string[];
  qualityGates: any[];
}

export interface QualityGateResult {
  gate: string;
  passed: boolean;
  details: string;
}

export interface ValidationLevelResult {
  level: ValidationLevel;
  duration: number;
  passed: boolean;
  details: string;
  artifacts?: string[];
}

export interface ValidationResult {
  taskId: string;
  passed: boolean;
  checks: any[];
  coverage: any;
  levelResults: ValidationLevelResult[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CoverageReport {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  message?: string;
}

export interface FailureRecord {
  issue: string;
  resolution?: string;
  steps: DebugStep[];
  timeSpent: number;
  rootCause?: string;
  fix?: string;
}

export interface FailureRecord {
  issue: string;
  resolution?: string;
  steps: DebugStep[];
  timeSpent: number;
  rootCause?: string;
  fix?: string;
}
export interface DebugRecord {
  taskId: string;
  issue: string;
  hypothesis: string;
  steps: any[];
  resolution?: string;
  timeSpent: number;
  rootCause?: string;
  fix?: string;
  classification?: string;
}

export interface DebugStep {
  action: string;
  observation: string;
  timestamp: Date;
}

export interface ReviewReport {
  taskId: string;
  reviewer: AgentType;
  findings: any[];
  approved: boolean;
  budgetUsed: number;
  regressionChecked: boolean;
  diffReviewed: boolean;
  noHardcoding: boolean;
  noUnresolvedIssues: boolean;
}

export interface ReviewFinding {
  category: string;
  severity: 'critical' | 'major' | 'minor' | 'nit';
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export interface FinalVerification {
  taskId: string;
  allGatesPassed: boolean;
  gateResults: any[];
  finalBudget: any;
  signOff: any;
}

export interface GateResult {
  gate: string;
  status: GateStatus;
  details: string;
}

export interface BudgetSnapshot {
  research: { used: number; limit: number };
  review: { used: number; limit: number };
  debug: { used: number; limit: number };
  total: { used: number; limit: number };
}

export interface SignOff {
  approved: boolean;
  approver: string;
  timestamp: Date;
  conditions?: string[];
}

export interface Assumption {
  id: string;
  description: string;
  rationale: string;
  confidence: number;
  validated: boolean;
  createdAt: Date;
  impact: ImpactLevel;
}

export interface Decision {
  id: string;
  context: string;
  options: string[];
  chosen: string;
  rationale: string;
  tradeoffs: string[];
  createdAt: Date;
}

export interface BudgetConfig {
  research: number;
  review: number;
  debug: number;
  total: number;
}

export interface AgentPermissions {
  read: string[];
  write: string[];
  execute: string[];
  network: string[];
  budget: BudgetConfig;
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  permissions: AgentPermissions;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  budgetUsed?: { research: number; review: number; debug: number };
}

export interface OrchestratorConfig {
  agents: AgentConfig[];
  defaultBudget: BudgetConfig;
  maxConcurrentTasks: number;
  gateTimeouts: Record<string, number>;
}

export interface SkillConfig {
  name: string;
  version: string;
  description?: string;
  triggers: string[];
  permissions: AgentPermissions;
}

export type ExtendedTaskType =
  | 'BUG'
  | 'FEATURE_INTERNAL'
  | 'FEATURE_EXTERNAL'
  | 'REFACTOR'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'ARCHITECTURE'
  | 'KERNEL_DRIVER'
  | 'BUILD_CI'
  | 'TEST'
  | 'DOCUMENTATION';

export type GateCheck = {
  name: string;
  passed: boolean;
  description: string;
};

export interface GateResultExtended {
  gate: string;
  status: GateStatus;
  details: string;
  failedGates: string[];
  passed: boolean;
}

export const DEFAULT_BUDGET: BudgetConfig = {
  research: 3,
  review: 2,
  debug: 5,
  total: 10,
};

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
}
