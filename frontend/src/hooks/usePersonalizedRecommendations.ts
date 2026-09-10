import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuthStore } from '../lib/store';
import { useDataStore } from '../lib/dataStore';

export interface RecommendedProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  basePrice?: number;
  offerPrice?: number;
  image: string;
  category?: string;
  isVegetarian?: boolean;
  isAvailable: boolean;
  hasVariants?: boolean;
  recommendationReason?: string;
  lastOrderedDate?: string;
  orderCount?: number;
  rawProduct: any;
}

export interface RecommendationResult {
  isReturningCustomer: boolean;
  isLoading: boolean;
  orderAgainItems: RecommendedProduct[];
  favoriteItems: RecommendedProduct[];
  categoryRecommendations: RecommendedProduct[];
  curatedHighlights: RecommendedProduct[];
  preferredCategory: string | null;
}

export function usePersonalizedRecommendations(): RecommendationResult {
  const { user, isAuthenticated } = useAuthStore();
  const { products, combos } = useDataStore();

  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);

  // Fetch real previous customer orders from Firestore (max 15 recent orders)
  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated || !user?.uid) {
      setOrderHistory([]);
      setIsLoadingOrders(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(15)
        );

        const snap = await getDocs(q);
        if (isMounted) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setOrderHistory(docs);
        }
      } catch (err) {
        console.warn('[usePersonalizedRecommendations] Notice while fetching customer orders:', err);
        if (isMounted) setOrderHistory([]);
      } finally {
        if (isMounted) setIsLoadingOrders(false);
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.uid]);

  // Map of active, available catalog products by ID for fast lookup and authoritative pricing
  const availableCatalogMap = useMemo(() => {
    const map = new Map<string, any>();
    
    (products || []).forEach((p: any) => {
      if (p.isActive !== false && p.isAvailable !== false) {
        map.set(p.id, p);
      }
    });

    (combos || []).forEach((c: any) => {
      if (c.isActive !== false && c.isAvailable !== false) {
        map.set(c.id, c);
      }
    });

    return map;
  }, [products, combos]);

  // Transform raw catalog product into a verified RecommendedProduct
  const toRecommendedProduct = (
    raw: any,
    reason?: string,
    lastDate?: string,
    count?: number
  ): RecommendedProduct => {
    const basePrice = Number(raw.basePrice || raw.price || 0);
    const offerPrice = Number(raw.offerPrice || 0);
    const hasDiscount = offerPrice > 0 && offerPrice < basePrice;
    const finalPrice = hasDiscount ? offerPrice : basePrice;

    const hasVariants =
      (raw.variants && raw.variants.length > 0) ||
      (raw.sizes && raw.sizes.length > 0) ||
      (raw.crusts && raw.crusts.length > 0);

    return {
      id: raw.id,
      name: raw.productName || raw.name,
      description: raw.description,
      price: finalPrice,
      basePrice: hasDiscount ? basePrice : undefined,
      offerPrice: hasDiscount ? offerPrice : undefined,
      image: raw.imageUrl || raw.image || '/images/pizza-placeholder.webp',
      category: raw.category,
      isVegetarian: raw.isVegetarian !== undefined ? Boolean(raw.isVegetarian) : Boolean(raw.isVeg ?? false),
      isAvailable: true,
      hasVariants,
      recommendationReason: reason,
      lastOrderedDate: lastDate,
      orderCount: count,
      rawProduct: raw,
    };
  };

  // Smart Recommendation Engine Logic
  return useMemo(() => {
    const isReturning = isAuthenticated && orderHistory.length > 0;

    // ── CASE 1: Returning Customer with Real History ──
    if (isReturning) {
      const productOrderFrequency = new Map<string, { count: number; lastDate: string }>();
      const categoryFrequency = new Map<string, number>();

      orderHistory.forEach((order) => {
        const orderDate = order.createdAt ? new Date(order.createdAt).toISOString() : '';
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const pid = item.productId || item.menuItemId || item.id;
            if (!pid) return;

            const existing = productOrderFrequency.get(pid);
            if (existing) {
              existing.count += item.quantity || 1;
            } else {
              productOrderFrequency.set(pid, {
                count: item.quantity || 1,
                lastDate: orderDate,
              });
            }

            // Find catalog category
            const catalogItem = availableCatalogMap.get(pid);
            if (catalogItem?.category) {
              const cat = catalogItem.category.toLowerCase();
              categoryFrequency.set(cat, (categoryFrequency.get(cat) || 0) + (item.quantity || 1));
            }
          });
        }
      });

      // 1. "Ready for your usual?" / Order Again: Top 3 recently ordered available items
      const orderAgainCandidates: RecommendedProduct[] = [];
      for (const [pid, meta] of productOrderFrequency.entries()) {
        const catalogItem = availableCatalogMap.get(pid);
        if (catalogItem) {
          orderAgainCandidates.push(
            toRecommendedProduct(catalogItem, 'Ordered recently', meta.lastDate, meta.count)
          );
        }
        if (orderAgainCandidates.length >= 3) break;
      }

      // 2. "Your Favorites": Items ordered >= 2 times
      const favoriteCandidates: RecommendedProduct[] = [];
      for (const [pid, meta] of productOrderFrequency.entries()) {
        if (meta.count >= 2) {
          const catalogItem = availableCatalogMap.get(pid);
          if (catalogItem && !orderAgainCandidates.some((o) => o.id === pid)) {
            favoriteCandidates.push(
              toRecommendedProduct(catalogItem, 'Frequently ordered by you', meta.lastDate, meta.count)
            );
          }
        }
        if (favoriteCandidates.length >= 3) break;
      }

      // 3. Category Recommendations: Find top preferred category
      let topCategory: string | null = null;
      let maxCatCount = 0;
      categoryFrequency.forEach((cnt, cat) => {
        if (cnt > maxCatCount) {
          maxCatCount = cnt;
          topCategory = cat;
        }
      });

      const categoryRecs: RecommendedProduct[] = [];
      if (topCategory) {
        (products || []).forEach((p: any) => {
          if (
            p.category &&
            p.category.toLowerCase() === topCategory &&
            availableCatalogMap.has(p.id) &&
            !productOrderFrequency.has(p.id) // Discover something they haven't tried yet
          ) {
            categoryRecs.push(
              toRecommendedProduct(p, `Because you enjoy ${topCategory}`)
            );
          }
        });
      }

      return {
        isReturningCustomer: true,
        isLoading: isLoadingOrders,
        orderAgainItems: orderAgainCandidates,
        favoriteItems: favoriteCandidates,
        categoryRecommendations: categoryRecs.slice(0, 3),
        curatedHighlights: [],
        preferredCategory: topCategory,
      };
    }

    // ── CASE 2: New Customer (or unauthenticated) ──
    // Do NOT invent preferences! Surface a curated selection of 3-4 real items.
    const candidates = (products || []).filter(
      (p: any) => p.isActive !== false && p.isAvailable !== false && !p.isComboOnly
    );

    // Prefer genuinely marked featured items
    const featuredItems = candidates.filter((p: any) => p.isFeatured || p.featured);
    const selectedCurated =
      featuredItems.length >= 3 ? featuredItems.slice(0, 4) : candidates.slice(0, 4);

    const curatedHighlights = selectedCurated.map((p: any) =>
      toRecommendedProduct(p, p.isFeatured ? 'Chef Pick' : 'Popular in Rajnandgaon')
    );

    return {
      isReturningCustomer: false,
      isLoading: isLoadingOrders,
      orderAgainItems: [],
      favoriteItems: [],
      categoryRecommendations: [],
      curatedHighlights,
      preferredCategory: null,
    };
  }, [isAuthenticated, orderHistory, availableCatalogMap, products, isLoadingOrders]);
}
