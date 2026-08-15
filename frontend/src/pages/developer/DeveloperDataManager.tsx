/**
 * DeveloperDataManager.tsx — Dedicated Developer Multi-Database & Storage Manager Page
 *
 * RESTRICTED TO: Authorized Developers (webhub2811@gmail.com)
 *
 * Provides real-time orchestration across all databases, object storage, and vector engines
 * with deep telemetry, role allocations, capacity overflow planning, and safe diagnostics.
 */

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Database, ArrowLeft, ShieldCheck, Terminal, Cpu, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import DataManagerHub from '../owner/DataManager/DataManagerHub';

class DataManagerErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <h3 className="text-white font-bold">Data Manager encountered an error while loading</h3>
          <p className="text-xs text-red-300 font-mono">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold"
          >
            Retry Loading
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DeveloperDataManager() {
  return (
    <div className="space-y-6">
      <DataManagerErrorBoundary>
        <Suspense fallback={
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading Data Manager Hub...</p>
          </div>
        }>
          <DataManagerHub />
        </Suspense>
      </DataManagerErrorBoundary>
    </div>
  );
}
