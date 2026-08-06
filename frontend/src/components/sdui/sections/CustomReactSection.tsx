import React from 'react';
import { SDUISection } from '../../../types/sdui.types';

export const CustomReactSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const content = section.config?.content || 'Custom Interactive React Component';

  return (
    <div className="w-full my-6 max-w-5xl mx-auto px-4">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary-900/30 to-amber-900/20 border border-primary-500/30 text-white">
        <h4 className="text-lg font-bold mb-2">{section.label || 'Custom React Component'}</h4>
        <p className="text-sm text-slate-300">{content}</p>
      </div>
    </div>
  );
};
export default CustomReactSection;
