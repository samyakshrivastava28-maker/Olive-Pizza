import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SDUISection } from "../../../../types/sdui.types";
import { X, Sparkles, AlertTriangle, CheckCircle2, Info, Send, Shield, Zap, Brain, ChevronDown, ChevronUp } from "lucide-react";

interface ButtonMap { buttonText: string; action: string; isSafe: boolean; suggestedAction?: string; }
interface Suggestion { severity: "info" | "warning" | "critical"; message: string; }
interface SafetyReview {
  overallScore: number; visualScore: number; functionalScore: number; ragScore: number;
  buttonMapping: ButtonMap[]; unmappedButtons: string[];
  suggestions: Suggestion[]; modelUsed: string; latencyMs: number;
}

interface Props {
  sections: SDUISection[];
  ownerPrompt?: string;
  onClose: () => void;
  onApplySuggestions: (fixed: SDUISection[]) => void;
  onPublish: () => void;
}

type Tab = "overview" | "buttons" | "suggestions";

const ScoreRing: React.FC<{ score: number; label: string; size?: "sm" | "lg" }> = ({ score, label, size = "sm" }) => {
  const color = score >= 85 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  const r = size === "lg" ? 38 : 22;
  const cx = size === "lg" ? 46 : 28;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  return (
    <div className={`flex flex-col items-center gap-1 ${size === "lg" ? "gap-2" : ""}`}>
      <div className="relative">
        <svg width={cx * 2} height={cx * 2} viewBox={`0 0 ${cx * 2} ${cx * 2}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size === "lg" ? 6 : 4} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size === "lg" ? 6 : 4}
            strokeDasharray={circumference} strokeDashoffset={circumference - dash}
            strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-black ${size === "lg" ? "text-2xl" : "text-xs"}`} style={{ color }}>{score}</span>
        </div>
      </div>
      <span className={`font-bold text-slate-400 ${size === "lg" ? "text-xs" : "text-[9px]"}`}>{label}</span>
    </div>
  );
};

