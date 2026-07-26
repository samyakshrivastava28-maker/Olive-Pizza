import React, { useEffect, useState } from 'react';
import type { PageBlock } from '../../types/pageBuilder';
import HeroBanner from './blocks/HeroBanner';
import PromoBannerCarousel from './blocks/PromoBannerCarousel';
import CategoryGrid from './blocks/CategoryGrid';
import FeaturedItemsCarousel from './blocks/FeaturedItemsCarousel';
import TestimonialsBlock from './blocks/TestimonialsBlock';
import CountdownOfferBlock from './blocks/CountdownOfferBlock';
import RichTextBlock from './blocks/RichTextBlock';
import CustomHTMLBlock from './blocks/CustomHTMLBlock';

interface PageRendererProps {
  slug?: string;
  fallbackBlocks?: PageBlock[];
  previewBlocks?: PageBlock[]; // Used in Admin Live Preview
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5-Minute Cache TTL

export default function PageRenderer({
  slug = 'home',
  fallbackBlocks,
  previewBlocks,
}: PageRendererProps) {
  const [blocks, setBlocks] = useState<PageBlock[]>(previewBlocks || fallbackBlocks || []);
  const [loading, setLoading] = useState<boolean>(!previewBlocks);

  useEffect(() => {
    if (previewBlocks) {
      setBlocks(previewBlocks);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPageConfig() {
      // 1. Check SessionStorage Cache
      const cacheKey = `page_config_${slug}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.blocks)) {
            if (isMounted) {
              setBlocks(parsed.blocks);
              setLoading(false);
            }
            return;
          }
        } catch (e) {
          sessionStorage.removeItem(cacheKey);
        }
      }

      // 2. Fetch Live Config from Backend
      try {
        const res = await fetch(`/api/page-builder/config/${slug}`);
        if (res.ok) {
          const data = await res.json();
          const liveBlocks: PageBlock[] = data?.live || data?.draft || [];

          if (liveBlocks.length > 0 && isMounted) {
            setBlocks(liveBlocks);
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ timestamp: Date.now(), blocks: liveBlocks })
            );
          } else if (fallbackBlocks && isMounted) {
            setBlocks(fallbackBlocks);
          }
        } else if (fallbackBlocks && isMounted) {
          setBlocks(fallbackBlocks);
        }
      } catch (err) {
        console.error('[PageRenderer] Failed to load page configuration:', err);
        if (fallbackBlocks && isMounted) {
          setBlocks(fallbackBlocks);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPageConfig();

    return () => {
      isMounted = false;
    };
  }, [slug, previewBlocks, fallbackBlocks]);

  if (loading && blocks.length === 0) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter visible blocks and sort by order
  const activeBlocks = blocks
    .filter((b) => b.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="w-full flex flex-col gap-4">
      {activeBlocks.map((block) => {
        const key = block.id || `${block.type}_${Math.random()}`;

        // Optional Style Overrides wrapper
        const style: React.CSSProperties = {
          backgroundColor: block.styleOverrides?.backgroundColor,
          color: block.styleOverrides?.textColor,
        };

        const paddingYClass =
          block.styleOverrides?.paddingY === 'none'
            ? 'py-0'
            : block.styleOverrides?.paddingY === 'small'
            ? 'py-4'
            : block.styleOverrides?.paddingY === 'large'
            ? 'py-16'
            : 'py-8';

        return (
          <div key={key} style={style} className={`w-full ${paddingYClass}`}>
            {renderBlockComponent(block)}
          </div>
        );
      })}
    </div>
  );
}

function renderBlockComponent(block: PageBlock) {
  const props = block.props || {};

  switch (block.type) {
    case 'HeroBanner':
      return <HeroBanner {...props} />;
    case 'PromoBannerCarousel':
      return <PromoBannerCarousel {...props} />;
    case 'CategoryGrid':
      return <CategoryGrid {...props} />;
    case 'FeaturedItemsCarousel':
      return <FeaturedItemsCarousel {...props} />;
    case 'TestimonialsBlock':
      return <TestimonialsBlock {...props} />;
    case 'CountdownOfferBlock':
      return <CountdownOfferBlock {...props} />;
    case 'RichTextBlock':
      return <RichTextBlock {...props} />;
    case 'CustomHTMLBlock':
      return <CustomHTMLBlock {...props} />;
    default:
      return null;
  }
}
