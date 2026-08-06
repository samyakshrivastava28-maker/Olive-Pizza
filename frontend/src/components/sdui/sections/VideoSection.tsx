import React from 'react';
import { Play } from 'lucide-react';
import { SDUISection } from '../../../types/sdui.types';

export const VideoSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const videoUrl = section.config?.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const posterUrl = section.config?.posterUrl || 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="w-full my-8 max-w-5xl mx-auto px-4">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-black text-white tracking-tight">{section.label || 'Watch Kitchen In Action'}</h3>
        {section.subtitle && <p className="text-xs text-slate-400 mt-1">{section.subtitle}</p>}
      </div>
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video bg-black/60">
        <iframe
          src={videoUrl}
          title={section.label || 'Video'}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};
export default VideoSection;
