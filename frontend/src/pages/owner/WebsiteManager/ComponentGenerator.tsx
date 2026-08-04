import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  Code2, Wand2, Play, CheckCircle2, Download, Copy, Eye,
  Sparkles, Loader2, ChevronDown, ChevronUp, FileCode2,
  Palette, Zap, Layout, RefreshCw, X, ExternalLink,
  GitBranch, Box, Star, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

// ─── Olive Pizza brand colors for UI ─────────────────────────────────────────
const BRAND = {
  primary: '#55775a',
  secondary: '#f97316',
  accent: '#f59e0b',
};

// ─── Section type definitions ─────────────────────────────────────────────────
const SECTION_TYPES = [
  { id: 'hero', label: 'Hero Banner', icon: '🌟', desc: 'Full-screen landing section' },
  { id: 'bestsellers', label: 'Best Sellers', icon: '🔥', desc: 'Product grid with add to cart' },
  { id: 'categories', label: 'Categories', icon: '🍕', desc: 'Menu category scroller' },
  { id: 'stats', label: 'Stats / Milestones', icon: '📊', desc: 'Animated counter cards' },
  { id: 'testimonials', label: 'Testimonials', icon: '⭐', desc: 'Review carousel' },
  { id: 'coupons', label: 'Offers & Coupons', icon: '🎁', desc: 'Promo code cards' },
  { id: 'faq', label: 'FAQ Accordion', icon: '❓', desc: 'Animated Q&A section' },
  { id: 'download_app', label: 'App Download', icon: '📱', desc: 'App store badges CTA' },
];

// ─── AI Agent step definitions ────────────────────────────────────────────────
const AGENT_STEPS = [
  { id: 'stitch', label: 'Google Stitch', icon: '🎨', desc: 'Fetching layout structure', color: BRAND.accent },
  { id: 'brand', label: 'Brand Enforcer', icon: '🎯', desc: 'Applying Olive Pizza tokens', color: BRAND.primary },
  { id: 'react', label: 'React Architect', icon: '⚛️', desc: 'Structuring components & hooks', color: '#61dafb' },
  { id: 'framer', label: 'Framer Weaver', icon: '🌊', desc: 'Wiring spring animations', color: BRAND.secondary },
  { id: 'a11y', label: 'Accessibility AI', icon: '♿', desc: 'Aria labels & semantics', color: '#4ade80' },
  { id: 'output', label: 'Code Synthesizer', icon: '🧬', desc: 'Generating final TSX', color: BRAND.accent },
];

