import React from 'react';
import { Cpu } from 'lucide-react';
import AIDiagnosticsConsole from '../../components/developer/AIDiagnosticsConsole';
import { DevErrorBoundary } from '../../components/developer/DevUI';

export default function DeveloperAIPage() {
  return (
    <DevErrorBoundary pageTitle="AI Operations Console">
      <div className="space-y-6">
        <div className="pb-4 border-b border-white/10">
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-primary-400" />
            AI Operations & Diagnostics Console
          </h1>
          <p className="text-slate-400 text-xs mt-1">Multi-provider failover telemetry, vector search benchmarks, token usage, and live chat simulation playground.</p>
        </div>
        <AIDiagnosticsConsole />
      </div>
    </DevErrorBoundary>
  );
}
