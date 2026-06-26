import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Hash,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Bell,
  BellOff,
  ChevronDown,
  Megaphone,
  Wifi,
  WifiOff,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────
export interface SlackConfig {
  enabled: boolean;
  workspaceName: string;
  channelMappings: {
    orders: string;
    delivery: string;
    inventory: string;
    security: string;
    support: string;
    general: string;
  };
  notificationRules: {
    new_order: boolean;
    accepted: boolean;
    preparing: boolean;
    packed: boolean;
    partner_assigned: boolean;
    out_for_delivery: boolean;
    delivered: boolean;
    cancelled: boolean;
    payment_failed: boolean;
    delivery_problem: boolean;
    activity_log: boolean;
    system_test: boolean;
  };
}

const DEFAULT_CONFIG: SlackConfig = {
  enabled: false,
  workspaceName: "",
  channelMappings: {
    orders:    "#orders",
    delivery:  "#delivery",
    inventory: "#inventory",
    security:  "#security",
    support:   "#support",
    general:   "#general",
  },
  notificationRules: {
    new_order:        true,
    accepted:         true,
    preparing:        true,
    packed:           true,
    partner_assigned: true,
    out_for_delivery: true,
    delivered:        true,
    cancelled:        true,
    payment_failed:   true,
    delivery_problem: true,
    activity_log:     true,
    system_test:      true,
  },
};

// ── Notification rule labels ─────────────────────────────────────────────────
const RULE_LABELS: Record<string, { label: string; icon: string; group: string }> = {
  new_order:        { label: "New Order",                icon: "🍕", group: "Orders" },
  accepted:         { label: "Order Accepted",           icon: "✅", group: "Orders" },
  preparing:        { label: "Order Preparing",          icon: "🍳", group: "Orders" },
  packed:           { label: "Order Packed",             icon: "📦", group: "Orders" },
  cancelled:        { label: "Order Cancelled",          icon: "❌", group: "Orders" },
  payment_failed:   { label: "Payment Failed",           icon: "💳", group: "Orders" },
  partner_assigned: { label: "Partner Assigned",         icon: "🛵", group: "Delivery" },
  out_for_delivery: { label: "Out for Delivery",         icon: "🚀", group: "Delivery" },
  delivered:        { label: "Order Delivered",          icon: "🎉", group: "Delivery" },
  delivery_problem: { label: "Delivery Problem",         icon: "⚠️", group: "Delivery" },
  activity_log:     { label: "Security / Inventory",     icon: "🔒", group: "Alerts" },
  system_test:      { label: "System Test Messages",     icon: "🔧", group: "Alerts" },
};

const CHANNEL_LABELS: Record<keyof SlackConfig["channelMappings"], string> = {
  orders: "Orders", delivery: "Delivery", inventory: "Inventory",
  security: "Security", support: "Support", general: "General",
};

// ─────────────────────────────────────────────────────────────────────────────

