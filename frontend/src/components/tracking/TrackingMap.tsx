import { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import { Radio, AlertCircle, Navigation, ShieldCheck } from 'lucide-react';

// ─── Global CSS injected into the page ──────────────────────────────────
const GLOBAL_CSS = `
  @keyframes radar-pulse {
    0%   { transform: scale(0.5); opacity: 0.9; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes float-label {
    0%,100% { transform: translateX(-50%) translateY(0px); }
    50%     { transform: translateX(-50%) translateY(-3px); }
  }
  @keyframes rider-glow {
    0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.45); }
    50%     { box-shadow: 0 0 0 14px rgba(249,115,22,0); }
  }
  @keyframes route-dash {
    to { stroke-dashoffset: -30; }
  }
  .route-path-animated {
    animation: route-dash 1.5s linear infinite;
  }
  .premium-popup .leaflet-popup-content-wrapper {
    background: rgba(18, 21, 30, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.12);
    color: #f8fafc;
    border-radius: 16px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.5);
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
  }
  .premium-popup .leaflet-popup-tip-container { display: none; }
  .leaflet-attribution-flag { display: none !important; }
  .leaflet-control-attribution {
    background: rgba(10, 13, 20, 0.75) !important;
    backdrop-filter: blur(4px);
    border-radius: 8px 0 0 0 !important;
    font-size: 9px !important;
    color: #94a3b8 !important;
  }
  .leaflet-control-attribution a {
    color: #f97316 !important;
  }
`;

// ─── Destination / Customer Icon ─────────────────────────────────────────
const customerIcon = new L.DivIcon({
  html: `
  <div style="position:relative;width:56px;height:68px;display:flex;flex-direction:column;align-items:center;">
    <div style="position:absolute;top:4px;width:50px;height:50px;border-radius:50%;border:2px solid #3b82f6;opacity:0.55;animation:radar-pulse 2s infinite cubic-bezier(0.1,0.8,0.3,1);"></div>
    <div style="position:absolute;top:4px;width:50px;height:50px;border-radius:50%;border:2px solid #3b82f6;opacity:0.35;animation:radar-pulse 2s 0.9s infinite cubic-bezier(0.1,0.8,0.3,1);"></div>
    <div style="position:relative;z-index:10;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(37,99,235,0.45),inset 0 1px 4px rgba(255,255,255,0.35);border:2.5px solid rgba(255,255,255,0.95);margin-top:9px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>
    <div style="width:2.5px;height:10px;background:linear-gradient(to bottom,#3b82f6,transparent);margin-top:-1px;z-index:9;border-radius:2px;"></div>
  </div>`,
  className: '',
  iconSize: [56, 68],
  iconAnchor: [28, 68],
});

// ─── Restaurant Icon ─────────────────────────────────────────────────────
const restaurantMapIcon = new L.DivIcon({
  html: `
  <div style="position:relative;width:60px;height:74px;display:flex;flex-direction:column;align-items:center;">
    <div style="position:absolute;top:-24px;left:50%;transform:translateX(-50%);background:#18181b;color:#f97316;font-size:10px;font-weight:800;padding:2px 9px;border-radius:10px;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.4);animation:float-label 2.5s ease-in-out infinite;border:1.5px solid rgba(249,115,22,0.4);letter-spacing:0.2px;">🍕 Olive Pizza</div>
    <div style="position:relative;z-index:10;width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,#1f130b,#2d1a0c);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(249,115,22,0.3),inset 0 1px 4px rgba(255,255,255,0.2);border:2px solid #f97316;margin-top:25px;">
      <span style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🍕</span>
    </div>
    <div style="width:2.5px;height:9px;background:linear-gradient(to bottom,#f97316,transparent);margin-top:-1px;z-index:9;border-radius:2px;"></div>
  </div>`,
  className: '',
  iconSize: [60, 74],
  iconAnchor: [30, 74],
});

// ─── Rider / Delivery Partner Icon ──────────────────────────────────────
const riderIcon = new L.DivIcon({
  html: `
  <div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;transform-origin:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(249,115,22,0.25);border:2px solid rgba(249,115,22,0.6);animation:rider-glow 2s infinite;"></div>
    <div style="position:relative;z-index:10;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ea580c,#f97316);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(234,88,12,0.5);border:2px solid white;">
      <span style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🛵</span>
    </div>
  </div>`,
  className: '',
  iconSize: [64, 64],
  iconAnchor: [32, 32],
});

// ─── Auto-Fit Bounds ──────────────────────────────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;
    if (fitted.current && points.length === 1) return;
    try {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
      if (points.length > 1) fitted.current = true;
    } catch {}
  }, [points.length, points[0]?.[0], points[0]?.[1]]);

  return null;
}

