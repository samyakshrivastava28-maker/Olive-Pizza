/**
 * sectionDesignerStore.ts
 * Zustand store for the Section Designer page state.
 * Manages the SSE connection, chat messages, agent logs, code output, and preview JSON.
 */

import { create } from 'zustand';
import { auth } from '../lib/firebase';

export type AgentEventType =
  | 'session_started' | 'planning' | 'question' | 'question_answered'
  | 'stitch_fetching' | 'stitch_selected' | 'subagent_started' | 'subagent_done'
  | 'subagent_failed' | 'image_generating' | 'image_analyzing' | 'image_approved'
  | 'image_rejected' | 'image_uploaded' | 'synthesizing' | 'validating'
  | 'validation_error' | 'validation_fixed' | 'file_generated' | 'preview_ready'
  | 'draft_saved' | 'cancelled' | 'error' | 'done';

export interface AgentMessage {
  id: string;
  role: 'owner' | 'agent' | 'system';
  content: string;
  timestamp: string;
  type: 'text' | 'question' | 'stitch_preview' | 'image_preview' | 'step' | 'error' | 'success';
  metadata?: any;
}

export interface AgentStep {
  id: string;
  model: string;
  task: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export interface GeneratedFile {
  name: string;
  path: string;
  content: string;
  language: 'json' | 'tsx' | 'ts' | 'css';
  hasErrors: boolean;
  errors: string[];
}

export interface AgentQuestion {
  id: string;
  question: string;
  type: 'single_select' | 'multi_select' | 'text_input' | 'image_upload';
  options?: string[];
  allowCustomAnswer: boolean;
}

interface SectionDesignerStore {
  // Session
  sessionId: string | null;
  isAgentRunning: boolean;
  isCancelled: boolean;

  // Chat
  messages: AgentMessage[];
  pendingQuestion: AgentQuestion | null;

  // Agent log
  agentSteps: AgentStep[];

  // Code output
  generatedFiles: GeneratedFile[];

  // Preview
  previewJSON: any | null;
  previewDevice: 'mobile' | 'tablet' | 'desktop';

  // Stitch
  stitchPreviews: any[];

