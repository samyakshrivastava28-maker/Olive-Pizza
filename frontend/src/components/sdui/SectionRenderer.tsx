import React, { lazy, Suspense } from 'react';
import { Section } from '../../stores/websiteConfigStore';
import { AnalyticsWrapper } from './AnalyticsWrapper';

// Lazy-loaded section components
const CategoriesSection = lazy(() => import('./sections/CategoriesSection'));
const CouponsSection = lazy(() => import('./sections/CouponsSection'));
const AdsSection = lazy(() => import('./sections/AdsSection'));
const RecommendationsSection = lazy(() => import('./sections/RecommendationsSection'));
const DownloadAppSection = lazy(() => import('./sections/DownloadAppSection'));
const TestimonialsSection = lazy(() => import('./sections/TestimonialsSection'));
const StatsSection = lazy(() => import('./sections/StatsSection'));
const FAQSection = lazy(() => import('./sections/FAQSection'));
const CustomSection = lazy(() => import('./sections/CustomSection'));
const VideoSection = lazy(() => import('./sections/VideoSection'));

function SectionLoadingPlaceholder() {
  return (
    <div className="w-full py-8 max-w-7xl mx-auto px-4">
      <div className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
    </div>
  );
}

export const SectionRenderer: React.FC<{ section: Section }> = ({ section }) => {
  if (!section.isVisible) return null;

  const renderContent = () => {
    switch (section.type) {
      case 'categories':
        return <CategoriesSection config={section.config} />;
      case 'coupons':
        return <CouponsSection config={section.config} />;
      case 'ads':
        return <AdsSection config={section.config} />;
      case 'recommendations':
      case 'bestsellers':
      case 'trending':
        return <RecommendationsSection config={section.config} />;
      case 'download_app':
        return <DownloadAppSection config={section.config} />;
      case 'testimonials':
        return <TestimonialsSection config={section.config} />;
      case 'stats':
        return <StatsSection config={section.config} />;
      case 'faq':
        return <FAQSection config={section.config} />;
      case 'video':
        return <VideoSection config={section.config} />;
      case 'custom':
        return <CustomSection config={section.config} />;
      case 'hero':
        // Hero is handled explicitly in Home.tsx via LuxuryHero
        return null;
      default:
        return null;
    }
  };

  return (
    <AnalyticsWrapper sectionId={section.id} sectionType={section.type}>
      <Suspense fallback={<SectionLoadingPlaceholder />}>
        {renderContent()}
      </Suspense>
    </AnalyticsWrapper>
  );
};
export default SectionRenderer;
