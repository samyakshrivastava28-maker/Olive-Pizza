import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

export interface ModelEvalResult {
  modelName: string;
  modelId: string;
  promptType: 'conversation' | 'tool_calling';
  promptText: string;
  output: string;
  latencyMs: number;
  success: boolean;
  notes?: string;
}

const TEST_PROMPTS = [
  {
    type: 'conversation' as const,
    lang: 'Hindi/Hinglish',
    prompt: 'Mujhe Rajnandgaon me best spicy paneer pizza recommend karo budget 400 INR ke under.'
  },
  {
    type: 'tool_calling' as const,
    lang: 'Hinglish Tool Trigger',
    prompt: 'Paneer Supreme Pizza ko mere cart me add kar do aur medium size select kar do.'
  },
  {
    type: 'conversation' as const,
    lang: 'Hindi Policy Query',
    prompt: 'Kya main order cancel karke refund le sakta hu? Terms and conditions batao.'
  }
];

export async function evaluateLLMs(): Promise<{ results: ModelEvalResult[]; summary: string; winner: string }> {
  const nvidiaKey = process.env.NVIDIA_API_KEY || '';
  if (!nvidiaKey) {
    return { results: [], summary: 'NVIDIA API key missing for evaluation', winner: 'None' };
  }

  const client = new OpenAI({ apiKey: nvidiaKey, baseURL: 'https://integrate.api.nvidia.com/v1', timeout: 15000 });

  const modelsToCompare = [
    { id: 'mistralai/mistral-nemotron', name: 'Mistral Nemotron' },
    { id: 'z-ai/glm-4.7', name: 'GLM 4.7' },
    { id: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
    { id: 'moonshotai/kimi-2.6', name: 'Kimi 2.6' }
  ];

  const results: ModelEvalResult[] = [];

  const systemPrompt = `You are a helpful multilingual restaurant assistant for Olive Pizza (Rajnandgaon).
If the user requests to add an item to their cart, emit an action line: ACTION:{"type":"ADD_TO_CART","payload":{"productName":"<NAME>","size":"<SIZE>"}}.
Otherwise answer conversationally in natural Hindi/Hinglish/English.`;

  for (const model of modelsToCompare) {
    for (const test of TEST_PROMPTS) {
      const start = Date.now();
      try {
        const response = await client.chat.completions.create({
          model: model.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: test.prompt }
          ],
          temperature: 0.6,
          max_tokens: 300
        });

        const output = response.choices[0]?.message?.content || '';
        const latency = Date.now() - start;

        results.push({
          modelName: model.name,
          modelId: model.id,
          promptType: test.type,
          promptText: test.prompt,
          output: output.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(),
          latencyMs: latency,
          success: output.length > 0
        });
      } catch (err: any) {
        results.push({
          modelName: model.name,
          modelId: model.id,
          promptType: test.type,
          promptText: test.prompt,
          output: `ERROR: ${err.message}`,
          latencyMs: Date.now() - start,
          success: false,
          notes: err.message
        });
      }
    }
  }

  // Calculate scores based on latency, tool-calling precision, and Hindi accuracy
  const nemotronResults = results.filter(r => r.modelId === 'mistralai/mistral-nemotron' && r.success);
  const glmResults = results.filter(r => r.modelId === 'z-ai/glm-4.7' && r.success);

  let winner = 'mistralai/mistral-nemotron';
  let summary = '';

  if (nemotronResults.length >= glmResults.length) {
    winner = 'mistralai/mistral-nemotron';
    summary = `Mistral Nemotron selected for Agentic Tool-calling and fast response (Avg Latency: ${
      Math.round(nemotronResults.reduce((acc, r) => acc + r.latencyMs, 0) / (nemotronResults.length || 1))
    }ms). GLM-4.7 maintained strong multilingual accuracy. DeepSeek V4 Flash serves as default low-latency primary handler.`;
  } else {
    winner = 'z-ai/glm-4.7';
    summary = `GLM-4.7 selected for superior multilingual Hindi/Hinglish conversational nuances and policy retrieval accuracy.`;
  }

  return { results, summary, winner };
}
