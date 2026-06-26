import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function SystemStatusPanel() {
  const [status, setStatus] = useState({
    firebase: 'checking',
    firestore: 'checking',
    cloudinary: 'checking',
    api: 'checking'
  });

  useEffect(() => {
    const checkStatus = async () => {
      // 1. Check API
      try {
        const res = await fetch('/api/health');
        setStatus(s => ({ ...s, api: res.ok ? 'operational' : 'degraded' }));
      } catch (e) {
        setStatus(s => ({ ...s, api: 'down' }));
      }

      // 2. Check Firestore
      try {
        await getDoc(doc(db, 'settings', 'global'));
        setStatus(s => ({ ...s, firestore: 'operational', firebase: 'operational' }));
      } catch (e) {
        setStatus(s => ({ ...s, firestore: 'down', firebase: 'degraded' }));
      }

      // 3. Check Cloudinary
      try {
        const res = await fetch('/api/media/test');
        if (res.ok) {
          const data = await res.json();
          setStatus(s => ({ ...s, cloudinary: data.cloudinaryConnected ? 'operational' : 'down' }));
        } else {
          setStatus(s => ({ ...s, cloudinary: 'degraded' }));
        }
      } catch (e) {
        setStatus(s => ({ ...s, cloudinary: 'down' }));
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const StatusIndicator = ({ label, state }: { label: string, state: string }) => {
    const colors: Record<string, string> = {
      checking: 'bg-slate-200 text-slate-500 animate-pulse',
      operational: 'bg-green-100 text-green-700',
      degraded: 'bg-yellow-100 text-yellow-700',
      down: 'bg-red-100 text-red-700'
    };
    
    return (
      <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{label}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${colors[state] || colors.checking}`}>
          {state}
        </span>
      </div>
    );
  };

  return (
    <div className="glass-card p-6 h-full">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
        <span>⚙️</span> System Status
      </h3>
      <div className="flex flex-col">
        <StatusIndicator label="Backend API" state={status.api} />
        <StatusIndicator label="Firebase Auth" state={status.firebase} />
        <StatusIndicator label="Firestore DB" state={status.firestore} />
        <StatusIndicator label="Cloudinary Media" state={status.cloudinary} />
        <div className="mt-4 text-xs text-slate-400 text-center">
          Auto-refreshes every 60s
        </div>
      </div>
    </div>
  );
}
