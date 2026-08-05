/**
 * AgentStreamService.ts
 * Manages Server-Sent Events (SSE) connections for real-time agent streaming.
 */

import { Response } from 'express';
import { AgentEvent } from '../../types/sectionDesigner.types.js';

// Map of sessionId -> active SSE response
const activeStreams = new Map<string, Response>();

export class AgentStreamService {
  /**
   * Register an SSE response for a session.
   */
  static register(sessionId: string, res: Response): void {
    // Close any existing stream for this session
    const existing = activeStreams.get(sessionId);
    if (existing) {
      try { existing.end(); } catch (_) {}
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (_) {
        clearInterval(heartbeat);
      }
    }, 15000);

    res.on('close', () => {
      clearInterval(heartbeat);
      activeStreams.delete(sessionId);
    });

    activeStreams.set(sessionId, res);
    console.log(`[AgentStream] SSE registered for session: ${sessionId}`);
  }

  /**
   * Send an agent event to the frontend via SSE.
   */
  static emit(sessionId: string, event: AgentEvent): void {
    const res = activeStreams.get(sessionId);
    if (!res) {
      console.warn(`[AgentStream] No active stream for session: ${sessionId}`);
      return;
    }

    try {
      const data = JSON.stringify(event);
      res.write(`data: ${data}\n\n`);
    } catch (err) {
      console.error(`[AgentStream] Failed to write to stream ${sessionId}:`, err);
    }
  }

  /**
   * Close and clean up the SSE stream for a session.
   */
  static close(sessionId: string): void {
    const res = activeStreams.get(sessionId);
    if (res) {
      try {
        res.write('data: {"type":"done"}\n\n');
        res.end();
      } catch (_) {}
      activeStreams.delete(sessionId);
    }
  }

  /**
   * Check if a session has an active SSE connection.
   */
  static hasStream(sessionId: string): boolean {
    return activeStreams.has(sessionId);
  }
}
