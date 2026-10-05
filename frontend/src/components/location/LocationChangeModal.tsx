import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Search,
  Plus,
  Home,
  Briefcase,
  X,
  ChevronRight,
  AlertCircle,
  Check,
  Loader2,
  ArrowLeft,
  Clock,
  Sparkles,
  Map as MapIcon,
  Crosshair,
  Building,
  Compass,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { LocationManager } from '../../lib/permissions';
import { OrderingContextService } from '../../lib/orderingContext';
import {
  ParallelLocationSearchService,
  NormalizedLocationResult,
} from '../../services/location/ParallelLocationSearchService';
import { fetchApi } from '../../lib/config';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon asset paths for standard bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface SavedAddress {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  customTag?: string;
  addressLine: string;
  houseFlat?: string;
  floor?: string;
  streetArea?: string;
  landmark?: string;
  pincode?: string;
  instructions?: string;
  city?: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

const SAVED_ADDRESSES_KEY = 'op_saved_addresses';
const ACTIVE_LOCATION_KEY = 'op_active_location';

/**
 * Global trigger to open the Location Change Modal from anywhere in the app
 */
export const openLocationModal = () => {
  window.dispatchEvent(new CustomEvent('open-location-modal'));
};

// Map View Controller Helper to smoothly move & invalidate container sizing
function MapController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
      map.setView([center.lat, center.lng], zoom, { animate: true });
    }
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

