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
  doc,
  onSnapshot,
} from "firebase/firestore";
import PageTransition from "../components/PageTransition";
import { useDataStore } from "../lib/dataStore";
import { useStoreStatus } from "../lib/useStoreStatus";
import { ChevronRight, RefreshCw, Zap, Bot } from "lucide-react";
import { lazy, Suspense } from "react";
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
import StitchMidnightGlowHome from "../components/home/StitchMidnightGlowHome";
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

import PizzaLoader from "../components/ui/PizzaLoader";
import { PREDEFINED_TEMPLATES } from "../utils/HomePageTemplates";

// Module-level cache for live homepage schema (prevents redundant fetches on rapid navigation)
let cachedPageSchema: PageSchema | null = null;
let lastPageSchemaFetch = 0;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const storeStatus = useStoreStatus();
  const { user, isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  const [pageSchema, setPageSchema] = useState<PageSchema>(() => cachedPageSchema || PREDEFINED_TEMPLATES[0]);

  // Real-time synchronization with published homepage configuration
  useEffect(() => {
    let isMounted = true;

    const isValidSchema = (config: any): config is PageSchema => {
      return config && typeof config === 'object' && Array.isArray(config.sections) && config.sections.length > 0;
    };

    // 1. Instant fallback / initial fetch from API
    fetch('/api/homepage/live')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && isValidSchema(data.config)) {
          cachedPageSchema = data.config;
          setPageSchema(data.config);
        }
      })
      .catch(() => {});

    // 2. Real-time Firestore snapshot listener for zero-delay instant updates
    const unsubscribeFirestore = onSnapshot(
      doc(db, 'settings', 'homepage'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (isMounted) {
            if (isValidSchema(data?.config)) {
              cachedPageSchema = data.config;
              setPageSchema(data.config);
            } else {
              setPageSchema(PREDEFINED_TEMPLATES[0]);
            }
          }
        }
      },
      () => {}
    );

    return () => {
      isMounted = false;
      unsubscribeFirestore();
    };
  }, []);

  const {
    products,
    combos,
    initialize,
  } = useDataStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const allProducts = useMemo(
    () => [...products.filter((p) => !p.isComboOnly), ...combos],
    [products, combos]
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

        {/* ─── Flagship Canonical Content ─────────────────────────────────── */}
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

          {pageSchema ? (
            pageSchema.pageId === 'default' ? (
              <StitchMidnightGlowHome />
            ) : (
              <PageRenderer schema={pageSchema} />
            )
          ) : (
            <div className="w-full flex flex-col gap-8 py-16 relative z-10 min-h-[600px] items-center justify-center">
              <PizzaLoader text="Handcrafting your menu..." size="medium" />
            </div>
          )}
        </main>
      </PageTransition>
    </>
  );
}
