import express from 'express';
import { generateEmailTemplate, generateImage, generateProductDescription, generateProductImage, generateChatReply, enhancePrompt } from '../services/ai.service.js';

const router = express.Router();

router.post('/generate-email', async (req, res) => {
  try {
    const { prompt, selectedProducts, audienceType } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await generateEmailTemplate(prompt, selectedProducts || [], audienceType || 'all');
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('AI Route Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, context, modelName, baseImageUrl } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await generateImage(prompt, context, modelName, baseImageUrl);
    
    if (result.success) {
      console.log('[IMAGE_INSERTED_IN_EDITOR] imageUrl:', result.imageUrl);
      res.json(result);
    } else {
      // On failure, return 422 with a clear error — NO placeholder
      res.status(422).json({ 
        error: result.error || 'Image generation failed',
        imageUrl: null,
        success: false,
      });
    }
  } catch (error: any) {
    console.error('AI Image Route Error:', error);
    res.status(500).json({ error: 'Internal server error during image generation' });
  }
});

router.post('/product-description', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const result = await generateProductDescription(messages);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('AI Route Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-product-image', async (req, res) => {
  try {
    const { productName, description, category, ingredients, toppings, sizes, crusts, imageType, customPrompt, modelName, baseImageUrl } = req.body;
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const result = await generateProductImage({
      productName, description, category, ingredients, toppings, sizes, crusts, imageType, customPrompt, modelName, baseImageUrl
    });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(422).json({ 
        error: result.error || 'Product image generation failed',
        imageUrl: null,
        success: false,
      });
    }
  } catch (error: any) {
    console.error('AI Product Image Route Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history, frontendContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await generateChatReply(message, history || [], frontendContext || {});
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('AI Chat Route Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/enhance-prompt', async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await enhancePrompt(prompt, type || 'general');
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('AI Enhance Prompt Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
