import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { useAuthStore } from "../../lib/store";
import { LocationManager } from "../../lib/permissions";
import { fetchApi } from "../../lib/config";
import {
  MapPin,
  Search,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  X,
  ShieldCheck,
  MapPinned,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icon asset paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export interface ServiceableCity {
  id?: string;
  city: string;
  name?: string;
  state: string;
  country?: string;
  center: { lat: number; lng: number };
  deliveryRadiusKm?: number;
  viewbox?: number[];
  activeBranches?: number;
  branchNames?: string[];
  serviceable?: boolean;
}

export interface GeocodeResult {
  placeId: string;
  title: string;
  subtitle: string;
  displayName: string;
  lat: number;
  lng: number;
  isServiceable: boolean;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

// Map center controller helper
function ChangeView({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], 15, { animate: true });
  }, [center, map]);
  return null;
}

export default function SetupLocation() {
  const navigate = useNavigate();
  const { user, setUser, role } = useAuthStore();

  // Authoritative cities loaded dynamically from backend
  const [cities, setCities] = useState<ServiceableCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<ServiceableCity | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);

  // Interaction Mode: 'manual' vs 'map'
  const [mode, setMode] = useState<"manual" | "map">("manual");

  // Geocoding & Address search states (Blinkit style)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Selected Pin coordinates
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);

  // Serviceability check state
  const [isServiceable, setIsServiceable] = useState<boolean | null>(null);
  const [serviceabilityMessage, setServiceabilityMessage] = useState<string>("");

  // Detailed fields
  const [addressLine, setAddressLine] = useState("");
  const [houseFlat, setHouseFlat] = useState("");
  const [streetArea, setStreetArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [floor, setFloor] = useState("");
  const [instructions, setInstructions] = useState("");
  const [pincode, setPincode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);

  // Search debounce ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch dynamic serviceable cities on mount (100% database-driven)
  useEffect(() => {
    let isMounted = true;
    const loadCities = async () => {
      try {
        setLoadingCities(true);
        const res = await fetchApi("/api/location/serviceable-cities");
        const data = await res.json().catch(() => null);

        if (isMounted && data?.success && Array.isArray(data.cities) && data.cities.length > 0) {
          setCities(data.cities);
          const initialCity = data.cities[0];
          setSelectedCity(initialCity);
          if (initialCity.center && !isNaN(initialCity.center.lat) && !isNaN(initialCity.center.lng)) {
            setMarkerPos(initialCity.center);
            setIsServiceable(true);
            setServiceabilityMessage(`Delivering in ${initialCity.city}`);
          }
        } else if (isMounted) {
          // If database has 0 active operational branches
          setCities([]);
          setSelectedCity(null);
          setMarkerPos(null);
          setError("Delivery is currently undergoing scheduled updates. Please check back shortly.");
        }
      } catch (err) {
        console.warn("[SetupLocation] Error loading serviceable cities:", err);
        if (isMounted) {
          setError("Unable to connect to location services. Please refresh or try again.");
        }
      } finally {
        if (isMounted) setLoadingCities(false);
      }
    };

    loadCities();
    return () => {
      isMounted = false;
    };
  }, []);

  // When selected city changes, update coordinate anchor
  const handleCitySelect = (city: ServiceableCity) => {
    setSelectedCity(city);
    if (city.center && !isNaN(city.center.lat) && !isNaN(city.center.lng)) {
      setMarkerPos(city.center);
      setIsServiceable(true);
      setServiceabilityMessage(`Delivering in ${city.city}`);
    }
    setSearchResults([]);
    setSearchQuery("");
    setError("");
  };

  // 2. Reverse geocode via server proxy with authoritative serviceability
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetchApi(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json().catch(() => null);
      if (data?.success && data?.location) {
        const r = data.location;
        setAddressLine(r.displayName || "");
        if (r.postcode) setPincode(r.postcode);
        if (r.road || r.neighbourhood) {
          setStreetArea([r.road, r.neighbourhood].filter(Boolean).join(", "));
        }

        // Auto-match city if user dragged into an active city
        if (r.city) {
          const matched = cities.find(
            (c) => c.city.toLowerCase() === String(r.city).toLowerCase()
          );
          if (matched && matched.city !== selectedCity?.city) {
            setSelectedCity(matched);
          }
        }

        setIsServiceable(Boolean(data.isServiceable));
        if (data.isServiceable) {
          setServiceabilityMessage(r.serviceabilityMessage || "Deliverable location");
          setError("");
        } else {
          const cityNames = cities.map((c) => c.city).join(", ");
          const errText = `Olive Pizza isn't available at this location yet. We currently deliver in ${cityNames || "operational hubs"}.`;
          setServiceabilityMessage(errText);
          setError(errText);
        }
      }
    } catch (err) {
      console.warn("[SetupLocation] Reverse geocode notice:", err);
    }
  }, [cities, selectedCity]);

  // 3. Search address via server proxy with Blinkit-style debounced city scoping
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setError("");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const cityName = selectedCity?.city || "";
        const res = await fetchApi(
          `/api/location/geocode?q=${encodeURIComponent(query.trim())}&city=${encodeURIComponent(cityName)}`
        );
        const data = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.results)) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn("[SetupLocation] Search geocode notice:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleSelectSearchResult = (result: GeocodeResult) => {
    setMarkerPos({ lat: result.lat, lng: result.lng });
    setAddressLine(result.displayName);
    if (result.address?.postcode) setPincode(result.address.postcode);
    if (result.address?.road || result.address?.suburb) {
      setStreetArea([result.address.road, result.address.suburb].filter(Boolean).join(", "));
    }
    setSearchResults([]);
    setSearchQuery(result.title || result.displayName);
    setIsSearchFocused(false);

    setIsServiceable(result.isServiceable);
    if (result.isServiceable) {
      setServiceabilityMessage("Deliverable location ✓");
      setError("");
    } else {
      const errText = "This spot is outside our current delivery radius. Please choose a closer landmark.";
      setServiceabilityMessage(errText);
      setError(errText);
    }
  };

  // 4. GPS Location with exact serviceability validation
  const handleGetGps = async () => {
    setGettingGps(true);
    setError("");
    try {
      const loc = await LocationManager.getCurrentLocation({
        forcePrompt: true,
        fallbackToCache: false,
      });

      setMarkerPos({ lat: loc.lat, lng: loc.lng });
      await reverseGeocode(loc.lat, loc.lng);
      toast.success("Current location detected! ✓");
    } catch (err: any) {
      console.warn("[SetupLocation] GPS error:", err);
      toast.error("Could not obtain GPS coordinates. Please select your location on the map.");
    } finally {
      setGettingGps(false);
    }
  };

  // Leaflet map click and drag handler
  const MapEventsHandler = () => {
    useMapEvents({
      click(e) {
        setMarkerPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  // 5. Save location to backend and complete Step 3
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) {
      setError("Please select a serviceable city.");
      return;
    }

    if (!markerPos) {
      setError("Please select or search for your delivery location.");
      return;
    }

    if (isServiceable === false) {
      setError("We currently do not deliver to this exact spot. Please select an address within delivery range.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        city: selectedCity.city,
        state: selectedCity.state,
        addressLine: addressLine.trim() || `${selectedCity.city}, ${selectedCity.state}`,
        lat: markerPos.lat,
        lng: markerPos.lng,
        pincode: pincode.trim(),
        houseFlat: houseFlat.trim(),
        streetArea: streetArea.trim(),
        landmark: landmark.trim(),
        floor: floor.trim(),
        instructions: instructions.trim(),
        locationName: "Location 1",
      };

      const res = await fetchApi("/api/location/save", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "We currently do not deliver to this exact spot. Please select an address within delivery range.");
      }

      // Update Firestore user document client-side as well
      const uid = auth.currentUser?.uid || user?.uid;
      if (uid) {
        await updateDoc(doc(db, "users", uid), {
          fullAddress: payload.addressLine,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
          lat: payload.lat,
          lng: payload.lng,
          locationSetupCompleted: true,
          location_setup_completed: true,
          role: "customer",
        }).catch((err) => console.warn("[SetupLocation] Client Firestore write notice:", err));
      }

      // Update state store
      if (user) {
        setUser(
          {
            ...user,
            fullAddress: payload.addressLine,
            city: payload.city,
            state: payload.state,
            pincode: payload.pincode,
            lat: payload.lat,
            lng: payload.lng,
            locationSetupCompleted: true,
          },
          role || "customer"
        );
      }

      toast.success("Delivery location confirmed! ✓");
      // Advance to Step 4: Optional Email
      navigate("/onboarding/email", { replace: true });
    } catch (err: any) {
      console.error("[SetupLocation] Save location error:", err);
      setError(err.message || "Failed to save delivery location.");
      toast.error(err.message || "Failed to save delivery location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Step indicator */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-300 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-primary-600" />
            <span>Step 3 of 4 • Delivery Location</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-center text-slate-900 dark:text-white tracking-tight">
          Where should we deliver?
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
          Select your city to get started
        </p>

        {/* 1. Dynamic Serviceable City Selector (Database Driven) */}
        <div className="mt-5 mb-5">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Serviceable Cities
          </label>

          {loadingCities ? (
            <div className="flex items-center gap-2.5 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-xs font-semibold text-slate-500">Checking delivery zones...</span>
            </div>
          ) : cities.length === 0 ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
              No cities are currently open for delivery. Please check back later.
            </div>
          ) : (
            <div className={`grid gap-3 ${cities.length === 1 ? 'grid-cols-1' : cities.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {cities.map((c) => {
                const isSelected = selectedCity?.city.toLowerCase() === c.city.toLowerCase();
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => handleCitySelect(c)}
                    className={`relative p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-primary-600 bg-primary-50/70 dark:bg-primary-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {c.city}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {c.state}{c.deliveryRadiusKm ? ` • ${c.deliveryRadiusKm}km delivery area` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Mode Selector: Search / Write Manually vs Select on Map */}
        <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === "manual"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search location</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("map")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === "map"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Select on map</span>
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white dark:bg-slate-900 py-6 px-5 sm:px-8 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {isServiceable && serviceabilityMessage && !error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{serviceabilityMessage}</span>
            </motion.div>
          )}

          {/* Mode A: Blinkit-style Live Search + GPS Button */}
          {mode === "manual" && (
            <div className="space-y-3.5">
              {/* GPS Instant Locate Button */}
              <button
                type="button"
                onClick={handleGetGps}
                disabled={gettingGps}
                className="w-full py-3 px-4 rounded-2xl border border-primary-300 dark:border-primary-800 bg-primary-50/60 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 text-xs font-bold flex items-center justify-center gap-2.5 hover:bg-primary-100/70 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {gettingGps ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
                ) : (
                  <Navigation className="w-4 h-4 text-primary-600" />
                )}
                <span>{gettingGps ? "Detecting location..." : "Use Current Location via GPS"}</span>
              </button>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Search Landmark / Colony / Street in {selectedCity?.city || "your city"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={`e.g. Area, colony, street in ${selectedCity?.city || "city"}...`}
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {searching && (
                    <RefreshCw className="absolute right-9 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-primary-600" />
                  )}
                </div>

                {/* Blinkit Style Dynamic Search Results */}
                <AnimatePresence>
                  {isSearchFocused && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750"
                    >
                      {searchResults.map((item) => (
                        <button
                          key={item.placeId}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full p-3 text-left hover:bg-primary-50/50 dark:hover:bg-slate-700/60 transition-colors flex items-start gap-3 text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${item.isServiceable ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400' : 'bg-slate-100 text-slate-400'}`}>
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate block">
                                {item.title}
                              </span>
                              {!item.isServiceable && (
                                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md shrink-0">
                                  Outside area
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 block mt-0.5">
                              {item.subtitle || item.displayName}
                            </span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Mode B: Interactive Map Mode with Leaflet & Real-Time Reverse Geocoding */}
          {mode === "map" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tap on map or drag pin to your address
                </span>
                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={gettingGps}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary-700 dark:text-primary-400 hover:underline cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Locate Me</span>
                </button>
              </div>

              <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0 shadow-inner">
                {markerPos ? (
                  <MapContainer
                    center={[markerPos.lat, markerPos.lng]}
                    zoom={15}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeView center={markerPos} />
                    <MapEventsHandler />
                    <Marker
                      position={[markerPos.lat, markerPos.lng]}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const m = e.target.getLatLng();
                          setMarkerPos({ lat: m.lat, lng: m.lng });
                          reverseGeocode(m.lat, m.lng);
                        },
                      }}
                    >
                      <Popup>Your delivery location</Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-xs text-slate-500">
                    Loading map view...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Detailed Address Confirmation Form */}
          <form onSubmit={handleSaveLocation} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Full Address / Area *
              </label>
              <textarea
                required
                rows={2}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Detected or entered full delivery address"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  House / Flat / Office No.
                </label>
                <input
                  type="text"
                  value={houseFlat}
                  onChange={(e) => setHouseFlat(e.target.value)}
                  placeholder="e.g. Flat 302, Green Enclave"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nearby Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Shiv Mandir, Main Gate"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Floor (Optional)
                </label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 2nd Floor, Lift available"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Postal / ZIP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 491441"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Ring bell twice, leave with security..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !addressLine.trim() || isServiceable === false}
                className="w-full py-3.5 px-6 rounded-2xl bg-primary-600 hover:bg-primary-700 text-champagne font-bold text-sm sm:text-base shadow-md shadow-primary-900/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-champagne" />
                    <span>Confirming Location...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Continue</span>
                    <ArrowRight className="w-5 h-5 text-champagne" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
