import LegalPageLayout from '../components/layout/LegalPageLayout';

export default function FAQ() {
  const toc = [
    { id: "ordering", label: "Ordering" },
    { id: "payments", label: "Payments" },
    { id: "delivery", label: "Delivery & Tracking" },
    { id: "refunds", label: "Refunds & Cancellations" },
    { id: "loyalty", label: "Loyalty & Coupons" }
  ];

  return (
    <LegalPageLayout
      title="Frequently Asked Questions"
      description="Find answers to common questions about ordering, delivery, and your account."
      lastUpdated="June 30, 2026"
      toc={toc}
      canonicalUrl="/faq"
      breadcrumbs={[{ name: "Home", url: "/" }, { name: "FAQ", url: "/faq" }]}
    >
      <h2 id="ordering">Ordering</h2>
      <h3>How do I place an order?</h3>
      <p>Simply browse our menu, add items to your cart, and proceed to checkout. You can create an account or order as a guest.</p>
      
      <h3>Can I schedule an order for later?</h3>
      <p>Yes! During checkout, you can select "Scheduled Delivery" and choose a specific date and time for your food to arrive.</p>

      <h2 id="payments">Payments</h2>
      <h3>What payment methods do you accept?</h3>
      <p>We accept all major credit/debit cards, UPI, digital wallets, and Cash on Delivery.</p>
      
      <h3>Is my payment information secure?</h3>
      <p>Absolutely. All payments are processed through secure, encrypted payment gateways. We do not store your raw credit card information.</p>

      <h2 id="delivery">Delivery & Tracking</h2>
      <h3>How can I track my order?</h3>
      <p>Once your order leaves the kitchen, you can track it via the live GPS map in your Customer Dashboard.</p>
      
      <h3>Do you offer No-Contact Delivery?</h3>
      <p>Yes, you can select the No-Contact Delivery option at checkout. The driver will leave the food at your door and send a photo proof.</p>

      <h2 id="refunds">Refunds & Cancellations</h2>
      <h3>Can I cancel my order?</h3>
      <p>You can cancel for a full refund before the kitchen begins cooking. Once cooking starts, cancellations are generally not permitted.</p>

      <h2 id="loyalty">Loyalty & Coupons</h2>
      <h3>How do I earn loyalty points?</h3>
      <p>You automatically earn points for every order placed while logged into your account. Points can be redeemed for discounts on future orders.</p>
    </LegalPageLayout>
  );
}
