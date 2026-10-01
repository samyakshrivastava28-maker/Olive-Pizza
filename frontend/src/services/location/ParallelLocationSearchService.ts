/**
 * ParallelLocationSearchService — Multi-Provider Concurrent Location Search
 *
 * Implements a concurrent multi-provider search architecture (NO sequential fallback chain):
 * - Queries Mapbox, Geoapify, OpenStreetMap (Photon + Nominatim), and Mappls in parallel.
 * - Streams progressive/partial results immediately (e.g. fast provider in 200ms), then smoothly merges
 *   subsequent provider results without jumping.
 * - Session ID / Request ID tracking guarantees stale queries never overwrite newer searches.
 * - Spatial clustering (<180m) and string similarity deduplication.
 * - Multi-provider agreement confidence scoring with GPS proximity bias.
 */

import { fetchApi } from '../../lib/config';

export interface NormalizedLocationResult {
  id: string;
  provider: 'mapbox' | 'geoapify' | 'photon' | 'nominatim' | 'mappls' | 'local' | 'backend';
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  type?: string;
  relevance?: number;
  matchedProviders: string[];
  providerCount: number;
  isServiceable?: boolean;
  serviceabilityMessage?: string;
  distanceKm?: number;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface ParallelSearchOptions {
  city?: string;
  lat?: number;
  lng?: number;
  limit?: number;
  onPartialResults?: (results: NormalizedLocationResult[], isFinal: boolean) => void;
}

// In-memory cache for recent queries (5 minutes TTL)
interface CacheEntry {
  timestamp: number;
  results: NormalizedLocationResult[];
}
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export class ParallelLocationSearchService {
  private static activeSessionId = 0;
  private static activeAbortController: AbortController | null = null;

  public static haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Main parallel search method.
   * Dispatches concurrent queries, immediately streams early partial results,
   * merges subsequent providers, and ranks via cross-provider confidence.
   */
  public static async search(
    query: string,
    options: ParallelSearchOptions = {}
  ): Promise<NormalizedLocationResult[]> {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      options.onPartialResults?.([], true);
      return [];
    }

    // 1. Session ID management — cancel previous in-flight requests
    this.activeSessionId += 1;
    const currentSessionId = this.activeSessionId;

    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    const abortController = new AbortController();
    this.activeAbortController = abortController;

    const city = options.city || '';
    const biasLat = options.lat;
    const biasLng = options.lng;
    const limit = options.limit || 8;

    // Check memory cache
    const cacheKey = `${cleanQuery.toLowerCase()}_${city.toLowerCase()}_${biasLat?.toFixed(2) || ''}_${biasLng?.toFixed(2) || ''}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      options.onPartialResults?.(cached.results, true);
      return cached.results;
    }

    // Running accumulator of normalized results
    let accumulatedResults: NormalizedLocationResult[] = [];

    const handleNewProviderResults = (newItems: NormalizedLocationResult[], isFinal: boolean) => {
      // Discard if session is stale (user typed newer query)
      if (currentSessionId !== this.activeSessionId) return;

      accumulatedResults = this.combineAndDeduplicate(accumulatedResults, newItems);
      const ranked = this.rankResults(accumulatedResults, cleanQuery, biasLat, biasLng).slice(0, limit);

      options.onPartialResults?.(ranked, isFinal);
    };

    // 2. Concurrently start all enabled search providers
    const promises: Promise<void>[] = [];

    // Branch A: Direct fast client-side Photon (OSM) search (sub-250ms for instant initial results)
    promises.push(
      (async () => {
        try {
          const directPhotonResults = await this.queryDirectPhoton(
            cleanQuery,
            city,
            biasLat,
            biasLng,
            abortController.signal
          );
          if (directPhotonResults.length > 0) {
            handleNewProviderResults(directPhotonResults, false);
          }
        } catch {
          // Non-fatal: other providers will contribute
        }
      })()
    );

    // Branch B: Backend Authoritative Multi-Provider Engine (Mapbox, Geoapify, Nominatim, Mappls + Serviceability)
    promises.push(
      (async () => {
        try {
          const backendParams = new URLSearchParams({
            q: cleanQuery,
            city,
            limit: String(limit),
          });
          if (biasLat != null && biasLng != null) {
            backendParams.append('lat', String(biasLat));
            backendParams.append('lng', String(biasLng));
          }

          const res = await fetchApi(`/api/location/search-parallel?${backendParams.toString()}`, {
            signal: abortController.signal,
          });

          if (res.ok) {
            const data = await res.json();
            if (data?.success && Array.isArray(data.results)) {
              handleNewProviderResults(data.results, false);
            }
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn('[ParallelLocationSearch] Backend search warning:', err?.message);
          }
        }
      })()
    );

    // Wait for all providers to settle
    await Promise.allSettled(promises);

    // Final check for session freshness
    if (currentSessionId !== this.activeSessionId) {
      return [];
    }

    const finalRanked = this.rankResults(accumulatedResults, cleanQuery, biasLat, biasLng).slice(0, limit);

    // Cache the merged results
    if (finalRanked.length > 0) {
      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        results: finalRanked,
      });
    }

    options.onPartialResults?.(finalRanked, true);
    return finalRanked;
  }

  // ─── Direct Fast Photon Query (Instant Client-Side OSM Provider) ───────────
  private static async queryDirectPhoton(
    query: string,
    city: string,
    lat?: number,
    lng?: number,
    signal?: AbortSignal
  ): Promise<NormalizedLocationResult[]> {
    const q = city ? `${query} ${city}` : query;
    const params = new URLSearchParams({
      q,
      limit: '8',
      lang: 'en',
    });
    if (lat != null && lng != null) {
      params.append('lat', String(lat));
      params.append('lon', String(lng));
    }

    const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
      signal,
    });

    if (!res.ok) return [];
    const data = await res.json();
    const features = data?.features || [];

    const results: NormalizedLocationResult[] = [];
    for (const feat of features) {
      const props = feat.properties || {};
      const coords = feat.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;

      const longitude = Number(coords[0]);
      const latitude = Number(coords[1]);
      if (isNaN(latitude) || isNaN(longitude)) continue;

      const name = (props.name || props.street || query).trim();
      const subtitleParts = [
        props.street,
        props.locality || props.district || props.suburb,
        props.city || city,
        props.state,
        props.country || 'India',
      ].filter(Boolean).filter((val, idx, arr) => arr.indexOf(val) === idx);

      const formattedAddress = [name, ...subtitleParts.filter((p) => p !== name)].join(', ');

      results.push({
        id: `photon_${props.osm_id || Math.random().toString(36).substring(2, 9)}`,
        provider: 'photon',
        name,
        formattedAddress,
        latitude,
        longitude,
        city: props.city || city,
        district: props.district || props.county,
        state: props.state,
        country: props.country || 'India',
        pincode: props.postcode,
        type: props.osm_value || props.type || 'place',
        relevance: 0.8,
        matchedProviders: ['photon'],
        providerCount: 1,
        address: {
          road: props.street,
          suburb: props.locality || props.district,
          city: props.city || city,
          state: props.state,
          postcode: props.postcode,
          country: props.country || 'India',
        },
      });
    }

    return results;
  }

  // ─── Deduplication: Spatial Clustering (<180m) + Semantic Matching ─────────
  private static combineAndDeduplicate(
    existingList: NormalizedLocationResult[],
    newCandidates: NormalizedLocationResult[]
  ): NormalizedLocationResult[] {
    const merged = [...existingList];

    for (const candidate of newCandidates) {
      const matchIndex = merged.findIndex((existing) => {
        // Physical distance check (< 180 meters)
        const distKm = this.haversineDistanceKm(
          existing.latitude,
          existing.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (distKm < 0.18) return true;

        // Semantic check (< 1.2km and near-identical name)
        if (distKm < 1.2) {
          const normA = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normB = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
            return true;
          }
        }

        return false;
      });

      if (matchIndex >= 0) {
        const existing = merged[matchIndex];
        // Combine provider tags
        for (const p of candidate.matchedProviders || [candidate.provider]) {
          if (!existing.matchedProviders.includes(p)) {
            existing.matchedProviders.push(p);
            existing.providerCount += 1;
          }
        }

        // Retain more comprehensive address data
        if (candidate.formattedAddress.length > existing.formattedAddress.length && candidate.formattedAddress.includes(',')) {
          existing.formattedAddress = candidate.formattedAddress;
        }
        if (!existing.pincode && candidate.pincode) existing.pincode = candidate.pincode;
        if (!existing.city && candidate.city) existing.city = candidate.city;
        if (!existing.district && candidate.district) existing.district = candidate.district;
        if (!existing.state && candidate.state) existing.state = candidate.state;
        if (candidate.isServiceable !== undefined) existing.isServiceable = candidate.isServiceable;
        if (candidate.serviceabilityMessage) existing.serviceabilityMessage = candidate.serviceabilityMessage;
        if (candidate.distanceKm !== undefined) existing.distanceKm = candidate.distanceKm;
      } else {
        merged.push({
          ...candidate,
          matchedProviders: candidate.matchedProviders?.length ? candidate.matchedProviders : [candidate.provider],
          providerCount: candidate.providerCount || 1,
        });
      }
    }

    return merged;
  }

  // ─── Ranking: Multi-Provider Agreement + Text Relevance + Proximity Bias ──
  private static rankResults(
    items: NormalizedLocationResult[],
    query: string,
    biasLat?: number,
    biasLng?: number
  ): NormalizedLocationResult[] {
    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

    const scored = items.map((item) => {
      let score = item.relevance || 0.7;

      // 1. Cross-provider agreement boost (+0.35 per agreeing provider)
      score += (item.providerCount - 1) * 0.35;

      // 2. Query Text Relevance
      const itemName = item.name.toLowerCase();
      const itemAddress = item.formattedAddress.toLowerCase();

      if (itemName === cleanQuery) {
        score += 0.6;
      } else if (itemName.startsWith(cleanQuery)) {
        score += 0.4;
      } else if (itemName.includes(cleanQuery)) {
        score += 0.25;
      }

      const coveredTokens = queryTokens.filter((token) => itemName.includes(token) || itemAddress.includes(token));
      score += (coveredTokens.length / Math.max(1, queryTokens.length)) * 0.3;

      // 3. Proximity Bias
      if (biasLat != null && biasLng != null) {
        const distKm = this.haversineDistanceKm(biasLat, biasLng, item.latitude, item.longitude);
        if (distKm <= 3) score += 0.45;
        else if (distKm <= 10) score += 0.3;
        else if (distKm <= 25) score += 0.15;
        else if (distKm > 60) score -= 0.3;
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.item);
  }
}
