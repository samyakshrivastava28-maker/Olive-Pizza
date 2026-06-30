import React, { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Shield, Lock, CreditCard, CheckCircle, FileText } from 'lucide-react';
import SEO from '../SEO';

interface TocItem {
  id: string;
  label: string;
}

interface LegalPageLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  children: React.ReactNode;
  toc?: TocItem[];
  canonicalUrl?: string;
  breadcrumbs?: Array<{name: string; url: string}>;
}

export default function LegalPageLayout({
  title,
  description,
  lastUpdated,
  children,
  toc = [],
  canonicalUrl,
  breadcrumbs
}: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      const sections = toc.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 100;

      let current = '';
      sections.forEach(section => {
        if (section && section.offsetTop <= scrollPosition) {
          current = section.id;
        }
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const top = element.offsetTop - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <>
      <SEO 
        title={title} 
        description={description} 
        canonicalUrl={canonicalUrl} 
        breadcrumbs={breadcrumbs}
      />
      
      {/* Reading Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1.5 bg-primary-500 origin-left z-50"
        style={{ scaleX }}
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          
          {/* Header */}
          <div className="text-center mb-16 mt-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center justify-center p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl mb-6 shadow-sm border border-primary-200 dark:border-primary-800/50"
            >
              <FileText className="w-8 h-8" />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight"
            >
              {title}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-6"
            >
              {description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 inline-block px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700"
            >
              Last Updated: {lastUpdated}
            </motion.div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Sticky TOC (Desktop) */}
            {toc.length > 0 && (
              <div className="hidden lg:block w-72 shrink-0">
                <div className="sticky top-28 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/40 dark:border-slate-700 p-6 rounded-3xl shadow-xl">
                  <h3 className="font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest text-xs">
                    Table of Contents
                  </h3>
                  <ul className="space-y-3">
                    {toc.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`text-sm text-left w-full transition-all duration-200 ${
                            activeSection === item.id 
                              ? 'text-primary-600 dark:text-primary-400 font-bold translate-x-1' 
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/50 dark:border-slate-700 p-6 md:p-12 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 prose max-w-none prose-headings:font-black prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-700 prose-h2:pb-4 prose-a:text-primary-500 hover:prose-a:text-primary-600 prose-img:rounded-2xl text-black prose-p:text-black prose-headings:text-primary-600 prose-strong:text-black prose-li:text-black dark:text-black dark:prose-p:text-black dark:prose-headings:text-primary-500 dark:prose-strong:text-black dark:prose-li:text-black"
              >
                {children}
              </motion.div>

              {/* Trust Elements */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                <TrustBadge icon={<Shield />} title="Privacy Protected" />
                <TrustBadge icon={<Lock />} title="GDPR Friendly" />
                <TrustBadge icon={<CreditCard />} title="Secure Payments" />
                <TrustBadge icon={<CheckCircle />} title="SSL Secure" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TrustBadge({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl text-center hover:scale-105 transition-transform duration-300">
      <div className="text-emerald-500 mb-2">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      </div>
      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </div>
    </div>
  );
}
