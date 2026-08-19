import * as fs from 'fs/promises';
import * as path from 'path';
import { ToolContext, ToolResult } from './types.js';

/**
 * Read file contents
 */
export async function readFile(
  filePath: string,
  context: ToolContext
): Promise<ToolResult<string>> {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(context.workingDir, filePath);

    const content = await fs.readFile(fullPath, 'utf-8');
    return { success: true, data: content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
    };
  }
}

/**
 * Write file contents with backup
 */
export async function writeFile(
  filePath: string,
  content: string,
  context: ToolContext
): Promise<ToolResult<void>> {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(context.workingDir, filePath);

    // Create backup if file exists
    try {
      await fs.access(fullPath);
      const backupPath = `${fullPath}.bak`;
      await fs.copyFile(fullPath, backupPath);
    } catch {
      // File doesn't exist, no backup needed
    }

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write file',
    };
  }
}

/**
 * Glob pattern matching
 */
export async function glob(
  pattern: string,
  dir: string,
  context: ToolContext
): Promise<ToolResult<string[]>> {
  try {
    const fullDir = path.isAbsolute(dir) ? dir : path.join(context.workingDir, dir);
    const glob = await import('glob');
    const matches = await glob.glob(pattern, { cwd: fullDir, absolute: true });
    return { success: true, data: matches };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Glob pattern failed',
    };
  }
}

/**
 * List directory entries
 */
export async function listDir(
  dir: string,
  context: ToolContext
): Promise<ToolResult<Array<{ name: string; isDirectory: boolean; isFile: boolean }>>> {
  try {
    const fullDir = path.isAbsolute(dir) ? dir : path.join(context.workingDir, dir);
    const entries = await fs.readdir(fullDir, { withFileTypes: true });

    const result = entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }));

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list directory',
    };
  }
}