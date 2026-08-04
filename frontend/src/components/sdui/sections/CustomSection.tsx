import React from 'react';

interface CustomSectionProps {
  config?: {
    htmlContent?: string;
    title?: string;
    backgroundColor?: string;
    padding?: string;
  };
}

export const CustomSection: React.FC<CustomSectionProps> = ({ config }) => {
  if (!config?.htmlContent) return null;

  return (
    <section
      className="py-8 px-4 max-w-7xl mx-auto relative z-10"
      style={{
        backgroundColor: config.backgroundColor || 'transparent',
        padding: config.padding || undefined,
      }}
    >
      {config.title && <h2 className="text-2xl font-bold text-white mb-6 text-center">{config.title}</h2>}
      <div
        className="prose prose-invert max-w-none text-slate-300"
        dangerouslySetInnerHTML={{ __html: config.htmlContent }}
      />
    </section>
  );
};
export default CustomSection;
