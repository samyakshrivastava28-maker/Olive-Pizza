import React from 'react';

interface VideoSectionProps {
  config?: {
    title?: string;
    subtitle?: string;
    videoUrl?: string;
    posterUrl?: string;
    autoPlay?: boolean;
  };
}

export const VideoSection: React.FC<VideoSectionProps> = ({ config }) => {
  const videoUrl = config?.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-chef-making-a-pizza-42171-large.mp4';
  const title = config?.title || 'Crafted with Passion';
  const subtitle = config?.subtitle || 'Watch how our artisan dough and rich sauces come together';

  return (
    <section className="py-12 px-4 max-w-5xl mx-auto relative z-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">{title}</h2>
        <p className="text-slate-400 text-sm mt-2">{subtitle}</p>
      </div>
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video bg-black">
        <video
          src={videoUrl}
          poster={config?.posterUrl}
          controls
          autoPlay={config?.autoPlay ?? false}
          muted={config?.autoPlay ?? false}
          loop
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
};
export default VideoSection;
