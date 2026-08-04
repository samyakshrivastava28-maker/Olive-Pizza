import React from 'react';
import PreviouslyOrdered from '../../home/PreviouslyOrdered';
import FeaturedShowcase from '../../home/FeaturedShowcase';
import { useDataStore } from '../../../lib/dataStore';

export const RecommendationsSection: React.FC<{ config?: any }> = ({ config }) => {
  const products = useDataStore((state) => state.products);

  return (
    <>
      <PreviouslyOrdered />
      <FeaturedShowcase products={products} />
    </>
  );
};
export default RecommendationsSection;
