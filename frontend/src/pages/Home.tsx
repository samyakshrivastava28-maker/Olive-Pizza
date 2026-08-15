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
import PageRenderer from "../components/home/PageRenderer";
import { PageSchema } from "../types/PageSchema";


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


  const [pageSchema, setPageSchema] = useState<PageSchema | null>(null);

  useEffect(() => {
    fetch('/api/homepage/live')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setPageSchema(data.config);
        }
      })
      .catch(console.error);
  }, []);  // ─── Data State ───────────────────────────────────────────────────────────
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

          {/* New Home Page Manager Dynamic Layout */}
          {pageSchema ? (
            <PageRenderer schema={pageSchema} />
          ) : (
            <div className="w-full flex flex-col gap-8 py-8 relative z-10 min-h-[600px] items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </main>
      </PageTransition>
    </>
  );
}
