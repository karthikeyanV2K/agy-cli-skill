import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Knowledge state for assumptions (from AGENTS.md Law 3)
 */
export enum KnowledgeState {
  CONFIRMED = 'CONFIRMED',
  VERIFIED = 'VERIFIED',
  INFERRED = 'INFERRED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Impact level for assumptions
 */
export enum ImpactLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Assumption entry in the ledger
 */
export interface AssumptionEntry {
  id: string;
  description: string;
  category: string;
  knowledgeState: KnowledgeState;
  impact: ImpactLevel;
  evidence?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Decision entry in the ledger
 */
export interface DecisionEntry {
  id: string;
  question: string;
  options: string[];
  selectedOption: string;
  reason: string;
  evidence: string[];
  tradeoffs: string[];
  madeBy: string;
  createdAt: string;
}

/**
 * Ledger persistence format
 */
interface LedgerData {
  assumptions: AssumptionEntry[];
  decisions: DecisionEntry[];
  version: number;
  lastUpdated: string;
}

/**
 * Default ledger file path
 */
const DEFAULT_LEDGER_PATH = join(process.cwd(), '.agy', 'ledger.json');
const LEDGER_VERSION = 1;

/**
 * AssumptionLedger - tracks assumptions with knowledge states
 * UNKNOWN + HIGH IMPACT → BLOCKER (Law 3)
 */
export class AssumptionLedger {
  private assumptions: Map<string, AssumptionEntry> = new Map();
  private ledgerPath: string;

  constructor(ledgerPath?: string) {
    this.ledgerPath = ledgerPath ?? DEFAULT_LEDGER_PATH;
  }

  /**
   * Add or update an assumption
   */
  add(assumption: Omit<AssumptionEntry, 'createdAt' | 'updatedAt'>): AssumptionEntry {
    const now = new Date().toISOString();
    const existing = this.assumptions.get(assumption.id);

    const entry: AssumptionEntry = {
      ...assumption,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      resolvedAt: assumption.knowledgeState !== KnowledgeState.UNKNOWN ? now : undefined,
      resolvedBy: assumption.knowledgeState !== KnowledgeState.UNKNOWN ? 'system' : undefined,
    };

    this.assumptions.set(assumption.id, entry);
    return entry;
  }

  /**
   * Get an assumption by ID
   */
  get(id: string): AssumptionEntry | undefined {
    return this.assumptions.get(id);
  }

