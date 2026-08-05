import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

type Device = 'mobile' | 'tablet' | 'desktop';

const DEVICES: { key: Device; label: string; icon: React.ReactNode; width: string }[] = [
  { key: 'mobile', label: 'Mobile', icon: <Smartphone className="w-4 h-4" />, width: '375px' },
  { key: 'tablet', label: 'Tablet', icon: <Tablet className="w-4 h-4" />, width: '820px' },
  { key: 'desktop', label: 'Desktop', icon: <Monitor className="w-4 h-4" />, width: '100%' },
];

interface DeviceSwitcherProps {
  current: Device;
  onChange: (d: Device) => void;
}

export const DeviceSwitcher: React.FC<DeviceSwitcherProps> = ({ current, onChange }) => {
  return (
    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
      {DEVICES.map(d => (
        <motion.button
          key={d.key}
          onClick={() => onChange(d.key)}
          whileTap={{ scale: 0.95 }}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            current === d.key
              ? 'text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          {current === d.key && (
            <motion.div
              layoutId="device-indicator"
              className="absolute inset-0 bg-orange-500/20 border border-orange-500/40 rounded-lg"
            />
          )}
          <span className="relative">{d.icon}</span>
          <span className="relative hidden sm:block">{d.label}</span>
        </motion.button>
      ))}
    </div>
  );
};
