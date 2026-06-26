import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Custom Premium Map Icons ────────────────────────────────────────

const customerIcon = new L.DivIcon({
  html: `
  <div style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
    <!-- Radar Pulse -->
    <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #3b82f6; animation: radar-pulse 2s infinite cubic-bezier(0.1, 0.8, 0.3, 1);"></div>
    <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #3b82f6; animation: radar-pulse 2s infinite cubic-bezier(0.1, 0.8, 0.3, 1); animation-delay: 1s;"></div>
    
    <!-- House Pin -->
    <div style="
      position: relative; z-index: 10; width: 36px; height: 36px; border-radius: 12px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 10px 20px rgba(37,99,235,0.4), inset 0 2px 5px rgba(255,255,255,0.3);
      border: 1px solid rgba(255,255,255,0.2);
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    </div>
  </div>
  <style>
    @keyframes radar-pulse {
      0% { transform: scale(0.5); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }
  </style>
  `,
  className: '',
  iconSize: [60, 60],
  iconAnchor: [30, 48],
});

const restaurantIcon = new L.DivIcon({
  html: `
  <div style="position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;">
    <!-- Outer Glow -->
    <div style="position: absolute; width: 50px; height: 50px; background: #f97316; filter: blur(20px); opacity: 0.5; animation: restaurant-glow 3s infinite alternate;"></div>
    
    <!-- 3D Restaurant Building -->
    <div style="
      position: relative; z-index: 10; width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 15px 30px rgba(0,0,0,0.6), inset 0 2px 10px rgba(255,255,255,0.1);
      border: 3px solid #f97316;
    ">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 5px #f97316);">
        <!-- Shop Awning -->
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <path d="M3 9h18"></path>
        <path d="M9 22V12h6v10"></path>
        <!-- Store details -->
        <circle cx="12" cy="7" r="1.5" fill="#f97316" />
      </svg>
    </div>

    <!-- Smoke particles -->
    <div style="position: absolute; top: 0; left: 25px; width: 6px; height: 6px; background: rgba(255,255,255,0.3); border-radius: 50%; filter: blur(1px); animation: smoke 2s infinite linear;"></div>
    <div style="position: absolute; top: 5px; left: 35px; width: 8px; height: 8px; background: rgba(255,255,255,0.3); border-radius: 50%; filter: blur(2px); animation: smoke 2.5s infinite linear 1s;"></div>
  </div>
  <style>
    @keyframes restaurant-glow {
    <div style="width: 50px; height: 50px; background: #f59e0b; border-radius: 16px; transform: rotate(45deg); box-shadow: 0 10px 25px rgba(245,158,11,0.4);"></div>
    <div style="position: absolute; color: white; font-size: 24px;">🏪</div>
  </div>
  `,
  className: '',
  iconSize: [70, 70],
  iconAnchor: [35, 35],
});

const riderIcon = new L.DivIcon({
  html: `
  <div style="position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; transform-origin: center;">
    <!-- Map Pin Glow -->
    <div style="position: absolute; width: 40px; height: 40px; background: #3b82f6; filter: blur(15px); opacity: 0.6; border-radius: 50%;"></div>
    
    <!-- Outer Ring -->
    <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; border: 2px solid rgba(59, 130, 246, 0.3); background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); box-shadow: 0 8px 32px rgba(0,0,0,0.5);"></div>
    
    <!-- 3D Navigation Arrow -->
    <div style="position: relative; z-index: 10; transform: translateY(-2px); filter: drop-shadow(0 10px 15px rgba(0,0,0,0.6));">
      <svg width="40" height="40" viewBox="0 0 100 100" style="transform: rotate(-45deg);">
        <!-- Arrow Shadow -->
        <path d="M20 80 L50 15 L80 80 L50 60 Z" fill="rgba(0,0,0,0.4)" transform="translate(0, 8)" filter="blur(4px)" />
        <!-- Arrow Base (Darker Blue) -->
        <path d="M20 80 L50 15 L80 80 L50 60 Z" fill="#2563eb" />
        <!-- Arrow Top (Lighter Blue 3D Effect) -->
        <path d="M50 15 L80 80 L50 60 Z" fill="#60a5fa" />
        <path d="M50 15 L20 80 L50 60 Z" fill="#3b82f6" />
        <!-- Arrow Core Highlight -->
        <path d="M50 25 L50 55" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.5" />
      </svg>
    </div>
  </div>
  `,
  className: '',
  iconSize: [80, 80],
  iconAnchor: [40, 40],
});

// ─── Auto-fit map bounds ─────────────────────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16 });
  }, [points.length]); 

  return null;
}

