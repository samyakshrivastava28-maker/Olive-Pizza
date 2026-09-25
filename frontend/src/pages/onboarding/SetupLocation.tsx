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
  Building,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Layers,
  Sparkles,
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

interface ServiceableCity {
  city: string;
  state: string;
  center: { lat: number; lng: number };
  deliveryRadiusKm: number;
  activeBranches: number;
  branchNames: string[];
}

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
}

// Map center helper
function ChangeView({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], 14, { animate: true });
  }, [center, map]);
  return null;
}

export default function SetupLocation() {
  const navigate = useNavigate();
  const { user, setUser, role } = useAuthStore();

  // Cities from backend
  const [cities, setCities] = useState<ServiceableCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<ServiceableCity | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);

  // Mode: 'manual' vs 'map'
  const [mode, setMode] = useState<"manual" | "map">("manual");

  // Geocoding & Address states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected Pin coordinates
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>({
    lat: 21.0963,
    lng: 81.0335,
  });

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

  // 1. Fetch dynamic serviceable cities on mount
  useEffect(() => {
    let isMounted = true;
    const loadCities = async () => {
      try {
        const res = await fetchApi("/api/location/serviceable-cities");
        const data = await res.json().catch(() => null);
        if (isMounted && data?.success && Array.isArray(data.cities) && data.cities.length > 0) {
          setCities(data.cities);
          setSelectedCity(data.cities[0]);
          setMarkerPos(data.cities[0].center);
        } else if (isMounted) {
          // Fallback if backend returns empty
          const fallbackCity: ServiceableCity = {
            city: "Rajnandgaon",
            state: "Chhattisgarh",
            center: { lat: 21.0963, lng: 81.0335 },
            deliveryRadiusKm: 18,
            activeBranches: 1,
            branchNames: ["Main Branch"],
          };
          setCities([fallbackCity]);
          setSelectedCity(fallbackCity);
          setMarkerPos(fallbackCity.center);
        }
      } catch (err) {
        console.warn("[SetupLocation] Error loading cities:", err);
      } finally {
        if (isMounted) setLoadingCities(false);
      }
    };
    loadCities();
    return () => {
      isMounted = false;
    };
  }, []);

  // When selected city changes, update map center if default
  const handleCitySelect = (city: ServiceableCity) => {
    setSelectedCity(city);
    setMarkerPos(city.center);
    setSearchResults([]);
    setSearchQuery("");
  };

  // 2. Reverse geocode via server proxy
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetchApi(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json().catch(() => null);
      if (data?.success && data?.result) {
        const r = data.result;
        setAddressLine(r.displayName || "");
        if (r.address?.postcode) setPincode(r.address.postcode);
        if (r.address?.road || r.address?.neighbourhood || r.address?.suburb) {
          setStreetArea(
            [r.address.road, r.address.neighbourhood || r.address.suburb]
              .filter(Boolean)
              .join(", ")
          );
        }
      }
    } catch (err) {
      console.warn("[SetupLocation] Reverse geocode notice:", err);
    }
  }, []);

  // 3. Search address via server proxy with debouncing
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
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (result: GeocodeResult) => {
    setMarkerPos({ lat: result.lat, lng: result.lng });
    setAddressLine(result.displayName);
    if (result.address?.postcode) setPincode(result.address.postcode);
    if (result.address?.road || result.address?.suburb) {
      setStreetArea([result.address.road, result.address.suburb].filter(Boolean).join(", "));
    }
    setSearchResults([]);
    setSearchQuery(result.displayName);
  };

  // 4. GPS Location
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
      toast.success("Location detected from GPS! ✓");
    } catch (err: any) {
      console.warn("[SetupLocation] GPS error:", err);
      toast.error("Could not obtain GPS coordinates. Please select your location on the map.");
    } finally {
      setGettingGps(false);
    }
  };

  // Leaflet map click handler
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

      toast.success("Delivery location saved as Location 1! ✓");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Step indicator */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>Step 3 of 4 • Delivery Location</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-center text-slate-900 dark:text-white tracking-tight">
          Where should we deliver?
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Select your city to get started
        </p>

        {/* 1. Dynamic Serviceable City Selector */}
        <div className="mt-6 mb-6">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Serviceable Cities
          </label>

          {loadingCities ? (
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
              <span className="text-xs font-medium text-slate-500">Checking delivery zones...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cities.map((c) => {
                const isSelected = selectedCity?.city.toLowerCase() === c.city.toLowerCase();
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => handleCitySelect(c)}
                    className={`relative p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-orange-500 bg-orange-50/60 dark:bg-orange-950/30 shadow-md shadow-orange-500/10"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {c.city}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {c.state} • {c.deliveryRadiusKm}km range
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Mode Selector: Write Manually vs Select on Map */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === "manual"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Write manually</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("map")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              mode === "map"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Select on map</span>
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white dark:bg-slate-900 py-6 px-5 sm:px-8 shadow-xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Mode A: Manual Address Input with Debounced Search */}
          {mode === "manual" && (
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Search Landmark / Colony / Street in {selectedCity?.city || "City"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="e.g. Model Town, Station Road, Collectorate..."
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                  />
                  {searching && (
                    <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-500" />
                  )}
                </div>

                {/* Dropdown Suggestions */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750"
                    >
                      {searchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full p-3 text-left hover:bg-orange-50 dark:hover:bg-slate-700/60 transition-colors flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200"
                        >
                          <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{item.displayName}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleGetGps}
                disabled={gettingGps}
                className="w-full py-2.5 px-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-orange-100/50 transition-colors"
              >
                {gettingGps ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>Use Current Location via GPS</span>
              </button>
            </div>
          )}

          {/* Mode B: Map View with Leaflet */}
          {mode === "map" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tap on map or drag pin to your delivery address
                </span>
                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={gettingGps}
                  className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Locate Me</span>
                </button>
              </div>

              <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
                <MapContainer
                  center={[markerPos.lat, markerPos.lng]}
                  zoom={14}
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
              </div>
            </div>
          )}

          {/* 3. Address Details Form */}
          <form onSubmit={handleSaveLocation} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Full Address / Area *
              </label>
              <textarea
                required
                rows={2}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Detected or entered full address"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  House / Flat / Office No.
                </label>
                <input
                  type="text"
                  value={houseFlat}
                  onChange={(e) => setHouseFlat(e.target.value)}
                  placeholder="e.g. Flat 302, Green Enclave"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nearby Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Shiv Mandir"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Floor (Optional)
                </label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 2nd Floor, Lift available"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="491441"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Leave with security, ring bell twice..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !addressLine.trim()}
                className="w-full py-4 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Saving Location...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Continue</span>
                    <ArrowRight className="w-5 h-5" />
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
