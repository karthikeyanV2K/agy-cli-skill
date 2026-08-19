import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, saveConfig, type Config, type SkillConfig } from '../config/index.js';
import type { AgentType } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Skill {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  content: string;
  filePath: string;
  targetAgents: AgentType[];
}

export interface PullResult {
  success: boolean;
  skills: Skill[];
  errors: string[];
  sourceUrl: string;
}

/**
 * SkillRegistry manages external skills pulled from GitHub repositories.
 * Skills are SKILL.md files that provide agent capabilities/instructions.
 */
export class SkillRegistry {
  private config: Config;
  private skillsDir: string;
  private skills: Map<string, Skill> = new Map();

  constructor(config: Config, projectRoot: string = process.cwd()) {
    this.config = config;
    this.skillsDir = join(projectRoot, '.agy', 'skills');
    this.ensureSkillsDir();
    this.loadInstalledSkills();
  }

  private ensureSkillsDir(): void {
    if (!existsSync(this.skillsDir)) {
      mkdirSync(this.skillsDir, { recursive: true });
    }
  }

  private loadInstalledSkills(): void {
    // Load skills from config
    for (const skillConfig of this.config.skills) {
      const skillPath = join(this.skillsDir, `${skillConfig.name}.md`);
      if (existsSync(skillPath)) {
        const content = readFileSync(skillPath, 'utf-8');
        const skill = this.parseSkill(content, skillPath, skillConfig);
        if (skill) {
          this.skills.set(skill.name, skill);
        }
      }
    }
  }

