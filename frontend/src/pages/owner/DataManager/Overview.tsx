import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Database, Cloud, HardDrive, Layers, Mail, Bell, AlertTriangle } from 'lucide-react';
import { Doughnut, Line } from 'react-chartjs-2';
import 'chart.js/auto';

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function Overview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      const res = await fetch(`/api/data-manager/overview${force ? '?force=true' : ''}`);
      if (!res.ok) throw new Error('Failed to fetch data manager overview');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-16 h-16 border-4 border-[#6B8E23] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400">
        <AlertTriangle className="w-16 h-16 mb-4" />
        <h2 className="text-xl font-bold">Failed to load overview</h2>
        <p>{error}</p>
      </div>
    );
  }

  const providers = [
    { id: 'firestore', label: 'Firestore', value: data?.firestore?.totalUsedBytes || 0, color: '#FF7A00', icon: Database },
    { id: 'supabase', label: 'Supabase DB', value: data?.supabase?.totalUsedBytes || 0, color: '#6B8E23', icon: Database },
    { id: 'cloudinary', label: 'Cloudinary', value: data?.cloudinary?.totalUsedBytes || 0, color: '#FFC107', icon: Cloud },
    { id: 'drive', label: 'Google Drive', value: data?.drive?.totalUsedBytes || 0, color: '#4285F4', icon: HardDrive },
    { id: 'qdrant', label: 'Qdrant (AI)', value: data?.qdrant?.totalUsedBytes || 0, color: '#E91E63', icon: Layers },
    { id: 'email', label: 'Email Queue', value: data?.email?.totalUsedBytes || 0, color: '#9C27B0', icon: Mail },
    { id: 'notifications', label: 'Notifications', value: data?.notifications?.totalUsedBytes || 0, color: '#00BCD4', icon: Bell },
  ];

  const totalBytes = providers.reduce((sum, p) => sum + p.value, 0);

  const chartData = {
    labels: providers.map(p => p.label),
    datasets: [
      {
        data: providers.map(p => p.value),
        backgroundColor: providers.map(p => p.color),
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  const chartOptions = {
    cutout: '75%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => ` ${context.label}: ${formatBytes(context.raw)}`
        }
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Storage Overview
          </h1>
          <p className="text-gray-400 mt-2">Real-time consolidated cloud usage</p>
        </div>
        <button 
          onClick={() => fetchOverview(true)}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="lg:col-span-1 bg-[#161616]/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#6B8E23]/10 blur-[50px] rounded-full" />
          <h3 className="text-lg font-medium text-gray-300 mb-6">Total Distribution</h3>
          <div className="relative w-full aspect-square max-w-[250px] mx-auto">
            <Doughnut data={chartData} options={chartOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm text-gray-400">Total</span>
              <span className="text-2xl font-bold text-white">{formatBytes(totalBytes)}</span>
            </div>
          </div>
        </motion.div>

        {/* Provider Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {providers.map((provider, i) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
              className="bg-[#161616]/40 backdrop-blur-sm border border-white/5 rounded-2xl p-5 flex items-center space-x-4 cursor-pointer relative overflow-hidden group"
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${provider.color}20`, color: provider.color }}
              >
                <provider.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-gray-300 font-medium">{provider.label}</h4>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold tracking-tight">{formatBytes(provider.value)}</span>
                  <span className="text-xs text-gray-500 mb-1">
                    ({((provider.value / totalBytes) * 100 || 0).toFixed(1)}%)
                  </span>
                </div>
              </div>
              {/* Highlight bar */}
              <div 
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r transition-all duration-500 transform scale-x-0 group-hover:scale-x-100 origin-left"
                style={{ width: '100%', backgroundImage: `linear-gradient(to right, ${provider.color}00, ${provider.color})` }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
