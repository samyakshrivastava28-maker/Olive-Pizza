/**
 * toolBridge.ts — Frontend AI Tool Bridge
 *
 * Connects AI backend tool call results to the frontend executor.
 * Broadcasts execution results to subscribed components (e.g., AIAssistant).
 *
 * Flow:
 *   Backend LLM → Structured Tool JSON → /api/ai/action → toolBridge → toolExecutor → Production Stores
 */

import { executeFrontendTool, FrontendToolResult } from './toolExecutor';

export type ToolEventListener = (result: FrontendToolResult) => void;

export interface BridgeStats {
  totalDispatched: number;
  successCount: number;
  failureCount: number;
}

class ToolBridge {
  private listeners: Set<ToolEventListener> = new Set();
  private stats: BridgeStats = { totalDispatched: 0, successCount: 0, failureCount: 0 };

  public subscribe(listener: ToolEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispatch a tool call from the AI backend to the frontend executor.
   * This is the production bridge — no fake executions.
   */
  public async dispatchToolCall(
    toolName: string,
    toolCallId: string,
    args: Record<string, any>
  ): Promise<FrontendToolResult> {
    console.log(`[ToolBridge] → ${toolName} (${toolCallId})`, args);
    this.stats.totalDispatched++;

    const result = await executeFrontendTool({ toolName, toolCallId, args });

    if (result.success) {
      this.stats.successCount++;
    } else {
      this.stats.failureCount++;
      console.warn(`[ToolBridge] ⚠️ Tool ${toolName} failed: ${result.message}`);
    }

    // Notify all subscribed listeners (e.g., AIAssistant to update conversation)
    this.listeners.forEach(listener => {
      try {
        listener(result);
      } catch (err) {
        console.error('[ToolBridge] Listener error:', err);
      }
    });

    return result;
  }

  /**
   * Execute multiple tool calls in sequence (for multi-step AI actions).
   * e.g., add_to_cart → apply_coupon → start_checkout
   */
  public async dispatchSequential(
    toolCalls: Array<{ toolName: string; toolCallId: string; args: Record<string, any> }>
  ): Promise<FrontendToolResult[]> {
    const results: FrontendToolResult[] = [];
    for (const call of toolCalls) {
      const result = await this.dispatchToolCall(call.toolName, call.toolCallId, call.args);
      results.push(result);
      // Stop if a critical step fails (e.g., order placement failed)
      if (!result.success && ['place_order', 'apply_coupon'].includes(call.toolName)) {
        console.warn(`[ToolBridge] Sequential execution stopped at ${call.toolName}: ${result.message}`);
        break;
      }
    }
    return results;
  }

  public getStats(): BridgeStats {
    return { ...this.stats };
  }
}

export const toolBridge = new ToolBridge();
