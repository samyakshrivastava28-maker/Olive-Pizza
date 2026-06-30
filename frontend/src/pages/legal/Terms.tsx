import LegalPageLayout from '../../components/layout/LegalPageLayout';

export default function Terms() {
  const lastUpdated = "June 30, 2026";
  
  const toc = [
    { id: "acceptance", label: "Acceptance of Terms" },
    { id: "user-responsibilities", label: "User Responsibilities" },
    { id: "ordering-rules", label: "Ordering Rules" },
    { id: "pricing-payments", label: "Pricing & Payments" },
    { id: "delivery-rules", label: "Delivery Rules" },
    { id: "scheduled-orders", label: "Scheduled Orders" },
    { id: "cancellations", label: "Cancellation & Refunds" },
    { id: "loyalty", label: "Loyalty & Coupons" },
    { id: "ai-recommendations", label: "AI Recommendations" },
    { id: "intellectual-property", label: "Intellectual Property" },
    { id: "liability", label: "Limitation of Liability" },
    { id: "force-majeure", label: "Force Majeure" },
    { id: "governing-law", label: "Governing Law" },
    { id: "contact", label: "Contact Us" }
  ];

  return (
    <LegalPageLayout
      title="Terms & Conditions"
      description="The rules, guidelines, and terms that govern your use of the Olive Pizza platform."
      lastUpdated={lastUpdated}
      toc={toc}
      canonicalUrl="/terms"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Terms & Conditions", url: "/terms" }
      ]}
    >
      <h2 id="acceptance">1. Acceptance of Terms</h2>
      <p>
        By downloading, accessing, or using the Olive Pizza application and website, you agree to be bound by these Terms & Conditions. 
        If you do not agree to all the terms and conditions, you must not use our services.
      </p>

      <h2 id="user-responsibilities">2. User Responsibilities & Customer Conduct</h2>
      <p>As a user of our platform, you agree to:</p>
      <ul>
        <li>Provide accurate, current, and complete information during registration and checkout.</li>
        <li>Maintain the security and confidentiality of your account credentials.</li>
        <li>Treat our delivery partners and restaurant staff with respect. Abusive behavior will result in immediate account termination.</li>
        <li>Ensure someone is available to receive the delivery at the specified location and time.</li>
      </ul>

      <h2 id="ordering-rules">3. Ordering Rules</h2>
      <p>
        All orders are subject to acceptance and availability. Once an order is placed and accepted by our kitchen, it immediately enters the preparation phase. 
        We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion.
      </p>

      <h2 id="pricing-payments">4. Pricing & Payments</h2>
      <p>
        Prices for our products are subject to change without notice. We accept various forms of payment through our secure payment gateway. 
        By providing payment information, you represent and warrant that you have the legal right to use the payment method.
      </p>

      <h2 id="delivery-rules">5. Delivery Rules & Delays</h2>
      <p>
        We aim to provide fast and accurate delivery using our real-time GPS tracking. However, delivery times are estimates and may vary due to weather, traffic, or kitchen capacity. 
        Our delivery partners may request photo proof of delivery or use our no-contact delivery protocols.
      </p>

      <h2 id="scheduled-orders">6. Scheduled Orders</h2>
      <p>
        You may schedule orders for a future date or time. Scheduled orders can be modified or canceled up to 2 hours before the scheduled preparation time.
      </p>

      <h2 id="cancellations">7. Cancellation & Refund Policy</h2>
      <p>
        Because our products are made fresh to order, cancellations must be made before the order enters the cooking phase. 
        Please refer to our detailed <a href="/cancellation-policy">Cancellation Policy</a> and <a href="/refund-policy">Refund Policy</a> for more information.
      </p>

      <h2 id="loyalty">8. Coupons & Loyalty Rewards</h2>
      <p>
        We offer promotional coupons and a loyalty rewards program. Points and coupons hold no cash value and cannot be exchanged for currency. 
        We reserve the right to modify or terminate the rewards program or invalidate coupons at any time without notice if fraudulent activity is suspected.
      </p>

      <h2 id="ai-recommendations">9. AI Recommendations</h2>
      <p>
        Our platform utilizes Artificial Intelligence to suggest products and tailor the menu to your preferences. 
        While we strive for accuracy, these are algorithmic suggestions and we do not guarantee they will always perfectly match your dietary needs or preferences.
      </p>

      <h2 id="intellectual-property">10. Intellectual Property</h2>
      <p>
        All content included on the platform, such as text, graphics, logos, images, and software, is the property of Olive Pizza and protected by intellectual property laws. 
        You may not use, reproduce, or distribute our content without our explicit permission.
      </p>

      <h2 id="liability">11. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Olive Pizza shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
      </p>

      <h2 id="force-majeure">12. Force Majeure</h2>
      <p>
        We will not be liable for any failure or delay in performance of our obligations under these Terms caused by events outside our reasonable control, including but not limited to natural disasters, strikes, pandemic restrictions, or severe weather.
      </p>

      <h2 id="governing-law">13. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Olive Pizza primarily operates, without regard to its conflict of law provisions.
      </p>

      <h2 id="contact">14. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at legal@olivepizza.com.
      </p>
    </LegalPageLayout>
  );
}
