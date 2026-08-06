import React from 'react';
import LiveAdvertisements from '../../home/LiveAdvertisements';
import { SDUISection } from '../../../types/sdui.types';

export const AdsSection: React.FC<{ section: SDUISection }> = () => {
  return (
    <div className="w-full my-6">
      <LiveAdvertisements />
    </div>
  );
};
export default AdsSection;
