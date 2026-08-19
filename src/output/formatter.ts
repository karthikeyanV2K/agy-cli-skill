import { join } from 'node:path';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

import type { Phase, GateStatus, BudgetSnapshot, GateResult, SignOff, CheckResult, ValidationLevelResult, ReviewFinding, Assumption, Decision, ResearchFinding, KnowledgeGap } from '../types/index.js';

export interface SpinnerOptions {
  text: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'magenta' | 'cyan';
}

export interface PhaseProgress {
  phase: Phase;
  status: 'active' | 'completed' | 'failed' | 'skipped';
  message?: string;
}

export interface GateDisplayResult {
  gate: string;
  status: GateStatus;
  details: string;
  duration?: number;
}

export interface VerificationChecklist {
  checks: Array<{
    name: string;
    passed: boolean;
    required: boolean;
    details?: string;
  }>;
  allPassed: boolean;
}

export class OutputFormatter {
  private spinners: Map<string, Ora> = new Map();
  private verbose: boolean;
  private useColor: boolean;

  constructor(verbose: boolean = false, useColor: boolean = true) {
    this.verbose = verbose;
    this.useColor = useColor;
  }

  private style(text: string, color: keyof typeof chalk): string {
    if (!this.useColor) return text;
    return (chalk as any)[color](text);
  }

  private bold(text: string): string {
    if (!this.useColor) return text;
    return chalk.bold(text);
  }

  private dim(text: string): string {
    if (!this.useColor) return text;
    return chalk.dim(text);
  }

  // Header and banner
  banner(title: string, subtitle?: string): void {
    const width = 60;
    const line = '═'.repeat(width);
    const titleLine = `  ${title}  `.padStart((width + title.length) / 2).padEnd(width);
    
    console.log(this.style(line, 'cyan'));
    console.log(this.bold(this.style(titleLine, 'cyan')));
    if (subtitle) {
      const subLine = `  ${subtitle}  `.padStart((width + subtitle.length) / 2).padEnd(width);
      console.log(this.dim(subLine));
    }
    console.log(this.style(line, 'cyan'));
    console.log();
  }

  section(title: string): void {
    console.log();
    console.log(this.bold(this.style(`▶ ${title}`, 'blue')));
    console.log(this.dim('─'.repeat(50)));
  }

  // Spinners for phase progress
  startSpinner(id: string, options: SpinnerOptions): void {
    const spinner = ora({
      text: options.text,
      color: options.color || 'blue',
      spinner: 'dots',
    }).start();
    this.spinners.set(id, spinner);
  }

