import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { z } from 'zod';
import * as yaml from 'js-yaml';
import type {
  BudgetConfig,
  AgentPermissions,
  AgentConfig,
  OrchestratorConfig,
  SkillConfig,
  AgentType,
} from '../types/index.js';
export type { SkillConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BudgetConfigSchema = z.object({
  research: z.number().int().nonnegative().default(3),
  review: z.number().int().nonnegative().default(2),
  debug: z.number().int().nonnegative().default(5),
  total: z.number().int().nonnegative().default(10),
});

const AgentPermissionsSchema = z.object({
  read: z.array(z.string()).default([]),
  write: z.array(z.string()).default([]),
  execute: z.array(z.string()).default([]),
  network: z.array(z.string()).default([]),
  budget: BudgetConfigSchema,
});

const AgentConfigSchema = z.object({
  type: z.enum(['orchestrator', 'researcher', 'architect', 'implementer', 'validator', 'debugger', 'reviewer']),
  name: z.string().min(1),
  permissions: AgentPermissionsSchema,
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

const OrchestratorConfigSchema = z.object({
  agents: z.array(AgentConfigSchema).default([]),
  defaultBudget: BudgetConfigSchema,
  maxConcurrentTasks: z.number().int().positive().default(3),
  gateTimeouts: z.record(z.number().int().positive()).default({}),
});

const SkillConfigSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  triggers: z.array(z.string()).default([]),
  permissions: AgentPermissionsSchema,
});

export const ConfigSchema = z.object({
  version: z.string().default('0.1.0'),
  orchestrator: OrchestratorConfigSchema,
  skills: z.array(SkillConfigSchema).default([]),
  projectRoot: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

const DEFAULT_CONFIG: Config = {
  version: '0.1.0',
  orchestrator: {
    agents: [
      {
        type: 'orchestrator',
        name: 'main-orchestrator',
        permissions: {
          read: ['**/*'],
          write: ['**/*'],
          execute: ['*'],
          network: ['*'],
          budget: { research: 3, review: 2, debug: 5, total: 10 },
        },
      },
      {
        type: 'researcher',
        name: 'researcher',
        permissions: {
          read: ['**/*'],
          write: [],
          execute: [],
          network: ['*'],
          budget: { research: 3, review: 0, debug: 0, total: 3 },
        },
      },
      {
        type: 'architect',
        name: 'architect',
        permissions: {
          read: ['**/*'],
          write: ['**/*.md', '**/docs/**'],
          execute: [],
          network: [],
          budget: { research: 1, review: 1, debug: 1, total: 3 },
        },
      },
      {
        type: 'implementer',
        name: 'implementer',
        permissions: {
          read: ['**/*'],
          write: ['src/**/*', 'tests/**/*'],
          execute: ['npm test', 'npm run build', 'npx tsc*'],
          network: [],
          budget: { research: 0, review: 1, debug: 3, total: 4 },
        },
      },
      {
        type: 'validator',
        name: 'validator',
        permissions: {
          read: ['**/*'],
          write: [],
          execute: ['npm test', 'npm run lint', 'npx tsc --noEmit'],
          network: [],
          budget: { research: 0, review: 1, debug: 1, total: 2 },
        },
      },
      {
        type: 'debugger',
        name: 'debugger',
        permissions: {
          read: ['**/*'],
          write: ['src/**/*', 'tests/**/*'],
          execute: ['npm test', 'node --inspect*'],
          network: [],
          budget: { research: 0, review: 0, debug: 5, total: 5 },
        },
      },
      {
        type: 'reviewer',
        name: 'reviewer',
        permissions: {
          read: ['**/*'],
          write: [],
          execute: [],
          network: [],
          budget: { research: 0, review: 2, debug: 0, total: 2 },
        },
      },
    ],
    defaultBudget: { research: 3, review: 2, debug: 5, total: 10 },
    maxConcurrentTasks: 3,
    gateTimeouts: {
      DISCOVERY: 30000,
      RESEARCH: 120000,
      ANALYSIS: 60000,
      PLANNING: 60000,
      IMPLEMENTATION: 300000,
      VALIDATION: 120000,
      DEBUGGING: 300000,
      REVIEW: 120000,
    },
  },
  skills: [],
  projectRoot: process.cwd(),
};

function findConfigFile(startDir: string): string | null {
  let currentDir = startDir;
  while (currentDir !== dirname(currentDir)) {
    const configPath = join(currentDir, '.agyrc');
    if (existsSync(configPath)) {
      return configPath;
    }
    currentDir = dirname(currentDir);
  }
  return null;
}

export function loadConfig(configPath?: string): Config {
  let filePath: string | null = configPath ?? null;

  if (!filePath) {
    filePath = findConfigFile(process.cwd());
  }

  if (!filePath || !existsSync(filePath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(fileContent);
    const validated = ConfigSchema.parse(parsed);
    return { ...DEFAULT_CONFIG, ...validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

export function getDefaultConfig(): Config {
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Config, outputPath?: string): void {
  const path = outputPath ?? join(process.cwd(), '.agyrc');
  const yamlStr = yaml.dump(config, { indent: 2, lineWidth: 120 });
  require('node:fs').writeFileSync(path, yamlStr, 'utf-8');
}