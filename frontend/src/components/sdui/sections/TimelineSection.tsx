import React from 'react';
import { SDUISection } from '../../../types/sdui.types';

const defaultSteps = [
  { step: '01', title: 'Order Placed', desc: 'Select your favourite pizzas with custom toppings and place order.' },
  { step: '02', title: 'Fresh Preparation', desc: 'Our chef hand-crafts your pizza dough and bakes in wood-fired oven.' },
  { step: '03', title: 'Thermal Express Delivery', desc: 'Dispatched in insulating heated box with live 3D GPS map tracking.' },
  { step: '04', title: 'Hot & Fresh Arrival', desc: 'Delivered piping hot right to your doorstep within 30 minutes.' }
];

export const TimelineSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  const steps = section.config?.steps || defaultSteps;

  return (
    <div className="w-full my-10 max-w-5xl mx-auto px-4">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-black text-white tracking-tight">{section.label || 'How It Works'}</h3>
        {section.subtitle && <p className="text-xs text-slate-400 mt-1">{section.subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((item: any, i: number) => (
          <div key={i} className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md relative flex flex-col justify-between">
            <span className="text-3xl font-black text-primary-500/40 mb-3">{item.step || `0${i+1}`}</span>
            <div>
              <h4 className="text-base font-bold text-white mb-1">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default TimelineSection;
