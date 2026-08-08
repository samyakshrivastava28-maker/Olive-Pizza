import { SectionVariant, SectionType, ComponentCategory } from '../types/sdui.types';

// ─── Olive Studio Component Library ───────────────────────────────────────────
// 100+ premium section variants organized by category

const v = (
  id: string,
  name: string,
  emoji: string,
  category: ComponentCategory,
  description: string,
  type: SectionType,
  defaultConfig: Record<string, any> = {},
  premium = false,
): SectionVariant => ({
  id, name, emoji, category, description, type, defaultConfig, premium,
});

export const COMPONENT_LIBRARY: SectionVariant[] = [
  // ─── HERO ───────────────────────────────────────────────────────────────────
  v('hero_luxury', 'Luxury Dark Hero', '👑', 'hero', 'Full-width dark hero with gold accents and glassmorphic card', 'hero', { headline: 'Taste the Extraordinary', subheadline: 'Crafted with passion, delivered with love', ctaText: 'Order Now', variant: 'luxury' }, true),
  v('hero_glass', 'Glass Floating Hero', '💎', 'hero', 'Glassmorphic floating hero with animated background particles', 'hero', { headline: 'Premium Pizza Experience', ctaText: 'Explore Menu', variant: 'glass' }, true),
  v('hero_minimal', 'Minimal Clean Hero', '⚡', 'hero', 'Ultra-minimal hero with bold typography and one strong CTA', 'hero', { headline: 'Pizza. Perfected.', ctaText: 'Order Now', variant: 'minimal' }),
  v('hero_video', 'Video Background Hero', '🎬', 'hero', 'Full-screen video background with overlay text and CTA', 'hero', { headline: 'Experience the Difference', ctaText: 'Watch Story', variant: 'video' }, true),
  v('hero_festival', 'Festival Diwali Hero', '🪔', 'hero', 'Festive gold and warm tones for festival campaigns', 'hero', { headline: '✨ Diwali Special Pizzas', ctaText: 'Order Festival Combo', variant: 'festival' }),
  v('hero_3d', '3D Floating Hero', '🚀', 'hero', 'Hero with 3D floating pizza card and depth effects', 'hero', { headline: 'Pizza in Another Dimension', ctaText: 'Discover', variant: '3d' }, true),
  v('hero_split', 'Split Screen Hero', '🍕', 'hero', 'Left text, right large food image — split layout', 'hero', { headline: 'Fresh Every Time', ctaText: 'See Menu', variant: 'split' }),
  v('hero_animated', 'Animated Headline Hero', '✨', 'hero', 'Typewriter animated headlines with rotating food images', 'hero', { headlines: ['Hot Pizza', 'Fresh Ingredients', 'Fast Delivery'], ctaText: 'Order Now', variant: 'animated' }),

  // ─── CATEGORIES ─────────────────────────────────────────────────────────────
  v('categories_grid', 'Category Grid', '🍕', 'categories', 'Clean 4-column category grid with emoji icons', 'categories', { title: 'Our Menu', columns: 4, style: 'grid' }),
  v('categories_pills', 'Category Pills', '💊', 'categories', 'Horizontal scrollable category pill filters', 'categories', { title: 'Browse by Type', style: 'pills' }),
  v('categories_cards', 'Category Cards', '🃏', 'categories', 'Large image-based category cards with hover effects', 'categories', { title: 'Explore Categories', style: 'cards' }, true),
  v('categories_circle', 'Circle Categories', '⭕', 'categories', 'Circular category icons with labels below', 'categories', { title: 'What are you craving?', style: 'circles' }),
  v('categories_3d', '3D Category Shelf', '📚', 'categories', 'Depth-based 3D scrolling shelf of categories', 'categories', { title: 'Browse the Menu', style: '3d' }, true),
  v('categories_animated', 'Animated Category Row', '🎠', 'categories', 'Auto-scrolling animated horizontal category row', 'categories', { title: 'Menu Highlights', style: 'animated' }),

  // ─── PRODUCTS / BEST SELLERS ─────────────────────────────────────────────
  v('products_bestsellers', 'Best Sellers Grid', '🔥', 'products', 'Top 6 best-selling items in a premium grid layout', 'best_sellers', { title: 'Our Best Sellers', count: 6, showPrice: true }),
  v('products_trending', 'Trending Right Now', '⚡', 'products', 'Trending items with real-time popularity indicators', 'trending', { title: 'Trending Now', showBadge: true }),
  v('products_featured', 'Featured Product Spotlight', '⭐', 'products', 'Single large featured product with full details', 'best_sellers', { title: "Chef's Special", count: 1, featured: true }, true),
  v('products_grid_3', 'Product Grid 3-Col', '🥗', 'products', 'Standard 3-column product card grid', 'best_sellers', { title: 'Popular Picks', columns: 3, count: 9 }),
  v('products_carousel', 'Product Carousel', '🎡', 'products', 'Horizontal swiping product carousel', 'best_sellers', { title: 'Our Favorites', layout: 'carousel' }),
  v('products_ai_picks', 'AI Personalized Picks', '🤖', 'products', 'AI-curated product recommendations for the customer', 'recommendations', { title: 'Just for You', aiPowered: true }),
  v('products_combo', 'Combo Deals Section', '🎁', 'products', 'Special combo offer cards with savings badges', 'best_sellers', { title: 'Combo Deals', showSavings: true }),

  // ─── COUPONS & OFFERS ────────────────────────────────────────────────────
  v('coupons_carousel', 'Coupon Carousel', '🎟️', 'coupons', 'Swiping coupon cards with copy-code functionality', 'coupons', { title: "Today's Deals", layout: 'carousel' }),
  v('coupons_grid', 'Coupon Grid', '🎫', 'coupons', 'Grid of active coupon cards', 'coupons', { title: 'Available Coupons', layout: 'grid' }),
  v('coupons_banner', 'Offer Banner Strip', '📢', 'coupons', 'Full-width animated discount banner strip', 'coupons', { title: 'FLAT 30% OFF Today!', layout: 'banner' }),
  v('coupons_countdown', 'Flash Sale Countdown', '⏱️', 'coupons', 'Countdown timer with flash sale offer', 'coupons', { title: 'Flash Sale Ends In', layout: 'countdown' }, true),
  v('coupons_festival', 'Festival Offer Cards', '🎪', 'coupons', 'Festive-styled offer cards with celebration theme', 'coupons', { title: 'Festival Specials', layout: 'festival' }),

  // ─── TESTIMONIALS ────────────────────────────────────────────────────────
  v('testimonials_stars', 'Star Reviews', '⭐', 'testimonials', 'Customer star ratings and review excerpts', 'testimonials', { title: 'What Our Customers Say', style: 'stars' }),
  v('testimonials_cards', 'Testimonial Cards', '💬', 'testimonials', 'Large testimonial cards with photos and quotes', 'testimonials', { title: 'Customer Love', style: 'cards' }, true),
  v('testimonials_wall', 'Review Wall', '🧱', 'testimonials', 'Masonry-style grid of customer reviews', 'testimonials', { title: 'Our Reviews', style: 'wall' }),
  v('testimonials_video', 'Video Testimonials', '📹', 'testimonials', 'Customer video review tiles', 'testimonials', { title: 'Hear From Our Customers', style: 'video' }, true),

  // ─── GALLERY ─────────────────────────────────────────────────────────────
  v('gallery_grid', 'Photo Gallery Grid', '🖼️', 'gallery', 'Masonry photo grid of food and restaurant', 'gallery', { title: 'Our Gallery', columns: 3 }),
  v('gallery_hero', 'Hero Gallery Slider', '🎠', 'gallery', 'Full-width auto-sliding gallery of best photos', 'gallery', { title: 'Food Photography', autoPlay: true }),
  v('gallery_instagram', 'Instagram Feed Wall', '📸', 'gallery', 'Instagram-style square photo wall', 'instagram', { title: 'Follow @olivepizza', handle: '@olivepizza' }),
  v('gallery_lightbox', 'Gallery with Lightbox', '🔍', 'gallery', 'Click-to-expand photo gallery with lightbox viewer', 'gallery', { title: 'Behind the Scenes', lightbox: true }, true),
  v('gallery_video_wall', 'Video Gallery', '🎬', 'gallery', 'Grid of short video clips from the kitchen', 'video', { title: 'Kitchen Stories', layout: 'grid' }),
  v('gallery_story', 'Restaurant Story Gallery', '📖', 'gallery', 'Timeline of restaurant journey with photos', 'timeline', { title: 'Our Story', style: 'story' }),

  // ─── CONTACT & MAPS ──────────────────────────────────────────────────────
  v('contact_full', 'Full Contact Section', '📞', 'contact', 'Phone, email, address and hours in one section', 'contact', { title: 'Get in Touch', showHours: true }),
  v('contact_minimal', 'Minimal Contact Bar', '📱', 'contact', 'Simple contact bar with click-to-call button', 'contact', { title: 'Call Us', minimal: true }),
  v('maps_full', 'Interactive Map', '🗺️', 'contact', 'Full interactive Google Maps embed with store pin', 'maps', { title: 'Find Us', showDirections: true }),
  v('maps_delivery', 'Delivery Zone Map', '🚴', 'contact', 'Map showing delivery radius and zones', 'maps', { title: 'We Deliver Here', showRadius: true }),

  // ─── SOCIAL & COMMUNITY ─────────────────────────────────────────────────
  v('social_instagram', 'Instagram Live Feed', '📷', 'social', 'Live Instagram post grid with follow button', 'instagram', { title: 'Find Us on Instagram', handle: '@olivepizza' }),
  v('social_download', 'App Download CTA', '📲', 'social', 'App Store and Play Store download section', 'download_app', { title: 'Download Our App', tagline: 'Get exclusive app-only deals' }),
  v('social_newsletter', 'Newsletter Signup', '📧', 'social', 'Email newsletter signup with incentive', 'contact', { title: 'Get Exclusive Deals', incentive: '10% off your first order' }),

  // ─── STATS & AWARDS ──────────────────────────────────────────────────────
  v('stats_counter', 'Animated Counter Stats', '📊', 'stats', 'Animated counting statistics (customers, orders, etc.)', 'stats', {
    title: 'By the Numbers',
    stats: [
      { label: 'Happy Customers', value: '50,000+' },
      { label: 'Orders Delivered', value: '200,000+' },
      { label: 'Years of Excellence', value: '8+' },
      { label: 'Pizza Varieties', value: '60+' },
    ],
  }),
  v('stats_awards', 'Awards & Recognition', '🏆', 'stats', 'Awards won and recognitions received', 'stats', { title: 'Our Achievements', style: 'awards' }),
  v('stats_social_proof', 'Social Proof Numbers', '💪', 'stats', 'Large social proof numbers with context', 'stats', { title: 'Why Customers Love Us', style: 'social_proof' }),
  v('stats_ratings', 'Platform Ratings', '⭐', 'stats', 'Ratings from Swiggy, Zomato, Google displayed', 'stats', { title: 'Rated the Best', style: 'ratings' }),

  // ─── RESTAURANT STORY ────────────────────────────────────────────────────
  v('story_founder', 'Founder Story', '👨‍🍳', 'story', 'Founder story with photo and personal message', 'timeline', { title: 'Our Story', style: 'founder' }),
  v('story_timeline', 'Restaurant Timeline', '⏳', 'story', 'Visual timeline of restaurant history milestones', 'timeline', { title: 'Our Journey', style: 'timeline' }),
  v('story_mission', 'Mission & Values', '🎯', 'story', 'Restaurant mission statement and core values', 'timeline', { title: 'What We Stand For', style: 'mission' }),

  // ─── CHEF & TEAM ─────────────────────────────────────────────────────────
  v('chef_profile', 'Head Chef Profile', '👨‍🍳', 'chef', 'Head chef spotlight with photo and bio', 'blogs', { title: 'Meet Our Chef', style: 'profile' }),
  v('chef_team', 'Full Team Section', '👥', 'chef', 'Grid of team members with photos and roles', 'blogs', { title: 'The Team Behind Your Pizza', style: 'team' }),
  v('chef_specials', "Chef's Specials", '🍽️', 'chef', 'Chef-curated special dishes section', 'best_sellers', { title: "Chef's Recommendations", style: 'chef_pick' }),

  // ─── APP DOWNLOAD ────────────────────────────────────────────────────────
  v('app_full', 'App Download Full', '📱', 'app_download', 'Full section with app screenshots, QR code and store badges', 'download_app', { title: 'Get the Olive Pizza App', showQR: true, showScreenshots: true }),
  v('app_minimal', 'App Download Strip', '📲', 'app_download', 'Minimal strip with store badges only', 'download_app', { title: 'Also Available On', minimal: true }),

  // ─── FAQ & INFO ──────────────────────────────────────────────────────────
  v('faq_accordion', 'FAQ Accordion', '❓', 'faq', 'Expandable FAQ questions and answers', 'faq', {
    title: 'Frequently Asked Questions',
    items: [
      { q: 'What is your delivery time?', a: 'We deliver within 30-45 minutes.' },
      { q: 'Do you offer vegan options?', a: 'Yes! We have a dedicated vegan menu.' },
    ],
  }),
  v('faq_categories', 'Categorized FAQ', '📂', 'faq', 'FAQ organized by category tabs (Delivery, Menu, Payments)', 'faq', { title: 'Help Center', categorized: true }),
  v('faq_search', 'Searchable FAQ', '🔍', 'faq', 'Searchable FAQ with instant filtering', 'faq', { title: 'Find Answers', searchable: true }, true),

  // ─── CAMPAIGNS & FESTIVALS ───────────────────────────────────────────────
  v('campaign_diwali', 'Diwali Campaign', '🪔', 'campaigns', 'Full Diwali festival campaign section with countdown', 'hero', { headline: '✨ Diwali Special!', variant: 'festival', festival: 'diwali' }),
  v('campaign_christmas', 'Christmas Campaign', '🎄', 'campaigns', 'Christmas festive campaign with snow effects', 'hero', { headline: '🎄 Merry Christmas!', variant: 'festival', festival: 'christmas' }),
  v('campaign_flash_sale', 'Flash Sale Banner', '⚡', 'campaigns', 'Urgency-driven flash sale with countdown', 'coupons', { title: '⚡ Flash Sale', variant: 'flash', layout: 'countdown' }),
  v('campaign_weekend', 'Weekend Special', '🎉', 'campaigns', 'Weekend-only offer with bright design', 'coupons', { title: 'Weekend Deals', variant: 'weekend' }),
  v('campaign_independence', 'Independence Day', '🇮🇳', 'campaigns', 'Patriotic Independence Day campaign', 'hero', { headline: '🇮🇳 Independence Day Special', variant: 'festival', festival: 'independence' }),

  // ─── CUSTOM & BLANK ──────────────────────────────────────────────────────
  v('custom_html_embed', 'Custom HTML Embed', '💻', 'custom', 'Embed any custom HTML/CSS code block', 'custom_html', { html: '<!-- Your custom HTML here -->' }),
  v('custom_react', 'Custom React Component', '⚛️', 'custom', 'Mount a dynamic React component by name', 'custom_react', { componentName: 'CustomSection' }),
  v('blank_spacer', 'Spacer / Blank', '⬛', 'custom', 'Empty spacer section with configurable height', 'blank', { height: '60px' }),
];

