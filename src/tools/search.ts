import { ToolContext, ToolResult } from './types.js';

export interface GrepOptions {
  pattern: string;
  dir?: string;
  include?: string[];
  exclude?: string[];
  caseSensitive?: boolean;
  maxResults?: number;
}

export interface GrepMatch {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

/**
 * Grep pattern search using ripgrep (rg) if available, fallback to Node.js
 */
export async function grep(
  options: GrepOptions,
  context: ToolContext
): Promise<ToolResult<GrepMatch[]>> {
  const {
    pattern,
    dir = context.workingDir,
    include,
    exclude,
    caseSensitive = false,
    maxResults = 100,
  } = options;

  try {
    // Try ripgrep first
    const rgResult = await tryRipgrep(pattern, dir, include, exclude, caseSensitive, maxResults);
    if (rgResult.success) {
      return rgResult;
    }
  } catch {
    // Fall through to Node.js implementation
  }

  // Fallback to Node.js implementation
  return grepNode(pattern, dir, include, exclude, caseSensitive, maxResults);
}

/**
 * Try ripgrep for fast searching
 */
async function tryRipgrep(
  pattern: string,
  dir: string,
  include?: string[],
  exclude?: string[],
  caseSensitive = false,
  maxResults = 100
): Promise<ToolResult<GrepMatch[]>> {
  const { spawn } = await import('child_process');

  const args = [
    '--json',
    '--max-count',
    maxResults.toString(),
    caseSensitive ? '-s' : '-i',
    pattern,
  ];

  if (include?.length) {
    include.forEach((inc) => args.push('-g', inc));
  }
  if (exclude?.length) {
    exclude.forEach((exc) => args.push('-g', `!${exc}`));
  }
  args.push(dir);

  return new Promise((resolve) => {
    const child = spawn('rg', args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 || code === 1) {
        // rg returns 1 when no matches found
        try {
          const matches: GrepMatch[] = stdout
            .trim()
            .split('\n')
            .filter((line) => line)
            .map((line) => JSON.parse(line))
            .filter((item) => item.type === 'match')
            .map((item) => ({
              file: item.data.path.text,
              line: item.data.line_number,
              column: item.data.columns?.start ?? 0,
              match: item.data.lines.text.trim(),
              context: item.data.lines.text.trim(),
            }));
          resolve({ success: true, data: matches });
        } catch {
          resolve({ success: false, error: 'Failed to parse ripgrep output' });
        }
      } else {
        resolve({ success: false, error: `ripgrep failed: ${stderr}` });
      }
    });

    child.on('error', () => {
      resolve({ success: false, error: 'ripgrep not available' });
    });
  });
}

/**
 * Node.js fallback grep implementation
 */
async function grepNode(
  pattern: string,
  dir: string,
  include?: string[],
  exclude?: string[],
  caseSensitive = false,
  maxResults = 100
): Promise<ToolResult<GrepMatch[]>> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  const matches: GrepMatch[] = [];

  async function searchDir(currentDir: string): Promise<void> {
    if (matches.length >= maxResults) return;

    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= maxResults) break;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip common exclude directories
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          await searchDir(fullPath);
        }
      } else if (entry.isFile()) {
        // Check include/exclude patterns
        if (include?.length && !include.some((inc) => entry.name.match(globToRegex(inc)))) {
          continue;
        }
        if (exclude?.some((exc) => entry.name.match(globToRegex(exc)))) {
          continue;
        }

        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (matches.length >= maxResults) return;
            const match = line.match(regex);
            if (match) {
              matches.push({
                file: fullPath,
                line: index + 1,
                column: match.index ?? 0,
                match: match[0],
                context: line.trim(),
              });
            }
          });
        } catch {
          // Skip binary/unreadable files
        }
      }
    }
  }

  await searchDir(dir);
  return { success: true, data: matches };
}

/**
 * Convert glob pattern to regex
 */
function globToRegex(glob: string): RegExp {
  const regex = glob
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regex}$`);
}

/**
 * Semantic search - placeholder for future implementation
 * Will integrate with vector database or embedding service
 */
export async function semanticSearch(
  query: string,
  dir: string,
  context: ToolContext,
  options: { maxResults?: number; threshold?: number } = {}
): Promise<ToolResult<Array<{ file: string; score: number; snippet: string }>>> {
  const { maxResults = 10, threshold = 0.7 } = options;

  // TODO: Implement semantic search with embeddings
  // This is a placeholder that returns empty results
  return {
    success: true,
    data: [],
    error: 'Semantic search not yet implemented. Use grep for pattern matching.',
  };
}