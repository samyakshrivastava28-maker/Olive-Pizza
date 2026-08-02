import dotenv from 'dotenv';
dotenv.config();

import { knowledgeIndexer } from '../backend/src/services/ai/KnowledgeIndexer.ts';
import { STORE_PAGES_AND_FLOWS_KNOWLEDGE } from '../backend/src/services/ai/KnowledgeSync.ts';
import { qdrantService } from '../backend/src/services/ai/QdrantService.ts';

async function seedLiveQdrant() {
  console.log('🚀 [Qdrant Live Seeder] Starting vector seeding to Qdrant Cloud...');

  try {
    const initialized = await qdrantService.initializeCollection();
    if (!initialized) {
      console.error('❌ Failed to initialize Qdrant collection');
      return;
    }

    let totalIndexed = 0;
    for (const doc of STORE_PAGES_AND_FLOWS_KNOWLEDGE) {
      console.log(`\n⏳ Vectorizing & Indexing Document: "${doc.documentId}" [${doc.category}]...`);
      const success = await knowledgeIndexer.indexText(doc.content, {
        documentId: doc.documentId,
        documentType: 'text',
        source: 'system:store_pages_and_flows',
        category: doc.category,
        tags: doc.tags,
        version: Date.now(),
      });

      if (success) {
        totalIndexed++;
        console.log(`  ✅ Successfully embedded & saved "${doc.documentId}" in Qdrant Vector Cloud!`);
      } else {
        console.error(`  ❌ Failed to index "${doc.documentId}"`);
      }
    }

    console.log(`\n🎉 [Qdrant Seeder Completed Successfully!]`);
    console.log(`📊 Total Store Flow Vector Documents Indexed: ${totalIndexed} / ${STORE_PAGES_AND_FLOWS_KNOWLEDGE.length}`);
  } catch (err) {
    console.error('❌ Qdrant Seeder Error:', err);
  }
}

seedLiveQdrant();
