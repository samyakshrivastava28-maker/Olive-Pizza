import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  limit,
} from "firebase/firestore";
import { APP_VERSION } from "../lib/versionManager";
import PageTransition from "../components/PageTransition";
import { useDataStore } from "../lib/dataStore";
import { useStoreStatus } from "../lib/useStoreStatus";
import { ChevronRight, RefreshCw, Zap, Bot } from "lucide-react";
import { lazy, Suspense } from "react";
const Ferrofluid = lazy(() => import("../components/ui/Ferrofluid"));
const LocationMap = lazy(() => import("../components/ui/LocationMap"));
import { OpenInMapsButton } from "../components/ui/OpenInMapsButton";
import BannerCarousel from "../components/ui/BannerCarousel";
import CouponCard from "../components/ui/CouponCard";
import ComboCard from "../components/ui/ComboCard";
import SpecialCategorySection from "../components/ui/SpecialCategorySection";
import LuxuryHero from "../components/ui/LuxuryHero";
import LuxuryProductCard from "../components/ui/LuxuryProductCard";
import { useAuthStore, useCartStore } from "../lib/store";
import { useHomeLayoutStore } from "../lib/homeLayout";
import { filterActive } from "../lib/scheduling";
import { subscribeToWishlist } from "../lib/wishlist";
import { trackEvent, computeRankingScore } from "../lib/analytics";
import toast from "react-hot-toast";
import SEO from "../components/SEO";
import { generateRestaurantSchema } from "../lib/schema";

// ─── Premium Skeleton ─────────────────────────────────────────────────────────
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {[...Array(rows * 2)].map((_, i) => (
        <div key={i} className="luxury-shimmer rounded-2xl aspect-square" />
      ))}
    </div>
  );
}

