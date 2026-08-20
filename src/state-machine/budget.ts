/**
 * Task complexity tiers for dynamic budget allocation
 */
export type TaskComplexityTier = 'MINIMAL' | 'STANDARD' | 'COMPLEX' | 'EXTREME';

/**
 * Dynamic budget configuration per complexity tier
 */
export interface ComplexityBudgetConfig {
  research: number;
  review: number;
  debug: number;
  total: number;
  thinkingTokens: number;
  maxOutputTokens: number;
}

/**
 * Dynamic Caveman Budget Tiers: High Reasoning, Low Output Tokens
 */
export const COMPLEXITY_BUDGET_TIERS: Record<TaskComplexityTier, ComplexityBudgetConfig> = {
  MINIMAL: {
    research: 1,
    review: 1,
    debug: 2,
    total: 4,
    thinkingTokens: 1500,
    maxOutputTokens: 500,
  },
  STANDARD: {
    research: 2,
    review: 2,
    debug: 3,
    total: 7,
    thinkingTokens: 3000,
    maxOutputTokens: 1000,
  },
  COMPLEX: {
    research: 3,
    review: 2,
    debug: 5,
    total: 10,
    thinkingTokens: 4000,
    maxOutputTokens: 1500,
  },
  EXTREME: {
    research: 4,
    review: 3,
    debug: 6,
    total: 13,
    thinkingTokens: 5000,
    maxOutputTokens: 2000,
  },
};

/**
 * Computes dynamic task complexity tier based on archetype, gaps, and file footprint
 */
export function computeTaskComplexity(
  taskType: string,
  gapsCount: number = 0,
  affectedFilesCount: number = 0
): TaskComplexityTier {
  const upperType = taskType.toUpperCase();

  if (upperType.includes('KERNEL') || upperType.includes('DRIVER') || upperType.includes('SECURITY')) {
    return 'EXTREME';
  }
  if (upperType.includes('ARCHITECTURE') || upperType.includes('PERFORMANCE') || upperType.includes('EXTERNAL') || gapsCount >= 3 || affectedFilesCount > 5) {
    return 'COMPLEX';
  }
  if (upperType.includes('DOC') || upperType.includes('BUILD') || upperType.includes('FORMAT') || (gapsCount === 0 && affectedFilesCount <= 1)) {
    return 'MINIMAL';
  }
  return 'STANDARD';
}

/**
 * Budget status for a single budget category
 */
export interface BudgetStatus {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
  surplusCredit?: number;
}

/**
 * Complete budget status across all categories
 */
export interface BudgetTrackerStatus {
  tier: TaskComplexityTier;
  research: BudgetStatus;
  review: BudgetStatus;
  debug: BudgetStatus;
  thinkingTokens: number;
  tokensConsumed: number;
  surplusPool: number;
  overallExhausted: boolean;
}

/**
 * Budget limits (defaults from AGENTS.md Law 10)
 */
export const DEFAULT_BUDGET_LIMITS = {
  research: 3,
  review: 2,
  debug: 5,
} as const;

/**
 * DynamicCavemanBudgetTracker class
 * Implements low-token, high-reasoning dynamic budget scaling:
 * - Dynamic task-tier limits
 * - Elastic surplus pool (saves unused rounds for downstream phases)
 * - Strict token throttling & circuit breaker
 */
export class BudgetTracker {
  private researchCount: number = 0;
  private reviewCount: number = 0;
  private debugCount: number = 0;
  private tokensConsumed: number = 0;
  private surplusPool: number = 0;

  private researchLimit: number;
  private reviewLimit: number;
  private debugLimit: number;
  private thinkingTokens: number;
  private tier: TaskComplexityTier;

  /**
   * Create a new BudgetTracker with optional dynamic complexity tier or custom limits
   */
  constructor(
    limitsOrTier?: Partial<Record<keyof typeof DEFAULT_BUDGET_LIMITS, number>> | TaskComplexityTier
  ) {
    if (typeof limitsOrTier === 'string' && limitsOrTier in COMPLEXITY_BUDGET_TIERS) {
      this.tier = limitsOrTier as TaskComplexityTier;
      const config = COMPLEXITY_BUDGET_TIERS[this.tier];
      this.researchLimit = config.research;
      this.reviewLimit = config.review;
      this.debugLimit = config.debug;
      this.thinkingTokens = config.thinkingTokens;
    } else {
      const limits = limitsOrTier as Partial<Record<keyof typeof DEFAULT_BUDGET_LIMITS, number>> | undefined;
      this.tier = 'STANDARD';
      this.researchLimit = limits?.research ?? DEFAULT_BUDGET_LIMITS.research;
      this.reviewLimit = limits?.review ?? DEFAULT_BUDGET_LIMITS.review;
      this.debugLimit = limits?.debug ?? DEFAULT_BUDGET_LIMITS.debug;
      this.thinkingTokens = 3000;
    }
  }

  /**
   * Adaptively scale budget based on task inspection findings
   */
  scaleComplexity(tier: TaskComplexityTier): void {
    this.tier = tier;
    const config = COMPLEXITY_BUDGET_TIERS[tier];
    this.researchLimit = Math.max(this.researchCount, config.research);
    this.reviewLimit = Math.max(this.reviewCount, config.review);
    this.debugLimit = Math.max(this.debugCount, config.debug);
    this.thinkingTokens = config.thinkingTokens;
  }