  updateSpinner(id: string, text: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = text;
    }
  }

  succeedSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      if (text) spinner.text = text;
      spinner.succeed();
      this.spinners.delete(id);
    }
  }

  failSpinner(id: string, text?: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      if (text) spinner.text = text;
      spinner.fail();
      this.spinners.delete(id);
    }
  }

  stopSpinner(id: string): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.stop();
      this.spinners.delete(id);
    }
  }

  // Phase progress display
  phaseProgress(progress: PhaseProgress): void {
    const icons = {
      active: this.style('⟳', 'blue'),
      completed: this.style('✓', 'green'),
      failed: this.style('✗', 'red'),
      skipped: this.style('⊘', 'yellow'),
    };
    const statusText = {
      active: this.style('RUNNING', 'blue'),
      completed: this.style('COMPLETED', 'green'),
      failed: this.style('FAILED', 'red'),
      skipped: this.style('SKIPPED', 'yellow'),
    };

    const phaseName = progress.phase.padEnd(16);
    const icon = icons[progress.status];
    const status = statusText[progress.status];
    const msg = progress.message ? ` - ${progress.message}` : '';

    console.log(`  ${icon} ${this.bold(phaseName)} ${status}${msg}`);
  }

  phaseProgressList(phases: PhaseProgress[]): void {
    for (const phase of phases) {
      this.phaseProgress(phase);
    }
  }

  // Gate results display
  gateResult(result: GateDisplayResult): void {
    const statusIcons = {
      PASSED: this.style('✓', 'green'),
      FAILED: this.style('✗', 'red'),
      BLOCKED: this.style('⊘', 'yellow'),
      PENDING: this.style('○', 'dim'),
    };
    const statusColors = {
      PASSED: 'green',
      FAILED: 'red',
      BLOCKED: 'yellow',
      PENDING: 'dim',
    };

    const icon = statusIcons[result.status];
    const statusText = this.style(result.status, statusColors[result.status] as keyof typeof chalk);
    const duration = result.duration ? this.dim(` (${result.duration}ms)`) : '';

    console.log(`  ${icon} ${this.bold(result.gate.padEnd(20))} ${statusText}${duration}`);
    if (result.details && this.verbose) {
      console.log(`    ${this.dim(result.details)}`);
    }
  }

  gateResults(results: GateDisplayResult[]): void {
    this.section('Gate Results');
    for (const result of results) {
      this.gateResult(result);
    }
    console.log();
  }

  // Budget display
  budgetSnapshot(budget: BudgetSnapshot, label: string = 'Budget'): void {
    this.section(label);
    const formatBudget = (used: number, limit: number, name: string) => {
      const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
      const barWidth = 20;
      const filled = Math.round((used / limit) * barWidth);
      const bar = this.style('█'.repeat(filled), 'green') + this.style('░'.repeat(barWidth - filled), 'dim');
      const color = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';
      return `${this.bold(name.padEnd(10))} ${bar} ${this.style(`${used}/${limit}`, color)} (${pct}%)`;
    };

    console.log(formatBudget(budget.research.used, budget.research.limit, 'Research'));
    console.log(formatBudget(budget.review.used, budget.review.limit, 'Review'));
    console.log(formatBudget(budget.debug.used, budget.debug.limit, 'Debug'));
    console.log(formatBudget(budget.total.used, budget.total.limit, 'Total'));
    console.log();
  }

  // Final verification checklist
  verificationChecklist(checklist: VerificationChecklist): void {
    this.section('Final Verification Checklist');
    
    for (const check of checklist.checks) {
      const icon = check.passed ? this.style('✓', 'green') : this.style('✗', 'red');
      const req = check.required ? this.style('(required)', 'red') : this.dim('(optional)');
      const status = check.passed ? this.style('PASS', 'green') : this.style('FAIL', 'red');
      
      console.log(`  ${icon} ${this.bold(check.name.padEnd(30))} ${status} ${req}`);
      if (check.details && this.verbose) {
        console.log(`    ${this.dim(check.details)}`);
      }
    }
    console.log();
    const finalIcon = checklist.allPassed ? this.style('✓', 'green') : this.style('✗', 'red');
    const finalStatus = checklist.allPassed ? this.style('ALL CHECKS PASSED', 'green') : this.style('CHECKS FAILED', 'red');
    console.log(`  ${finalIcon} ${this.bold(finalStatus)}`);
    console.log();
  }

  // Error formatting
  error(message: string, details?: string): void {
    console.log();
    console.log(this.style('✗ ERROR', 'red'));
    console.log(this.bold(this.style(message, 'red')));
    if (details) {
      console.log(this.dim(details));
    }
    console.log();
  }

  warning(message: string, details?: string): void {
    console.log(this.style('⚠ WARNING', 'yellow'));
    console.log(this.style(message, 'yellow'));
    if (details) {
      console.log(this.dim(details));
    }
  }

  info(message: string): void {
    console.log(this.style('ℹ INFO', 'blue'));
    console.log(message);
  }

  success(message: string): void {
    console.log(this.style('✓ SUCCESS', 'green'));
    console.log(this.style(message, 'green'));
  }

  // Task summary
  taskSummary(taskId: string, description: string, phase: Phase, budget: BudgetSnapshot): void {
    this.banner('AGY Task Execution', `Task: ${taskId}`);
    console.log(this.bold('Description:'), description);
    console.log(this.bold('Current Phase:'), this.style(phase, 'cyan'));
    console.log();
    this.budgetSnapshot(budget, 'Current Budget');
  }

  // Assumption/Decision ledger display
  assumptions(assumptions: Assumption[]): void {
    this.section('Assumptions');
    if (assumptions.length === 0) {
      console.log(this.dim('  No assumptions recorded.'));
      return;
    }
    for (const a of assumptions) {
      const status = a.validated ? this.style('✓ validated', 'green') : this.style('○ pending', 'yellow');
      const impactColor = a.impact === 'HIGH' ? 'red' : a.impact === 'MEDIUM' ? 'yellow' : 'green';
      console.log(`  ${this.bold(a.id)} [${this.style(a.impact, impactColor as keyof typeof chalk)}] ${status}`);
      console.log(`    ${a.description}`);
      console.log(`    ${this.dim(`Rationale: ${a.rationale} (confidence: ${a.confidence}%)`)}`);
      console.log();
    }
  }

  decisions(decisions: Decision[]): void {
    this.section('Decisions');
    if (decisions.length === 0) {
      console.log(this.dim('  No decisions recorded.'));
      return;
    }
    for (const d of decisions) {
      console.log(`  ${this.bold(d.id)}`);
      console.log(`    Context: ${d.context}`);
      console.log(`    Chosen: ${this.style(d.chosen, 'cyan')}`);
      console.log(`    Rationale: ${d.rationale}`);
      if (d.tradeoffs.length > 0) {
        console.log(`    Tradeoffs: ${d.tradeoffs.join(', ')}`);
      }
      console.log();
    }
  }

  researchFindings(findings: ResearchFinding[]): void {
    this.section('Research Findings');
    if (findings.length === 0) {
      console.log(this.dim('  No research findings.'));
      return;
    }
    for (const f of findings) {
      const stateColor = f.knowledgeState === 'VERIFIED' ? 'green' : 
                         f.knowledgeState === 'CONFIRMED' ? 'cyan' :
                         f.knowledgeState === 'INFERRED' ? 'yellow' : 'dim';
      const impactColor = f.impact === 'HIGH' ? 'red' : f.impact === 'MEDIUM' ? 'yellow' : 'green';
      console.log(`  ${this.bold(f.question)}`);
      console.log(`    ${this.dim(f.answer)}`);
      console.log(`    State: ${this.style(f.knowledgeState, stateColor as keyof typeof chalk)} | Impact: ${this.style(f.impact, impactColor as keyof typeof chalk)} | Confidence: ${f.confidence}%`);
      if (f.evidence.length > 0) {
        console.log(`    Evidence: ${f.evidence.join('; ')}`);
      }
      console.log();
    }
  }

  knowledgeGaps(gaps: KnowledgeGap[]): void {
    this.section('Knowledge Gaps');
    if (gaps.length === 0) {
      console.log(this.dim('  No knowledge gaps identified.'));
      return;
    }
    for (const g of gaps) {
      const status = g.resolved ? this.style('✓ resolved', 'green') : this.style('○ open', 'yellow');
      const impactColor = g.impact === 'HIGH' ? 'red' : g.impact === 'MEDIUM' ? 'yellow' : 'green';
      console.log(`  ${this.bold(g.id)} [${this.style(g.type, 'cyan')}] [${this.style(g.impact, impactColor as keyof typeof chalk)}] ${status}`);
      console.log(`    ${g.description}`);
      console.log(`    Question: ${g.question}`);
      console.log();
    }
  }

  reviewFindings(findings: ReviewFinding[]): void {
    this.section('Review Findings');
    if (findings.length === 0) {
      console.log(this.dim('  No review findings.'));
      return;
    }
    for (const f of findings) {
      const severityColor = f.severity === 'critical' ? 'red' :
                           f.severity === 'major' ? 'red' :
                           f.severity === 'minor' ? 'yellow' : 'dim';
      const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '';
      console.log(`  ${this.style(f.severity.toUpperCase(), severityColor as keyof typeof chalk)} ${this.bold(f.category)}`);
      console.log(`    ${f.description}`);
      if (loc) console.log(`    ${this.dim(`Location: ${loc}`)}`);
      if (f.suggestion) console.log(`    ${this.style('Suggestion:', 'cyan')} ${f.suggestion}`);
      console.log();
    }
  }

  // Sign-off display
  signOff(signOff: SignOff): void {
    this.section('Sign-Off');
    const status = signOff.approved ? this.style('APPROVED', 'green') : this.style('REJECTED', 'red');
    const icon = signOff.approved ? this.style('✓', 'green') : this.style('✗', 'red');
    console.log(`  ${icon} Status: ${status}`);
    console.log(`  Approver: ${signOff.approver}`);
    console.log(`  Timestamp: ${signOff.timestamp.toISOString()}`);
    if (signOff.conditions && signOff.conditions.length > 0) {
      console.log(`  Conditions:`);
      for (const c of signOff.conditions) {
        console.log(`    - ${c}`);
      }
    }
    console.log();
  }

  // Dry run output
  dryRun(message: string): void {
    console.log(this.dim(`[DRY-RUN] ${message}`));
  }

  // Help/usage
  usage(commands: Array<{ name: string; description: string; options?: string }>): void {
    this.section('Usage');
    console.log(this.bold('  agy <command> [options]'));
    console.log();
    console.log(this.bold('Commands:'));
    for (const cmd of commands) {
      console.log(`  ${this.style(cmd.name.padEnd(20), 'cyan')} ${cmd.description}`);
      if (cmd.options) {
        console.log(`  ${' '.repeat(22)}${this.dim(cmd.options)}`);
      }
    }
    console.log();
  }

  // Cleanup
  cleanup(): void {
    for (const [, spinner] of this.spinners) {
      spinner.stop();
    }
    this.spinners.clear();
  }
}

// Singleton instance for global access
let globalFormatter: OutputFormatter | null = null;

export function getFormatter(verbose?: boolean, useColor?: boolean): OutputFormatter {
  if (!globalFormatter) {
    globalFormatter = new OutputFormatter(verbose, useColor);
  }
  return globalFormatter;
}

export function setFormatter(formatter: OutputFormatter): void {
  globalFormatter = formatter;
}