// ─── Smooth Animated Rider Marker ─────────────────────────────────────────
function SmoothMarker({
  position,
  heading,
  icon,
  popupText,
}: {
  position: [number, number];
  heading?: number;
  icon: L.DivIcon;
  popupText: string;
}) {
  const markerRef = useRef<L.Marker>(null);
  const prevPos = useRef<[number, number]>(position);
  const prevHeading = useRef(heading || 0);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const [startLat, startLng] = prevPos.current;
    const [endLat, endLng] = position;
    let startH = prevHeading.current;
    let endH = heading || 0;

    let diff = endH - startH;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    endH = startH + diff;

    const duration = 1800;
    const startTime = Date.now();
    let rafId: number;

    const tick = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      marker.setLatLng([
        startLat + (endLat - startLat) * ease,
        startLng + (endLng - startLng) * ease,
      ]);

      const el = marker.getElement();
      if (el) {
        const inner = el.firstElementChild as HTMLElement | null;
        if (inner) inner.style.transform = `rotate(${startH + (endH - startH) * ease}deg)`;
      }

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevPos.current = position;
        prevHeading.current = endH;
      }
    };

    tick();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [position[0], position[1], heading]);

  return (
    <Marker ref={markerRef} position={prevPos.current} icon={icon}>
      <Popup className="premium-popup">{popupText}</Popup>
    </Marker>
  );
}

// ─── Main TrackingMap Component ───────────────────────────────────────────
export interface TrackingMapProps {
  restaurantLat: number;
  restaurantLng: number;
  customerLat?: number;
  customerLng?: number;
  partnerLat?: number;
  partnerLng?: number;
  partnerHeading?: number;
  partnerName?: string;
  status: string;
  lastTelemetryAt?: string | number | null;
  onRouteChange?: (info: { distanceKm: number | null; durationMinutes: number | null; routeStatus: 'available' | 'unavailable' }) => void;
}

