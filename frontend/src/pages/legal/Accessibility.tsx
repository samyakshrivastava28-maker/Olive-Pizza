import LegalPageLayout from '../../components/layout/LegalPageLayout';

export default function Accessibility() {
  const lastUpdated = "June 30, 2026";
  
  const toc = [
    { id: "commitment", label: "Accessibility Commitment" },
    { id: "keyboard", label: "Keyboard Navigation" },
    { id: "screen-reader", label: "Screen Reader Support" },
    { id: "contrast", label: "Contrast & Colors" },
    { id: "mobile", label: "Mobile Accessibility" },
    { id: "contact", label: "Contact Us" }
  ];

  return (
    <LegalPageLayout
      title="Accessibility Statement"
      description="Our commitment to making Olive Pizza's digital experience accessible to everyone."
      lastUpdated={lastUpdated}
      toc={toc}
      canonicalUrl="/accessibility"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Accessibility", url: "/accessibility" }
      ]}
    >
      <h2 id="commitment">1. Accessibility Commitment</h2>
      <p>
        Olive Pizza is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone, 
        and applying the relevant accessibility standards to guarantee our platform is inclusive and easy to use.
      </p>

      <h2 id="keyboard">2. Keyboard Navigation</h2>
      <p>
        Our website is fully navigable using a keyboard. We ensure that interactive elements like buttons, links, and form fields are clearly highlighted 
        when focused, allowing users who rely on keyboards to navigate our menu and checkout process seamlessly.
      </p>

      <h2 id="screen-reader">3. Screen Reader Support</h2>
      <p>
        We have designed our platform with semantic HTML to support modern screen readers. Images contain descriptive alt text, 
        form inputs are properly labeled, and dynamic content changes (such as live order updates) use ARIA attributes to notify screen reader users.
      </p>

      <h2 id="contrast">4. Contrast & Colors</h2>
      <p>
        We adhere to WCAG (Web Content Accessibility Guidelines) AA standards for color contrast. Our design system ensures text is highly legible 
        against background colors. We also provide full support for operating system-level Dark Mode preferences to reduce eye strain.
      </p>

      <h2 id="mobile">5. Mobile Accessibility</h2>
      <p>
        Our mobile application and responsive website feature large tap targets, gesture support, and dynamic font scaling. 
        We ensure that zooming in does not break the layout, allowing visually impaired users to comfortably read our menu.
      </p>

      <h2 id="contact">6. Contact for Accessibility Issues</h2>
      <p>
        We welcome your feedback on the accessibility of Olive Pizza. If you encounter any accessibility barriers, please contact us immediately:
      </p>
      <ul>
        <li>Phone: +1 (555) 123-4567</li>
        <li>E-mail: accessibility@olivepizza.com</li>
        <li>Address: 123 Pizza Street, Foodville, NY 10001</li>
      </ul>
      <p>We try to respond to feedback within 2 business days.</p>
    </LegalPageLayout>
  );
}
