import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { devPost } from '../../lib/devopsApi';
import { DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperSetupPage() {
  const [claimLoading, setClaimLoading] = useState(false);

  const handleInitClaim = async () => {
    setClaimLoading(true);
    try {
      const res = await devPost('/init-claim');
      if (res.success) {
        toast.success('Developer custom claim set for webhub2811@gmail.com! Please sign out and sign in to refresh claims.');
      } else {
        toast.error(res.error || 'Failed to initialize claim');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <DevErrorBoundary pageTitle="Developer Setup">
      <div className="space-y-6 max-w-2xl">
        <div className="pb-4 border-b border-white/10">
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Lock className="w-6 h-6 text-primary-400" />
            Developer Access & Claims Configuration
          </h1>
          <p className="text-slate-400 text-xs mt-1">Firebase custom claims management, RBAC enforcement policies, and lead developer credentials.</p>
        </div>

        {/* Claim Box */}
        <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-bold text-sm">Initialize Developer Custom Claim</h3>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Grants the <code className="text-primary-300 bg-primary-500/10 px-1 py-0.5 rounded font-mono">developer: true</code> Firebase Custom Claim to authorized administrative accounts (<strong>webhub2811@gmail.com</strong>).
          </p>
          <button
            onClick={handleInitClaim}
            disabled={claimLoading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs transition-all shadow-md disabled:opacity-60 cursor-pointer"
          >
            {claimLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {claimLoading ? 'Setting claim...' : 'Grant Developer Custom Claim'}
          </button>
        </div>

        {/* Security Info Card */}
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-amber-300 font-bold text-xs">Cryptographic Server-Side Guard</p>
            <p className="text-amber-200/70 text-xs leading-relaxed">
              All <code>/devops/*</code> endpoints verify Firebase ID tokens server-side via <code>requireDeveloper.ts</code>. Frontend guards are a secondary convenience layer.
            </p>
          </div>
        </div>
      </div>
    </DevErrorBoundary>
  );
}
