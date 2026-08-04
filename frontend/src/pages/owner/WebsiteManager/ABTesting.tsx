import React, { useState, useEffect } from 'react';
import { Split, Plus, CheckCircle, TrendingUp } from 'lucide-react';
import { auth } from '../../../lib/firebase';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

export const ABTesting: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${BACKEND}/api/website-manager/ab-tests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTests(data.tests || []);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    fetchTests();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            A/B Testing Experiments
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Compare layout variants, banner copy, and color themes to optimize ordering conversion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.length > 0 ? (
          tests.map((test) => (
            <div key={test.id} className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{test.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase">
                  {test.status}
                </span>
              </div>
              <p className="text-slate-400 text-xs">{test.description}</p>
            </div>
          ))
        ) : (
          <div className="col-span-2 p-12 text-center text-slate-500 text-xs rounded-2xl bg-slate-900/40 border border-white/5">
            No active A/B tests. Click "Create Experiment" to start comparing layouts.
          </div>
        )}
      </div>
    </div>
  );
};
export default ABTesting;
