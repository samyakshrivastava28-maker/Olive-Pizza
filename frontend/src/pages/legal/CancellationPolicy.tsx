import LegalPageLayout from '../../components/layout/LegalPageLayout';

export default function CancellationPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc = [
    { id: "before-cooking", label: "Cancellation Before Cooking" },
    { id: "during-cooking", label: "Cancellation During Cooking" },
    { id: "out-for-delivery", label: "Out for Delivery" },
    { id: "scheduled-orders", label: "Scheduled Orders" },
    { id: "restaurant-cancellation", label: "Restaurant Cancellations" },
    { id: "customer-cancellation", label: "How to Cancel" }
  ];

  return (
    <LegalPageLayout
      title="Cancellation Policy"
      description="Our guidelines for cancelling orders, designed to balance customer flexibility with our commitment to fresh food preparation."
      lastUpdated={lastUpdated}
      toc={toc}
      canonicalUrl="/cancellation-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Cancellation Policy", url: "/cancellation-policy" }
      ]}
    >
      <h2 id="before-cooking">1. Cancellation Before Cooking</h2>
      <p>
        Because we prioritize speed, orders are sent to the kitchen almost immediately. However, there is a short grace period. 
        If you cancel your order while its status is "Pending" or before the kitchen officially accepts it and begins preparation, 
        you will receive a full 100% refund.
      </p>

      <h2 id="during-cooking">2. Cancellation During Cooking</h2>
      <p>
        Once our chefs begin preparing your pizza (status: "Cooking"), ingredients are consumed and the food is customized to your request. 
        At this stage, we cannot offer a full refund. Cancellations made during the cooking phase are generally not accepted, or may be subject to a 100% cancellation fee.
      </p>

      <h2 id="out-for-delivery">3. Out for Delivery</h2>
      <p>
        Orders that have left the restaurant and are "Out for Delivery" with our live GPS tracking active cannot be cancelled under any circumstances. 
        If you refuse the delivery at your door, you will still be charged the full amount for the order and the delivery fee.
      </p>

      <h2 id="scheduled-orders">4. Scheduled Orders</h2>
      <p>
        For orders scheduled in advance for a future date or time, you may cancel the order free of charge up to 2 hours before the scheduled preparation time. 
        Cancellations made within the 2-hour window are subject to the same rules as immediate orders.
      </p>

      <h2 id="restaurant-cancellation">5. Restaurant Cancellations</h2>
      <p>
        Olive Pizza reserves the right to cancel any order. This rarely happens, but may occur if:
      </p>
      <ul>
        <li>We run out of a specific ingredient necessary for your order.</li>
        <li>The delivery location is outside our safe delivery radius or inaccessible.</li>
        <li>We suspect fraudulent payment activity.</li>
        <li>Extreme weather conditions force us to suspend delivery operations.</li>
      </ul>
      <p>If we cancel your order, you will be notified immediately via Push Notification and Email, and a full refund will be processed to your original payment method.</p>

      <h2 id="customer-cancellation">6. How to Cancel</h2>
      <p>
        To cancel an order, navigate to your Customer Dashboard, select the active order from your Order History, and click the "Cancel Order" button if it is available. 
        If the button is disabled, the grace period has passed. For extreme emergencies, please call the restaurant directly using the phone number provided on the tracking page.
      </p>
    </LegalPageLayout>
  );
}
