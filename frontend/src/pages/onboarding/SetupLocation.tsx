import React, { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { useAuthStore } from "../../lib/store";
import { LocationManager } from "../../lib/permissions";
import { fetchApi } from "../../lib/config";
import {
  ParallelLocationSearchService,
  NormalizedLocationResult,
} from "../../services/location/ParallelLocationSearchService";
import {
  MapPin,
  Search,
  Navigation,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  X,
  ShieldCheck,
  Building2,
  Sparkles,
  Crosshair,
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

export interface PopularLocality {
  id?: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  pincode?: string;
  type?: string;
  isServiceable?: boolean;
}

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
  popularLocalities?: PopularLocality[];
  serviceable?: boolean;
}

/** Canonical Selected Location State (Single Source of Truth) */
export interface SelectedLocationState {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  name?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isServiceable?: boolean;
  serviceabilityMessage?: string;
}

// Controller helper to smoothly re-center and zoom Leaflet map
function ChangeView({
  center,
  zoom = 15,
}: {
  center: { lat: number; lng: number } | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center.lat) && !isNaN(center.lng)) {
      map.setView([center.lat, center.lng], zoom, { animate: true });
    }
  }, [center?.lat, center?.lng, zoom, map]);
  return null;
}

export default function SetupLocation() {
  const navigate = useNavigate();
  const { user, setUser, role } = useAuthStore();

  // Authoritative cities loaded dynamically from backend
  const [cities, setCities] = useState<ServiceableCity[]>([]);
  const [selectedCity, setSelectedCity] = useState<ServiceableCity | null>(null);
  const [loadingCities, setLoadingCities] = useState(true);

  // Single Canonical Selected Location State
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocationState | null>(null);

  // Map view state
  const [mapZoom, setMapZoom] = useState(15);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Search states (Parallel Multi-Provider)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    NormalizedLocationResult[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Detailed address fields
  const [houseFlat, setHouseFlat] = useState("");
  const [streetArea, setStreetArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [floor, setFloor] = useState("");
  const [instructions, setInstructions] = useState("");
  const [pincode, setPincode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);

  // Debounce refs
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reverseGeocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch dynamic serviceable cities on mount (100% database-driven)
  useEffect(() => {
    let isMounted = true;
    const loadCities = async () => {
      try {
        setLoadingCities(true);
        const res = await fetchApi("/api/location/serviceable-cities");
        const data = await res.json().catch(() => null);

        if (
          isMounted &&
          data?.success &&
          Array.isArray(data.cities) &&
          data.cities.length > 0
        ) {
          setCities(data.cities);
          const initialCity = data.cities[0];
          setSelectedCity(initialCity);

          let initialLat = initialCity.center?.lat || 21.0963;
          let initialLng = initialCity.center?.lng || 81.0335;
          let initialTitle = `${initialCity.city} Center`;
          let initialSubtitle = `${initialCity.city}, ${initialCity.state}`;
          let initialPin = "";

          if (
            initialCity.popularLocalities &&
            initialCity.popularLocalities.length > 0
          ) {
            const firstLoc = initialCity.popularLocalities[0];
            initialLat = firstLoc.lat;
            initialLng = firstLoc.lng;
            initialTitle = firstLoc.title;
            initialSubtitle = `${firstLoc.title}, ${firstLoc.subtitle}`;
            initialPin = firstLoc.pincode || "";
          }

          const initLoc: SelectedLocationState = {
            latitude: initialLat,
            longitude: initialLng,
            formattedAddress: initialSubtitle,
            name: initialTitle,
            city: initialCity.city,
            state: initialCity.state,
            country: "India",
            pincode: initialPin,
            isServiceable: true,
            serviceabilityMessage: `Delivering in ${initialCity.city}`,
          };

          setSelectedLocation(initLoc);
          setStreetArea(initialTitle);
          if (initialPin) setPincode(initialPin);
        } else if (isMounted) {
          setCities([]);
          setSelectedCity(null);
          setSelectedLocation(null);
          setError(
            "Delivery is currently undergoing scheduled updates. Please check back shortly."
          );
        }
      } catch (err) {
        console.warn("[SetupLocation] Error loading serviceable cities:", err);
        if (isMounted) {
          setError(
            "Unable to connect to location services. Please refresh or try again."
          );
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

  // When selected city changes, update coordinate anchor and default locality
  const handleCitySelect = (city: ServiceableCity) => {
    setSelectedCity(city);
    let lat = city.center?.lat || 21.0963;
    let lng = city.center?.lng || 81.0335;
    let title = `${city.city} Center`;
    let subtitle = `${city.city}, ${city.state}`;
    let pin = "";

    if (city.popularLocalities && city.popularLocalities.length > 0) {
      const firstLoc = city.popularLocalities[0];
      lat = firstLoc.lat;
      lng = firstLoc.lng;
      title = firstLoc.title;
      subtitle = `${firstLoc.title}, ${firstLoc.subtitle}`;
      pin = firstLoc.pincode || "";
    }

    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      formattedAddress: subtitle,
      name: title,
      city: city.city,
      state: city.state,
      country: "India",
      pincode: pin,
      isServiceable: true,
      serviceabilityMessage: `Delivering in ${city.city}`,
    });

    setStreetArea(title);
    if (pin) setPincode(pin);
    setSearchResults([]);
    setSearchQuery("");
    setError("");
    setMapZoom(15);
  };

  // Quick 1-tap select for popular city localities
  const handleSelectLocality = (item: PopularLocality) => {
    const lat = item.lat;
    const lng = item.lng;
    const subtitle = `${item.title}, ${item.subtitle}`;

    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      formattedAddress: subtitle,
      name: item.title,
      city: selectedCity?.city,
      state: selectedCity?.state,
      country: "India",
      pincode: item.pincode,
      isServiceable: item.isServiceable !== false,
      serviceabilityMessage: `Delivering in ${selectedCity?.city || item.title}`,
    });

    setStreetArea(item.title);
    if (item.pincode) setPincode(item.pincode);
    setError("");
    setMapZoom(16);
    toast.success(`Selected ${item.title}`);
  };

  // 2. Reverse geocode via server proxy with authoritative serviceability
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setIsReverseGeocoding(true);
      try {
        const res = await fetchApi(
          `/api/location/reverse-geocode?lat=${lat}&lng=${lng}`
        );
        const data = await res.json().catch(() => null);
        if (data?.success && data?.location) {
          const r = data.location;
          const formattedAddress = r.displayName || "";

          // Match city if user moved into an active city
          if (r.city) {
            const matched = cities.find(
              (c) => c.city.toLowerCase() === String(r.city).toLowerCase()
            );
            if (matched && matched.city !== selectedCity?.city) {
              setSelectedCity(matched);
            }
          }

          setSelectedLocation({
            latitude: lat,
            longitude: lng,
            formattedAddress,
            name: r.road || r.neighbourhood || r.city || "Selected Pin",
            city: r.city || selectedCity?.city,
            district: r.state,
            state: r.state || selectedCity?.state,
            country: r.country || "India",
            pincode: r.postcode,
            isServiceable: Boolean(data.isServiceable),
            serviceabilityMessage: r.serviceabilityMessage,
          });

          if (r.postcode) setPincode(r.postcode);
          if (r.road || r.neighbourhood) {
            setStreetArea([r.road, r.neighbourhood].filter(Boolean).join(", "));
          }

          if (data.isServiceable) {
            setError("");
          } else {
            const cityNames = cities.map((c) => c.city).join(", ");
            const errText = `Olive Pizza isn't available at this location yet. We currently deliver in ${cityNames || "operational hubs"}.`;
            setError(errText);
          }
        }
      } catch (err) {
        console.warn("[SetupLocation] Reverse geocode error:", err);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [cities, selectedCity]
  );

  // 3. PARALLEL MULTI-PROVIDER SEARCH (Mapbox, Geoapify, Photon, Nominatim, Mappls)
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setError("");

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounceTimerRef.current = setTimeout(async () => {
      try {
        const cityName = selectedCity?.city || "";
        const biasLat =
          selectedLocation?.latitude || selectedCity?.center?.lat;
        const biasLng =
          selectedLocation?.longitude || selectedCity?.center?.lng;

        await ParallelLocationSearchService.search(query.trim(), {
          city: cityName,
          lat: biasLat,
          lng: biasLng,
          limit: 8,
          onPartialResults: (partialResults, isFinal) => {
            setSearchResults(partialResults);
            if (isFinal) {
              setSearching(false);
            }
          },
        });
      } catch (err) {
        console.warn("[SetupLocation] Parallel search notice:", err);
      } finally {
        setSearching(false);
      }
    }, 280); // Fast 280ms input debounce
  };

  // 4. USER SELECTS A SEARCH RESULT (Authoritative Exact Coordinates)
  const handleSelectSearchResult = (result: NormalizedLocationResult) => {
    // Exact coordinates returned by provider
    const lat = result.latitude;
    const lng = result.longitude;
    const displayName = result.formattedAddress || result.name;

    // Determine zoom level based on place type
    let targetZoom = 15;
    const placeType = (result.type || "").toLowerCase();
    if (
      placeType.includes("street") ||
      placeType.includes("road") ||
      placeType.includes("building") ||
      placeType.includes("poi") ||
      placeType.includes("house") ||
      placeType.includes("amenity")
    ) {
      targetZoom = 16;
    } else if (
      placeType.includes("city") ||
      placeType.includes("state") ||
      placeType.includes("country")
    ) {
      targetZoom = 13;
    }

    setMapZoom(targetZoom);

    // Update canonical selected location state
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      formattedAddress: displayName,
      name: result.name,
      city: result.city || selectedCity?.city,
      district: result.district,
      state: result.state || selectedCity?.state,
      country: result.country || "India",
      pincode: result.pincode,
      isServiceable: result.isServiceable !== false,
      serviceabilityMessage: result.serviceabilityMessage,
    });

    if (result.pincode) setPincode(result.pincode);
    if (result.address?.road || result.address?.suburb) {
      setStreetArea(
        [result.address.road, result.address.suburb].filter(Boolean).join(", ")
      );
    }
    setSearchResults([]);
    setSearchQuery(result.name || displayName);
    setIsSearchFocused(false);

    if (result.isServiceable !== false) {
      setError("");
    } else {
      const errText =
        result.serviceabilityMessage ||
        "This spot is outside our current delivery radius. Please choose a closer location.";
      setError(errText);
    }

    toast.success(`Location set: ${result.name}`);
  };

  // 5. GPS Current Location Locate
  const handleGetGps = async () => {
    setGettingGps(true);
    setError("");
    try {
      const loc = await LocationManager.getCurrentLocation({
        forcePrompt: true,
        fallbackToCache: false,
      });

      setSelectedLocation({
        latitude: loc.lat,
        longitude: loc.lng,
        formattedAddress: loc.fullAddress || "Current GPS Location",
        name: "Current Location",
        city: (loc as any).city || selectedCity?.city,
        state: (loc as any).state || selectedCity?.state,
        country: "India",
        pincode: (loc as any).pincode,
        isServiceable: true,
      });

      setMapZoom(16);
      await reverseGeocode(loc.lat, loc.lng);
      toast.success("Current location detected! ✓");
    } catch (err: any) {
      console.warn("[SetupLocation] GPS error:", err);
      toast.error(
        "Could not obtain GPS coordinates. Please select or drag your location on the map."
      );
    } finally {
      setGettingGps(false);
    }
  };

  // Leaflet map click handler
  const MapEventsHandler = () => {
    useMapEvents({
      click(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        if (selectedLocation) {
          setSelectedLocation((prev) =>
            prev ? { ...prev, latitude: lat, longitude: lng } : null
          );
        }
        if (reverseGeocodeTimerRef.current) {
          clearTimeout(reverseGeocodeTimerRef.current);
        }
        reverseGeocodeTimerRef.current = setTimeout(() => {
          reverseGeocode(lat, lng);
        }, 500);
      },
    });
    return null;
  };

  // 6. Save location to backend and complete Step 3
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCity) {
      setError("Please select a serviceable city.");
      return;
    }

    if (!selectedLocation) {
      setError("Please select or search for your delivery location.");
      return;
    }

    if (selectedLocation.isServiceable === false) {
      setError(
        "We currently do not deliver to this exact spot. Please select an address within delivery range."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = auth.currentUser
        ? await auth.currentUser.getIdToken()
        : undefined;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        city: selectedCity.city,
        state: selectedCity.state,
        formattedAddress:
          selectedLocation.formattedAddress.trim() ||
          `${selectedCity.city}, ${selectedCity.state}`,
        addressLine:
          selectedLocation.formattedAddress.trim() ||
          `${selectedCity.city}, ${selectedCity.state}`,
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
        pincode: pincode.trim(),
        houseNumber: houseFlat.trim(),
        houseFlat: houseFlat.trim(),
        street: streetArea.trim(),
        streetArea: streetArea.trim(),
        landmark: landmark.trim(),
        floor: floor.trim(),
        deliveryInstructions: instructions.trim(),
        instructions: instructions.trim(),
        label: "Location 1",
        locationName: "Location 1",
      };

      const res = await fetchApi("/api/location/save", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message ||
            data?.error ||
            "We currently do not deliver to this exact spot. Please select an address within delivery range."
        );
      }

      // Update Firestore user document client-side as well
      const uid = auth.currentUser?.uid || user?.uid;
      if (uid) {
        await updateDoc(doc(db, "users", uid), {
          fullAddress: payload.formattedAddress,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
          lat: payload.lat,
          lng: payload.lng,
          locationSetupCompleted: true,
          location_setup_completed: true,
          role: "customer",
        }).catch((err) =>
          console.warn("[SetupLocation] Client Firestore write notice:", err)
        );
      }

      // Update state store
      if (user) {
        setUser(
          {
            ...user,
            fullAddress: payload.formattedAddress,
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

  const centerCoords = selectedLocation
    ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude }
    : selectedCity?.center || { lat: 21.0963, lng: 81.0335 };

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
          Multi-provider real-time address search with pinpoint accuracy
        </p>

        {/* 1. Dynamic Serviceable City Selector */}
        <div className="mt-5 mb-5">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Serviceable Cities
          </label>

          {loadingCities ? (
            <div className="flex items-center gap-2.5 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-primary-600" />
              <span className="text-xs font-semibold text-slate-500">
                Checking delivery zones...
              </span>
            </div>
          ) : cities.length === 0 ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
              No cities are currently open for delivery. Please check back later.
            </div>
          ) : (
            <div
              className={`grid gap-3 ${
                cities.length === 1
                  ? "grid-cols-1"
                  : cities.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3"
              }`}
            >
              {cities.map((c) => {
                const isSelected =
                  selectedCity?.city.toLowerCase() === c.city.toLowerCase();
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
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {c.state}
                      {c.deliveryRadiusKm
                        ? ` • ${c.deliveryRadiusKm}km delivery area`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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

          {selectedLocation?.isServiceable && !error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>
                {selectedLocation.serviceabilityMessage ||
                  "Deliverable location ✓"}
              </span>
            </motion.div>
          )}

          {/* 2. PARALLEL LIVE MULTI-PROVIDER SEARCH BOX */}
          <div className="space-y-3.5">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Search Landmark / Colony / Street in{" "}
                {selectedCity?.city || "your city"}
              </label>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={`🔍 e.g. Station Road, Market, Colony in ${
                    selectedCity?.city || "city"
                  }...`}
                  className="w-full pl-10 pr-20 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 font-medium"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searching && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary-600 mr-1" />
                  )}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGetGps}
                    disabled={gettingGps}
                    title="Use GPS"
                    className="p-1.5 rounded-xl bg-primary-100 hover:bg-primary-200 dark:bg-primary-950 dark:hover:bg-primary-900 text-primary-700 dark:text-primary-300 transition-colors cursor-pointer"
                  >
                    <Navigation
                      className={`w-3.5 h-3.5 ${
                        gettingGps ? "animate-spin text-primary-600" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* UNIFIED CLEAN SEARCH RESULTS DROPDOWN (No provider brand logos, clean UI) */}
              <AnimatePresence>
                {isSearchFocused && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-750"
                  >
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full p-3 text-left hover:bg-primary-50/50 dark:hover:bg-slate-700/60 transition-colors flex items-start gap-3 text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <div
                          className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                            item.isServiceable !== false
                              ? "bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {item.name}
                            </span>
                            {item.isServiceable === false && (
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md shrink-0">
                                Outside area
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 block mt-0.5 font-medium">
                            {item.formattedAddress}
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Popular Localities Chips */}
            {!searchQuery &&
              selectedCity?.popularLocalities &&
              selectedCity.popularLocalities.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Popular Localities in {selectedCity.city}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">
                      ⚡ 1-Tap Select
                    </span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {selectedCity.popularLocalities.map((loc) => {
                      const isSelected =
                        selectedLocation &&
                        Math.abs(selectedLocation.latitude - loc.lat) <
                          0.0015 &&
                        Math.abs(selectedLocation.longitude - loc.lng) < 0.0015;

                      return (
                        <button
                          key={loc.id || loc.title}
                          type="button"
                          onClick={() => handleSelectLocality(loc)}
                          className={`px-3 py-1.5 rounded-xl border text-left transition-all shrink-0 flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                            isSelected
                              ? "border-primary-500 bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500"
                              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <MapPin className="w-3 h-3 text-primary-600" />
                          <span>{loc.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* 3. DEFAULT INTERACTIVE MAP (Leaflet Single Renderer) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Interactive Delivery Pin
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Drag pin or tap map to fine-tune
                </span>
              </div>

              <div className="h-56 sm:h-64 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0 shadow-inner">
                {selectedLocation ? (
                  <MapContainer
                    center={[
                      selectedLocation.latitude,
                      selectedLocation.longitude,
                    ]}
                    zoom={mapZoom}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ChangeView
                      center={{
                        lat: selectedLocation.latitude,
                        lng: selectedLocation.longitude,
                      }}
                      zoom={mapZoom}
                    />
                    <MapEventsHandler />
                    <Marker
                      position={[
                        selectedLocation.latitude,
                        selectedLocation.longitude,
                      ]}
                      draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const m = e.target.getLatLng();
                          setSelectedLocation((prev) =>
                            prev
                              ? { ...prev, latitude: m.lat, longitude: m.lng }
                              : null
                          );
                          if (reverseGeocodeTimerRef.current) {
                            clearTimeout(reverseGeocodeTimerRef.current);
                          }
                          reverseGeocodeTimerRef.current = setTimeout(() => {
                            reverseGeocode(m.lat, m.lng);
                          }, 500);
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-xs font-bold">
                          {selectedLocation.name || "Delivery Spot"}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {selectedLocation.formattedAddress}
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-xs text-slate-500">
                    Loading map...
                  </div>
                )}

                {isReverseGeocoding && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-3 py-1 bg-black/75 backdrop-blur-md rounded-full text-white text-xs flex items-center gap-2 shadow-lg">
                    <RefreshCw className="w-3 h-3 animate-spin text-primary-400" />
                    <span>Resolving address...</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Selected Location Summary Box */}
            {selectedLocation && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-primary-600 text-white shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedLocation.name || "Selected Location"}
                      </span>
                      {selectedLocation.isServiceable ? (
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md shrink-0">
                          Deliverable ✓
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md shrink-0">
                          Outside Area
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 font-medium leading-relaxed">
                      {selectedLocation.formattedAddress}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGetGps}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Crosshair className="w-3 h-3 text-primary-600" />
                  <span>Re-locate</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. Detailed Address Confirmation Form */}
          <form onSubmit={handleSaveLocation} className="space-y-4 pt-1">
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
                  Postal / PIN Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) =>
                    setPincode(e.target.value.replace(/\D/g, ""))
                  }
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
                disabled={
                  loading ||
                  !selectedLocation ||
                  selectedLocation.isServiceable === false
                }
                className="w-full py-3.5 px-6 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm sm:text-base shadow-md shadow-primary-900/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>Confirming Location...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Location</span>
                    <ArrowRight className="w-5 h-5 text-white" />
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
