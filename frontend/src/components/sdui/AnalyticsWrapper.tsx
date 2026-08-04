import React, { useEffect, useRef } from 'react';
import { trackSDUIEvent } from '../../services/analyticsTracker';

interface AnalyticsWrapperProps {
  sectionId: string;
  sectionType: string;
  children: React.ReactNode;
  trackClicks?: boolean;
}

export const AnalyticsWrapper: React.FC<AnalyticsWrapperProps> = ({
  sectionId,
  sectionType,
  children,
  trackClicks = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!containerRef.current || hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3 && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackSDUIEvent('section_view', sectionId, sectionType);
          }
        });
      },
      { threshold: [0.3] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [sectionId, sectionType]);

  const handleClick = () => {
    if (trackClicks) {
      trackSDUIEvent('section_click', sectionId, sectionType);
    }
  };

  return (
    <div ref={containerRef} onClickCapture={handleClick} data-sdui-section={sectionId} data-sdui-type={sectionType}>
      {children}
    </div>
  );
};
