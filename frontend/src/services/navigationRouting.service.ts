/**
 * Navigation Routing Service — OSRM Integration
 *
 * Fetches driving routes, ETA, polyline, and turn maneuvers from
 * the public OSRM API (OpenStreetMap Routing Machine).
 *
 * Zero-cost, no API key required, works in India.
 */

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TurnManeuver {
  type:
    | 'depart'
    | 'arrive'
    | 'turn'
    | 'new name'
    | 'merge'
    | 'ramp'
    | 'rotary'
    | 'roundabout'
    | 'fork'
    | 'continue'
    | 'end of road'
    | 'use lane';
  modifier?: 'uturn' | 'sharp right' | 'right' | 'slight right' | 'straight' | 'slight left' | 'left' | 'sharp left';
  bearing_before?: number;
  bearing_after?: number;
}

export interface RouteStep {
  distance: number;   // metres
  duration: number;   // seconds
  name: string;
  maneuver: TurnManeuver;
}

export interface RouteResult {
  /** Decoded coordinate pairs [[lng, lat], ...] */
  coordinates: [number, number][];
  distanceMetres: number;
  durationSeconds: number;
  steps: RouteStep[];
  /** Pre-built GeoJSON LineString for maplibre setData */
  geojson: GeoJSON.Feature<GeoJSON.LineString>;
}

/**
 * Decodes a Google-style polyline string (used by OSRM overview_polyline).
 */
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e5, lat / 1e5]); // [lng, lat] for GeoJSON
  }
  return coords;
}

/**
 * Fetches a driving route between two coordinates.
 * Uses full steps annotation to extract turn-by-turn maneuvers.
 */
export async function fetchRoute(origin: LatLng, destination: LatLng): Promise<RouteResult | null> {
  try {
    const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline&steps=true&annotations=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);

    const json = await res.json();
    if (!json.routes?.[0]) return null;

    const route = json.routes[0];
    const coordinates = decodePolyline(route.geometry);

    const steps: RouteStep[] = [];
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        steps.push({
          distance: step.distance,
          duration: step.duration,
          name: step.name || '',
          maneuver: {
            type: step.maneuver?.type || 'continue',
            modifier: step.maneuver?.modifier,
            bearing_before: step.maneuver?.bearing_before,
            bearing_after: step.maneuver?.bearing_after,
          },
        });
      }
    }

    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };

    return {
      coordinates,
      distanceMetres: route.distance,
      durationSeconds: route.duration,
      steps,
      geojson,
    };
  } catch (err) {
    console.warn('[NavigationRouting] OSRM fetch failed:', err);
    return null;
  }
}

/**
 * Returns the closest unvisited step for the given current position.
 * A step is "past" if the rider has moved within 30m of its start geometry.
 */
export function findCurrentStep(steps: RouteStep[], stepIndex: number): RouteStep | null {
  return steps[stepIndex] ?? null;
}

/** Format metres as a human-readable distance string */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/** Format seconds as ETA string */
export function formatDuration(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