  /**
   * Get all assumptions
   */
  getAll(): AssumptionEntry[] {
    return Array.from(this.assumptions.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Get all HIGH impact UNKNOWN assumptions (blockers per Law 3)
   */
  getHighImpactUnknowns(): AssumptionEntry[] {
    return this.getAll().filter(
      a => a.impact === ImpactLevel.HIGH && a.knowledgeState === KnowledgeState.UNKNOWN
    );
  }

  /**
   * Get assumptions by knowledge state
   */
  getByState(state: KnowledgeState): AssumptionEntry[] {
    return this.getAll().filter(a => a.knowledgeState === state);
  }

  /**
   * Get assumptions by impact level
   */
  getByImpact(impact: ImpactLevel): AssumptionEntry[] {
    return this.getAll().filter(a => a.impact === impact);
  }

  /**
   * Update an assumption's knowledge state
   */
  updateState(id: string, state: KnowledgeState, evidence?: string[], resolvedBy?: string): AssumptionEntry | undefined {
    const assumption = this.assumptions.get(id);
    if (!assumption) return undefined;

    const now = new Date().toISOString();
    const updated: AssumptionEntry = {
      ...assumption,
      knowledgeState: state,
      evidence: evidence ?? assumption.evidence,
      updatedAt: now,
      resolvedAt: state !== KnowledgeState.UNKNOWN ? now : assumption.resolvedAt,
      resolvedBy: state !== KnowledgeState.UNKNOWN ? (resolvedBy ?? 'system') : assumption.resolvedBy,
    };

    this.assumptions.set(id, updated);
    return updated;
  }

  /**
   * Remove an assumption
   */
  remove(id: string): boolean {
    return this.assumptions.delete(id);
  }

  /**
   * Get count of assumptions by state
   */
  getCountByState(): Record<KnowledgeState, number> {
    const counts: Record<KnowledgeState, number> = {
      [KnowledgeState.CONFIRMED]: 0,
      [KnowledgeState.VERIFIED]: 0,
      [KnowledgeState.INFERRED]: 0,
      [KnowledgeState.UNKNOWN]: 0,
    };

    for (const assumption of Array.from(this.assumptions.values())) {
      const state = assumption.knowledgeState;
      counts[state] = (counts[state] ?? 0) + 1;
    }

    return counts;
  }

  /**
   * Load from persistence
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.ledgerPath, 'utf-8');
      const parsed: LedgerData = JSON.parse(data);
      this.assumptions.clear();
      for (const assumption of parsed.assumptions) {
        this.assumptions.set(assumption.id, assumption);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist - start fresh
    }
  }

  /**
   * Save to persistence
   */
  async save(): Promise<void> {
    await this.ensureDirectory();
    const data: LedgerData = {
      assumptions: this.getAll(),
      decisions: [], // Decisions saved by DecisionLedger
      version: LEDGER_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(this.ledgerPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Ensure ledger directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.ledgerPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory may already exist
    }
  }
}

/**
 * DecisionLedger - tracks significant decisions with evidence (Law 5)
 */
export class DecisionLedger {
  private decisions: Map<string, DecisionEntry> = new Map();
  private ledgerPath: string;

  constructor(ledgerPath?: string) {
    this.ledgerPath = ledgerPath ?? DEFAULT_LEDGER_PATH;
  }

  /**
   * Add a decision
   */
  add(decision: Omit<DecisionEntry, 'createdAt'>): DecisionEntry {
    const now = new Date().toISOString();
    const entry: DecisionEntry = {
      ...decision,
      createdAt: now,
    };

    this.decisions.set(decision.id, entry);
    return entry;
  }

  /**
   * Get a decision by ID
   */
  get(id: string): DecisionEntry | undefined {
    return this.decisions.get(id);
  }

  /**
   * Get all decisions
   */
  getAll(): DecisionEntry[] {
    return Array.from(this.decisions.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Get decisions by author
   */
  getByAuthor(author: string): DecisionEntry[] {
    return this.getAll().filter(d => d.madeBy === author);
  }

  /**
   * Remove a decision
   */
  remove(id: string): boolean {
    return this.decisions.delete(id);
  }

  /**
   * Get decision count
   */
  getCount(): number {
    return this.decisions.size;
  }

  /**
   * Load from persistence (shared file with AssumptionLedger)
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.ledgerPath, 'utf-8');
      const parsed: LedgerData = JSON.parse(data);
      this.decisions.clear();
      for (const decision of parsed.decisions) {
        this.decisions.set(decision.id, decision);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Save to persistence (shared file with AssumptionLedger)
   */
  async save(): Promise<void> {
    await this.ensureDirectory();
    // Load existing to preserve assumptions
    let existingAssumptions: AssumptionEntry[] = [];
    try {
      const data = await fs.readFile(this.ledgerPath, 'utf-8');
      const parsed: LedgerData = JSON.parse(data);
      existingAssumptions = parsed.assumptions;
    } catch {
      // File doesn't exist or invalid
    }

    const data: LedgerData = {
      assumptions: existingAssumptions,
      decisions: this.getAll(),
      version: LEDGER_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(this.ledgerPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Ensure ledger directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.ledgerPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory may already exist
    }
  }
}

/**
 * Combined Ledger for convenience - manages both assumptions and decisions
 */
export class Ledger {
  public readonly assumptions: AssumptionLedger;
  public readonly decisions: DecisionLedger;

  constructor(ledgerPath?: string) {
    this.assumptions = new AssumptionLedger(ledgerPath);
    this.decisions = new DecisionLedger(ledgerPath);
  }

  /**
   * Load both ledgers from persistence
   */
  async load(): Promise<void> {
    await Promise.all([
      this.assumptions.load(),
      this.decisions.load(),
    ]);
  }

  /**
   * Save both ledgers to persistence
   */
  async save(): Promise<void> {
    await Promise.all([
      this.assumptions.save(),
      this.decisions.save(),
    ]);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    assumptions: { total: number; byState: Record<KnowledgeState, number>; highImpactUnknowns: number };
    decisions: { total: number };
  } {
    return {
      assumptions: {
        total: this.assumptions.getAll().length,
        byState: this.assumptions.getCountByState(),
        highImpactUnknowns: this.assumptions.getHighImpactUnknowns().length,
      },
      decisions: {
        total: this.decisions.getCount(),
      },
    };
  }
}