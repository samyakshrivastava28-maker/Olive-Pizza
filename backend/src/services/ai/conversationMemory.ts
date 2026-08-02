import { SupportedLanguage } from './languageDetector.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  timestamp?: number;
}

export interface SessionContext {
  sessionId: string;
  userId?: string;
  userRole?: string;
  detectedLanguage: SupportedLanguage;
  messages: ChatMessage[];
  lastUpdated: number;
  messageCount: number;
}

export interface MemoryStats {
  activeSessions: number;
  totalMessages: number;
  oldestSessionAge: number;
}

const MAX_MESSAGES_PER_SESSION = 30;
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours idle expiry

class ConversationMemory {
  private sessions = new Map<string, SessionContext>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup expired sessions every 30 minutes
    this.cleanupTimer = setInterval(() => this.evictExpiredSessions(), 30 * 60 * 1000);
  }

  public getOrCreateSession(sessionId: string, userId?: string, userRole?: string): SessionContext {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        userId,
        userRole,
        detectedLanguage: 'en',
        messages: [],
        lastUpdated: Date.now(),
        messageCount: 0,
      };
      this.sessions.set(sessionId, session);
    } else {
      // Update user metadata if provided
      if (userId && !session.userId) session.userId = userId;
      if (userRole) session.userRole = userRole;
    }
    return session;
  }

  public updateLanguage(sessionId: string, lang: SupportedLanguage): void {
    const session = this.getOrCreateSession(sessionId);
    session.detectedLanguage = lang;
    session.lastUpdated = Date.now();
  }

  public addMessage(sessionId: string, message: ChatMessage): void {
    const session = this.getOrCreateSession(sessionId);
    session.messages.push({
      ...message,
      timestamp: Date.now(),
    });
    session.messageCount++;
    session.lastUpdated = Date.now();

    // Sliding window: keep last N messages to avoid token explosion
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      // Always preserve system messages
      const systemMessages = session.messages.filter(m => m.role === 'system');
      const nonSystemMessages = session.messages
        .filter(m => m.role !== 'system')
        .slice(-(MAX_MESSAGES_PER_SESSION - systemMessages.length));
      session.messages = [...systemMessages, ...nonSystemMessages];
    }
  }

  public getHistory(sessionId: string, limit: number = 20): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.messages.slice(-limit);
  }

  public getSession(sessionId: string): SessionContext | null {
    return this.sessions.get(sessionId) || null;
  }

  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(`[ConversationMemory] Session ${sessionId} cleared.`);
  }

  /**
   * Clear all sessions associated with a specific user UID.
   * Must be called on logout to enforce privacy guarantees.
   */
  public clearUserSessions(userId: string): void {
    let cleared = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        cleared++;
      }
    }
    if (cleared > 0) {
      console.log(`[ConversationMemory] Cleared ${cleared} session(s) for user ${userId}`);
    }
  }

  private evictExpiredSessions(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastUpdated > SESSION_EXPIRY_MS) {
        this.sessions.delete(sessionId);
        evicted++;
      }
    }
    if (evicted > 0) {
      console.log(`[ConversationMemory] Evicted ${evicted} expired session(s).`);
    }
  }

  public getStats(): MemoryStats {
    let totalMessages = 0;
    let oldestAge = 0;
    const now = Date.now();

    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
      const age = now - session.lastUpdated;
      if (age > oldestAge) oldestAge = age;
    }

    return {
      activeSessions: this.sessions.size,
      totalMessages,
      oldestSessionAge: oldestAge,
    };
  }
}

export const conversationMemory = new ConversationMemory();
