/** Minimal surface of the Google Maps JS Geocoder this app uses (no @types/google.maps dependency). */
export interface GoogleGeocoderApi {
  geocode(request: { address: string }): Promise<{
    results: { formatted_address: string; geometry: { location: { lat(): number; lng(): number } } }[];
  }>;
}

interface GoogleMapsGlobal {
  maps: { Geocoder: new () => GoogleGeocoderApi };
}

declare global {
  interface Window {
    google?: GoogleMapsGlobal;
    __ocGoogleMapsReady?: () => void;
  }
}

let loading: Promise<GoogleMapsGlobal> | null = null;

/** Load the Maps JS API once per page and return a Geocoder. */
export async function loadGoogleGeocoder(apiKey: string): Promise<GoogleGeocoderApi> {
  loading ??= new Promise<GoogleMapsGlobal>((resolve, reject) => {
    window.__ocGoogleMapsReady = () => (window.google ? resolve(window.google) : reject(new Error('google maps missing')));
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__ocGoogleMapsReady`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error('failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });
  const google = await loading;
  return new google.maps.Geocoder();
}
