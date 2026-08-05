import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, FileJson, FileCode, AlertCircle, CheckCircle, Copy, Download } from 'lucide-react';
import { GeneratedFile } from '../../../../stores/sectionDesignerStore';

interface FileTreeProps {
  files: GeneratedFile[];
  selected: string | null;
  onSelect: (name: string) => void;
}

const FileIcon: React.FC<{ language: string; hasErrors: boolean }> = ({ language, hasErrors }) => {
  const base = language === 'json' ? <FileJson className="w-3.5 h-3.5 text-yellow-400" /> : <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  if (hasErrors) return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
  return base;
};

export const FileTree: React.FC<FileTreeProps> = ({ files, selected, onSelect }) => {
  if (files.length === 0) {
    return <p className="text-xs text-white/30 italic px-2">No files yet...</p>;
  }

  return (
    <div className="space-y-0.5">
      {files.map(f => (
        <motion.button
          key={f.name}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => onSelect(f.name)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
            selected === f.name ? 'bg-orange-500/15 text-orange-300' : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <FileIcon language={f.language} hasErrors={f.hasErrors} />
          <span className="text-xs font-mono truncate">{f.name}</span>
          {!f.hasErrors && <CheckCircle className="w-3 h-3 text-green-500 ml-auto shrink-0" />}
          {f.hasErrors && <AlertCircle className="w-3 h-3 text-red-400 ml-auto shrink-0" />}
        </motion.button>
      ))}
    </div>
  );
};

interface CodeViewerProps {
  files: GeneratedFile[];
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ files }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(files[0]?.name || null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const file = files.find(f => f.name === selectedFile);

  const handleCopy = () => {
    if (file) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (file) {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="border-t border-white/10">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
      >
        <span className="uppercase tracking-wider">Code Output</span>
        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 260, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex h-[260px]">
              {/* File tree */}
              <div className="w-44 shrink-0 border-r border-white/10 p-2 overflow-y-auto">
                <FileTree files={files} selected={selectedFile} onSelect={setSelectedFile} />
                {file?.hasErrors && (
                  <div className="mt-2 px-2 py-1.5 bg-red-900/30 rounded-lg">
                    {file.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-300">{e}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Code viewer */}
              <div className="flex-1 flex flex-col min-w-0">
                {file ? (
                  <>
                    <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-b border-white/10">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                    <pre className="flex-1 overflow-auto p-3 text-xs font-mono text-green-300 bg-black/20 leading-relaxed">
                      <code>{file.content}</code>
                    </pre>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-xs text-white/30">Select a file to view</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
