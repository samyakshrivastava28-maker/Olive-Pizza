import { qdrantService } from './QdrantService.js';
import { embeddingService } from './EmbeddingService.js';

export interface SearchOptions {
  topK?: number;
  minScore?: number;
  category?: string;
  tags?: string[];
}

export interface SearchResult {
  content: string;
  score: number;
  metadata: any;
}

export class SemanticSearch {
  
  public async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      const topK = options.topK || 5;
      const minScore = options.minScore || 0.6; // Cosine similarity threshold
      
      // 1. Generate query embedding
      const queryVector = await embeddingService.generateEmbedding(query);

      // 2. Build Qdrant filter if provided
      let qdrantFilter: any = undefined;
      
      const mustClauses: any[] = [];
      if (options.category) {
        mustClauses.push({
          key: 'category',
          match: { value: options.category }
        });
      }
      if (options.tags && options.tags.length > 0) {
        mustClauses.push({
          key: 'tags',
          match: { any: options.tags }
        });
      }

      if (mustClauses.length > 0) {
        qdrantFilter = { must: mustClauses };
      }

      // 3. Search Qdrant
      const qdrantResults = await qdrantService.search(queryVector, topK, qdrantFilter);

      // 4. Filter and map results
      const results: SearchResult[] = qdrantResults
        .filter((hit: any) => hit.score >= minScore)
        .map((hit: any) => ({
          content: hit.payload?.content as string || '',
          score: hit.score,
          metadata: hit.payload || {},
        }));

      return results;
    } catch (error: any) {
      console.error('[SemanticSearch] Search failed:', error.message);
      return [];
    }
  }
}

export const semanticSearch = new SemanticSearch();
