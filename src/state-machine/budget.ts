/**
 * Budget status for a single budget category
 */
export interface BudgetStatus {
  used: number;
  limit: number;
  remaining: number;
  exhausted: boolean;
}

/**
 * Complete budget status across all categories
 */
export interface BudgetTrackerStatus {
  research: BudgetStatus;
  review: BudgetStatus;
  debug: BudgetStatus;
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
 * BudgetTracker class for enforcing configurable budgets
 * Research budget: max research rounds (default: 3)
 * Review budget: max review rounds (default: 2)
 * Debug budget: max fix iterations (default: 5)
 */
export class BudgetTracker {
  private researchCount: number = 0;
  private reviewCount: number = 0;
  private debugCount: number = 0;

  private readonly researchLimit: number;
  private readonly reviewLimit: number;
  private readonly debugLimit: number;

  /**
   * Create a new BudgetTracker with optional custom limits
   * @param limits - Custom budget limits (uses defaults if not provided)
   */
  constructor(limits?: Partial<Record<keyof typeof DEFAULT_BUDGET_LIMITS, number>>) {
    this.researchLimit = limits?.research ?? DEFAULT_BUDGET_LIMITS.research;
    this.reviewLimit = limits?.review ?? DEFAULT_BUDGET_LIMITS.review;
    this.debugLimit = limits?.debug ?? DEFAULT_BUDGET_LIMITS.debug;
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
      throw new Error(
        `${type.toUpperCase()}_BUDGET exhausted: ${current}/${limit} used. ` +
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
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetTrackerStatus {
    const research = this.getBudgetStatus('research');
    const review = this.getBudgetStatus('review');
    const debug = this.getBudgetStatus('debug');

    return {
      research,
      review,
      debug,
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
    return new BudgetTracker({
      research: this.researchLimit,
      review: this.reviewLimit,
      debug: this.debugLimit,
    });
  }
}