  // Actions
  startSession: (prompt: string, referenceImages?: string[]) => Promise<void>;
  cancelSession: () => Promise<void>;
  answerQuestion: (questionId: string, answer: string | string[]) => Promise<void>;
  setPreviewDevice: (device: 'mobile' | 'tablet' | 'desktop') => void;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  addOwnerMessage: (content: string) => void;
  reset: () => void;
}

let _sseSource: EventSource | null = null;
let _currentSessionId: string | null = null;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useSectionDesignerStore = create<SectionDesignerStore>((set, get) => ({
  sessionId: null,
  isAgentRunning: false,
  isCancelled: false,
  messages: [],
  pendingQuestion: null,
  agentSteps: [],
  generatedFiles: [],
  previewJSON: null,
  previewDevice: 'mobile',
  stitchPreviews: [],

  addOwnerMessage: (content: string) => {
    const msg: AgentMessage = {
      id: generateId(),
      role: 'owner',
      content,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    set(s => ({ messages: [...s.messages, msg] }));
  },

  startSession: async (prompt: string, referenceImages?: string[]) => {
    // Cleanup previous SSE connection
    if (_sseSource) {
      _sseSource.close();
      _sseSource = null;
    }

    set({
      isAgentRunning: true,
      isCancelled: false,
      messages: [],
      agentSteps: [],
      generatedFiles: [],
      previewJSON: null,
      pendingQuestion: null,
      sessionId: null,
    });

    get().addOwnerMessage(prompt);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/section-designer/start', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, referenceImages }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const { sessionId } = await res.json();
      _currentSessionId = sessionId;
      set({ sessionId });

      // Subscribe to SSE stream
      const token = await auth.currentUser?.getIdToken();
      const sseUrl = `/api/section-designer/stream/${sessionId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      
      // Use fetch-based SSE to send auth header
      _subscribeToStream(sessionId, set, get);

    } catch (err: any) {
      set({ isAgentRunning: false });
      const errMsg: AgentMessage = {
        id: generateId(),
        role: 'system',
        content: `Error starting session: ${err.message}`,
        timestamp: new Date().toISOString(),
        type: 'error',
      };
      set(s => ({ messages: [...s.messages, errMsg] }));
    }
  },

  cancelSession: async () => {
    const { sessionId } = get();
    set({ isCancelled: true });

    if (_sseSource) { _sseSource.close(); _sseSource = null; }

    if (sessionId) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`/api/section-designer/session/${sessionId}`, {
          method: 'DELETE',
          headers,
        });
      } catch (err) {
        console.error('[Store] Cancel session error:', err);
      }
    }

    set({ isAgentRunning: false, isCancelled: true });
  },

  answerQuestion: async (questionId: string, answer: string | string[]) => {
    const { sessionId } = get();
    if (!sessionId) return;

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/section-designer/answer/${sessionId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ questionId, answer }),
      });
      set({ pendingQuestion: null });
    } catch (err) {
      console.error('[Store] Answer question error:', err);
    }
  },

  setPreviewDevice: (device) => set({ previewDevice: device }),

  saveDraft: async () => {
    const { sessionId } = get();
    if (!sessionId) return;

    const headers = await getAuthHeaders();
    await fetch('/api/section-designer/save-draft', {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId }),
    });
  },

  publish: async () => {
    const { sessionId } = get();
    if (!sessionId) return;

    const headers = await getAuthHeaders();
    await fetch('/api/section-designer/publish', {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId }),
    });
  },

  reset: () => {
    if (_sseSource) { _sseSource.close(); _sseSource = null; }
    set({
      sessionId: null, isAgentRunning: false, isCancelled: false,
      messages: [], pendingQuestion: null, agentSteps: [], generatedFiles: [],
      previewJSON: null, stitchPreviews: [],
    });
  },
}));

// Fetch-based SSE subscription (supports auth headers)
function _subscribeToStream(
  sessionId: string,
  set: any,
  get: () => SectionDesignerStore
): void {
  auth.currentUser?.getIdToken().then(token => {
    const evtSource = new EventSource(
      `/api/section-designer/stream/${sessionId}?token=${encodeURIComponent(token || '')}`
    );
    _sseSource = evtSource;

    evtSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: AgentEventType; message?: string; data?: any; model?: string; task?: string };
        _handleAgentEvent(event, sessionId, set, get);
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      _sseSource = null;
      if (get().isAgentRunning) {
        set({ isAgentRunning: false });
      }
    };
  });
}

function _handleAgentEvent(event: any, sessionId: string, set: any, get: () => SectionDesignerStore): void {
  const { type, message, data, model, task } = event;
  const id = generateId();
  const timestamp = new Date().toISOString();

  const addMsg = (msg: Partial<AgentMessage>) => {
    const fullMsg: AgentMessage = {
      id, role: 'agent', content: message || '', timestamp, type: 'text', ...msg,
    };
    set((s: SectionDesignerStore) => ({ messages: [...s.messages, fullMsg] }));
  };

  const addStep = (stepModel: string, stepTask: string, status: AgentStep['status']) => {
    const stepId = `${type}-${id}`;
    set((s: SectionDesignerStore) => {
      const existing = s.agentSteps.findIndex(x => x.id === stepId);
      const step: AgentStep = { id: stepId, model: stepModel, task: stepTask, status, startedAt: timestamp, ...(status !== 'running' ? { completedAt: timestamp } : {}) };
      if (existing >= 0) {
        const updated = [...s.agentSteps];
        updated[existing] = step;
        return { agentSteps: updated };
      }
      return { agentSteps: [...s.agentSteps, step] };
    });
  };

  switch (type) {
    case 'session_started':
    case 'planning':
      addMsg({ type: 'step', content: message || '' });
      addStep(model || 'DeepSeek V4 Pro', task || 'Planning', 'running');
      break;

    case 'question':
      addMsg({ type: 'question', metadata: data });
      if (data?.question) set({ pendingQuestion: data.question });
      break;

    case 'question_answered':
      addMsg({ type: 'step', content: message || '' });
      set({ pendingQuestion: null });
      break;

    case 'stitch_fetching':
      addMsg({ type: 'step', content: message || '' });
      addStep('Google Stitch', 'Fetching components', 'running');
      break;

    case 'stitch_selected':
      addMsg({ type: 'stitch_preview', content: message || '', metadata: data });
      if (data?.design) set((s: SectionDesignerStore) => ({ stitchPreviews: [...s.stitchPreviews, data.design] }));
      addStep('Google Stitch', `Selected: ${data?.design?.name || 'component'}`, 'done');
      break;

    case 'subagent_started':
      addMsg({ type: 'step', content: message || '' });
      addStep(model || 'Sub-agent', task || 'Working', 'running');
      break;

    case 'subagent_done':
      addStep(model || 'Sub-agent', 'Complete', 'done');
      break;

    case 'subagent_failed':
      addStep(model || 'Sub-agent', 'Failed', 'failed');
      break;

    case 'image_generating':
    case 'image_analyzing':
      addMsg({ type: 'image_preview', content: message || '', metadata: data });
      addStep(model || 'Image Pipeline', task || 'Generating', 'running');
      break;

    case 'image_approved':
    case 'image_uploaded':
      addMsg({ type: 'image_preview', content: message || '', metadata: data });
      addStep(model || 'Cloudinary', 'Image ready', 'done');
      break;

    case 'image_rejected':
      addMsg({ type: 'image_preview', content: message || '', metadata: data });
      break;

    case 'synthesizing':
      addMsg({ type: 'step', content: message || '' });
      addStep('DeepSeek V4 Pro', 'Final synthesis', 'running');
      break;

    case 'validating':
      addMsg({ type: 'step', content: message || '' });
      addStep('SDUIValidator', 'Validating', 'running');
      break;

    case 'validation_error':
      addMsg({ type: 'error', content: message || '', metadata: data });
      break;

    case 'validation_fixed':
      addMsg({ type: 'step', content: message || '' });
      addStep('SDUIValidator', 'Fixed', 'done');
      break;

    case 'file_generated':
      if (data?.files) {
        set((s: SectionDesignerStore) => ({
          generatedFiles: [...s.generatedFiles, ...data.files],
        }));
      }
      addMsg({ type: 'step', content: message || '' });
      break;

    case 'preview_ready':
      if (data?.json) set({ previewJSON: data.json });
      addMsg({ type: 'success', content: message || '✅ Section complete! Check the Live Preview →' });
      addStep('DeepSeek V4 Pro', 'Complete', 'done');
      break;

    case 'draft_saved':
      addMsg({ type: 'step', content: message || '' });
      break;

    case 'cancelled':
      addMsg({ type: 'error', content: message || '⛔ Cancelled' });
      set({ isAgentRunning: false, isCancelled: true });
      if (_sseSource) { _sseSource.close(); _sseSource = null; }
      break;

    case 'error':
      addMsg({ type: 'error', content: message || 'An error occurred' });
      addStep(model || 'Pipeline', 'Error', 'failed');
      set({ isAgentRunning: false });
      if (_sseSource) { _sseSource.close(); _sseSource = null; }
      break;

    case 'done':
      set({ isAgentRunning: false });
      if (_sseSource) { _sseSource.close(); _sseSource = null; }
      break;
  }
}
