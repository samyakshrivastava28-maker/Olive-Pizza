import LegalPageLayout, { TocItem, HighlightCard } from '../components/layout/LegalPageLayout';
import { Sparkles, Utensils, Heart, ShieldCheck, Zap, Navigation, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

export default function About() {
  const toc: TocItem[] = [
    { id: "brand-story", label: "1. Our Story & Roots" },
    { id: "mission", label: "2. Mission & Vision" },
    { id: "quality-promise", label: "3. Quality & Hygiene" },
    { id: "ai-ordering", label: "4. AI-Powered Precision" },
    { id: "fast-delivery", label: "5. Lightning GPS Delivery" }
  ];

  const highlights: HighlightCard[] = [
    {
      icon: <Utensils className="w-5 h-5" />,
      title: "Daily Fresh Dough",
      description: "Slow-fermented artisan crusts kneaded fresh every single morning."
    },
    {
      icon: <Heart className="w-5 h-5" />,
      title: "100% Vegetarian Purity",
      description: "Dedicated pure vegetarian kitchen with premium mozzarella & farm veggies."
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "AI-Powered Kitchens",
      description: "Intelligent baking queues and predictive prep for scorching-hot delivery."
    }
  ];

  return (
    <LegalPageLayout
      title="About Olive Pizza"
      subtitle="Crafting Pure Artisan Pizzas with Passion & Tech"
      badge="Our Story & Culinary Philosophy"
      description="Discover our journey, our commitment to pure quality, and what makes Olive Pizza Rajnandgaon's favorite pizzeria."
      lastUpdated="June 30, 2026"
      toc={toc}
      highlights={highlights}
      icon={<Sparkles className="w-3.5 h-3.5" />}
      canonicalUrl="/about"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "About", url: "/about" }
      ]}
    >
      {/* ── Section 1: Brand Story ── */}
      <section id="brand-story" className="scroll-mt-28 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">1</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Our Story & Roots</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          Olive Pizza began with a bold, uncompromising vision: to bring authentic, handcrafted artisan pizza to Rajnandgaon 
          without ever sacrificing freshness, speed, or culinary integrity. What started as a dedicated kitchen has evolved into 
          the city's premier delivery-first pizzeria, celebrated for crisp stone-baked crusts, vibrant farm-fresh toppings, and seamless modern technology.
        </p>

        {/* Brand Showcase Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#121418] to-amber-950/30 border border-emerald-500/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center my-4">
          <div>
            <div className="text-2xl md:text-3xl font-black text-emerald-400">100%</div>
            <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Pure Vegetarian</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-amber-400">Fresh</div>
            <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Daily Kneaded</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-emerald-400">&lt; 30m</div>
            <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Avg Delivery</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-amber-400">4.9 ★</div>
            <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Loved by Foodies</div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Mission & Vision ── */}
      <section id="mission" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">2</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Mission & Vision</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
              <Award className="w-4 h-4" /> Our Mission
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              To deliver happiness in a box—scorching hot, aromatic, and deeply satisfying—every single time our kitchen oven opens.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Our Vision
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              To revolutionize local food delivery by marrying timeless culinary craftsmanship with next-generation artificial intelligence and precision logistics.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: Quality Promise ── */}
      <section id="quality-promise" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">3</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Quality Promise & Kitchen Hygiene</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We believe that an exceptional pizza begins with pure, uncompromised ingredients. 
          We source crisp farm-grown vegetables, rich whole-milk mozzarella, and our signature slow-simmered herb tomato sauce. 
          Our kitchen adheres to the strictest sanitation standards, undergoing rigorous sterilization protocols after every shift to guarantee that every meal is prepared in a spotless environment.
        </p>
      </section>

      {/* ── Section 4: AI Powered Ordering ── */}
      <section id="ai-ordering" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">4</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">AI-Powered Ordering & Smart Kitchens</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          We don't just bake great pizza—we innovate. Olive Pizza is powered by a proprietary AI ordering engine that understands your taste profile, 
          recommends curated beverage & side pairings, and dynamically orchestrates oven bake queues so your food finishes baking the precise minute your delivery driver arrives.
        </p>
      </section>

      {/* ── Section 5: Fast Delivery ── */}
      <section id="fast-delivery" className="scroll-mt-28 space-y-4 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 pb-2 border-b border-white/10">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">5</span>
          <h2 className="text-xl md:text-2xl font-black text-white m-0">Fast Delivery & Absolute Satisfaction</h2>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">
          With our dedicated fleet of delivery partners, insulated thermal bags, and live GPS map tracking, we ensure your pizza arrives piping hot right when you expect it. 
          Customer happiness is our ultimate measure of success, and we stand wholeheartedly behind our promise: fresh, hot, and unforgettable.
        </p>

        {/* Call to action to view menu */}
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Ready to taste the difference?</h3>
            <p className="text-xs text-slate-300">Explore our handcrafted artisan pizzas, garlic breads, and desserts.</p>
          </div>
          <Link
            to="/menu"
            className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0"
          >
            <span>Explore Artisan Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </LegalPageLayout>
  );
}
