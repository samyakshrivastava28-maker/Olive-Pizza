import { useState, useEffect, useRef, useMemo } from "react";
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
import PageTransition from "../components/PageTransition";
import { useDataStore } from "../lib/dataStore";
import { useStoreStatus } from "../lib/useStoreStatus";
import { ChevronRight, ShoppingBag, RefreshCw, Heart } from "lucide-react";
import Ferrofluid from "../components/ui/Ferrofluid";
import LocationMap, { OpenInMapsButton } from "../components/ui/LocationMap";
import BannerCarousel from "../components/ui/BannerCarousel";
import CouponCard from "../components/ui/CouponCard";
import ComboCard from "../components/ui/ComboCard";
import SpecialCategorySection from "../components/ui/SpecialCategorySection";
import WishlistButton from "../components/ui/WishlistButton";
import { useAuthStore, useCartStore } from "../lib/store";
import { useHomeLayoutStore } from "../lib/homeLayout";
import { filterActive } from "../lib/scheduling";
import { subscribeToWishlist } from "../lib/wishlist";
import { trackEvent, computeRankingScore } from "../lib/analytics";
import toast from "react-hot-toast";
import SEO from "../components/SEO";
import { generateRestaurantSchema } from "../lib/schema";

// Skeleton loader
function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {[...Array(rows * 2)].map((_, i) => (
        <div key={i} className="bg-dark-800 rounded-2xl aspect-square" />
      ))}
    </div>
  );
}

