import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export class EmbeddingService {
  public dimension: number = 1536;

  constructor() {
    if (!OPENROUTER_API_KEY) {
      console.warn('[EmbeddingService] Warning: OPENROUTER_API_KEY not found.');
    }
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    const res = await this.generateEmbeddings([text]);
    return res[0];
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!OPENROUTER_API_KEY) throw new Error('Embedder not initialized');
    if (texts.length === 0) return [];

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: texts
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${err}`);
    }

    const data: any = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid embeddings response from OpenRouter');
    }
    
    // Sort by index to ensure order matches input
    data.data.sort((a: any, b: any) => a.index - b.index);
    return data.data.map((item: any) => item.embedding);
  }
}

export const embeddingService = new EmbeddingService();
