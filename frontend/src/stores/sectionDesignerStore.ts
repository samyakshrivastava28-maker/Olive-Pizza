// frontend/src/stores/sectionDesignerStore.ts
// Zustand store for the Section Designer AI multi-agent page.
// Manages SSE event stream, session state, question flow, preview JSON, and publish flow.

import { create } from 'zustand';
import { auth } from '../lib/firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrored from Studio backend for frontend use)
// ─────────────────────────────────────────────────────────────────────────────

export type AgentEventType =
  | 'session_started'
  | 'planning'
  | 'question'
  | 'question_answered'
  | 'stitch_not_configured'
  | 'stitch_fetching'
  | 'stitch_selected'
  | 'subagent_started'
  | 'subagent_done'
  | 'subagent_failed'
  | 'image_generating'
  | 'image_analyzing'
  | 'image_approved'
  | 'image_rejected'
  | 'image_all_attempts_failed'
  | 'image_uploaded'
  | 'synthesizing'
  | 'validating'
  | 'validation_error'
  | 'validation_fixed'
  | 'file_generated'
  | 'preview_ready'
  | 'draft_saved'
  | 'cancelled'
  | 'error'
  | 'done';

export interface AgentLogEntry {
  id: string;
  type: AgentEventType;
  model?: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface AgentQuestion {
  id: string;
  question: string;
  type: 'single_select' | 'multi_select' | 'text_input' | 'image_upload';
  options?: string[];
  allowCustomAnswer: boolean;
}

export interface ImageJobDisplay {
  id: string;
  purpose: string;
  model: string;
  status: string;
  prompt: string;
  generatedUrl?: string;
  cloudinaryUrl?: string;
  qualityScore?: number;
  rejectionReason?: string;
  attempts: number;
  usedCSSGradientFallback?: boolean;
}

export type SessionStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'questioning'
  | 'done'
  | 'cancelled'
  | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────────────────────────────────────

// We proxy /api/section-designer through the main backend, so we use relative paths by default
const API_BASE = import.meta.env.VITE_API_URL || '';

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store State Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface SectionDesignerStore {
  // Session
  sessionId: string | null;
  status: SessionStatus;
  prompt: string;
  
  // Agent Log (all SSE events in order)
  agentLog: AgentLogEntry[];
  
  // Current question awaiting answer
  pendingQuestion: AgentQuestion | null;
  answers: Record<string, string | string[]>;
  
  // Stitch
  stitchConfigured: boolean | null;
  stitchDesign: any | null;
  
  // Image jobs
  imageJobs: ImageJobDisplay[];
  
  // Generated output
  previewJSON: any | null;
  generatedFile: any | null;
  
  // Publish
  isPublishing: boolean;
  publishResult: { success: boolean; publishedAt: string; version: number } | null;
  
  // UI state
  deviceMode: 'mobile' | 'tablet' | 'desktop';
  activeTab: 'agent' | 'preview' | 'code';
  accordionOpen: string | null; // for mobile single-accordion
  
  // Errors
  lastError: string | null;
  
  // EventSource reference (for cleanup)
  _eventSource: EventSource | null;
  
  // Actions
  setPrompt: (prompt: string) => void;
  startSession: (prompt: string, referenceImageUrls?: string[]) => Promise<void>;
  cancelSession: () => Promise<void>;
  answerQuestion: (questionId: string, answer: string | string[]) => Promise<void>;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  setDeviceMode: (mode: 'mobile' | 'tablet' | 'desktop') => void;
  setActiveTab: (tab: 'agent' | 'preview' | 'code') => void;
  setAccordionOpen: (section: string | null) => void;
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useSectionDesignerStore = create<SectionDesignerStore>((set, get) => ({
  sessionId: null,
  status: 'idle',
  prompt: '',
  agentLog: [],
  pendingQuestion: null,
  answers: {},
  stitchConfigured: null,
  stitchDesign: null,
  imageJobs: [],
  previewJSON: null,
  generatedFile: null,
  isPublishing: false,
  publishResult: null,
  deviceMode: 'mobile',
  activeTab: 'agent',
  accordionOpen: 'chat',
  lastError: null,
  _eventSource: null,

  setPrompt: (prompt) => set({ prompt }),

  startSession: async (prompt, referenceImageUrls = []) => {
    // Close any existing stream
    get()._eventSource?.close();

    set({ status: 'starting', agentLog: [], pendingQuestion: null, answers: {}, imageJobs: [], previewJSON: null, generatedFile: null, publishResult: null, lastError: null, sessionId: null, stitchDesign: null, stitchConfigured: null });

    try {
      const result = await apiFetch('/api/section-designer/start', {
        method: 'POST',
        body: JSON.stringify({ prompt, referenceImageUrls }),
      });

      const sessionId = result.sessionId as string;
      set({ sessionId, status: 'running' });

      // Connect to SSE stream
      const token = await getIdToken();
      const es = new EventSource(`${API_BASE}/api/section-designer/stream/${sessionId}?token=${encodeURIComponent(token)}`);

      set({ _eventSource: es });

      es.onmessage = (evt) => {
        const event = JSON.parse(evt.data);
        handleSSEEvent(event, set, get);
      };

      es.onerror = () => {
        const { status } = get();
        if (status !== 'done' && status !== 'cancelled') {
          set({ lastError: 'Lost connection to design agent. Please try again.', status: 'error' });
        }
        es.close();
      };
    } catch (err: any) {
      set({ status: 'error', lastError: err.message });
    }
  },

  cancelSession: async () => {
    const { sessionId } = get();
    get()._eventSource?.close();
    set({ _eventSource: null });
    if (!sessionId) return;
    try {
      await apiFetch(`/api/section-designer/session/${sessionId}`, { method: 'DELETE' });
    } catch {
      // ignore — SSE stream will close naturally
    }
    set({ status: 'cancelled' });
  },

  answerQuestion: async (questionId, answer) => {
    const { sessionId } = get();
    if (!sessionId) return;
    set({ pendingQuestion: null });
    await apiFetch(`/api/section-designer/answer/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    });
    set((s) => ({
      answers: { ...s.answers, [questionId]: answer },
      status: 'running',
    }));
  },

  saveDraft: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    await apiFetch('/api/section-designer/save-draft', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  publish: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    set({ isPublishing: true });
    try {
      const result = await apiFetch('/api/section-designer/publish', {
        method: 'POST',
        body: JSON.stringify({ sessionId, ownerConfirmed: true }),
      });
      set({ publishResult: result, isPublishing: false });
    } catch (err: any) {
      set({ isPublishing: false, lastError: err.message });
    }
  },

  setDeviceMode: (deviceMode) => set({ deviceMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setAccordionOpen: (accordionOpen) => set({ accordionOpen }),
  reset: () => {
    get()._eventSource?.close();
    set({
      sessionId: null,
      status: 'idle',
      prompt: '',
      agentLog: [],
      pendingQuestion: null,
      answers: {},
      stitchConfigured: null,
      stitchDesign: null,
      imageJobs: [],
      previewJSON: null,
      generatedFile: null,
      isPublishing: false,
      publishResult: null,
      activeTab: 'agent',
      accordionOpen: 'chat',
      lastError: null,
      _eventSource: null,
    });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// SSE Event Handler
// ─────────────────────────────────────────────────────────────────────────────

function handleSSEEvent(event: any, set: any, get: any): void {
  const logEntry: AgentLogEntry = {
    id: `${event.type}-${Date.now()}-${Math.random()}`,
    type: event.type as AgentEventType,
    model: event.model,
    message: event.message ?? '',
    timestamp: event.timestamp ?? new Date().toISOString(),
    data: event.data,
  };

  set((s: SectionDesignerStore) => ({ agentLog: [...s.agentLog, logEntry] }));

  switch (event.type as AgentEventType) {
    case 'question':
      set({ pendingQuestion: event.data as AgentQuestion, status: 'questioning' });
      break;

    case 'stitch_not_configured':
      set({ stitchConfigured: false });
      break;

    case 'stitch_fetching':
      set({ stitchConfigured: true });
      break;

    case 'stitch_selected':
      set({ stitchDesign: event.data });
      break;

    case 'image_generating':
    case 'image_analyzing':
    case 'image_approved':
    case 'image_rejected':
    case 'image_all_attempts_failed':
    case 'image_uploaded': {
      const job = event.data as ImageJobDisplay;
      if (!job?.id) break;
      set((s: SectionDesignerStore) => {
        const existing = s.imageJobs.findIndex((j) => j.id === job.id);
        const jobs = [...s.imageJobs];
        if (existing >= 0) jobs[existing] = job;
        else jobs.push(job);
        return { imageJobs: jobs };
      });
      break;
    }

    case 'file_generated':
      set({ generatedFile: event.data });
      break;

    case 'preview_ready':
      set({ previewJSON: event.data?.previewJSON ?? null, activeTab: 'preview' });
      break;

    case 'done':
      set({ status: 'done', _eventSource: null });
      get()._eventSource?.close();
      break;

    case 'cancelled':
      set({ status: 'cancelled', _eventSource: null });
      get()._eventSource?.close();
      break;

    case 'error':
      set({ lastError: event.message ?? 'Unknown error', status: 'error', _eventSource: null });
      get()._eventSource?.close();
      break;
  }
}
