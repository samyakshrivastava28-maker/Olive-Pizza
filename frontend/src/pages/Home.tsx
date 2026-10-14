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
import { fetchApi } from "../lib/config";
import { clientDataCache } from "../lib/clientDataCache";

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

// Last-known-good homepage is kept in the existing persistent client cache.
// It is intentionally read synchronously so a returning customer never sees a blank
// screen while the network revalidates the current published homepage.
const HOMEPAGE_LIVE_CACHE_KEY = 'public:homepage_live';
let cachedPageSchema: PageSchema | null = null;

const isValidPageSchema = (config: unknown): config is PageSchema => {
  if (!config || typeof config !== 'object') return false;
  const candidate = config as Partial<PageSchema>;
  return typeof candidate.pageId === 'string' &&
    Array.isArray((candidate as any).sections) &&
    (candidate as any).sections.length > 0;
};

const getDefaultHomepageSchema = (): PageSchema => {
  const fallback = PREDEFINED_TEMPLATES.find((template) => template.pageId === 'default') || PREDEFINED_TEMPLATES[0];
  return fallback as PageSchema;
};

const readCachedHomepageSchema = (): PageSchema | null => {
  const cached = clientDataCache.get<{ success?: boolean; config?: unknown }>(HOMEPAGE_LIVE_CACHE_KEY);
  // The bundled default is code-level fallback, not a "custom homepage" cache entry.
  if (cached?.success && isValidPageSchema(cached.config) && cached.config.pageId !== 'default') {
    return cached.config;
  }
  return isValidPageSchema(cachedPageSchema) && cachedPageSchema.pageId !== 'default'
    ? cachedPageSchema
    : null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const storeStatus = useStoreStatus();
  const { user, isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  const [pageSchema, setPageSchema] = useState<PageSchema | null>(() => readCachedHomepageSchema());

  // A published custom page wins. The bundled hardcoded page is only the emergency
  // fallback when no usable published/cached configuration can be obtained.
  useEffect(() => {
    let isMounted = true;
    let hasResolvedHomepage = readCachedHomepageSchema() !== null;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const commitSchema = (schema: PageSchema) => {
      if (!isMounted || !isValidPageSchema(schema)) return;
      hasResolvedHomepage = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      cachedPageSchema = schema;
      setPageSchema(schema);
      if (schema.pageId === 'default') {
        // The default is always available in the bundle; don't cache it as if it were
        // a custom page or allow it to suppress an online refresh for 60 seconds.
        clientDataCache.invalidate(HOMEPAGE_LIVE_CACHE_KEY);
      } else {
        clientDataCache.set(HOMEPAGE_LIVE_CACHE_KEY, { success: true, config: schema }, 60 * 1000, true);
      }
    };

    const applyServerPayload = (payload: { success?: boolean; config?: unknown } | null | undefined) => {
      if (payload && isValidPageSchema(payload.config)) {
        commitSchema(payload.config);
        return true;
      }
      // An explicit successful response with no published schema means use the
      // built-in home. Invalid/transient data must not replace a last-known-good page.
      if (payload?.success === true && payload.config == null) {
        commitSchema(getDefaultHomepageSchema());
        return true;
      }
      return false;
    };

    const resolveToFallbackIfNeeded = () => {
      if (!isMounted || hasResolvedHomepage) return;
      commitSchema(getDefaultHomepageSchema());
    };

    // On a first-ever visit, keep a lightweight loading surface while checking
    // whether a custom homepage is published. Returning visits render their local
    // cached version immediately and refresh it in the background.
    if (!hasResolvedHomepage) {
      fallbackTimer = setTimeout(resolveToFallbackIfNeeded, 3500);
    }

    // Clear any legacy cache payload that represents the bundled default or invalid data.
    // Otherwise a fresh-but-not-custom cache entry could suppress a needed network refresh.
    const existingHomepagePayload = clientDataCache.get<{ success?: boolean; config?: unknown }>(HOMEPAGE_LIVE_CACHE_KEY);
    if (existingHomepagePayload && (
      !existingHomepagePayload.success ||
      !isValidPageSchema(existingHomepagePayload.config) ||
      existingHomepagePayload.config.pageId === 'default'
    )) {
      clientDataCache.invalidate(HOMEPAGE_LIVE_CACHE_KEY);
    }

    clientDataCache.fetchWithSWR<{ success?: boolean; config?: unknown }>(
      HOMEPAGE_LIVE_CACHE_KEY,
      () => fetchApi('/api/homepage/live').then((res) => res.json()),
      {
        ttlMs: 60 * 1000,
        onFreshData: (payload) => {
          if (isMounted) applyServerPayload(payload);
        },
      }
    ).then((payload) => {
      if (!isMounted) return;
      if (!applyServerPayload(payload)) resolveToFallbackIfNeeded();
    }).catch(() => resolveToFallbackIfNeeded());

    // Realtime updates are accepted only when they contain a complete, valid schema.
    // An empty/partial Firestore document must never wipe a working cached homepage.
    const unsubscribeFirestore = onSnapshot(
      doc(db, 'settings', 'homepage'),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        // A Firestore disk-cache emission is never proof that the bundled default is
        // the currently published page. It also must not overwrite a custom page already
        // restored from our last-known-good cache while offline.
        if (snapshot.metadata.fromCache && (
          hasResolvedHomepage || data?.config?.pageId === 'default'
        )) return;
        if (isMounted && isValidPageSchema(data?.config)) commitSchema(data.config);
      },
      () => {}
    );

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
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
          className="w-full pb-16 relative overflow-hidden bg-[#FAF8F5]"
        >
          {/* Subtle warm champagne & emerald ambient glows */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 z-0"
            style={{
              background:
                "radial-gradient(ellipse at 20% 10%, rgba(6,78,59,0.1) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(248,231,201,0.2) 0%, transparent 60%)",
            }}
          />

          {pageSchema ? (
            pageSchema.pageId === 'default' && pageSchema.type === 'BUILT_IN' ? (
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
