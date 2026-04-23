"use client";

import { useEffect, useRef, useState } from "react";

export type EventPlaceSelection = {
  location: string;
  locationName?: string;
  locationAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
};

type GooglePlace = {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: unknown;
  fetchFields: (options: { fields: string[] }) => Promise<void>;
};

type GooglePlacePrediction = {
  toPlace: () => GooglePlace;
};

type GooglePlaceSelectEvent = Event & {
  placePrediction: GooglePlacePrediction;
};

type GooglePlaceAutocompleteElement = HTMLElement & {
  placeholder?: string;
  disabled?: boolean;
};

type GooglePlacesLibrary = {
  PlaceAutocompleteElement: new (
    options: Record<string, unknown>,
  ) => GooglePlaceAutocompleteElement;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (libraryName: string) => Promise<unknown>;
      };
    };
    __formeGoogleMapsPlacesLoaded?: () => void;
    __formeGoogleMapsPlacesPromise?: Promise<GooglePlacesLibrary>;
  }
}

function getCoordinate(location: unknown, key: "lat" | "lng") {
  if (!location || typeof location !== "object") {
    return undefined;
  }

  const value = (location as Record<string, unknown>)[key];

  if (typeof value === "function") {
    const coordinate = value.call(location);
    return typeof coordinate === "number" ? coordinate : undefined;
  }

  return typeof value === "number" ? value : undefined;
}

async function loadGooglePlaces(apiKey: string) {
  if (window.google?.maps?.importLibrary) {
    return (await window.google.maps.importLibrary(
      "places",
    )) as GooglePlacesLibrary;
  }

  if (window.__formeGoogleMapsPlacesPromise) {
    return window.__formeGoogleMapsPlacesPromise;
  }

  window.__formeGoogleMapsPlacesPromise = new Promise((resolve, reject) => {
    window.__formeGoogleMapsPlacesLoaded = () => {
      const importLibrary = window.google?.maps?.importLibrary;

      if (!importLibrary) {
        reject(new Error("Google Maps importLibrary is unavailable."));
        return;
      }

      importLibrary("places")
        .then((library) => resolve(library as GooglePlacesLibrary))
        .catch(reject);
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      loading: "async",
      callback: "__formeGoogleMapsPlacesLoaded",
    });

    script.id = "forme-google-maps";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.onerror = () => reject(new Error("Google Places failed to load."));
    document.head.appendChild(script);
  });

  return window.__formeGoogleMapsPlacesPromise;
}

export function GooglePlaceAutocomplete({
  disabled,
  fallbackValue,
  onFallbackValueChange,
  onPlaceSelect,
  resetKey,
}: {
  disabled?: boolean;
  fallbackValue: string;
  onFallbackValueChange: (value: string) => void;
  onPlaceSelect: (place: EventPlaceSelection) => void;
  resetKey: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !hostRef.current) {
      return;
    }

    const googleMapsApiKey = apiKey;
    let isMounted = true;
    let autocompleteElement: GooglePlaceAutocompleteElement | null = null;

    async function mountAutocomplete() {
      try {
        const { PlaceAutocompleteElement } =
          await loadGooglePlaces(googleMapsApiKey);

        if (!isMounted || !hostRef.current) {
          return;
        }

        hostRef.current.replaceChildren();
        autocompleteElement = new PlaceAutocompleteElement({});
        autocompleteElement.placeholder = "Search places";
        autocompleteElement.disabled = Boolean(disabled);
        autocompleteElement.classList.add("w-full");
        autocompleteElement.style.backgroundColor = "var(--background)";
        autocompleteElement.style.border = "1px solid var(--border)";
        autocompleteElement.style.borderRadius = "0.5rem";
        autocompleteElement.style.boxSizing = "border-box";
        autocompleteElement.style.colorScheme = "light";
        autocompleteElement.style.height = "2.25rem";
        autocompleteElement.style.maxWidth = "100%";
        autocompleteElement.style.minWidth = "0";
        autocompleteElement.style.width = "100%";

        autocompleteElement.addEventListener("gmp-select", async (event) => {
          const { placePrediction } = event as GooglePlaceSelectEvent;
          const place = placePrediction.toPlace();

          await place.fetchFields({
            fields: ["displayName", "formattedAddress", "location"],
          });

          const locationName = place.displayName?.trim() || undefined;
          const locationAddress = place.formattedAddress?.trim() || undefined;
          const location = locationName ?? locationAddress;

          if (!location) {
            return;
          }

          onPlaceSelect({
            location,
            locationName,
            locationAddress,
            placeId: place.id,
            latitude: getCoordinate(place.location, "lat"),
            longitude: getCoordinate(place.location, "lng"),
          });
        });

        hostRef.current.appendChild(autocompleteElement);
        setLoadError(null);
      } catch {
        if (isMounted) {
          setLoadError("Place search is unavailable.");
        }
      }
    }

    void mountAutocomplete();

    return () => {
      isMounted = false;
      autocompleteElement?.remove();
    };
  }, [apiKey, disabled, onPlaceSelect, resetKey]);

  if (!apiKey || loadError) {
    return (
      <input
        value={fallbackValue}
        onChange={(event) => onFallbackValueChange(event.target.value)}
        placeholder={loadError ?? "Office"}
        disabled={disabled}
        className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20"
      />
    );
  }

  return (
    <div className="min-w-0">
      <div
        ref={hostRef}
        className="forme-place-autocomplete min-h-9 min-w-0 bg-background"
      />
    </div>
  );
}
