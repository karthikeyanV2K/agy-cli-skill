import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LLMProvider } from '../llm/provider.js';
import { modelForTask } from '../llm/provider.js';
import { rolePrompt, ROLE_REASONING } from '../llm/prompts.js';
import type { AgentContextPackage } from './context-builder.js';
import type { AgentType } from './agent-chain.js';

/**
 * Real Subagent Launcher
 * Replaces mock spawnAgent(): each subagent is an LLM call that is
 * GROUNDED in actual repository file contents and VERIFIED against
 * real command output (tsc/tests). Fabricated results cannot survive:
 * - Implementer output must compile before buildSuccess=true
 * - Validator reports only what commands actually printed
 * - Reviewer must cite file evidence per finding
 */

const MAX_DEBUG_ITERATIONS = 3;
const MAX_FILE_BYTES = 60_000;

export class AgentSpawner {
  constructor(
    private readonly provider: LLMProvider,
    private readonly workingDir: string = process.cwd()
  ) {}

  async launch(agent: AgentType, pkg: AgentContextPackage, taskType?: string): Promise<unknown> {
    switch (agent) {
      case 'researcher':
        return this.runResearcher(pkg, taskType);
      case 'architect':
        return this.runArchitect(pkg, taskType);
      case 'implementer':
        return this.runImplementer(pkg, taskType);
      case 'validator':
        return this.runValidator(pkg);
      case 'debugger':
        return this.runDebugger(pkg, taskType);
      case 'reviewer':
        return this.runReviewer(pkg, taskType);
      default:
        return {};
    }
  }

  // ---------- shared helpers ----------

  private async askLLM(
    agent: AgentType,
    pkg: AgentContextPackage,
    userPrompt: string,
    taskType?: string,
    maxTokens = 16384
  ): Promise<Record<string, unknown>> {
    const reasoning = ROLE_REASONING[agent];
    const model =
      pkg.architecturePlan?.taskId !== undefined || taskType
        ? modelForTask(taskType ?? pkg.task)
        : undefined;

    const res = await this.provider.complete({
      system: rolePrompt(agent),
      user: userPrompt,
      model,
      temperature: reasoning.temperature,
      thinkingBudget: reasoning.thinkingBudget || undefined,
      maxTokens,
    });

    const parsed = extractJson(res.text);
    if (!parsed) {
      throw new Error(`Subagent ${agent} returned unparseable output:\n${res.text.slice(0, 400)}`);
    }
    return parsed;
  }

  /** Grounding: read REAL file contents so the model cannot invent code */
  private groundFiles(files: string[], maxFiles = 20): string {
    const resolved = files
      .map((f) => path.resolve(this.workingDir, f))
      .filter((f) => f.startsWith(path.resolve(this.workingDir)))
      .slice(0, maxFiles);

    const parts: string[] = [];
    for (const file of resolved) {
      try {
        const stat = fs.statSync(file);
        if (!stat.isFile() || stat.size > MAX_FILE_BYTES) continue;
        const content = fs.readFileSync(file, 'utf-8');
        parts.push(`--- FILE: ${path.relative(this.workingDir, file)} ---\n${content}`);
      } catch {
        // skip unreadable files silently - do not fabricate content for them
      }
    }
    return parts.length > 0 ? parts.join('\n\n') : '(no files provided)';
  }

