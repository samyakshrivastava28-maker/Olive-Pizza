import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Default to port 6333 if no port specified in URL
let QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
if (QDRANT_URL && !QDRANT_URL.includes(':6333') && !QDRANT_URL.includes(':443')) {
  QDRANT_URL = QDRANT_URL + ':6333';
}
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';
export const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'olive_pizza';

export class QdrantService {
  private isInitialized = false;

  private async fetchQdrant(endpoint: string, options: any = {}) {
    const url = `${QDRANT_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'api-key': QDRANT_API_KEY,
      ...(options.headers || {})
    };
    const response = await fetch(url, {
      ...options,
      headers
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qdrant API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }

  public getClient() {
    // Return a mock client that KnowledgeIndexer uses
    return {
      upsert: async (collectionName: string, { wait, points }: any) => {
        return this.fetchQdrant(`/collections/${collectionName}/points?wait=${wait}`, {
          method: 'PUT',
          body: JSON.stringify({ points })
        });
      }
    };
  }

  public async initializeCollection(vectorSize: number = 768): Promise<boolean> {
    try {
      const collections: any = await this.fetchQdrant('/collections');
      const exists = collections.result.collections.some((c: any) => c.name === QDRANT_COLLECTION);
      
      if (!exists) {
        console.log(`[Qdrant] Collection ${QDRANT_COLLECTION} not found. Creating with dimension ${vectorSize}...`);
        await this.fetchQdrant(`/collections/${QDRANT_COLLECTION}`, {
          method: 'PUT',
          body: JSON.stringify({
            vectors: {
              size: vectorSize,
              distance: 'Cosine',
            }
          })
        });
        
        // Create payload index for documentId
        await this.fetchQdrant(`/collections/${QDRANT_COLLECTION}/index`, {
          method: 'PUT',
          body: JSON.stringify({
            field_name: "documentId",
            field_schema: "keyword"
          })
        });
        
        console.log(`[Qdrant] Collection ${QDRANT_COLLECTION} created successfully with index.`);
      }
      this.isInitialized = true;
      return true;
    } catch (error: any) {
      console.error('[Qdrant] Failed to initialize collection:', error.message);
      return false;
    }
  }

  public async getStatus() {
    try {
      const info: any = await this.fetchQdrant(`/collections/${QDRANT_COLLECTION}`);
      return {
        ok: true,
        collection: QDRANT_COLLECTION,
        vectorCount: info.result.points_count,
        status: info.result.status,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  public async deleteDocument(docId: string): Promise<void> {
    try {
      await this.fetchQdrant(`/collections/${QDRANT_COLLECTION}/points/delete`, {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: 'documentId',
                match: { value: docId }
              }
            ]
          }
        })
      });
    } catch (error: any) {
      console.error(`[Qdrant] Error deleting document ${docId}:`, error.message);
    }
  }

  public async search(vector: number[], topK: number = 5, filter?: any) {
    try {
      const res: any = await this.fetchQdrant(`/collections/${QDRANT_COLLECTION}/points/search`, {
        method: 'POST',
        body: JSON.stringify({
          vector: vector,
          limit: topK,
          filter: filter,
          with_payload: true,
        })
      });
      return res.result;
    } catch (error: any) {
      console.error('[Qdrant] Search error:', error.message);
      return [];
    }
  }

  public async rebuildCollection(vectorSize: number = 768): Promise<boolean> {
      console.log(`[Qdrant] Rebuilding collection ${QDRANT_COLLECTION}...`);
      try {
        await this.fetchQdrant(`/collections/${QDRANT_COLLECTION}`, { method: 'DELETE' });
      } catch (error: any) {
        console.log(`[Qdrant] Collection might not exist, proceeding to create:`, error.message);
      }
      return this.initializeCollection(vectorSize);
  }
}

export const qdrantService = new QdrantService();