export default function OwnerSlackCenter() {
  const [config, setConfig] = useState<SlackConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    checked: boolean; ok: boolean; workspace?: string; bot?: string; error?: string;
  }>({ checked: false, ok: false });
  const [announceText, setAnnounceText] = useState("");
  const [announceChannel, setAnnounceChannel] = useState<keyof SlackConfig["channelMappings"]>("general");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConfig();
    checkConnection();
  }, []);

  const loadConfig = async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "slack"));
      if (snap.exists()) {
        const data = snap.data() as SlackConfig;
        setConfig({
          ...DEFAULT_CONFIG,
          ...data,
          channelMappings: { ...DEFAULT_CONFIG.channelMappings, ...data.channelMappings },
          notificationRules: { ...DEFAULT_CONFIG.notificationRules, ...data.notificationRules },
        });
      }
    } catch {
      toast.error("Failed to load Slack settings");
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/slack/status");
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus({ checked: true, ...data });
      } else {
        setConnectionStatus({ checked: true, ok: false, error: "Backend unreachable" });
      }
    } catch {
      setConnectionStatus({ checked: true, ok: false, error: "Network error" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "slack"), config);
      toast.success("✅ Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/slack/test", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`✅ Test sent to Slack — ${data.workspace}`);
        await checkConnection();
      } else {
        toast.error(data.error || "Test failed");
      }
    } catch {
      toast.error("Network error during test");
    } finally {
      setTesting(false);
    }
  };

  const sendAnnouncement = async () => {
    if (!announceText.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/slack/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: announceText, channel: announceChannel }),
      });
      if (res.ok) {
        toast.success("📢 Announcement sent!");
        setAnnounceText("");
      } else {
        toast.error("Failed to send announcement");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  const toggleRule = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      notificationRules: {
        ...prev.notificationRules,
        [key]: !prev.notificationRules[key as keyof SlackConfig["notificationRules"]],
      },
    }));
  };

  const updateMapping = (key: keyof SlackConfig["channelMappings"], value: string) => {
    setConfig((prev) => ({
      ...prev,
      channelMappings: { ...prev.channelMappings, [key]: value },
    }));
  };

  // Group rules
  const ruleGroups = ["Orders", "Delivery", "Alerts"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const isConnected = connectionStatus.checked && connectionStatus.ok;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#4A154B] flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Slack Center</h1>
            </div>
            <p className="text-slate-400 font-medium">Manage real-time restaurant notifications via Slack</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={sendTest}
              disabled={testing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {testing ? "Sending…" : "Send Test"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">

            {/* Connection Status Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-black text-lg">Connection</h2>
                <button onClick={checkConnection} className="text-slate-400 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Live status indicator */}
              <motion.div
                key={String(isConnected)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-3 p-4 rounded-2xl mb-5 ${
                  isConnected
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                <div className={`relative w-3 h-3 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`}>
                  {isConnected && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-emerald-400"
                      animate={{ scale: [1, 2], opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>
                <div>
                  <p className={`font-black text-sm ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {isConnected
                      ? `@${connectionStatus.bot} · ${connectionStatus.workspace}`
                      : connectionStatus.error || "Check SLACK_BOT_TOKEN in .env"}
                  </p>
                </div>
              </motion.div>

              {/* Enable toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div>
                  <p className="text-white font-bold text-sm">Enable Notifications</p>
                  <p className="text-slate-400 text-xs mt-0.5">Master switch for all Slack alerts</p>
                </div>
                <button
                  onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    config.enabled ? "bg-indigo-500" : "bg-white/10"
                  }`}
                >
                  <motion.div
                    layout
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ left: config.enabled ? "calc(100% - 22px)" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>

            {/* Channel Mapping Card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-white font-black text-lg mb-5 flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-400" /> Channel Routing
              </h2>
              <div className="space-y-3">
                {(Object.keys(config.channelMappings) as Array<keyof SlackConfig["channelMappings"]>).map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm font-bold w-20 shrink-0 capitalize">
                      {CHANNEL_LABELS[key]}
                    </span>
                    <input
                      type="text"
                      value={config.channelMappings[key]}
                      onChange={(e) => updateMapping(key, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Right Column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Notification Rules */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-white font-black text-lg mb-6 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" /> Notification Rules
              </h2>

              <div className="space-y-6">
                {ruleGroups.map((group) => {
                  const groupRules = Object.entries(RULE_LABELS).filter(([, v]) => v.group === group);
                  return (
                    <div key={group}>
                      <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-3">{group}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groupRules.map(([key, { label, icon }]) => {
                          const enabled = config.notificationRules[key as keyof SlackConfig["notificationRules"]];
                          return (
                            <motion.button
                              key={key}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => toggleRule(key)}
                              className={`flex items-center justify-between p-3 rounded-2xl border transition-colors text-left ${
                                enabled
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                                  : "bg-white/3 border-white/5 text-slate-500 hover:border-white/10"
                              }`}
                            >
                              <span className="flex items-center gap-2 text-sm font-bold">
                                <span>{icon}</span>
                                <span>{label}</span>
                              </span>
                              {enabled ? (
                                <Bell className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              ) : (
                                <BellOff className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manual Announcement */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-white font-black text-lg mb-5 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-400" /> Send Announcement
              </h2>
              <div className="space-y-3">
                <textarea
                  placeholder="Type your announcement message here…"
                  value={announceText}
                  onChange={(e) => setAnnounceText(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-500 font-medium text-sm resize-none focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-colors"
                />
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <select
                      value={announceChannel}
                      onChange={(e) => setAnnounceChannel(e.target.value as keyof SlackConfig["channelMappings"])}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold appearance-none focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      {(Object.keys(config.channelMappings) as Array<keyof SlackConfig["channelMappings"]>).map((k) => (
                        <option key={k} value={k} className="bg-slate-900">
                          {config.channelMappings[k]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={sendAnnouncement}
                    disabled={sending || !announceText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500/80 hover:bg-orange-500 text-white font-bold transition-all active:scale-95 disabled:opacity-40"
                  >
                    <Megaphone className="w-4 h-4" />
                    {sending ? "Sending…" : "Announce"}
                  </button>
                </div>
              </div>
            </div>

            {/* Env Setup Info */}
            <div className="bg-slate-950/80 border border-white/5 rounded-3xl p-6">
              <h3 className="text-slate-300 font-black mb-3">Backend Environment Setup</h3>
              <p className="text-slate-500 text-sm mb-4">
                Add these to your <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">.env</code> file.
                Tokens are never exposed to the browser.
              </p>
              <div className="bg-black/40 rounded-2xl p-4 font-mono text-xs space-y-1.5">
                <p><span className="text-slate-500"># Required</span></p>
                <p><span className="text-emerald-400">SLACK_BOT_TOKEN</span><span className="text-slate-400">=xoxb-your-bot-token</span></p>
                <p><span className="text-slate-500"># Optional (enables request signature verification)</span></p>
                <p><span className="text-emerald-400">SLACK_SIGNING_SECRET</span><span className="text-slate-400">=your-signing-secret</span></p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
