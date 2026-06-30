import LegalPageLayout from '../components/layout/LegalPageLayout';

export default function About() {
  const toc = [
    { id: "brand-story", label: "Brand Story" },
    { id: "mission", label: "Mission & Vision" },
    { id: "quality-promise", label: "Quality Promise" },
    { id: "ai-ordering", label: "AI Powered Ordering" },
    { id: "fast-delivery", label: "Fast Delivery" }
  ];

  return (
    <LegalPageLayout
      title="About Olive Pizza"
      description="Discover our journey, our promise, and what makes Olive Pizza the best in town."
      lastUpdated="June 30, 2026"
      toc={toc}
      canonicalUrl="/about"
      breadcrumbs={[{ name: "Home", url: "/" }, { name: "About", url: "/about" }]}
    >
      <h2 id="brand-story">Brand Story</h2>
      <p>
        Olive Pizza started with a simple dream: to bring authentic, artisan pizza to Rajnandgaon without compromising on speed or quality. 
        What began as a small kitchen has grown into the city's premier delivery-first pizzeria, known for fresh ingredients and innovative technology.
      </p>

      <h2 id="mission">Mission & Vision</h2>
      <p>
        <strong>Mission:</strong> To deliver happiness in a box, hot and fresh, every single time.
        <br />
        <strong>Vision:</strong> To revolutionize the local food delivery industry by combining culinary excellence with cutting-edge artificial intelligence and logistics.
      </p>

      <h2 id="quality-promise">Quality Promise & Hygiene</h2>
      <p>
        We believe that a great pizza starts with great ingredients. 
        We use only the freshest produce, premium mozzarella, and daily-kneaded dough. 
        Our kitchen adheres to the highest hygiene standards, undergoing rigorous daily cleaning protocols to ensure your food is prepared in a pristine environment.
      </p>

      <h2 id="ai-ordering">AI Powered Ordering</h2>
      <p>
        We don't just bake great pizza; we innovate. Olive Pizza features a proprietary AI-powered ordering system that learns your preferences, 
        suggests perfect pairings, and optimizes the kitchen workflow so your food is prepared perfectly every time.
      </p>

      <h2 id="fast-delivery">Fast Delivery & Satisfaction</h2>
      <p>
        With our dedicated fleet of delivery partners and live GPS tracking, we ensure your pizza arrives exactly when you expect it. 
        Customer satisfaction is our ultimate goal, and we stand by our promise: hot, fresh, and delicious.
      </p>
    </LegalPageLayout>
  );
}
