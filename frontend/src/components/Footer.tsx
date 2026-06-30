import { Link } from 'react-router';
import { Facebook, Instagram, Twitter, Youtube, Send, MapPin, Phone, Mail, Shield, CheckCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-10 text-slate-300 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Top Section: Newsletter & Branding */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-16 border-b border-slate-800/50">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-4 flex items-center gap-2">
              <span className="text-primary-500">Olive</span> Pizza
            </h3>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Artisan pizza delivered hot and fresh. Premium ingredients, unforgettable taste, and AI-powered delivery tracking.
            </p>
            <div className="flex gap-4 mt-6">
              <TrustBadge icon={<Shield className="w-4 h-4" />} text="Secure Checkout" />
              <TrustBadge icon={<CheckCircle className="w-4 h-4" />} text="GDPR Compliant" />
            </div>
          </div>

          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
            <h4 className="text-xl font-bold text-white mb-2">Subscribe to our Newsletter</h4>
            <p className="text-slate-400 text-sm mb-6">Get the latest offers, secret menu items, and news straight to your inbox.</p>
            <form className="flex gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 text-white"
              />
              <button 
                type="button" 
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Middle Section: Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 py-16 border-b border-slate-800/50">
          
          <div className="col-span-2 lg:col-span-1">
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide uppercase">Company</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link to="/about" className="hover:text-primary-400 transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-primary-400 transition-colors">Careers</Link></li>
              <li><Link to="/contact" className="hover:text-primary-400 transition-colors">Contact</Link></li>
              <li><Link to="/delete-account" className="hover:text-red-400 transition-colors">Data Deletion</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide uppercase">Legal</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link to="/privacy-policy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/refund-policy" className="hover:text-primary-400 transition-colors">Refund Policy</Link></li>
              <li><Link to="/delivery-policy" className="hover:text-primary-400 transition-colors">Delivery Policy</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-primary-400 transition-colors">Cookie Policy</Link></li>
              <li><Link to="/cancellation-policy" className="hover:text-primary-400 transition-colors">Cancellation Policy</Link></li>
              <li><Link to="/accessibility" className="hover:text-primary-400 transition-colors">Accessibility</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide uppercase">Customer</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link to="/faq" className="hover:text-primary-400 transition-colors">FAQ</Link></li>
              <li><Link to="/customer/dashboard" className="hover:text-primary-400 transition-colors">Order Tracking</Link></li>
              <li><Link to="/customer/rewards" className="hover:text-primary-400 transition-colors">Loyalty Rewards</Link></li>
              <li><Link to="/coupons" className="hover:text-primary-400 transition-colors">Coupons</Link></li>
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide uppercase">Restaurant</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                <span>Dongargaon Rd, Gokul Nagar,<br/>Rajnandgaon, CG 491441</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary-500 shrink-0" />
                <span>+91 123 456 7890</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-500 shrink-0" />
                <span>contact@olivepizza.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Social & Copyright */}
        <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-4">
            <SocialIcon icon={<Facebook className="w-5 h-5" />} href="#" label="Facebook" />
            <SocialIcon icon={<Instagram className="w-5 h-5" />} href="#" label="Instagram" />
            <SocialIcon icon={<Twitter className="w-5 h-5" />} href="#" label="Twitter" />
            <SocialIcon icon={<Youtube className="w-5 h-5" />} href="#" label="YouTube" />
          </div>
          
          <div className="text-center md:text-right text-sm text-slate-500 font-medium">
            <p>&copy; {new Date().getFullYear()} Olive Pizza. All rights reserved.</p>
            <p className="mt-1">Powered by AISEO & Next-Gen Delivery Systems.</p>
          </div>
        </div>

      </div>
    </footer>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-bold text-slate-300">
      <span className="text-emerald-500">{icon}</span>
      {text}
    </div>
  );
}

function SocialIcon({ icon, href, label }: { icon: React.ReactNode; href: string; label: string }) {
  return (
    <a 
      href={href} 
      aria-label={label}
      className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary-500 hover:border-primary-500 transition-all duration-300 hover:scale-110"
    >
      {icon}
    </a>
  );
}
