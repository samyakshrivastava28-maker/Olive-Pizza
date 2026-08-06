import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { SDUISection } from '../../../types/sdui.types';

export const ContactSection: React.FC<{ section: SDUISection }> = ({ section }) => {
  return (
    <div className="w-full my-8 max-w-4xl mx-auto px-4">
      <div className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
        <h3 className="text-2xl font-black text-white mb-2">{section.label || 'Get In Touch'}</h3>
        {section.subtitle && <p className="text-sm text-slate-400 mb-6">{section.subtitle}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Call Us</p>
              <p className="text-sm font-bold text-white">+1 800-OLIVE-PIZZA</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Email Us</p>
              <p className="text-sm font-bold text-white">support@olivepizza.com</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400">Visit Store</p>
              <p className="text-sm font-bold text-white">123 Gourmet Way, Foodie City</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ContactSection;