// ─── Category Metadata ────────────────────────────────────────────────────────

export const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  hero:         { label: 'Hero & Banners',          emoji: '🌟', color: '#f97316' },
  categories:   { label: 'Menu Categories',          emoji: '🍕', color: '#8b5cf6' },
  products:     { label: 'Products & Best Sellers',  emoji: '🔥', color: '#ef4444' },
  coupons:      { label: 'Coupons & Offers',         emoji: '🎟️', color: '#10b981' },
  testimonials: { label: 'Reviews & Testimonials',   emoji: '⭐', color: '#eab308' },
  gallery:      { label: 'Gallery & Media',          emoji: '🖼️', color: '#06b6d4' },
  contact:      { label: 'Contact & Maps',           emoji: '📞', color: '#64748b' },
  social:       { label: 'Social & Community',       emoji: '📲', color: '#ec4899' },
  stats:        { label: 'Stats & Awards',           emoji: '📊', color: '#3b82f6' },
  story:        { label: 'Restaurant Story',         emoji: '📖', color: '#a78bfa' },
  chef:         { label: 'Chef & Team',              emoji: '👨‍🍳', color: '#f59e0b' },
  app_download: { label: 'App Download',             emoji: '📱', color: '#22c55e' },
  faq:          { label: 'FAQ & Info',               emoji: '❓', color: '#94a3b8' },
  campaigns:    { label: 'Campaigns & Festivals',    emoji: '🎪', color: '#f97316' },
  custom:       { label: 'Custom & Blank',           emoji: '💻', color: '#475569' },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[];

export const getVariantsByCategory = (category: string): SectionVariant[] =>
  COMPONENT_LIBRARY.filter(v => v.category === category);

export const getVariantById = (id: string): SectionVariant | undefined =>
  COMPONENT_LIBRARY.find(v => v.id === id);
