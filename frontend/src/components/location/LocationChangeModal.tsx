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
} from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { LocationManager, LocationData } from '../../lib/permissions';
import { OrderingContextService } from '../../lib/orderingContext';
import { ParallelLocationSearchService, NormalizedLocationResult } from '../../services/location/ParallelLocationSearchService';
import { fetchApi } from '../../lib/config';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export interface SavedAddress {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  addressLine: string;
  landmark?: string;
  pincode?: string;
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

export default function LocationChangeModal() {
  const { user, setUser, role, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'main' | 'search' | 'add'>('main');

  // Location state
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsFailedOrOff, setGpsFailedOrOff] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NormalizedLocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // New address manual form
  const [selectedResult, setSelectedResult] = useState<NormalizedLocationResult | null>(null);
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [flatNo, setFlatNo] = useState('');
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
          // Merge deduplicated
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
  // Check if device location is off / not granted, or if user has no active address set
  useEffect(() => {
    const checkInitialLocation = async () => {
      // If user already has full location established in session or local cache, don't interrupt
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
        // Delay slightly for smooth page hydration
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

  // Detect via GPS
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
        'Device location is turned off or blocked. Please select from saved locations or enter your address below.'
      );
    } finally {
      setDetectingGps(false);
    }
  };

  // Autocomplete search handler
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
          lat: user?.lat || 21.081,
          lng: user?.lng || 81.012,
          limit: 6,
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
    }, 280);
  };

  // Select a search result
  const handleSelectResult = (result: NormalizedLocationResult) => {
    setSelectedResult(result);
    setView('add');
  };

  // Save new address and apply
  const handleConfirmNewAddress = async () => {
    if (!selectedResult) return;
    setSavingLocation(true);

    const fullLine = flatNo ? `${flatNo}, ${selectedResult.formattedAddress}` : selectedResult.formattedAddress;
    const newEntry: SavedAddress = {
      id: `addr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: addressType,
      addressLine: fullLine,
      city: selectedResult.city || '',
      pincode: selectedResult.pincode || '',
      lat: selectedResult.latitude,
      lng: selectedResult.longitude,
      isDefault: savedAddresses.length === 0,
    };

    // Update local list
    const updated = [newEntry, ...savedAddresses];
    setSavedAddresses(updated);
    try {
      localStorage.setItem(SAVED_ADDRESSES_KEY, JSON.stringify(updated));
    } catch {}

    // Update Firestore if user is authenticated
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          addresses: updated,
        });
      } catch (err) {
        console.warn('[LocationChangeModal] Save address error:', err);
      }
    }

    // Apply as active location
    await applyLocation(newEntry.lat, newEntry.lng, newEntry.addressLine, `${newEntry.type} (${newEntry.city || 'Home'})`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md transition-opacity">
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full sm:max-w-md bg-[#131B16] text-white rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-[#0E1511]">
          <div className="flex items-center gap-2.5">
            {view !== 'main' ? (
              <button
                onClick={() => setView('main')}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
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
                {view === 'add' && 'Confirm Address Details'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {view === 'main' && 'Select your active address for delivery'}
                {view === 'search' && 'Find your street, landmark or colony'}
                {view === 'add' && 'Add flat/house details to finish'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* ── VIEW 1: MAIN (GPS / Saved / Add New) ── */}
          {view === 'main' && (
            <>
              {/* Location Off Warning Banner */}
              {gpsFailedOrOff && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs leading-relaxed animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block mb-0.5">Device Location Is Turned Off</span>
                    We couldn't detect your live GPS. Please pick from your saved addresses below or add a new address to continue.
                  </div>
                </div>
              )}

              {/* Action 1: Detect Live GPS */}
              <button
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

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Action 2: Add New Location / Search */}
              <button
                onClick={() => setView('search')}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>Search for area, street, or landmark</span>
                </div>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>

              {/* Section: Saved Addresses */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Saved Locations ({savedAddresses.length})
                  </span>
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
                      onClick={() => setView('search')}
                      className="text-xs text-amber-400 font-bold hover:underline inline-flex items-center gap-1"
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
                          onClick={() => applyLocation(addr.lat, addr.lng, addr.addressLine, addr.type)}
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
                                  {addr.type}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 truncate mt-0.5 max-w-[220px] sm:max-w-[260px]">
                                {addr.addressLine}
                              </p>
                              {addr.city && (
                                <span className="text-[10px] text-slate-400">{addr.city}</span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
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
                  placeholder="Enter apartment, street, landmark, or city..."
                  autoFocus
                  className="w-full py-3 pl-10 pr-10 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                ) : (
                  searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>

              {/* Results List */}
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {searchResults.map((res, i) => (
                  <div
                    key={`${res.provider}-${i}`}
                    onClick={() => handleSelectResult(res)}
                    className="p-3 rounded-2xl hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all cursor-pointer flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">{res.name}</span>
                      <span className="text-[11px] text-slate-400 block truncate">{res.formattedAddress}</span>
                      {res.city && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {res.city} {res.state ? `• ${res.state}` : ''}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 self-center" />
                  </div>
                ))}

                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching addresses found. Try a different landmark or colony name.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── VIEW 3: CONFIRM & ADD DETAILS ── */}
          {view === 'add' && selectedResult && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-white block">{selectedResult.name}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-snug">
                    {selectedResult.formattedAddress}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                  House / Flat / Floor No. (Optional)
                </label>
                <input
                  type="text"
                  value={flatNo}
                  onChange={(e) => setFlatNo(e.target.value)}
                  placeholder="e.g. Flat 402, 4th Floor, Green Villa"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

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
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
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
              </div>

              <button
                onClick={handleConfirmNewAddress}
                disabled={savingLocation}
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {savingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    Setting Delivery Location...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Confirm & Deliver Here
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
