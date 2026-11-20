import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const KEY = 'sd_location';
const LocationContext = createContext(null);

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? null;
  } catch {
    return null;
  }
}

// Area name from OpenStreetMap Nominatim (free). Only called when the location changes.
async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=en&lat=${lat}&lon=${lng}`,
    );
    if (!res.ok) return null;
    const { address = {} } = await res.json();
    const area = address.suburb ?? address.neighbourhood ?? address.quarter ?? address.village ?? address.road;
    const city = address.city ?? address.town ?? address.state_district ?? address.county;
    return [area, city].filter(Boolean).join(', ') || null;
  } catch {
    return null;
  }
}

export function LocationProvider({ children }) {
  const [location, setLocationState] = useState(read);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const setLocation = useCallback(async (coords) => {
    const next = { lat: coords.lat, lng: coords.lng, label: null };
    localStorage.setItem(KEY, JSON.stringify(next));
    setLocationState(next);
    const label = await reverseGeocode(coords);
    if (label) {
      const withLabel = { ...next, label };
      localStorage.setItem(KEY, JSON.stringify(withLabel));
      setLocationState((cur) => (cur?.lat === next.lat && cur?.lng === next.lng ? withLabel : cur));
    }
  }, []);

  const detect = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setError('Location is not supported in this browser');
          return resolve(false);
        }
        setStatus('loading');
        setError(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setStatus('idle');
            resolve(true);
          },
          (err) => {
            setError(err.code === 1 ? 'Location permission denied. Please pick your location on the map.' : 'Could not get your location');
            setStatus('idle');
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10_000 },
        );
      }),
    [setLocation],
  );

  const value = useMemo(
    () => ({ location, setLocation, detect, status, error }),
    [location, setLocation, detect, status, error],
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useUserLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useUserLocation must be used inside LocationProvider');
  return ctx;
}
