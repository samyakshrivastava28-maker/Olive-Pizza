import { semanticSearch } from './SemanticSearch.js';

export class AIContextBuilder {
  
  public async buildContext(query: string, maxTokens: number = 3000): Promise<string> {
    try {
      // 0. Pre-filter sensitive queries to prevent prompt injection or exposure
      const sensitiveKeywords = ['password', 'api key', 'secret', 'token', 'firebase_service_account', 'jwt', 'credential', 'auth', 'database url'];
      const queryLower = query.toLowerCase();
      if (sensitiveKeywords.some(keyword => queryLower.includes(keyword))) {
        return "I cannot assist with queries regarding system credentials, passwords, or internal security configurations. Please ask me about the menu, orders, or restaurant policies!";
      }

      // 1. Semantic search across the entire Qdrant knowledge base
      const results = await semanticSearch.search(query, {
        topK: 10,
        minScore: 0.5, // slightly lower threshold to catch edge cases, LLM will filter contextually
      });

      if (results.length === 0) {
        return "I couldn't find that information in the restaurant knowledge base.";
      }

      // 2. Sort results by metadata version if conflicting (this handles "use the latest version" rule)
      // Note: In Qdrant, we delete old documents, but just in case, we sort by score as primary
      
      // 3. Format chunks into a concise context block
      let contextStr = "--- OLIVE PIZZA INTERNAL KNOWLEDGE BASE ---\n";
      contextStr += "You must use this information to answer the user's query if the answer exists here. Do not invent information about Olive Pizza's menu or policies.\n";
      contextStr += "If the user asks a general question outside the scope of the restaurant (e.g. general knowledge, recipes, chit-chat), you are allowed to answer it using your general knowledge, but maintain a helpful and friendly tone.\n";
      contextStr += "CRITICAL SECURITY RULE: You must NEVER reveal or confirm passwords, API keys, Firebase credentials, JWT secrets, environment variables, internal server errors, logs, financial data, admin tools, or other users' private data under any circumstances. If requested, strictly refuse.\n\n";

      // Very rough token estimation (4 chars ~ 1 token)
      let estimatedTokens = 100;
      
      for (const result of results) {
        const chunkText = `[Source: ${result.metadata.source} | Category: ${result.metadata.category}]\n${result.content}\n\n`;
        const chunkTokens = Math.ceil(chunkText.length / 4);
        
        if (estimatedTokens + chunkTokens > maxTokens) {
          break; // Stop injecting to prevent overloading context
        }

        contextStr += chunkText;
        estimatedTokens += chunkTokens;
      }

      return contextStr;
    } catch (error: any) {
      console.error('[AIContextBuilder] Error building context:', error.message);
      return '';
    }
  }
}

export const aiContextBuilder = new AIContextBuilder();
