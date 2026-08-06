import React from 'react';
import TestimonialsCarousel from '../../home/TestimonialsCarousel';
import { SDUISection } from '../../../types/sdui.types';

export const TestimonialsSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  return (
    <div className="w-full my-8">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-black text-white tracking-tight">{section.label || 'What Foodies Say'}</h3>
        {section.subtitle && <p className="text-sm text-slate-400 mt-1">{section.subtitle}</p>}
      </div>
      <TestimonialsCarousel />
    </div>
  );
};
export default TestimonialsSection;
