import { useState, useCallback, useRef, useEffect } from 'react';
import UniversalMap3D, { LatLng } from './UniversalMap3D';
import { fetchApi } from '../../lib/config';

interface LocationPicker3DProps {
  initialCenter?: LatLng;
  onChange?: (location: { lat: number; lng: number; address: string }) => void;
  className?: string;
}

export default function LocationPicker3D({ initialCenter, onChange, className }: LocationPicker3DProps) {
  const [center, setCenter] = useState<LatLng>(initialCenter || { lat: 21.0810244, lng: 81.0123793 });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeTimeoutRef = useRef<number | null>(null);

  // Fallback default coordinates if neither provided nor found
  useEffect(() => {
    if (initialCenter) {
      setCenter(initialCenter);
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          performGeocode({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const geocodeCache = useRef<Map<string, string>>(new Map());

  const performGeocode = async (loc: LatLng) => {
    const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
    if (geocodeCache.current.has(key)) {
      onChange?.({ lat: loc.lat, lng: loc.lng, address: geocodeCache.current.get(key)! });
      return;
    }

    setIsGeocoding(true);
    try {
      const res = await fetchApi(`/api/location/reverse-geocode?lat=${loc.lat}&lng=${loc.lng}`);
      const data = await res.json();
      const address = data?.location?.displayName || data?.display_name || '';
      if (address) {
        geocodeCache.current.set(key, address);
      }
      onChange?.({ lat: loc.lat, lng: loc.lng, address });
    } catch (err) {
      onChange?.({ lat: loc.lat, lng: loc.lng, address: '' });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCenterChange = useCallback((newCenter: LatLng) => {
    setCenter(newCenter);
    if (geocodeTimeoutRef.current) window.clearTimeout(geocodeTimeoutRef.current);
    
    // Snappy 400ms debounce
    geocodeTimeoutRef.current = window.setTimeout(() => {
      performGeocode(newCenter);
    }, 400);
  }, [onChange]);

  return (
    <div className={`relative ${className}`}>
      <UniversalMap3D
        mode="picker"
        center={center}
        onCenterChange={handleCenterChange}
        className="w-full h-full"
      />
      {isGeocoding && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white text-xs flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          Finding address...
        </div>
      )}
    </div>
  );
}
