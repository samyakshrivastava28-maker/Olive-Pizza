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
import { useNetworkStore } from "../lib/networkQuality";
import { filterActive } from "../lib/scheduling";
import { subscribeToWishlist } from "../lib/wishlist";
import { trackEvent, computeRankingScore } from "../lib/analytics";
import toast from "react-hot-toast";
import SEO from "../components/SEO";
import { generateRestaurantSchema } from "../lib/schema";

import LiveMenuCategories from "../components/home/LiveMenuCategories";
import LiveCoupons from "../components/home/LiveCoupons";
import LiveAdvertisements from "../components/home/LiveAdvertisements";
import PreviouslyOrdered from "../components/home/PreviouslyOrdered";
import FeaturedShowcase from "../components/home/FeaturedShowcase";
import AppDownloadSection from "../components/home/AppDownloadSection";
import FlagshipFooter from "../components/home/FlagshipFooter";
import HomepageRenderer from "../components/sdui/HomepageRenderer";
import { useWebsiteConfigStore } from "../stores/websiteConfigStore";

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
        return null;

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

        {/* Store closed banner */}
        {!storeStatus.isLoading && !isStoreOpen && (
          <div className="text-white font-bold text-center py-2.5 px-4 shadow-md sticky top-[72px] z-40 text-sm"
            style={{ background: "rgba(239,68,68,0.9)", backdropFilter: "blur(8px)" }}>
            🚧 Restaurant currently closed — browse menu, order when we open!
          </div>
        )}

        {/* ─── LUXURY HERO (STRICTLY UNTOUCHED) ─────────────────────────────────── */}
        <LuxuryHero isStoreOpen={isStoreOpen} showIntro={false} />

        {/* ─── Flagship Below-Hero Content ─────────────────────────────────── */}
        <main
          className="w-full pb-16 relative overflow-hidden"
          style={{ background: "#06070a" }}
        >
          {/* Subtle ambient background galaxy texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 z-0"
            style={{
              background:
                "radial-gradient(ellipse at 20% 30%, rgba(249,115,22,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(16,185,129,0.12) 0%, transparent 60%)",
            }}
          />

          {/* Server-Driven Dynamic Homepage Layout */}
          <HomepageRenderer />
        </main>
      </PageTransition>
    </>
  );
}
