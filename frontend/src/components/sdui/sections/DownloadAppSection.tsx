import React from 'react';
import AppDownloadSection from '../../home/AppDownloadSection';
import { SDUISection } from '../../../types/sdui.types';

export const DownloadAppSection: React.FC<{ section: SDUISection }> = () => {
  return (
    <div className="w-full my-6">
      <AppDownloadSection />
    </div>
  );
};
export default DownloadAppSection;
