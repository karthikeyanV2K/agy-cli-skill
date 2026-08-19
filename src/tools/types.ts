/**
 * Tool Permission Types
 * Defines the permission levels required for tool execution
 */
export type ToolPermission = 'read' | 'write' | 'execute' | 'search' | 'plan' | 'reject';

/**
 * Tool execution result structure
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tool execution context containing working directory, permissions, and budget
 */
export interface ToolContext {
  workingDir: string;
  permissions: ToolPermission[];
  budget: {
    research: number;
    review: number;
    debug: number;
  };
}

/**
 * Tool handler function signature
 */
export type ToolHandler<TArgs = unknown, TResult = unknown> = (
  args: TArgs,
  context: ToolContext
) => Promise<ToolResult<TResult>>;

/**
 * Tool definition for registration
 */
export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  handler: ToolHandler<TArgs, TResult>;
  requiredPermissions: ToolPermission[];
}