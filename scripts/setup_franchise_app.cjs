const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\Users\\RYZEN\\Downloads\\olive-pizza-franchise';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath, content) {
  const fullPath = path.join(targetDir, filePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
  console.log(`[Created] ${filePath}`);
}

console.log('Generating Olive Pizza Franchise Management Application...');

// 1. vite.config.ts
writeFile('vite.config.ts', `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    host: true
  }
});
`);

// 2. tsconfig.json
writeFile('tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`);

// 3. index.html
writeFile('index.html', `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Olive Pizza — Franchise Management</title>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#020617" />
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased select-none font-sans">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

// 4. public/manifest.json
writeFile('public/manifest.json', `
{
  "short_name": "Franchise POS",
  "name": "Olive Pizza Franchise Management",
  "icons": [
    {
      "src": "/favicon.svg",
      "type": "image/svg+xml",
      "sizes": "512x512"
    }
  ],
  "start_url": "/",
  "background_color": "#020617",
  "theme_color": "#F59E0B",
  "display": "standalone",
  "orientation": "portrait"
}
`);

// 5. capacitor.config.ts
writeFile('capacitor.config.ts', `
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.olivepizza.franchise',
  appName: 'Olive Pizza Franchise',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
`);

// 6. electron/main.cjs
writeFile('electron/main.cjs', `
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Olive Pizza — Franchise Management Terminal',
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5175');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`);

// 7. electron/preload.cjs
writeFile('electron/preload.cjs', `
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('desktopApp', { isElectron: true });
`);

// 8. src/index.css
writeFile('src/index.css', `
@import "tailwindcss";

@layer base {
  body {
    background-color: #020617;
    color: #f8fafc;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
}
`);

// 9. src/lib/firebase.ts
writeFile('src/lib/firebase.ts', `
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyFakeKeyForLocalDev1234567890",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "olive-pizza-prod.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "olive-pizza-prod",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "olive-pizza-prod.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef"
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
`);

// 10. src/lib/api.ts
writeFile('src/lib/api.ts', `
import { auth } from './firebase';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export async function fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await auth.currentUser?.getIdToken();
  const franchiseId = localStorage.getItem('franchise_id') || 'fra_primary';

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-franchise-id', franchiseId);
  
  if (token) {
    headers.set('Authorization', \`Bearer \${token}\`);
  }

  const url = endpoint.startsWith('http') ? endpoint : \`\${BACKEND_URL}\${endpoint.startsWith('/') ? '' : '/'}\${endpoint}\`;

  try {
    const res = await fetch(url, { ...options, headers });
    return await res.json();
  } catch (err: any) {
    console.warn('[Franchise API Notice]:', err.message);
    return { success: false, error: err.message };
  }
}
`);

// 11. src/types/franchise.ts
writeFile('src/types/franchise.ts', `
export interface POSTerminal {
  terminalId: string;
  terminalName: string;
  franchiseId: string;
  branchId: string;
  status: 'ACTIVE' | 'PENDING_ACTIVATION' | 'REVOKED';
  activationCode?: string;
  createdAt: string;
  lastActiveAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerName?: string;
  managerEmail?: string;
  activeOrdersCount: number;
  todaySales: number;
  isOpen: boolean;
}

export interface FranchiseSession {
  uid: string;
  email: string;
  franchiseId: string;
  franchiseName: string;
  role: 'franchise_owner' | 'franchise_manager';
  branchIds: string[];
}
`);

// 12. src/store/franchiseStore.ts
writeFile('src/store/franchiseStore.ts', `
import { create } from 'zustand';
import { FranchiseSession, POSTerminal, Branch } from '../types/franchise';

interface FranchiseState {
  session: FranchiseSession | null;
  setSession: (session: FranchiseSession | null) => void;
  branches: Branch[];
  setBranches: (branches: Branch[]) => void;
  terminals: POSTerminal[];
  setTerminals: (terminals: POSTerminal[]) => void;
}

export const useFranchiseStore = create<FranchiseState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  branches: [
    {
      id: 'main_branch',
      name: 'Olive Pizza — Rajnandgaon HQ',
      address: 'Dongargaon Rd, near Saraswati school, Rajnandgaon',
      phone: '+91 91799 44445',
      managerName: 'Sunil Verma',
      managerEmail: 'manager.rjn@olivepizza.in',
      activeOrdersCount: 4,
      todaySales: 28450,
      isOpen: true
    },
    {
      id: 'durg_branch',
      name: 'Olive Pizza — Durg Station Rd',
      address: 'Shop 12, Station Rd, Durg, CG',
      phone: '+91 91799 44446',
      managerName: 'Pooja Sharma',
      managerEmail: 'manager.durg@olivepizza.in',
      activeOrdersCount: 2,
      todaySales: 16900,
      isOpen: true
    }
  ],
  setBranches: (branches) => set({ branches }),
  terminals: [],
  setTerminals: (terminals) => set({ terminals })
}));
`);

// 13. Layout & Components
writeFile('src/components/layout/FranchiseLayout.tsx', `
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Store, 
  Monitor, 
  ShoppingBag, 
  Layers, 
  Bike, 
  FileText, 
  Settings, 
  LogOut,
  Building2
} from 'lucide-react';
import { useFranchiseStore } from '../../store/franchiseStore';

export const FranchiseLayout: React.FC = () => {
  const { session, setSession } = useFranchiseStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('franchise_id');
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-xl">
              🍕
            </div>
            <div>
              <h2 className="font-black text-sm text-white tracking-wide uppercase">OLIVE PIZZA</h2>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                FRANCHISE SUITE
              </span>
            </div>
          </div>

          {/* Franchise Context Card */}
          <div className="p-3 mx-3 my-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Building2 size={13} className="text-amber-400" />
              <span className="font-bold text-white truncate">{session?.franchiseName || 'Rajnandgaon Franchise'}</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{session?.franchiseId || 'fra_primary'}</p>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 text-xs font-bold">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <LayoutDashboard size={16} /> Dashboard
            </NavLink>

            <NavLink
              to="/branches"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <Store size={16} /> Branches & Stores
            </NavLink>

            <NavLink
              to="/pos-terminals"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <Monitor size={16} /> POS Terminals & Activation
            </NavLink>

            <NavLink
              to="/orders"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <ShoppingBag size={16} /> Franchise Orders
            </NavLink>

            <NavLink
              to="/menu-pricing"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <Layers size={16} /> Menu & Store Pricing
            </NavLink>

            <NavLink
              to="/delivery-zones"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <Bike size={16} /> Delivery Zones & Riders
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <FileText size={16} /> Reports & Google Sheets
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) =>
                \`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors \${
                  isActive ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }\`
              }
            >
              <Settings size={16} /> Franchise Settings
            </NavLink>
          </nav>
        </div>

        {/* Footer & User Card */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="truncate">
              <p className="font-bold text-white truncate">{session?.email || 'franchise@olivepizza.in'}</p>
              <span className="text-[10px] text-amber-400 font-mono">Franchise Manager</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
};
`);

// 14. Pages
// POSTerminalsPage.tsx
writeFile('src/pages/POSTerminalsPage.tsx', `
import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Plus, 
  QrCode, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Sparkles,
  Lock,
  Key,
  Calendar,
  Layers,
  X
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import { useFranchiseStore } from '../store/franchiseStore';
import { POSTerminal } from '../types/franchise';
import toast from 'react-hot-toast';

export const POSTerminalsPage: React.FC = () => {
  const { branches, terminals, setTerminals } = useFranchiseStore();
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || 'main_branch');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [terminalName, setTerminalName] = useState('');
  const [activeQrModal, setActiveQrModal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTerminals = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/pos/terminals');
      if (res.success && res.terminals) {
        setTerminals(res.terminals);
      }
    } catch {
      // Fallback mock initial terminals
      setTerminals([
        {
          terminalId: 'POS-MAIN-1041',
          terminalName: 'Counter 1 (Main Cashier)',
          franchiseId: 'fra_primary',
          branchId: 'main_branch',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        },
        {
          terminalId: 'POS-MAIN-1042',
          terminalName: 'Counter 2 (Takeaway Tablet)',
          franchiseId: 'fra_primary',
          branchId: 'main_branch',
          status: 'PENDING_ACTIVATION',
          activationCode: '782910',
          createdAt: new Date().toISOString(),
          lastActiveAt: null
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();
  }, []);

  const handleRegisterTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/api/pos/terminals/register', {
        method: 'POST',
        body: JSON.stringify({
          branchId: selectedBranch,
          terminalName: terminalName.trim() || undefined
        })
      });

      if (res.success) {
        toast.success('POS Terminal registered! 🚀');
        setIsRegisterOpen(false);
        setTerminalName('');
        setActiveQrModal(res);
        fetchTerminals();
      } else {
        toast.error(res.error || 'Failed to register terminal');
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleRevoke = async (terminalId: string) => {
    if (!confirm(\`Are you sure you want to deactivate and revoke \${terminalId}? The cashier won't be able to bill.\`)) return;

    try {
      const res = await fetchApi(\`/api/pos/terminals/\${terminalId}/revoke\`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Revoked by Franchise Manager' })
      });

      if (res.success) {
        toast.success(\`Terminal \${terminalId} deactivated!\`);
        fetchTerminals();
      } else {
        toast.error(res.error || 'Failed to revoke terminal');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke terminal');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="font-black text-2xl text-white tracking-tight flex items-center gap-2.5">
            <Monitor size={24} className="text-amber-400" />
            POS Terminals & Hardware Authorization
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Register and control authorized physical restaurant billing computers & tablets for your franchise.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
        >
          <Plus size={16} /> Register New POS Terminal
        </button>
      </div>

      {/* Terminals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {terminals.map((t) => {
          const isActive = t.status === 'ACTIVE';
          const isPending = t.status === 'PENDING_ACTIVATION';
          const isRevoked = t.status === 'REVOKED';

          return (
            <div
              key={t.terminalId}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{t.terminalName}</h3>
                    <p className="font-mono text-amber-400 text-xs font-bold mt-0.5">{t.terminalId}</p>
                  </div>

                  <span
                    className={\`text-[10px] font-black px-2 py-0.5 rounded-full border \${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isPending
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }\`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400 font-mono">
                  <p>Branch: <span className="text-slate-200">{t.branchId}</span></p>
                  {isPending && t.activationCode && (
                    <div className="mt-2 p-2 bg-slate-950 rounded-lg border border-amber-500/30 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Activation Code:</span>
                      <span className="font-black text-amber-400 text-sm tracking-widest">{t.activationCode}</span>
                    </div>
                  )}
                  {t.lastActiveAt && (
                    <p className="text-[10px] text-slate-500">
                      Last Active: {new Date(t.lastActiveAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                {isPending && t.activationCode && (
                  <button
                    onClick={() =>
                      setActiveQrModal({
                        terminal: t,
                        activationCode: t.activationCode,
                        qrPayload: JSON.stringify({
                          terminalId: t.terminalId,
                          activationCode: t.activationCode,
                          franchiseId: t.franchiseId,
                          branchId: t.branchId,
                          backendUrl: 'http://localhost:3000/api/pos'
                        })
                      })
                    }
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <QrCode size={13} /> View QR
                  </button>
                )}

                {!isRevoked ? (
                  <button
                    onClick={() => handleRevoke(t.terminalId)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Lock size={13} /> Deactivate
                  </button>
                ) : (
                  <span className="text-[10px] text-rose-500 font-bold">Access Revoked</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Terminal Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterTerminal}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">Register POS Terminal</h3>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="font-bold text-slate-300 text-xs block mb-1">Terminal Label / Name</label>
              <input
                type="text"
                placeholder="e.g. Counter 1 (Main Cashier)"
                value={terminalName}
                onChange={(e) => setTerminalName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 text-xs block mb-1">Assign to Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRegisterOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg"
              >
                Generate Activation Code
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR & Activation Code Modal */}
      {activeQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
              <Monitor size={24} />
            </div>

            <div>
              <h3 className="font-black text-white text-base">Terminal Activation Code</h3>
              <p className="text-xs text-slate-400 mt-1">Enter this 6-digit PIN on the POS machine at first launch.</p>
            </div>

            <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl space-y-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">6-Digit Activation PIN</span>
              <p className="font-mono font-black text-3xl text-amber-400 tracking-[0.25em]">
                {activeQrModal.activationCode}
              </p>
            </div>

            <div className="p-3 bg-white rounded-2xl inline-block border border-slate-200 shadow-lg">
              <img
                src={\`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=\${encodeURIComponent(
                  activeQrModal.qrPayload || ''
                )}\`}
                alt="POS Activation QR"
                className="w-36 h-36 object-contain"
              />
            </div>

            <button
              onClick={() => setActiveQrModal(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
`);

// DashboardPage.tsx
writeFile('src/pages/DashboardPage.tsx', `
import React from 'react';
import { 
  TrendingUp, 
  Store, 
  Monitor, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { useFranchiseStore } from '../store/franchiseStore';

export const DashboardPage: React.FC = () => {
  const { branches } = useFranchiseStore();
  const totalSales = branches.reduce((sum, b) => sum + b.todaySales, 0);
  const totalActiveOrders = branches.reduce((sum, b) => sum + b.activeOrdersCount, 0);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-black text-2xl text-white tracking-tight">Franchise Performance Dashboard</h1>
        <p className="text-xs text-slate-400 mt-1">Real-time overview across all operational stores in this franchise</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Today's Total Sales</span>
          <div className="font-mono font-black text-2xl text-amber-400">₹{totalSales.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-400 font-bold">+14.2% vs yesterday</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Active Kitchen Orders</span>
          <div className="font-mono font-black text-2xl text-white">{totalActiveOrders}</div>
          <span className="text-[10px] text-slate-400 font-mono">Across {branches.length} branches</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Authorized Stores</span>
          <div className="font-mono font-black text-2xl text-white">{branches.length}</div>
          <span className="text-[10px] text-emerald-400 font-bold">100% Operational</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Active POS Terminals</span>
          <div className="font-mono font-black text-2xl text-cyan-400">4</div>
          <span className="text-[10px] text-slate-400 font-mono">Syncing to Google Sheets</span>
        </div>
      </div>

      {/* Branch Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-sm">Stores Performance Breakdown</h3>
        <div className="divide-y divide-slate-800 text-xs">
          {branches.map(b => (
            <div key={b.id} className="py-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white">{b.name}</h4>
                <p className="text-[11px] text-slate-400">{b.address} • Mgr: {b.managerName}</p>
              </div>
              <div className="text-right font-mono">
                <p className="font-bold text-amber-400 text-sm">₹{b.todaySales.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-slate-500">{b.activeOrdersCount} live orders</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
`);

// BranchesPage.tsx, OrdersPage.tsx, MenuPricingPage.tsx, DeliveryManagementPage.tsx, ReportsPage.tsx, SettingsPage.tsx, LoginPage.tsx
writeFile('src/pages/BranchesPage.tsx', `
import React from 'react';
import { Store, Phone, User, CheckCircle2 } from 'lucide-react';
import { useFranchiseStore } from '../store/franchiseStore';

export const BranchesPage: React.FC = () => {
  const { branches } = useFranchiseStore();
  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-black text-2xl text-white">Branches & Restaurant Locations</h1>
        <p className="text-xs text-slate-400 mt-1">Manage physical restaurant locations and assigned store managers</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {branches.map(b => (
          <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-sm">{b.name}</h3>
                <p className="text-xs text-slate-400">{b.address}</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Open
              </span>
            </div>
            <div className="pt-3 border-t border-slate-800 text-xs space-y-1 text-slate-400 font-mono">
              <p>Manager: <span className="text-slate-200">{b.managerName} ({b.managerEmail})</span></p>
              <p>Phone: <span className="text-slate-200">{b.phone}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
`);

writeFile('src/pages/OrdersPage.tsx', `
import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const OrdersPage: React.FC = () => (
  <div className="p-8 space-y-6 max-w-6xl mx-auto">
    <h1 className="font-black text-2xl text-white">Franchise Live Orders</h1>
    <p className="text-xs text-slate-400">All dine-in, takeaway, and delivery orders across franchise branches.</p>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
      Real-time WebSocket connected to shared Olive Pizza backend.
    </div>
  </div>
);
`);

writeFile('src/pages/MenuPricingPage.tsx', `
import React from 'react';
import { Layers } from 'lucide-react';

export const MenuPricingPage: React.FC = () => (
  <div className="p-8 space-y-6 max-w-6xl mx-auto">
    <h1 className="font-black text-2xl text-white">Menu & Branch Pricing</h1>
    <p className="text-xs text-slate-400">Manage item stock availability and branch pricing overrides.</p>
  </div>
);
`);

writeFile('src/pages/DeliveryManagementPage.tsx', `
import React from 'react';
import { Bike } from 'lucide-react';

export const DeliveryManagementPage: React.FC = () => (
  <div className="p-8 space-y-6 max-w-6xl mx-auto">
    <h1 className="font-black text-2xl text-white">Delivery Fleet & Zones</h1>
    <p className="text-xs text-slate-400">Manage franchise delivery partners and 100m proximity constraints.</p>
  </div>
);
`);

writeFile('src/pages/ReportsPage.tsx', `
import React from 'react';
import { FileText } from 'lucide-react';

export const ReportsPage: React.FC = () => (
  <div className="p-8 space-y-6 max-w-6xl mx-auto">
    <h1 className="font-black text-2xl text-white">Reports & Google Sheets Sync</h1>
    <p className="text-xs text-slate-400">Monthly 22-column Google Sheets billing sync status and revenue reports.</p>
  </div>
);
`);

writeFile('src/pages/SettingsPage.tsx', `
import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsPage: React.FC = () => (
  <div className="p-8 space-y-6 max-w-6xl mx-auto">
    <h1 className="font-black text-2xl text-white">Franchise Settings</h1>
    <p className="text-xs text-slate-400">Operating hours, contact details, GST registration number.</p>
  </div>
);
`);

writeFile('src/pages/LoginPage.tsx', `
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFranchiseStore } from '../store/franchiseStore';
import { Building2, Key, Sparkles, User } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setSession = useFranchiseStore(s => s.setSession);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Enter email');
      return;
    }
    setSession({
      uid: 'fra_usr_01',
      email: email.trim(),
      franchiseId: 'fra_primary',
      franchiseName: 'Olive Pizza — Rajnandgaon Franchise',
      role: 'franchise_owner',
      branchIds: ['main_branch', 'durg_branch']
    });
    localStorage.setItem('franchise_id', 'fra_primary');
    toast.success('Welcome to Franchise Management! 🍕');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🍕
          </div>
          <h1 className="font-black text-2xl text-white uppercase tracking-wider">
            OLIVE PIZZA <span className="text-amber-400">FRANCHISE</span>
          </h1>
          <p className="text-xs text-slate-400">Franchise Owner & Manager Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1 flex items-center gap-1.5">
              <User size={13} className="text-amber-400" /> Franchise Account Email
            </label>
            <input
              type="email"
              required
              placeholder="franchise@olivepizza.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1 flex items-center gap-1.5">
              <Key size={13} className="text-amber-400" /> Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2 mt-2"
          >
            <Sparkles size={16} /> Sign In to Franchise Portal
          </button>
        </form>
      </div>
    </div>
  );
};
`);

// 15. src/App.tsx
writeFile('src/App.tsx', `
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useFranchiseStore } from './store/franchiseStore';
import { FranchiseLayout } from './components/layout/FranchiseLayout';
import { DashboardPage } from './pages/DashboardPage';
import { BranchesPage } from './pages/BranchesPage';
import { POSTerminalsPage } from './pages/POSTerminalsPage';
import { OrdersPage } from './pages/OrdersPage';
import { MenuPricingPage } from './pages/MenuPricingPage';
import { DeliveryManagementPage } from './pages/DeliveryManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  const { session, setSession } = useFranchiseStore();

  useEffect(() => {
    const storedFraId = localStorage.getItem('franchise_id');
    if (storedFraId && !session) {
      setSession({
        uid: 'fra_usr_01',
        email: 'franchise.rjn@olivepizza.in',
        franchiseId: storedFraId,
        franchiseName: 'Olive Pizza — Rajnandgaon Franchise',
        role: 'franchise_owner',
        branchIds: ['main_branch', 'durg_branch']
      });
    }
  }, [session, setSession]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0E1524',
            color: '#fff',
            border: '1px solid #1E293B',
            fontSize: '12px',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#F59E0B',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        
        <Route element={<FranchiseLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/pos-terminals" element={<POSTerminalsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/menu-pricing" element={<MenuPricingPage />} />
          <Route path="/delivery-zones" element={<DeliveryManagementPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
`);

// 16. src/main.tsx
writeFile('src/main.tsx', `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`);

console.log('✅ Olive Pizza Franchise App generated successfully.');