// ─── Smooth Marker Movement ─────────────────────────────────────────
function SmoothMarker({ position, heading, icon, popupText }: { position: [number, number]; heading?: number; icon: L.DivIcon; popupText: string }) {
  const markerRef = useRef<L.Marker>(null);
  const prevPos = useRef(position);
  const prevHeading = useRef(heading || 0);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const startLat = prevPos.current[0];
    const startLng = prevPos.current[1];
    const endLat = position[0];
    const endLng = position[1];
    
    let startH = prevHeading.current;
    let endH = heading || 0;
    
    // Normalize shortest rotation direction
    let diff = endH - startH;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    endH = startH + diff;

    const duration = 2000;
    const startTime = Date.now();

    let animationFrameId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const lat = startLat + (endLat - startLat) * ease;
      const lng = startLng + (endLng - startLng) * ease;
      const currentH = startH + (endH - startH) * ease;
      
      marker.setLatLng([lat, lng]);
      
      const el = marker.getElement();
      if (el) {
        const innerDiv = el.firstElementChild as HTMLElement;
        if (innerDiv) {
          // Rotate the 3D navigation arrow to point in the direction of travel
          innerDiv.style.transform = `rotate(${currentH}deg)`;
        }
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        prevPos.current = position;
        prevHeading.current = endH;
      }
    };

    animate();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [position[0], position[1], heading]);

  return (
    <Marker ref={markerRef} position={prevPos.current} icon={icon}>
      <Popup className="premium-popup">{popupText}</Popup>
    </Marker>
  );
}

// ─── Main Map Component ──────────────────────────────────────────────
interface TrackingMapProps {
  restaurantLat: number;
  restaurantLng: number;
  customerLat?: number;
  customerLng?: number;
  partnerLat?: number;
  partnerLng?: number;
  partnerHeading?: number;
  status: string;
}

export default function TrackingMap({
  restaurantLat, restaurantLng,
  customerLat, customerLng,
  partnerLat, partnerLng,
  partnerHeading,
  status,
}: TrackingMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (partnerLat && partnerLng) return [partnerLat, partnerLng];
    return [restaurantLat, restaurantLng];
  }, [restaurantLat, restaurantLng, partnerLat, partnerLng]);

  const fitPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [[restaurantLat, restaurantLng]];
    if (customerLat && customerLng) pts.push([customerLat, customerLng]);
    if (partnerLat && partnerLng) pts.push([partnerLat, partnerLng]);
    return pts;
  }, [restaurantLat, restaurantLng, customerLat, customerLng, partnerLat, partnerLng]);

  // Route polyline (Real Road snapping via OSRM)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    const fetchRoute = async () => {
      const waypoints = [];
      
      if (status === 'out_for_delivery') {
        if (partnerLat && partnerLng) waypoints.push(`${partnerLng},${partnerLat}`);
        else waypoints.push(`${restaurantLng},${restaurantLat}`);
        
        if (customerLat && customerLng) waypoints.push(`${customerLng},${customerLat}`);
        else waypoints.push(`72.8777,19.0760`);
      } else {
        waypoints.push(`${restaurantLng},${restaurantLat}`);
        if (partnerLat && partnerLng) waypoints.push(`${partnerLng},${partnerLat}`);
        if (customerLat && customerLng) waypoints.push(`${customerLng},${customerLat}`);
        else waypoints.push(`72.8777,19.0760`);
      }

      if (waypoints.length < 2) return;

      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints.join(';')}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          setRouteCoords(coords);
        }
      } catch (err) {
        // Fallback to straight line
        const fallbackPts: [number, number][] = [];
        if (status === 'out_for_delivery') {
          if (partnerLat && partnerLng) fallbackPts.push([partnerLat, partnerLng]);
          else fallbackPts.push([restaurantLat, restaurantLng]);
          
          if (customerLat && customerLng) fallbackPts.push([customerLat, customerLng]);
        } else {
          fallbackPts.push([restaurantLat, restaurantLng]);
          if (partnerLat && partnerLng) fallbackPts.push([partnerLat, partnerLng]);
          if (customerLat && customerLng) fallbackPts.push([customerLat, customerLng]);
        }
        setRouteCoords(fallbackPts);
      }
    };
    
    fetchRoute();
    const interval = setInterval(fetchRoute, 30000);
    return () => clearInterval(interval);
  }, [restaurantLat, restaurantLng, partnerLat, partnerLng, customerLat, customerLng, status]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        {/* PREMIUM DARK THEME TILE LAYER */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          maxZoom={19}
        />

        <FitBounds points={fitPoints} />

        {/* ─── Glowing Animated Route ─── */}
        {routeCoords.length >= 2 && (
          <>
            {/* Outer large blur glow */}
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#f97316', weight: 15, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
            />
            {/* Inner tight blur glow */}
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#f97316', weight: 6, opacity: 0.4, lineCap: 'round', lineJoin: 'round' }}
            />
            {/* Solid animated core path */}
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                opacity: 0.9,
                dashArray: status === 'out_for_delivery' ? '15, 15' : '0',
                className: status === 'out_for_delivery' ? 'route-path-animated' : ''
              }}
            />
          </>
        )}

        {/* Restaurant marker */}
        <Marker position={[restaurantLat, restaurantLng]} icon={restaurantIcon} zIndexOffset={100} />

        {/* Customer marker */}
        {customerLat && customerLng && (
          <Marker position={[customerLat, customerLng]} icon={customerIcon} zIndexOffset={150} />
        )}

        {/* Delivery partner marker (smooth movement) */}
        {partnerLat && partnerLng && status === 'out_for_delivery' && (
          <SmoothMarker
            position={[partnerLat, partnerLng]}
            heading={partnerHeading}
            icon={riderIcon}
            popupText="🛵 Delivery Partner"
          />
        )}
      </MapContainer>
      
      {/* Route Animation CSS */}
      <style>{`
        .route-path-animated {
          animation: route-dash 1.5s linear infinite;
        }
        @keyframes route-dash {
          to { stroke-dashoffset: -30; }
        }
        .premium-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .premium-popup .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
