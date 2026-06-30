import LegalPageLayout from '../../components/layout/LegalPageLayout';

export default function DeliveryPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc = [
    { id: "areas", label: "Delivery Areas & Radius" },
    { id: "charges", label: "Delivery Charges" },
    { id: "tracking", label: "Live Order Tracking" },
    { id: "times", label: "Estimated Delivery Time" },
    { id: "scheduled", label: "Scheduled Delivery" },
    { id: "no-contact", label: "No Contact Delivery" },
    { id: "proof", label: "Delivery Photo Proof" },
    { id: "failed", label: "Failed Delivery Attempts" },
    { id: "partners", label: "Partner Responsibilities" }
  ];

  return (
    <LegalPageLayout
      title="Shipping & Delivery Policy"
      description="Everything you need to know about how we deliver our artisan pizzas hot and fresh to your door."
      lastUpdated={lastUpdated}
      toc={toc}
      canonicalUrl="/delivery-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Delivery Policy", url: "/delivery-policy" }
      ]}
    >
      <h2 id="areas">1. Delivery Areas & Radius</h2>
      <p>
        We currently deliver within a set radius surrounding our restaurant locations. 
        When you enter your address during checkout or onboarding, our system will automatically verify if you fall within our active delivery zones. 
        If you are outside our radius, you may still place an order for Pickup.
      </p>

      <h2 id="charges">2. Delivery Charges</h2>
      <p>
        Delivery charges are calculated dynamically based on your exact distance from the restaurant and current demand. 
        The final delivery fee will always be displayed transparently at checkout before you confirm your payment.
      </p>

      <h2 id="tracking">3. Live Order Tracking</h2>
      <p>
        Once your order leaves our kitchen, you will have access to our Live GPS Order Tracking. 
        You can view your delivery partner's real-time location on a map directly from your customer dashboard. 
        Our advanced tracking ensures you know exactly when to expect your food.
      </p>

      <h2 id="times">4. Estimated Delivery Time</h2>
      <p>
        Our AI-powered system provides an estimated delivery time when you place your order. 
        This estimate accounts for current kitchen volume, preparation time, and live traffic conditions. 
        Please note that this is an estimate and not a guarantee; severe weather or unexpected road closures may cause delays.
      </p>

      <h2 id="scheduled">5. Scheduled Delivery</h2>
      <p>
        Planning a party? You can use our Scheduled Delivery feature to place an order days in advance. 
        Simply select your preferred delivery date and time window at checkout. Our kitchen will time the preparation so your pizza arrives hot exactly when you need it.
      </p>

      <h2 id="no-contact">6. No Contact Delivery</h2>
      <p>
        For your health and safety, we offer a "No Contact Delivery" option. 
        If selected, our delivery partner will leave your order at your doorstep, ring the bell, and step back to maintain a safe distance.
      </p>

      <h2 id="proof">7. Delivery Photo Proof</h2>
      <p>
        To ensure accountability, especially for No Contact deliveries, our delivery partners may take a photograph of the delivered package at your door. 
        These photos are securely uploaded to Cloudinary and attached to your order record in our database as proof of successful delivery.
      </p>

      <h2 id="failed">8. Failed Delivery Attempts</h2>
      <p>
        Our delivery partners will attempt to contact you via phone if they cannot find your address or if you do not answer the door. 
        If the partner waits for more than 10 minutes and you remain unreachable, the order will be marked as a Failed Delivery. 
        In such cases, the food will be discarded for food safety reasons, and you will not be eligible for a refund.
      </p>

      <h2 id="partners">9. Delivery Partner Responsibilities</h2>
      <p>
        Our delivery fleet consists of vetted professionals who use insulated bags to keep your food hot. 
        They are trained to handle your food with care and respect your property. 
        If you experience any unprofessional behavior, please report it immediately to our support team.
      </p>
    </LegalPageLayout>
  );
}
