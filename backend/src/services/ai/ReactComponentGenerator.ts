/**
 * ReactComponentGenerator.ts
 * 
 * Generates real, production-quality React + Framer Motion TSX components
 * from AI prompts, using Google Stitch layouts as structural inspiration
 * and enforcing Olive Pizza brand colors strictly.
 * 
 * Output: Fully functional .tsx files that can be dropped into the project.
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { StitchService } from '../stitch/StitchService.js';
import { StitchColorMapper } from '../stitch/StitchColorMapper.js';

dotenv.config();

// ─── Olive Pizza Brand System ─────────────────────────────────────────────────
const BRAND_TOKENS = {
  primary: '#55775a',
  primaryLight: '#9eb8a1',
  primaryDark: '#354a3a',
  secondary: '#f97316',
  secondaryLight: '#fb923c',
  accent: '#f59e0b',
  bg: '#0a0a0a',
  surface: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  muted: 'rgba(148,163,184,0.9)',
  success: '#4ade80',
  error: '#f87171',
};

const BRAND_SYSTEM_PROMPT = `
You are a senior React + Framer Motion UI engineer specializing in premium restaurant app interfaces for Olive Pizza.

## Olive Pizza Brand Tokens (NEVER deviate):
- primary: #55775a (Deep Olive Green)
- secondary: #f97316 (Warm Pizza Orange)
- accent: #f59e0b (Premium Gold)
- background: #0a0a0a
- surface: #121212
- card: #1e1e1e / rgba(30,30,30,0.7)
- text: white
- muted: rgba(148,163,184,0.9)
- success: #4ade80
- error: #f87171
- border: rgba(255,255,255,0.08)
- glass: rgba(30,30,30,0.7) backdrop-blur-xl

## Tailwind classes available:
- bg-primary-500, bg-primary-600, bg-primary-950
- text-primary-400, text-secondary-400, text-accent-400
- border-primary-500/30, border-white/10
- bg-dark-950, bg-dark-900, bg-dark-800
- bg-secondary-500, bg-accent-500

## Required animation principles:
1. Use spring physics for all entrance animations: type:"spring", stiffness:100, damping:20
2. Stagger children with delayChildren and staggerChildren
3. Viewport-triggered animations using whileInView + viewport={{ once: true, margin:"-100px" }}
4. Hover effects with whileHover={{ scale:1.02, y:-4 }}
5. Tap feedback with whileTap={{ scale:0.97 }}
6. Use GPU-accelerated transforms (x, y, scale, rotate, opacity) only — NO layout-thrashing properties
7. Background gradients should use Olive Pizza colors only

## Code requirements:
- Export a named component AND default export
- Use TypeScript interfaces for props
- Mobile-first: start with mobile styles, add sm: md: lg: breakpoints
- Include proper aria-labels and semantic HTML
- All images use fallback placeholder if src missing
- No external color dependencies — only brand tokens above
`;

// ─── React + Framer Motion component templates for common section types ─────
const SECTION_TEMPLATES: Record<string, string> = {
  hero: `Generate a full-screen Hero section with:
- Animated background gradient (radial, using brand colors)
- A large headline with staggered word-by-word animation
- Subtitle fade-up animation
- Two CTA buttons (primary = Order Now, secondary = View Menu)
- A floating pizza image with idle float animation (keyframes y: [-8,8,-8])
- Glassmorphism stat cards at the bottom
- Mobile-first layout`,

  bestsellers: `Generate a "Best Sellers" product grid with:
- Section heading with underline animation
- 3-4 product cards in a responsive grid
- Each card: glass-morphism, olive pizza image placeholder, name, price, Add to Cart button
- Cards stagger-animate in from below with spring physics
- Hover: card lifts (y:-8, shadow glow with primary color)
- WhileTap on Add to Cart button`,

  testimonials: `Generate a Testimonials/Reviews section with:
- Auto-scrolling carousel (AnimatePresence for transitions)
- Each review card: avatar, name, stars, review text
- Background: subtle radial gradient using primary color
- Entrance: fade + slide from right
- Navigation dots with active indicator`,

  stats: `Generate an animated Stats/Milestone counter section with:
- 4 stat cards (Orders Delivered, Happy Customers, Cities, Years)
- Numbers animate from 0 to final value when scrolled into view
- Each card has an icon, animated border, glassmorphism
- Staggered entrance animations
- Mobile: 2x2 grid, Desktop: 4 columns`,

  coupons: `Generate an Offers & Coupons section with:
- Coupon cards with animated dashed border
- Promo code copy button with spring animation feedback
- Timer countdown if expiry is set
- Cards use secondary (orange) and accent (gold) brand colors
- Animated shine effect on hover`,

  faq: `Generate an FAQ Accordion section with:
- Animated expand/collapse using Framer Motion layout animations
- Each item: question bold, answer fades in
- Smooth height animation using AnimatePresence
- Brand-colored expand indicator`,
};

function getClient(): OpenAI | null {
  const or = process.env.OPENROUTER_API_KEY;
  if (or && or.trim().length > 10) {
    return new OpenAI({
      apiKey: or,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 60000,
      defaultHeaders: {
        'HTTP-Referer': 'https://olivepizza.app',
        'X-Title': 'Olive Pizza Component Generator',
      },
    });
  }
  const nv = process.env.NVIDIA_API_KEY;
  if (nv && nv.trim().length > 10) {
    return new OpenAI({ apiKey: nv, baseURL: 'https://integrate.api.nvidia.com/v1', timeout: 60000 });
  }
  return null;
}

export interface GeneratedComponent {
  componentName: string;
  sectionType: string;
  tsxCode: string;
  htmlPreview: string;
  description: string;
  stitchInspiredLayout: any;
  animationsUsed: string[];
  generatedAt: string;
}

export class ReactComponentGenerator {
  /**
   * Main entry: generates a full React + Framer Motion component for a section type.
   * Uses Google Stitch as structural inspiration and enforces Olive Pizza brand.
   */
  static async generateSection(
    sectionType: string,
    ownerPrompt: string,
    stitchDesignId?: string
  ): Promise<GeneratedComponent> {
    const client = getClient();
    if (!client) throw new Error('No AI API key configured. Add OPENROUTER_API_KEY or NVIDIA_API_KEY.');

    // Fetch Stitch layout for structural inspiration (if provided)
    let stitchInspiredLayout: any = null;
    let stitchContext = '';
    if (stitchDesignId) {
      try {
        const stitchDesign = await StitchService.getDesign(stitchDesignId);
        stitchInspiredLayout = StitchColorMapper.enforceBrandColors(stitchDesign.layout);
        stitchContext = `
## Google Stitch Layout Inspiration (structural reference only, do NOT copy colors):
${JSON.stringify(stitchInspiredLayout, null, 2).slice(0, 800)}
Use the STRUCTURE and LAYOUT from this Stitch design, but replace ALL colors with Olive Pizza brand tokens.
`;
      } catch (e: any) {
        console.warn('[ReactComponentGenerator] Stitch fetch failed:', e.message);
      }
    }

    const templateHint = SECTION_TEMPLATES[sectionType] || `Generate a premium ${sectionType} section for Olive Pizza restaurant app.`;
    const componentName = `${sectionType.charAt(0).toUpperCase()}${sectionType.slice(1).replace(/_/g, '')}Section`;

    const prompt = `${BRAND_SYSTEM_PROMPT}
${stitchContext}

## Section to Generate:
Type: ${sectionType}
Component Name: ${componentName}
Owner Request: "${ownerPrompt}"

## Template Guidelines:
${templateHint}

## Output Requirements:
Generate a COMPLETE, PRODUCTION-READY React TypeScript component (.tsx) that:
1. Uses Framer Motion for all animations (motion.div, AnimatePresence, useInView, spring physics)
2. Uses ONLY Olive Pizza brand tokens (listed above) — absolutely no blue, purple, or random colors
3. Is fully mobile-responsive (mobile-first Tailwind)
4. Has proper TypeScript interfaces
5. Uses semantic HTML5
6. Has a named export AND default export

Output ONLY the raw TypeScript/TSX code, nothing else.
Start with 'import React' and end with 'export default ${componentName};'
NO markdown. NO explanation. ONLY code.`;

    const response = await client.chat.completions.create({
      model: 'deepseek/deepseek-chat',
      messages: [
        { role: 'system', content: 'You are an expert React + Framer Motion engineer. Output only valid TSX code.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 3000,
    });

    let tsxCode = response.choices[0]?.message?.content || '';
    // Strip any accidental markdown fences
    tsxCode = tsxCode.replace(/```(?:tsx?|jsx?|typescript)?/gi, '').replace(/```/g, '').trim();

    // Generate a simplified HTML preview for the owner to see in the UI
    const htmlPreview = ReactComponentGenerator.generateHtmlPreview(sectionType, ownerPrompt);

    // Extract animation types used
    const animationsUsed = ReactComponentGenerator.extractAnimations(tsxCode);

    return {
      componentName,
      sectionType,
      tsxCode,
      htmlPreview,
      description: `AI-generated ${sectionType} section with ${animationsUsed.join(', ')} animations. Inspired by ${stitchDesignId ? 'Google Stitch layout' : 'Olive Pizza brand guidelines'}.`,
      stitchInspiredLayout,
      animationsUsed,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a complete animated homepage layout — multiple sections together.
   */
  static async generateHomepage(
    ownerPrompt: string,
    sections: string[] = ['hero', 'categories', 'bestsellers', 'stats', 'testimonials', 'coupons'],
    stitchDesignId?: string
  ): Promise<{
    sections: GeneratedComponent[];
    pageCode: string;
    totalAnimations: number;
  }> {
    const client = getClient();
    if (!client) throw new Error('No AI API key configured.');

    // Fetch Stitch layout for overall page structure
    let stitchContext = '';
    if (stitchDesignId) {
      try {
        const design = await StitchService.getDesign(stitchDesignId);
        const branded = StitchColorMapper.enforceBrandColors(design.layout);
        stitchContext = `Google Stitch layout structure: ${JSON.stringify(branded).slice(0, 600)}`;
      } catch {}
    }

    // Generate sections in parallel for speed (3 at a time)
    const generatedSections: GeneratedComponent[] = [];
    const batch = 3;
    for (let i = 0; i < sections.length; i += batch) {
      const batchTypes = sections.slice(i, i + batch);
      const batchResults = await Promise.allSettled(
        batchTypes.map(type => ReactComponentGenerator.generateSection(type, ownerPrompt, stitchDesignId))
      );
      batchResults.forEach((r) => {
        if (r.status === 'fulfilled') generatedSections.push(r.value);
      });
    }

    // Generate the main page file that imports all sections
    const importStatements = generatedSections.map(s =>
      `import ${s.componentName} from './sections/${s.componentName}';`
    ).join('\n');

    const pageCode = `import React from 'react';
import { motion } from 'framer-motion';
${importStatements}

/**
 * AI-Generated Homepage Layout
 * Prompt: "${ownerPrompt}"
 * Generated: ${new Date().toISOString()}
 * Brand: Olive Pizza Design System
 * Technology: React + Framer Motion + Tailwind
 */
const AIGeneratedHomepage: React.FC = () => {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-dark-950"
    >
      ${generatedSections.map(s => `<${s.componentName} />`).join('\n      ')}
    </motion.main>
  );
};

export default AIGeneratedHomepage;
`;

    const totalAnimations = generatedSections.reduce((acc, s) => acc + s.animationsUsed.length, 0);

    return { sections: generatedSections, pageCode, totalAnimations };
  }

  /**
   * Generates a simplified HTML preview for immediate display in the owner panel.
   */
  private static generateHtmlPreview(sectionType: string, prompt: string): string {
    const previews: Record<string, string> = {
      hero: `<div style="background:linear-gradient(135deg,#0a0a0a,#131c17);min-height:200px;display:flex;align-items:center;justify-content:center;border-radius:12px;padding:24px;border:1px solid rgba(85,119,90,0.3)">
  <div style="text-align:center">
    <div style="color:#f59e0b;font-size:12px;font-weight:600;letter-spacing:3px;margin-bottom:8px">🍕 OLIVE PIZZA</div>
    <div style="color:white;font-size:24px;font-weight:900;margin-bottom:8px">Premium Pizzas<br/><span style="color:#55775a">Crafted with Love</span></div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
      <div style="background:#55775a;color:white;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700">Order Now</div>
      <div style="border:1px solid rgba(255,255,255,0.2);color:white;padding:8px 16px;border-radius:8px;font-size:12px">View Menu</div>
    </div>
  </div>
</div>`,
      bestsellers: `<div style="background:#0a0a0a;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08)">
  <div style="color:white;font-size:16px;font-weight:800;margin-bottom:12px;text-align:center">🔥 Best Sellers</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
    ${['Margherita', 'Pepperoni', 'Paneer Tikka'].map(n => `<div style="background:#1e1e1e;border-radius:8px;padding:10px;border:1px solid rgba(255,255,255,0.06)"><div style="color:white;font-size:11px;font-weight:700">${n}</div><div style="color:#f59e0b;font-size:10px;margin-top:2px">₹299</div></div>`).join('')}
  </div>
</div>`,
      stats: `<div style="background:linear-gradient(135deg,#131c17,#0a0a0a);padding:16px;border-radius:12px;border:1px solid rgba(85,119,90,0.2)">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center">
    ${[['50K+','Orders'],['4.9★','Rating'],['20+','Cities'],['5 Yrs','Experience']].map(([n,l]) => `<div style="background:rgba(85,119,90,0.1);border-radius:8px;padding:12px"><div style="color:#55775a;font-size:18px;font-weight:900">${n}</div><div style="color:rgba(148,163,184,0.9);font-size:10px">${l}</div></div>`).join('')}
  </div>
</div>`,
    };
    return previews[sectionType] || `<div style="background:#1e1e1e;padding:24px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);color:white;text-align:center"><div style="color:#55775a;font-size:14px;font-weight:700">${sectionType.toUpperCase()} SECTION</div><div style="color:rgba(148,163,184,0.9);font-size:11px;margin-top:4px">${prompt.slice(0, 60)}...</div></div>`;
  }

  /**
   * Extracts Framer Motion animation types used in generated code.
   */
  private static extractAnimations(code: string): string[] {
    const animations: string[] = [];
    if (code.includes('whileInView')) animations.push('scroll-triggered');
    if (code.includes('whileHover')) animations.push('hover');
    if (code.includes('whileTap')) animations.push('tap-feedback');
    if (code.includes('AnimatePresence')) animations.push('exit-animations');
    if (code.includes('staggerChildren')) animations.push('stagger');
    if (code.includes('spring')) animations.push('spring-physics');
    if (code.includes('useScroll') || code.includes('useTransform')) animations.push('scroll-parallax');
    if (code.includes('layout')) animations.push('layout-animations');
    if (animations.length === 0) animations.push('fade-slide');
    return animations;
  }
}
