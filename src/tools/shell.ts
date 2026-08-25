import { spawn, SpawnOptions } from 'child_process';
import { ToolContext, ToolResult } from './types.js';

export interface ShellOptions {
  timeout?: number; // milliseconds, default 300000 (5 min)
  cwd?: string;
  env?: Record<string, string>;
  shell?: boolean;
}

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Execute a shell command with timeout, working directory, and environment
 */
export async function executeShell(
  command: string,
  options: ShellOptions = {},
  context: ToolContext
): Promise<ToolResult<ShellResult>> {
  const {
    timeout = 300000, // 5 minutes default
    cwd = context.workingDir,
    env = {},
    shell = true,
  } = options;

  return new Promise((resolve) => {
    const fullEnv = { ...process.env, ...env };
    const child = spawn(command, {
      cwd,
      env: fullEnv,
      shell,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let exited = false;

    const killTimer = setTimeout(() => {
      if (!exited) {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!exited) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }
    }, timeout);

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      if (!exited) {
        exited = true;
        clearTimeout(killTimer);
        resolve({
          success: false,
          error: `Process error: ${error.message}`,
        });
      }
    });

    child.on('close', (code) => {
      if (!exited) {
        exited = true;
        clearTimeout(killTimer);
        const failed = code !== 0;
        resolve({
          success: !failed,
          error: failed ? `Command exited with code ${code ?? 'null'}` : undefined,
          data: {
            stdout,
            stderr,
            exitCode: code,
          },
        });
      }
    });
  });
}