/**
 * GeohashService.ts
 *
 * Client-side high-performance Geohash service for Olive Pizza Customer App.
 * Computes location hashes, proximity, and instant geofencing offline and online.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BITS = [16, 8, 4, 2, 1];

export interface GeohashPoint {
  lat: number;
  lng: number;
  latErr: number;
  lngErr: number;
}

export class GeohashService {
  public static encode(latitude: number, longitude: number, precision = 6): string {
    let isEven = true;
    let latMin = -90.0, latMax = 90.0;
    let lonMin = -180.0, lonMax = 180.0;
    let bit = 0;
    let ch = 0;
    let geohash = '';

    while (geohash.length < precision) {
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if (longitude > mid) {
          ch |= BITS[bit];
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if (latitude > mid) {
          ch |= BITS[bit];
          latMin = mid;
        } else {
          latMax = mid;
        }
      }

      isEven = !isEven;
      if (bit < 4) {
        bit++;
      } else {
        geohash += BASE32[ch];
        bit = 0;
        ch = 0;
      }
    }

    return geohash;
  }

  public static decode(geohash: string): GeohashPoint {
    let isEven = true;
    let latMin = -90.0, latMax = 90.0;
    let lonMin = -180.0, lonMax = 180.0;

    for (let i = 0; i < geohash.length; i++) {
      const c = geohash[i].toLowerCase();
      const cd = BASE32.indexOf(c);
      if (cd === -1) continue;

      for (let j = 0; j < 5; j++) {
        const mask = BITS[j];
        if (isEven) {
          const lonMid = (lonMin + lonMax) / 2;
          if ((cd & mask) !== 0) {
            lonMin = lonMid;
          } else {
            lonMax = lonMid;
          }
        } else {
          const latMid = (latMin + latMax) / 2;
          if ((cd & mask) !== 0) {
            latMin = latMid;
          } else {
            latMax = latMid;
          }
        }
        isEven = !isEven;
      }
    }

    const lat = (latMin + latMax) / 2;
    const lng = (lonMin + lonMax) / 2;
    const latErr = (latMax - latMin) / 2;
    const lngErr = (lonMax - lonMin) / 2;

    return { lat, lng, latErr, lngErr };
  }

  public static neighbors(geohash: string): string[] {
    const point = this.decode(geohash);
    const lat = point.lat;
    const lng = point.lng;
    const latDelta = point.latErr * 2;
    const lngDelta = point.lngErr * 2;
    const precision = geohash.length;

    const directions = [
      [latDelta, 0],
      [-latDelta, 0],
      [0, lngDelta],
      [0, -lngDelta],
      [latDelta, lngDelta],
      [latDelta, -lngDelta],
      [-latDelta, lngDelta],
      [-latDelta, -lngDelta],
    ];

    const result = [geohash];
    for (const [dLat, dLng] of directions) {
      result.push(this.encode(lat + dLat, lng + dLng, precision));
    }
    return result;
  }

  public static haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }
}