// Leaflet Map Click and Move Event Handler
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationChangeModal() {
  const { user, setUser, role } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'main' | 'search' | 'map' | 'details' | 'limit_reached'>('main');

  // Location detection states
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsFailedOrOff, setGpsFailedOrOff] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Permanently delete a saved address from Firestore and backend
  const handleDeleteAddress = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingAddressId(id);
    try {
      // 1. Delete on backend
      await fetchApi(`/api/location/addresses/${id}`, { method: 'DELETE' }).catch(() => {});

      // 2. Delete on Firestore directly
      if (user?.uid) {
        const remaining = savedAddresses.filter((a) => a.id !== id);
        await updateDoc(doc(db, 'users', user.uid), {
          addresses: remaining,
          savedAddresses: remaining,
        }).catch(() => {});
      }

      const updated = savedAddresses.filter((a) => a.id !== id);
      setSavedAddresses(updated);
      try {
        localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updated));
      } catch {}

      toast.success('Location permanently deleted! 🗑️');
      if (view === 'limit_reached' && updated.length < 8) {
        setView('search');
      }
    } catch (err: any) {
      console.error('[LocationChangeModal] Delete error:', err);
      toast.error('Failed to delete address. Please try again.');
    } finally {
      setDeletingAddressId(null);
    }
  };

  // Search state (Parallel Multi-Provider)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedLocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive Map State
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: user?.lat || 21.0963,
    lng: user?.lng || 81.0335,
  });
  const [mapZoom, setMapZoom] = useState(16);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const reverseGeocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detailed address fields (matching SetupLocation.tsx)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: user?.lat || 21.0963,
    lng: user?.lng || 81.0335,
  });
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [customTag, setCustomTag] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [floor, setFloor] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [savingLocation, setSavingLocation] = useState(false);

  // Load saved addresses from Firestore and localStorage
  const loadSavedAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    let localList: SavedAddress[] = [];
    try {
      const stored = localStorage.getItem(SAVED_ADDRESSES_KEY);
      if (stored) {
        localList = JSON.parse(stored);
      }
    } catch {}

    if (user?.uid) {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const remoteList = (snap.data().addresses || []) as SavedAddress[];
          const ids = new Set(remoteList.map((a) => a.id));
          const combined = [...remoteList, ...localList.filter((a) => !ids.has(a.id))];
          setSavedAddresses(combined);
          localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(combined));
          setLoadingAddresses(false);
          return;
        }
      } catch (err) {
        console.warn('[LocationChangeModal] Error fetching user addresses:', err);
      }
    }

    setSavedAddresses(localList);
    setLoadingAddresses(false);
  }, [user?.uid]);

  // Listen to global open event
  useEffect(() => {
    const handleOpen = () => {
      setView('main');
      setGpsFailedOrOff(false);
      setIsOpen(true);
      loadSavedAddresses();
    };

    window.addEventListener('open-location-modal', handleOpen);
    return () => window.removeEventListener('open-location-modal', handleOpen);
  }, [loadSavedAddresses]);

  // Initial startup prompt:
  // If active delivery location is missing or device location is off, ask user
  useEffect(() => {
    const checkInitialLocation = async () => {
      const activeLoc = localStorage.getItem(ACTIVE_LOCATION_KEY);
      if (user?.lat && user?.fullAddress) return;
      if (activeLoc) {
        try {
          const parsed = JSON.parse(activeLoc);
          if (parsed.lat && parsed.fullAddress) return;
        } catch {}
      }

      // Check permission state
      const state = await LocationManager.checkPermissionState();
      if (state === 'denied' || state === 'prompt' || !user?.lat) {
        const timer = setTimeout(() => {
          setGpsFailedOrOff(state === 'denied');
          loadSavedAddresses();
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    };

    checkInitialLocation();
  }, [user?.lat, user?.fullAddress, loadSavedAddresses]);

  // Reverse geocoding helper (server proxy + OSM fallback)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      // 1. Try server proxy
      const res = await fetchApi(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json().catch(() => null);
      if (data?.success && data?.location) {
        const r = data.location;
        const area = [r.road, r.neighbourhood, r.suburb].filter(Boolean).join(', ') || r.displayName || '';
        setStreetArea(area);
        if (r.postcode) setPincode(r.postcode);
        return;
      }
    } catch {}

    // 2. Direct fast OSM Nominatim fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const road = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');
        setStreetArea(road || data.name || data.display_name);
        if (addr.postcode) setPincode(addr.postcode);
      }
    } catch (err) {
      console.warn('[LocationChangeModal] Reverse geocode error:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // Commit and apply selected delivery location
  const applyLocation = async (lat: number, lng: number, addressLine: string, addressName?: string) => {
    setSavingLocation(true);
    try {
      // 1. Authoritative ordering context resolution
      const resolution = await OrderingContextService.resolveContext({
        lat,
        lng,
        addressLine,
        customerId: user?.uid,
      });

      // 2. Cache in localStorage
      const activeLocationPayload = {
        lat,
        lng,
        fullAddress: addressLine,
        name: addressName || 'Selected Location',
        isServiceable: resolution.isServiceable,
        branchName: resolution.context?.branchName,
      };
      localStorage.setItem(ACTIVE_LOCATION_KEY, JSON.stringify(activeLocationPayload));
      LocationManager.setCachedLocation({
        lat,
        lng,
        fullAddress: addressLine,
      });

      // 3. Update auth store
      if (user) {
        setUser(
          {
            ...user,
            lat,
            lng,
            fullAddress: addressLine,
            locationSetupCompleted: true,
          },
          role || 'customer'
        );

        // Update Firestore in background if logged in
        if (user.uid) {
          updateDoc(doc(db, 'users', user.uid), {
            lat,
            lng,
            fullAddress: addressLine,
            locationSetupCompleted: true,
          }).catch(() => {});
        }
      }

      // 4. Notify app listeners
      window.dispatchEvent(
        new CustomEvent('location-changed', {
          detail: { lat, lng, fullAddress: addressLine, isServiceable: resolution.isServiceable },
        })
      );

      if (!resolution.isServiceable) {
        toast.error(resolution.error || 'This location is outside our delivery zone. Takeaway only.', {
          duration: 4000,
        });
      } else {
        toast.success(`Delivering to ${addressName || 'your address'}! 🍕`);
      }

      setIsOpen(false);
      setView('main');
    } catch (err: any) {
      console.error('[LocationChangeModal] Apply error:', err);
      toast.error('Could not set location. Please try again.');
    } finally {
      setSavingLocation(false);
    }
  };

  // Detect via device GPS
  const handleDetectGps = async () => {
    setDetectingGps(true);
    setGpsFailedOrOff(false);
    try {
      const loc = await LocationManager.getCurrentLocation({
        forcePrompt: true,
        fallbackToCache: false,
      });

      if (loc && loc.lat && loc.lng) {
        const address = loc.fullAddress || 'Current GPS Location';
        await applyLocation(loc.lat, loc.lng, address, 'Current Location');
      } else {
        throw new Error('No GPS coordinates returned');
      }
    } catch (err: any) {
      console.warn('[LocationChangeModal] GPS error:', err);
      setGpsFailedOrOff(true);
      toast.error(
        'Device location is turned off or blocked. Please select from saved locations, search your address, or select on map.'
      );
    } finally {
      setDetectingGps(false);
    }
  };

  // Multi-Provider Fast Autocomplete search handler
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        await ParallelLocationSearchService.search(query.trim(), {
          lat: user?.lat || 21.0963,
          lng: user?.lng || 81.0335,
          limit: 8,
          onPartialResults: (partial, isFinal) => {
            setSearchResults(partial);
            if (isFinal) setIsSearching(false);
          },
        });
      } catch (err) {
        console.warn('[LocationChangeModal] Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  // Select a search result
  const handleSelectSearchResult = (result: NormalizedLocationResult) => {
    setSelectedCoords({ lat: result.latitude, lng: result.longitude });
    setMapCenter({ lat: result.latitude, lng: result.longitude });
    setStreetArea(result.formattedAddress || result.name);
    if (result.pincode) setPincode(result.pincode);
    setView('details');
  };

  // Open map to select/fine-tune
  const handleOpenMap = (initialCoords?: { lat: number; lng: number }) => {
    const coords = initialCoords || selectedCoords || { lat: 21.0963, lng: 81.0335 };
    setMapCenter(coords);
    setSelectedCoords(coords);
    setView('map');
    reverseGeocode(coords.lat, coords.lng);
  };

  // Map pin changed by click or marker drag
  const handleMapCoordChange = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    setMapCenter({ lat, lng });
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    reverseGeocodeTimerRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 400);
  };

  // Map GPS Locate button
  const handleMapLocateMe = async () => {
    try {
      const loc = await LocationManager.getCurrentLocation({ forcePrompt: true, fallbackToCache: false });
      if (loc && loc.lat && loc.lng) {
        handleMapCoordChange(loc.lat, loc.lng);
        setMapZoom(17);
        toast.success('Centered on your GPS location! 📍');
      }
    } catch {
      toast.error('Unable to retrieve device GPS. Please drag pin manually.');
    }
  };

  // Save new address with full details (matching SetupLocation.tsx)
  const handleConfirmFullAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!houseFlat.trim()) {
      toast.error('Please enter your House / Flat / Office number');
      return;
    }

    if (saveToProfile && savedAddresses.length >= 8) {
      toast.error('Location limit reached (8/8). Please delete an existing location first.');
      setView('limit_reached');
      setSavingLocation(false);
      return;
    }

    setSavingLocation(true);

    const parts = [houseFlat.trim(), floor.trim(), streetArea.trim(), landmark.trim(), pincode.trim()].filter(Boolean);
    const fullAddressLine = parts.join(', ');

    const resolvedTagName =
      addressType === 'Other' && customTag.trim() ? customTag.trim() : addressType;

    const newEntry: SavedAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: addressType,
      customTag: customTag.trim() || undefined,
      addressLine: fullAddressLine,
      houseFlat: houseFlat.trim(),
      floor: floor.trim() || undefined,
      streetArea: streetArea.trim(),
      landmark: landmark.trim() || undefined,
      pincode: pincode.trim() || undefined,
      instructions: instructions.trim() || undefined,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng,
      isDefault: savedAddresses.length === 0,
    };

    if (saveToProfile) {
      const updated = [newEntry, ...savedAddresses];
      setSavedAddresses(updated);
      try {
        localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updated));
      } catch {}

      if (user?.uid) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            addresses: updated,
            savedAddresses: updated,
          });
          // Also persist authoritatively to backend
          await fetchApi('/api/location/save', {
            method: 'POST',
            body: JSON.stringify({
              id: newEntry.id,
              formattedAddress: newEntry.addressLine,
              lat: newEntry.lat,
              lng: newEntry.lng,
              houseFlat: newEntry.houseFlat,
              floor: newEntry.floor,
              streetArea: newEntry.streetArea,
              landmark: newEntry.landmark,
              pincode: newEntry.pincode,
              instructions: newEntry.instructions,
              type: newEntry.type,
              label: resolvedTagName,
            }),
          }).catch(() => {});
        } catch (err) {
          console.warn('[LocationChangeModal] Save address error:', err);
        }
      }
    }

    await applyLocation(newEntry.lat, newEntry.lng, newEntry.addressLine, resolvedTagName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-opacity">
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full sm:max-w-lg bg-[#131B16] text-white rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0E1511]">
          <div className="flex items-center gap-2.5">
            {view !== 'main' ? (
              <button
                type="button"
                onClick={() => {
                  if (view === 'details') setView(searchQuery ? 'search' : 'main');
                  else setView('main');
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <MapPin className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                {view === 'main' && 'Delivery Location'}
                {view === 'search' && 'Search Delivery Address'}
                {view === 'map' && 'Select Spot on Map'}
                {view === 'details' && 'Address Details'}
                {view === 'limit_reached' && 'Saved Locations Limit (8/8)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {view === 'main' && 'Choose or add your active delivery address'}
                {view === 'search' && 'Instant multi-provider location search'}
                {view === 'map' && 'Drag pin or tap map to set exact delivery entrance'}
                {view === 'details' && 'House number, floor & delivery notes'}
                {view === 'limit_reached' && 'You have reached 8 saved addresses. Delete one to add a new address.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* ── VIEW 1: MAIN (GPS / Search / Map / Saved) ── */}
          {view === 'main' && (
            <>
              {/* Location Off Warning Banner */}
              {gpsFailedOrOff && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block mb-0.5">Device Location Is Turned Off</span>
                    We couldn't detect your live GPS. Please choose a saved location, search your address, or pick on map.
                  </div>
                </div>
              )}

              {/* Action 1: Use Current GPS */}
              <button
                type="button"
                onClick={handleDetectGps}
                disabled={detectingGps}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.99] border border-emerald-500/30 text-white font-bold text-sm flex items-center justify-between shadow-lg shadow-emerald-900/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                    {detectingGps ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Navigation className="w-4 h-4 text-emerald-200 group-hover:rotate-45 transition-transform" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-black">Use Current Location</span>
                    <span className="text-[11px] text-emerald-200/80 font-normal">
                      {detectingGps ? 'Detecting high-accuracy GPS...' : 'Auto-detect using device GPS'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-300/70 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Action 2: Search or Map buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setView('search')}
                  className="py-3 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Search Location</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenMap()}
                  className="py-3 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MapIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Select on Map</span>
                </button>
              </div>

              {/* Section: Saved Addresses */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Saved Locations ({savedAddresses.length}/8)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (savedAddresses.length >= 8) {
                        toast.error('Location limit reached (8/8). Delete a location to add a new one.');
                        setView('limit_reached');
                        return;
                      }
                      setHouseFlat('');
                      setFloor('');
                      setStreetArea('');
                      setLandmark('');
                      setPincode('');
                      setInstructions('');
                      setView('search');
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New
                  </button>
                </div>

                {loadingAddresses ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  </div>
                ) : savedAddresses.length === 0 ? (
                  <div className="py-6 px-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center space-y-2">
                    <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No saved locations found yet.</p>
                    <button
                      type="button"
                      onClick={() => setView('search')}
                      className="text-xs text-amber-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add your first delivery address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => {
                      const isActive =
                        user?.fullAddress === addr.addressLine ||
                        (Math.abs((user?.lat || 0) - addr.lat) < 0.0005 &&
                          Math.abs((user?.lng || 0) - addr.lng) < 0.0005);

                      return (
                        <div
                          key={addr.id}
                          onClick={() => applyLocation(addr.lat, addr.lng, addr.addressLine, addr.customTag || addr.type)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-md'
                              : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                addr.type === 'Home'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : addr.type === 'Work'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {addr.type === 'Home' ? (
                                <Home className="w-4 h-4" />
                              ) : addr.type === 'Work' ? (
                                <Briefcase className="w-4 h-4" />
                              ) : (
                                <MapPin className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white uppercase tracking-wide">
                                  {addr.customTag || addr.type}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 truncate mt-0.5 max-w-[220px] sm:max-w-[280px]">
                                {addr.addressLine}
                              </p>
                              {addr.landmark && (
                                <span className="text-[10px] text-slate-400 block truncate">Near {addr.landmark}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAddress(addr.id, e)}
                              disabled={deletingAddressId === addr.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete saved location"
                            >
                              {deletingAddressId === addr.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {isActive ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-amber-400 group-hover:underline">
                                Select
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── VIEW 2: SEARCH (Multi-provider Autocomplete) ── */}
          {view === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Enter apartment, street, colony, or landmark..."
                  autoFocus
                  className="w-full py-3 pl-10 pr-10 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                ) : (
                  searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>

              {/* Direct Select On Map banner */}
              <button
                type="button"
                onClick={() => handleOpenMap()}
                className="w-full p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40 text-emerald-200 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-emerald-400" />
                  <span>Can't find your exact building? Pick on Map</span>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Fast Multi-Provider Results List */}
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto divide-y divide-white/5">
                {searchResults.map((res, i) => (
                  <div
                    key={`${res.provider}-${res.id || i}`}
                    onClick={() => handleSelectSearchResult(res)}
                    className="p-3 rounded-2xl hover:bg-white/10 border border-transparent hover:border-white/15 transition-all cursor-pointer flex items-start gap-3 group"
                  >
                    <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white truncate block">{res.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md uppercase shrink-0">
                          {res.provider}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block line-clamp-2 mt-0.5 leading-snug">
                        {res.formattedAddress}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}

                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-3">
                    <p>No matching addresses found for "{searchQuery}".</p>
                    <button
                      type="button"
                      onClick={() => handleOpenMap()}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <MapIcon className="w-3.5 h-3.5" /> Pin on Map Instead
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VIEW 3: INTERACTIVE MAP PIN (Leaflet) ── */}
          {view === 'map' && (
            <div className="space-y-3">
              <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-white/15 shadow-inner">
                <MapContainer
                  center={[selectedCoords.lat, selectedCoords.lng]}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController center={mapCenter} zoom={mapZoom} />
                  <MapClickHandler onClick={handleMapCoordChange} />
                  <Marker
                    position={[selectedCoords.lat, selectedCoords.lng]}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const m = e.target.getLatLng();
                        handleMapCoordChange(m.lat, m.lng);
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-bold text-slate-900">Delivery Spot</div>
                      <div className="text-[11px] text-slate-600 truncate max-w-xs">{streetArea || 'Pinned location'}</div>
                    </Popup>
                  </Marker>
                </MapContainer>

                {/* Status Overlay */}
                {isReverseGeocoding && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1 bg-black/80 backdrop-blur-md rounded-full text-white text-xs flex items-center gap-2 shadow-lg border border-white/10 pointer-events-none">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    <span>Resolving address...</span>
                  </div>
                )}

                {/* Floating GPS button */}
                <button
                  type="button"
                  onClick={handleMapLocateMe}
                  className="absolute bottom-3 right-3 z-[1000] p-2.5 rounded-full bg-slate-900/90 text-white border border-white/20 shadow-xl hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
                  title="Locate me"
                >
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              {/* Pinned location info card */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block">Pinned Location</span>
                    <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                      {streetArea || `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setView('search')}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Search Instead
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('details')}
                    className="flex-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>Confirm Pin & Add Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 4: DETAILED ADDRESS FORM (Matching SetupLocation.tsx) ── */}
          {view === 'details' && (
            <form onSubmit={handleConfirmFullAddress} className="space-y-3.5">
              {/* Pinned area summary preview */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">Area / Road</span>
                    <span className="text-[11px] text-slate-400 truncate block">{streetArea || 'Pinned on map'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenMap(selectedCoords)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-amber-400 shrink-0 cursor-pointer"
                >
                  Edit Pin
                </button>
              </div>

              {/* Tag selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Save Address As
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Home', 'Work', 'Other'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddressType(type)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        addressType === type
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {type === 'Home' && <Home className="w-3.5 h-3.5" />}
                      {type === 'Work' && <Briefcase className="w-3.5 h-3.5" />}
                      {type === 'Other' && <MapPin className="w-3.5 h-3.5" />}
                      {type}
                    </button>
                  ))}
                </div>
                {addressType === 'Other' && (
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="e.g. Friend's Flat, Gym, Studio"
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                )}
              </div>

              {/* House / Flat & Floor inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">
                    House / Flat / Block No. <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={houseFlat}
                    onChange={(e) => setHouseFlat(e.target.value)}
                    placeholder="e.g. Flat 402, Royal Palms"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">
                    Floor / Wing (Optional)
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g. 4th Floor, Wing B"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>
              </div>

              {/* Area / Road (Editable) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">
                  Apartment / Road / Locality
                </label>
                <input
                  type="text"
                  value={streetArea}
                  onChange={(e) => setStreetArea(e.target.value)}
                  placeholder="e.g. Ganjpara, Dongargaon Road"
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Landmark & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">
                    Nearby Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Near Shiv Mandir, Gate 2"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">
                    Postal / PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 491441"
                    className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                  />
                </div>
              </div>

              {/* Delivery Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Leave with security, please don't ring bell"
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* Save address checkbox */}
              <label className="flex items-center gap-2.5 text-xs text-slate-300 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToProfile}
                  onChange={(e) => setSaveToProfile(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-0 focus:ring-offset-0 bg-white/10 border-white/20"
                />
                <span>Save this address to my profile for future orders</span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={savingLocation}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
              >
                {savingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    Setting Delivery Location...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Save & Deliver Here
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── VIEW 5: LIMIT REACHED (Max 8 Locations) ── */}
          {view === 'limit_reached' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Maximum 8 Saved Locations Reached</h4>
                    <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                      Olive Pizza allows storing up to 8 delivery addresses. To add a new address, please permanently delete one of your older locations below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          addr.type === 'Home'
                            ? 'bg-blue-500/20 text-blue-400'
                            : addr.type === 'Work'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {addr.type === 'Home' ? (
                          <Home className="w-4 h-4" />
                        ) : addr.type === 'Work' ? (
                          <Briefcase className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-white uppercase tracking-wide">
                          {addr.customTag || addr.type}
                        </span>
                        <p className="text-xs text-slate-300 truncate mt-0.5 max-w-[190px] sm:max-w-[250px]">
                          {addr.addressLine}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteAddress(addr.id, e)}
                      disabled={deletingAddressId === addr.id}
                      className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {deletingAddressId === addr.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>

              {savedAddresses.length < 8 ? (
                <button
                  type="button"
                  onClick={() => setView('search')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Space Available! Add New Address ({savedAddresses.length}/8)</span>
                </button>
              ) : (
                <p className="text-[11px] text-center text-slate-500">
                  Delete at least 1 address above to unlock adding new addresses.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
