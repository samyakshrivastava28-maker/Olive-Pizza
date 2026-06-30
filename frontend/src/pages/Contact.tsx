import LegalPageLayout from '../components/layout/LegalPageLayout';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import LocationMap, { OpenInMapsButton } from '../components/ui/LocationMap';

export default function Contact() {
  return (
    <LegalPageLayout
      title="Contact Us"
      description="We'd love to hear from you! Reach out for support, catering, or general inquiries."
      lastUpdated="June 30, 2026"
      canonicalUrl="/contact"
      breadcrumbs={[{ name: "Home", url: "/" }, { name: "Contact", url: "/contact" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 not-prose">
        <div className="space-y-8">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><MapPin className="text-primary-500" /> Location</h3>
            <p className="text-slate-600 dark:text-slate-300">
              Dongargaon Rd, near Saraswati School,<br/>
              Gokul Nagar, Rajnandgaon,<br/>
              Chhattisgarh 491441
            </p>
            <div className="mt-4">
              <OpenInMapsButton className="w-full text-center py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Phone className="text-primary-500" /> Phone & Email</h3>
            <p className="text-slate-600 dark:text-slate-300 font-bold text-lg mb-2">+91 123 456 7890</p>
            <p className="text-slate-600 dark:text-slate-300">contact@olivepizza.com</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Clock className="text-primary-500" /> Business Hours</h3>
            <p className="text-slate-600 dark:text-slate-300">Open Daily: 12:00 PM - 12:00 AM</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Support Hours: 10:00 AM - 1:00 AM</p>
          </div>

          <div className="flex gap-4 mt-6">
            <a href="#" className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"><FacebookIcon className="w-5 h-5" /></a>
            <a href="#" className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"><InstagramIcon className="w-5 h-5" /></a>
            <a href="#" className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"><TwitterIcon className="w-5 h-5" /></a>
          </div>
        </div>

        <div className="space-y-8">
          <form className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Send a Message</h3>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Name</label>
              <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <input type="email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Message</label>
              <textarea rows={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500" placeholder="How can we help?" />
            </div>
            <button type="button" className="w-full bg-primary-500 text-white font-bold py-4 rounded-xl hover:bg-primary-600 transition-colors">
              Send Message
            </button>
          </form>
          
          <div className="h-64 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <LocationMap className="w-full h-full" showRadius={true} />
          </div>
        </div>
      </div>
    </LegalPageLayout>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
    </svg>
  );
}