export default function Home() {
  const [showIntro, setShowIntro] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [heroVideoError, setHeroVideoError] = useState(false);

  // Hero Video Optimization
  const heroRef = useRef<HTMLHeadingElement>(null);
  const isHeroInView = useInView(heroRef, { margin: "200px 0px" });
  const heroVideoRefMobile = useRef<HTMLVideoElement>(null);
  const heroVideoRefDesktop = useRef<HTMLVideoElement>(null);

  const storeStatus = useStoreStatus();
  const { user, isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  // ─── Home Layout ─────────────────────────────────────────────────────────
  const { sections, subscribePublished } = useHomeLayoutStore();
  const activeSections = [...sections].sort((a, b) => a.order - b.order).filter((s) => s.isEnabled);

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

  const allProducts = useMemo(() => [...products, ...combos], [products, combos]);
  
  // Auto top selling: weighted score
  const topSelling = useMemo(() => {
    return [...allProducts]
      .sort((a, b) => computeRankingScore(b as any) - computeRankingScore(a as any))
      .slice(0, 8);
  }, [allProducts]);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [savedProducts, setSavedProducts] = useState<any[]>([]);

  // ─── Intro Video ──────────────────────────────────────────────────────────
  useEffect(() => {
    const connection = (navigator as any).connection;
    const isSlowNetwork = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');

    const hasPlayed = sessionStorage.getItem("olive_intro_seen");
    
    if (!hasPlayed && !isSlowNetwork) {
      setShowIntro(true);
      document.body.style.overflow = "hidden";
      
      // FOOLPROOF FALLBACK: Force end the intro after 8 seconds no matter what.
      // This prevents the "infinite loading glitch" if the video fails to load or autoplay.
      const fallbackTimer = setTimeout(() => {
        handleIntroEnd();
      }, 8000);
      
      return () => clearTimeout(fallbackTimer);
    }
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      document.body.style.overflow = "";
    };
  }, []);

  const handleIntroEnd = () => {
    sessionStorage.setItem("olive_intro_seen", "true");
    setShowIntro(false);
    document.body.style.overflow = "";
  };

  useEffect(() => {
    if (!showIntro) {
      if (isHeroInView) {
        heroVideoRefMobile.current?.play().catch(() => setHeroVideoError(true));
        heroVideoRefDesktop.current?.play().catch(() => setHeroVideoError(true));
      } else {
        heroVideoRefMobile.current?.pause();
        heroVideoRefDesktop.current?.pause();
      }
    }
  }, [isHeroInView, showIntro]);

  // ─── Wishlist ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const unsub = subscribeToWishlist(user.uid, (ids) => {
      setWishlistIds(ids);
      // Resolve saved products
      const saved = allProducts.filter((p) => ids.includes(p.id));
      setSavedProducts(saved);
    });
    return unsub;
  }, [isAuthenticated, user, allProducts]);

  // ─── Previous Orders (Order Again) ───────────────────────────────────────
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
        const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPreviousOrders(orders);
      } catch (e) {
        // Orders may be in Postgres; silently ignore
      }
    };
    fetchOrders();
  }, [isAuthenticated, user]);

  // ─── Order Again handler ──────────────────────────────────────────────────
  const handleReorderAll = (order: any) => {
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
  };

  // ─── Render a section by type ─────────────────────────────────────────────
  const renderSection = (section: typeof activeSections[0]) => {
    switch (section.type) {
      case "hero":
        return null; // Hero is always rendered at the top

      case "ads":
        if (!isInitialized) return <SectionSkeleton rows={1} />;
        if (ads.length === 0) return null;
        return (
          <SectionWrapper
            id="ads"
            key="ads"
            onView={() => trackEvent({ type: "section_view", sectionId: "ads" })}
          >
            <BannerCarousel banners={ads.map((a) => ({
              id: a.id,
              title: a.title,
              description: a.description,
              mediaUrl: a.mediaUrl,
              mediaType: a.mediaType,
              ctaText: a.ctaText,
              ctaLink: a.ctaLink,
              ctaType: a.ctaType,
            }))} />
          </SectionWrapper>
        );

      case "coupons":
        if (!isInitialized) return <SectionSkeleton rows={1} />;
        if (coupons.length === 0) return null;
        return (
          <SectionWrapper
            id="coupons"
            key="coupons"
            onView={() => trackEvent({ type: "section_view", sectionId: "coupons" })}
          >
            <SectionHeader title="🎟️ Active Offers" subtitle="Grab these deals before they expire!" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coupons.map((coupon, i) => (
                <CouponCard key={coupon.id} coupon={coupon} index={i} />
              ))}
            </div>
          </SectionWrapper>
        );

      case "special_categories":
        if (!isInitialized) return <SectionSkeleton rows={2} />;
        if (specialCategories.length === 0) return null;
        return (
          <div key="special_categories" className="space-y-8">
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
          <SectionWrapper
            id="top_selling"
            key="top_selling"
            onView={() => trackEvent({ type: "section_view", sectionId: "top_selling" })}
          >
            <SectionHeader title="🔥 Top Selling" subtitle="Our customers' favourites" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {topSelling.map((p, i) => (
                <ProductCardWrapper key={p.id} product={p} wishlistIds={wishlistIds} index={i} />
              ))}
            </div>
          </SectionWrapper>
        );

      case "menu":
        return (
          <SectionWrapper id="menu" key="menu" onView={() => {}}>
            <SectionHeader title="🍕 Our Menu" subtitle="Everything from our kitchen" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Pizzas", category: "pizza", emoji: "🍕", color: "#f97316" },
                { label: "Sides", category: "sides", emoji: "🥗", color: "#10b981" },
                { label: "Beverages", category: "beverage", emoji: "🥤", color: "#3b82f6" },
              ].map((cat) => (
                <motion.div key={cat.category} whileHover={{ y: -4 }} className="group">
                  <Link
                    to={`/menu?category=${cat.category}`}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/10 bg-dark-900/60 hover:border-white/20 transition-all"
                    style={{ boxShadow: `0 0 0 0 ${cat.color}` }}
                  >
                    <span className="text-4xl">{cat.emoji}</span>
                    <span className="font-black text-white text-lg">{cat.label}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                      View All <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </SectionWrapper>
        );

      case "personalization":
        if (!isAuthenticated) return null;
        if (!isInitialized || allProducts.length === 0) return null;
        // Simple personalization: show recently viewed or a shuffled featured set
        const recommended = [...allProducts].sort(() => Math.random() - 0.5).slice(0, 4);
        return (
          <SectionWrapper
            id="personalization"
            key="personalization"
            onView={() => trackEvent({ type: "section_view", sectionId: "personalization" })}
          >
            <SectionHeader title="✨ Recommended For You" subtitle="Picks tailored to your taste" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommended.map((p, i) => (
                <ProductCardWrapper key={p.id} product={p} wishlistIds={wishlistIds} index={i} />
              ))}
            </div>
          </SectionWrapper>
        );

      case "order_again":
        if (!isAuthenticated || previousOrders.length === 0) return null;
        const recentOrder = previousOrders[0];
        const recentProducts = allProducts.filter((p) =>
          recentOrder?.items?.some((i: any) => i.productId === p.id || i.id === p.id)
        );
        if (recentProducts.length === 0) return null;
        return (
          <SectionWrapper
            id="order_again"
            key="order_again"
            onView={() => trackEvent({ type: "section_view", sectionId: "order_again" })}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <SectionHeader
                title="🔄 Order Again"
                subtitle={`From your last order • ${new Date(recentOrder.createdAt).toLocaleDateString()}`}
                noMargin
              />
              <button
                onClick={() => handleReorderAll(recentOrder)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" /> Re-order All
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentProducts.slice(0, 4).map((p, i) => (
                <ProductCardWrapper key={p.id} product={p} wishlistIds={wishlistIds} index={i} />
              ))}
            </div>
          </SectionWrapper>
        );

      case "wishlist":
        if (!isAuthenticated || savedProducts.length === 0) return null;
        return (
          <SectionWrapper
            id="wishlist"
            key="wishlist"
            onView={() => trackEvent({ type: "section_view", sectionId: "wishlist" })}
          >
            <SectionHeader title="❤️ Saved Products" subtitle="Items you've hearted" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {savedProducts.map((p, i) => (
                <ProductCardWrapper key={p.id} product={p} wishlistIds={wishlistIds} index={i} />
              ))}
            </div>
          </SectionWrapper>
        );

      default:
        return null;
    }
  };

  const desktopIntroUrl = "https://res.cloudinary.com/dxmlvkff1/video/upload/f_auto,q_auto:eco,w_800/v1782199127/Olive_Pizza_logo_reveal_202606231247_rrtc3u.mp4";
  const mobileIntroUrl = "https://res.cloudinary.com/dxmlvkff1/video/upload/f_auto,q_auto:eco,w_480/v1782199117/Olive_Pizza_logo_reveal_202606231246_xeyk9t.mp4";
  const desktopBgUrl = "https://res.cloudinary.com/dxmlvkff1/video/upload/f_auto,q_auto:eco,w_1080/v1782200264/Artisan_pizza_emerging_from_oven_202606231307_qmognm.mp4";

  return (
    <>
      <SEO 
        title="Home"
        schemaMarkup={generateRestaurantSchema()}
      />
      <PageTransition className="relative w-full">
        <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[9999] bg-dark-950 flex items-center justify-center"
            style={{ willChange: 'opacity' }}
          >
            <video
              ref={(el) => {
                if (el) {
                  // Catch autoplay failures on mobile and skip immediately
                  const playPromise = el.play();
                  if (playPromise !== undefined) {
                    playPromise.catch(() => {
                      handleIntroEnd();
                    });
                  }
                }
              }}
              src={isMobile ? mobileIntroUrl : desktopIntroUrl}
              poster={(isMobile ? mobileIntroUrl : desktopIntroUrl).replace('.mp4', '.jpg')}
              autoPlay muted playsInline
              preload="metadata"
              onEnded={handleIntroEnd}
              onError={() => setTimeout(handleIntroEnd, 1000)}
              className="w-full h-full object-cover"
              style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            />
            <button
              onClick={handleIntroEnd}
              className="absolute top-safe-6 right-6 mt-6 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-xs tracking-widest uppercase font-bold z-10 shadow-xl hover:bg-white/20 transition-colors"
            >
              Skip Intro ➔
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Store closed banner */}
      {!storeStatus.isLoading && (!storeStatus.isRestaurantOpen || !storeStatus.isWithinBusinessHours) && (
        <div className="bg-red-500 text-white font-bold text-center py-2 px-4 shadow-md sticky top-0 z-50">
          🚧 The restaurant is currently closed. You can browse the menu but cannot place an order.
        </div>
      )}

      {/* ─── Mobile Hero Section (<= 768px) ─────────────────────────────── */}
      <header ref={heroRef} className="md:hidden relative w-full h-[100svh] min-h-[600px] overflow-hidden bg-dark-950">
        {!heroVideoError && (
          <video
            ref={heroVideoRefMobile}
            src={desktopBgUrl}
            poster={desktopBgUrl.replace('.mp4', '.jpg')}
            muted loop playsInline
            preload="metadata"
            onError={() => setHeroVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ objectPosition: 'center center' }}
          />
        )}
        {heroVideoError && (
          <img
            src={desktopBgUrl.replace('.mp4', '.jpg')}
            alt="Hero Background"
            className="absolute inset-0 w-full h-full object-cover z-0"
            style={{ objectPosition: 'center center' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/70 to-transparent z-10" />
        <div className="relative z-20 w-full h-full flex flex-col justify-end pb-[120px] px-6 text-center">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: showIntro ? 1 : 0 }}
            className="flex flex-col items-center w-full max-w-full"
          >
            <h1 className="text-[2.5rem] font-black text-white mb-4 tracking-tight leading-[1.1] w-full break-words">
              Fresh Pizza Delivered Hot To Your Door
            </h1>
            <p className="text-base text-slate-200 mb-8 font-medium leading-relaxed max-w-[90%] mx-auto">
              Premium ingredients. Fast delivery. Unforgettable taste.
            </p>
            <div className="flex flex-col gap-4 w-full">
              <Link
                to="/menu"
                className="bg-primary-600/90 backdrop-blur-md border border-primary-500/50 text-white w-full h-[56px] rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary-500 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95"
              >
                {storeStatus.isRestaurantOpen && storeStatus.isWithinBusinessHours ? "Order Now" : "Store Closed"}
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/menu"
                className="bg-dark-800/80 backdrop-blur-md border border-dark-700 text-white w-full h-[56px] rounded-full font-bold text-lg flex items-center justify-center hover:bg-dark-700 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95"
              >
                Explore Menu
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ─── Desktop Hero Section (> 768px) ─────────────────────────────── */}
      <header className="hidden md:flex relative w-full h-[90dvh] min-h-[700px] overflow-hidden rounded-b-[3rem] shadow-2xl flex-col justify-end">
        {!heroVideoError && (
          <video
            ref={heroVideoRefDesktop}
            src={desktopBgUrl}
            poster={desktopBgUrl.replace('.mp4', '.jpg')}
            muted loop playsInline
            preload="metadata"
            onError={() => setHeroVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          />
        )}
        {heroVideoError && (
          <img
            src={desktopBgUrl.replace('.mp4', '.jpg')}
            alt="Hero Background"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-dark-950/30 z-10" />
        <div className="relative z-20 h-full flex flex-col justify-end pb-24 px-8 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: showIntro ? 1 : 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight leading-[1.1]">
              Fresh Pizza Delivered Hot To Your Door
            </h1>
            <p className="text-2xl text-slate-300 mb-8 font-medium leading-relaxed max-w-lg">
              Premium ingredients. Fast delivery. Unforgettable taste.
            </p>
            <div className="flex flex-row gap-4">
              <Link
                to="/menu"
                className="bg-primary-600 text-white px-8 py-4 rounded-full font-bold text-lg text-center flex items-center justify-center gap-2 hover:bg-primary-500 transition-colors shadow-lg active:scale-95"
              >
                {storeStatus.isRestaurantOpen && storeStatus.isWithinBusinessHours ? "Order Now" : "Store Closed"}
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/menu"
                className="bg-dark-800 text-white border border-dark-700 px-8 py-4 rounded-full font-bold text-lg text-center flex items-center justify-center hover:bg-dark-700 transition-colors active:scale-95"
              >
                Explore Menu
              </Link>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-16 pb-24 md:pb-32 bg-dark-950 overflow-hidden relative">
        {/* Ferrofluid background — same as Visit Olive Pizza section */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
          <Ferrofluid />
        </div>

        {/* Dynamic Sections */}
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 relative z-10">
          {activeSections
            .filter((s) => s.type !== "hero")
            .map((section) => renderSection(section))}
        </div>

        {/* ─── Location Section (always last) ──────────────────────────────── */}
        <div className="py-16 md:py-24 border-t border-dark-800/60 relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Visit Olive Pizza</h2>
              <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                We deliver fresh to your door, or you can drop by and grab a hot slice right out of the oven.
              </p>
              <OpenInMapsButton />
            </div>
            <LocationMap
              className="w-full h-80 md:h-[500px] rounded-3xl shadow-2xl border-4 border-dark-800 z-0"
              showRadius
            />
          </div>
        </div>
      </main>
    </PageTransition>
  </>
);
}

// ─── Helper Components ─────────────────────────────────────────────────────────

function SectionWrapper({
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
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onView]);

  return (
    <motion.div
      ref={ref}
      id={`section-${id}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  title,
  subtitle,
  noMargin,
}: {
  title: string;
  subtitle?: string;
  noMargin?: boolean;
}) {
  return (
    <div className={noMargin ? "" : "mb-5"}>
      <h2 className="text-2xl md:text-3xl font-black text-white">{title}</h2>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function ProductCardWrapper({
  product,
  wishlistIds,
  index,
}: {
  product: any;
  wishlistIds: string[];
  index: number;
}) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="relative group bg-dark-900/60 border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
    >
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl.replace("/upload/", "/upload/f_auto,q_auto,w_300/")}
              alt={product.productName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onClick={() => trackEvent({ type: "product_view", productId: product.id })}
            />
          ) : (
            <div className="w-full h-full bg-dark-800 flex items-center justify-center text-4xl">🍕</div>
          )}
          <div className="absolute top-2 right-2">
            <WishlistButton productId={product.id} wishlistIds={wishlistIds} size="sm" />
          </div>
          {product.isVegetarian && (
            <span className="absolute top-2 left-2 bg-green-500 w-5 h-5 rounded border-2 border-white flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white block" />
            </span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <p className="font-bold text-white text-sm line-clamp-1">{product.productName}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-black text-white">₹{product.basePrice}</span>
          <button
            onClick={() => {
              addItem({ id: product.id, productId: product.id, productName: product.productName, price: product.basePrice, quantity: 1, imageUrl: product.imageUrl || "" } as any);
              trackEvent({ type: "product_view", productId: product.id });
              toast.success(`${product.productName} added!`);
            }}
            className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-all active:scale-90"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
