import React from 'react';
import { SDUISection } from '../../../types/sdui.types';

export const BlankSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  return (
    <div className="w-full my-6 py-8 px-4 max-w-5xl mx-auto rounded-2xl border border-dashed border-white/10 bg-slate-900/20 text-center">
      <p className="text-sm font-semibold text-slate-400">{section.label || 'Blank Canvas Section'}</p>
      {section.subtitle && <p className="text-xs text-slate-500 mt-1">{section.subtitle}</p>}
    </div>
  );
};
export default BlankSection;
