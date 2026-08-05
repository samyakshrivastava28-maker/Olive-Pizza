import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AgentStep } from '../../../../stores/sectionDesignerStore';

const StatusIcon: React.FC<{ status: AgentStep['status'] }> = ({ status }) => {
  switch (status) {
    case 'running': return <span className="text-blue-400 animate-pulse">🔵</span>;
    case 'done': return <span className="text-green-400">✅</span>;
    case 'failed': return <span className="text-red-400">❌</span>;
    case 'queued': return <span className="text-white/30">⏳</span>;
  }
};

interface AgentLogProps {
  steps: AgentStep[];
}

export const AgentLog: React.FC<AgentLogProps> = ({ steps }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="border-t border-white/10">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
      >
        <span className="uppercase tracking-wider">Agent Log</span>
        <div className="flex items-center gap-2">
          {steps.filter(s => s.status === 'running').length > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-medium">
              {steps.filter(s => s.status === 'running').length} running
            </span>
          )}
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 200, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="h-[200px] overflow-y-auto px-3 py-2 space-y-0.5">
              {steps.length === 0 && (
                <p className="text-xs text-white/30 italic py-4 text-center">Waiting for agent to start...</p>
              )}
              <AnimatePresence initial={false}>
                {steps.map((step) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-2 py-1 text-xs"
                  >
                    <StatusIcon status={step.status} />
                    <span className={`font-semibold shrink-0 ${
                      step.status === 'running' ? 'text-white' :
                      step.status === 'done' ? 'text-white/70' :
                      step.status === 'failed' ? 'text-red-400' : 'text-white/30'
                    }`}>
                      {step.model}
                    </span>
                    <span className="text-white/40 truncate">{step.task}</span>
                    {step.completedAt && (
                      <span className="ml-auto shrink-0 text-white/20">
                        {new Date(step.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