  /** Discover candidate source files when the context package has none */
  private discoverSourceFiles(): string[] {
    try {
      const walk = (dir: string, acc: string[], depth: number): string[] => {
        if (depth > 4 || acc.length > 40) return acc;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full, acc, depth + 1);
          else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) acc.push(path.relative(this.workingDir, full));
        }
        return acc;
      };
      return walk(this.workingDir, [], 0).slice(0, 25);
    } catch {
      return [];
    }
  }

  /** Run a command for real and capture honest output */
  private runCommand(command: string, timeoutMs = 300_000): { exitCode: number | null; stdout: string; stderr: string } {
    const res = spawnSync(command, {
      cwd: this.workingDir,
      shell: true,
      encoding: 'utf-8',
      timeout: timeoutMs,
      windowsHide: true,
    });
    return {
      exitCode: res.status,
      stdout: (res.stdout ?? '').slice(0, 8000),
      stderr: (res.stderr ?? '').slice(0, 8000),
    };
  }

  private safeWrite(file: string, content: string): void {
    const resolved = path.resolve(this.workingDir, file);
    if (!resolved.startsWith(path.resolve(this.workingDir))) {
      throw new Error(`Path escape rejected: ${file}`);
    }
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf-8');
  }

  // ---------- role runners ----------

  private async runResearcher(pkg: AgentContextPackage, taskType?: string): Promise<unknown> {
    const files = pkg.relevantFiles.length > 0 ? pkg.relevantFiles : this.discoverSourceFiles();
    const grounding = this.groundFiles(files, 10);

    const out = await this.askLLM(
      'researcher',
      pkg,
      `TASK: ${pkg.task}

REPOSITORY CONTENT (grounding - the only truth available):
${grounding}

Identify knowledge gaps for this task. For every claim cite file:line from the content above.
If something required by the task is NOT determinable from the provided content, list it under unknowns.
Respond with JSON:
{
  "completed": boolean,            // true only if research needs are fully assessed
  "crossValidated": boolean,       // true only if findings were verified against >=2 distinct files
  "findings": [{ "topic": string, "status": "CONFIRMED"|"INFERRED"|"UNKNOWN", "evidence": "path:line detail", "recommendedApproach": string }],
  "unknowns": [string],
  "assumptions": [{ "id": string, "claim": string, "validated": boolean }]
}`,
      taskType,
      8192
    );

    return {
      completed: out.completed === true,
      crossValidated: out.crossValidated === true,
      findings: Array.isArray(out.findings) ? out.findings : [],
      assumptions: Array.isArray(out.assumptions) ? out.assumptions : [],
      unknowns: Array.isArray(out.unknowns) ? out.unknowns : [],
    };
  }

  private async runArchitect(pkg: AgentContextPackage, taskType?: string): Promise<unknown> {
    const files = pkg.relevantFiles.length > 0 ? pkg.relevantFiles : this.discoverSourceFiles();
    const grounding = this.groundFiles(files, 15);

    const out = await this.askLLM(
      'architect',
      pkg,
      `TASK: ${pkg.task}
REQUIREMENTS: ${pkg.requirements.join('; ')}

REPOSITORY CONTENT (grounding):
${grounding}

Design a minimal component plan that REUSES existing patterns visible above.
Every component must map to real conventions observed in the provided files.
Set gateApproved=true ONLY if research gaps are closed or explicitly declared UNKNOWN.
Respond with JSON:
{
  "planCreated": boolean,
  "gateApproved": boolean,
  "gapsIdentified": boolean,
  "plan": {
    "taskId": "arch-plan",
    "components": [{ "name": string, "type": "class"|"module", "responsibilities": [string], "dependencies": [string], "targetFiles": [string] }],
    "interfaces": [{ "name": string, "definition": string }]
  },
  "decisions": [{ "id": string, "question": string, "selected": string, "reason": string }]
}`,
      taskType,
      12288
    );

    const plan = (out.plan && typeof out.plan === 'object' ? out.plan : null) as Record<string, unknown> | null;
    return {
      planCreated: out.planCreated === true && plan !== null,
      gateApproved: out.gateApproved === true && plan !== null,
      gapsIdentified: out.gapsIdentified === true,
      plan,
      decisions: Array.isArray(out.decisions) ? out.decisions : [],
    };
  }

  private async runImplementer(pkg: AgentContextPackage, taskType?: string): Promise<unknown> {
    const plan = pkg.architecturePlan as Record<string, unknown> | null;
    if (!plan) {
      return { completed: false, buildSuccess: false, filesModified: [], error: 'no architecture plan' };
    }

    const targetFiles = this.collectTargetFiles(plan);
    let debugIterationsUsed = 0;
    let lastGateOutput = '';

    for (let attempt = 0; attempt <= MAX_DEBUG_ITERATIONS; attempt++) {
      const grounding = this.groundFiles(targetFiles, 15);

      const out = await this.askLLM(
        'implementer',
        pkg,
        `TASK: ${pkg.task}
PLAN: ${JSON.stringify(plan, null, 2)}
${lastGateOutput ? `\nPREVIOUS ATTEMPT FAILED VERIFICATION - fix these REAL errors:\n${lastGateOutput}` : ''}

EXISTING FILE CONTENTS (grounding - extend these, follow their style):
${grounding}

Write COMPLETE implementations. No TODOs, no placeholders, no invented APIs.
Respond with JSON:
{ "files": [{ "path": string, "content": string, "why": string }] }`,
        taskType,
        32768
      );

      const files = Array.isArray(out.files) ? out.files : [];
      if (files.length === 0) {
        return { completed: false, buildSuccess: false, filesModified: [], error: 'implementer emitted no files' };
      }

      const modified: string[] = [];
      for (const f of files as { path: string; content: string }[]) {
        if (typeof f.path === 'string' && typeof f.content === 'string') {
          this.safeWrite(f.path, f.content);
          modified.push(f.path);
        }
      }

      // REAL verification - fabricated success is impossible past this point
      const compile = this.runCommand('npx tsc --noEmit', 180_000);
      if (compile.exitCode !== 0) {
        debugIterationsUsed++;
        lastGateOutput = `$ tsc --noEmit (exit ${compile.exitCode})\n${compile.stdout}\n${compile.stderr}`;
        continue;
      }

      const testCmd = this.detectTestCommand();
      if (testCmd) {
        const test = this.runCommand(testCmd, 300_000);
        if (test.exitCode !== 0) {
          debugIterationsUsed++;
          lastGateOutput = `$ ${testCmd} (exit ${test.exitCode})\n${test.stdout}\n${test.stderr}`;
          continue;
        }
      }

      return { completed: true, buildSuccess: true, filesModified: modified, debugIterationsUsed };
    }

    return {
      completed: false,
      buildSuccess: false,
      filesModified: [],
      debugIterationsUsed,
      error: `verification failed after ${MAX_DEBUG_ITERATIONS + 1} attempts`,
      lastErrors: lastGateOutput.slice(0, 4000),
    };
  }

  private async runValidator(_pkg: AgentContextPackage): Promise<unknown> {
    const checks: { name: string; passed: boolean; details: string }[] = [];

    const compile = this.runCommand('npx tsc --noEmit', 180_000);
    checks.push({
      name: 'compile',
      passed: compile.exitCode === 0,
      details: compile.exitCode === 0 ? 'tsc clean' : `${compile.stdout}\n${compile.stderr}`.slice(0, 2000),
    });

    const testCmd = this.detectTestCommand();
    if (testCmd) {
      const test = this.runCommand(testCmd, 300_000);
      checks.push({
        name: testCmd,
        passed: test.exitCode === 0,
        details: test.exitCode === 0 ? 'tests passed' : `${test.stdout}\n${test.stderr}`.slice(0, 2000),
      });
    }

    return { passed: checks.every((c) => c.passed), checks };
  }

  private async runDebugger(pkg: AgentContextPackage, taskType?: string): Promise<unknown> {
    const failures = [
      ...pkg.previousFailures.map((f) => JSON.stringify(f)),
      ...pkg.testResults.filter((t) => !t.passed).map((t) => JSON.stringify(t)),
    ];

    if (failures.length === 0) {
      return { resolved: true, issue: 'none', steps: [] };
    }

    const files = pkg.relevantFiles.length > 0 ? pkg.relevantFiles : this.discoverSourceFiles();
    const grounding = this.groundFiles(files, 12);

    for (let iteration = 0; iteration < MAX_DEBUG_ITERATIONS; iteration++) {
      const out = await this.askLLM(
        'debugger',
        pkg,
        `TASK: ${pkg.task}

REAL FAILURE OUTPUT (root-cause this, do not guess):
${failures.join('\n')}

SOURCE FILES:
${grounding}

Fix the root cause minimally. Respond with JSON:
{ "resolved": boolean, "issue": string, "rootCause": string, "files": [{ "path": string, "content": string }], "steps": [string] }`,
        taskType,
        16384
      );

      const filesToWrite = Array.isArray(out.files) ? out.files : [];
      for (const f of filesToWrite as { path: string; content: string }[]) {
        if (typeof f.path === 'string' && typeof f.content === 'string') {
          this.safeWrite(f.path, f.content);
        }
      }

      // Verify the fix against reality
      const compile = this.runCommand('npx tsc --noEmit', 180_000);
      const testCmd = this.detectTestCommand();
      const test = testCmd ? this.runCommand(testCmd, 300_000) : { exitCode: 0, stdout: '', stderr: '' };

      if (compile.exitCode === 0 && test.exitCode === 0) {
        return {
          resolved: true,
          issue: String(out.issue ?? 'unknown'),
          resolution: String(out.rootCause ?? ''),
          steps: Array.isArray(out.steps) ? out.steps : [],
          iterations: iteration + 1,
        };
      }

      // feed real errors back into next iteration
      failures.push(`attempt ${iteration + 1} still failing:\n${
        `${compile.stdout}${compile.stderr}${test.stdout}${test.stderr}`.slice(0, 2000)
      }`);
    }

    return { resolved: false, issue: String('unresolved after max iterations'), steps: [] };
  }

  private async runReviewer(pkg: AgentContextPackage, taskType?: string): Promise<unknown> {
    const files = pkg.relevantFiles.length > 0 ? pkg.relevantFiles : this.discoverSourceFiles();
    const grounding = this.groundFiles(files, 20);

    const out = await this.askLLM(
      'reviewer',
      pkg,
      `TASK: ${pkg.task}

CODE UNDER REVIEW:
${grounding}

Adversarially review across: correctness, edge cases, error handling, security, hardcoding, fabrication.
For EVERY finding cite path:line evidence. Flag any TODO/placeholder/mock/hardcoded value as a REJECT reason.
Respond with JSON:
{
  "approved": boolean,
  "regressionChecked": boolean,   // true only if you found no regression risk WITH evidence
  "diffReviewed": boolean,
  "noHardcoding": boolean,        // false if ANY magic number/url/credential lacks justification
  "noUnresolvedIssues": boolean,
  "findings": [{ "severity": "BLOCKER"|"MAJOR"|"MINOR", "category": string, "file": string, "line": number, "evidence": string }]
}`,
      taskType,
      12288
    );

    return {
      approved: out.approved === true,
      regressionChecked: out.regressionChecked === true,
      diffReviewed: out.diffReviewed === true,
      noHardcoding: out.noHardcoding === true,
      noUnresolvedIssues: out.noUnresolvedIssues === true,
      findings: Array.isArray(out.findings) ? out.findings : [],
    };
  }

  // ---------- utilities ----------

  private collectTargetFiles(plan: Record<string, unknown>): string[] {
    const files = new Set<string>(this.discoverSourceFiles());
    const components = Array.isArray(plan.components) ? plan.components : [];
    for (const c of components as Record<string, unknown>[]) {
      if (Array.isArray(c.targetFiles)) {
        for (const t of c.targetFiles as string[]) files.add(t);
      }
    }
    return [...files];
  }

  private detectTestCommand(): string | null {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(this.workingDir, 'package.json'), 'utf-8'));
      const scripts: Record<string, string> = pkgJson.scripts ?? {};
      if (scripts.test) return 'npm test';
      if (scripts['test:unit']) return 'npm run test:unit';
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Extracts the first balanced JSON object from LLM output.
 * Handles ```json fences, preamble text, and trailing commentary.
 */
export function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  if (start === -1) return null;

  for (let end = candidate.lastIndexOf('}'); end > start; end = candidate.lastIndexOf('}', end - 1)) {
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      // keep shrinking until parseable
    }
  }
  return null;
}