  /**
   * Record unused budget from a completed phase into the surplus credit pool
   */
  reclaimUnusedToSurplus(type: 'research' | 'review' | 'debug'): number {
    const remaining = this.getRemaining(type);
    if (remaining > 0) {
      this.surplusPool += remaining;
      // Adjust limit to actual used to lock savings
      if (type === 'research') this.researchLimit = this.researchCount;
      if (type === 'review') this.reviewLimit = this.reviewCount;
      if (type === 'debug') this.debugLimit = this.debugCount;
    }
    return this.surplusPool;
  }

  /**
   * Borrow from surplus pool if phase needs extra iteration
   */
  borrowFromSurplus(type: 'research' | 'review' | 'debug', amount: number = 1): boolean {
    if (this.surplusPool >= amount) {
      this.surplusPool -= amount;
      if (type === 'research') this.researchLimit += amount;
      if (type === 'review') this.reviewLimit += amount;
      if (type === 'debug') this.debugLimit += amount;
      return true;
    }
    return false;
  }

  /**
   * Track token usage
   */
  recordTokenUsage(tokens: number): void {
    this.tokensConsumed += tokens;
  }

  /**
   * Increment research budget counter
   * Throws if budget exhausted
   */
  incrementResearch(): void {
    this.checkBudget('research');
    this.researchCount++;
  }

  /**
   * Increment review budget counter
   * Throws if budget exhausted
   */
  incrementReview(): void {
    this.checkBudget('review');
    this.reviewCount++;
  }

  /**
   * Increment debug budget counter
   * Throws if budget exhausted
   */
  incrementDebug(): void {
    this.checkBudget('debug');
    this.debugCount++;
  }

  /**
   * Check if a specific budget is exhausted
   * @param type - Budget type to check
   * @throws Error if budget exhausted
   */
  checkBudget(type: 'research' | 'review' | 'debug'): void {
    const current = this.getCurrentCount(type);
    const limit = this.getLimit(type);

    if (current >= limit) {
      // Try to auto-reclaim from surplus pool first
      if (this.borrowFromSurplus(type, 1)) {
        return;
      }

      throw new Error(
        `${type.toUpperCase()}_BUDGET exhausted: ${current}/${limit} used (Tier: ${this.tier}). ` +
        'STOP, REPORT BLOCKER, DO NOT PRETEND SUCCESS (Law 10)'
      );
    }
  }

  /**
   * Get current count for a budget type
   */
  private getCurrentCount(type: 'research' | 'review' | 'debug'): number {
    switch (type) {
      case 'research': return this.researchCount;
      case 'review': return this.reviewCount;
      case 'debug': return this.debugCount;
    }
  }

  /**
   * Get limit for a budget type
   */
  private getLimit(type: 'research' | 'review' | 'debug'): number {
    switch (type) {
      case 'research': return this.researchLimit;
      case 'review': return this.reviewLimit;
      case 'debug': return this.debugLimit;
    }
  }

  /**
   * Reset all budget counters to zero
   */
  reset(): void {
    this.researchCount = 0;
    this.reviewCount = 0;
    this.debugCount = 0;
    this.tokensConsumed = 0;
    this.surplusPool = 0;
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetTrackerStatus {
    const research = this.getBudgetStatus('research');
    const review = this.getBudgetStatus('review');
    const debug = this.getBudgetStatus('debug');

    return {
      tier: this.tier,
      research,
      review,
      debug,
      thinkingTokens: this.thinkingTokens,
      tokensConsumed: this.tokensConsumed,
      surplusPool: this.surplusPool,
      overallExhausted: research.exhausted || review.exhausted || debug.exhausted,
    };
  }

  /**
   * Get status for a single budget category
   */
  private getBudgetStatus(type: 'research' | 'review' | 'debug'): BudgetStatus {
    const used = this.getCurrentCount(type);
    const limit = this.getLimit(type);
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      exhausted: used >= limit,
      surplusCredit: this.surplusPool,
    };
  }

  /**
   * Get research budget used count
   */
  getResearchUsed(): number {
    return this.researchCount;
  }

  /**
   * Get review budget used count
   */
  getReviewUsed(): number {
    return this.reviewCount;
  }

  /**
   * Get debug budget used count
   */
  getDebugUsed(): number {
    return this.debugCount;
  }

  /**
   * Check if any budget is exhausted (convenience method)
   */
  isAnyExhausted(): boolean {
    return this.getStatus().overallExhausted;
  }

  /**
   * Get remaining budget for a specific type
   */
  getRemaining(type: 'research' | 'review' | 'debug'): number {
    return this.getBudgetStatus(type).remaining;
  }

  /**
   * Create a new BudgetTracker with the same limits but reset counters
   */
  clone(): BudgetTracker {
    const clone = new BudgetTracker({
      research: this.researchLimit,
      review: this.reviewLimit,
      debug: this.debugLimit,
    });
    clone.tier = this.tier;
    clone.thinkingTokens = this.thinkingTokens;
    return clone;
  }
}