import { useState, useCallback, useRef } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router";
import { useAuthStore } from "../../lib/store";
import { LocationManager } from "../../lib/permissions";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});
const RAJNANDGAON_CENTER = { lat: 21.0963, lng: 81.0335 }; // Center of Rajnandgaon

export default function SetupLocation() {
  const navigate = useNavigate();
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [markerPos, setMarkerPos] = useState(RAJNANDGAON_CENTER);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);

  // Free Reverse Geocoding via Nominatim (OpenStreetMap)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      const data = await res.json();

      if (data && data.address) {
        const foundCity =
          data.address.city || data.address.town || data.address.village || "";
        const foundState = data.address.state || "";
        const foundPincode = data.address.postcode || "";

        if (!foundCity.toLowerCase().includes("rajnandgaon")) {
          setError(
            "We currently only deliver in Rajnandgaon, Chhattisgarh. Please select a valid location.",
          );
        } else {
          setError("");
          setAddressLine(data.display_name);
          setCity("Rajnandgaon");
          setState(foundState);
          if (foundPincode) setPincode(foundPincode);
        }
      }
    } catch (err) {
      console.error("Reverse geocode failed", err);
    }
  };

  // Map Click Component for Leaflet
  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setMarkerPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      },
    });
    return markerPos === null ? null : (
      <Marker position={[markerPos.lat, markerPos.lng]}>
        <Popup>Delivery Location</Popup>
      </Marker>
    );
  };

  const getGPSLocation = async () => {
    setGettingGps(true);
    setError("");
    
    try {
      const location = await LocationManager.getCurrentLocation({ forcePrompt: true, fallbackToCache: false });
      setMarkerPos({ lat: location.lat, lng: location.lng });
      
      // SetupLocation expects reverse geocode to fill the fields because LocationManager 
      // already does some reverse geocoding, but we might want the exact format SetupLocation uses.
      // So we call the local reverseGeocode to populate city, state, etc.
      await reverseGeocode(location.lat, location.lng);
    } catch (err: any) {
      if (err.message?.includes('denied')) {
        setError("Location permission denied. Please grant permission in your browser or enter manually.");
      } else {
        setError("Failed to get GPS location. Please ensure location permissions are granted.");
      }
    } finally {
      setGettingGps(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (city.toLowerCase() !== "rajnandgaon") {
      setError("Service is only available in Rajnandgaon.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        fullAddress: addressLine,
        city,
        state,
        pincode,
        lat: markerPos.lat,
        lng: markerPos.lng,
        locationSetupCompleted: true,
      });

      const currentUser = useAuthStore.getState().user;
      const currentRole = useAuthStore.getState().role;
      useAuthStore.getState().setUser({
        ...currentUser,
        fullAddress: addressLine,
        city,
        state,
        pincode,
        lat: markerPos.lat,
        lng: markerPos.lng,
        locationSetupCompleted: true,
      }, currentRole || 'customer');

      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to complete setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-4 md:p-8 glass-card">
      <h1 className="text-3xl font-bold mb-4 text-center text-primary-600">
        Delivery Location
      </h1>
      <p className="text-slate-600 mb-6 text-center">
        Pinpoint your exact delivery location on the map. We only deliver in
        Rajnandgaon.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Map loading block removed since Leaflet doesn't require API keys */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Map */}
        <div className="flex flex-col gap-4">
          <button
            onClick={getGPSLocation}
            disabled={gettingGps}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 z-10"
          >
            {gettingGps ? "Locating..." : "📍 Use Current GPS Location"}
          </button>

          <div className="relative h-[300px] w-full rounded-xl overflow-hidden border-2 border-primary-200 z-0">
            <MapContainer
              center={[markerPos.lat, markerPos.lng]}
              zoom={14}
              style={{ width: "100%", height: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker />
            </MapContainer>
          </div>
        </div>

        {/* Right Side: Form */}
        <form
          onSubmit={handleSaveLocation}
          className="flex flex-col gap-4 bg-white/50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700"
        >
          <div>
            <label className="block text-sm font-medium mb-1">
              Full Address
            </label>
            <textarea
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-black dark:text-white"
              required
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Landmark (Optional)
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-black dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={city}
                disabled
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-900 opacity-70 text-black dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-black dark:text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || city.toLowerCase() !== "rajnandgaon"}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-lg font-bold mt-4 transition-colors disabled:opacity-50"
          >
            {loading ? "Completing Setup..." : "Finish Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