// ─── Animated Agent Card ──────────────────────────────────────────────────────
const AgentCard: React.FC<{
  agent: typeof AGENT_STEPS[0];
  state: 'idle' | 'active' | 'done';
  index: number;
}> = ({ agent, state, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: index * 0.08 }}
      className="relative"
    >
      <motion.div
        animate={
          state === 'active'
            ? { boxShadow: [`0 0 0px ${agent.color}00`, `0 0 24px ${agent.color}60`, `0 0 0px ${agent.color}00`] }
            : state === 'done'
            ? { boxShadow: `0 0 16px ${agent.color}30` }
            : {}
        }
        transition={{ repeat: state === 'active' ? Infinity : 0, duration: 1.4 }}
        className={`p-3 rounded-2xl border transition-all duration-300 ${
          state === 'active'
            ? 'bg-slate-800/80 border-white/20'
            : state === 'done'
            ? 'bg-slate-900/80 border-white/10'
            : 'bg-slate-950/60 border-white/5 opacity-60'
        }`}
      >
        {/* Agent icon with animated bg */}
        <div className="relative mb-2">
          <motion.div
            animate={state === 'active' ? { rotate: [0, 10, -10, 0] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{
              background: state !== 'idle' ? `${agent.color}20` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${state !== 'idle' ? `${agent.color}40` : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {state === 'active' ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              >
                ⚙️
              </motion.span>
            ) : state === 'done' ? (
              '✅'
            ) : (
              agent.icon
            )}
          </motion.div>

          {/* Pulse ring for active state */}
          {state === 'active' && (
            <motion.div
              className="absolute inset-0 rounded-xl"
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ border: `1px solid ${agent.color}`, borderRadius: '12px' }}
            />
          )}
        </div>

        <div className="text-white font-bold text-xs">{agent.label}</div>
        <div className="text-slate-500 text-[10px] mt-0.5 leading-tight">{agent.desc}</div>

        {/* Status indicator */}
        {state === 'done' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="mt-2 flex items-center gap-1"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            <span className="text-primary-400 text-[10px] font-semibold">Done</span>
          </motion.div>
        )}
        {state === 'active' && (
          <div className="mt-2 flex items-center gap-1">
            <Loader2 className="w-2.5 h-2.5 text-white/60 animate-spin" />
            <span className="text-white/60 text-[10px]">Running...</span>
          </div>
        )}
      </motion.div>

      {/* Flow arrow */}
      {index < AGENT_STEPS.length - 1 && (
        <motion.div
          className="hidden sm:flex absolute -right-3 top-6 z-10 items-center"
          animate={state === 'done' ? { opacity: 1 } : { opacity: 0.2 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            animate={state === 'done' ? { x: [0, 4, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <ArrowRight className="w-4 h-4 text-slate-600" />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Code Preview Panel ───────────────────────────────────────────────────────
const CodePreview: React.FC<{ code: string; componentName: string }> = ({ code, componentName }) => {
  const [copied, setCopied] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('TSX code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentName}.tsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${componentName}.tsx`);
  };

  const preview = showFullCode ? code : code.slice(0, 800) + (code.length > 800 ? '\n...' : '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="rounded-2xl overflow-hidden border border-white/10"
    >
      {/* Code header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/90 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5">
          <FileCode2 className="w-3.5 h-3.5" />
          {componentName}.tsx
        </span>
        <div className="ml-auto flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-primary-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 text-xs font-bold border border-primary-500/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            .tsx
          </motion.button>
        </div>
      </div>

      {/* Code body */}
      <div className="bg-slate-950/90 relative">
        <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed max-h-[360px] overflow-y-auto">
          <code>
            {preview.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="select-none text-slate-600 w-8 shrink-0 text-right mr-4">{i + 1}</span>
                <span className={
                  line.trim().startsWith('//') || line.trim().startsWith('*') ? 'text-slate-500' :
                  line.includes('import') || line.includes('export') ? 'text-primary-300' :
                  line.includes('motion.') || line.includes('animate=') || line.includes('transition=') ? 'text-accent-300' :
                  line.includes('className=') ? 'text-secondary-300' :
                  'text-slate-300'
                }>{line}</span>
              </div>
            ))}
          </code>
        </pre>

        {code.length > 800 && (
          <div className="border-t border-white/5 p-3 text-center">
            <button
              onClick={() => setShowFullCode(!showFullCode)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mx-auto transition-colors"
            >
              {showFullCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showFullCode ? 'Collapse code' : `Show all ${code.split('\n').length} lines`}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Animation Tags ───────────────────────────────────────────────────────────
const AnimationTag: React.FC<{ label: string; index: number }> = ({ label, index }) => {
  const colors: Record<string, string> = {
    'spring-physics': 'bg-primary-500/20 border-primary-500/30 text-primary-300',
    'scroll-triggered': 'bg-accent-500/20 border-accent-500/30 text-accent-300',
    'hover': 'bg-secondary-500/20 border-secondary-500/30 text-secondary-300',
    'stagger': 'bg-primary-500/20 border-primary-500/30 text-primary-300',
    'exit-animations': 'bg-red-500/20 border-red-500/30 text-red-300',
    'tap-feedback': 'bg-secondary-500/20 border-secondary-500/30 text-secondary-300',
    'layout-animations': 'bg-accent-500/20 border-accent-500/30 text-accent-300',
    'scroll-parallax': 'bg-primary-500/20 border-primary-500/30 text-primary-300',
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, delay: index * 0.05 }}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ${colors[label] || 'bg-white/5 border-white/10 text-slate-400'}`}
    >
      <Zap className="w-2.5 h-2.5" /> {label}
    </motion.span>
  );
};

// ─── Main Component Generator Panel ──────────────────────────────────────────
export const ComponentGenerator: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>('hero');
  const [prompt, setPrompt] = useState('');
  const [stitchId, setStitchId] = useState('');
  const [activeAgentStep, setActiveAgentStep] = useState<number>(-1);
  const [agentStates, setAgentStates] = useState<('idle' | 'active' | 'done')[]>(
    new Array(AGENT_STEPS.length).fill('idle')
  );
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(true);

  // Full homepage generation state
  const [homepageMode, setHomepageMode] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(['hero', 'bestsellers', 'stats', 'testimonials']);
  const [homepageResult, setHomepageResult] = useState<any>(null);
  const [generatingHomepage, setGeneratingHomepage] = useState(false);

  const QUICK_PROMPTS = [
    'Dark luxury midnight restaurant with golden accents',
    'Festive Diwali theme with warm orange and gold tones',
    'Clean minimal white-label premium feel',
    'Bold street-food energy with vibrant energy',
  ];

  // Simulate agent step animation during generation
  const simulateAgentSteps = async () => {
    const states = new Array(AGENT_STEPS.length).fill('idle') as ('idle' | 'active' | 'done')[];
    setAgentStates([...states]);

    for (let i = 0; i < AGENT_STEPS.length; i++) {
      setActiveAgentStep(i);
      states[i] = 'active';
      setAgentStates([...states]);
      // Variable delay per step to feel natural
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      states[i] = 'done';
      setAgentStates([...states]);
    }
    setActiveAgentStep(-1);
  };

  const generateComponent = async () => {
    if (!prompt.trim()) {
      toast.error('Describe what you want the section to look like');
      return;
    }

    setGenerating(true);
    setResult(null);

    // Start agent animation in parallel with actual API call
    simulateAgentSteps();

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/design-studio/generate-component`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sectionType: selectedSection,
          prompt,
          stitchDesignId: stitchId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setResult(data);
      toast.success(`✅ ${data.componentName}.tsx generated!`);
    } catch (e: any) {
      toast.error(e.message);
      // Reset agent states on error
      setAgentStates(new Array(AGENT_STEPS.length).fill('idle'));
    } finally {
      setGenerating(false);
    }
  };

  const generateFullHomepage = async () => {
    if (!prompt.trim()) { toast.error('Enter a prompt first'); return; }
    setGeneratingHomepage(true);
    setHomepageResult(null);
    simulateAgentSteps();

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/design-studio/generate-homepage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt,
          sections: selectedSections,
          stitchDesignId: stitchId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Homepage generation failed');

      setHomepageResult(data);
      toast.success(`✅ Homepage with ${data.sections?.length} sections generated!`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGeneratingHomepage(false);
    }
  };

  const downloadHomepage = () => {
    if (!homepageResult?.pageCode) return;
    const blob = new Blob([homepageResult.pageCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AIGeneratedHomepage.tsx';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('AIGeneratedHomepage.tsx downloaded!');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-dark-900 via-primary-950/20 to-dark-950 border border-primary-500/20"
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 border border-white/20 flex items-center justify-center text-2xl shadow-xl"
          >
            ⚛️
          </motion.div>
          <div>
            <h2 className="text-xl font-extrabold text-white">React + Framer Motion Generator</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              AI generates real TSX components with spring animations, using Google Stitch layouts & Olive Pizza brand
            </p>
          </div>

          {/* Mode toggle */}
          <div className="ml-auto flex items-center gap-2 bg-slate-900/80 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setHomepageMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !homepageMode ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Section
            </button>
            <button
              onClick={() => setHomepageMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                homepageMode ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Homepage
            </button>
          </div>
        </div>
      </motion.div>

      {/* Section Type Selector (single section mode) */}
      {!homepageMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Select Section Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SECTION_TYPES.map((type, idx) => (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: idx * 0.04 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedSection(type.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedSection === type.id
                    ? 'bg-primary-500/20 border-primary-500/40 shadow-lg shadow-primary-500/10'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-xl mb-1">{type.icon}</div>
                <div className={`font-bold text-xs ${selectedSection === type.id ? 'text-white' : 'text-slate-300'}`}>
                  {type.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{type.desc}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Section Selector for Full Homepage */}
      {homepageMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Select Sections to Include
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SECTION_TYPES.map((type) => {
              const isSelected = selectedSections.includes(type.id);
              return (
                <motion.button
                  key={type.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSelectedSections(prev =>
                      isSelected ? prev.filter(s => s !== type.id) : [...prev, type.id]
                    );
                  }}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-primary-500/20 border-primary-500/40'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                  <div className="text-lg mb-1">{type.icon}</div>
                  <div className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {type.label}
                  </div>
                </motion.button>
              );
            })}
          </div>
          <p className="text-slate-500 text-xs">
            {selectedSections.length} sections selected — each gets a separate animated React component
          </p>
        </motion.div>
      )}

      {/* Prompt Input */}
      <div className="space-y-3">
        <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          Design Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Describe the visual style for your ${homepageMode ? 'homepage' : selectedSection} section...\ne.g. "Dark luxury restaurant with golden particle effects and floating pizza animations"`}
          rows={3}
          className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none transition-colors"
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary-500/10 border border-white/10 hover:border-primary-500/30 text-slate-400 hover:text-primary-300 text-xs transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Google Stitch ID (optional) */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={stitchId}
              onChange={(e) => setStitchId(e.target.value)}
              placeholder="Google Stitch Design ID (optional — uses layout as structural reference)"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 transition-colors"
            />
          </div>
          <div className="text-accent-400 text-xl shrink-0">🎨</div>
        </div>
      </div>

      {/* Generate Button */}
      <motion.button
        whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(85,119,90,0.3)' }}
        whileTap={{ scale: 0.98 }}
        onClick={homepageMode ? generateFullHomepage : generateComponent}
        disabled={generating || generatingHomepage || !prompt.trim()}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-accent-600 text-white font-extrabold text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-primary-500/20"
      >
        {(generating || generatingHomepage) ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Sparkles className="w-5 h-5" />
            </motion.div>
            Generating React + Framer Motion Code...
          </>
        ) : (
          <>
            <Code2 className="w-5 h-5" />
            {homepageMode
              ? `Generate Full Homepage (${selectedSections.length} sections)`
              : `Generate ${SECTION_TYPES.find(s => s.id === selectedSection)?.label} Component`}
          </>
        )}
      </motion.button>

      {/* AI Agent Pipeline Visualization */}
      <AnimatePresence>
        {(generating || generatingHomepage || agentStates.some(s => s !== 'idle')) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              >
                <Sparkles className="w-4 h-4 text-primary-400" />
              </motion.div>
              <span className="text-slate-300 text-xs font-semibold">AI Agent Pipeline Running</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {AGENT_STEPS.map((agent, idx) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  state={agentStates[idx]}
                  index={idx}
                />
              ))}
            </div>

            {/* Flowing progress bar */}
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500"
                animate={{
                  width: `${(agentStates.filter(s => s === 'done').length / AGENT_STEPS.length) * 100}%`,
                }}
                transition={{ type: 'spring', stiffness: 60, damping: 20 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Component Result */}
      <AnimatePresence>
        {result && !homepageMode && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="space-y-6"
          >
            {/* Result header */}
            <div className="p-5 rounded-2xl bg-primary-500/10 border border-primary-500/30 space-y-4">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-6 h-6 text-primary-400" />
                </motion.div>
                <div>
                  <div className="text-white font-bold text-sm">{result.componentName}.tsx</div>
                  <div className="text-slate-400 text-xs">{result.description}</div>
                </div>
              </div>

              {/* Animations used */}
              {result.animationsUsed?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-500 text-xs font-semibold">Framer Motion animations included:</span>
                  <div className="flex flex-wrap gap-2">
                    {result.animationsUsed.map((anim: string, i: number) => (
                      <AnimationTag key={anim} label={anim} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tab: HTML Preview / TSX Code */}
            <div className="flex gap-2 border-b border-white/10 pb-1">
              <button
                onClick={() => setShowHtmlPreview(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${
                  showHtmlPreview ? 'bg-primary-500/20 text-primary-300 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Visual Preview
              </button>
              <button
                onClick={() => setShowHtmlPreview(false)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${
                  !showHtmlPreview ? 'bg-primary-500/20 text-primary-300 border-b-2 border-primary-500' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" /> TSX Code
              </button>
            </div>

            {showHtmlPreview ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl overflow-hidden border border-white/10"
              >
                <div className="px-4 py-2 bg-slate-900/80 border-b border-white/5 text-xs text-slate-400 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" />
                  Structural Preview (final component will be fully animated)
                </div>
                <div
                  className="p-4 bg-slate-950/80"
                  dangerouslySetInnerHTML={{ __html: result.htmlPreview || '' }}
                />
              </motion.div>
            ) : (
              <CodePreview code={result.tsxCode || ''} componentName={result.componentName || 'Component'} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Homepage Result */}
      <AnimatePresence>
        {homepageResult && homepageMode && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="p-5 rounded-2xl bg-primary-500/10 border border-primary-500/30 space-y-3">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="text-3xl"
                >
                  🎉
                </motion.div>
                <div>
                  <div className="text-white font-bold">Full Homepage Generated!</div>
                  <div className="text-slate-400 text-xs">
                    {homepageResult.sections?.length} React components · {homepageResult.totalAnimations} Framer Motion animations
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={downloadHomepage}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </motion.button>
              </div>
            </div>

            {/* Section list with code */}
            {homepageResult.sections?.map((section: any, idx: number) => (
              <motion.div
                key={section.componentName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 100, delay: idx * 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                    <span className="text-primary-400 text-xs font-bold">{idx + 1}</span>
                  </div>
                  <span className="text-white font-bold text-sm">{section.componentName}.tsx</span>
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {section.animationsUsed?.map((anim: string, i: number) => (
                      <AnimationTag key={anim} label={anim} index={i} />
                    ))}
                  </div>
                </div>
                <CodePreview code={section.tsxCode || ''} componentName={section.componentName} />
              </motion.div>
            ))}

            {/* Main page file */}
            {homepageResult.pageCode && (
              <div className="space-y-2">
                <div className="text-slate-400 text-xs font-semibold uppercase">Main Page File</div>
                <CodePreview code={homepageResult.pageCode} componentName="AIGeneratedHomepage" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComponentGenerator;
