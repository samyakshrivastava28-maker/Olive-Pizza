import React from 'react';
import { SDUISection } from '../../../types/sdui.types';

export const CustomHtmlSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const htmlContent = section.config?.html || '<div style="padding: 20px; text-align: center; color: #94a3b8;">Custom HTML Section</div>';

  return (
    <div className="w-full my-6 max-w-5xl mx-auto px-4">
      {section.label && <h3 className="text-xl font-bold text-white mb-3">{section.label}</h3>}
      <div
        className="w-full rounded-2xl border border-white/10 bg-slate-900/40 p-4"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
export default CustomHtmlSection;
