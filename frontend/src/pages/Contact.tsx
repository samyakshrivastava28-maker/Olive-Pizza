import LegalPageLayout from '../components/layout/LegalPageLayout';
import { Mail, Phone, MapPin, Clock, Facebook, Instagram, Twitter } from 'lucide-react';
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
            <a href="#" className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"><Facebook /></a>
            <a href="#" className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"><Instagram /></a>
            <a href="#" className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"><Twitter /></a>
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
