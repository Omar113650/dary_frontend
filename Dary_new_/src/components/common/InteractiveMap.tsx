import { useEffect, useRef, useState, useCallback } from 'react';
import {
  LocationService,
  DEFAULT_RADIUS_KM,
  calculateDistanceKm,
  resolveCoordinates,
  isCoordinateValidForContext,
  formatCleanAddress,
} from '../../services/locationService';
import type {
  NearbyPlace,
  Coordinates,
  ReverseGeocodeResult,
  RouteDirectionsResult,
  AddressSuggestion,
} from '../../services/locationService';

export interface MapMarkerItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  priceText?: string;
  href?: string;
  color?: string;
}

export interface LocationContextInput {
  address?: string;
  district?: string;
  city?: string;
  governorate?: string;
  nearestUniversity?: string;
  university?: string;
  location?: { ar?: string; en?: string } | string;
  title?: { ar?: string; en?: string } | string;
  id?: string;
}

export interface InteractiveMapProps {
  latitude?: number | string | null;
  longitude?: number | string | null;
  locationContext?: LocationContextInput;
  title?: string;
  subtitle?: string;
  height?: string;
  zoom?: number;
  editable?: boolean;
  autoDetectOnMount?: boolean;
  onLocationChange?: (lat: number, lng: number, reverseAddress?: ReverseGeocodeResult | null) => void;
  onAddressResolved?: (cleanAddress: string, reverseAddress?: ReverseGeocodeResult | null) => void;
  showNearby?: boolean;
  initialRadiusKm?: number;
  syncProfileOnDetect?: boolean;
  onProfileSynced?: (lat: number, lng: number, reverseAddress?: ReverseGeocodeResult | null) => void;
  markers?: MapMarkerItem[];
  locale?: 'ar' | 'en';
}

declare global {
  interface Window {
    L?: any;
  }
}

let leafletLoadPromise: Promise<any> | null = null;

function loadLeafletFromCdn(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoadPromise) return leafletLoadPromise;

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById('leaflet-js-cdn') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'leaflet-js-cdn';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = (err) => {
      leafletLoadPromise = null;
      reject(err);
    };
    document.body.appendChild(script);
  });

  return leafletLoadPromise;
}

const CATEGORY_META: Record<
  NearbyPlace['category'],
  { icon: string; ar: string; en: string; bg: string; color: string }
> = {
  university: { icon: '🎓', ar: 'جامعة / كلية', en: 'University', bg: '#DBEAFE', color: '#1D4ED8' },
  transport: { icon: '🚇', ar: 'مواصلات / مترو', en: 'Transit', bg: '#E0E7FF', color: '#4338CA' },
  pharmacy: { icon: '💊', ar: 'صيدلية', en: 'Pharmacy', bg: '#DCFCE7', color: '#15803D' },
  hospital: { icon: '🏥', ar: 'مستشفى / مركز طبي', en: 'Medical', bg: '#FEE2E2', color: '#B91C1C' },
  supermarket: { icon: '🛒', ar: 'سوبر ماركت', en: 'Supermarket', bg: '#FEF3C7', color: '#B45309' },
  restaurant: { icon: '🍽️', ar: 'مطعم', en: 'Restaurant', bg: '#FFEDD5', color: '#C2410C' },
  cafe: { icon: '☕', ar: 'كافيه / مذاكرة', en: 'Study Cafe', bg: '#F3E8FF', color: '#6B21A8' },
  other: { icon: '📍', ar: 'خدمة قريبة', en: 'Nearby Place', bg: '#F1F5F9', color: '#475569' },
};