  private parseSkill(content: string, filePath: string, config?: SkillConfig): Skill | null {
    try {
      // Extract frontmatter and content
      const frontmatterMatch = content.match(/^---([\s\S]*?)---/);
      let name = basename(filePath, '.md');
      let version = '1.0.0';
      let description = '';
      let triggers: string[] = [];
      let targetAgents: AgentType[] = [];

      if (frontmatterMatch) {
        const fm = frontmatterMatch[1];
        const nameMatch = fm.match(/name:\s*['"]?([^'"]+)['"]?/);
        const versionMatch = fm.match(/version:\s*['"]?([^'"]+)['"]?/);
        const descMatch = fm.match(/description:\s*['"]?([^'"]+)['"]?/);
        const triggersMatch = fm.match(/triggers:\s*\[([^\]]+)\]/);
        const agentsMatch = fm.match(/target_agents:\s*\[([^\]]+)\]/);

        if (nameMatch) name = nameMatch[1].trim();
        if (versionMatch) version = versionMatch[1].trim();
        if (descMatch) description = descMatch[1].trim();
        if (triggersMatch) {
          triggers = triggersMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
        }
        if (agentsMatch) {
          targetAgents = agentsMatch[1].split(',').map(a => a.trim().replace(/['"]/g, '') as AgentType);
        }
      }

      // Fallback to config if provided
      if (config) {
        if (!name) name = config.name;
        if (!version) version = config.version;
        if (!description) description = config.description ?? '';
        if (!triggers.length) triggers = config.triggers || [];
      }

      return {
        name,
        version,
        description,
        triggers,
        content,
        filePath,
        targetAgents: targetAgents.length > 0 ? targetAgents : ['researcher', 'architect', 'implementer', 'validator', 'debugger', 'reviewer'],
      };
    } catch (error) {
      console.error(`Failed to parse skill ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Pull skills from a GitHub repository URL
   */
  async pull(sourceUrl: string): Promise<PullResult> {
    const result: PullResult = {
      success: false,
      skills: [],
      errors: [],
      sourceUrl,
    };

    try {
      // Parse GitHub URL
      const repoInfo = this.parseGitHubUrl(sourceUrl);
      if (!repoInfo) {
        result.errors.push(`Invalid GitHub URL: ${sourceUrl}`);
        return result;
      }

      // Clone or download the repository
      const tempDir = await this.cloneRepository(repoInfo);
      
      // Find all SKILL.md files
      const skillFiles = this.findSkillFiles(tempDir);
      
      if (skillFiles.length === 0) {
        result.errors.push('No SKILL.md files found in repository');
        // Clean up temp dir
        rmSync(tempDir, { recursive: true, force: true });
        return result;
      }

      // Process each skill file
      for (const skillFile of skillFiles) {
        try {
          const content = readFileSync(skillFile, 'utf-8');
          const skill = this.parseSkill(content, skillFile);
          
          if (skill) {
            // Save skill to .agy/skills/
            const destPath = join(this.skillsDir, `${skill.name}.md`);
            writeFileSync(destPath, content, 'utf-8');
            
            // Add to registry
            this.skills.set(skill.name, skill);
            result.skills.push(skill);
            
            // Update config
            this.addSkillToConfig(skill);
          }
        } catch (error) {
          result.errors.push(`Failed to process ${skillFile}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Save updated config
      saveConfig(this.config);
      result.success = result.skills.length > 0;
      
      // Clean up temp dir
      rmSync(tempDir, { recursive: true, force: true });
      
    } catch (error) {
      result.errors.push(`Pull failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
      /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/,
      /github\.com[:/]([^/]+)\/([^/]+)(?:\.git)?/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', ''),
          branch: match[3] || 'main',
        };
      }
    }
    return null;
  }

  private async cloneRepository(repoInfo: { owner: string; repo: string; branch?: string }): Promise<string> {
    const { owner, repo, branch = 'main' } = repoInfo;
    const tempDir = join(process.cwd(), '.agy', 'tmp', `${owner}-${repo}-${Date.now()}`);
    
    mkdirSync(tempDir, { recursive: true });

    // Use git clone (shallow for speed)
    const cloneUrl = `https://github.com/${owner}/${repo}.git`;
    
    const { execSync } = await import('node:child_process');
    
    try {
      execSync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${tempDir}`, {
        stdio: 'pipe',
        timeout: 120000,
      });
    } catch (error) {
      // Try without branch if specific branch fails
      try {
        execSync(`git clone --depth 1 ${cloneUrl} ${tempDir}`, {
          stdio: 'pipe',
          timeout: 120000,
        });
      } catch (e) {
        rmSync(tempDir, { recursive: true, force: true });
        throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return tempDir;
  }

  private findSkillFiles(dir: string): string[] {
    const skills: string[] = [];
    
    function walk(currentDir: string): void {
      try {
        const entries = readdirSync(currentDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(currentDir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip .git and node_modules
            if (!['.git', 'node_modules', '.github', 'dist', 'build'].includes(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile() && entry.name.toUpperCase() === 'SKILL.md') {
            skills.push(fullPath);
          }
        }
      } catch {
        // Ignore permission errors
      }
    }
    
    walk(dir);
    return skills;
  }

  private addSkillToConfig(skill: Skill): void {
    // Check if skill already exists in config
    const existingIndex = this.config.skills.findIndex(s => s.name === skill.name);
    
    const skillConfig: SkillConfig = {
      name: skill.name,
      version: skill.version,
      description: skill.description,
      triggers: skill.triggers,
      permissions: {
        read: ['**/*'],
        write: [],
        execute: [],
        network: ['*'],
        budget: { research: 1, review: 0, debug: 0, total: 1 },
      },
    };

    if (existingIndex >= 0) {
      this.config.skills[existingIndex] = skillConfig;
    } else {
      this.config.skills.push(skillConfig);
    }
  }

  /**
   * Get all installed skills
   */
  getSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills relevant to a specific agent
   */
  getSkillsForAgent(agent: AgentType): Skill[] {
    return this.getSkills().filter(skill => 
      skill.targetAgents.includes(agent) || skill.targetAgents.length === 0
    );
  }

  /**
   * Get skills matching a trigger
   */
  getSkillsByTrigger(trigger: string): Skill[] {
    return this.getSkills().filter(skill => 
      skill.triggers.some(t => trigger.toLowerCase().includes(t.toLowerCase()))
    );
  }

  /**
   * Get combined skill content for an agent (for context injection)
   */
  getSkillContextForAgent(agent: AgentType): string {
    const skills = this.getSkillsForAgent(agent);
    if (skills.length === 0) return '';
    
    return skills.map(skill => 
      `=== SKILL: ${skill.name} (v${skill.version}) ===\n${skill.description}\n\n${skill.content}`
    ).join('\n\n---\n\n');
  }

  /**
   * Remove a skill
   */
  removeSkill(name: string): boolean {
    const skill = this.skills.get(name);
    if (!skill) return false;

    // Remove file
    const skillPath = join(this.skillsDir, `${name}.md`);
    if (existsSync(skillPath)) {
      rmSync(skillPath, { force: true });
    }

    // Remove from registry
    this.skills.delete(name);

    // Remove from config
    this.config.skills = this.config.skills.filter(s => s.name !== name);
    saveConfig(this.config);

    return true;
  }

  /**
   * List all installed skills
   */
  listSkills(): Array<{ name: string; version: string; description: string; triggers: string[] }> {
    return this.getSkills().map(s => ({
      name: s.name,
      version: s.version,
      description: s.description,
      triggers: s.triggers,
    }));
  }
}

/**
 * Create a skill registry instance
 */
export function createSkillRegistry(config?: Config, projectRoot?: string): SkillRegistry {
  const cfg = config || loadConfig();
  return new SkillRegistry(cfg, projectRoot);
}