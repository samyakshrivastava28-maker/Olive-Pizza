import SEO from "../components/SEO";

export default function Terms() {
  return (
    <>
      <SEO 
        title="Terms of Service"
        description="Read the terms of service of Olive Pizza to understand the rules and guidelines for using our website and ordering platform."
        canonicalUrl="/terms"
      />
      <main className="min-h-screen pt-24 pb-16 px-6 max-w-4xl mx-auto text-slate-300 leading-relaxed">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-8">Terms of Service</h1>
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using the Olive Pizza website, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Ordering and Payment</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>All orders are subject to availability and acceptance.</li>
              <li>Prices are subject to change without notice.</li>
              <li>Payment must be made in full at the time of order unless cash on delivery is selected.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Refunds and Cancellations</h2>
            <p>Orders can only be cancelled before they enter the preparation stage. Refunds for cancelled orders will be processed within 5-7 business days depending on your payment method.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Intellectual Property</h2>
            <p>All content on this website, including logos, text, and images, is the property of Olive Pizza and protected by copyright laws.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
            <p>Olive Pizza shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our services.</p>
          </section>
          
          <p className="text-sm text-slate-500 pt-8">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </main>
    </>
  );
}
