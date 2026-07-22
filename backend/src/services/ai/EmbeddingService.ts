/**
 * EmbeddingService — Multi-Provider Embedding Generator
 *
 * Provider priority (per user request):
 *  1. NVIDIA (nv-embed-v1, 1024-dim) — primary
 *  2. OpenRouter (openai/text-embedding-3-small, 1536-dim) — fallback
 *  3. Google Gemini (gemini-embedding-001, 768-dim) — last resort fallback
 *
 * All vectors are normalized to a single canonical dimension (1024) so that the
 * Qdrant collection always receives a consistent vector size regardless of which
 * provider answered the request. The Qdrant collection is created/rebuilt to
 * match this canonical dimension at startup (see QdrantService.initializeCollection).
 *
 * If a provider returns a vector of a different length, we truncate or zero-pad
 * to the canonical dimension. This keeps semantic search functional even when
 * switching providers mid-stream.
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Canonical dimension used for the Qdrant collection.
// NVIDIA nv-embed-v1 = 1024 dims (chosen as canonical so no padding needed for primary provider).
export const CANONICAL_EMBEDDING_DIM = 1024;

// NVIDIA Integrate endpoint (OpenAI-compatible)
const NVIDIA_EMBED_URL = 'https://integrate.api.nvidia.com/v1/embeddings';
const NVIDIA_EMBED_MODEL = 'nvidia/nv-embed-v1';

// OpenRouter embeddings endpoint (OpenAI-compatible)
const OPENROUTER_EMBED_URL = 'https://openrouter.ai/api/v1/embeddings';
const OPENROUTER_EMBED_MODEL = 'openai/text-embedding-3-small';

// Gemini embedding (current model name; text-embedding-004 is deprecated/404)
const GEMINI_EMBED_MODEL = 'gemini-embedding-001';
const GEMINI_EMBED_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:batchEmbedContents?key=${key}`;

export class EmbeddingService {
  public dimension: number = CANONICAL_EMBEDDING_DIM;

  constructor() {
    const providers: string[] = [];
    if (NVIDIA_API_KEY) providers.push('NVIDIA nv-embed-v1 (1024 dims)');
    if (OPENROUTER_API_KEY) providers.push('OpenRouter text-embedding-3-small (1536 dims)');
    if (GEMINI_API_KEY) providers.push(`Gemini ${GEMINI_EMBED_MODEL} (768 dims)`);

    if (providers.length === 0) {
      console.warn('[EmbeddingService] Warning: No embedding API keys found (NVIDIA_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY).');
    } else {
      console.log(`[EmbeddingService] Providers available: ${providers.join(' → ')} (canonical dim: ${CANONICAL_EMBEDDING_DIM})`);
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    const res = await this.generateEmbeddings([text]);
    return res[0];
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    let embeddings: number[][] | null = null;
    let lastError: any = null;

    // 1. NVIDIA (primary)
    if (NVIDIA_API_KEY) {
      try {
        embeddings = await this.embedWithNvidia(texts);
      } catch (err: any) {
        lastError = err;
        console.warn('[EmbeddingService] NVIDIA embedding failed, falling back to OpenRouter:', err.message);
      }
    }

    // 2. OpenRouter (fallback)
    if (!embeddings && OPENROUTER_API_KEY) {
      try {
        embeddings = await this.embedWithOpenRouter(texts);
      } catch (err: any) {
        lastError = err;
        console.warn('[EmbeddingService] OpenRouter embedding failed, falling back to Gemini:', err.message);
      }
    }

    // 3. Gemini (last resort)
    if (!embeddings && GEMINI_API_KEY) {
      try {
        embeddings = await this.embedWithGemini(texts);
      } catch (err: any) {
        lastError = err;
        console.warn('[EmbeddingService] Gemini embedding also failed:', err.message);
      }
    }

    if (!embeddings) {
      throw new Error(
        `[EmbeddingService] All embedding providers failed. Last error: ${lastError?.message || 'No provider available'}. ` +
        `Set NVIDIA_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.`
      );
    }

    // Normalize every vector to the canonical dimension so Qdrant always
    // receives a consistent size regardless of which provider answered.
    return embeddings.map(vec => this.normalizeToSize(vec, CANONICAL_EMBEDDING_DIM));
  }

  // ── NVIDIA Embedding (OpenAI-compatible /v1/embeddings) ────────────────────────

  private async embedWithNvidia(texts: string[]): Promise<number[][]> {
    const response = await fetch(NVIDIA_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_EMBED_MODEL,
        input: texts,
        input_type: 'query',
        truncate: 'END',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`NVIDIA Embedding API error: ${response.status} - ${err}`);
    }

    const data: any = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid NVIDIA embedding response');
    }

    data.data.sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
    return data.data.map((item: any) => item.embedding as number[]);
  }

  // ── OpenRouter Embedding (OpenAI-compatible) ───────────────────────────────────

  private async embedWithOpenRouter(texts: string[]): Promise<number[][]> {
    const response = await fetch(OPENROUTER_EMBED_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_EMBED_MODEL,
        input: texts,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter Embedding API error: ${response.status} - ${err}`);
    }

    const data: any = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid OpenRouter embedding response');
    }

    data.data.sort((a: any, b: any) => (a.index ?? 0) - (b.index ?? 0));
    return data.data.map((item: any) => item.embedding as number[]);
  }

  // ── Gemini Batch Embedding ────────────────────────────────────────────────────

  private async embedWithGemini(texts: string[]): Promise<number[][]> {
    const requests = texts.map(text => ({
      model: `models/${GEMINI_EMBED_MODEL}`,
      content: { parts: [{ text }] },
    }));

    const response = await fetch(GEMINI_EMBED_URL(GEMINI_API_KEY), {
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
