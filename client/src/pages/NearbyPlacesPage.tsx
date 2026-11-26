import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Building2,
  HeartPulse,
  Shield,
  Pill,
  Bus,
  Phone,
  Navigation,
  Crosshair,
  RotateCcw,
  Clock,
  Sparkles,
  MapPin,
  Utensils,
  Hotel,
  Landmark,
  ShoppingBag,
  SlidersHorizontal,
  AlertTriangle,
  X,
  IndianRupee,
  Car,
  Footprints,
  Compass,
  ArrowRightLeft,
  Bookmark,
  ShieldAlert,
  Info,
  Globe,
  Bike,
  Train,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  Route as RouteIcon,
  CheckCircle2,
  ExternalLink,
  Search,
  Fuel,
  Wrench,
  UserCheck,
  Star,
  MessageSquare,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchNearbyPlaces,
  fetchEmergencyShortcuts,
  calculateMultimodalFares,
  planCompleteRoute,
  fetchMapData,
  fetchIncidents,
  savePlaceBookmark,
  fetchSavedPlaceBookmarks,
  deleteSavedPlaceBookmark,
  saveRouteBookmark,
  fetchSavedRouteBookmarks,
  deleteSavedRouteBookmark,
  fetchServiceReviews,
  createServiceReview,
  verifyLocalService,
} from '../services/api';
import {
  EnrichedNearbyPlace,
  MultimodalFareOption,
  ComputedRouteGeometry,
  SavedPlaceItem,
  SavedRouteItem,
} from '../types';
import { mapProviderService, MapProvider } from '../services/mapProviderService';
import { PlaceAutocompleteInput } from '../components/places/PlaceAutocompleteInput';

interface NearbyPlacesPageProps {
  openEmergencyModal?: () => void;
}

function ChangeMapView({ coords, zoom }: { coords: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom || map.getZoom() || 13, { animate: true });
  }, [coords[0], coords[1], zoom, map]);
  return null;
}

function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 15, { duration: 0.9 });
    }
  }, [target, map]);
  return null;
}

