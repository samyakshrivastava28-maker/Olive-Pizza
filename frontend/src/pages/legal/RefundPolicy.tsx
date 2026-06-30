import LegalPageLayout from '../../components/layout/LegalPageLayout';

export default function RefundPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc = [
    { id: "eligible", label: "Eligible Refunds" },
    { id: "non-refundable", label: "Non-refundable Orders" },
    { id: "cancel-before", label: "Cancel Before Preparation" },
    { id: "cancel-during", label: "Cancel During Preparation" },
    { id: "delivered", label: "Delivered Orders" },
    { id: "wrong-missing", label: "Wrong or Missing Items" },
    { id: "damaged", label: "Damaged Food" },
    { id: "delays", label: "Delivery Delays" },
    { id: "payments", label: "Payment Issues" },
    { id: "contact", label: "Contact Support" }
  ];

  return (
    <LegalPageLayout
      title="Refund Policy"
      description="Clear, fair, and transparent guidelines on when and how we issue refunds for your orders."
      lastUpdated={lastUpdated}
      toc={toc}
      canonicalUrl="/refund-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Refund Policy", url: "/refund-policy" }
      ]}
    >
      <h2 id="eligible">1. Eligible Refunds</h2>
      <p>We take pride in our artisan pizza and want you to be completely satisfied. You may be eligible for a full or partial refund if:</p>
      <ul>
        <li>You received the wrong order.</li>
        <li>Items are missing from your order.</li>
        <li>The food arrived damaged or in unacceptable condition.</li>
        <li>Your order was successfully cancelled before preparation began.</li>
      </ul>

      <h2 id="non-refundable">2. Non-refundable Orders</h2>
      <p>Refunds will not be issued in the following circumstances:</p>
      <ul>
        <li>You entered the wrong delivery address.</li>
        <li>You were unreachable when the delivery partner arrived at the correct address.</li>
        <li>You changed your mind after the food was prepared or delivered.</li>
        <li>You did not report the issue within 24 hours of receiving the order.</li>
      </ul>

      <h2 id="cancel-before">3. Cancel Before Preparation</h2>
      <p>
        If you cancel your order within the grace period (before our kitchen starts cooking), you will receive a 100% refund. 
        You can cancel directly from the live order tracking page in your dashboard.
      </p>

      <h2 id="cancel-during">4. Cancel During Preparation</h2>
      <p>
        Once the kitchen has started preparing your order (status: "Cooking"), the ingredients have been used and the order cannot be fully refunded. 
        Cancellations at this stage may incur a 100% charge, or a partial refund at the sole discretion of the restaurant manager.
      </p>

      <h2 id="delivered">5. Delivered Orders</h2>
      <p>
        If your order has been marked as delivered by our partner (often accompanied by photo proof), it cannot be cancelled. 
        If there is a quality issue, please contact support immediately with photographic evidence.
      </p>

      <h2 id="wrong-missing">6. Wrong or Missing Items</h2>
      <p>
        If an item is missing or you received the wrong item, contact us immediately. 
        We will either send the missing/correct item as a priority delivery or issue a partial refund for the specific item to your original payment method.
      </p>

      <h2 id="damaged">7. Damaged Food</h2>
      <p>
        If your pizza arrives crushed or damaged due to mishandling, please take a photo and contact support. 
        We will issue a full replacement or refund.
      </p>

      <h2 id="delays">8. Delivery Delays</h2>
      <p>
        While we strive for fast delivery, extreme weather or traffic can cause delays. 
        Refunds are generally not issued for minor delays, but if an order is exceptionally late (over 90 minutes past the estimated time), please contact us for compensation or a refund.
      </p>

      <h2 id="payments">9. Duplicate & Failed Payments</h2>
      <p>
        If your card was charged multiple times for a single order due to a technical glitch, the duplicate charges will be automatically refunded within 3-5 business days. 
        If a payment fails but money is deducted from your bank, the bank usually reverses the transaction automatically within 7 business days.
      </p>

      <h2 id="contact">10. Contact Support</h2>
      <p>
        To request a refund, please visit your Order History in the dashboard and click "Get Help" next to the order, or email us at support@olivepizza.com with your Order ID and photos of the issue.
      </p>
    </LegalPageLayout>
  );
}
