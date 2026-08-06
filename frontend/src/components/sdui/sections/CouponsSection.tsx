import React from 'react';
import LiveCoupons from '../../home/LiveCoupons';
import { SDUISection } from '../../../types/sdui.types';

export const CouponsSection: React.FC<{ section: SDUISection }> = () => {
  return (
    <div className="w-full my-6">
      <LiveCoupons />
    </div>
  );
};
export default CouponsSection;
