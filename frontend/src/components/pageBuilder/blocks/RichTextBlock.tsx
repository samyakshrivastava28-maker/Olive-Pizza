import React from 'react';

interface RichTextBlockProps {
  title?: string;
  contentHtml?: string;
  alignment?: 'left' | 'center' | 'right';
}

export default function RichTextBlock({
  title = 'Our Heritage',
  contentHtml = `<p>Founded in the heart of the city, <strong>Olive Pizza</strong> has been serving authentic wood-fired pizzas crafted with imported Italian flour, San Marzano tomatoes, and fresh mozzarella cheese for over a decade.</p><p>Every dough is slow-fermented for 48 hours to ensure a crisp, airy crust with signature leopard spots.</p>`,
  alignment = 'center',
}: RichTextBlockProps) {
  const alignClass =
    alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <div className={`rounded-3xl bg-neutral-900/60 border border-neutral-800 p-8 sm:p-12 ${alignClass}`}>
        {title && (
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-6">
            {title}
          </h2>
        )}

        <div
          className="prose prose-invert max-w-none text-slate-300 font-medium text-base sm:text-lg leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </div>
  );
}
