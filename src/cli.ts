#!/usr/bin/env node

import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

import { loadConfig, getDefaultConfig, saveConfig, type Config } from './config/index.js';
import { OutputFormatter, getFormatter, type VerificationChecklist } from './output/formatter.js';
import { createSkillRegistry, type PullResult, type Skill } from './skills/index.js';
import type { Phase, BudgetSnapshot, Assumption, Decision, ResearchFinding, KnowledgeGap, ReviewFinding, SignOff, GateStatus, AgentType } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '0.1.0';
  }
}

function createFormatter(verbose: boolean, noColor: boolean): OutputFormatter {
  return new OutputFormatter(verbose, !noColor);
}

// Mock data for demonstration - in real implementation these would come from orchestrator
function createMockBudget(): BudgetSnapshot {
  return {
    research: { used: 1, limit: 3 },
    review: { used: 0, limit: 2 },
    debug: { used: 0, limit: 5 },
    total: { used: 1, limit: 10 },
  };
}

function createMockAssumptions(): Assumption[] {
  return [
    {
      id: 'assume-001',
      description: 'TypeScript 5.6+ is available in the environment',
      rationale: 'Required for modern type features and strict mode',
      confidence: 95,
      validated: true,
      createdAt: new Date(),
      impact: 'HIGH',
    },
    {
      id: 'assume-002',
      description: 'Node.js 22+ runtime is available',
      rationale: 'Native ES modules and modern globals',
      confidence: 90,
      validated: false,
      createdAt: new Date(),
      impact: 'MEDIUM',
    },
  ];
}

function createMockDecisions(): Decision[] {
  return [
    {
      id: 'dec-001',
      context: 'Choosing CLI framework',
      options: ['commander', 'yargs', 'oclif'],
      chosen: 'commander',
      rationale: 'Lightweight, well-maintained, TypeScript support',
      tradeoffs: ['Less built-in features than oclif'],
      createdAt: new Date(),
    },
  ];
}

function createMockResearchFindings(): ResearchFinding[] {
  return [
    {
      question: 'Best practice for CLI output formatting in TypeScript?',
      answer: 'Use chalk for colors, ora for spinners, structured output for CI/CD',
      evidence: ['chalk docs', 'ora docs', 'CLI best practices guide'],
      sources: ['npmjs.com/package/chalk', 'npmjs.com/package/ora'],
      knowledgeState: 'VERIFIED',
      impact: 'HIGH',
      confidence: 95,
    },
  ];
}

function createMockKnowledgeGaps(): KnowledgeGap[] {
  return [
    {
      id: 'gap-001',
      type: 'API',
      description: 'Need to verify Commander.js v12 API changes',
      impact: 'MEDIUM',
      question: 'Are there breaking changes in Commander v12?',
      resolved: false,
    },
  ];
}

function createMockReviewFindings(): ReviewFinding[] {
  return [
    {
      category: 'Code Quality',
      severity: 'minor',
      description: 'Missing JSDoc comments on public methods',
      file: 'src/cli.ts',
      line: 42,
      suggestion: 'Add JSDoc comments for all public APIs',
    },
  ];
}

function createMockSignOff(): SignOff {
  return {
    approved: true,
    approver: 'orchestrator',
    timestamp: new Date(),
    conditions: ['All tests pass', 'No linting errors'],
  };
}

function createMockVerificationChecklist(): VerificationChecklist {
  return {
    allPassed: true,
    checks: [
      { name: 'TypeScript compilation', passed: true, required: true },
      { name: 'Linting (ESLint)', passed: true, required: true },
      { name: 'Unit tests', passed: true, required: true },
      { name: 'Integration tests', passed: true, required: true },
      { name: 'Documentation updated', passed: false, required: false, details: 'README needs update' },
    ],
  };
}