function RouteBoundsController({ coordinates }: { coordinates: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 1) {
      const bounds = L.latLngBounds(coordinates.map((c) => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [coordinates, map]);
  return null;
}

function MapClickEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const createPin = (bgColor: string, symbol: string) =>
  L.divIcon({
    className: 'custom-nearby-pin',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(0,0,0,0.45);
        border: 2px solid #ffffff;
      ">
        <span style="transform: rotate(45deg); color: white; font-size: 13px; line-height: 1;">${symbol}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

const hospitalPin = createPin('#16A34A', '🏥');
const pharmacyPin = createPin('#059669', '💊');
const medicalSvcPin = createPin('#0D9488', '🩺');
const tourismPin = createPin('#2563EB', '🏛️');
const restaurantPin = createPin('#F43F5E', '🍽️');
const hotelPin = createPin('#8B5CF6', '🏨');
const transportPin = createPin('#0891B2', '🚇');
const shoppingPin = createPin('#D97706', '🛍️');
const policePin = createPin('#1E3A8A', '👮');
const verifiedIncidentPin = createPin('#DC2626', '🚨');
const pendingIncidentPin = createPin('#F97316', '⚠️');
const scamPin = createPin('#EAB308', '⚡');

const userLocationBeacon = L.divIcon({
  className: 'user-beacon',
  html: `
    <div style="position: relative; width: 28px; height: 28px;">
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #3B82F6; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 20px; height: 20px; border-radius: 50%; background: #2563EB; border: 3px solid white; box-shadow: 0 0 12px rgba(37,99,235,0.9);"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const routePinA = L.divIcon({
  className: 'route-pin-a',
  html: `<div style="background:#2563EB;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;color:#fff;font-weight:900;font-size:12px;box-shadow:0 3px 10px rgba(0,0,0,0.45);">A</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const routePinB = L.divIcon({
  className: 'route-pin-b',
  html: `<div style="background:#DC2626;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;color:#fff;font-weight:900;font-size:12px;box-shadow:0 3px 10px rgba(0,0,0,0.45);">B</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const NearbyPlacesPage: React.FC<NearbyPlacesPageProps> = ({ openEmergencyModal }) => {
  const {
    cities,
    currentCity,
    userCoords,
    userAddress,
    gpsStatus,
    locationAccuracy,
    locationSource,
    locationError,
    requestUserLocation,
    setUserSelectedPin,
    setCity,
    currentMapProviderId,
    setCurrentMapProviderId,
    switchMapProviderFallback,
  } = useCity();

  const { user } = useAuth();
  const { showToast } = useToast();

  // Top location search input
  const [globalSearchText, setGlobalSearchText] = useState('');

  // Discovery State
  const [places, setPlaces] = useState<EnrichedNearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('ALL');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(5);
  const [customRadiusInput, setCustomRadiusInput] = useState<string>('5');
  const [isOpenNowFilter, setIsOpenNowFilter] = useState(false);
  const [is24HoursFilter, setIs24HoursFilter] = useState(false);
  const [keywordFilter, setKeywordFilter] = useState('');
  const [sortBy, setSortBy] = useState<'distance' | 'roadDistance' | 'fastest' | 'category' | 'rating'>('distance');
  const [apiNotice, setApiNotice] = useState<string>('');
  const [isGoogleConfigured, setIsGoogleConfigured] = useState<boolean>(false);

  // Service Reviews & Verification Modal (Module 8)
  const [reviewPlace, setReviewPlace] = useState<EnrichedNearbyPlace | null>(null);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewsServiceMeta, setReviewsServiceMeta] = useState<any>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const openReviewsModal = async (place: EnrichedNearbyPlace) => {
    setReviewPlace(place);
    setLoadingReviews(true);
    setReviewsList([]);
    setReviewsServiceMeta(null);
    try {
      const res = await fetchServiceReviews(place.id);
      setReviewsList(res.reviews || []);
      setReviewsServiceMeta(res.service || null);
    } catch {
      setReviewsList([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewPlace || !reviewComment.trim()) return;
    if (!user) {
      showToast('Sign in to post a review', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      await createServiceReview(reviewPlace.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      showToast('Review saved cleanly!', 'success');
      setReviewComment('');
      openReviewsModal(reviewPlace);
      loadNearbyPlaces();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not save review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleToggleVerify = async (placeId: string, nextState: boolean) => {
    try {
      await verifyLocalService(placeId, { isVerified: nextState });
      showToast(nextState ? 'Service marked Verified' : 'Verification removed', 'success');
      if (reviewPlace) openReviewsModal(reviewPlace);
      loadNearbyPlaces();
    } catch {
      showToast('Admin verification update failed', 'error');
    }
  };

  // Emergency Shortcuts & 112 Modal
  const [emergencyShortcuts, setEmergencyShortcuts] = useState<any>(null);
  const [highlightedEmergencyPlace, setHighlightedEmergencyPlace] = useState<EnrichedNearbyPlace | null>(null);
  const [showCall112Modal, setShowCall112Modal] = useState(false);

  // Interactive Map + Safety Map Overlay State
  const [selectedPlace, setSelectedPlace] = useState<EnrichedNearbyPlace | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [mapDisplayMode, setMapDisplayMode] = useState<'NORMAL' | 'SAFETY'>('SAFETY');
  const [mapClickMode, setMapClickMode] = useState<'CENTER' | 'ORIGIN' | 'DESTINATION'>('CENTER');
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
  const [safetyOverlays, setSafetyOverlays] = useState<{
    incidents: any[];
    scams: any[];
    safetyZones: any[];
  }>({ incidents: [], scams: [], safetyZones: [] });

  // Mobile bottom sheet state ('peek' | 'half' | 'full')
  const [mobileSheetState, setMobileSheetState] = useState<'peek' | 'half' | 'full'>('half');

  // Route Planner State (integrated above/alongside the live map)
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [routeOriginName, setRouteOriginName] = useState<string>(userAddress || 'Current Location');
  const [routeOriginCoords, setRouteOriginCoords] = useState<[number, number]>([userCoords.lat, userCoords.lng]);
  const [routeDestName, setRouteDestName] = useState<string>('');
  const [routeDestCoords, setRouteDestCoords] = useState<[number, number] | null>(null);
  const [routeTravelMode, setRouteTravelMode] = useState<'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT'>('DRIVE');
  const [waitingMins, setWaitingMins] = useState<number>(0);
  const [hasLuggage, setHasLuggage] = useState<boolean>(false);
  const [avoidTolls, setAvoidTolls] = useState<boolean>(false);
  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [plannedResult, setPlannedResult] = useState<{
    routes: ComputedRouteGeometry[];
    selectedRouteIndex: number;
    routingProvider: string;
    routingNotice: string;
    safetyEvaluation: any;
    fares: any;
  } | null>(null);
  const [showTurnByTurnSteps, setShowTurnByTurnSteps] = useState(false);

  // Quick Multi-Modal Fare Modal (per single place)
  const [fareTargetPlace, setFareTargetPlace] = useState<EnrichedNearbyPlace | null>(null);
  const [isFareModalOpen, setIsFareModalOpen] = useState(false);
  const [fareComparison, setFareComparison] = useState<any>(null);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);

  // Saved Places & Saved Routes Drawer
  const [isSavedPanelOpen, setIsSavedPanelOpen] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlaceItem[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteItem[]>([]);

  const activeProvider: MapProvider = useMemo(
    () => mapProviderService.getProviderById(currentMapProviderId),
    [currentMapProviderId]
  );

  // Load nearby places around userCoords (no forced city restriction!)
  const loadNearbyPlaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchNearbyPlaces({
        lat: userCoords.lat,
        lng: userCoords.lng,
        radiusKm: selectedRadiusKm,
        category: activeCategory,
        subCategory: activeSubCategory === 'ALL' ? undefined : activeSubCategory,
        openNow: isOpenNowFilter,
        is24Hours: is24HoursFilter,
        query: keywordFilter.trim() || undefined,
        sortBy,
        limit: 80,
      });

      setPlaces(data.places || []);
      setApiNotice(data.apiNotice || '');
      setIsGoogleConfigured(Boolean(data.googlePlacesConfigured));
    } catch (err) {
      console.error('Failed to load nearby places:', err);
      showToast('Failed to load nearby places. Check network connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    userCoords.lat,
    userCoords.lng,
    selectedRadiusKm,
    activeCategory,
    activeSubCategory,
    isOpenNowFilter,
    is24HoursFilter,
    keywordFilter,
    sortBy,
    showToast,
  ]);

  const loadEmergencyShortcuts = useCallback(async () => {
    try {
      const shortcuts = await fetchEmergencyShortcuts(userCoords.lat, userCoords.lng);
      setEmergencyShortcuts(shortcuts);
    } catch (err) {
      console.warn('Emergency shortcuts error:', err);
    }
  }, [userCoords.lat, userCoords.lng]);

  // Load Safety Map overlays when Safety Map mode is active
  const loadSafetyOverlays = useCallback(async () => {
    if (mapDisplayMode !== 'SAFETY') return;
    try {
      const [mapRes, incRes] = await Promise.all([
        fetchMapData({ lat: userCoords.lat, lng: userCoords.lng }).catch(() => null),
        fetchIncidents({
          lat: userCoords.lat,
          lng: userCoords.lng,
          radiusKm: Math.max(selectedRadiusKm, 10),
          limit: 40,
        }).catch(() => null),
      ]);

      const rawIncidents = Array.isArray(incRes?.incidents)
        ? incRes.incidents
        : Array.isArray(incRes)
        ? incRes
        : mapRes?.incidents || [];

      setSafetyOverlays({
        incidents: rawIncidents,
        scams: mapRes?.scams || [],
        safetyZones: mapRes?.safetyZones || [],
      });
    } catch {
      // Non-fatal
    }
  }, [mapDisplayMode, userCoords.lat, userCoords.lng, selectedRadiusKm]);

  useEffect(() => {
    loadNearbyPlaces();
    loadEmergencyShortcuts();
  }, [loadNearbyPlaces, loadEmergencyShortcuts]);

  useEffect(() => {
    loadSafetyOverlays();
  }, [loadSafetyOverlays]);

  // Sync Origin A only if user hasn't manually overridden origin
  useEffect(() => {
    if (routeOriginName === 'Current Location' || routeOriginName === userAddress || !routeOriginName) {
      setRouteOriginCoords([userCoords.lat, userCoords.lng]);
      setRouteOriginName(userAddress || `Location [${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}]`);
    }
  }, [userCoords.lat, userCoords.lng, userAddress]);

  const loadSavedBookmarks = useCallback(async () => {
    if (!user) return;
    try {
      const [sp, sr] = await Promise.all([
        fetchSavedPlaceBookmarks().catch(() => ({ savedPlaces: [] })),
        fetchSavedRouteBookmarks().catch(() => ({ savedRoutes: [] })),
      ]);
      setSavedPlaces(sp.savedPlaces || []);
      setSavedRoutes(sr.savedRoutes || []);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (isSavedPanelOpen && user) {
      loadSavedBookmarks();
    }
  }, [isSavedPanelOpen, user, loadSavedBookmarks]);

  // GPS Request with honest success/failure handling (never fake success on denied!)
  const handleUseCurrentLocation = async () => {
    const ok = await requestUserLocation(true);
    if (ok) {
      showToast('Live GPS coordinates and address detected!', 'success');
    } else {
      showToast(
        'Location permission denied or GPS unavailable. Use search or click the map to choose a location manually.',
        'error'
      );
    }
  };

  // Apply Custom Radius
  const handleApplyCustomRadius = () => {
    const val = parseFloat(customRadiusInput);
    if (!isNaN(val) && val >= 0.5 && val <= 50) {
      setSelectedRadiusKm(val);
      showToast(`Search radius set to ${val} km`, 'info');
    } else {
      showToast('Enter a valid radius between 0.5 and 50 km.', 'error');
    }
  };

  // Open Quick 8-Mode Fare Modal for a Place
  const handleOpenFareEstimator = async (place: EnrichedNearbyPlace) => {
    setFareTargetPlace(place);
    setIsFareModalOpen(true);
    setIsCalculatingFare(true);
    try {
      const comparison = await calculateMultimodalFares({
        origin: { lat: userCoords.lat, lng: userCoords.lng, name: userAddress || 'Current Location' },
        destination: { lat: place.lat, lng: place.lng, name: place.name },
        cityName: currentCity?.name,
        explicitRoadDistanceKm: place.roadDistanceKm,
        waitingMins,
        hasLuggage,
      });
      setFareComparison(comparison);
    } catch (err) {
      console.error('Fare estimation error:', err);
      showToast('Failed to estimate fares for this destination.', 'error');
    } finally {
      setIsCalculatingFare(false);
    }
  };

  // Plan Full Source -> Destination Route on Live Map + 8-Mode Fares + Turn-by-Turn
  const executeRoutePlan = async (
    originCoordsArg: [number, number],
    originLabelArg: string,
    destCoordsArg: [number, number],
    destLabelArg: string
  ) => {
    setIsPlanningRoute(true);
    setIsRoutePlannerOpen(true);
    try {
      const data = await planCompleteRoute({
        origin: { lat: originCoordsArg[0], lng: originCoordsArg[1], name: originLabelArg },
        destination: { lat: destCoordsArg[0], lng: destCoordsArg[1], name: destLabelArg },
        travelMode: routeTravelMode,
        avoidTolls,
        waitingMins,
        hasLuggage,
      });

      setPlannedResult({
        routes: data.routes || [],
        selectedRouteIndex: 0,
        routingProvider: data.routingProvider,
        routingNotice: data.routingNotice,
        safetyEvaluation: data.safetyEvaluation,
        fares: data.fares,
      });
      setShowTurnByTurnSteps(true);
      showToast(`Route & fare comparison ready to ${destLabelArg}`, 'success');
    } catch (err) {
      console.error('Route planning error:', err);
      showToast('Unable to compute route right now.', 'error');
    } finally {
      setIsPlanningRoute(false);
    }
  };

  const handlePlanToPlace = (place: EnrichedNearbyPlace) => {
    const oCoords: [number, number] = [userCoords.lat, userCoords.lng];
    const oLabel = userAddress || 'Current Location';
    setRouteOriginCoords(oCoords);
    setRouteOriginName(oLabel);
    setRouteDestCoords([place.lat, place.lng]);
    setRouteDestName(place.name);
    executeRoutePlan(oCoords, oLabel, [place.lat, place.lng], place.name);
  };

  const handleFindRouteClick = () => {
    if (!routeDestCoords) {
      showToast('Please select a destination from search suggestions, a place card, or click on the map.', 'info');
      return;
    }
    executeRoutePlan(routeOriginCoords, routeOriginName || 'Origin', routeDestCoords, routeDestName || 'Destination');
  };

  // Map Click Handler respecting active mapClickMode
  const handleMapClick = async (lat: number, lng: number) => {
    const coordsLabel = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    if (mapClickMode === 'ORIGIN') {
      setRouteOriginCoords([lat, lng]);
      setRouteOriginName(coordsLabel);
      setMapClickMode('CENTER');
      showToast(`Route Origin (A) set on map: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
      return;
    }
    if (mapClickMode === 'DESTINATION' || isRoutePlannerOpen) {
      setRouteDestCoords([lat, lng]);
      setRouteDestName(coordsLabel);
      setMapClickMode('CENTER');
      showToast(`Route Destination (B) set on map: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
      return;
    }
    await setUserSelectedPin({ lat, lng });
    setFlyTarget([lat, lng]);
    showToast(`Discovering nearby places around [${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'info');
  };

  const handleSavePlace = async (place: EnrichedNearbyPlace) => {
    if (!user) {
      showToast('Sign in to save favorite places to your profile.', 'info');
      return;
    }
    try {
      await savePlaceBookmark({
        placeId: place.placeId || place.id,
        name: place.name,
        category: place.category,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        phone: place.phone || undefined,
      });
      showToast(`Saved "${place.name}"!`, 'success');
      if (isSavedPanelOpen) loadSavedBookmarks();
    } catch {
      showToast('Failed to save place bookmark.', 'error');
    }
  };

  const handleSaveCurrentRoute = async () => {
    if (!user) {
      showToast('Sign in to save planned routes.', 'info');
      return;
    }
    if (!routeDestCoords || !plannedResult) return;
    const activeRoute = plannedResult.routes[plannedResult.selectedRouteIndex];
    try {
      await saveRouteBookmark({
        originName: routeOriginName,
        destName: routeDestName,
        originLat: routeOriginCoords[0],
        originLng: routeOriginCoords[1],
        destLat: routeDestCoords[0],
        destLng: routeDestCoords[1],
        distanceKm: activeRoute?.distanceKm || plannedResult.fares?.roadDistanceKm || 0,
        travelMode: routeTravelMode,
        estimatedMinutes: activeRoute?.durationMinutes || 15,
      });
      showToast('Route saved to your profile!', 'success');
      if (isSavedPanelOpen) loadSavedBookmarks();
    } catch {
      showToast('Failed to save route.', 'error');
    }
  };

  const getMarkerIcon = (place: EnrichedNearbyPlace) => {
    if (place.category === 'PHARMACY') return pharmacyPin;
    if (place.category === 'HOSPITAL') {
      const sub = (place.subCategory || '').toUpperCase();
      if (['CLINIC', 'DIAGNOSTIC_LAB', 'BLOOD_BANK', 'AMBULANCE'].includes(sub)) return medicalSvcPin;
      return hospitalPin;
    }
    if (place.category === 'POLICE') return policePin;
    if (place.category === 'RESTAURANT') return restaurantPin;
    if (place.category === 'HOTEL') return hotelPin;
    if (place.category === 'TRANSPORT') return transportPin;
    if (place.category === 'SHOPPING') return shoppingPin;
    return tourismPin;
  };

  // All 10 UI categories specified in Section 9
  const categoriesList = [
    { id: 'ALL', label: 'All Nearby Places', icon: Compass },
    { id: 'TOURISM', label: 'Tourist Attractions', icon: Landmark },
    { id: 'FOOD', label: 'Food & Restaurants', icon: Utensils },
    { id: 'ACCOMMODATION', label: 'Hotels', icon: Hotel },
    { id: 'TRANSPORT', label: 'Transport', icon: Bus },
    { id: 'TAXI', label: 'Taxi Counters', icon: Car },
    { id: 'FUEL', label: 'Petrol Pumps', icon: Fuel },
    { id: 'MECHANIC', label: 'Mechanics', icon: Wrench },
    { id: 'GUIDE', label: 'Guides', icon: UserCheck },
    { id: 'SHOPPING', label: 'Shopping', icon: ShoppingBag },
    { id: 'PHARMACY', label: 'Pharmacies', icon: Pill },
    { id: 'HOSPITAL', label: 'Hospitals', icon: HeartPulse },
    { id: 'MEDICAL_SERVICES', label: 'Medical Services', icon: Building2 },
    { id: 'EMERGENCY_SERVICES', label: 'Emergency Services', icon: ShieldAlert },
  ];

  // Dynamic Subcategories matching Section 2 & 3
  const subCategoriesList = useMemo(() => {
    switch (activeCategory) {
      case 'PHARMACY':
        return [
          { id: 'ALL', label: 'All Pharmacies' },
          { id: 'PHARMACY_24_7', label: '24-Hour Pharmacies' },
          { id: 'PHARMACY_DAY', label: 'Standard Chemists' },
        ];
      case 'HOSPITAL':
        return [
          { id: 'ALL', label: 'All Hospitals' },
          { id: 'TRAUMA_CENTER', label: 'Emergency / Trauma Centers' },
          { id: 'HOSPITAL', label: 'General Hospitals' },
        ];
      case 'MEDICAL_SERVICES':
        return [
          { id: 'ALL', label: 'All Medical Services' },
          { id: 'CLINIC', label: 'Clinics' },
          { id: 'DIAGNOSTIC_LAB', label: 'Diagnostic Labs' },
          { id: 'BLOOD_BANK', label: 'Blood Banks' },
          { id: 'AMBULANCE', label: 'Ambulance Depots' },
        ];
      case 'EMERGENCY_SERVICES':
        return [
          { id: 'ALL', label: 'All Emergency' },
          { id: 'POLICE', label: 'Police Stations' },
          { id: 'TRAUMA_CENTER', label: 'Emergency Depts' },
          { id: 'AMBULANCE', label: 'Ambulance Dispatch' },
        ];
      case 'TOURISM':
        return [
          { id: 'ALL', label: 'All Attractions' },
          { id: 'ATTRACTION', label: 'Sightseeing & Landmarks' },
          { id: 'TEMPLE', label: 'Temples & Heritage' },
          { id: 'PARK', label: 'Parks & Gardens' },
          { id: 'MUSEUM', label: 'Museums' },
          { id: 'ADVENTURE', label: 'Adventure Activities' },
        ];
      case 'FOOD':
        return [
          { id: 'ALL', label: 'All Dining' },
          { id: 'RESTAURANT', label: 'Restaurants' },
          { id: 'CAFE', label: 'Cafes' },
          { id: 'STREET_FOOD', label: 'Street Food' },
          { id: 'FOOD_MARKET', label: 'Food Markets' },
        ];
      case 'ACCOMMODATION':
        return [
          { id: 'ALL', label: 'All Stays' },
          { id: 'HOTEL', label: 'Hotels' },
          { id: 'HOSTEL', label: 'Hostels' },
          { id: 'HOMESTAY', label: 'Homestays' },
        ];
      case 'TRANSPORT':
        return [
          { id: 'ALL', label: 'All Transport' },
          { id: 'RAILWAY_STATION', label: 'Railway Stations' },
          { id: 'BUS_STAND', label: 'Bus Stands' },
          { id: 'METRO_STATION', label: 'Metro Stations' },
          { id: 'AUTO_STAND', label: 'Taxi & Auto Stands' },
          { id: 'PARKING', label: 'Parking Facilities' },
          { id: 'RENTAL', label: 'Car & Bike Rentals' },
        ];
      case 'SHOPPING':
        return [
          { id: 'ALL', label: 'All Shopping' },
          { id: 'LOCAL_MARKET', label: 'Markets' },
          { id: 'BAZAAR', label: 'Traditional Bazaars' },
          { id: 'MALL', label: 'Shopping Centres' },
          { id: 'LOCAL_SHOP', label: 'Local Shops' },
        ];
      default:
        return [];
    }
  }, [activeCategory]);

  const showMedicalDisclaimer = ['PHARMACY', 'HOSPITAL', 'MEDICAL_SERVICES', 'EMERGENCY_SERVICES'].includes(
    activeCategory
  ) || Boolean(highlightedEmergencyPlace);

  const locationStatusLabel =
    locationSource === 'gps'
      ? `GPS Live (±${locationAccuracy ? Math.round(locationAccuracy) : 15}m)`
      : locationSource === 'session_cache'
      ? `Cached GPS (±${locationAccuracy ? Math.round(locationAccuracy) : 25}m)`
      : locationSource === 'map_pin'
      ? 'Manual / Map Pin'
      : 'Selected Hub (GPS inactive)';

  const activeRouteCoords =
    plannedResult?.routes?.[plannedResult.selectedRouteIndex]?.coordinates ||
    (routeDestCoords ? [routeOriginCoords, routeDestCoords] : null);

  // Shared card renderer for desktop sidebar and mobile bottom sheet
  const renderPlaceCard = (place: EnrichedNearbyPlace) => {
    const isSelected = selectedPlace?.id === place.id;
    const roadTag =
      place.distanceSource === 'GOOGLE_ROUTES'
        ? 'Google Road'
        : place.distanceSource === 'OSRM_ROAD'
        ? 'OSRM Road'
        : 'Est. Road';

    return (
      <div
        key={place.id}
        onClick={() => {
          setSelectedPlace(place);
          setFlyTarget([place.lat, place.lng]);
        }}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
          isSelected
            ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
            : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase text-amber-400">
                {place.category.replace('_', ' ')}
                {place.subCategory ? ` · ${place.subCategory.replace(/_/g, ' ')}` : ''}
              </span>
              {place.is24Hours ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Open 24/7
                </span>
              ) : place.isOpenNow === true ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Open Now
                </span>
              ) : place.isOpenNow === false ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800/60">
                  Closed Now
                </span>
              ) : null}
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {place.source === 'GOOGLE_PLACES' ? 'Google Places' : 'Verified DB'}
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-white line-clamp-1 mt-1">{place.name}</h4>
            <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug mt-0.5">{place.address}</p>
          </div>

          {place.rating && (
            <span className="text-xs font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 flex-shrink-0">
              ★ {place.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Opening hours & phone row when available */}
        {(place.openingHours || place.phone) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
            {place.openingHours && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{place.openingHours}</span>
              </span>
            )}
            {place.phone && (
              <span className="flex items-center gap-1 font-semibold text-blue-300">
                <Phone className="w-3 h-3" />
                <span>{place.phone}</span>
              </span>
            )}
          </div>
        )}

        {/* Explicit Straight-line vs Road Distance & Travel Durations */}
        <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-950 rounded-xl border border-slate-800/80">
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">Straight-Line:</span>
            <span className="font-bold text-slate-200">{place.straightLineLabel}</span>
            <span className="block text-[10px] text-slate-400">~{place.estimatedWalkingTimeMin}m walk</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[9px] uppercase font-bold">
              Road ({roadTag}):
            </span>
            <span className="font-extrabold text-emerald-400">{place.roadDistanceLabel}</span>
            <span className="block text-[10px] text-slate-400">
              ~{place.estimatedDrivingTimeMin}m drive · ~{place.estimatedCyclingTimeMin}m cycle
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePlanToPlace(place);
            }}
            className="flex-1 min-w-[110px] py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span>Route Here</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFareEstimator(place);
            }}
            className="py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow-sm"
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Fares</span>
          </button>

          {place.phone && (
            <a
              href={`tel:${place.phone.split('/')[0].trim()}`}
              onClick={(e) => e.stopPropagation()}
              className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </a>
          )}

          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${place.lat},${place.lng}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Open Directions in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 text-red-400" />
          </a>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSavePlace(place);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Save Place to Bookmarks"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {place.source === 'OFFICIAL_REGISTRY' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openReviewsModal(place);
              }}
              className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1"
              title="Reviews & Verification"
            >
              <MessageSquare className="w-3 h-3 text-sky-400" />
              <span>Reviews</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4 pb-24 lg:pb-12 overflow-x-hidden">
      {/* 1. TOP HEADER: CURRENT LOCATION, SEARCH LOCATION, THEME, & REFRESH */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400">
                <MapPin className="w-4 h-4 text-blue-400" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">
                Nearby Places & Local Travel Intelligence
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  locationSource === 'gps' || locationSource === 'session_cache'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-slate-900 text-amber-300 border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    locationSource === 'gps' || locationSource === 'session_cache'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                {locationStatusLabel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Nearby Places</h1>
            <p className="text-xs text-slate-300 font-medium break-words">
              {userAddress} · Coordinates: {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
            </p>
          </div>

          {/* Global Location Search + GPS + Bookmarks + Theme Switch */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto lg:min-w-[420px] min-w-0">
            <PlaceAutocompleteInput
              className="flex-1 min-w-0"
              value={globalSearchText}
              onChange={setGlobalSearchText}
              biasCoords={userCoords}
              placeholder="Search any city, area, or landmark (India & global)..."
              onSelectLocation={async (loc) => {
                await setUserSelectedPin({ lat: loc.lat, lng: loc.lng }, loc.address || loc.name);
                setFlyTarget([loc.lat, loc.lng]);
                showToast(`Moved search center to ${loc.name}`, 'success');
              }}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={gpsStatus === 'locating'}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 whitespace-nowrap touch-min"
              >
                <Crosshair className={`w-4 h-4 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
                <span>{gpsStatus === 'locating' ? 'Locating...' : 'Use My Current Location'}</span>
              </button>

              <button
                type="button"
                onClick={loadNearbyPlaces}
                disabled={isLoading}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 touch-min flex items-center justify-center"
                title="Refresh nearby places"
                aria-label="Refresh nearby places"
              >
                <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setIsSavedPanelOpen(!isSavedPanelOpen)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 touch-min flex items-center justify-center"
                title="Saved Places & Saved Routes"
                aria-label="Saved Places & Routes"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* GPS Permission Denied / Error Fallback Notice */}
        {(gpsStatus === 'denied' || locationError) && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>GPS Notice:</strong>{' '}
                {locationError || 'Location permission denied. Click on the map or search any location manually above.'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={currentCity?.id || ''}
                onChange={(e) => {
                  const found = cities.find((c) => c.id === e.target.value);
                  if (found) setCity(found);
                }}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    Jump to {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setMapClickMode('CENTER');
                  showToast('Tap any point on the map below to set your manual location.', 'info');
                }}
                className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-[11px]"
              >
                Pick on Map
              </button>
            </div>
          </div>
        )}

        {/* Concise Data Source Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span className={isGoogleConfigured ? 'text-emerald-300 font-medium' : 'text-slate-300 font-medium'}>
              {isGoogleConfigured
                ? 'Live Google Places & road routing active.'
                : 'Showing verified YatraGuard places & OpenStreetMap road routing.'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            Tap any pin or card for directions &amp; fares
          </span>
        </div>
      </div>

      {/* 2. EMERGENCY ASSISTANCE SHORTCUTS (Hospital, Pharmacy, Trauma, Police, Directions, Call Facility, Call 112, SOS) */}
      <div className="p-3.5 rounded-2xl bg-red-950/30 border border-red-800/40 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <span>Emergency Assistance Shortcuts</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('HOSPITAL');
                setActiveSubCategory('ALL');
                if (emergencyShortcuts?.nearestHospital) {
                  setHighlightedEmergencyPlace(emergencyShortcuts.nearestHospital);
                  setSelectedPlace(emergencyShortcuts.nearestHospital);
                  setFlyTarget([emergencyShortcuts.nearestHospital.lat, emergencyShortcuts.nearestHospital.lng]);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-800/60 font-bold text-xs flex items-center gap-1"
            >
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nearest Hospital</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('PHARMACY');
                setActiveSubCategory('ALL');
                if (emergencyShortcuts?.nearestPharmacy) {
                  setHighlightedEmergencyPlace(emergencyShortcuts.nearestPharmacy);
                  setSelectedPlace(emergencyShortcuts.nearestPharmacy);
                  setFlyTarget([emergencyShortcuts.nearestPharmacy.lat, emergencyShortcuts.nearestPharmacy.lng]);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-800/60 font-bold text-xs flex items-center gap-1"
            >
              <Pill className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nearest Pharmacy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('EMERGENCY_SERVICES');
                setActiveSubCategory('TRAUMA_CENTER');
                if (emergencyShortcuts?.nearestTraumaCenter) {
                  setHighlightedEmergencyPlace(emergencyShortcuts.nearestTraumaCenter);
                  setSelectedPlace(emergencyShortcuts.nearestTraumaCenter);
                  setFlyTarget([
                    emergencyShortcuts.nearestTraumaCenter.lat,
                    emergencyShortcuts.nearestTraumaCenter.lng,
                  ]);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-800/60 font-bold text-xs flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Emergency Dept</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('EMERGENCY_SERVICES');
                setActiveSubCategory('POLICE');
                if (emergencyShortcuts?.nearestPolice) {
                  setHighlightedEmergencyPlace(emergencyShortcuts.nearestPolice);
                  setSelectedPlace(emergencyShortcuts.nearestPolice);
                  setFlyTarget([emergencyShortcuts.nearestPolice.lat, emergencyShortcuts.nearestPolice.lng]);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-800/60 font-bold text-xs flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Police Station</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCall112Modal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call 112 (India)</span>
            </button>

            {openEmergencyModal && (
              <button
                type="button"
                onClick={openEmergencyModal}
                className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SOS Panel</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlighted Emergency Quick Action Bar (Get Directions / Call Available Facility) */}
        {(highlightedEmergencyPlace || emergencyShortcuts?.nearestHospital) && (() => {
          const target = highlightedEmergencyPlace || emergencyShortcuts?.nearestHospital;
          if (!target) return null;
          return (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-red-900/40 text-xs">
              <div className="min-w-0">
                <span className="font-bold text-white">{target.name}</span>
                <span className="text-slate-300 ml-2">
                  ({target.roadDistanceLabel} road · ~{target.estimatedDrivingTimeMin}m drive)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePlanToPlace(target)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Get Directions</span>
                </button>
                {target.phone && (
                  <a
                    href={`tel:${target.phone.split('/')[0].trim()}`}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call Available Facility ({target.phone.split('/')[0].trim()})</span>
                  </a>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. CATEGORIES & SUBCATEGORIES */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {categoriesList.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveSubCategory('ALL');
                }}
                className={`px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {subCategoriesList.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
              Subcategory:
            </span>
            {subCategoriesList.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveSubCategory(sub.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
                  activeSubCategory === sub.id
                    ? 'bg-blue-600 text-white font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. RADIUS SELECTOR, FILTERS, SORT & ROUTE PLANNER TOGGLE */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-3xl border border-slate-800 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 text-xs">
        {/* Distance Radius Pills + Custom */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-amber-400" /> Radius:
          </span>
          {[1, 2, 5, 10, 20].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setSelectedRadiusKm(r);
                setCustomRadiusInput(String(r));
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                selectedRadiusKm === r
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {r} km
            </button>
          ))}
          <div className="flex items-center gap-1 pl-1">
            <input
              type="number"
              min="0.5"
              max="50"
              step="0.5"
              value={customRadiusInput}
              onChange={(e) => setCustomRadiusInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyCustomRadius();
              }}
              className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white text-center focus:outline-none focus:border-amber-400"
              aria-label="Custom search radius in km"
            />
            <button
              type="button"
              onClick={handleApplyCustomRadius}
              className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] border border-slate-700"
            >
              Apply km
            </button>
          </div>
        </div>

        {/* Operational Toggles, Sorting & Route Planner Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsOpenNowFilter(!isOpenNowFilter)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 ${
              isOpenNowFilter
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-black'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Open Now</span>
          </button>

          <button
            type="button"
            onClick={() => setIs24HoursFilter(!is24HoursFilter)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
              is24HoursFilter
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-black'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            24-Hour Only
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort nearby places"
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="distance">Nearest first (Straight-line)</option>
            <option value="roadDistance">Shortest road distance</option>
            <option value="fastest">Fastest journey</option>
            <option value="category">Category</option>
            <option value="rating">Highest rated</option>
          </select>

          <button
            type="button"
            onClick={() => setIsRoutePlannerOpen(!isRoutePlannerOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              isRoutePlannerOpen
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-900 text-blue-400 border border-blue-500/40 hover:bg-slate-800'
            }`}
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span>{isRoutePlannerOpen ? 'Hide Route Planner' : 'Source & Dest Route Planner'}</span>
          </button>
        </div>
      </div>

      {/* 5. MEDICAL & PHARMACY DISCLAIMER (Collapsible) */}
      {showMedicalDisclaimer && (
        <details className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
          <summary className="font-extrabold flex items-center gap-1.5 text-amber-300 cursor-pointer list-none">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Medical Facility Notice (Call facility or 112 to confirm live availability)</span>
          </summary>
          <div className="pt-2 mt-2 border-t border-amber-800/30 space-y-1 text-[11px] leading-relaxed text-slate-300">
            <p>
              • <strong>Medicine Stock:</strong> Always call the pharmacy before visiting to confirm stock.
            </p>
            <p>
              • <strong>Beds &amp; Ambulances:</strong> Dial <strong>112</strong> or call the hospital directly for emergency capacity.
            </p>
          </div>
        </details>
      )}

      {/* 6. COLLAPSIBLE SOURCE & DESTINATION ROUTE PLANNER (Keeps Map Visible Below!) */}
      {isRoutePlannerOpen && (
        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-blue-500/50 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <Navigation className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">Source & Destination Route & Fare Planner</h3>
                <p className="text-[11px] text-slate-400">
                  Real routing across India & worldwide with alternatives, turn-by-turn steps & 8-mode tariff comparison
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRoutePlannerOpen(false)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              title="Close route planner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-11 gap-2.5 items-center">
            {/* Origin A */}
            <div className="lg:col-span-5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-blue-400 px-1">
                <span>Source (Origin A)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRouteOriginCoords([userCoords.lat, userCoords.lng]);
                      setRouteOriginName(userAddress || 'Current Location');
                    }}
                    className="text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <Crosshair className="w-3 h-3" /> Use Current Location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapClickMode('ORIGIN');
                      showToast('Click any point on the map to set Source (A)', 'info');
                    }}
                    className="text-amber-400 hover:underline"
                  >
                    {mapClickMode === 'ORIGIN' ? 'Waiting for Map Click...' : 'Pick on Map'}
                  </button>
                </div>
              </div>
              <PlaceAutocompleteInput
                value={routeOriginName}
                onChange={setRouteOriginName}
                biasCoords={userCoords}
                leftIcon={<span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" />}
                placeholder="Search origin city, address, or landmark..."
                onSelectLocation={(loc) => {
                  setRouteOriginCoords([loc.lat, loc.lng]);
                  setRouteOriginName(loc.address || loc.name);
                }}
              />
            </div>

            {/* Swap */}
            <div className="lg:col-span-1 flex justify-center pt-3 lg:pt-4">
              <button
                type="button"
                onClick={() => {
                  if (!routeDestCoords) return;
                  const oC = routeOriginCoords;
                  const oN = routeOriginName;
                  setRouteOriginCoords(routeDestCoords);
                  setRouteOriginName(routeDestName);
                  setRouteDestCoords(oC);
                  setRouteDestName(oN);
                }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400"
                title="Swap source and destination"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Destination B */}
            <div className="lg:col-span-5 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-red-400 px-1">
                <span>Destination (Dest B)</span>
                <button
                  type="button"
                  onClick={() => {
                    setMapClickMode('DESTINATION');
                    showToast('Click any point on the map to set Destination (B)', 'info');
                  }}
                  className="text-amber-400 hover:underline"
                >
                  {mapClickMode === 'DESTINATION' ? 'Waiting for Map Click...' : 'Pick on Map'}
                </button>
              </div>
              <PlaceAutocompleteInput
                value={routeDestName}
                onChange={(v) => {
                  setRouteDestName(v);
                  if (!v) setRouteDestCoords(null);
                }}
                biasCoords={userCoords}
                leftIcon={<span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />}
                placeholder="Search destination across India or internationally..."
                onSelectLocation={(loc) => {
                  setRouteDestCoords([loc.lat, loc.lng]);
                  setRouteDestName(loc.address || loc.name);
                }}
              />
            </div>
          </div>

          {/* Travel Mode, Surcharge Factors, Clear & Find Routes */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {[
                { id: 'DRIVE' as const, label: 'Drive', icon: Car },
                { id: 'WALK' as const, label: 'Walk', icon: Footprints },
                { id: 'BICYCLE' as const, label: 'Cycle', icon: Bike },
                { id: 'TRANSIT' as const, label: 'Transit', icon: Train },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRouteTravelMode(m.id)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 border ${
                      routeTravelMode === m.id
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}

              <select
                value={waitingMins}
                onChange={(e) => setWaitingMins(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-[11px] text-white"
                title="Estimated waiting time"
              >
                <option value={0}>Waiting: 0 min</option>
                <option value={15}>Waiting: 15 mins</option>
                <option value={30}>Waiting: 30 mins</option>
                <option value={60}>Waiting: 1 hour</option>
              </select>

              <label className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLuggage}
                  onChange={(e) => setHasLuggage(e.target.checked)}
                />
                <span>Luggage</span>
              </label>

              <label className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avoidTolls}
                  onChange={(e) => setAvoidTolls(e.target.checked)}
                />
                <span>Avoid Tolls</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRouteDestCoords(null);
                  setRouteDestName('');
                  setPlannedResult(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleFindRouteClick}
                disabled={isPlanningRoute}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{isPlanningRoute ? 'Calculating...' : 'Find Routes'}</span>
              </button>
            </div>
          </div>

          {/* Planned Route Alternatives, Turn-by-Turn Steps & 8-Mode Fares */}
          {plannedResult && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 font-bold text-[10px]">
                    Provider: {plannedResult.routingProvider.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-slate-300">{plannedResult.routingNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCurrentRoute}
                  className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 font-bold text-[11px] flex items-center gap-1"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Save Route</span>
                </button>
              </div>

              {/* Alternative Route Options Cards */}
              {plannedResult.routes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {plannedResult.routes.map((rt, idx) => {
                    const isActive = plannedResult.selectedRouteIndex === idx;
                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setPlannedResult({ ...plannedResult, selectedRouteIndex: idx })}
                        className={`text-left p-3 rounded-2xl border transition-all ${
                          isActive
                            ? 'bg-slate-900 border-blue-400 ring-2 ring-blue-500/30'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-extrabold text-white">
                          <span>{rt.summary}</span>
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <div className="text-sm font-black text-emerald-400 mt-1">
                          {rt.durationLabel} · {rt.distanceLabel}
                        </div>
                        {rt.tollInfo?.note && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{rt.tollInfo.note}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Turn-by-Turn Directions Panel */}
              {plannedResult.routes[plannedResult.selectedRouteIndex]?.steps?.length > 0 && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3">
                  <button
                    type="button"
                    onClick={() => setShowTurnByTurnSteps(!showTurnByTurnSteps)}
                    className="w-full flex items-center justify-between text-xs font-extrabold text-white"
                  >
                    <span>
                      Turn-by-Turn Directions ({plannedResult.routes[plannedResult.selectedRouteIndex].steps.length} steps)
                    </span>
                    {showTurnByTurnSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showTurnByTurnSteps && (
                    <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {plannedResult.routes[plannedResult.selectedRouteIndex].steps.map((st, sIdx) => (
                        <div
                          key={sIdx}
                          className="flex items-center justify-between gap-2 text-[11px] p-2 rounded-xl bg-slate-900/70 border border-slate-800/70"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black text-blue-400 w-5">{sIdx + 1}.</span>
                            <span className="text-slate-200">{st.instruction}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                            {st.distanceLabel} ({st.durationLabel})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Modal 8-Mode Local Transport & Fare Comparison */}
              {plannedResult.fares && (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="font-extrabold text-white">
                      Available Transport & Fare Comparison ({plannedResult.fares.roadDistanceKm} km road vs{' '}
                      {plannedResult.fares.straightLineKm} km air)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {plannedResult.fares.coveredCityName
                        ? `Tariff Zone: ${plannedResult.fares.coveredCityName} (${plannedResult.fares.terrainType})`
                        : 'Outside mapped RTO tariff cities'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {plannedResult.fares.options.map((opt: MultimodalFareOption) => (
                      <div
                        key={opt.modeId}
                        className={`p-3 rounded-2xl border space-y-1.5 flex flex-col justify-between ${
                          opt.isAvailable
                            ? 'bg-slate-900/90 border-slate-800'
                            : 'bg-slate-950/60 border-slate-800/60 opacity-75'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-extrabold text-xs text-white">{opt.name}</span>
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border whitespace-nowrap ${
                                opt.priceType === 'OFFICIAL_GOVT'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : opt.priceType === 'UNAVAILABLE'
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : 'bg-amber-950 text-amber-300 border-amber-800'
                              }`}
                            >
                              {opt.priceTypeLabel}
                            </span>
                          </div>
                          <div
                            className={`text-base font-black mt-1 ${
                              opt.isAvailable ? 'text-emerald-400' : 'text-slate-400 text-xs'
                            }`}
                          >
                            {opt.fareLabel}
                          </div>
                          {opt.isAvailable && (
                            <div className="text-[11px] text-slate-400">
                              ~{opt.durationMin} mins · {opt.distanceKm} km
                            </div>
                          )}
                          <p className="text-[10px] text-slate-300 mt-1 leading-snug">{opt.description}</p>
                        </div>

                        <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                          {opt.conditions.slice(0, 3).map((c, ci) => (
                            <div key={ci}>• {c}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. MAIN SPLIT SECTION: INTEGRATED SAFETY MAP + DIRECTORY (DESKTOP) / EXPANDABLE SHEET (MOBILE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[680px]">
        {/* Interactive Map Container */}
        <div className="lg:col-span-7 h-[46dvh] sm:h-[52dvh] min-h-[300px] lg:h-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
          {/* Map Top Controls: Normal/Safety Toggle, Map Click Mode, Provider Fallback */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 text-[11px] pointer-events-auto">
              <button
                type="button"
                onClick={() => setMapDisplayMode(mapDisplayMode === 'SAFETY' ? 'NORMAL' : 'SAFETY')}
                className={`px-2.5 py-1 rounded-lg font-black transition-colors ${
                  mapDisplayMode === 'SAFETY'
                    ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {mapDisplayMode === 'SAFETY' ? '🛡️ Safety Map' : '🗺️ Normal Map'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setMapClickMode((prev) =>
                    prev === 'CENTER' ? 'DESTINATION' : prev === 'DESTINATION' ? 'ORIGIN' : 'CENTER'
                  )
                }
                className="px-2 py-1 rounded-lg bg-slate-900 text-amber-300 font-bold border border-slate-700"
                title="Cycle what clicking the map sets"
              >
                Tap Map:{' '}
                {mapClickMode === 'CENTER' ? 'Center' : mapClickMode === 'ORIGIN' ? 'Origin A' : 'Dest B'}
              </button>
            </div>

            {/* Map Tile Provider Selector */}
            <div className="relative pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsProviderMenuOpen(!isProviderMenuOpen)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 text-slate-200 border border-slate-800 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>{activeProvider.name.split(' ')[0]}</span>
              </button>
              {isProviderMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 max-w-[calc(100vw-2rem)] bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 space-y-1">
                  {mapProviderService.getAllProviders().map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCurrentMapProviderId(p.id);
                        setIsProviderMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-semibold ${
                        currentMapProviderId === p.id
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <MapContainer
            center={[userCoords.lat, userCoords.lng]}
            zoom={selectedRadiusKm <= 2 ? 14 : selectedRadiusKm <= 10 ? 13 : 11}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <ChangeMapView coords={[userCoords.lat, userCoords.lng]} />
            <FlyToController target={flyTarget} />
            <RouteBoundsController coordinates={activeRouteCoords} />
            <MapClickEvents onMapClick={handleMapClick} />

            <TileLayer
              key={activeProvider.id}
              url={activeProvider.url}
              attribution={activeProvider.attribution}
              subdomains={activeProvider.subdomains || 'abc'}
              maxZoom={activeProvider.maxZoom || 19}
              eventHandlers={{
                tileerror: () => {
                  if (mapProviderService.recordTileError(currentMapProviderId)) {
                    const nextName = switchMapProviderFallback();
                    showToast(`Map tile fallback switched to ${nextName}`, 'info');
                  }
                },
              }}
            />

            {/* User Location Beacon */}
            <Marker position={[userCoords.lat, userCoords.lng]} icon={userLocationBeacon}>
              <Popup>
                <div className="p-1 text-xs text-slate-900">
                  <div className="font-black text-blue-600">{locationStatusLabel}</div>
                  <div className="text-[11px] font-medium mt-0.5">{userAddress}</div>
                </div>
              </Popup>
            </Marker>

            {/* Search Radius Circle */}
            <Circle
              center={[userCoords.lat, userCoords.lng]}
              radius={selectedRadiusKm * 1000}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.05,
                weight: 1.5,
                dashArray: '6, 8',
              }}
            />

            {/* Safety Map Overlays: Safety Zones, Scams, Incidents */}
            {mapDisplayMode === 'SAFETY' &&
              safetyOverlays.safetyZones.map((zone) => {
                const isGood = zone.riskTier === 'VERY_GOOD' || zone.riskTier === 'GOOD';
                const isMod = zone.riskTier === 'ACCEPTABLE' || zone.riskTier === 'MODERATE';
                const color = isGood ? '#10B981' : isMod ? '#F59E0B' : '#EF4444';
                return (
                  <Circle
                    key={`sz_${zone.id}`}
                    center={[zone.lat, zone.lng]}
                    radius={zone.radiusKm * 1000}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.1, weight: 1.5 }}
                  >
                    <Popup>
                      <div className="text-xs p-1 text-slate-900">
                        <div className="font-extrabold">🛡️ {zone.name}</div>
                        <div className="text-[11px]">
                          Safety Score: {zone.score}/100 ({zone.riskTier})
                        </div>
                        <div className="text-[10px] text-slate-600">{zone.reason}</div>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

            {mapDisplayMode === 'SAFETY' &&
              safetyOverlays.scams.map((scam) => (
                <Marker key={`sc_${scam.id}`} position={[scam.lat, scam.lng]} icon={scamPin}>
                  <Popup>
                    <div className="text-xs p-1 text-slate-900 max-w-[220px]">
                      <div className="font-extrabold text-amber-700">⚡ Scam Alert: {scam.title}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{scam.description}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {mapDisplayMode === 'SAFETY' &&
              safetyOverlays.incidents.map((inc) => (
                <Marker
                  key={`inc_${inc.id}`}
                  position={[inc.lat, inc.lng]}
                  icon={inc.status === 'VERIFIED' || inc.status === 'ADMIN_VERIFIED' ? verifiedIncidentPin : pendingIncidentPin}
                >
                  <Popup>
                    <div className="text-xs p-1 text-slate-900 max-w-[220px]">
                      <div className="font-extrabold text-red-700">
                        {inc.status === 'VERIFIED' || inc.status === 'ADMIN_VERIFIED' ? '🚨 Verified Incident' : '⚠️ Reported Incident'}: {inc.title}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{inc.description}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Discovered Places Markers */}
            {places.map((place) => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={getMarkerIcon(place)}
                eventHandlers={{
                  click: () => {
                    setSelectedPlace(place);
                    setFlyTarget([place.lat, place.lng]);
                  },
                }}
              >
                <Popup>
                  <div className="p-1 text-xs text-slate-900 space-y-1 max-w-[240px]">
                    <div className="font-extrabold text-sm">{place.name}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      {place.category} {place.subCategory ? `· ${place.subCategory}` : ''}
                    </div>
                    <div className="text-[11px] text-slate-600">{place.address}</div>
                    <div className="flex items-center justify-between text-[10px] font-bold pt-1 border-t border-slate-200">
                      <span>Road: {place.roadDistanceLabel}</span>
                      <span className="text-emerald-700">{place.openStatus}</span>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePlanToPlace(place)}
                        className="flex-1 py-1 px-2 rounded bg-blue-600 text-white font-bold text-[10px]"
                      >
                        Route & Fares
                      </button>
                      {place.phone && (
                        <a
                          href={`tel:${place.phone.split('/')[0].trim()}`}
                          className="py-1 px-2 rounded bg-emerald-600 text-white font-bold text-[10px]"
                        >
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Route Planner Polylines & Origin A / Dest B Pins */}
            {plannedResult?.routes?.map((rt, idx) => {
              const isSelected = plannedResult.selectedRouteIndex === idx;
              return (
                <Polyline
                  key={rt.id}
                  positions={rt.coordinates}
                  pathOptions={{
                    color: isSelected ? '#2563EB' : '#64748B',
                    weight: isSelected ? 6 : 4,
                    opacity: isSelected ? 0.92 : 0.5,
                    dashArray: isSelected ? undefined : '6, 8',
                  }}
                  eventHandlers={{
                    click: () => setPlannedResult({ ...plannedResult, selectedRouteIndex: idx }),
                  }}
                />
              );
            })}

            {routeDestCoords && (
              <>
                <Marker position={routeOriginCoords} icon={routePinA} />
                <Marker position={routeDestCoords} icon={routePinB} />
              </>
            )}
          </MapContainer>
        </div>

        {/* Desktop Scroll Directory Sidebar */}
        <div className="hidden lg:flex lg:col-span-5 h-full flex-col glass-panel rounded-3xl border border-slate-800 p-4 overflow-hidden">
          <div className="space-y-2 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-white">
                Discovered Places ({places.length})
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedRadiusKm} km · {sortBy}
              </span>
            </div>
            <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                placeholder="Filter results by name, address, or service..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {keywordFilter && (
                <button type="button" onClick={() => setKeywordFilter('')}>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="p-4 bg-slate-900/60 rounded-2xl animate-pulse space-y-2">
                    <div className="w-3/4 h-3.5 bg-slate-800 rounded" />
                    <div className="w-1/2 h-2.5 bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : places.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2.5">
                <Building2 className="w-8 h-8 mx-auto text-slate-600" />
                <div>
                  No places found within {selectedRadiusKm} km matching the active filters.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('ALL');
                    setActiveSubCategory('ALL');
                    setIsOpenNowFilter(false);
                    setIs24HoursFilter(false);
                    setSelectedRadiusKm(20);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
                >
                  Expand Search to 20 km
                </button>
              </div>
            ) : (
              places.map(renderPlaceCard)
            )}
          </div>
        </div>
      </div>

      {/* MOBILE EXPANDABLE BOTTOM SHEET (< lg viewports) */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-16 z-[90] bg-slate-950/95 backdrop-blur-xl border-t-2 border-slate-700 rounded-t-3xl shadow-2xl flex flex-col transition-all duration-300 ${
          mobileSheetState === 'peek'
            ? 'h-32'
            : mobileSheetState === 'half'
            ? 'h-[44dvh]'
            : 'h-[78dvh]'
        }`}
      >
        <div
          onClick={() =>
            setMobileSheetState((prev) =>
              prev === 'peek' ? 'half' : prev === 'half' ? 'full' : 'peek'
            )
          }
          className="px-4 py-2.5 border-b border-slate-800 flex flex-col items-center cursor-pointer touch-min"
        >
          <div className="w-10 h-1 bg-slate-600 rounded-full mb-1.5" />
          <div className="w-full flex items-center justify-between text-xs">
            <span className="font-extrabold text-white">
              Nearby Places ({places.length}) · {selectedRadiusKm} km
            </span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              {mobileSheetState === 'full' ? (
                <>
                  <ChevronDown className="w-4 h-4" /> Collapse
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4" /> Expand
                </>
              )}
            </span>
          </div>
        </div>

        {mobileSheetState !== 'peek' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {isLoading ? (
              <div className="text-xs text-slate-400 text-center py-6">Discovering nearby places...</div>
            ) : places.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6 space-y-2">
                <div>No matching places within {selectedRadiusKm} km.</div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('ALL');
                    setSelectedRadiusKm(20);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs"
                >
                  Expand to 20 km
                </button>
              </div>
            ) : (
              places.map(renderPlaceCard)
            )}
          </div>
        )}
      </div>

      {/* SAVED PLACES & SAVED ROUTES MODAL / DRAWER */}
      {isSavedPanelOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Saved Places & Routes</h3>
              </div>
              <button type="button" onClick={() => setIsSavedPanelOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!user ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                Please sign in to save favorite medical facilities, places, and custom routes privately to your account.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-amber-400 uppercase tracking-wider text-[11px] mb-2">
                    Saved Places ({savedPlaces.length})
                  </h4>
                  {savedPlaces.length === 0 ? (
                    <div className="text-slate-400">No saved places yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {savedPlaces.map((sp) => (
                        <div
                          key={sp.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={async () => {
                              await setUserSelectedPin({ lat: sp.lat, lng: sp.lng }, sp.address || sp.name);
                              setFlyTarget([sp.lat, sp.lng]);
                              setIsSavedPanelOpen(false);
                            }}
                          >
                            <div className="font-bold text-white truncate">{sp.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">{sp.address}</div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteSavedPlaceBookmark(sp.id);
                              loadSavedBookmarks();
                            }}
                            className="p-1.5 text-red-400 hover:bg-slate-900 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-extrabold text-blue-400 uppercase tracking-wider text-[11px] mb-2">
                    Saved Routes ({savedRoutes.length})
                  </h4>
                  {savedRoutes.length === 0 ? (
                    <div className="text-slate-400">No saved routes yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {savedRoutes.map((sr) => (
                        <div
                          key={sr.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => {
                              setRouteOriginCoords([sr.originLat, sr.originLng]);
                              setRouteOriginName(sr.originName);
                              setRouteDestCoords([sr.destLat, sr.destLng]);
                              setRouteDestName(sr.destName);
                              setIsSavedPanelOpen(false);
                              executeRoutePlan(
                                [sr.originLat, sr.originLng],
                                sr.originName,
                                [sr.destLat, sr.destLng],
                                sr.destName
                              );
                            }}
                          >
                            <div className="font-bold text-white truncate">
                              {sr.originName} → {sr.destName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {sr.distanceKm} km · ~{sr.estimatedMinutes} min ({sr.travelMode})
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteSavedRouteBookmark(sr.id);
                              loadSavedBookmarks();
                            }}
                            className="p-1.5 text-red-400 hover:bg-slate-900 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MULTI-MODAL 8-MODE FARE COMPARATOR MODAL */}
      {isFareModalOpen && fareTargetPlace && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 shadow-2xl text-white max-h-[88dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Local Transport & Fare Comparison</h3>
                  <p className="text-xs text-slate-400">To: {fareTargetPlace.name}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsFareModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Straight-Line:</span>
                <span className="font-bold text-slate-200">{fareTargetPlace.straightLineLabel}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Actual Road:</span>
                <span className="font-extrabold text-emerald-400">{fareTargetPlace.roadDistanceLabel}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Tariff Coverage:</span>
                <span className="font-bold text-amber-400">
                  {fareComparison?.coveredCityName || 'Unmapped Zone'}
                </span>
              </div>
            </div>

            {isCalculatingFare ? (
              <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                <RotateCcw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                <span>Evaluating Local Prices & road fares...</span>
              </div>
            ) : fareComparison ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fareComparison.options.map((opt: MultimodalFareOption) => (
                  <div key={opt.modeId} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-white">{opt.name}</span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                        {opt.priceTypeLabel}
                      </span>
                    </div>
                    <div className={`text-base font-black ${opt.isAvailable ? 'text-emerald-400' : 'text-slate-400 text-xs'}`}>
                      {opt.fareLabel}
                    </div>
                    {opt.isAvailable && (
                      <div className="text-[11px] text-slate-400">
                        ~{opt.durationMin} mins · {opt.distanceKm} km
                      </div>
                    )}
                    <p className="text-[11px] text-slate-300">{opt.description}</p>
                    <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5">
                      {opt.conditions.map((c, idx) => (
                        <div key={idx}>• {c}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsFareModalOpen(false);
                  handlePlanToPlace(fareTargetPlace);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                Show Route on Map
              </button>
              <button
                type="button"
                onClick={() => setIsFareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALL 112 CONFIRMATION MODAL (Never auto-places calls!) */}
      {showCall112Modal && (
        <div className="fixed inset-0 z-[2100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white text-center">
            <div className="w-14 h-14 bg-red-600/30 text-red-500 rounded-full flex items-center justify-center mx-auto border-2 border-red-500 animate-pulse">
              <Phone className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white">Call National Emergency (112)?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will launch your device dialer for <strong>112</strong> (India ERSS Police, Ambulance & Fire). Confirm before placing the call.
            </p>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <div>
                📍 <strong>Current Location:</strong> {userAddress || 'Not detected'}
              </div>
              <div>
                🌐 <strong>Coordinates:</strong> {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href="tel:112"
                onClick={() => setShowCall112Modal(false)}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>Call 112 Now</span>
              </a>
              <button
                type="button"
                onClick={() => setShowCall112Modal(false)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE REVIEWS & VERIFICATION MODAL (Module 8) */}
      {reviewPlace && (
        <div className="fixed inset-0 z-[2100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-white max-h-[88dvh] flex flex-col">
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold">{reviewPlace.name}</h3>
                <p className="text-[11px] text-slate-400">
                  {reviewsServiceMeta?.isVerified
                    ? `Verified (${reviewsServiceMeta?.verificationSource || 'Official Directory'})`
                    : 'Community Registry Listing'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewPlace(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && ['ADMIN', 'MODERATOR'].includes(user.role) && reviewsServiceMeta && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <span>Admin Verification Status:</span>
                <button
                  type="button"
                  onClick={() => handleToggleVerify(reviewPlace.id, !reviewsServiceMeta.isVerified)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                    reviewsServiceMeta.isVerified
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {reviewsServiceMeta.isVerified ? 'Revoke Verified Badge' : 'Mark Admin Verified'}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingReviews ? (
                <div className="text-xs text-slate-400 py-4 text-center">Loading reviews...</div>
              ) : reviewsList.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No traveler reviews yet. Be the first to rate this service.
                </div>
              ) : (
                reviewsList.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{rev.user?.name || 'Traveler'}</span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" /> {rev.rating}/5
                      </span>
                    </div>
                    <p className="text-slate-300">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            {user && (
              <form onSubmit={handleSubmitReview} className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 font-semibold">Rating:</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Star{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  required
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share honest service quality, pricing, or helpfulness feedback..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
                >
                  {submittingReview ? 'Saving...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default NearbyPlacesPage;
