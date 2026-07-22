import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Only append :6333 if the URL has no port at all (i.e., no ":\d{4,5}" pattern)
const rawUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const hasPort = /:\d{2,5}$/.test(rawUrl.replace(/^https?:\/\//, '').split('/')[0]);
let QDRANT_URL = hasPort ? rawUrl : rawUrl + ':6333';

const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';
export const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'olive_pizza';

console.log(`[Qdrant] URL configured: ${QDRANT_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')} | Collection: ${QDRANT_COLLECTION} | API Key: ${QDRANT_API_KEY ? '✅ Set' : '❌ Missing'}`);


export class QdrantService {
  private isInitialized = false;
  private isDisabled = false;

  private async fetchQdrant(endpoint: string, options: any = {}) {
    if (this.isDisabled) {
      throw new Error('Qdrant AI Search is disabled (offline).');
    }
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
    if (this.isDisabled) return false;
    
    // Disable only if pointing to localhost in production (cloud URLs are always fine)
    if (process.env.NODE_ENV === 'production' && (QDRANT_URL.includes('localhost') || QDRANT_URL.includes('127.0.0.1'))) {
      console.warn('[Qdrant] AI Search disabled: Cannot connect to localhost in production.');
      this.isDisabled = true;
      return false;
    }

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
      console.error('[Qdrant] Failed to initialize collection, disabling AI Search:', error.message);
      this.isDisabled = true;
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
