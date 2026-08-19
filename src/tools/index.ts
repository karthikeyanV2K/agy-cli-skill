export * from './types.js';
export * from './registry.js';
export * from './file-ops.js';
export * from './shell.js';
export * from './search.js';

import { toolRegistry } from './registry.js';
import { readFile, writeFile, glob, listDir } from './file-ops.js';
import { executeShell } from './shell.js';
import { grep, semanticSearch } from './search.js';
import { ToolContext } from './types.js';

/**
 * Register all built-in tools with the global registry
 */
export function registerBuiltinTools(): void {
  // File operations - read permission
  toolRegistry.register(
    'readFile',
    async (args: { path: string }, context: ToolContext) => readFile(args.path, context),
    ['read'],
    'Read file contents'
  );

  toolRegistry.register(
    'writeFile',
    async (args: { path: string; content: string }, context: ToolContext) =>
      writeFile(args.path, args.content, context),
    ['write'],
    'Write file contents with backup'
  );

  toolRegistry.register(
    'glob',
    async (args: { pattern: string; dir?: string }, context: ToolContext) =>
      glob(args.pattern, args.dir ?? context.workingDir, context),
    ['search'],
    'Find files matching glob pattern'
  );

  toolRegistry.register(
    'listDir',
    async (args: { dir?: string }, context: ToolContext) =>
      listDir(args.dir ?? context.workingDir, context),
    ['read'],
    'List directory entries'
  );

  // Shell execution - execute permission
  toolRegistry.register(
    'executeShell',
    async (args: { command: string; options?: import('./shell.js').ShellOptions }, context: ToolContext) =>
      executeShell(args.command, args.options, context),
    ['execute'],
    'Execute shell command with timeout'
  );

  // Search - search permission
  toolRegistry.register(
    'grep',
    async (args: import('./search.js').GrepOptions, context: ToolContext) =>
      grep(args, context),
    ['search'],
    'Pattern search with ripgrep or Node.js fallback'
  );

  toolRegistry.register(
    'semanticSearch',
    async (
      args: { query: string; dir?: string; options?: { maxResults?: number; threshold?: number } },
      context: ToolContext
    ) => semanticSearch(args.query, args.dir ?? context.workingDir, context, args.options),
    ['search'],
    'Semantic search (placeholder)'
  );
}

/**
 * Create a default tool context for testing
 */
export function createDefaultContext(workingDir: string): ToolContext {
  return {
    workingDir,
    permissions: ['read', 'write', 'execute', 'search', 'plan'],
    budget: {
      research: 3,
      review: 2,
      debug: 5,
    },
  };
}