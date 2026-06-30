import SEO from "../components/SEO";

export default function DeliveryPolicy() {
  return (
    <>
      <SEO 
        title="Delivery Policy"
        description="Learn about Olive Pizza's delivery areas, times, and policies. Fast and hot pizza delivery to your door."
        canonicalUrl="/delivery-policy"
      />
      <main className="min-h-screen pt-24 pb-16 px-6 max-w-4xl mx-auto text-slate-300 leading-relaxed">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-8">Delivery Policy</h1>
        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Delivery Coverage Area</h2>
            <p>Olive Pizza proudly delivers to areas within a 5-mile radius of our store location. Delivery availability is subject to change based on weather conditions and driver availability.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Estimated Delivery Times</h2>
            <p>Our standard delivery time is 30-45 minutes. During peak hours (e.g., weekends, holidays), delivery times may extend to 60 minutes. You can track your order in real-time through our Order Tracking feature.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Delivery Fees</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Orders above $30 qualify for free delivery.</li>
              <li>A standard delivery fee of $3.99 applies to orders below $30.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Contactless Delivery</h2>
            <p>For your safety and ours, we offer contactless delivery. You can leave a note during checkout if you want the driver to leave the pizza at your door.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Order Accuracy and Damages</h2>
            <p>If your order arrives damaged or incorrect, please contact us immediately through the Customer Dashboard or by phone so we can make it right.</p>
          </section>
          
          <p className="text-sm text-slate-500 pt-8">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>
      </main>
    </>
  );
}
