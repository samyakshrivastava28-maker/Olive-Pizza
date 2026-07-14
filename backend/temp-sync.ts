import dotenv from 'dotenv';
dotenv.config();

import { knowledgeSync } from './src/services/ai/KnowledgeSync.js';
import kb from './src/services/KnowledgeBaseService.js';

import { qdrantService } from './src/services/ai/QdrantService.js';

async function run() {
  console.log('Testing global fetch...');
  try {
    const res = await fetch('https://3b45b4b6-2289-4ee3-9b7e-69de96ad3b92.eu-central-1-0.aws.cloud.qdrant.io:6333/collections', {
      headers: {'api-key': process.env.QDRANT_API_KEY!}
    });
    console.log('Qdrant fetch status:', res.status);
    
    const res2 = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
    console.log('Gemini fetch status:', res2.status);
  } catch(e) {
    console.error('Fetch failed:', e);
  }

  console.log('Fetching from Firestore into local cache...');
  await kb.initialize();
  console.log('Local cache size:', kb.getStats());
  console.log('Rebuilding Qdrant Collection...');
  await qdrantService.rebuildCollection(1536);
  console.log('Syncing local cache to Qdrant...');
  await knowledgeSync.syncAll();
  console.log('Sync complete');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
