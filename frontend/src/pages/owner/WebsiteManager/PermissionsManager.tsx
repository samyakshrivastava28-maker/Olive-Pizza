import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const PermissionsManager: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Roles & Permissions Matrix
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Control access levels between Owners, Store Managers, Content Editors, and Developers.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] border-b border-white/10">
            <tr>
              <th className="py-3 px-4">Capability</th>
              <th className="py-3 px-4">Developer</th>
              <th className="py-3 px-4">Owner / Admin</th>
              <th className="py-3 px-4">Staff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            <tr>
              <td className="py-3 px-4 text-white font-sans">Raw SDUI JSON Editing</td>
              <td className="py-3 px-4 text-emerald-400">Full Access</td>
              <td className="py-3 px-4 text-slate-500">Locked</td>
              <td className="py-3 px-4 text-slate-500">None</td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-white font-sans">Section Lock / Unlock</td>
              <td className="py-3 px-4 text-emerald-400">Full Access</td>
              <td className="py-3 px-4 text-slate-500">Locked</td>
              <td className="py-3 px-4 text-slate-500">None</td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-white font-sans">Visual Drag-and-Drop Canvas</td>
              <td className="py-3 px-4 text-emerald-400">Full Access</td>
              <td className="py-3 px-4 text-emerald-400">Full Access</td>
              <td className="py-3 px-4 text-slate-500">Read Only</td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-white font-sans">Theme & CSS Tokens</td>
              <td className="py-3 px-4 text-emerald-400">Full Access</td>
              <td className="py-3 px-4 text-emerald-400">Full Access</td>
              <td className="py-3 px-4 text-slate-500">Read Only</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default PermissionsManager;
