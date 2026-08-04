import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Bot, Wand2, Play, CheckCircle2, Clock, Zap, Image,
  FileText, BarChart3, MessageSquare, Loader2, ChevronDown, ChevronUp,
  Download, Eye, RefreshCw, TrendingUp, AlertCircle, Star, Package, Code2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../../lib/firebase';
import { useWebsiteConfigStore } from '../../../stores/websiteConfigStore';
import ComponentGenerator from './ComponentGenerator';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

// ─── AI Design Pipeline Panel ─────────────────────────────────────────────────
const DesignPipeline: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const EXAMPLE_PROMPTS = [
    'Make the homepage feel more festive for Diwali with warm gold tones',
    'Redesign to feel like a premium midnight lounge experience',
    'Add a new bestsellers showcase and move it above the offers section',
    'Create a summer special with bright festive sections',
  ];

  const runPipeline = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/design-studio/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate design');
      setResult(data);
      toast.success('AI Pipeline complete! Review below and approve to apply.');
    } catch (e: any) {
      toast.error(e.message || 'Design pipeline failed');
    } finally {
      setLoading(false);
    }
  };

  const applyLayout = async () => {
    if (!result?.mergedLayout) return;
    setApplying(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/design-studio/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mergedLayout: result.mergedLayout }),
      });
      if (!res.ok) throw new Error('Failed to apply layout');
      toast.success('AI layout applied to draft! Go to Homepage Builder to publish.');
      setResult(null);
      setPrompt('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  const PIPELINE_MODELS = [
    { id: 'glm', name: 'GLM 5.2', role: 'UI Reasoning', color: 'primary' },
    { id: 'deepseek_pro', name: 'DeepSeek V4 Pro', role: 'Architecture', color: 'secondary' },
    { id: 'deepseek_flash', name: 'DeepSeek Flash', role: 'Fast Layout', color: 'accent' },
    { id: 'kimi', name: 'Kimi 2.6', role: 'Creative UX', color: 'primary' },
    { id: 'qwen', name: 'Qwen 3', role: 'Components', color: 'secondary' },
    { id: 'gemma', name: 'Gemma 4', role: 'Accessibility', color: 'accent' },
    { id: 'gpt_oss', name: 'GPT OSS 120B', role: 'Final Merge', color: 'primary' },
  ];

  return (
    <div className="space-y-6">
      {/* Pipeline Diagram */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">AI Multi-Model Design Pipeline</h3>
            <p className="text-slate-400 text-xs">7 specialist AI models collaborate to generate your perfect layout</p>
          </div>
        </div>

        {/* Model Flow */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
          {PIPELINE_MODELS.map((model, idx) => (
            <React.Fragment key={model.id}>
              <div className="flex flex-col items-center gap-1 min-w-[80px]">
                <div className={`w-14 h-14 rounded-xl border flex items-center justify-center text-xs font-bold text-center shadow-lg ${
                  model.color === 'primary' ? 'bg-primary-500/20 border-primary-500/40 text-primary-300' :
                  model.color === 'secondary' ? 'bg-secondary-500/20 border-secondary-500/40 text-secondary-300' :
                  'bg-accent-500/20 border-accent-500/40 text-accent-300'
                }`}>
                  {model.name.split(' ')[0]}
                </div>
                <span className="text-[9px] text-slate-500 text-center leading-tight">{model.role}</span>
              </div>
              {idx < PIPELINE_MODELS.length - 1 && (
                <div className="text-slate-600 text-xl font-light">→</div>
              )}
            </React.Fragment>
          ))}
          <div className="text-slate-600 text-xl">→</div>
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 border border-white/20 flex items-center justify-center text-white text-xs font-bold shadow-lg">
              ✨
            </div>
            <span className="text-[9px] text-slate-400 text-center">Merged Layout</span>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision: 'Make the homepage feel like a premium midnight lounge with gold accents and bold typography...'"
            rows={3}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none transition-colors"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary-500/10 border border-white/10 hover:border-primary-500/30 text-slate-400 hover:text-primary-300 text-xs transition-all"
              >
                {p.slice(0, 40)}...
              </button>
            ))}
          </div>
          <button
            onClick={runPipeline}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running 7-Model Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Design with AI Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pipeline Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary */}
          <div className="p-6 rounded-2xl bg-primary-500/10 border border-primary-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary-400" />
              <h3 className="text-white font-bold text-sm">Pipeline Complete</h3>
              <span className="ml-auto text-xs text-slate-400">
                {result.totalLatencyMs ? `${(result.totalLatencyMs / 1000).toFixed(1)}s total` : ''}
              </span>
            </div>
            <p className="text-slate-300 text-sm">{result.explanation}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {result.pipelineResults?.filter((r: any) => r.success).length || 0}/{PIPELINE_MODELS.length} models succeeded
              </span>
            </div>
          </div>

          {/* Individual Model Results */}
          <div className="space-y-2">
            <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Model Contributions</h4>
            {result.pipelineResults?.map((model: any) => (
              <div key={model.modelId} className="rounded-xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setExpandedModel(expandedModel === model.modelId ? null : model.modelId)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-900/80 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full ${model.success ? 'bg-primary-400' : 'bg-red-400'}`} />
                  <span className="text-white font-semibold text-xs">{model.modelName}</span>
                  <span className="text-slate-500 text-xs">— {model.role}</span>
                  {model.latencyMs > 0 && (
                    <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{model.latencyMs}ms
                    </span>
                  )}
                  {expandedModel === model.modelId ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {expandedModel === model.modelId && (
                  <div className="p-4 bg-slate-950/50 border-t border-white/5">
                    <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                      {model.suggestion}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Approve & Apply */}
          <div className="flex gap-3">
            <button
              onClick={applyLayout}
              disabled={applying}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve & Apply to Draft
            </button>
            <button
              onClick={() => { setResult(null); setPrompt(''); }}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm border border-white/10 transition-colors"
            >
              Reject
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── AI Image Studio ──────────────────────────────────────────────────────────
const ImageStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux-schnell');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const IMAGE_MODELS = [
    { id: 'flux-schnell', name: 'FLUX.1-schnell', desc: 'Fastest, great quality' },
    { id: 'flux-dev', name: 'FLUX.1-dev', desc: 'High quality, slower' },
    { id: 'sd35', name: 'Stable Diffusion 3.5', desc: 'Artistic & creative' },
  ];

  const QUICK_PROMPTS = [
    'Delicious margherita pizza with fresh basil and melted cheese',
    'Premium paneer tikka pizza with Indian spices overhead shot',
    'Festive Diwali pizza promotion with diyas and golden lights',
    'Restaurant exterior night photography, warm glow, premium feel',
  ];

  const generateImages = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setImages([]);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/design-studio/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      setImages(data.images || []);
      toast.success('Images generated! Select one to approve and upload to Cloudinary.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const approveAndUpload = async (imgUrl: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      // Upload to Cloudinary via backend media endpoint
      const res = await fetch(`${BACKEND}/api/media/upload-from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: imgUrl, folder: 'ai_generated' }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Image uploaded to Cloudinary! You can now use it in your sections.');
        setSelectedImage(data.secure_url || imgUrl);
      } else {
        toast.error('Upload failed. Copy the URL manually for now.');
      }
    } catch {
      toast.error('Upload failed. Use the image URL directly.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center">
            <Image className="w-6 h-6 text-accent-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">AI Image Studio</h3>
            <p className="text-slate-400 text-xs">Generate stunning food & promotional images with AI</p>
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex gap-2 flex-wrap">
          {IMAGE_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                model === m.id
                  ? 'bg-accent-500/20 border-accent-500/40 text-accent-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
              }`}
            >
              <div>{m.name}</div>
              <div className="text-[10px] opacity-70">{m.desc}</div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image: 'A gourmet pizza with truffle oil and fresh herbs, overhead shot, dark marble surface...'"
            rows={3}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500 resize-none transition-colors"
          />
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setPrompt(p)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-accent-500/10 border border-white/10 hover:border-accent-500/30 text-slate-400 hover:text-accent-300 text-xs transition-all"
              >
                {p.slice(0, 35)}...
              </button>
            ))}
          </div>
          <button
            onClick={generateImages}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-600 to-secondary-600 hover:from-accent-500 hover:to-secondary-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            {loading ? 'Generating Images...' : 'Generate Images'}
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Generated Images — Select to Approve</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((url, idx) => (
              <div key={idx} className="rounded-2xl overflow-hidden border border-white/10 group relative">
                <img src={url} alt={`AI Generated ${idx + 1}`} className="w-full h-56 object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => approveAndUpload(url)}
                    className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Upload
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── AI Content Studio ────────────────────────────────────────────────────────
const ContentStudio: React.FC = () => {
  const [contentType, setContentType] = useState('product_description');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const CONTENT_TYPES = [
    { id: 'product_description', label: 'Product Description', icon: Package },
    { id: 'seo_meta', label: 'SEO Meta', icon: Star },
    { id: 'push_notification', label: 'Push Notification', icon: MessageSquare },
    { id: 'coupon_text', label: 'Coupon Text', icon: Zap },
    { id: 'email_subject', label: 'Email Subject', icon: FileText },
  ];

  const generate = async () => {
    if (!context.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/design-studio/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentType, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Content generation failed');
      setResult(data.content || '');
      toast.success('Content generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-secondary-500/20 border border-secondary-500/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-secondary-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">AI Content Studio</h3>
            <p className="text-slate-400 text-xs">Generate product descriptions, SEO, notifications, and more</p>
          </div>
        </div>

        {/* Type Selector */}
        <div className="flex gap-2 flex-wrap">
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  contentType === type.id
                    ? 'bg-secondary-500/20 border-secondary-500/40 text-secondary-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {type.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Describe what you want to generate. E.g., 'A spicy paneer pizza with jalapeños and our signature olive oil base, available in 3 sizes'"
            rows={3}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-secondary-500 resize-none transition-colors"
          />
          <button
            onClick={generate}
            disabled={loading || !context.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-secondary-600 to-accent-600 hover:from-secondary-500 hover:to-accent-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Generating...' : 'Generate Content'}
          </button>
        </div>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-primary-500/10 border border-primary-500/30 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-white font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-400" /> Generated Content
            </h4>
            <button
              onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!'); }}
              className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
            >
              Copy
            </button>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{result}</p>
        </motion.div>
      )}
    </div>
  );
};

// ─── AI Business Advisor ──────────────────────────────────────────────────────
const BusinessAdvisor: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string[]>([]);

  const fetchInsights = async () => {
    setLoading(true);
    setInsights([]);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BACKEND}/api/design-studio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setInsights(data.insights || []);
      toast.success('Business insights ready!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">AI Business Advisor</h3>
            <p className="text-slate-400 text-xs">AI analyzes your real order data and tells you how to grow</p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
          {loading ? 'Analyzing Last 7 Days...' : 'Analyze My Business'}
        </button>
      </div>

      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Your AI Insights</h4>
          {insights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-start gap-3 hover:border-primary-500/20 transition-colors"
            >
              <div className="w-7 h-7 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary-400 text-xs font-bold">{idx + 1}</span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ─── Main AI Design Studio Page ───────────────────────────────────────────────
const STUDIO_TABS = [
  { id: 'pipeline', label: 'Design Pipeline', icon: Sparkles, desc: '7 AI models' },
  { id: 'component_gen', label: 'React Generator', icon: Code2, desc: 'TSX + Framer Motion' },
  { id: 'images', label: 'Image Studio', icon: Image, desc: 'FLUX & SD3.5' },
  { id: 'content', label: 'Content Studio', icon: FileText, desc: 'Copy & SEO' },
  { id: 'advisor', label: 'Business Advisor', icon: TrendingUp, desc: 'AI insights' },
];

export const AIDesignStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState('pipeline');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-primary-950/40 border border-primary-500/20 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 border border-white/20 flex items-center justify-center shadow-xl">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">AI Design Studio</h2>
            <p className="text-slate-400 text-xs">Powered by GLM, DeepSeek, Kimi, Qwen, Gemma & GPT OSS</p>
          </div>
        </div>
      </div>

      {/* Studio Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl border flex flex-col items-start gap-2 transition-all text-left ${
                isActive
                  ? 'bg-primary-500/20 border-primary-500/40 shadow-lg shadow-primary-500/10'
                  : 'bg-slate-900/60 border-white/10 hover:border-white/20'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : 'text-slate-400'}`} />
              <div>
                <div className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-300'}`}>{tab.label}</div>
                <div className="text-[10px] text-slate-500">{tab.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'pipeline' && <DesignPipeline />}
          {activeTab === 'component_gen' && <ComponentGenerator />}
          {activeTab === 'images' && <ImageStudio />}
          {activeTab === 'content' && <ContentStudio />}
          {activeTab === 'advisor' && <BusinessAdvisor />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AIDesignStudio;
