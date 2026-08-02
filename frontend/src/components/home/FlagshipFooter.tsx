import React from "react";
import { Link } from "react-router";
import { MapPin, Phone, Mail, Clock, ShieldCheck, Heart, Sparkles } from "lucide-react";

export default function FlagshipFooter() {
  return (
    <footer className="relative bg-slate-950 border-t border-white/10 pt-16 pb-12 z-10 overflow-hidden text-slate-400">
      {/* Background ambient lighting */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-gradient-to-t from-primary-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-2xl">🍕</span>
              <span className="text-2xl font-black text-white tracking-tight">
                OLIVE <span className="text-primary-400">PIZZA</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              100% Pure Veg Gourmet Pizzeria. Hand-stretched sourdough crusts, organic ingredients, and wood-fired to perfection at 500°C.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {["FB", "IG", "TW", "YT"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-primary-500 hover:text-white flex items-center justify-center text-xs font-bold transition-all"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link to="/menu" className="hover:text-primary-400 transition-colors">Artisan Menu</Link></li>
              <li><Link to="/menu?category=combo" className="hover:text-primary-400 transition-colors">Special Combos</Link></li>
              <li><Link to="/assistant" className="hover:text-primary-400 transition-colors">AI Pizza Assistant</Link></li>
              <li><Link to="/customer/dashboard" className="hover:text-primary-400 transition-colors">Customer Dashboard</Link></li>
              <li><Link to="/tracking" className="hover:text-primary-400 transition-colors">Order Tracker</Link></li>
            </ul>
          </div>

          {/* Contact & Hours */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Opening Hours</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary-400" /> Mon - Sun: 11:00 AM - 11:00 PM</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary-400" /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary-400" /> support@olivepizza.app</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-400" /> Rajnandgaon, CG, India</li>
            </ul>
          </div>

          {/* Guarantee Badge */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Our Promise</h4>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" /> 100% Pure Veg Guarantee
              </div>
              <p className="text-slate-400">
                Dedicated veg kitchen facility. Zero cross-contamination guaranteed.
              </p>
            </div>
          </div>
        </div>

        {/* Copyright Footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} Olive Pizza. All rights reserved. Crafted with passion for fine dining.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-300">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
