import PageTransition from "../components/PageTransition";
import LocationMap, { OpenInMapsButton } from "../components/ui/LocationMap";
import { Phone, Mail, Clock, MapPin } from "lucide-react";

export default function Contact() {
  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-12 md:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
          Contact Us
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Have a question or want to place a large order? Reach out to us
          directly or visit our restaurant in Rajnandgaon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Contact Information */}
        <div className="space-y-8">
          <div className="bg-dark-900 border border-dark-800 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-6">Get In Touch</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary-500/20 p-3 rounded-full text-primary-500 shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Location</h3>
                  <p className="text-slate-400 mt-1">
                    Dongargaon Rd, near Saraswati School,
                    <br />
                    Gokul Nagar, Rajnandgaon,
                    <br />
                    Chhattisgarh 491441
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary-500/20 p-3 rounded-full text-primary-500 shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Phone</h3>
                  <p className="text-slate-400 mt-1">+91 123 456 7890</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary-500/20 p-3 rounded-full text-primary-500 shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Email</h3>
                  <p className="text-slate-400 mt-1">contact@olivepizza.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-primary-500/20 p-3 rounded-full text-primary-500 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Hours</h3>
                  <p className="text-slate-400 mt-1">
                    Open Daily: 12:00 PM - 12:00 AM
                  </p>
                </div>
              </div>
            </div>
          </div>

          <OpenInMapsButton className="w-full justify-center py-4 text-lg" />
        </div>

        {/* Map */}
        <div className="h-full min-h-[400px]">
          <LocationMap
            className="w-full h-full rounded-3xl shadow-2xl border-4 border-dark-800"
            showRadius={true}
          />
        </div>
      </div>
    </PageTransition>
  );
}
