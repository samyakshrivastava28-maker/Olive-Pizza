import React, { useState, useEffect } from 'react';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';
import { RefreshCw, Code, Smartphone, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AILivePreview() {
  const homepage = useWebsiteConfigStore((state) => state.homepage);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [homepage]);

  if (!homepage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p>Waiting for AI generated layout to compile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 p-6 rounded-2xl border border-primary-500/20 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-6 h-6 text-primary-400" />
            AI Generated Live Preview
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time interactive preview of your AI-designed components.
          </p>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 w-full sm:w-auto">
          <button
            onClick={() => setDevice('mobile')}
            className={`flex-1 sm:flex-none flex items-center justify-center p-2 rounded-md transition-colors ${device === 'mobile' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`flex-1 sm:flex-none flex items-center justify-center p-2 rounded-md transition-colors ${device === 'desktop' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <RefreshCw className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className={`mx-auto transition-all duration-500 ease-in-out ${device === 'mobile' ? 'w-full max-w-sm rounded-[2.5rem] overflow-hidden border-[10px] border-slate-900 shadow-2xl relative h-[750px]' : 'w-full rounded-2xl border border-slate-800 min-h-[600px] shadow-2xl'} bg-[#0a0a0a]`}>
          
          {device === 'mobile' && (
            <div className="absolute top-0 inset-x-0 h-7 bg-slate-900 rounded-t-[1.5rem] z-50 flex justify-center">
              <div className="w-24 h-5 bg-black rounded-b-2xl mt-0.5" />
            </div>
          )}

          <div className={`w-full h-full overflow-y-auto ${device === 'mobile' ? 'pt-8 pb-20' : 'p-0'} scrollbar-hide`}>
            {/* Render dynamically generated AI Sections */}
            <div className="flex flex-col w-full min-h-full p-4 space-y-6">
              {homepage.sections.map((section: any, idx: number) => (
                <motion.div
                  key={section.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                  className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl"
                  style={section.style || {}}
                >
                  <div className="text-[10px] font-bold text-primary-500 font-mono mb-3 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                    {section.type}
                  </div>
                  {section.config?.title && <h3 className="text-2xl font-extrabold text-white mb-2">{section.config.title}</h3>}
                  {section.config?.subtitle && <p className="text-slate-400 text-sm mb-4">{section.config.subtitle}</p>}
                  {section.config?.headline && <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">{section.config.headline}</h2>}
                  
                  {/* JSON Dump for visual placeholder */}
                  <div className="mt-6">
                    <h4 className="text-xs text-slate-500 font-semibold mb-2 uppercase">Rendered Props</h4>
                    <pre className="text-[10px] text-slate-300 overflow-x-auto bg-black/80 p-4 rounded-xl border border-white/5 shadow-inner leading-relaxed">
                      {JSON.stringify(section.config, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
