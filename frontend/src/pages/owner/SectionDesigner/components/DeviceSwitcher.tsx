// frontend/src/pages/owner/SectionDesigner/components/DeviceSwitcher.tsx
// Mobile / Tablet / Desktop preview frame switcher.

import React from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';

const DEVICES = [
  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
] as const;

interface Props {
  value: 'mobile' | 'tablet' | 'desktop';
  onChange: (v: 'mobile' | 'tablet' | 'desktop') => void;
}

export function DeviceSwitcher({ value, onChange }: Props) {
  return (
    <div className="sd-device-switcher" role="group" aria-label="Preview device">
      {DEVICES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          id={`sd-device-${id}`}
          className={`sd-device-btn ${value === id ? 'sd-device-active' : ''}`}
          onClick={() => onChange(id)}
          title={label}
          aria-pressed={value === id}
        >
          <Icon size={16} />
          <span className="sd-device-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
