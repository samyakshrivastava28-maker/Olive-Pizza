import LegalPageLayout from '../../components/layout/LegalPageLayout';

export default function CookiePolicy() {
  const lastUpdated = "June 30, 2026";
  
  const toc = [
    { id: "what-are", label: "What Cookies Are" },
    { id: "essential", label: "Essential Cookies" },
    { id: "analytics", label: "Analytics Cookies" },
    { id: "functional", label: "Functional Cookies" },
    { id: "marketing", label: "Marketing Cookies" },
    { id: "managing", label: "Managing Cookies" }
  ];

  return (
    <LegalPageLayout
      title="Cookie Policy"
      description="Understanding how and why Olive Pizza uses cookies to improve your digital experience."
      lastUpdated={lastUpdated}
      toc={toc}
      canonicalUrl="/cookie-policy"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Cookie Policy", url: "/cookie-policy" }
      ]}
    >
      <h2 id="what-are">1. What Cookies Are</h2>
      <p>
        Cookies are small text files that are placed on your computer or mobile device when you visit a website. 
        They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site. 
        At Olive Pizza, we use cookies to ensure you get the most out of our platform, from keeping you logged in to remembering your favorite pizza toppings.
      </p>

      <h2 id="essential">2. Essential Cookies</h2>
      <p>
        These cookies are strictly necessary to provide you with services available through our website and to use some of its features. 
        Because these cookies are strictly necessary to deliver the website, you cannot refuse them without impacting how our site functions.
      </p>
      <ul>
        <li><strong>Authentication:</strong> Used by Firebase to keep you securely logged into your account.</li>
        <li><strong>Security:</strong> Used to protect your data and prevent fraudulent activity.</li>
        <li><strong>Cart Management:</strong> Used to remember the items in your cart while you browse the menu.</li>
      </ul>

      <h2 id="analytics">3. Analytics & Performance Cookies</h2>
      <p>
        These cookies collect information that is used either in aggregate form to help us understand how our website is being used 
        or how effective our marketing campaigns are. This helps us customize and improve our website for you.
      </p>

      <h2 id="functional">4. Functional & Personalization Cookies</h2>
      <p>
        These cookies are used to enable certain additional functionalities on our website, such as remembering your preferences 
        (e.g., your language or your delivery address) and providing our AI-powered menu recommendations tailored specifically to your taste profile.
      </p>

      <h2 id="marketing">5. Marketing Cookies</h2>
      <p>
        We may use marketing cookies to deliver advertisements more relevant to you and your interests. 
        They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed, 
        and in some cases selecting advertisements that are based on your interests.
      </p>

      <h2 id="managing">6. Managing Cookies</h2>
      <p>
        You have the right to decide whether to accept or reject non-essential cookies. You can set or amend your web browser controls 
        to accept or refuse cookies. If you choose to reject cookies, you may still use our website though your access to some functionality 
        and areas of our website may be restricted.
      </p>
      <p>
        To learn how to manage cookies on popular browsers, please visit the help pages of your specific browser (e.g., Chrome, Safari, Firefox).
      </p>
    </LegalPageLayout>
  );
}