export default function InteractiveMap({
  latitude,
  longitude,
  locationContext,
  title,
  subtitle,
  height = '380px',
  zoom = 15,
  editable = false,
  autoDetectOnMount = false,
  onLocationChange,
  onAddressResolved,
  showNearby = true,
  initialRadiusKm = DEFAULT_RADIUS_KM,
  syncProfileOnDetect = false,
  onProfileSynced,
  markers = [],
  locale = 'ar',
}: InteractiveMapProps) {
  const numLat = latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : NaN;
  const numLng = longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : NaN;

  const fullContext: LocationContextInput = {
    ...locationContext,
    title: locationContext?.title || title,
  };

  // Validate explicit coordinates against the property's actual city/governorate/university
  // (Rejects default Cairo 30.0444, 31.2357 when the property is in Mansoura or another city!)
  const hasExplicitCoords = isCoordinateValidForContext(numLat, numLng, fullContext);

  const initialSeed = resolveCoordinates({
    ...fullContext,
    latitude: hasExplicitCoords ? numLat : undefined,
    longitude: hasExplicitCoords ? numLng : undefined,
  });

  const [activeCoords, setActiveCoords] = useState<{ latitude: number; longitude: number; isGeocoded?: boolean }>({
    latitude: initialSeed.latitude,
    longitude: initialSeed.longitude,
    isGeocoded: hasExplicitCoords,
  });
  const [resolvedAddressText, setResolvedAddressText] = useState<string>('');
  const [geocodingBusy, setGeocodingBusy] = useState<boolean>(false);
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searchingSuggestions, setSearchingSuggestions] = useState<boolean>(false);

  const safeLat = activeCoords.latitude;
  const safeLng = activeCoords.longitude;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const autoDetectTriggeredRef = useRef(false);
  const manualPinPickRef = useRef(false);
  const lastCameraCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  const [leafletReady, setLeafletReady] = useState(false);
  const [leafletFailed, setLeafletFailed] = useState(false);

  // User GPS & Route Navigation state (only used in non-editable viewer mode)
  const [userCoords, setUserCoords] = useState<Coordinates | null>(() =>
    editable ? null : LocationService.getCachedUserLocation()
  );
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [routeData, setRouteData] = useState<RouteDirectionsResult | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [travelMode, setTravelMode] = useState<'walking' | 'driving'>('walking');
  const [pickOriginMode, setPickOriginMode] = useState<boolean>(false);
  const [showRouteSteps, setShowRouteSteps] = useState<boolean>(true);

  // Nearby state
  const [radiusKm, setRadiusKm] = useState<number>(initialRadiusKm);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Helper to move map camera cleanly without causing jitter/zoom loops
  const moveCameraTo = useCallback(
    (lat: number, lng: number, targetZoom?: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      lastCameraCenterRef.current = { lat, lng };
      if (mapInstanceRef.current) {
        const z = targetZoom ?? Math.max(mapInstanceRef.current.getZoom() || zoom, 15);
        mapInstanceRef.current.setView([lat, lng], z, { animate: false });
      }
    },
    [zoom]
  );

  // 1. Sync explicit latitude/longitude props if provided AND valid
  useEffect(() => {
    if (hasExplicitCoords) {
      setActiveCoords((prev) => {
        if (Math.abs(prev.latitude - numLat) > 0.00001 || Math.abs(prev.longitude - numLng) > 0.00001) {
          moveCameraTo(numLat, numLng, 16);
          return { latitude: numLat, longitude: numLng, isGeocoded: true };
        }
        return prev;
      });
    }
  }, [hasExplicitCoords, numLat, numLng, moveCameraTo]);

  const lastGeocodedSigRef = useRef<string | null>(null);

  // 2. Dynamic Forward Geocoding (only in viewer mode or when editable has no explicit coords yet)
  useEffect(() => {
    // In editable mode, do not auto-override while the owner is typing in form inputs;
    // the owner uses the search bar, suggestions, "Resolve from fields" button, GPS button, or map click/drag.
    if (editable && (manualPinPickRef.current || hasExplicitCoords)) return;

    const contextSignature = [
      fullContext.address,
      fullContext.district,
      fullContext.nearestUniversity,
      fullContext.university,
      fullContext.city,
      fullContext.governorate,
      !editable
        ? typeof fullContext.title === 'object'
          ? `${fullContext.title.ar || ''}`
          : String(fullContext.title || '')
        : '',
    ]
      .map((s) => (s || '').trim())
      .join('|');

    const hasAddressData = contextSignature.replace(/\|/g, '').length > 0;
    if (!hasAddressData) return;

    const contextChanged = lastGeocodedSigRef.current !== null && lastGeocodedSigRef.current !== contextSignature;
    if (hasExplicitCoords && !contextChanged) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setGeocodingBusy(true);
      try {
        const geocoded = await LocationService.geocodeAddress(fullContext);
        if (!cancelled && geocoded) {
          lastGeocodedSigRef.current = contextSignature;
          setActiveCoords({
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            isGeocoded: true,
          });
          moveCameraTo(geocoded.latitude, geocoded.longitude, zoom);
          const rev = await LocationService.reverseGeocode(geocoded.latitude, geocoded.longitude, locale);
          if (!cancelled && rev?.address) {
            setResolvedAddressText(rev.address);
            const cleanAddr = formatCleanAddress(fullContext, rev.address, locale);
            if (onAddressResolved) {
              onAddressResolved(cleanAddr || rev.address, rev);
            }
          }
        }
      } finally {
        if (!cancelled) setGeocodingBusy(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    hasExplicitCoords,
    fullContext.address,
    fullContext.district,
    fullContext.city,
    fullContext.governorate,
    fullContext.nearestUniversity,
    fullContext.university,
    title,
    editable,
    zoom,
    locale,
    moveCameraTo,
  ]);

  // 3. Reverse geocode active coordinates so user sees the real street/area name and nearest university
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const rev = await LocationService.reverseGeocode(safeLat, safeLng, locale);
      if (!cancelled && rev?.address) {
        setResolvedAddressText(rev.address);
        const cleanAddr = manualPinPickRef.current
          ? rev.address
          : formatCleanAddress(fullContext, rev.address, locale) || rev.address;
        if (onAddressResolved) {
          onAddressResolved(cleanAddr, rev);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [safeLat, safeLng, locale]);

  // 3b. Live Autocomplete Suggestions when typing in the map search bar (editable mode)
  useEffect(() => {
    if (!editable) return;
    const q = mapSearchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchingSuggestions(false);
      return;
    }

    let cancelled = false;
    setSearchingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const list = await LocationService.searchAddressSuggestions(q, locale);
        if (!cancelled) {
          setSuggestions(list);
          setShowSuggestions(list.length > 0);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearchingSuggestions(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mapSearchQuery, editable, locale]);

  // Load Leaflet library on mount
  useEffect(() => {
    let mounted = true;
    loadLeafletFromCdn()
      .then(() => {
        if (mounted) setLeafletReady(true);
      })
      .catch(() => {
        if (mounted) setLeafletFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch REAL Nearby Places when coordinates or radius change (debounced to prevent lag while dragging pin)
  useEffect(() => {
    if (!showNearby) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingNearby(true);
      try {
        const res = await LocationService.getNearbyPlaces(safeLat, safeLng, radiusKm);
        if (!cancelled) setNearbyPlaces(res.places || []);
      } catch {
        if (!cancelled) setNearbyPlaces([]);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [safeLat, safeLng, radiusKm, showNearby]);

  // Handle interactive map click or drag -> reverse geocode + notify parent
  const handleInteractivePick = useCallback(
    async (lat: number, lng: number) => {
      manualPinPickRef.current = true;
      lastCameraCenterRef.current = { lat, lng };
      setActiveCoords({ latitude: lat, longitude: lng, isGeocoded: true });
      const rev = await LocationService.reverseGeocode(lat, lng, locale);
      if (rev?.address) {
        setResolvedAddressText(rev.address);
      }
      if (onLocationChange) {
        onLocationChange(lat, lng, rev);
      }
      if (onAddressResolved && rev?.address) {
        onAddressResolved(rev.address, rev);
      }
      if (rev?.address) {
        setGpsStatusMsg({
          type: 'success',
          text:
            locale === 'ar'
              ? `✓ تم تحديث الموقع وملء الحقول تلقائياً: ${rev.address}${
                  rev.nearestUniversity ? ` (الأقرب: ${rev.nearestUniversity} - ${rev.distanceToUniversityKm} كم)` : ''
                }`
              : `✓ Updated location & auto-filled fields: ${rev.address}`,
        });
      }
    },
    [locale, onLocationChange, onAddressResolved]
  );

  // Select a suggestion from the live autocomplete dropdown
  const handleSelectSuggestion = useCallback(
    async (sug: AddressSuggestion) => {
      setShowSuggestions(false);
      setMapSearchQuery(sug.fullAddress);
      manualPinPickRef.current = true;
      setActiveCoords({ latitude: sug.latitude, longitude: sug.longitude, isGeocoded: true });
      moveCameraTo(sug.latitude, sug.longitude, 16);

      setGeocodingBusy(true);
      try {
        const rev = await LocationService.reverseGeocode(sug.latitude, sug.longitude, locale);
        const mergedRev: ReverseGeocodeResult = {
          displayName: rev?.displayName || sug.fullAddress,
          address: rev?.address || sug.fullAddress,
          street: rev?.street || sug.district,
          building: rev?.building,
          district: rev?.district || sug.district || sug.title,
          city: rev?.city || sug.city,
          governorate: rev?.governorate || sug.governorate,
          country: locale === 'ar' ? 'مصر' : 'Egypt',
          nearestUniversity: rev?.nearestUniversity || sug.nearestUniversity,
          distanceToUniversityKm: rev?.distanceToUniversityKm ?? sug.distanceToUniversityKm,
        };
        setResolvedAddressText(mergedRev.address);
        if (onLocationChange) {
          onLocationChange(sug.latitude, sug.longitude, mergedRev);
        }
        if (onAddressResolved) {
          onAddressResolved(mergedRev.address, mergedRev);
        }
        setGpsStatusMsg({
          type: 'success',
          text:
            locale === 'ar'
              ? `✓ تم تحديد عنوان الشقة على الـ GPS وملء جميع الحقول تلقائياً: ${mergedRev.address}${
                  mergedRev.nearestUniversity
                    ? ` • الجامعة الأقرب: ${mergedRev.nearestUniversity} (${mergedRev.distanceToUniversityKm} كم)`
                    : ''
                }`
              : `✓ Apartment address pinned on GPS & all fields auto-filled: ${mergedRev.address}`,
        });
      } finally {
        setGeocodingBusy(false);
      }
    },
    [locale, moveCameraTo, onLocationChange, onAddressResolved]
  );

  // Search box / form fields handler on editable map to jump to any street/university/city and fill address fields
  const handleMapSearchSubmit = useCallback(
    async (e?: React.FormEvent, useFormFieldsOnly = false) => {
      if (e) e.preventDefault();
      setShowSuggestions(false);
      const q = useFormFieldsOnly ? '' : mapSearchQuery.trim();

      setGeocodingBusy(true);
      try {
        const resolved = await LocationService.resolveFreeformAddress(
          {
            freeformQuery: q || undefined,
            address: fullContext.address,
            district: fullContext.district,
            city: fullContext.city,
            governorate: fullContext.governorate,
            nearestUniversity: fullContext.nearestUniversity,
          },
          locale
        );

        if (!resolved) {
          setGpsStatusMsg({
            type: 'error',
            text:
              locale === 'ar'
                ? 'يرجى كتابة اسم الشارع أو المنطقة أو المدينة في مربع البحث أو في الحقول أولاً.'
                : 'Please type a street, area, or city in the search box or fields first.',
          });
          return;
        }

        manualPinPickRef.current = true;
        setActiveCoords({ latitude: resolved.latitude, longitude: resolved.longitude, isGeocoded: true });
        moveCameraTo(resolved.latitude, resolved.longitude, 16);

        const revPayload: ReverseGeocodeResult = {
          displayName: resolved.reverseResult?.displayName || resolved.address,
          address: resolved.address,
          street: resolved.reverseResult?.street || resolved.district,
          building: resolved.reverseResult?.building,
          district: resolved.district,
          city: resolved.city,
          governorate: resolved.governorate,
          country: locale === 'ar' ? 'مصر' : 'Egypt',
          nearestUniversity: resolved.nearestUniversity,
          distanceToUniversityKm: resolved.distanceToUniversityKm,
        };

        setResolvedAddressText(revPayload.address);
        if (onLocationChange) {
          onLocationChange(resolved.latitude, resolved.longitude, revPayload);
        }
        if (onAddressResolved) {
          onAddressResolved(revPayload.address, revPayload);
        }
        setGpsStatusMsg({
          type: 'success',
          text:
            locale === 'ar'
              ? `✓ تم تحديد موقع العنوان على الـ GPS وملء جميع الحقول تلقائياً: ${revPayload.address}${
                  revPayload.nearestUniversity
                    ? ` • الجامعة الأقرب: ${revPayload.nearestUniversity} (${revPayload.distanceToUniversityKm} كم)`
                    : ''
                }`
              : `✓ Address resolved & all fields populated: ${revPayload.address}`,
        });
      } finally {
        setGeocodingBusy(false);
      }
    },
    [mapSearchQuery, fullContext, locale, moveCameraTo, onLocationChange, onAddressResolved]
  );

  // Trigger Browser Geolocation API + save to backend Profile + either pin property location or draw route
  const handleDetectMyLocation = useCallback(
    async (silent = false, pinAsPropertyLocation?: boolean) => {
      const shouldPinProperty = pinAsPropertyLocation !== undefined ? pinAsPropertyLocation : editable;
      setDetectingGps(true);
      setPickOriginMode(false);
      if (!silent) setGpsStatusMsg(null);
      try {
        const coords = await LocationService.detectAndSyncProfileLocation(syncProfileOnDetect);

        if (shouldPinProperty) {
          manualPinPickRef.current = true;
          setActiveCoords({ latitude: coords.latitude, longitude: coords.longitude, isGeocoded: true });
          moveCameraTo(coords.latitude, coords.longitude, 16);
          const rev = await LocationService.reverseGeocode(coords.latitude, coords.longitude, locale);
          if (rev?.address) {
            setResolvedAddressText(rev.address);
          }
          if (onLocationChange) {
            onLocationChange(coords.latitude, coords.longitude, rev);
          }
          if (onAddressResolved && rev?.address) {
            onAddressResolved(rev.address, rev);
          }
          if (onProfileSynced) {
            onProfileSynced(coords.latitude, coords.longitude, rev);
          }
          if (!silent) {
            setGpsStatusMsg({
              type: 'success',
              text:
                locale === 'ar'
                  ? `✓ تم جلب موقعك الحالي من الـ GPS وملء جميع الحقول تلقائياً: ${rev?.address || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`}`
                  : `✓ GPS location detected and address populated: ${rev?.address || ''}`,
            });
          }
        } else {
          setUserCoords(coords);
          setShowRouteSteps(true);
          if (onProfileSynced) {
            onProfileSynced(coords.latitude, coords.longitude, null);
          }
          if (mapInstanceRef.current && window.L) {
            try {
              mapInstanceRef.current.fitBounds(
                [
                  [coords.latitude, coords.longitude],
                  [safeLat, safeLng],
                ],
                { padding: [55, 55], maxZoom: 16 }
              );
            } catch {}
          }
          const distKm = calculateDistanceKm(coords.latitude, coords.longitude, safeLat, safeLng);
          if (!silent) {
            setGpsStatusMsg({
              type: 'success',
              text:
                locale === 'ar'
                  ? `✓ تم تحديد موقعك ورسم خط السير للشقة على الخريطة — المسافة ${distKm} كم`
                  : `✓ Your location is set & route drawn on map — ${distKm} km away`,
            });
          }
        }
      } catch (err: any) {
        if (!silent) {
          const isDenied = err?.code === 1;
          setGpsStatusMsg({
            type: 'error',
            text: isDenied
              ? locale === 'ar'
                ? 'تم رفض إذن الـ GPS من المتصفح. يمكنك كتابة العنوان في مربع البحث بالأسفل أو الضغط مباشرة على الخريطة لتحديد الموقع وملء الحقول فوراً!'
                : 'GPS permission denied. Type the address in the search bar below or click on the map to set the location!'
              : locale === 'ar'
              ? 'تعذر قراءة الـ GPS تلقائياً. يمكنك كتابة العنوان في مربع البحث أو الضغط على الخريطة لتحديد الموقع وملء الحقول.'
              : 'Could not read GPS automatically. Search by street name or click on the map.',
          });
        }
      } finally {
        setDetectingGps(false);
      }
    },
    [syncProfileOnDetect, locale, editable, moveCameraTo, onLocationChange, onAddressResolved, onProfileSynced, safeLat, safeLng]
  );

  // Calculate real street-by-street route whenever userCoords or destination or travelMode changes (only in viewer mode)
  useEffect(() => {
    if (editable || !userCoords || markers.length > 0) {
      setRouteData(null);
      return;
    }
    const dist = calculateDistanceKm(userCoords.latitude, userCoords.longitude, safeLat, safeLng);
    if (dist < 0.03) {
      setRouteData(null);
      return;
    }

    let cancelled = false;
    setRouteLoading(true);
    LocationService.getRouteDirections(
      userCoords.latitude,
      userCoords.longitude,
      safeLat,
      safeLng,
      travelMode
    )
      .then((res) => {
        if (!cancelled) {
          setRouteData(res);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRouteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editable, userCoords, safeLat, safeLng, travelMode, markers.length]);

  // Auto-detect GPS on mount if requested and no explicit coordinates are saved yet
  useEffect(() => {
    if (autoDetectOnMount && !hasExplicitCoords && !autoDetectTriggeredRef.current) {
      autoDetectTriggeredRef.current = true;
      handleDetectMyLocation(true);
    }
  }, [autoDetectOnMount, hasExplicitCoords, handleDetectMyLocation]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || !window.L) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [safeLat, safeLng],
        zoom,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      layerGroupRef.current = layerGroup;
      lastCameraCenterRef.current = { lat: safeLat, lng: safeLng };

      map.on('click', (e: any) => {
        if (!e?.latlng) return;
        const clickedLat = Number(e.latlng.lat.toFixed(6));
        const clickedLng = Number(e.latlng.lng.toFixed(6));
        if (editable) {
          handleInteractivePick(clickedLat, clickedLng);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, [leafletReady]);

  // Update click listener when editable / pickOriginMode / handleInteractivePick changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off('click');
    map.on('click', (e: any) => {
      if (!e?.latlng) return;
      const clickedLat = Number(e.latlng.lat.toFixed(6));
      const clickedLng = Number(e.latlng.lng.toFixed(6));
      if (editable) {
        handleInteractivePick(clickedLat, clickedLng);
      } else if (pickOriginMode) {
        setUserCoords({ latitude: clickedLat, longitude: clickedLng });
        setPickOriginMode(false);
        setShowRouteSteps(true);
        setGpsStatusMsg({
          type: 'success',
          text:
            locale === 'ar'
              ? '✓ تم تحديد نقطة انطلاقك على الخريطة ورسم خط السير للشقة!'
              : '✓ Starting point set on map and route drawn to property!',
        });
      }
    });
  }, [editable, pickOriginMode, handleInteractivePick, locale]);

  // Center map camera ONLY when safeLat / safeLng genuinely moves (never on nearbyPlaces or text changes!)
  useEffect(() => {
    if (!leafletReady || !mapInstanceRef.current || markers.length > 0) return;
    const prev = lastCameraCenterRef.current;
    if (!prev || Math.abs(prev.lat - safeLat) > 0.0001 || Math.abs(prev.lng - safeLng) > 0.0001) {
      lastCameraCenterRef.current = { lat: safeLat, lng: safeLng };
      const currentZoom = mapInstanceRef.current.getZoom() || zoom;
      mapInstanceRef.current.setView([safeLat, safeLng], currentZoom, { animate: false });
    }
  }, [leafletReady, safeLat, safeLng, markers.length, zoom]);

  // Render Markers, Radius Circle, and Real Street Route on Map (without resetting camera zoom!)
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!L || !map || !layerGroup) return;

    layerGroup.clearLayers();

    if (markers.length > 0) {
      const bounds: Array<[number, number]> = [];
      markers.forEach((m) => {
        if (!Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) return;
        bounds.push([m.latitude, m.longitude]);
        const pinHtml = `
          <div style="
            background: ${m.color || '#2F6BFF'};
            color: #fff;
            padding: 4px 10px;
            border-radius: 999px;
            font-weight: 800;
            font-size: 12px;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(11,42,74,0.35);
            border: 2px solid #fff;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-family: system-ui, sans-serif;
          ">
            <span>🏠</span>
            <span>${m.priceText || m.title}</span>
          </div>
        `;
        const icon = L.divIcon({
          html: pinHtml,
          className: 'dary-custom-map-pin',
          iconSize: [100, 32],
          iconAnchor: [50, 16],
        });
        const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(layerGroup);
        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; direction: ${locale === 'ar' ? 'rtl' : 'ltr'}; text-align: start; min-width: 180px;">
            <div style="font-weight: 800; color: #0B2A4A; font-size: 14px; margin-bottom: 4px;">${m.title}</div>
            ${m.subtitle ? `<div style="font-size: 12px; color: #64748B; margin-bottom: 6px;">📍 ${m.subtitle}</div>` : ''}
            ${m.priceText ? `<div style="font-weight: 800; color: #2F6BFF; font-size: 13px; margin-bottom: 6px;">${m.priceText}</div>` : ''}
            ${
              m.href
                ? `<a href="${m.href}" style="display: inline-block; padding: 4px 10px; background: #0B2A4A; color: #fff; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 700;">${
                    locale === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'
                  }</a>`
                : ''
            }
          </div>
        `);
      });

      if (!editable && userCoords) {
        bounds.push([userCoords.latitude, userCoords.longitude]);
      }

      if (bounds.length > 1) {
        try {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        } catch {}
      } else if (bounds.length === 1) {
        map.setView(bounds[0], zoom, { animate: false });
      }
    } else {
      const mainPinHtml = `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          background: linear-gradient(135deg, #2F6BFF 0%, #0B2A4A 100%);
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 16px rgba(11,42,74,0.4);
          border: 3px solid #FFFFFF;
        ">
          <span style="transform: rotate(45deg); font-size: 18px;">🏠</span>
        </div>
      `;

      const mainIcon = L.divIcon({
        html: mainPinHtml,
        className: 'dary-main-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -36],
      });

      const mainMarker = L.marker([safeLat, safeLng], {
        icon: mainIcon,
        draggable: editable,
      }).addTo(layerGroup);

      if (editable) {
        mainMarker.on('dragend', (ev: any) => {
          const pos = ev.target.getLatLng();
          if (pos) {
            handleInteractivePick(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
          }
        });
      }

      const popupTitle = title || (locale === 'ar' ? 'موقع السكن على الخريطة' : 'Property Location on Map');
      const cleanPopupAddr = formatCleanAddress(fullContext, resolvedAddressText, locale);
      const popupSub = cleanPopupAddr || resolvedAddressText || subtitle || `${safeLat.toFixed(5)}, ${safeLng.toFixed(5)}`;
      const popupDirUrl = LocationService.buildGoogleMapsDirectionsUrl(
        safeLat,
        safeLng,
        editable ? null : userCoords?.latitude,
        editable ? null : userCoords?.longitude,
        travelMode
      );
      mainMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; direction: ${locale === 'ar' ? 'rtl' : 'ltr'}; text-align: start; min-width: 190px;">
          <div style="font-weight: 800; color: #0B2A4A; font-size: 14px;">${popupTitle}</div>
          <div style="font-size: 12px; color: #64748B; margin-top: 3px; margin-bottom: 8px;">📍 ${popupSub}</div>
          <a href="${popupDirUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 5px 10px; background: #2F6BFF; color: #fff; border-radius: 6px; text-decoration: none; font-size: 11.5px; font-weight: 700;">
            🗺️ ${locale === 'ar' ? 'فتح في خرائط جوجل ↗' : 'Open in Google Maps ↗'}
          </a>
        </div>
      `);

      // Radius Circle around primary marker
      if (showNearby) {
        L.circle([safeLat, safeLng], {
          radius: radiusKm * 1000,
          color: '#2F6BFF',
          weight: 1.5,
          fillColor: '#2F6BFF',
          fillOpacity: 0.06,
          dashArray: '6, 6',
        }).addTo(layerGroup);
      }

      // Real Nearby Places Markers
      if (showNearby && nearbyPlaces.length > 0) {
        const filtered =
          selectedCategory === 'all'
            ? nearbyPlaces
            : nearbyPlaces.filter((p) => p.category === selectedCategory);

        filtered.forEach((place) => {
          const meta = CATEGORY_META[place.category] || CATEGORY_META.other;
          const placeIcon = L.divIcon({
            html: `
              <div style="
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: ${meta.bg};
                color: ${meta.color};
                border: 2px solid #FFFFFF;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 15px;
              ">${meta.icon}</div>
            `,
            className: 'dary-nearby-pin',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const m = L.marker([place.latitude, place.longitude], { icon: placeIcon }).addTo(layerGroup);
          m.bindPopup(`
            <div style="font-family: system-ui, sans-serif; direction: ${locale === 'ar' ? 'rtl' : 'ltr'}; text-align: start;">
              <div style="font-weight: 700; color: #0B2A4A; font-size: 13px;">${meta.icon} ${
            locale === 'ar' ? place.name : place.nameEn || place.name
          }</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 3px;">
                ${place.distanceKm !== undefined ? `${place.distanceKm} ${locale === 'ar' ? 'كم' : 'km'}` : ''}
                ${place.address ? ` • ${place.address}` : ''}
              </div>
            </div>
          `);
        });
      }
    }

    // User Origin / GPS Marker + Street Route Polyline (Viewer mode only)
    const distUserToPin =
      !editable && userCoords
        ? calculateDistanceKm(userCoords.latitude, userCoords.longitude, safeLat, safeLng)
        : 0;
    if (!editable && userCoords && distUserToPin > 0.03) {
      const userPinHtml = `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #10B981;
          color: #FFFFFF;
          border: 3px solid #FFFFFF;
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.28), 0 3px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">🚶</div>
      `;
      const userIcon = L.divIcon({
        html: userPinHtml,
        className: 'dary-user-gps-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const uMarker = L.marker([userCoords.latitude, userCoords.longitude], {
        icon: userIcon,
        draggable: true,
      }).addTo(layerGroup);

      uMarker.on('dragend', (ev: any) => {
        const pos = ev.target.getLatLng();
        if (pos) {
          setUserCoords({
            latitude: Number(pos.lat.toFixed(6)),
            longitude: Number(pos.lng.toFixed(6)),
          });
          setShowRouteSteps(true);
        }
      });

      uMarker.bindPopup(
        `<div style="font-weight: 700; color: #065F46; font-family: system-ui, sans-serif; direction: ${
          locale === 'ar' ? 'rtl' : 'ltr'
        };">
          <div>📍 ${locale === 'ar' ? 'موقعك / نقطة الانطلاق' : 'Your Starting Location'}</div>
          <div style="font-size: 11px; color: #475569; font-weight: 500; margin-top: 2px;">${
            locale === 'ar' ? 'اسحب النقطة الخضراء لتغيير مكان انطلاقك' : 'Drag green pin to change starting point'
          }</div>
        </div>`
      );

      if (markers.length === 0) {
        const routePoints: Array<[number, number]> =
          routeData && routeData.coordinates.length > 1
            ? routeData.coordinates
            : [
                [userCoords.latitude, userCoords.longitude],
                [safeLat, safeLng],
              ];

        L.polyline(routePoints, {
          color: '#0B2A4A',
          weight: 8,
          opacity: 0.75,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);

        L.polyline(routePoints, {
          color: travelMode === 'walking' ? '#10B981' : '#2F6BFF',
          weight: 5,
          opacity: 0.95,
          dashArray: travelMode === 'walking' ? '8, 10' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);
      }
    }
  }, [
    leafletReady,
    safeLat,
    safeLng,
    title,
    subtitle,
    resolvedAddressText,
    editable,
    handleInteractivePick,
    showNearby,
    radiusKm,
    nearbyPlaces,
    selectedCategory,
    userCoords,
    routeData,
    travelMode,
    markers,
    locale,
    zoom,
  ]);

  const distanceFromUser =
    !editable && userCoords && markers.length === 0
      ? routeData?.distanceKm ?? calculateDistanceKm(userCoords.latitude, userCoords.longitude, safeLat, safeLng)
      : null;

  const filteredNearby =
    selectedCategory === 'all'
      ? nearbyPlaces
      : nearbyPlaces.filter((p) => p.category === selectedCategory);

  const displayAddress =
    (manualPinPickRef.current ? resolvedAddressText : '') ||
    formatCleanAddress(fullContext, resolvedAddressText, locale) ||
    resolvedAddressText ||
    subtitle ||
    (locale === 'ar' ? 'موقع محدد على الخريطة' : 'Pinned Location');

  const bboxMinLng = (safeLng - 0.015).toFixed(5);
  const bboxMinLat = (safeLat - 0.01).toFixed(5);
  const bboxMaxLng = (safeLng + 0.015).toFixed(5);
  const bboxMaxLat = (safeLat + 0.01).toFixed(5);
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxMinLng}%2C${bboxMinLat}%2C${bboxMaxLng}%2C${bboxMaxLat}&layer=mapnik&marker=${safeLat}%2C${safeLng}`;
  const googleMapsDirectionsUrl = LocationService.buildGoogleMapsDirectionsUrl(
    safeLat,
    safeLng,
    editable ? null : userCoords?.latitude,
    editable ? null : userCoords?.longitude,
    travelMode
  );

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 4px 18px rgba(11, 42, 74, 0.05)',
      }}
    >
      {/* Top Action Bar */}
      <div
        style={{
          padding: '0.95rem 1.25rem',
          backgroundColor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', flex: 1, minWidth: '240px' }}>
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2F6BFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.15rem',
              flexShrink: 0,
            }}
          >
            🗺️
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>{title || (locale === 'ar' ? 'الخريطة التفاعلية والموقع الجغرافي' : 'Interactive Map & Location')}</span>
              {geocodingBusy && (
                <span style={{ fontSize: '0.74rem', color: '#2F6BFF', fontWeight: 600 }}>
                  ({locale === 'ar' ? 'جاري فهم العنوان وتحديد الشارع بالظبط...' : 'Resolving exact street address...'})
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#1E293B', fontWeight: 700, marginTop: '2px' }}>
              📍 {displayAddress}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2px' }}>
              <span style={{ direction: 'ltr', unicodeBidi: 'embed', fontFamily: 'monospace', backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '4px', color: '#0B2A4A' }}>
                {safeLat.toFixed(5)}, {safeLng.toFixed(5)}
              </span>
              {editable && (
                <span style={{ color: '#2F6BFF', fontWeight: 600 }}>
                  • {locale === 'ar' ? 'اضغط في أي مكان على الخريطة أو اسحب الدبوس لتحديد الموقع والعنوان تلقائياً' : 'Click map or drag pin to set location & address'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          {distanceFromUser !== null && distanceFromUser > 0.03 && (
            <span
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '999px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '0.8rem',
                fontWeight: 800,
              }}
            >
              📏 {locale === 'ar' ? `يبعد ${distanceFromUser} كم عن موقعك` : `${distanceFromUser} km from you`}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleDetectMyLocation(false, editable)}
            disabled={detectingGps}
            style={{
              padding: '0.5rem 0.95rem',
              borderRadius: '10px',
              backgroundColor: '#2F6BFF',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: detectingGps ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(47, 107, 255, 0.25)',
            }}
          >
            <span>🧭</span>
            <span>
              {detectingGps
                ? locale === 'ar'
                  ? 'جاري جلب الموقع والعنوان من GPS...'
                  : 'Detecting GPS & Address...'
                : editable
                ? locale === 'ar'
                  ? 'لو أنت في الشقة حالياً: استخدم موقعي (GPS)'
                  : 'Use My Current GPS Location'
                : locale === 'ar'
                ? 'حدد موقعي وارسم الطريق للشقة'
                : 'My Location & Draw Route'}
            </span>
          </button>

          {!editable && markers.length === 0 && (
            <button
              type="button"
              onClick={() => setPickOriginMode((prev) => !prev)}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '10px',
                backgroundColor: pickOriginMode ? '#065F46' : '#F0FDF4',
                color: pickOriginMode ? '#FFFFFF' : '#065F46',
                border: '1px solid #86EFAC',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>👆</span>
              <span>
                {pickOriginMode
                  ? locale === 'ar'
                    ? 'اضغط الآن على الخريطة لاختيار مكانك...'
                    : 'Click anywhere on map now...'
                  : locale === 'ar'
                  ? 'حدد مكانك من الخريطة'
                  : 'Pick My Spot on Map'}
              </span>
            </button>
          )}

          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '10px',
              backgroundColor: '#0B2A4A',
              color: '#FFFFFF',
              border: '1px solid #0B2A4A',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span>🗺️</span>
            <span>
              {locale === 'ar'
                ? !editable && userCoords
                  ? 'ابدأ التحرك على خرائط جوجل ↗'
                  : 'عرض على خرائط جوجل ↗'
                : 'Google Maps Directions ↗'}
            </span>
          </a>
        </div>
      </div>

      {/* Editable Map Search & Address Sync Bar */}
      {editable && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#EFF6FF',
            borderBottom: '1px solid #DBEAFE',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0B2A4A' }}>
              🏠 {locale === 'ar'
                ? 'مش موجود في الشقة دلوقتي؟ اكتب عنوان الشقة أو اسم الشارع/المنطقة أو الصق رابط Google Maps وهنحددها على الـ GPS ونملأ كل الحقول تلقائياً:'
                : 'Not at the apartment right now? Type the apartment address, street, or Google Maps link to pin GPS & auto-fill all fields:'}
            </span>
            {searchingSuggestions && (
              <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700 }}>
                ⏳ {locale === 'ar' ? 'جاري البحث عن اقتراحات العنوان...' : 'Searching addresses...'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', position: 'relative' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                value={mapSearchQuery}
                onChange={(e) => {
                  setMapSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setShowSuggestions(false);
                    handleMapSearchSubmit();
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder={
                  locale === 'ar'
                    ? '🔍 اكتب عنوان الشقة (مثال: شارع الجلاء طنطا، أو حي الجامعة المنصورة، أو الصق رابط خرائط جوجل)...'
                    : '🔍 Type apartment address, street, neighborhood, or paste Google Maps URL...'
                }
                style={{
                  width: '100%',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '10px',
                  border: '1.5px solid #93C5FD',
                  fontSize: '0.84rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                }}
              />

              {/* Live Address Autocomplete Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '12px',
                    boxShadow: '0 12px 28px rgba(11, 42, 74, 0.16)',
                    zIndex: 9999,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '0.35rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: '#64748B',
                      borderBottom: '1px solid #F1F5F9',
                    }}
                  >
                    <span>
                      {locale === 'ar'
                        ? '📍 اختر العنوان لتحديده على الخريطة وملء جميع الحقول تلقائياً:'
                        : '📍 Select an address to pin & auto-fill all fields:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontWeight: 800 }}
                    >
                      ✕
                    </button>
                  </div>
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      style={{
                        width: '100%',
                        textAlign: 'start',
                        padding: '0.55rem 0.75rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        borderBottom: '1px solid #F8FAFC',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0B2A4A' }}>
                        📍 {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                        {item.subtitle}
                        {item.nearestUniversity ? ` • 🎓 أقرب جامعة: ${item.nearestUniversity} (${item.distanceToUniversityKm} كم)` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                handleMapSearchSubmit();
              }}
              disabled={geocodingBusy}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                backgroundColor: '#0B2A4A',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: geocodingBusy ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🎯</span>
              <span>
                {geocodingBusy
                  ? locale === 'ar'
                    ? 'جاري التحديد...'
                    : 'Locating...'
                  : locale === 'ar'
                  ? 'حدد على الـ GPS واملأ الحقول تلقائياً'
                  : 'Pin on GPS & Auto-fill Fields'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                handleMapSearchSubmit(undefined, true);
              }}
              disabled={geocodingBusy}
              title={
                locale === 'ar'
                  ? 'إذا كتبت العنوان أو المدينة في الحقول بالأعلى، اضغط هنا لتحديد موقعها على الـ GPS واستكمال باقي الحقول تلقائياً'
                  : 'Resolve location from the form fields above and auto-fill remaining fields'
              }
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                color: '#1D4ED8',
                border: '1.5px solid #93C5FD',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: geocodingBusy ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span>📥</span>
              <span>
                {locale === 'ar'
                  ? 'حدد من الحقول المكتوبة فوق'
                  : 'Locate from Form Fields'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Pick Origin Mode Helper Banner */}
      {pickOriginMode && !editable && (
        <div
          style={{
            padding: '0.6rem 1.25rem',
            backgroundColor: '#FEFCE8',
            borderBottom: '1px solid #FDE047',
            color: '#854D0E',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span>
            👆{' '}
            {locale === 'ar'
              ? 'اضغط في أي مكان على الخريطة (مثلاً: بوابة الجامعة أو الشارع الذي تتواجد فيه) وسيتم رسم خط السير للشقة فوراً!'
              : 'Click anywhere on the map to set your starting point and draw the route to the apartment!'}
          </span>
          <button
            type="button"
            onClick={() => setPickOriginMode(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#854D0E', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* GPS Status Banner */}
      {gpsStatusMsg && (
        <div
          style={{
            padding: '0.65rem 1.25rem',
            backgroundColor: gpsStatusMsg.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            borderBottom: `1px solid ${gpsStatusMsg.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: gpsStatusMsg.type === 'success' ? '#065F46' : '#B91C1C',
            fontSize: '0.83rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span>{gpsStatusMsg.text}</span>
          <button
            type="button"
            onClick={() => setGpsStatusMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Map Viewport */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          cursor: pickOriginMode || editable ? 'crosshair' : 'grab',
        }}
      >
        {!leafletFailed ? (
          <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100%', zIndex: 1, backgroundColor: '#F1F5F9' }}
          />
        ) : (
          <iframe
            title="OpenStreetMap"
            src={osmEmbedUrl}
            style={{ width: '100%', height: '100%', border: 0 }}
            loading="lazy"
          />
        )}
      </div>

      {/* Turn-by-Turn Route & Navigation Panel ("امشي ازاي") */}
      {!editable && markers.length === 0 && userCoords && calculateDistanceKm(userCoords.latitude, userCoords.longitude, safeLat, safeLng) > 0.03 && (routeData || routeLoading) && (
        <div
          style={{
            padding: '1.1rem 1.25rem',
            backgroundColor: '#F0F9FF',
            borderTop: '1px solid #BAE6FD',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: showRouteSteps ? '0.85rem' : 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '8px',
                  backgroundColor: '#0B2A4A',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                }}
              >
                🛣️ {locale === 'ar' ? 'خط السير للشقة (امشي إزاي؟)' : 'Route & Directions to Property'}
              </span>

              {routeData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #BAE6FD',
                      color: '#0369A1',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                    }}
                  >
                    📏 {routeData.distanceKm < 1 ? `${Math.round(routeData.distanceKm * 1000)} متر` : `${routeData.distanceKm} كم`}
                  </span>
                  <span
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                    }}
                  >
                    🚶 {locale === 'ar' ? `مشي: ${routeData.walkingMinutes} دقيقة` : `Walk: ${routeData.walkingMinutes} min`}
                  </span>
                  <span
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                    }}
                  >
                    🚗 {locale === 'ar' ? `مواصلات/سيارة: ${routeData.drivingMinutes} دقيقة` : `Drive: ${routeData.drivingMinutes} min`}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              {/* Walking vs Driving Mode Switcher */}
              <button
                type="button"
                onClick={() => setTravelMode('walking')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: travelMode === 'walking' ? '1px solid #059669' : '1px solid #CBD5E1',
                  backgroundColor: travelMode === 'walking' ? '#10B981' : '#FFFFFF',
                  color: travelMode === 'walking' ? '#FFFFFF' : '#475569',
                }}
              >
                🚶 {locale === 'ar' ? 'مشياً' : 'Walking'}
              </button>
              <button
                type="button"
                onClick={() => setTravelMode('driving')}
                style={{
                  padding: '0.35rem 0.7rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: travelMode === 'driving' ? '1px solid #2F6BFF' : '1px solid #CBD5E1',
                  backgroundColor: travelMode === 'driving' ? '#2F6BFF' : '#FFFFFF',
                  color: travelMode === 'driving' ? '#FFFFFF' : '#475569',
                }}
              >
                🚗 {locale === 'ar' ? 'بالسيارة / مواصلات' : 'Driving'}
              </button>

              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.38rem 0.8rem',
                  borderRadius: '8px',
                  backgroundColor: '#0B2A4A',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>🗺️</span>
                <span>{locale === 'ar' ? 'افتح المسار على جوجل ماب ↗' : 'Open Route in Google Maps ↗'}</span>
              </a>

              <button
                type="button"
                onClick={() => setShowRouteSteps((prev) => !prev)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#334155',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showRouteSteps
                  ? locale === 'ar'
                    ? 'إخفاء الخطوات ▲'
                    : 'Hide Steps ▲'
                  : locale === 'ar'
                  ? 'عرض الخطوات ▼'
                  : 'Show Steps ▼'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserCoords(null);
                  setRouteData(null);
                }}
                title={locale === 'ar' ? 'مسح المسار' : 'Clear route'}
                style={{
                  padding: '0.35rem 0.55rem',
                  borderRadius: '8px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {routeLoading ? (
            <div style={{ fontSize: '0.83rem', color: '#0369A1', fontWeight: 600, padding: '0.5rem 0' }}>
              {locale === 'ar'
                ? 'جاري رسم خط السير الفعلي عبر الشوارع وحساب الاتجاهات...'
                : 'Calculating real street route and turn-by-turn directions...'}
            </div>
          ) : (
            showRouteSteps &&
            routeData &&
            routeData.steps.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {routeData.steps.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.6rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1px solid #E0F2FE',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#0B2A4A', fontWeight: 700 }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {step.icon}
                      </span>
                      <span>
                        {idx + 1}. {locale === 'ar' ? step.instructionAr : step.instructionEn}
                      </span>
                    </div>
                    {step.distanceMeters > 0 && (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: '#0369A1',
                          backgroundColor: '#F0F9FF',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {step.distanceMeters >= 1000
                          ? `${(step.distanceMeters / 1000).toFixed(2)} ${locale === 'ar' ? 'كم' : 'km'}`
                          : `${step.distanceMeters} ${locale === 'ar' ? 'متر' : 'm'}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Real Nearby Places Section */}
      {showNearby && (
        <div style={{ padding: '1.15rem 1.25rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '0.9rem',
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🧭</span>
                <span>
                  {locale === 'ar'
                    ? `الأماكن والخدمات الحقيقية القريبة (في نطاق ${radiusKm} كم)`
                    : `Live Nearby Places & Services (within ${radiusKm} km)`}
                </span>
              </h4>
            </div>

            {/* Radius Filter Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                {locale === 'ar' ? 'نطاق البحث:' : 'Radius:'}
              </span>
              {[1, 3, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: radiusKm === r ? '1px solid #2F6BFF' : '1px solid #CBD5E1',
                    backgroundColor: radiusKm === r ? '#EFF6FF' : '#F8FAFC',
                    color: radiusKm === r ? '#2F6BFF' : '#475569',
                  }}
                >
                  {r} {locale === 'ar' ? 'كم' : 'km'}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.6rem', marginBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: selectedCategory === 'all' ? '1px solid #0B2A4A' : '1px solid #E2E8F0',
                backgroundColor: selectedCategory === 'all' ? '#0B2A4A' : '#F8FAFC',
                color: selectedCategory === 'all' ? '#FFFFFF' : '#475569',
              }}
            >
              {locale === 'ar' ? `الكل (${nearbyPlaces.length})` : `All (${nearbyPlaces.length})`}
            </button>

            {(Object.keys(CATEGORY_META) as Array<NearbyPlace['category']>).map((cat) => {
              const count = nearbyPlaces.filter((p) => p.category === cat).length;
              if (count === 0) return null;
              const meta = CATEGORY_META[cat];
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: active ? `1px solid ${meta.color}` : '1px solid #E2E8F0',
                    backgroundColor: active ? meta.bg : '#F8FAFC',
                    color: active ? meta.color : '#475569',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{meta.icon}</span>
                  <span>{locale === 'ar' ? meta.ar : meta.en}</span>
                  <span>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Nearby Places Grid */}
          {loadingNearby ? (
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748B' }}>
              {locale === 'ar' ? 'جاري البحث الفعلي عن الأماكن القريبة من هذا الموقع على الخريطة...' : 'Fetching real nearby places from map...'}
            </div>
          ) : filteredNearby.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.84rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '10px' }}>
              {locale === 'ar'
                ? 'لا توجد أماكن مسجلة في هذا النطاق الصغير. جرب زيادة نطاق البحث إلى 3 أو 5 كم.'
                : 'No places found within this small radius. Try expanding the radius to 3 or 5 km.'}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: '0.65rem',
              }}
            >
              {filteredNearby.slice(0, 12).map((place) => {
                const meta = CATEGORY_META[place.category] || CATEGORY_META.other;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      if (!editable) {
                        setUserCoords({ latitude: place.latitude, longitude: place.longitude });
                        setShowRouteSteps(true);
                        setGpsStatusMsg({
                          type: 'success',
                          text:
                            locale === 'ar'
                              ? `✓ تم رسم خط السير على الخريطة من «${place.name}» إلى السكن!`
                              : `✓ Route drawn from "${place.nameEn || place.name}" to the property!`,
                        });
                      } else if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([place.latitude, place.longitude], 17);
                      }
                    }}
                    title={
                      locale === 'ar'
                        ? `اضغط لرسم خط السير من «${place.name}» إلى السكن`
                        : `Click to draw route from "${place.nameEn || place.name}" to property`
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.6rem',
                      padding: '0.65rem 0.8rem',
                      borderRadius: '12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      textAlign: 'start',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          flexShrink: 0,
                        }}
                      >
                        {meta.icon}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: '#0B2A4A',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {locale === 'ar' ? place.name : place.nameEn || place.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.address || (locale === 'ar' ? `${meta.ar} • اضغط لرسم الطريق` : `${meta.en} • Click for route`)}
                        </div>
                      </div>
                    </div>

                    {place.distanceKm !== undefined && (
                      <span
                        style={{
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '0.73rem',
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {place.distanceKm} {locale === 'ar' ? 'كم' : 'km'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