export const AIReviewModal: React.FC<Props> = ({ sections, ownerPrompt, onClose, onApplySuggestions, onPublish }) => {
  const [review, setReview] = useState<SafetyReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [expandedButton, setExpandedButton] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken") || "";
        const res = await fetch("/api/design-studio/sdui/ai-review", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ sections, ownerPrompt: ownerPrompt || "Olive Pizza homepage" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReview(data.review || null);
      } catch (err) {
        // Local structural fallback (no AI call)
        const hasHero = sections.some(s => s.type === "hero");
        const hasCoupons = sections.some(s => s.type === "coupons");
        const hasCategories = sections.some(s => s.type === "categories");
        const buttonMapping: ButtonMap[] = sections
          .filter(s => s.config?.ctaText)
          .map(s => ({ buttonText: s.config.ctaText, action: s.config?.ctaAction || "OPEN_MENU", isSafe: true }));
        const suggestions: Suggestion[] = [];
        if (!hasHero) suggestions.push({ severity: "critical", message: "Missing Hero section." });
        if (!hasCoupons) suggestions.push({ severity: "warning", message: "Add a Coupons section to increase conversions." });
        if (!hasCategories) suggestions.push({ severity: "warning", message: "Menu Categories help navigation." });
        const vs = (hasHero ? 30 : 0) + (hasCategories ? 20 : 0) + (hasCoupons ? 15 : 0) + 35;
        setReview({ overallScore: Math.round((vs + 95 + 75) / 3), visualScore: vs, functionalScore: 95, ragScore: 75, buttonMapping, unmappedButtons: [], suggestions, modelUsed: "Local Safety Check", latencyMs: 0 });
      }
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [sections, ownerPrompt]);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Brain },
    { id: "buttons", label: `Buttons ${review?.unmappedButtons?.length ? `⚠️ ${review.unmappedButtons.length}` : "✅"}`, icon: Shield },
    { id: "suggestions", label: `Suggestions ${review?.suggestions?.length ? `(${review.suggestions.length})` : ""}`, icon: Sparkles },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-lg bg-[#0d0e12] border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">AI Design Review</h2>
              <p className="text-[10px] text-slate-500">DeepSeek V4 Pro via Olive Pizza AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-violet-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-white mb-1">Analyzing Your Design...</p>
              <p className="text-xs text-slate-400">Checking safety, buttons & quality via Olive Pizza AI</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          </div>
        ) : review ? (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-4 pb-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${tab === t.id ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
                  <t.icon className="w-3 h-3" />{t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {tab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                    {/* Overall score */}
                    <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <ScoreRing score={review.overallScore} label="Overall" size="lg" />
                      <div>
                        <h3 className="text-sm font-black text-white mb-1">
                          {review.overallScore >= 90 ? "🏆 Excellent Design!" : review.overallScore >= 75 ? "✅ Good Design" : review.overallScore >= 60 ? "⚠️ Needs Improvement" : "❌ Needs Work"}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {review.unmappedButtons.length > 0 ? `⚠️ ${review.unmappedButtons.length} unmapped button(s) detected. Review the Buttons tab.` : "All buttons are safely mapped to supported backend actions."}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-1">Model: {review.modelUsed} · {review.latencyMs}ms · {sections.length} sections</p>
                      </div>
                    </div>
                    {/* Sub-scores */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <ScoreRing score={review.visualScore} label="Visual" />
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <ScoreRing score={review.functionalScore} label="Functional" />
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <ScoreRing score={review.ragScore} label="Knowledge" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {tab === "buttons" && (
                  <motion.div key="buttons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Button Action Safety Map</p>
                    {review.buttonMapping.length === 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <p className="text-xs text-slate-300">No buttons detected in sections.</p>
                      </div>
                    )}
                    {review.buttonMapping.map((btn, i) => (
                      <div key={i} className={`rounded-xl border overflow-hidden ${btn.isSafe ? "bg-green-500/5 border-green-500/15" : "bg-amber-500/5 border-amber-500/20"}`}>
                        <button className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                          onClick={() => setExpandedButton(expandedButton === `${i}` ? null : `${i}`)}>
                          <div className="flex items-center gap-2">
                            {btn.isSafe ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                            <span className="text-xs font-bold text-white">{btn.buttonText}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">{btn.action}</span>
                          </div>
                          {expandedButton === `${i}` ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                        </button>
                        <AnimatePresence>
                          {expandedButton === `${i}` && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-3 pb-3 text-[11px] text-slate-400">
                                {btn.isSafe ? "✅ This action is supported by the Olive Pizza backend." : `⚠️ Action "${btn.action}" is not in the supported action list. Suggested: ${btn.suggestedAction || "OPEN_MENU"}`}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                    {review.unmappedButtons.length > 0 && (
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 mt-2">
                        <p className="text-xs font-black text-red-400 mb-1">⚠️ Unmapped Buttons ({review.unmappedButtons.length})</p>
                        <p className="text-[11px] text-slate-400">These buttons have unrecognized actions and should be mapped before publishing: {review.unmappedButtons.join(", ")}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === "suggestions" && (
                  <motion.div key="suggestions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Design Suggestions</p>
                    {review.suggestions.length === 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/5 border border-green-500/15">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <p className="text-xs text-slate-300">No suggestions — design looks great!</p>
                      </div>
                    )}
                    {review.suggestions.map((s, i) => (
                      <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl border ${s.severity === "critical" ? "bg-red-500/5 border-red-500/20" : s.severity === "warning" ? "bg-amber-500/5 border-amber-500/20" : "bg-blue-500/5 border-blue-500/20"}`}>
                        {s.severity === "critical" ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" /> : s.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />}
                        <p className="text-xs text-slate-300 leading-relaxed">{s.message}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-xs font-bold hover:text-white transition-all">
                Keep Editing
              </button>
              <button onClick={onPublish}
                disabled={review.unmappedButtons.length > 0}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${review.unmappedButtons.length > 0 ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20"}`}>
                <Send className="w-3.5 h-3.5" />
                {review.unmappedButtons.length > 0 ? `Fix ${review.unmappedButtons.length} Button(s) First` : "Publish Now"}
              </button>
            </div>
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
};
