/**
 * EmbeddingService — Multi-Provider Embedding Generator
 *
 * Provider priority:
 *  1. Google Gemini (text-embedding-004, 768-dim) — primary
 *  2. OpenRouter (openai/text-embedding-3-small, 1536-dim) — fallback
 *
 * Qdrant collection is created with 768 dimensions (Gemini model).
 * If only OpenRouter is available, we truncate/pad to 768 dims.
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const GEMINI_EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
const GEMINI_BATCH_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_API_KEY}`;

export class EmbeddingService {
  public dimension: number = 768; // Gemini text-embedding-004 = 768 dims

  constructor() {
    if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
      console.warn('[EmbeddingService] Warning: No embedding API keys found (GEMINI_API_KEY or OPENROUTER_API_KEY).');
    } else if (GEMINI_API_KEY) {
      console.log('[EmbeddingService] Using Google Gemini text-embedding-004 (768 dims)');
    } else {
      console.log('[EmbeddingService] Using OpenRouter text-embedding-3-small (will pad/truncate to 768 dims)');
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    const res = await this.generateEmbeddings([text]);
    return res[0];
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // Try Gemini first (primary)
    if (GEMINI_API_KEY) {
      try {
        return await this.embedWithGemini(texts);
      } catch (err: any) {
        console.warn('[EmbeddingService] Gemini embedding failed, falling back to OpenRouter:', err.message);
      }
    }

    // Fallback to OpenRouter
    if (OPENROUTER_API_KEY) {
      const embeddings = await this.embedWithOpenRouter(texts);
      // Pad/truncate to 768 dims to match Qdrant collection
      return embeddings.map(vec => this.normalizeToSize(vec, 768));
    }

    throw new Error('[EmbeddingService] No embedding provider available. Set GEMINI_API_KEY or OPENROUTER_API_KEY.');
  }

  // ── Gemini Batch Embedding ────────────────────────────────────────────────────

  private async embedWithGemini(texts: string[]): Promise<number[][]> {
    // Gemini batchEmbedContents API
    const requests = texts.map(text => ({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }));

    const response = await fetch(GEMINI_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini Embedding API error: ${response.status} - ${err}`);
    }

    const data: any = await response.json();

    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error('Invalid Gemini batch embedding response');
    }

    return data.embeddings.map((e: any) => e.values as number[]);
  }

  // ── OpenRouter Embedding ──────────────────────────────────────────────────────

  private async embedWithOpenRouter(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: texts,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter Embedding API error: ${response.status} - ${err}`);
    }

    const data: any = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid embeddings response from OpenRouter');
    }

    data.data.sort((a: any, b: any) => a.index - b.index);
    return data.data.map((item: any) => item.embedding as number[]);
  }

  // ── Utility ───────────────────────────────────────────────────────────────────

  /**
   * Normalize a vector to exactly `size` dimensions.
   * - If too long: truncate
   * - If too short: zero-pad
   */
  private normalizeToSize(vec: number[], size: number): number[] {
    if (vec.length === size) return vec;
    if (vec.length > size) return vec.slice(0, size);
    return [...vec, ...new Array(size - vec.length).fill(0)];
  }
}

export const embeddingService = new EmbeddingService();
