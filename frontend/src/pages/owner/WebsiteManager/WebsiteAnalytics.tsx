import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Eye, MousePointerClick, Activity } from 'lucide-react';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const WebsiteAnalytics: React.FC = () => {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${BACKEND}/api/website-analytics/summary?days=7`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSummary(data.summary || []);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          SDUI Section Analytics
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Real-time metrics on customer section visibility, interaction rates, and CTR.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
        <h3 className="text-white font-bold text-sm">Performance by Section</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Impressions (Views)</th>
                <th className="py-3 px-4">Clicks</th>
                <th className="py-3 px-4">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {summary.length > 0 ? (
                summary.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-white font-sans font-medium">{row.section_id}</td>
                    <td className="py-3 px-4">{row.views}</td>
                    <td className="py-3 px-4">{row.clicks}</td>
                    <td className="py-3 px-4 text-primary-400">{row.ctr}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                    Ingesting live section impressions from active sessions...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default WebsiteAnalytics;
