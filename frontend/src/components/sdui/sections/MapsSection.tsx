import React, { lazy, Suspense } from 'react';
import { SDUISection } from '../../../types/sdui.types';

const LocationMap = lazy(() => import('../../ui/LocationMap'));

export const MapsSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  return (
    <div className="w-full my-8 max-w-5xl mx-auto px-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white tracking-tight">{section.label || 'Store Location & Outlets'}</h3>
        {section.subtitle && <p className="text-xs text-slate-400 mt-1">{section.subtitle}</p>}
      </div>
      <div className="h-80 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
        <Suspense fallback={<div className="w-full h-full bg-slate-900 animate-pulse" />}>
          <LocationMap />
        </Suspense>
      </div>
    </div>
  );
};
export default MapsSection;
