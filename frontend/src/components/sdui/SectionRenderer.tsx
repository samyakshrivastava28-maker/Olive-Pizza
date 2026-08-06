import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { SDUISection } from '../../types/sdui.types';
import { useSDUIStore } from '../../stores/sduiStore';

const CategoriesSection = lazy(() => import('./sections/CategoriesSection'));
const CouponsSection = lazy(() => import('./sections/CouponsSection'));
const AdsSection = lazy(() => import('./sections/AdsSection'));
const GallerySection = lazy(() => import('./sections/GallerySection'));
const TestimonialsSection = lazy(() => import('./sections/TestimonialsSection'));
const VideoSection = lazy(() => import('./sections/VideoSection'));
const FAQSection = lazy(() => import('./sections/FAQSection'));
const BestSellersSection = lazy(() => import('./sections/BestSellersSection'));
const TrendingSection = lazy(() => import('./sections/TrendingSection'));
const AIRecommendationsSection = lazy(() => import('./sections/AIRecommendationsSection'));
const DownloadAppSection = lazy(() => import('./sections/DownloadAppSection'));
const TimelineSection = lazy(() => import('./sections/TimelineSection'));
const StatsSection = lazy(() => import('./sections/StatsSection'));
const BlogsSection = lazy(() => import('./sections/BlogsSection'));
const ContactSection = lazy(() => import('./sections/ContactSection'));
const MapsSection = lazy(() => import('./sections/MapsSection'));
const InstagramSection = lazy(() => import('./sections/InstagramSection'));
const CustomHtmlSection = lazy(() => import('./sections/CustomHtmlSection'));
const CustomReactSection = lazy(() => import('./sections/CustomReactSection'));
const BlankSection = lazy(() => import('./sections/BlankSection'));
const HeroSection = lazy(() => import('./sections/HeroSection'));

function SectionLoadingFallback() {
  return (
    <div className="w-full my-6 max-w-5xl mx-auto px-4">
      <div className="h-40 rounded-3xl bg-slate-900/40 border border-white/5 animate-pulse" />
    </div>
  );
}

export const SectionRenderer: React.FC<{ section: SDUISection }> = ({ section }) => {
  const trackEvent = useSDUIStore((state) => state.trackEvent);
  const containerRef = useRef<HTMLDivElement>(null);

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL (CRITICAL REACT FIX)
  useEffect(() => {
    if (!containerRef.current || !section.isVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackEvent({ sectionId: section.id, sectionType: section.type, eventType: 'view' });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [section.id, section.type, section.isVisible, trackEvent]);

  // 1. Visibility Guard (safe after all hooks)
  if (!section.isVisible) return null;

  // 2. Schedule Guard
  if (section.schedule?.isScheduled) {
    const now = new Date();
    if (section.schedule.startDate && new Date(section.schedule.startDate) > now) return null;
    if (section.schedule.endDate && new Date(section.schedule.endDate) < now) return null;
  }

  // Responsive class generator
  const responsiveClass = [
    section.responsive?.mobile === false ? 'hidden' : 'block',
    section.responsive?.tablet === false ? 'md:hidden' : 'md:block',
    section.responsive?.desktop === false ? 'lg:hidden' : 'lg:block',
  ].join(' ');

  const renderContent = () => {
    switch (section.type) {
      case 'categories':
        return <CategoriesSection section={section} />;
      case 'coupons':
        return <CouponsSection section={section} />;
      case 'ads':
        return <AdsSection section={section} />;
      case 'gallery':
        return <GallerySection section={section} />;
      case 'testimonials':
        return <TestimonialsSection section={section} />;
      case 'video':
        return <VideoSection section={section} />;
      case 'faq':
        return <FAQSection section={section} />;
      case 'best_sellers':
        return <BestSellersSection section={section} />;
      case 'trending':
        return <TrendingSection section={section} />;
      case 'recommendations':
        return <AIRecommendationsSection section={section} />;
      case 'download_app':
        return <DownloadAppSection section={section} />;
      case 'timeline':
        return <TimelineSection section={section} />;
      case 'stats':
        return <StatsSection section={section} />;
      case 'blogs':
        return <BlogsSection section={section} />;
      case 'contact':
        return <ContactSection section={section} />;
      case 'maps':
        return <MapsSection section={section} />;
      case 'instagram':
        return <InstagramSection section={section} />;
      case 'custom_html':
        return <CustomHtmlSection section={section} />;
      case 'custom_react':
        return <CustomReactSection section={section} />;
      case 'blank':
        return <BlankSection section={section} />;
      case 'hero':
        return <HeroSection section={section} />;
      default:
        return null;
    }
  };

  const styleObj: React.CSSProperties = {
    backgroundColor: section.style?.bgType === 'color' ? section.style?.bgColor : undefined,
    backgroundImage: section.style?.bgType === 'gradient' ? section.style?.bgGradient : undefined,
    padding: section.style?.padding,
    margin: section.style?.margin,
    borderRadius: section.style?.borderRadius,
  };

  return (
    <div ref={containerRef} className={`w-full ${responsiveClass}`} style={styleObj}>
      <Suspense fallback={<SectionLoadingFallback />}>
        {renderContent()}
      </Suspense>
    </div>
  );
};
export default SectionRenderer;
