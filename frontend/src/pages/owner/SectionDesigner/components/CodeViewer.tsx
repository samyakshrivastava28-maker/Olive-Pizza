// frontend/src/pages/owner/SectionDesigner/components/CodeViewer.tsx
// Read-only JSON viewer of the generated SDUI section config.
// Includes copy-to-clipboard and download.

import React, { useState } from 'react';
import { Copy, Check, Download, FileJson } from 'lucide-react';
import { useSectionDesignerStore } from '../../../../stores/sectionDesignerStore';

export function CodeViewer() {
  const generatedFile = useSectionDesignerStore((s) => s.generatedFile);
  const previewJSON = useSectionDesignerStore((s) => s.previewJSON);
  const [copied, setCopied] = useState(false);

  const content = generatedFile?.content ?? (previewJSON ? JSON.stringify(previewJSON, null, 2) : null);

  const handleCopy = async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'section.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!content) {
    return (
      <div className="sd-code-empty">
        <FileJson size={48} style={{ opacity: 0.3 }} />
        <p>Generated SDUI JSON will appear here</p>
        <p className="sd-code-empty-note">Complete the design generation to see the output</p>
      </div>
    );
  }

  return (
    <div className="sd-code-viewer">
      <div className="sd-code-toolbar">
        <span className="sd-code-filename">
          <FileJson size={14} />
          section.json
        </span>
        <div className="sd-code-actions">
          <button
            id="sd-code-copy"
            className="sd-code-btn"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            id="sd-code-download"
            className="sd-code-btn"
            onClick={handleDownload}
            title="Download section.json"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>
      <pre className="sd-code-pre">
        <code>{content}</code>
      </pre>
    </div>
  );
}
