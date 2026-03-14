/**
 * GPS VERIFICATION MODULE
 * Captures device location at clock-in with a 15-second timeout.
 * Falls back gracefully when location is unavailable or denied.
 */

export interface GpsResult {
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  timestamp: number;
}

export interface GpsCapture {
  status: "success" | "denied" | "unavailable" | "timeout";
  location: GpsResult | null;
  error?: string;
}

const GPS_TIMEOUT_MS = 15_000;

/**
 * Request the device's current GPS position.
 * Returns within 15 seconds or falls back with a status code.
 */
export function captureLocation(): Promise<GpsCapture> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve({ status: "unavailable", location: null, error: "Geolocation not supported" });
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve({ status: "timeout", location: null, error: "Location request timed out (15s)" });
    }, GPS_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        resolve({
          status: "success",
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
        });
      },
      (error) => {
        clearTimeout(timeoutId);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            resolve({ status: "denied", location: null, error: "Location permission denied" });
            break;
          case error.POSITION_UNAVAILABLE:
            resolve({ status: "unavailable", location: null, error: "Position unavailable" });
            break;
          case error.TIMEOUT:
            resolve({ status: "timeout", location: null, error: "Location request timed out" });
            break;
          default:
            resolve({ status: "unavailable", location: null, error: error.message });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: GPS_TIMEOUT_MS,
        maximumAge: 60_000, // Accept a cached position up to 1 minute old
      }
    );
  });
}

/**
 * Format GPS coordinates for display.
 */
export function formatLocation(loc: GpsResult): string {
  const lat = loc.latitude.toFixed(5);
  const lng = loc.longitude.toFixed(5);
  const acc = Math.round(loc.accuracy);
  return `${lat}, ${lng} (~${acc}m)`;
}
