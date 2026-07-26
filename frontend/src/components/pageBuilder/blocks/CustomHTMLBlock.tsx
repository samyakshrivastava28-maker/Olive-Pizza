import React from 'react';

interface CustomHTMLBlockProps {
  html?: string;
  css?: string;
}

export default function CustomHTMLBlock({
  html = `<div style="text-align: center; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 16px; border: 1px border rgba(255,255,255,0.1);"><h3 style="color: #fbbf24; margin-bottom: 8px;">Special Announcement</h3><p style="color: #cbd5e1;">Custom promotional embed banner.</p></div>`,
  css = '',
}: CustomHTMLBlockProps) {
  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {css && <style>{css}</style>}
      <div
        className="w-full overflow-hidden"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
