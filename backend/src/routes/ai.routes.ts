import express from 'express';
import { generateEmailTemplate, generateImage, generateProductDescription, generateProductImage, generateChatReply, enhancePrompt, aiProviderStats } from '../services/ai.service.js';
import kb from '../services/KnowledgeBaseService.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { aiContextBuilder } from '../services/ai/AIContextBuilder.js';
import { qdrantService } from '../services/ai/QdrantService.js';
import { recommendationEngine } from '../services/ai/RecommendationEngine.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.middleware.js';

const router = express.Router();

// ─── KB Health & Status ───────────────────────────────────────────────────────
router.get('/kb-status', async (_req, res) => {
  try {
    const stats = kb.getStats();
    res.json({
      success: true,
      isReady: kb.isReady(),
      stats,
      categories: kb.getAllCategories().map(c => c.name),
      activeCoupons: kb.getAllCoupons().length,
      providers: {
        nvidia: aiProviderStats.nvidia,
        openrouter: aiProviderStats.openrouter,
        gemini: aiProviderStats.gemini,
        activeProvider: aiProviderStats.activeProvider,
        totalRequests: aiProviderStats.totalRequests,
        totalFailovers: aiProviderStats.totalFailovers,
        avgResponseMs: aiProviderStats.avgResponseMs,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/kb-rebuild', requireAuth, requireRole(['owner', 'admin']), async (_req, res) => {
  try {
    const stats = await kb.forceRebuild();
    res.json({ success: true, message: 'Knowledge base rebuilt successfully', stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Primary Chat Route (4-tier priority) ─────────────────────────────────────
router.post('/chat', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { message, history, frontendContext } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // ── TIER 1: Local Knowledge Quick Answer (0 API calls) ───────────────────
    const quickAnswer = kb.quickAnswer(message);
    if (quickAnswer) {
      return res.json({
        success: true,
        reply: quickAnswer,
        source: 'local_kb',
        products: [],
      });
    }

    // Always search for relevant products for any query
    const products = kb.searchProducts(message, 4);
    
    // Retrieve personalized context if user is logged in
    let userContext = '';
    if (req.user) {
      if (req.user.role === 'customer') {
        userContext = await recommendationEngine.getUserProfileContext(req.user.uid);
      } else if (req.user.role === 'delivery') {
        userContext = await recommendationEngine.getDeliveryPartnerContext(req.user.uid);
      } else if (req.user.role === 'owner' || req.user.role === 'admin') {
        userContext = await recommendationEngine.getOwnerContext();
      }
    }
    
    let kbContext = '';
    const qStatus = await qdrantService.getStatus();
    if (qStatus.ok && (qStatus.vectorCount ?? 0) > 0) {
      kbContext = await aiContextBuilder.buildContext(message);
    } else {
      kbContext = kb.buildContextForQuery(message);
    }

    if (userContext) {
      kbContext += `\n\n${userContext}`;
    }

    // ── TIER 1.5: Security Hard Block ────────────────────────────────────────
    if (kbContext.startsWith("I cannot assist with queries regarding system credentials")) {
      return res.json({
        success: true,
        reply: "I cannot assist with queries regarding system credentials, passwords, or internal security configurations. Please ask me about the menu, orders, or restaurant policies!",
        source: 'security_guardrail',
        products: [],
      });
    }

    // ── TIER 2 & 3: AI with Knowledge Context ────────────────────────────────
    const result = await generateChatReply(message, history || [], {
      ...frontendContext,
      kbContext,
    });

    if (result.success) {
      return res.json({
        success: true,
        reply: result.reply,
        action: result.action,
        source: result.source || 'ai',
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          discountedPrice: p.discountedPrice,
          category: p.category,
          description: p.description,
          imageUrl: p.imageUrl,
          rating: p.rating,
          preparationTime: p.preparationTime,
          isVeg: p.isVeg,
          isAvailable: p.isAvailable,
        })),
      });
    }

    // ── TIER 4: Offline Template Response ─────────────────────────────────────
    const q = message.toLowerCase();
    const settings = kb.getSettings();
    let offlineReply = '';

    if (products.length > 0) {
      offlineReply = `🍕 Here's what I found for you:\n\n${products.map(p => `**${p.name}** — ₹${p.discountedPrice ?? p.price}\n${p.description}`).join('\n\n')}`;
    } else if (q.includes('menu') || q.includes('pizza') || q.includes('food')) {
      offlineReply = `Visit our [Menu page](/menu) to browse our full selection! 🍕`;
    } else if (q.includes('order')) {
      offlineReply = `Track your order from your [Dashboard](/dashboard) or browse our [Menu](/menu) for new orders! 🛵`;
    } else if (settings) {
      offlineReply = `I'm here to help! Olive Pizza is ${settings.isOpen ? 'currently OPEN 🟢' : 'currently CLOSED 🔴'}. Delivery takes ${settings.estimatedDeliveryTime}. Ask me anything!`;
    } else {
      offlineReply = `I'm here to help with your Olive Pizza experience! Ask me about our menu, offers, delivery, or anything else! 🍕`;
    }

    res.json({
      success: true,
      reply: offlineReply,
      source: 'offline_template',
      products: products.map(p => ({
        id: p.id, name: p.name, price: p.price, discountedPrice: p.discountedPrice,
        category: p.category, description: p.description, imageUrl: p.imageUrl,
        rating: p.rating, preparationTime: p.preparationTime, isVeg: p.isVeg, isAvailable: p.isAvailable,
      })),
    });
  } catch (err: any) {
    console.error('[AI Chat Route]', err.message);
    res.status(500).json({ success: false, error: 'Internal server error', reply: `I'm having a brief moment. Please try again! 🍕` });
  }
});

// ─── Email Generation ─────────────────────────────────────────────────────────
router.post('/generate-email', async (req, res) => {
  try {
    const { prompt, selectedProducts, audienceType } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const result = await generateEmailTemplate(prompt, selectedProducts || [], audienceType || 'all');
    if (result.success) res.json(result); else res.status(500).json({ error: result.error });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, context, modelName, baseImageUrl } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const result = await generateImage(prompt, context, modelName, baseImageUrl);
    if (result.success) {
      console.log('[IMAGE_INSERTED_IN_EDITOR] imageUrl:', result.imageUrl);
      res.json(result);
    } else {
      res.status(422).json({ error: result.error || 'Image generation failed', imageUrl: null, success: false });
    }
  } catch (error: any) { res.status(500).json({ error: 'Internal server error during image generation' }); }
});

router.post('/product-description', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages array is required' });
    const result = await generateProductDescription(messages);
    if (result.success) res.json(result); else res.status(500).json({ error: result.error });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/generate-product-image', async (req, res) => {
  try {
    const { productName, description, category, ingredients, toppings, sizes, crusts, imageType, customPrompt, modelName, baseImageUrl } = req.body;
    if (!productName) return res.status(400).json({ error: 'Product name is required' });
    const result = await generateProductImage({ productName, description, category, ingredients, toppings, sizes, crusts, imageType, customPrompt, modelName, baseImageUrl });
    if (result.success) res.json(result);
    else res.status(422).json({ error: result.error || 'Product image generation failed', imageUrl: null, success: false });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/enhance-prompt', async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const result = await enhancePrompt(prompt, type || 'general');
    if (result.success) res.json(result); else res.status(500).json({ error: result.error });
  } catch (error: any) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
