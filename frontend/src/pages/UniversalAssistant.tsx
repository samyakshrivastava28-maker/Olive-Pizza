import React from 'react';
import PageTransition from '../components/PageTransition';
import SEO from '../components/SEO';

export default function UniversalAssistant() {
  return (
    <PageTransition>
      <SEO 
        title="Olive Pizza AI Assistant | Your Smart Dining Companion" 
        description="Experience the future of ordering with Olive Pizza AI. Ask questions, get recommendations, and order effortlessly with our intelligent AI."
      />
      <div className="w-full h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
        <iframe
          src="https://olive-pizza-ai-frontend.vercel.app"
          className="w-full h-full border-none"
          allow="microphone"
          title="Olive Pizza AI Assistant"
        />
      </div>
    </PageTransition>
  );
}
