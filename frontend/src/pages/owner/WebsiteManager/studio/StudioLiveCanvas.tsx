import React, { useState } from 'react';
import { SDUISection } from '../../../../types/sdui.types';
import HomepageRenderer from '../../../../components/sdui/HomepageRenderer';
import { useSDUIStore } from '../../../../stores/sduiStore';
import { Smartphone, Tablet, Monitor, Tv, Laptop, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  proposedSections: SDUISection[] | null;
  onSectionClick: (section: SDUISection) => void;
  selectedSectionId: string | null;
}

type DeviceMode = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'tv';

const DEVICE_CONFIG: Record<DeviceMode, { label: string; maxW: string; icon: any; height: string }> = {
  mobile:  { label: 'Mobile',  maxW: 'max-w-[390px]',  icon: Smartphone, height: 'min-h-[780px]' },
  tablet:  { label: 'Tablet',  maxW: 'max-w-[768px]',  icon: Tablet,     height: 'min-h-[700px]' },
  laptop:  { label: 'Laptop',  maxW: 'max-w-[1024px]', icon: Laptop,     height: 'min-h-[640px]' },
  desktop: { label: 'Desktop', maxW: 'w-full',          icon: Monitor,    height: 'min-h-[640px]' },
  tv:      { label: 'TV',      maxW: 'w-full',          icon: Tv,         height: 'min-h-[640px]' },
};

const DEVICES: DeviceMode[] = ['mobile', 'tablet', 'laptop', 'desktop'];

export const StudioLiveCanvas: React.FC<Props> = ({ proposedSections, onSectionClick, selectedSectionId }) => {
  const [device, setDevice] = useState<DeviceMode>('mobile');
  const [compareMode, setCompareMode] = useState(false);
  const publishedSections = useSDUIStore(s => s.homepage.sections);

  const config = DEVICE_CONFIG[device];
  const DeviceIcon = config.icon;

  const sectionsToRender = proposedSections || publishedSections;

  return (
    <div className="flex flex-col h-full bg-[#06070a] overflow-hidden">
      {/* Canvas control bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0a0b0e] flex-shrink-0">
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-950/80 border border-white/[0.06]">
          {DEVICES.map(d => {
            const { icon: Icon, label } = DEVICE_CONFIG[d];
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  device === d ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {proposedSections && (
            <button
              onClick={() => setCompareMode(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                compareMode
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'border-white/[0.08] text-slate-400 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Compare</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-white/[0.06]">
            {proposedSections ? `AI Draft · ${sectionsToRender.length} sections` : 'Live Site Preview'}
          </span>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto custom-scrollbar p-4 flex gap-4 justify-center">
        {compareMode && proposedSections ? (
          /* Split compare mode */
          <div className="flex gap-4 w-full">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 text-center">Current Live</div>
              <div className={`mx-auto ${config.maxW} bg-[#06070a] rounded-[24px] border-2 border-slate-700/60 overflow-hidden shadow-2xl ${config.height}`}>
                <div className="overflow-y-auto h-full custom-scrollbar">
                  <HomepageRenderer overrideSections={publishedSections} />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-primary-400 uppercase tracking-wider mb-2 text-center">AI Generated</div>
              <div className={`mx-auto ${config.maxW} bg-[#06070a] rounded-[24px] border-2 border-primary-500/50 overflow-hidden shadow-2xl shadow-primary-500/10 ${config.height}`}>
                <div className="overflow-y-auto h-full custom-scrollbar">
                  <HomepageRenderer overrideSections={proposedSections} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Single preview */
          <AnimatePresence mode="wait">
            <motion.div
              key={device}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className={`${config.maxW} w-full flex-shrink-0`}
            >
              {!proposedSections && (
                <div className="flex items-center justify-center py-20 text-center">
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mx-auto">
                      <RefreshCw className="w-7 h-7 text-primary-400 animate-spin" style={{ animationDuration: '4s' }} />
                    </div>
                    <h4 className="text-base font-black text-white">Canvas Ready</h4>
                    <p className="text-sm text-slate-400 max-w-xs">Generate a design using the prompt hub to see a live interactive preview here</p>
                  </div>
                </div>
              )}

              {proposedSections && (
                <div
                  className={`bg-[#06070a] rounded-[24px] border-2 border-primary-500/40 overflow-hidden shadow-2xl shadow-primary-500/10 ${config.height}`}
                  style={{ boxShadow: '0 0 60px rgba(249,115,22,0.08), 0 25px 50px rgba(0,0,0,0.6)' }}
                >
                  <div className="overflow-y-auto h-full custom-scrollbar">
                    <HomepageRenderer overrideSections={proposedSections} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
