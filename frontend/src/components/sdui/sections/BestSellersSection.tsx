import React from 'react';
import { useDataStore } from '../../../lib/dataStore';
import LuxuryProductCard from '../../ui/LuxuryProductCard';
import { SDUISection } from '../../../types/sdui.types';

export const BestSellersSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const { products } = useDataStore();
  const topProducts = products.filter((p) => !p.isComboOnly).slice(0, 8);

  if (topProducts.length === 0) return null;

  return (
    <div className="w-full my-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            🔥 <span>{section.label || 'Best Sellers'}</span>
          </h3>
          {section.subtitle && <p className="text-xs text-slate-400 mt-1">{section.subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topProducts.map((p, i) => (
          <LuxuryProductCard key={p.id} product={p} index={i} wishlistIds={[]} />
        ))}
      </div>
    </div>
  );
};
export default BestSellersSection;
