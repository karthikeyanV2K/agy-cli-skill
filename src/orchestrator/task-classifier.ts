import type { TaskType } from '../types/index.js';

/**
 * Extended TaskType per AGENTS.md specification
 * Includes all specific task types for proper agent chain assignment
 */
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

/**
 * Keywords and patterns for each task type classification
 */
const CLASSIFICATION_RULES: ReadonlyArray<{
  type: ExtendedTaskType;
  keywords: readonly string[];
  patterns: readonly RegExp[];
}> = [
  {
    type: 'BUG',
    keywords: ['bug', 'fix', 'crash', 'error', 'exception', 'broken', 'failing', 'regression', 'defect', 'issue'],
    patterns: [
      /\bfix\s+(?:the\s+)?(?:bug|issue|error|crash)/i,
      /\b(broken|not\s+working|fails?)\b/i,
      /\bregression\b/i,
    ],
  },
  {
    type: 'FEATURE_INTERNAL',
    keywords: ['feature', 'add', 'implement', 'create', 'build', 'new', 'internal', 'component', 'module'],
    patterns: [
      /\b(add|implement|create|build)\s+(?:a\s+)?(?:new\s+)?(?:feature|component|module|function)/i,
      /\binternal\s+(?:feature|component|module)\b/i,
    ],
  },
  {
    type: 'FEATURE_EXTERNAL',
    keywords: ['api', 'integration', 'external', 'third-party', 'webhook', 'rest', 'graphql', 'grpc', 'sdk'],
    patterns: [
      /\b(?:integrate|connect|consume)\s+(?:with\s+)?(?:external|third-party|api)/i,
      /\b(external\s+api|third-party|webhook)\b/i,
    ],
  },
  {
    type: 'REFACTOR',
    keywords: ['refactor', 'restructure', 'reorganize', 'cleanup', 'modernize', 'simplify', 'extract', 'rename'],
    patterns: [
      /\brefactor\b/i,
      /\b(restructure|reorganize|clean\s+up|modernize)\b/i,
      /\bextract\s+(?:function|class|module|component)\b/i,
    ],
  },
  {
    type: 'PERFORMANCE',
    keywords: ['performance', 'optimize', 'speed', 'latency', 'throughput', 'memory', 'cpu', 'profiling', 'benchmark'],
    patterns: [
      /\b(?:optimize|improve)\s+(?:performance|speed|latency|throughput)\b/i,
      /\b(?:memory|cpu)\s+(?:usage|optimization)\b/i,
      /\bprofiling\b/i,
    ],
  },
  {
    type: 'SECURITY',
    keywords: ['security', 'vulnerability', 'auth', 'authorization', 'encryption', 'audit', 'threat', 'xss', 'csrf', 'sql injection'],
    patterns: [
      /\b(?:security|vulnerability|auth(?:entication|orization)?)\b/i,
      /\b(?:encryption|audit|threat\s+model)\b/i,
      /\b(xss|csrf|sql\s+injection)\b/i,
    ],
  },
  {
    type: 'ARCHITECTURE',
    keywords: ['architecture', 'design', 'system', 'scalability', 'microservice', 'monolith', 'pattern', 'structure'],
    patterns: [
      /\b(?:architecture|architectural)\s+(?:change|review|decision)\b/i,
      /\b(?:system\s+design|scalability|microservice)\b/i,
    ],
  },
  {
    type: 'KERNEL_DRIVER',
    keywords: ['kernel', 'driver', 'syscall', 'module', 'firmware', 'hardware', 'interrupt', 'dma', 'ioctl'],
    patterns: [
      /\b(?:kernel|driver|syscall)\b/i,
      /\b(?:firmware|hardware|interrupt|dma|ioctl)\b/i,
    ],
  },
  {
    type: 'BUILD_CI',
    keywords: ['build', 'ci', 'cd', 'pipeline', 'deploy', 'release', 'artifact', 'docker', 'github actions', 'gitlab'],
    patterns: [
      /\b(?:build|ci|cd|pipeline)\b/i,
      /\b(?:deploy|release|artifact)\b/i,
      /\b(?:docker|github\s+actions|gitlab)\b/i,
    ],
  },
  {
    type: 'TEST',
    keywords: ['test', 'unit', 'integration', 'e2e', 'coverage', 'mock', 'stub', 'fixture', 'assertion'],
    patterns: [
      /\b(?:unit|integration|e2e)\s+test\b/i,
      /\b(?:test\s+coverage|add\s+tests?)\b/i,
    ],
  },
  {
    type: 'DOCUMENTATION',
    keywords: ['document', 'readme', 'docs', 'comment', 'changelog', 'guide', 'tutorial', 'spec', 'api doc'],
    patterns: [
      /\b(?:document|readme|docs?|changelog)\b/i,
      /\b(?:guide|tutorial|specification|api\s+doc)\b/i,
    ],
  },
];

/**
 * Scores a description against classification rules
 */
function scoreType(description: string, rule: { keywords: readonly string[]; patterns: readonly RegExp[] }): number {
  const lower = description.toLowerCase();
  let score = 0;

  // Keyword matching (each keyword adds 1 point)
  for (const keyword of rule.keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  // Pattern matching (each match adds 3 points for higher confidence)
  for (const pattern of rule.patterns) {
    if (pattern.test(description)) {
      score += 3;
    }
  }

  return score;
}

/**
 * Classifies a task description into an ExtendedTaskType
 * Uses keyword and pattern matching for mechanical classification
 * No LLM calls - purely deterministic based on AGENTS.md rules
 */
export function classifyTask(description: string): ExtendedTaskType {
  if (!description || description.trim().length === 0) {
    return 'FEATURE_INTERNAL'; // Default fallback
  }

  let bestType: ExtendedTaskType = 'FEATURE_INTERNAL';
  let bestScore = -1;

  for (const rule of CLASSIFICATION_RULES) {
    const score = scoreType(description, rule);
    if (score > bestScore) {
      bestScore = score;
      bestType = rule.type;
    }
  }

  // If no keywords matched, default to FEATURE_INTERNAL
  if (bestScore <= 0) {
    return 'FEATURE_INTERNAL';
  }

  return bestType;
}

/**
 * Maps ExtendedTaskType to base TaskType for compatibility
 */
export function toBaseTaskType(extended: ExtendedTaskType): TaskType {
  const mapping: Record<ExtendedTaskType, TaskType> = {
    BUG: 'bugfix',
    FEATURE_INTERNAL: 'feature',
    FEATURE_EXTERNAL: 'feature',
    REFACTOR: 'refactor',
    PERFORMANCE: 'feature', // Treated as feature with perf focus
    SECURITY: 'feature',    // Treated as feature with security focus
    ARCHITECTURE: 'feature',
    KERNEL_DRIVER: 'feature',
    BUILD_CI: 'feature',
    TEST: 'test',
    DOCUMENTATION: 'documentation',
  };
  return mapping[extended];
}

/**
 * Gets all available task types
 */
export function getAllTaskTypes(): readonly ExtendedTaskType[] {
  return CLASSIFICATION_RULES.map(r => r.type);
}