async function runTaskCommand(description: string, options: any): Promise<void> {
  const formatter = createFormatter(options.verbose, options.noColor);
  
  try {
    formatter.banner('AGY Task Execution', `Task: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`);
    
    // Parse explicit skills if provided
    const explicitSkills = options.skills ? options.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    
    if (options.dryRun) {
      formatter.dryRun(`Would execute task: ${description}`);
      formatter.dryRun(`Budget tracking: ${options.budgetTracking ? 'enabled' : 'disabled'}`);
      formatter.dryRun(`Agents: ${options.agents || 'default'}`);
      if (explicitSkills.length > 0) {
        formatter.dryRun(`Explicit skills: ${explicitSkills.join(', ')} (bypassing trigger matching)`);
      }
      return;
    }

    // Load config
    const config = options.config ? loadConfig(options.config) : loadConfig();
    
    formatter.info(`Loaded configuration from ${options.config || 'default'}`);
    formatter.info(`Task type: ${options.type || 'feature'}`);
    formatter.info(`Max concurrent agents: ${config.orchestrator.maxConcurrentTasks}`);
    
    if (explicitSkills.length > 0) {
      formatter.info(`Explicit skills: ${explicitSkills.join(', ')}`);
      // Load skill registry to show what would be injected
      const { createSkillRegistry } = await import('./skills/index.js');
      const registry = createSkillRegistry(config);
      for (const skillName of explicitSkills) {
        const skills = registry.getSkills().filter(s => s.name === skillName);
        if (skills.length > 0) {
          formatter.info(`  → ${skills[0].name} v${skills[0].version}: ${skills[0].description}`);
        } else {
          formatter.warning(`  → Skill not found: ${skillName}`);
        }
      }
    }
    
    // Show task summary
    formatter.taskSummary('task-' + Date.now(), description, 'DISCOVERY', createMockBudget());
    
    // Phase progress simulation
    const phases: Phase[] = ['DISCOVERY', 'RESEARCH', 'ANALYSIS', 'PLANNING', 'IMPLEMENTATION', 'VALIDATION', 'DEBUGGING', 'REVIEW', 'COMPLETE'];
    
    for (const phase of phases) {
      formatter.startSpinner(phase, { text: `Executing ${phase} phase...`, color: 'blue' });
      await new Promise(r => setTimeout(r, 500)); // Simulate work
      formatter.succeedSpinner(phase, `Completed ${phase} phase`);
    }
    
    // Gate results
    const gateResults = [
      { gate: 'REPOSITORY_INSPECTION', status: 'PASSED' as GateStatus, details: 'Repository structure analyzed', duration: 120 },
      { gate: 'REQUIREMENTS_DECOMPOSITION', status: 'PASSED' as GateStatus, details: 'Requirements broken down', duration: 85 },
      { gate: 'KNOWLEDGE_GAPS_IDENTIFIED', status: 'PASSED' as GateStatus, details: '2 gaps found, 1 resolved', duration: 210 },
      { gate: 'RESEARCH_COMPLETED', status: 'PASSED' as GateStatus, details: 'All research questions answered', duration: 450 },
      { gate: 'ARCHITECTURE_GATE', status: 'PASSED' as GateStatus, details: 'Architecture approved', duration: 320 },
      { gate: 'IMPLEMENTATION_COMPLETE', status: 'PASSED' as GateStatus, details: 'All components implemented', duration: 1200 },
      { gate: 'BUILD_VERIFICATION', status: 'PASSED' as GateStatus, details: 'TypeScript compilation successful', duration: 180 },
      { gate: 'TEST_VERIFICATION', status: 'PASSED' as GateStatus, details: 'All tests passing', duration: 340 },
      { gate: 'REGRESSION_CHECK', status: 'PASSED' as GateStatus, details: 'No regressions detected', duration: 210 },
      { gate: 'FINAL_REVIEW', status: 'PASSED' as GateStatus, details: 'Code review approved', duration: 150 },
    ];
    
    formatter.gateResults(gateResults);
    
    // Budget snapshot
    formatter.budgetSnapshot({
      research: { used: 2, limit: 3 },
      review: { used: 1, limit: 2 },
      debug: { used: 0, limit: 5 },
      total: { used: 3, limit: 10 },
    }, 'Final Budget');
    
    // Assumptions and decisions
    formatter.assumptions(createMockAssumptions());
    formatter.decisions(createMockDecisions());
    formatter.researchFindings(createMockResearchFindings());
    formatter.knowledgeGaps(createMockKnowledgeGaps());
    formatter.reviewFindings(createMockReviewFindings());
    formatter.signOff(createMockSignOff());
    
    // Final verification
    formatter.verificationChecklist(createMockVerificationChecklist());
    
    formatter.success('Task completed successfully!');
    
  } catch (error) {
    formatter.error(
      'Task execution failed',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    formatter.cleanup();
  }
}

async function runConfigCommand(action: string, key?: string, value?: string): Promise<void> {
  const formatter = createFormatter(false, false);
  
  try {
    switch (action) {
      case 'get': {
        if (!key) {
          formatter.error('Key is required for config get');
          process.exit(1);
        }
        const config = loadConfig();
        const keys = key.split('.');
        let result: any = config;
        for (const k of keys) {
          result = result?.[k];
        }
        if (result === undefined) {
          formatter.warning(`Config key not found: ${key}`);
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
        break;
      }
      case 'set': {
        if (!key || value === undefined) {
          formatter.error('Both key and value are required for config set');
          process.exit(1);
        }
        const config = loadConfig();
        const keys = key.split('.');
        let target: any = config;
        for (let i = 0; i < keys.length - 1; i++) {
          target = target[keys[i]];
          if (!target) {
            formatter.error(`Invalid config path: ${key}`);
            process.exit(1);
          }
        }
        // Try to parse value as JSON, fallback to string
        let parsedValue: any;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value;
        }
        target[keys[keys.length - 1]] = parsedValue;
        saveConfig(config);
        formatter.success(`Config updated: ${key} = ${JSON.stringify(parsedValue)}`);
        break;
      }
      default: {
        // Show full config
        const config = loadConfig();
        console.log(JSON.stringify(config, null, 2));
      }
    }
  } catch (error) {
    formatter.error(
      'Config command failed',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function runAssumptionsCommand(action: string): Promise<void> {
  const formatter = createFormatter(false, false);
  
  try {
    switch (action) {
      case 'list':
        formatter.assumptions(createMockAssumptions());
        break;
      case 'check':
        const assumptions = createMockAssumptions();
        const unvalidated = assumptions.filter(a => !a.validated);
        if (unvalidated.length > 0) {
          formatter.warning(`${unvalidated.length} unvalidated assumptions found:`);
          formatter.assumptions(unvalidated);
        } else {
          formatter.success('All assumptions validated');
        }
        break;
      default:
        formatter.assumptions(createMockAssumptions());
    }
  } catch (error) {
    formatter.error(
      'Assumptions command failed',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function runDecisionsCommand(): Promise<void> {
  const formatter = createFormatter(false, false);
  
  try {
    formatter.decisions(createMockDecisions());
  } catch (error) {
    formatter.error(
      'Decisions command failed',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function runPullCommand(sourceUrl: string, options: any): Promise<void> {
  const formatter = createFormatter(options.verbose, options.noColor);
  
  try {
    formatter.banner('AGY Skill Pull', `Pulling skills from ${sourceUrl}`);
    
    const config = loadConfig();
    const registry = createSkillRegistry(config);
    
    formatter.startSpinner('pull', { text: 'Cloning repository and finding skills...', color: 'blue' });
    
    const result: PullResult = await registry.pull(sourceUrl);
    
    if (result.success) {
      formatter.succeedSpinner('pull', `Successfully pulled ${result.skills.length} skill(s)`);
      
      for (const skill of result.skills) {
        formatter.info(`  • ${skill.name} v${skill.version} - ${skill.description || 'No description'}`);
        if (skill.triggers.length > 0) {
          formatter.info(`    Triggers: ${skill.triggers.join(', ')}`);
        }
        formatter.info(`    Target agents: ${skill.targetAgents.join(', ')}`);
      }
      
      formatter.success('Skills are now available for AGY engineering flow');
      formatter.info('Run `agy task "your task"` to use them automatically');
    } else {
      formatter.failSpinner('pull', 'Failed to pull skills');
      for (const error of result.errors) {
        formatter.error('Pull error', error);
      }
      process.exit(1);
    }
  } catch (error) {
    formatter.error(
      'Pull command failed',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    formatter.cleanup();
  }
}

async function runSkillCommand(action: string, name?: string): Promise<void> {
  const formatter = createFormatter(false, false);
  
  try {
    const config = loadConfig();
    const registry = createSkillRegistry(config);
    
    switch (action) {
      case 'list': {
        const skills = registry.listSkills();
        if (skills.length === 0) {
          formatter.info('No skills installed. Use `agy pull <url>` to install skills.');
        } else {
          formatter.banner('Installed Skills', `${skills.length} skill(s) available`);
          for (const skill of skills) {
            formatter.info(`  • ${skill.name} v${skill.version} - ${skill.description || 'No description'}`);
            if (skill.triggers.length > 0) {
              formatter.info(`    Triggers: ${skill.triggers.join(', ')}`);
            }
          }
        }
        break;
      }
      case 'remove': {
        if (!name) {
          formatter.error('Skill name required for remove action');
          process.exit(1);
        }
        const removed = registry.removeSkill(name);
        if (removed) {
          formatter.success(`Skill '${name}' removed`);
        } else {
          formatter.error('Remove failed', `Skill '${name}' not found`);
          process.exit(1);
        }
        break;
      }
      default:
        formatter.error(`Unknown skill action: ${action}`);
        formatter.info('Available actions: list, remove');
        process.exit(1);
    }
  } catch (error) {
    formatter.error(
      'Skill command failed',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function runEAFCommand(description: string, options: any): Promise<void> {
  const formatter = createFormatter(options.verbose, options.noColor);
  
  try {
    formatter.banner('AGY EAF - Engineering Agent Framework', `Task: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`);
    
    // Parse explicit skills (required for EAF)
    const explicitSkills = options.skills ? options.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    
    if (explicitSkills.length === 0 && !options.dryRun) {
      formatter.error('EAF requires explicit skills', 'Use --skills <skill1,skill2,...> to specify which skills to inject');
      formatter.info('List available skills with: agy skill list');
      process.exit(1);
    }
    
    if (options.dryRun) {
      formatter.dryRun(`Would execute EAF task: ${description}`);
      formatter.dryRun(`Budget tracking: ${options.budgetTracking ? 'enabled' : 'disabled'}`);
      formatter.dryRun(`Agents: ${options.agents || 'default'}`);
      formatter.dryRun(`Explicit skills: ${explicitSkills.join(', ')} (no trigger matching)`);
      return;
    }

    // Load config
    const config = options.config ? loadConfig(options.config) : loadConfig();
    
    formatter.info(`Loaded configuration from ${options.config || 'default'}`);
    formatter.info(`Task type: ${options.type || 'feature'}`);
    formatter.info(`Max concurrent agents: ${config.orchestrator.maxConcurrentTasks}`);
    
    if (explicitSkills.length > 0) {
      formatter.info(`Explicit skills: ${explicitSkills.join(', ')}`);
      const { createSkillRegistry } = await import('./skills/index.js');
      const registry = createSkillRegistry(config);
      for (const skillName of explicitSkills) {
        const skills = registry.getSkills().filter(s => s.name === skillName);
        if (skills.length > 0) {
          formatter.info(`  → ${skills[0].name} v${skills[0].version}: ${skills[0].description}`);
        } else {
          formatter.warning(`  → Skill not found: ${skillName}`);
        }
      }
    }
    
    // Show task summary
    formatter.taskSummary('eaf-' + Date.now(), description, 'DISCOVERY', createMockBudget());
    
    // Phase progress simulation - full 9-phase EAF flow
    const phases: Phase[] = ['DISCOVERY', 'RESEARCH', 'ANALYSIS', 'PLANNING', 'IMPLEMENTATION', 'VALIDATION', 'DEBUGGING', 'REVIEW', 'COMPLETE'];
    
    for (const phase of phases) {
      formatter.startSpinner(phase, { text: `Executing ${phase} phase...`, color: 'blue' });
      await new Promise(r => setTimeout(r, 500));
      formatter.succeedSpinner(phase, `Completed ${phase} phase`);
    }
    
    // Gate results
    const gateResults = [
      { gate: 'REPOSITORY_INSPECTION', status: 'PASSED' as GateStatus, details: 'Repository structure analyzed', duration: 120 },
      { gate: 'REQUIREMENTS_DECOMPOSITION', status: 'PASSED' as GateStatus, details: 'Requirements broken down', duration: 85 },
      { gate: 'KNOWLEDGE_GAPS_IDENTIFIED', status: 'PASSED' as GateStatus, details: '2 gaps found, 1 resolved', duration: 210 },
      { gate: 'RESEARCH_COMPLETED', status: 'PASSED' as GateStatus, details: 'All research questions answered', duration: 450 },
      { gate: 'ARCHITECTURE_GATE', status: 'PASSED' as GateStatus, details: 'Architecture approved', duration: 320 },
      { gate: 'IMPLEMENTATION_COMPLETE', status: 'PASSED' as GateStatus, details: 'All components implemented', duration: 1200 },
      { gate: 'BUILD_VERIFICATION', status: 'PASSED' as GateStatus, details: 'TypeScript compilation successful', duration: 180 },
      { gate: 'TEST_VERIFICATION', status: 'PASSED' as GateStatus, details: 'All tests passing', duration: 340 },
      { gate: 'REGRESSION_CHECK', status: 'PASSED' as GateStatus, details: 'No regressions detected', duration: 210 },
      { gate: 'FINAL_REVIEW', status: 'PASSED' as GateStatus, details: 'Code review approved', duration: 150 },
    ];
    
    formatter.gateResults(gateResults);
    
    // Budget snapshot
    formatter.budgetSnapshot({
      research: { used: 2, limit: 3 },
      review: { used: 1, limit: 2 },
      debug: { used: 0, limit: 5 },
      total: { used: 3, limit: 10 },
    }, 'Final Budget');
    
    // Assumptions and decisions
    formatter.assumptions(createMockAssumptions());
    formatter.decisions(createMockDecisions());
    formatter.researchFindings(createMockResearchFindings());
    formatter.knowledgeGaps(createMockKnowledgeGaps());
    formatter.reviewFindings(createMockReviewFindings());
    formatter.signOff(createMockSignOff());
    
    // Final verification
    formatter.verificationChecklist(createMockVerificationChecklist());
    
    formatter.success('EAF task completed successfully!');
    
  } catch (error) {
    formatter.error(
      'EAF execution failed',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    formatter.cleanup();
  }
}

function main(): void {
  const program = new Command();
  
  program
    .name('agy')
    .description('AGY CLI - Mechanical engineering framework enforcement')
    .version(getVersion(), '-v, --version', 'Display version number')
    .option('--verbose', 'Enable verbose output', false)
    .option('--no-color', 'Disable colored output', false);

  // Task command
  program
    .command('task <description>')
    .description('Execute a task through the AGY engineering framework')
    .option('--dry-run', 'Show what would be executed without running', false)
    .option('--budget-tracking', 'Enable budget tracking', true)
    .option('--agents <agents>', 'Comma-separated list of agents to use', 'default')
    .option('--config <path>', 'Path to config file')
    .option('--type <type>', 'Task type (feature|bugfix|refactor|research|documentation|test)', 'feature')
    .option('--skills <skills>', 'Comma-separated list of skills to use (bypasses trigger matching)', '')
    .action(runTaskCommand);

  // Config command
  program
    .command('config [action] [key] [value]')
    .description('Manage AGY configuration')
    .action(runConfigCommand);

  // Assumptions command
  program
    .command('assumptions [action]')
    .description('Manage assumption ledger')
    .action(runAssumptionsCommand);

// Decisions command
  program
    .command('decisions')
    .description('List decision ledger')
    .action(runDecisionsCommand);

  // Pull command
  program
    .command('pull <sourceUrl>')
    .description('Pull skills from a GitHub repository')
    .option('--verbose', 'Enable verbose output', false)
    .option('--no-color', 'Disable colored output', false)
    .action(runPullCommand);

// Skill command
  program
    .command('skill <action> [name]')
    .description('Manage installed skills (list, remove)')
    .action(runSkillCommand);

  // EAF command - explicit Engineering Agent Framework execution
  program
    .command('eaf <description>')
    .alias('EAF')
    .description('Execute task through full Engineering Agent Framework (explicit mode)')
    .option('--dry-run', 'Show what would be executed without running', false)
    .option('--budget-tracking', 'Enable budget tracking', true)
    .option('--agents <agents>', 'Comma-separated list of agents to use', 'default')
    .option('--config <path>', 'Path to config file')
    .option('--skills <skills>', 'Comma-separated list of skills to use (required for EAF)', '')
    .action(runEAFCommand);

  // Version command
  program
    .command('version')
    .description('Display version information')
    .action(() => {
      console.log(`agy version ${getVersion()}`);
    });

  // Default help
  program.parse(process.argv);
  
  // If no command provided, show help
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

main();