import LegalPageLayout from '../../components/layout/LegalPageLayout';

export default function PrivacyPolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc = [
    { id: "introduction", label: "Introduction" },
    { id: "information-we-collect", label: "Information We Collect" },
    { id: "how-we-use", label: "How We Use Your Information" },
    { id: "cookies", label: "Cookies & Analytics" },
    { id: "third-party", label: "Third-Party Services" },
    { id: "data-security", label: "Data Security" },
    { id: "data-retention", label: "Data Retention" },
    { id: "customer-rights", label: "Customer Rights" },
    { id: "childrens-privacy", label: "Children's Privacy" },
    { id: "policy-updates", label: "Policy Updates" },
    { id: "contact", label: "Contact Information" }
  ];

  return (
    <LegalPageLayout
      title="Privacy Policy"
      description="Learn how Olive Pizza collects, uses, and protects your personal information."
      lastUpdated={lastUpdated}
      toc={toc}
      canonicalUrl="/privacy-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Privacy Policy", url: "/privacy-policy" }
      ]}
    >
      <h2 id="introduction">1. Introduction</h2>
      <p>
        At Olive Pizza, we respect your privacy and are committed to protecting your personal data. 
        This Privacy Policy will inform you as to how we look after your personal data when you visit our website 
        and tell you about your privacy rights and how the law protects you.
      </p>

      <h2 id="information-we-collect">2. Information We Collect</h2>
      <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
      <ul>
        <li><strong>Personal Information:</strong> includes first name, last name, username or similar identifier.</li>
        <li><strong>Contact Information:</strong> includes delivery address, email address and telephone numbers.</li>
        <li><strong>Order Information:</strong> includes details about payments to and from you and other details of products you have purchased from us.</li>
        <li><strong>Device Information:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform.</li>
      </ul>

      <h2 id="how-we-use">3. How We Use Your Information</h2>
      <p>We use your data strictly to provide the best possible pizza delivery experience. Specific uses include:</p>
      <ul>
        <li>Processing and delivering your order (including live GPS tracking).</li>
        <li>Managing your loyalty rewards and personalized AI recommendations.</li>
        <li>Sending you transactional emails and push notifications regarding your order status.</li>
        <li>Improving our website, products/services, marketing, and customer relationships.</li>
      </ul>

      <h2 id="cookies">4. Cookies & Analytics</h2>
      <p>
        We use cookies to distinguish you from other users of our website. This helps us to provide you with a good experience 
        when you browse our website and also allows us to improve our site. Please see our <a href="/cookie-policy">Cookie Policy</a> for detailed information.
      </p>

      <h2 id="third-party">5. Third-Party Services</h2>
      <p>We partner with trusted third-party services to operate our platform securely and efficiently:</p>
      <ul>
        <li><strong>Google Services & Maps:</strong> Used for address autocomplete, live order tracking, and routing.</li>
        <li><strong>Firebase & Firestore:</strong> Serves as our primary real-time database and secure authentication provider.</li>
        <li><strong>Cloudinary:</strong> Used for secure storage of delivery photo proofs and media.</li>
        <li><strong>Google Drive Backups:</strong> Secure cloud backups for critical business data.</li>
        <li><strong>Slack Notifications:</strong> Used internally by our restaurant management to fulfill your orders quickly.</li>
      </ul>

      <h2 id="data-security">6. Data Security</h2>
      <p>
        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed. All payment transactions are encrypted and processed through highly secure payment gateways.
      </p>

      <h2 id="data-retention">7. Data Retention</h2>
      <p>
        We will only retain your personal data for as long as reasonably necessary to fulfil the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements.
      </p>

      <h2 id="customer-rights">8. Customer Rights & Data Deletion Requests</h2>
      <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data. You have the right to:</p>
      <ul>
        <li>Request access to your personal data.</li>
        <li>Request correction of your personal data.</li>
        <li>Request erasure of your personal data (Right to be forgotten).</li>
      </ul>
      <p>
        If you wish to delete your account and all associated data, you may submit a request through our dedicated <a href="/delete-account">Data Deletion Request</a> page.
      </p>

      <h2 id="childrens-privacy">9. Children's Privacy</h2>
      <p>
        Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
      </p>

      <h2 id="policy-updates">10. Policy Updates</h2>
      <p>
        We keep our privacy policy under regular review. This version was last updated on the date listed at the top of this page. 
        Any changes we make to our privacy policy in the future will be posted on this page.
      </p>

      <h2 id="contact">11. Contact Information</h2>
      <p>
        If you have any questions about this privacy policy or our privacy practices, please contact our data privacy manager at:
        <br /><br />
        Email: privacy@olivepizza.com<br />
        Phone: +1 (555) 123-4567<br />
        Address: 123 Pizza Street, Foodville, NY 10001
      </p>
    </LegalPageLayout>
  );
}
