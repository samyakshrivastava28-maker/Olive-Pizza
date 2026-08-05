/**
 * sectionDesigner.types.ts
 * Shared type definitions for the Section Designer multi-agent pipeline.
 */

export type AgentEventType =
  | 'session_started'
  | 'planning'
  | 'question'
  | 'question_answered'
  | 'stitch_fetching'
  | 'stitch_selected'
  | 'subagent_started'
  | 'subagent_done'
  | 'subagent_failed'
  | 'image_generating'
  | 'image_analyzing'
  | 'image_approved'
  | 'image_rejected'
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

export interface AgentEvent {
  type: AgentEventType;
  sessionId: string;
  timestamp: string;
  model?: string;
  task?: string;
  data?: any;
  message?: string;
}

export interface AgentQuestion {
  id: string;
  question: string;
  type: 'single_select' | 'multi_select' | 'text_input' | 'image_upload';
  options?: string[];
  allowCustomAnswer: boolean;
}

export interface OrchestratorPlan {
  sectionType: string;
  stitchComponentId?: string;
  tasksForSubAgents: SubAgentTask[];
  imageNeeds: ImageNeed[];
  questionsForOwner: AgentQuestion[];
}

export interface SubAgentTask {
  model: 'glm-5.2' | 'kimi-2.6' | 'deepseek-flash' | 'nemotron-ultra' | 'minimax-m3';
  task: string;
}

export interface ImageNeed {
  purpose: string;
  description: string;
}

export interface ImageJob {
  id: string;
  model: 'qwen-image' | 'flux' | 'sd3-large';
  prompt: string;
  status: 'generating' | 'analyzing' | 'approved' | 'rejected' | 'uploading' | 'done' | 'failed';
  generatedUrl?: string;
  cloudinaryUrl?: string;
  qualityScore?: number;
  rejectionReason?: string;
  attempts: number;
}

export interface SubAgentOutput {
  done: boolean;
  output?: any;
  error?: string;
}

export interface DesignSession {
  sessionId: string;
  ownerId: string;
  status: 'planning' | 'questioning' | 'working' | 'synthesizing' | 'done' | 'cancelled' | 'error';
  prompt: string;
  referenceImageUrls?: string[];
  plan?: OrchestratorPlan;
  answers?: Record<string, string | string[]>;
  subAgentOutputs?: {
    glm?: SubAgentOutput;
    kimi?: SubAgentOutput;
    flash?: SubAgentOutput;
    nemotron?: SubAgentOutput;
    minimax?: SubAgentOutput;
  };
  imageJobs?: ImageJob[];
  finalJSON?: any;
  validationErrors?: string[];
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

export interface GeneratedFile {
  name: string;
  path: string;
  content: string;
  language: 'json' | 'tsx' | 'ts' | 'css';
  hasErrors: boolean;
  errors: string[];
}
