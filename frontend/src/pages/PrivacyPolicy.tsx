import SEO from "../components/SEO";

export default function PrivacyPolicy() {
  return (
    <>
      <SEO 
        title="Privacy Policy"
        description="Read the privacy policy of Olive Pizza to understand how we collect, use, and protect your personal information."
        canonicalUrl="/privacy-policy"
      />
      <main className="min-h-screen pt-24 pb-16 px-6 max-w-4xl mx-auto text-slate-300 leading-relaxed">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-8">Privacy Policy</h1>
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p>At Olive Pizza, we collect information to provide better services to our users. This includes:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Information you provide us directly (e.g., name, phone number, delivery address).</li>
              <li>Information collected automatically (e.g., device information, IP address, location data).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect for various purposes, including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>To process and deliver your pizza orders.</li>
              <li>To send you transactional notifications (e.g., order tracking).</li>
              <li>To improve our website and customer experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share information with third-party delivery partners solely for the purpose of fulfilling your order.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at privacy@olivepizza.com.</p>
          </section>
          
          <p className="text-sm text-slate-500 pt-8">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </main>
    </>
  );
}
