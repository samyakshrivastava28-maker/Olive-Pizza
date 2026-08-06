import React, { useMemo } from 'react';
import { useSDUIStore } from '../../stores/sduiStore';
import SectionRenderer from './SectionRenderer';
import { SDUISection } from '../../types/sdui.types';
import { SafeErrorBoundary } from '../ui/SafeErrorBoundary';
import { EyeOff } from 'lucide-react';

interface HomepageRendererProps {
  overrideSections?: SDUISection[];
}

export const HomepageRenderer: React.FC<HomepageRendererProps> = ({ overrideSections }) => {
  const publishedSections = useSDUIStore((state) => state.homepage?.sections || []);

  const sortedSections = useMemo(() => {
    const target = overrideSections || publishedSections;
    return [...target].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [overrideSections, publishedSections]);

  const visibleSections = useMemo(() => {
    return sortedSections.filter((s) => s.isVisible);
  }, [sortedSections]);

  if (visibleSections.length === 0) {
    // Only show editor notice inside Website Manager Preview frame
    if (overrideSections) {
      return (
        <div className="w-full max-w-4xl mx-auto my-8 p-6 rounded-3xl bg-slate-900/60 border border-dashed border-white/10 text-center backdrop-blur-md">
          <EyeOff className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">Preview: All Sections Hidden</h4>
          <p className="text-xs text-slate-400">Enable sections in Homepage Builder to preview content.</p>
        </div>
      );
    }
    // On real website home page, completely stop showing anything (return null)
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {sortedSections.map((section) => (
        <SafeErrorBoundary key={section.id} fallback={null}>
          <SectionRenderer section={section} />
        </SafeErrorBoundary>
      ))}
    </div>
  );
};
export default HomepageRenderer;
