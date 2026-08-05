import React, { useState, useEffect, useRef } from 'react';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';
import { auth } from '../../../lib/firebase';
import { RefreshCw, Code, Smartphone, Monitor, Send, Sparkles, Bot, AlertCircle, Settings, Layers, Box, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SectionDesigner() {
  const { homepage, invalidateCache } = useWebsiteConfigStore();
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [generationSteps]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setGenerationSteps([]);
    setActiveModel('DeepSeek V4 Pro');

    const addStep = (step: string, model: string) => {
      setGenerationSteps(prev => [...prev, `[${model}] ${step}`]);
      setActiveModel(model);
    };

    try {
      addStep('Analyzing owner requirements and planning orchestration...', 'DeepSeek V4 Pro');
      
      // Simulate multi-agent communication delays for the UI (real backend takes time)
      setTimeout(() => addStep('Structuring layout JSON format...', 'GLM 5.2'), 1500);
      setTimeout(() => addStep('Drafting creative UX copy and flows...', 'Kimi 2.6'), 3000);
      setTimeout(() => addStep('Generating rapid component blocks...', 'DeepSeek V4 Flash'), 4500);
      setTimeout(() => addStep('Checking Google Stitch registry for active components...', 'DeepSeek V4 Pro'), 6000);
      setTimeout(() => addStep('Validating brand compliance and layout structure...', 'DeepSeek V4 Pro'), 7500);

      const response = await fetch('/api/design-studio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      addStep('Design complete! Saving to SDUI Config...', 'DeepSeek V4 Pro');
      
      // Give the backend a second to save, then fetch the updated store
      setTimeout(() => {
        invalidateCache();
        setIsGenerating(false);
        setActiveModel(null);
        setPrompt('');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate UI.');
      setIsGenerating(false);
      setActiveModel(null);
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-100px)] gap-6 p-6">
      
      {/* LEFT PANE: Multimodal Designer Chat */}
      <div className="w-1/3 flex flex-col bg-slate-900/60 rounded-3xl border border-white/5 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        <div className="p-5 border-b border-white/5 bg-slate-900/80">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-400" />
            Multimodal Designer
          </h2>
          <p className="text-xs text-slate-400 mt-1">Orchestrated by DeepSeek V4 Pro</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
          <div className="bg-primary-500/10 border border-primary-500/20 p-4 rounded-2xl">
            <p className="text-sm text-primary-100">
              Welcome to the AI Section Designer. Tell me what you want to build or modify.
              My orchestration engine will automatically engage <b>GLM 5.2</b>, <b>Kimi 2.6</b>, <b>DeepSeek Flash</b>, and image models to design it.
            </p>
          </div>

          <AnimatePresence>
            {generationSteps.map((step, idx) => {
              const modelMatch = step.match(/\[(.*?)\] (.*)/);
              const model = modelMatch ? modelMatch[1] : 'System';
              const text = modelMatch ? modelMatch[2] : step;
              
              const isHead = model.includes('Pro');
              
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-3 p-3 rounded-2xl ${isHead ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-slate-800/50 border border-white/5'}`}
                >
                  <div className={`mt-1 flex-none w-6 h-6 rounded-full flex items-center justify-center ${isHead ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-300'}`}>
                    {isHead ? <Bot className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isHead ? 'text-indigo-400' : 'text-slate-400'}`}>{model}</span>
                    <p className="text-sm text-slate-200 mt-0.5">{text}</p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-none" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <div className="p-5 bg-slate-900 border-t border-white/5 relative z-10">
          {activeModel && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-12 left-5 right-5"
            >
              <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md py-2 px-4 rounded-xl border border-white/10 shadow-lg">
                <RefreshCw className="w-4 h-4 text-primary-500 animate-spin" />
                <span className="text-xs font-semibold text-white">
                  <span className="text-primary-400">{activeModel}</span> is actively generating...
                </span>
              </div>
            </motion.div>
          )}

          <div className="relative">
            <textarea
              disabled={isGenerating}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="E.g., Build a dark-mode promotional hero banner for a new spicy pizza..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-primary-500/50 rounded-2xl py-4 px-4 pr-14 text-sm text-white placeholder-slate-500 resize-none outline-none transition-all focus:ring-4 focus:ring-primary-500/10 disabled:opacity-50"
              rows={3}
            />
            <button
              disabled={isGenerating || !prompt.trim()}
              onClick={handleGenerate}
              className="absolute right-3 bottom-3 p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-primary-600 shadow-lg shadow-primary-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Live Canvas Preview */}
      <div className="flex-1 flex flex-col bg-slate-950 rounded-3xl border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="h-14 border-b border-white/5 bg-slate-900/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200 tracking-wide">LIVE CANVAS</span>
          </div>
          <div className="flex bg-slate-800/80 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-md transition-all ${device === 'mobile' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded-md transition-all ${device === 'desktop' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-[#0a0a0a]">
          {!homepage ? (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm font-medium">Connecting to SDUI Engine...</p>
            </div>
          ) : (
            <div className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${device === 'mobile' ? 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-black shadow-2xl shadow-primary-900/20 relative' : 'w-full h-full rounded-xl border border-white/5 shadow-2xl relative'} bg-black overflow-hidden`}>
              
              {device === 'mobile' && (
                <div className="absolute top-0 inset-x-0 h-7 bg-black z-50 flex justify-center">
                  <div className="w-32 h-6 bg-slate-900 rounded-b-3xl mt-0 shadow-inner" />
                </div>
              )}

              <div className={`w-full h-full overflow-y-auto scrollbar-hide ${device === 'mobile' ? 'pt-8 pb-10' : 'p-0'}`}>
                {/* Dynamically rendering generated AI Sections */}
                <div className="flex flex-col w-full min-h-full">
                  <AnimatePresence>
                    {homepage.sections.map((section: any, idx: number) => (
                      <motion.div
                        key={section.id || idx}
                        initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.1, type: 'spring', stiffness: 120, damping: 20 }}
                        className="bg-slate-900/80 backdrop-blur-xl border-y border-white/5 p-6 sm:p-8"
                        style={section.style || {}}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span className="px-2 py-1 bg-white/5 rounded-md text-[9px] font-bold text-primary-400 font-mono uppercase tracking-widest border border-white/5">
                            {section.type}
                          </span>
                        </div>
                        
                        {section.config?.title && <h3 className="text-2xl font-black text-white mb-2">{section.config.title}</h3>}
                        {section.config?.subtitle && <p className="text-slate-400 text-sm mb-4 font-medium">{section.config.subtitle}</p>}
                        {section.config?.headline && <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 tracking-tight leading-tight">{section.config.headline}</h2>}
                        
                        {/* Render Images if present */}
                        {section.config?.imageUrl && (
                           <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
                             <img src={section.config.imageUrl} alt="AI Generated" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                             <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] text-white flex items-center gap-1 font-mono uppercase border border-white/10">
                               <ImageIcon className="w-3 h-3" />
                               Generated Asset
                             </div>
                           </div>
                        )}

                        <div className="mt-6 border-t border-white/5 pt-4">
                          <h4 className="text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-wider flex items-center gap-1">
                            <Box className="w-3 h-3" /> Component Props
                          </h4>
                          <pre className="text-[10px] text-slate-300 overflow-x-auto bg-black/80 p-4 rounded-xl border border-white/5 shadow-inner leading-relaxed">
                            {JSON.stringify(section.config, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
