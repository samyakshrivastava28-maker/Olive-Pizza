import React from 'react';
import { Bot, Sparkles, Wand2 } from 'lucide-react';
import SectionDesigner from './SectionDesigner';

export const WebsiteManagerHub: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 flex flex-col">
      {/* Premium Header */}
      <div className="flex-none bg-slate-900/50 backdrop-blur-xl border-b border-white/5 p-4 sm:p-6 sm:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Section Designer
              <span className="flex items-center gap-1 text-[10px] px-3 py-1 rounded-full bg-gradient-to-r from-primary-500/20 to-orange-500/20 text-primary-400 font-bold border border-primary-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)] uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                AI Multimodal Engine
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
              <Bot className="w-4 h-4 text-slate-500" />
              Powered by DeepSeek V4 Pro orchestration and Google Stitch elements.
            </p>
          </div>
        </div>
      </div>

      {/* Main Designer Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <SectionDesigner />
      </div>
    </div>
  );
};
export default WebsiteManagerHub;
