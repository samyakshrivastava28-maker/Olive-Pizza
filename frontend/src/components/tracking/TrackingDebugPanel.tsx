import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Satellite, Database, Radio, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface DebugData {
  // GPS (from watchPosition)
  gpsLat?: number;
  gpsLng?: number;
  gpsHeading?: number;
  gpsSpeed?: number;
  gpsAccuracy?: number;
  gpsTimestamp?: number;

  // DB (last written to Supabase)
  dbLat?: number;
  dbLng?: number;
  dbLastUpdated?: string;

  // Received (from Realtime channel on customer side)
  rxLat?: number;
  rxLng?: number;
  rxTimestamp?: number;

  // Meta
  orderId?: string;
  partnerId?: string;
  realtimeStatus?: 'CONNECTING' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';
  supabaseConnected?: boolean;
  isPartnerOffline?: boolean;
  gpsWriteCount?: number;
  gpsErrorMsg?: string;
}

interface Props {
  data: DebugData;
  side?: 'delivery' | 'customer';
}

const STATUS_COLOR: Record<string, string> = {
  SUBSCRIBED: '#22c55e',
  CONNECTING: '#f59e0b',
  CHANNEL_ERROR: '#ef4444',
  TIMED_OUT: '#ef4444',
  CLOSED: '#6b7280',
};

function formatCoord(n?: number) {
  if (n === undefined || n === null) return '—';
  return n.toFixed(6);
}

function timeAgo(ts?: number | string) {
  if (!ts) return '—';
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const diff = Math.round((Date.now() - ms) / 1000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export default function TrackingDebugPanel({ data, side = 'delivery' }: Props) {
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [blinkWrite, setBlinkWrite] = useState(false);
  const prevWriteCount = useRef(data.gpsWriteCount || 0);

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Blink on GPS write
  useEffect(() => {
    if ((data.gpsWriteCount || 0) > prevWriteCount.current) {
      prevWriteCount.current = data.gpsWriteCount || 0;
      setBlinkWrite(true);
      const t = setTimeout(() => setBlinkWrite(false), 600);
      return () => clearTimeout(t);
    }
  }, [data.gpsWriteCount]);

  const statusColor = STATUS_COLOR[data.realtimeStatus || 'CLOSED'] || '#6b7280';

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        title="Open Debug Panel (Ctrl+Shift+D)"
        className="fixed bottom-24 right-4 z-[9999] w-10 h-10 rounded-full flex items-center justify-center shadow-2xl"
        style={{ background: data.supabaseConnected ? '#22c55e22' : '#ef444422', border: `2px solid ${data.supabaseConnected ? '#22c55e' : '#ef4444'}` }}
      >
        <Radio style={{ color: data.supabaseConnected ? '#22c55e' : '#ef4444' }} size={18} />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-24 right-4 z-[9999] w-80 rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(11,15,20,0.97)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Radio size={14} style={{ color: statusColor }} />
            <span className="text-xs font-black text-white uppercase tracking-widest">
              {side === 'delivery' ? 'GPS Debug' : 'Tracking Debug'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(m => !m)} className="text-slate-400 hover:text-white p-1">
              {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={() => setVisible(false)} className="text-slate-400 hover:text-white p-1">
              <X size={14} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!minimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 text-xs">

                {/* Supabase Connection */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Wifi size={10} />
                    Connection
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 space-y-2">
                    <Row label="Supabase">
                      <span style={{ color: data.supabaseConnected ? '#22c55e' : '#ef4444' }} className="font-bold">
                        {data.supabaseConnected ? '● CONNECTED' : '● DISCONNECTED'}
                      </span>
                    </Row>
                    <Row label="Realtime">
                      <span style={{ color: statusColor }} className="font-bold">
                        {data.realtimeStatus || 'CLOSED'}
                      </span>
                    </Row>
                    {data.isPartnerOffline && (
                      <Row label="Partner">
                        <span className="text-red-400 font-bold animate-pulse">{'⚠ OFFLINE (>30s)'}</span>
                      </Row>
                    )}
                  </div>
                </div>

                {/* GPS Section (delivery side only) */}
                {side === 'delivery' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Satellite size={10} />
                      GPS (watchPosition)
                    </div>
                    <div
                      className="rounded-xl p-3 space-y-2 transition-colors duration-300"
                      style={{ background: blinkWrite ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }}
                    >
                      <Row label="Lat">{formatCoord(data.gpsLat)}</Row>
                      <Row label="Lng">{formatCoord(data.gpsLng)}</Row>
                      <Row label="Heading">{data.gpsHeading !== undefined ? `${Math.round(data.gpsHeading)}°` : '—'}</Row>
                      <Row label="Speed">{data.gpsSpeed !== undefined ? `${(data.gpsSpeed * 3.6).toFixed(1)} km/h` : '—'}</Row>
                      <Row label="Accuracy">{data.gpsAccuracy !== undefined ? `±${Math.round(data.gpsAccuracy)}m` : '—'}</Row>
                      <Row label="Updated">{timeAgo(data.gpsTimestamp)}</Row>
                      <Row label="Writes">
                        <span style={{ color: blinkWrite ? '#22c55e' : '#94a3b8' }} className="font-mono font-bold">
                          {data.gpsWriteCount || 0}
                        </span>
                      </Row>
                      {data.gpsErrorMsg && (
                        <Row label="Error"><span className="text-red-400 break-all">{data.gpsErrorMsg}</span></Row>
                      )}
                    </div>
                  </div>
                )}

                {/* DB GPS */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Database size={10} />
                    Supabase DB
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 space-y-2">
                    <Row label="Lat">{formatCoord(data.dbLat)}</Row>
                    <Row label="Lng">{formatCoord(data.dbLng)}</Row>
                    <Row label="Updated">{timeAgo(data.dbLastUpdated)}</Row>
                  </div>
                </div>

                {/* Received (customer side) */}
                {side === 'customer' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Radio size={10} />
                      Received (Realtime)
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 space-y-2">
                      <Row label="Lat">{formatCoord(data.rxLat)}</Row>
                      <Row label="Lng">{formatCoord(data.rxLng)}</Row>
                      <Row label="Updated">{timeAgo(data.rxTimestamp)}</Row>
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="bg-white/5 rounded-xl p-3 space-y-2">
                  <Row label="Order ID">
                    <span className="font-mono text-[10px] text-primary-400">{data.orderId ? data.orderId.slice(-8).toUpperCase() : '—'}</span>
                  </Row>
                  <Row label="Partner ID">
                    <span className="font-mono text-[10px] text-slate-400">{data.partnerId ? data.partnerId.slice(0, 8) + '...' : '—'}</span>
                  </Row>
                </div>

                <p className="text-center text-[10px] text-slate-600 pt-1">Ctrl+Shift+D to toggle</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-white text-right font-mono">{children}</span>
    </div>
  );
}
