import { ToolDefinition, ToolContext, ToolResult, ToolPermission, ToolHandler } from './types.js';

/**
 * ToolRegistry manages tool registration and execution with permission enforcement
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<unknown, unknown>>();

  /**
   * Register a new tool with the registry
   * @param name - Unique tool name
   * @param handler - Tool handler function
   * @param requiredPermissions - Permissions required to execute this tool
   */
  register<TArgs = unknown, TResult = unknown>(
    name: string,
    handler: ToolDefinition<TArgs, TResult>['handler'],
    requiredPermissions: ToolPermission[],
    description = ''
  ): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }

    this.tools.set(name, {
      name,
      description,
      handler: handler as ToolHandler<unknown, unknown>,
      requiredPermissions,
    });
  }

  /**
   * Execute a registered tool with permission validation
   * @param name - Tool name to execute
   * @param args - Arguments to pass to the tool handler
   * @param context - Execution context with permissions and budget
   * @returns Tool execution result
   */
  async execute<TArgs = unknown, TResult = unknown>(
    name: string,
    args: TArgs,
    context: ToolContext
  ): Promise<ToolResult<TResult>> {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    // Check permissions
    const hasPermission = tool.requiredPermissions.every((perm: ToolPermission) =>
      context.permissions.includes(perm)
    );

    if (!hasPermission) {
      return {
        success: false,
        error: `Permission denied: Tool '${name}' requires [${tool.requiredPermissions.join(', ')}]`,
      };
    }

    // Check budget for specific permission types (search/plan are tracked as research/review/debug)
    if (tool.requiredPermissions.includes('search') && context.budget.research <= 0) {
      return {
        success: false,
        error: 'Research budget exhausted',
      };
    }
    if (tool.requiredPermissions.includes('plan') && context.budget.review <= 0) {
      return {
        success: false,
        error: 'Review budget exhausted',
      };
    }
    if (tool.requiredPermissions.includes('execute') && context.budget.debug <= 0) {
      return {
        success: false,
        error: 'Debug budget exhausted',
      };
    }

    try {
      const handler = tool.handler as ToolHandler<TArgs, TResult>;
      const result = await handler(args, context);

      // Decrement budget for tracked permissions
      if (tool.requiredPermissions.includes('search')) {
        context.budget.research--;
      }
      if (tool.requiredPermissions.includes('plan')) {
        context.budget.review--;
      }
      if (tool.requiredPermissions.includes('execute')) {
        context.budget.debug--;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get a tool definition by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();