const TrackingMap = React.memo(function TrackingMap({
  restaurantLat,
  restaurantLng,
  customerLat,
  customerLng,
  partnerLat,
  partnerLng,
  partnerHeading,
  partnerName,
  status,
  lastTelemetryAt,
  onRouteChange,
}: TrackingMapProps) {
  const center = useMemo<[number, number]>(() => {
    if (partnerLat && partnerLng) return [partnerLat, partnerLng];
    if (customerLat && customerLng) return [customerLat, customerLng];
    return [restaurantLat, restaurantLng];
  }, [restaurantLat, restaurantLng, customerLat, customerLng, partnerLat, partnerLng]);

  const fitPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [[restaurantLat, restaurantLng]];
    if (customerLat && customerLng) pts.push([customerLat, customerLng]);
    if (partnerLat && partnerLng) pts.push([partnerLat, partnerLng]);
    return pts;
  }, [restaurantLat, restaurantLng, customerLat, customerLng, partnerLat, partnerLng]);

  // Real-road route via OSRM
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeStatus, setRouteStatus] = useState<'available' | 'unavailable' | 'loading'>('loading');

  // GPS Telemetry Freshness Assessment
  const telemetryAgeSeconds = useMemo(() => {
    if (!lastTelemetryAt) return null;
    const timeMs = typeof lastTelemetryAt === 'number' ? lastTelemetryAt : new Date(lastTelemetryAt).getTime();
    return Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
  }, [lastTelemetryAt, partnerLat, partnerLng]);

  const gpsStatus = useMemo<'live' | 'stale' | 'unavailable'>(() => {
    if (!partnerLat || !partnerLng) return 'unavailable';
    if (telemetryAgeSeconds === null) return 'live';
    return telemetryAgeSeconds <= 45 ? 'live' : 'stale';
  }, [partnerLat, partnerLng, telemetryAgeSeconds]);

  useEffect(() => {
    const fetchRoute = async () => {
      const waypoints: string[] = [];

      if (status === 'out_for_delivery' || status === 'picked_up') {
        waypoints.push(
          partnerLat && partnerLng
            ? `${partnerLng},${partnerLat}`
            : `${restaurantLng},${restaurantLat}`
        );
        if (customerLat && customerLng) {
          waypoints.push(`${customerLng},${customerLat}`);
        } else {
          setRouteStatus('unavailable');
          onRouteChange?.({ distanceKm: null, durationMinutes: null, routeStatus: 'unavailable' });
          return;
        }
      } else {
        waypoints.push(`${restaurantLng},${restaurantLat}`);
        if (customerLat && customerLng) {
          waypoints.push(`${customerLng},${customerLat}`);
        } else {
          setRouteStatus('unavailable');
          onRouteChange?.({ distanceKm: null, durationMinutes: null, routeStatus: 'unavailable' });
          return;
        }
      }

      if (waypoints.length < 2) {
        setRouteStatus('unavailable');
        onRouteChange?.({ distanceKm: null, durationMinutes: null, routeStatus: 'unavailable' });
        return;
      }

      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${waypoints.join(';')}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.[0]?.geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRouteCoords(coords);
          setRouteStatus('available');

          const durationSeconds = data.routes[0].duration || 0;
          const distanceMeters = data.routes[0].distance || 0;

          const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
          const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;

          onRouteChange?.({ distanceKm, durationMinutes, routeStatus: 'available' });
        } else {
          throw new Error('No route returned by OSRM');
        }
      } catch (e) {
        setRouteCoords([]);
        setRouteStatus('unavailable');
        onRouteChange?.({ distanceKm: null, durationMinutes: null, routeStatus: 'unavailable' });
      }
    };

    fetchRoute();
    const id = setInterval(fetchRoute, 30_000);
    return () => clearInterval(id);
  }, [restaurantLat, restaurantLng, partnerLat, partnerLng, customerLat, customerLng, status]);

  const popupText = partnerName 
    ? `🛵 ${partnerName} is on the way!` 
    : "🛵 Your delivery partner is on the way!";

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden bg-[#0a0d14]">
      <style>{GLOBAL_CSS}</style>

      {/* Floating Truthful Telemetry Badge */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 pointer-events-none">
        {status === 'out_for_delivery' || status === 'picked_up' ? (
          <div className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-[11px] font-bold flex items-center gap-2 shadow-lg ${
            gpsStatus === 'live'
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400'
              : gpsStatus === 'stale'
              ? 'bg-amber-950/80 border-amber-500/30 text-amber-400'
              : 'bg-slate-900/80 border-white/10 text-slate-400'
          }`}>
            <span className="relative flex h-2 w-2">
              {gpsStatus === 'live' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                gpsStatus === 'live' ? 'bg-emerald-500' : gpsStatus === 'stale' ? 'bg-amber-500' : 'bg-slate-500'
              }`} />
            </span>
            <span>
              {gpsStatus === 'live'
                ? 'Rider location updated just now'
                : gpsStatus === 'stale'
                ? 'Rider location is temporarily unavailable'
                : 'Awaiting rider telemetry'}
            </span>
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 bg-slate-900/80 text-[11px] font-bold text-slate-300 flex items-center gap-2 shadow-lg">
            <Radio className="w-3.5 h-3.5 text-primary-400 animate-pulse" />
            <span>Kitchen prep in progress</span>
          </div>
        )}

        {routeStatus === 'unavailable' && (
          <div className="px-3 py-1 rounded-xl backdrop-blur-md border border-amber-500/20 bg-amber-950/70 text-[10px] font-medium text-amber-300 flex items-center gap-1.5 shadow-md">
            <AlertCircle className="w-3 h-3" />
            <span>Route information is temporarily unavailable</span>
          </div>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <FitBounds points={fitPoints} />

        {/* ── Route Polylines ── */}
        {routeCoords.length >= 2 && (
          <>
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#ea580c', weight: 14, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: '#f97316', weight: 4.5, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                opacity: 0.85,
                dashArray: (status === 'out_for_delivery' || status === 'picked_up') ? '10, 14' : '0',
                className: (status === 'out_for_delivery' || status === 'picked_up') ? 'route-path-animated' : '',
              }}
            />
          </>
        )}

        {/* Restaurant pin */}
        <Marker position={[restaurantLat, restaurantLng]} icon={restaurantMapIcon} zIndexOffset={100} />

        {/* Customer destination pin */}
        {customerLat && customerLng && (
          <Marker position={[customerLat, customerLng]} icon={customerIcon} zIndexOffset={150} />
        )}

        {/* Rider marker — only when coordinates exist and order is on the way */}
        {partnerLat && partnerLng && (status === 'out_for_delivery' || status === 'picked_up') && (
          <SmoothMarker
            position={[partnerLat, partnerLng]}
            heading={partnerHeading}
            icon={riderIcon}
            popupText={popupText}
          />
        )}
      </MapContainer>
    </div>
  );
});

export default TrackingMap;