// ─── Premium Section Header ───────────────────────────────────────────────────
function PremiumSectionHeader({
  title,
  subtitle,
  accent,
  noMargin,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  noMargin?: boolean;
}) {
  return (
    <div className={noMargin ? "" : "mb-6 md:mb-8"}>
      <h2 className="luxury-section-title">
        {accent && (
          <span
            className="mr-2"
            style={{
              background: "linear-gradient(135deg, #fb923c, #fbbf24)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {accent}
          </span>
        )}
        {title}
      </h2>
      {subtitle && <p className="luxury-section-subtitle">{subtitle}</p>}
    </div>
  );
}

// ─── Premium Section Wrapper with scroll reveal ───────────────────────────────
function PremiumSectionWrapper({
  id,
  children,
  onView,
}: {
  id: string;
  children: React.ReactNode;
  onView?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !onView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onView();
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onView]);

  return (
    <motion.div
      ref={ref}
      id={`section-${id}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [showIntro, setShowIntro] = useState(false);

  const storeStatus = useStoreStatus();
  const { user, isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  // ─── Home Layout ─────────────────────────────────────────────────────────
  const { sections, subscribePublished } = useHomeLayoutStore();
  const activeSections = [...sections]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.isEnabled);

  useEffect(() => {
    const unsub = subscribePublished();
    return unsub;
  }, []);

  // ─── Data State ───────────────────────────────────────────────────────────
  const {
    ads,
    coupons,
    specialCategories,
    products,
    combos,
    isInitialized,
    initialize,
  } = useDataStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const allProducts = useMemo(
    () => [...products.filter((p) => !p.isComboOnly), ...combos],
    [products, combos]
  );

  const topSelling = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => computeRankingScore(b as any) - computeRankingScore(a as any))
      .slice(0, 8);
  }, [allProducts]);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [savedProducts, setSavedProducts] = useState<any[]>([]);

  // ─── Intro gate ───────────────────────────────────────────────────────────
  useEffect(() => {
    const connection = (navigator as any).connection;
    const isSlowNetwork =
      connection &&
      (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g");

    const playedVersion = localStorage.getItem("olive_intro_version");
    let fallbackTimer: ReturnType<typeof setTimeout>;

    if (playedVersion !== APP_VERSION && !isSlowNetwork) {
      setShowIntro(true);
      document.body.style.overflow = "hidden";
      // Maximum 8 seconds total for intro to either play or fail
      fallbackTimer = setTimeout(() => handleIntroEnd(), 8000);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      document.body.style.overflow = "";
    };
  }, []);

  const handleIntroEnd = useCallback(() => {
    localStorage.setItem("olive_intro_version", APP_VERSION);
    setShowIntro(false);
    document.body.style.overflow = "";
  }, []);

  // ─── Intro video ──────────────────────────────────────────────────────────
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const w = window.innerWidth;
    if (w < 768) setDeviceType('mobile');
    else if (w < 1024) setDeviceType('tablet');
    else setDeviceType('desktop');
  }, []);

  const getOptimizedIntroUrls = () => {
    const base = "https://res.cloudinary.com/dxmlvkff1/video/upload";
    // Hardware acceleration / fast start / codec negotiation (f_auto will select webm/mp4 based on browser)
    const transformations = ["f_auto", "vc_auto", "fl_fast_start"];
    
    if (deviceType === 'mobile') {
      transformations.push("q_auto:eco", "h_540", "c_scale");
    } else if (deviceType === 'tablet') {
      transformations.push("q_auto:good", "h_720", "c_scale");
    } else {
      transformations.push("q_auto:best", "h_1080", "c_scale");
    }
    
    const paramsStr = transformations.join(",");
    const videoId = "v1782199127/Olive_Pizza_logo_reveal_202606231247_rrtc3u";
    
    return {
      videoUrl: `${base}/${paramsStr}/${videoId}.mp4`,
      posterUrl: `${base}/${paramsStr}/${videoId}.jpg`
    };
  };

  const { videoUrl, posterUrl } = getOptimizedIntroUrls();
  const [videoReady, setVideoReady] = useState(false);

  // ─── Wishlist ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const unsub = subscribeToWishlist(user.uid, (ids) => {
      setWishlistIds(ids);
      const saved = allProducts.filter((p) => ids.includes(p.id));
      setSavedProducts(saved);
    });
    return unsub;
  }, [isAuthenticated, user, allProducts]);

  // ─── Previous Orders ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const fetchOrders = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "orders"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(10)
          )
        );
        setPreviousOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        // silently ignore — orders may be in Postgres
      }
    };
    fetchOrders();
  }, [isAuthenticated, user]);

  const handleReorderAll = useCallback(
    (order: any) => {
      if (!order.items) return;
      order.items.forEach((item: any) => {
        addItem({
          id: item.productId || item.id,
          productId: item.productId || item.id,
          productName: item.productName || item.name,
          price: item.price,
          quantity: item.quantity || 1,
          imageUrl: item.imageUrl || "",
        } as any);
      });
      toast.success(`${order.items.length} items added to cart!`);
      navigate("/cart");
    },
    [addItem, navigate]
  );

  const isStoreOpen =
    storeStatus.isRestaurantOpen && storeStatus.isWithinBusinessHours;

  // ─── Render a section by type ─────────────────────────────────────────────
  const renderSection = (section: (typeof activeSections)[0]) => {
    switch (section.type) {
      case "hero":
        return null;

      case "ads":
        if (!isInitialized) return <SectionSkeleton rows={1} />;
        if (ads.length === 0) return null;
        return (
          <PremiumSectionWrapper
            id="ads"
            key="ads"
            onView={() => trackEvent({ type: "section_view", sectionId: "ads" })}
          >
            <BannerCarousel
              banners={ads.map((a) => ({
                id: a.id,
                title: a.title,
                description: a.description,
                mediaUrl: a.mediaUrl,
                mediaType: a.mediaType,
                ctaText: a.ctaText,
                ctaLink: a.ctaLink,
                ctaType: a.ctaType,
              }))}
            />
          </PremiumSectionWrapper>
        );

      case "coupons":
        if (!isInitialized) return <SectionSkeleton rows={1} />;
        if (coupons.length === 0) return null;
        return (
          <PremiumSectionWrapper
            id="coupons"
            key="coupons"
            onView={() => trackEvent({ type: "section_view", sectionId: "coupons" })}
          >
            <PremiumSectionHeader
              title="Active Offers"
              subtitle="Grab these deals before they expire!"
              accent="🎟️"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((coupon, i) => (
                <CouponCard key={coupon.id} coupon={coupon} index={i} />
              ))}
            </div>
          </PremiumSectionWrapper>
        );

      case "special_categories":
        if (!isInitialized) return <SectionSkeleton rows={2} />;
        if (specialCategories.length === 0) return null;
        return (
          <div key="special_categories" className="space-y-12">
            {specialCategories.map((cat, i) => (
              <SpecialCategorySection
                key={cat.id}
                category={cat}
                allProducts={allProducts}
                wishlistIds={wishlistIds}
                index={i}
              />
            ))}
          </div>
        );

      case "top_selling":
        if (!isInitialized) return <SectionSkeleton rows={2} />;
        if (topSelling.length === 0) return null;
        return (
          <PremiumSectionWrapper
            id="top_selling"
            key="top_selling"
            onView={() => trackEvent({ type: "section_view", sectionId: "top_selling" })}
          >
            <PremiumSectionHeader
              title="Top Selling"
              subtitle="Our customers' absolute favourites"
              accent="🔥"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {topSelling.map((p, i) => (
                <LuxuryProductCard
                  key={p.id}
                  product={p}
                  wishlistIds={wishlistIds}
                  index={i}
                />
              ))}
            </div>
          </PremiumSectionWrapper>
        );

      case "menu":
        return (
          <PremiumSectionWrapper id="menu" key="menu" onView={() => {}}>
            <PremiumSectionHeader
              title="Our Menu"
              subtitle="Everything crafted fresh from our kitchen"
              accent="🍕"
            />
            <div className="grid grid-cols-3 gap-3 md:gap-5">
              {[
                { label: "Pizzas", category: "pizza", emoji: "🍕", color: "#f97316" },
                { label: "Sides", category: "sides", emoji: "🥗", color: "#10b981" },
                { label: "Beverages", category: "beverage", emoji: "🥤", color: "#3b82f6" },
              ].map((cat) => (
                <motion.div key={cat.category} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to={`/menu?category=${cat.category}`}
                    className="flex flex-col items-center gap-3 p-5 md:p-7 rounded-2xl transition-all"
                    style={{
                      background: "linear-gradient(145deg, rgba(30,30,30,0.9), rgba(18,18,18,0.97))",
                      border: "1px solid rgba(255,255,255,0.07)",
                      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    }}
                  >
                    <span className="text-3xl md:text-4xl">{cat.emoji}</span>
                    <span className="font-black text-white text-sm md:text-base">{cat.label}</span>
                    <span
                      className="flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: cat.color }}
                    >
                      View All <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </PremiumSectionWrapper>
        );

      case "personalization":
        if (!isAuthenticated) return null;
        if (!isInitialized || allProducts.length === 0) return null;
        const recommended = [...allProducts].sort(() => Math.random() - 0.5).slice(0, 4);
        return (
          <PremiumSectionWrapper
            id="personalization"
            key="personalization"
            onView={() => trackEvent({ type: "section_view", sectionId: "personalization" })}
          >
            <PremiumSectionHeader
              title="Recommended For You"
              subtitle="Picks tailored to your taste"
              accent="✨"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {recommended.map((p, i) => (
                <LuxuryProductCard key={p.id} product={p} wishlistIds={wishlistIds} index={i} />
              ))}
            </div>
          </PremiumSectionWrapper>
        );

      case "order_again":
        if (!isAuthenticated || previousOrders.length === 0) return null;
        const recentOrder = previousOrders[0];
        const recentProducts = allProducts.filter((p) =>
          recentOrder?.items?.some((i: any) => i.productId === p.id || i.id === p.id)
        );
        if (recentProducts.length === 0) return null;
        return (
          <PremiumSectionWrapper
            id="order_again"
            key="order_again"
            onView={() => trackEvent({ type: "section_view", sectionId: "order_again" })}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <PremiumSectionHeader
                title="Order Again"
                subtitle={`From your last order • ${new Date(recentOrder.createdAt).toLocaleDateString()}`}
                accent="🔄"
                noMargin
              />
              <motion.button
                onClick={() => handleReorderAll(recentOrder)}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #ea580c, #f97316)",
                  boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
                }}
              >
                <RefreshCw className="w-4 h-4" /> Re-order All
              </motion.button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {recentProducts.slice(0, 4).map((p, i) => (
                <LuxuryProductCard key={p.id} product={p} wishlistIds={wishlistIds} index={i} />
              ))}
            </div>
          </PremiumSectionWrapper>
        );

      case "wishlist":
        if (!isAuthenticated || savedProducts.length === 0) return null;
        return (
          <PremiumSectionWrapper
            id="wishlist"
            key="wishlist"
            onView={() => trackEvent({ type: "section_view", sectionId: "wishlist" })}
          >
            <PremiumSectionHeader
              title="Saved Products"
              subtitle="Items you've hearted"
              accent="❤️"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {savedProducts.map((p, i) => (
                <LuxuryProductCard key={p.id} product={p} wishlistIds={wishlistIds} index={i} />
              ))}
            </div>
          </PremiumSectionWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SEO title="Home" schemaMarkup={generateRestaurantSchema()} />
      <PageTransition className="relative w-full">

        {/* ─── Intro Video ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showIntro && (
            <motion.div
              key="intro"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="fixed inset-0 z-[9999] bg-dark-950 flex items-center justify-center overflow-hidden"
              style={{ willChange: "opacity" }}
            >
              {/* Fallback Image */}
              <img
                src={posterUrl}
                alt="Intro Poster"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[400ms] ${videoReady ? 'opacity-0' : 'opacity-100'} z-10`}
                style={{ transform: "translateZ(0)", willChange: "opacity, transform" }}
              />
              
              <video
                ref={(el) => {
                  if (el) {
                    const p = el.play();
                    if (p !== undefined) p.catch(() => handleIntroEnd());
                  }
                }}
                src={videoUrl}
                poster={posterUrl}
                autoPlay
                muted
                playsInline
                preload="auto"
                onCanPlay={() => setVideoReady(true)}
                onPlaying={() => setVideoReady(true)}
                onEnded={handleIntroEnd}
                onError={() => setTimeout(handleIntroEnd, 500)}
                onStalled={() => setTimeout(handleIntroEnd, 1000)}
                onWaiting={() => setTimeout(handleIntroEnd, 3000)}
                className={`absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                style={{ 
                  transform: "translateZ(0)", 
                  willChange: "transform, opacity", 
                  backfaceVisibility: "hidden", 
                  contain: "strict" 
                }}
              />
              <button
                onClick={handleIntroEnd}
                className="absolute top-safe-6 right-6 mt-6 px-4 py-2 rounded-full text-white text-xs tracking-widest uppercase font-bold z-30"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transform: "translateZ(0)",
                }}
              >
                Skip Intro ➔
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Store closed banner */}
        {!storeStatus.isLoading && !isStoreOpen && (
          <div className="text-white font-bold text-center py-2.5 px-4 shadow-md sticky top-[72px] z-40 text-sm"
            style={{ background: "rgba(239,68,68,0.9)", backdropFilter: "blur(8px)" }}>
            🚧 Restaurant currently closed — browse menu, order when we open!
          </div>
        )}

        {/* ─── LUXURY HERO ─────────────────────────────────────────────────── */}
        <LuxuryHero isStoreOpen={isStoreOpen} showIntro={showIntro} />

        {/* ─── Main Content ─────────────────────────────────────────────────── */}
        <main
          className="w-full pb-32 md:pb-24 relative overflow-hidden"
          style={{ background: "#0a0a0a" }}
        >
          {/* Subtle ambient background texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10 z-0"
            style={{
              background:
                "radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(85,119,90,0.08) 0%, transparent 60%)",
            }}
          />

          {/* AI Futuristic Section */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative z-10 pt-14 md:pt-20 pb-8 md:pb-12 px-4"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="max-w-7xl mx-auto">
              <div
                className="relative overflow-hidden rounded-3xl p-6 md:p-10"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(14,14,24,0.98) 0%, rgba(20,14,30,0.98) 100%)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  boxShadow: "0 0 80px rgba(139,92,246,0.08), 0 20px 60px rgba(0,0,0,0.5)",
                }}
              >
                {/* Glowing orb */}
                <div
                  className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
                    transform: "translate(30%, -30%)",
                  }}
                />

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase"
                        style={{
                          background: "rgba(139,92,246,0.15)",
                          border: "1px solid rgba(139,92,246,0.3)",
                          color: "#a78bfa",
                        }}
                      >
                        <Zap className="w-3 h-3" />
                        AI-Powered
                      </div>
                    </div>
                    <h2
                      className="text-2xl md:text-4xl font-black text-white leading-tight mb-2"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      Meet Your
                      <span
                        style={{
                          background: "linear-gradient(135deg, #a78bfa, #c4b5fd)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          marginLeft: "0.35rem",
                        }}
                      >
                        Pizza Assistant
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm md:text-base max-w-lg">
                      Personalized recommendations, smart reorders, and AI-crafted combos. Your perfect pizza is one message away.
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to="/assistant"
                      className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-bold text-white text-sm whitespace-nowrap transition-all"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                        boxShadow: "0 8px 32px rgba(139,92,246,0.4)",
                      }}
                    >
                      <Bot className="w-4 h-4" />
                      Ask AI Assistant
                    </Link>
                  </motion.div>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2 mt-5">
                  {["Smart Recommendations", "Voice Ordering", "Dietary Preferences", "Order History"].map(
                    (feat) => (
                      <span
                        key={feat}
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: "rgba(139,92,246,0.1)",
                          border: "1px solid rgba(139,92,246,0.15)",
                          color: "rgba(196,181,253,0.9)",
                        }}
                      >
                        {feat}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Dynamic Sections */}
          <div className="max-w-7xl mx-auto px-4 pt-12 space-y-14 relative z-10">
            {activeSections
              .filter((s) => s.type !== "hero")
              .map((section) => renderSection(section))}
          </div>

          {/* ─── Visit Olive Pizza ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="py-16 md:py-24 relative z-10 mt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-10 md:mb-14">
                <h2
                  className="text-3xl md:text-5xl font-black text-white mb-3"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Visit Olive Pizza
                </h2>
                <p className="text-slate-400 max-w-xl mx-auto mb-7 text-sm md:text-base">
                  We deliver fresh to your door, or drop by and grab a hot slice right out of the oven.
                </p>
                <OpenInMapsButton />
              </div>
              <Suspense
                fallback={
                  <div className="w-full h-80 md:h-[500px] rounded-3xl luxury-shimmer border border-white/5" />
                }
              >
                <LocationMap
                  className="w-full h-80 md:h-[500px] rounded-3xl shadow-2xl border border-white/5 z-0"
                  showRadius
                />
              </Suspense>
            </div>
          </motion.div>
        </main>
      </PageTransition>
    </>
  );
}
