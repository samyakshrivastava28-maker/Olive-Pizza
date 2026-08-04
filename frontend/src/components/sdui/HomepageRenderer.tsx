import React, { useMemo } from 'react';
import { useWebsiteConfigStore } from '../../stores/websiteConfigStore';
import SectionRenderer from './SectionRenderer';

export const HomepageRenderer: React.FC = () => {
  const homepage = useWebsiteConfigStore((state) => state.homepage);

  const sortedSections = useMemo(() => {
    if (!homepage?.sections) return [];
    return [...homepage.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [homepage?.sections]);

  return (
    <div className="w-full space-y-4">
      {sortedSections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </div>
  );
};
export default HomepageRenderer;
