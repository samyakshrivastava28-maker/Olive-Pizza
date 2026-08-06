import React from 'react';
import LiveMenuCategories from '../../home/LiveMenuCategories';
import { SDUISection } from '../../../types/sdui.types';

export const CategoriesSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  return (
    <div className="w-full my-6">
      {section.subtitle && (
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white tracking-tight">{section.label}</h3>
          <p className="text-sm text-slate-400">{section.subtitle}</p>
        </div>
      )}
      <LiveMenuCategories />
    </div>
  );
};
export default CategoriesSection;
