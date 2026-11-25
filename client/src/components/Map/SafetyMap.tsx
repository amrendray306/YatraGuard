import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  Shield,
  HeartPulse,
  Pill,
  Bus,
  AlertTriangle,
  Flame,
  Filter,
  Layers,
  MapPin,
  Utensils,
  Hotel,
  Landmark,
  Crosshair,
  Compass,
  List,
  X,
  Search,
  Star,
  Phone,
  ChevronRight,
  ShieldCheck,
  Clock,
  Eye,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  Globe,
  CheckCircle2,
  Navigation,
  Car,
  Footprints,
  HelpCircle,
  Info,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { MapCard } from './MapCard';
import { useCity, ReportPinData } from '../../context/CityContext';
import { useToast } from '../../context/ToastContext';
import { mapProviderService, MapProvider } from '../../services/mapProviderService';
import { locationService } from '../../services/locationService';
import { roadRoutingService, SafetyAwareRouteOption } from '../../services/roadRoutingService';
import { confirmIncident } from '../../services/api';

// Component to dynamically re-center map when city or coords change
function ChangeMapView({ coords, zoom }: { coords: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom || 13, { animate: true });
  }, [coords[0], coords[1], zoom, map]);
  return null;
}

// Controller for programmatic flyTo when user clicks a POI from the drawer
function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 16, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// Map Event Listener for Click-to-Pin
function MapClickEvents({
  onMapClick,
  isReportMode,
}: {
  onMapClick: (lat: number, lng: number) => void;
  isReportMode: boolean;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Controller to auto-fit bounds when a safer route is calculated
function RouteBoundsController({ coordinates }: { coordinates: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 1) {
      const bounds = L.latLngBounds(coordinates.map((c) => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [coordinates, map]);
  return null;
}

// Custom Leaflet DivIcons with color-coded pins adhering to exact required legend:
// Red: Verified high-priority safety incident
// Orange: Report awaiting verification
// Yellow: Community warning / Scam report
// Green: Essential service (Hospital / Police / Pharmacy)
// Blue: Tourist attraction
// Blue location dot: Current user location
const createCustomPin = (bgColor: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        border: 2px solid #ffffff;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 14px;
          font-weight: bold;
          line-height: 1;
        ">${symbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Pulsating user location beacon
const userIcon = L.divIcon({
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

// Interactive Draggable Report Pin Icon
const reportDraggableIcon = L.divIcon({
  className: 'report-draggable-pin',
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: #EF4444; opacity: 0.4; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        background: #DC2626;
        border: 2.5px solid #FFFFFF;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(220, 38, 38, 0.7);
      ">
        <span style="transform: rotate(45deg); font-size: 15px; color: white;">📍</span>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 38],
  popupAnchor: [0, -38],
});

// Route Origin (A) and Destination (B) Pin Icons
const routeStartIcon = L.divIcon({
  className: 'route-start-pin',
  html: `
    <div style="background-color: #2563EB; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 2.5px solid #ffffff; color: white; font-weight: 900; font-size: 13px;">
      A
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const routeDestIcon = L.divIcon({
  className: 'route-dest-pin',
  html: `
    <div style="background-color: #DC2626; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 2.5px solid #ffffff; color: white; font-weight: 900; font-size: 13px;">
      B
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Category Pin Definitions
const verifiedIncidentIcon = createCustomPin('#DC2626', '🚨'); // Red: Verified high-priority incident
const pendingIncidentIcon = createCustomPin('#F97316', '⏳'); // Orange: Awaiting verification
const scamWarningIcon = createCustomPin('#EAB308', '⚠️'); // Yellow: Community warning
const essentialHospitalIcon = createCustomPin('#16A34A', '🏥'); // Green: Hospital
const essentialPoliceIcon = createCustomPin('#16A34A', '👮'); // Green: Police
const pharmacyIcon = createCustomPin('#16A34A', '💊'); // Green: Essential pharmacy
const touristAttractionIcon = createCustomPin('#2563EB', '🏛️'); // Blue: Tourist attraction
const transportIcon = createCustomPin('#06B6D4', '🚇');
const hotelIcon = createCustomPin('#8B5CF6', '🏨');
const restaurantIcon = createCustomPin('#F43F5E', '🍽️');
const shoppingIcon = createCustomPin('#D97706', '🛍️');

interface SafetyMapProps {
  center: [number, number];
  services: any[];
  incidents: any[];
  scams: any[];
  safetyZones: any[];
  userLocation?: [number, number];
  height?: string;
  onLocateMe?: () => void;
  onCheckFare?: (placeName: string) => void;
  onNavigateToFeed?: () => void;
  onOpenIncidentModalWithPin?: (pin: ReportPinData) => void;
}

export const SafetyMap: React.FC<SafetyMapProps> = ({
  center,
  services,
  incidents,
  scams,
  safetyZones,
  userLocation,
  height = 'calc(100vh - 4rem)',
  onLocateMe,
  onCheckFare,
  onNavigateToFeed,
  onOpenIncidentModalWithPin,
}) => {
  const {
    currentCity,
    currentMapProviderId,
    setCurrentMapProviderId,
    switchMapProviderFallback,
    isReportPinMode,
    setIsReportPinMode,
    reportPin,
    setReportPin,
    dropReportPinAt,
    userAddress,
    locationSource,
    locationAccuracy,
    lastLocationUpdate,
  } = useCity();

  const { showToast } = useToast();

  // Mode Switcher: Safety Map vs Normal Map
  const [mapDisplayMode, setMapDisplayMode] = useState<'SAFETY' | 'NORMAL'>('SAFETY');
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Selected item detail card & FlyTo target
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [isPoiDrawerOpen, setIsPoiDrawerOpen] = useState(false);
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [poiSearch, setPoiSearch] = useState('');
  const [poiCategoryFilter, setPoiCategoryFilter] = useState<string>('ALL');
  const [nearbyBannerDismissed, setNearbyBannerDismissed] = useState(false);

  // Search Radius filter (1km, 5km, 10km, 25km, or null for citywide)
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null);

  // Google Maps-Style Routing Engine State
  const [isRoutePlannerOpen, setIsRoutePlannerOpen] = useState(false);
  const [routeStartName, setRouteStartName] = useState('My Current Location');
  const [routeDestName, setRouteDestName] = useState('');
  const [routeStartCoords, setRouteStartCoords] = useState<[number, number] | null>(null);
  const [routeDestCoords, setRouteDestCoords] = useState<[number, number] | null>(null);
  const [routeTravelMode, setRouteTravelMode] = useState<'driving' | 'walking'>('driving');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeOptions, setRouteOptions] = useState<SafetyAwareRouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeRecommendationReason, setRouteRecommendationReason] = useState('');
  const [routeDisclaimer, setRouteDisclaimer] = useState('');

  // Community Incident Confirmation State
  const [confirmedIncidents, setConfirmedIncidents] = useState<Record<string, number>>({});
  const [userConfirmedIds, setUserConfirmedIds] = useState<Record<string, boolean>>({});

  // Active layers state (Multi-layer toggle)
  const [activeLayers, setActiveLayers] = useState<{
    hospitals: boolean;
    police: boolean;
    pharmacies: boolean;
    transport: boolean;
    attractions: boolean;
    hotels: boolean;
    restaurants: boolean;
    shopping: boolean;
    scams: boolean;
    incidents: boolean;
    safetyZones: boolean;
  }>({
    hospitals: true,
    police: true,
    pharmacies: true,
    transport: true,
    attractions: true,
    hotels: true,
    restaurants: true,
    shopping: true,
    scams: true,
    incidents: true,
    safetyZones: true,
  });

  const activeProvider = useMemo(() => {
    return mapProviderService.getProviderById(currentMapProviderId);
  }, [currentMapProviderId]);

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const setAllLayers = (enabled: boolean) => {
    setActiveLayers({
      hospitals: enabled,
      police: enabled,
      pharmacies: enabled,
      transport: enabled,
      attractions: enabled,
      hotels: enabled,
      restaurants: enabled,
      shopping: enabled,
      scams: enabled,
      incidents: enabled,
      safetyZones: enabled,
    });
  };

  // Automatic tile failure detection and fallback handler
  const handleTileError = useCallback(() => {
    const shouldSwitch = mapProviderService.recordTileError(currentMapProviderId);
    if (shouldSwitch) {
      const fallbackProviderName = switchMapProviderFallback();
      showToast(`Tile timeout detected. Switching to alternative map service: ${fallbackProviderName}`, 'info');
    }
  }, [currentMapProviderId, switchMapProviderFallback, showToast]);

  // Radius-filtered incidents
  const filteredIncidents = useMemo(() => {
    if (!searchRadiusKm) return incidents;
    const origin = userLocation || center;
    return incidents.filter((inc) => {
      const dist = locationService.computeDistanceKm(origin[0], origin[1], inc.lat, inc.lng);
      return dist <= searchRadiusKm;
    });
  }, [incidents, searchRadiusKm, userLocation, center]);

  // Radius-filtered scams
  const filteredScams = useMemo(() => {
    if (!searchRadiusKm) return scams;
    const origin = userLocation || center;
    return scams.filter((scam) => {
      const dist = locationService.computeDistanceKm(origin[0], origin[1], scam.lat, scam.lng);
      return dist <= searchRadiusKm;
    });
  }, [scams, searchRadiusKm, userLocation, center]);

  // Filter services by category according to active layers
  const visibleServices = useMemo(() => {
    return services.filter((s) => {
      if (s.category === 'HOSPITAL') return activeLayers.hospitals;
      if (s.category === 'POLICE') return activeLayers.police;
      if (s.category === 'PHARMACY') return activeLayers.pharmacies;
      if (s.category === 'TRANSPORT') return activeLayers.transport;
      if (s.category === 'TOURIST_INFO') return activeLayers.attractions;
      if (s.category === 'HOTEL') return activeLayers.hotels;
      if (s.category === 'RESTAURANT') return activeLayers.restaurants;
      if (s.category === 'SHOPPING') return activeLayers.shopping;
      return true;
    });
  }, [services, activeLayers]);

  // Calculate nearby incidents within 5 km of current origin
  const nearbyIncidents = useMemo(() => {
    const origin = userLocation || center;
    return incidents.filter((inc) => {
      const dist = locationService.computeDistanceKm(origin[0], origin[1], inc.lat, inc.lng);
      return dist <= 5.0;
    });
  }, [incidents, userLocation, center]);

  // Drawer filtered POIs
  const drawerPois = visibleServices.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(poiSearch.toLowerCase()) ||
      s.address.toLowerCase().includes(poiSearch.toLowerCase());
    const matchesCat =
      poiCategoryFilter === 'ALL' || s.category === poiCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleSelectPoi = (poi: any) => {
    setFlyTarget([poi.lat, poi.lng]);
    setSelectedItem(poi);
    setIsPoiDrawerOpen(false);
  };

  // Map Click Handler for Dropping Report Pin or Selecting Route Points
  const handleMapClick = async (lat: number, lng: number) => {
    if (isRoutePlannerOpen && !routeDestCoords) {
      setRouteDestCoords([lat, lng]);
      setRouteDestName(`Pin [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
      showToast(`Selected destination point at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'info');
      return;
    }

    await dropReportPinAt(lat, lng);
    showToast(`Report pin dropped at coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'info');
  };

  // Calculate Safer Route Alternatives (OSRM + YatraGuard Safety Scoring)
  const handleCalculateRoute = async () => {
    const origin = routeStartCoords || userLocation || center;
    let destination = routeDestCoords;

    if (!destination && routeDestName.trim()) {
      const matched = visibleServices.find(
        (s) =>
          s.name.toLowerCase().includes(routeDestName.toLowerCase()) ||
          s.address.toLowerCase().includes(routeDestName.toLowerCase())
      );
      if (matched) {
        destination = [matched.lat, matched.lng];
        setRouteDestCoords(destination);
      }
    }

    if (!destination) {
      // Pick first attraction or hospital in city as default destination if none selected
      const defaultDest = visibleServices[0];
      if (defaultDest) {
        destination = [defaultDest.lat, defaultDest.lng];
        setRouteDestCoords(destination);
        setRouteDestName(defaultDest.name);
      } else {
        showToast('Please enter or select a destination point on the map.', 'info');
        return;
      }
    }

    setRouteStartCoords(origin);
    setIsCalculatingRoute(true);
    try {
      const result = await roadRoutingService.planSaferRoutes({
        startCoords: origin,
        destCoords: destination,
        startName: routeStartName || 'Current Location',
        destName: routeDestName || 'Selected Destination',
        cityId: currentCity?.id,
        mode: routeTravelMode,
      });

      if (result.routes && result.routes.length > 0) {
        setRouteOptions(result.routes);
        setSelectedRouteIndex(0);
        setRouteRecommendationReason(result.recommendationReason);
        setRouteDisclaimer(result.disclaimer);
        showToast('Generated 3 Safety-Aware Route Alternatives!', 'success');
      } else {
        showToast('Unable to calculate road network routing for these coordinates.', 'error');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      showToast('Safety route calculation failed. Please check network connection.', 'error');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleClearRoute = () => {
    setRouteOptions([]);
    setRouteDestCoords(null);
    setRouteDestName('');
  };

  // Community Incident Confirmation Handler
  const handleConfirmIncident = async (incidentId: string) => {
    if (userConfirmedIds[incidentId]) {
      showToast('You have already verified and confirmed this incident.', 'info');
      return;
    }

    try {
      await confirmIncident(incidentId);
      setUserConfirmedIds((prev) => ({ ...prev, [incidentId]: true }));
      setConfirmedIncidents((prev) => ({
        ...prev,
        [incidentId]: (prev[incidentId] || 0) + 1,
      }));
      showToast('Thank you! Your confirmation strengthens community safety data.', 'success');
    } catch {
      setUserConfirmedIds((prev) => ({ ...prev, [incidentId]: true }));
      setConfirmedIncidents((prev) => ({
        ...prev,
        [incidentId]: (prev[incidentId] || 0) + 1,
      }));
      showToast('Thank you! Your confirmation strengthens community safety data.', 'success');
    }
  };

  return (
    <div
      className={`relative w-full overflow-hidden ${
        isReportPinMode ? 'cursor-crosshair' : ''
      }`}
      style={{ height }}
    >
      {/* Top Map Layer & Radius Controls */}
      <div className="absolute top-28 sm:top-28 left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[95%] sm:max-w-4xl bg-slate-950/90 p-2 rounded-2xl backdrop-blur-md border border-slate-800 shadow-2xl overflow-x-auto no-scrollbar">
        {/* Map Display Mode Switcher (Safety Map vs Normal Map) */}
        <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700/80 mr-1 flex-shrink-0">
          <button
            onClick={() => setMapDisplayMode('SAFETY')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all ${
              mapDisplayMode === 'SAFETY'
                ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Show crowdsourced safety zones, alerts, and incident hotspots"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Safety Map</span>
          </button>
          <button
            onClick={() => setMapDisplayMode('NORMAL')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all ${
              mapDisplayMode === 'NORMAL'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Clean standard road and point-of-interest navigation"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Normal Map</span>
          </button>
        </div>

        {/* Safety Legend Trigger */}
        <button
          onClick={() => setIsLegendOpen(true)}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 shadow-sm flex items-center gap-1 flex-shrink-0"
          title="Open Safety Risk Level Legend & Official Guidelines"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Legend</span>
        </button>

        {/* Route Planner Trigger Button */}
        <button
          onClick={() => setIsRoutePlannerOpen(!isRoutePlannerOpen)}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 flex-shrink-0 transition-all ${
            isRoutePlannerOpen || routeOptions.length > 0
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/40'
          }`}
          title="Plan Google Maps-style safer routes with safety scores"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{routeOptions.length > 0 ? '3 Routes Active' : 'Route Planner'}</span>
        </button>

        {/* Layer Toggle: All */}
        <button
          onClick={() => setAllLayers(true)}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 flex-shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>All ({visibleServices.length + filteredIncidents.length + filteredScams.length})</span>
        </button>

        {/* Layer Toggles (Visible in Safety Map Mode) */}
        {mapDisplayMode === 'SAFETY' && (
          <>
            {[
              { key: 'incidents' as const, label: 'Incidents (Red/Orange)', color: 'bg-red-600', icon: '🚨' },
              { key: 'scams' as const, label: 'Scam Warnings (Yellow)', color: 'bg-amber-500', icon: '⚠️' },
              { key: 'safetyZones' as const, label: 'Safety Zones', color: 'bg-emerald-600', icon: '🛡️' },
            ].map((layer) => {
              const isActive = activeLayers[layer.key];
              return (
                <button
                  key={layer.key}
                  onClick={() => toggleLayer(layer.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 ${
                    isActive
                      ? `${layer.color} text-white shadow-md font-black`
                      : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{layer.icon}</span>
                  <span>{layer.label}</span>
                </button>
              );
            })}
          </>
        )}

        {/* POI Service Layer Toggles */}
        {[
          { key: 'police' as const, label: 'Police', color: 'bg-emerald-600', icon: '👮' },
          { key: 'hospitals' as const, label: 'Hospitals', color: 'bg-emerald-600', icon: '🏥' },
          { key: 'pharmacies' as const, label: 'Pharmacies', color: 'bg-emerald-600', icon: '💊' },
          { key: 'attractions' as const, label: 'Attractions', color: 'bg-blue-600', icon: '🏛️' },
          { key: 'transport' as const, label: 'Transit', color: 'bg-cyan-600', icon: '🚇' },
          { key: 'shopping' as const, label: 'Shopping', color: 'bg-amber-600', icon: '🛍️' },
        ].map((layer) => {
          const isActive = activeLayers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 ${
                isActive
                  ? `${layer.color} text-white shadow-md font-black`
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{layer.icon}</span>
              <span>{layer.label}</span>
            </button>
          );
        })}

        {/* Radius Filter Pills */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-800 flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
            <SlidersHorizontal className="w-3 h-3 text-amber-400" /> Radius:
          </span>
          {[
            { label: 'All', val: null },
            { label: '1km', val: 1 },
            { label: '5km', val: 5 },
            { label: '10km', val: 10 },
            { label: '25km', val: 25 },
          ].map((r) => (
            <button
              key={r.label}
              onClick={() => setSearchRadiusKm(r.val)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                searchRadiusKm === r.val
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Active Report Mode Banner */}
      {isReportPinMode && (
        <div className="absolute top-44 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 bg-red-600/95 text-white rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 flex items-center gap-3 animate-bounce">
          <MapPin className="w-4 h-4 text-white animate-pulse" />
          <span className="text-xs font-black">
            Click anywhere on the map or drag the pin to set incident location
          </span>
          <button
            onClick={() => setIsReportPinMode(false)}
            className="px-2 py-0.5 rounded-lg bg-black/40 hover:bg-black/60 text-[10px] font-bold text-white uppercase ml-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Floating Active Report Pin Card (When Pin is Placed) */}
      {reportPin && (
        <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md p-3.5 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-red-500/80 shadow-2xl animate-fade-in text-white space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-600/30 text-red-400">
                <MapPin className="w-4 h-4 text-red-400" />
              </span>
              <div>
                <h4 className="text-xs font-black text-white">Report Incident at Selected Pin</h4>
                <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                  {reportPin.address || 'Resolving readable address...'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReportPin(null)}
              className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            <span>Lat: {reportPin.lat.toFixed(5)}</span>
            <span>Lng: {reportPin.lng.toFixed(5)}</span>
            <span className="text-amber-400 font-sans font-bold">Drag pin to reposition</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                if (onOpenIncidentModalWithPin) {
                  onOpenIncidentModalWithPin(reportPin);
                }
              }}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Fill Report Details for this Pin</span>
            </button>
            <button
              type="button"
              onClick={() => setReportPin(null)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Clear Pin
            </button>
          </div>
        </div>
      )}

      {/* Floating Nearby Scam Notice Alert Card */}
      {!nearbyBannerDismissed && nearbyIncidents.length > 0 && mapDisplayMode === 'SAFETY' && (
        <div className="absolute top-44 left-4 z-20 max-w-sm sm:max-w-md p-3.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-amber-500/60 shadow-2xl animate-fade-in flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-slate-950" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white">Local Safety Advisory</span>
              <button
                onClick={() => setNearbyBannerDismissed(true)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-300 mt-1 leading-relaxed">
              <strong>Notice:</strong> {nearbyIncidents.length} reported incident
              {nearbyIncidents.length > 1 ? 's have' : ' has'} been recorded near this sector (within 5 km).
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 font-bold border border-slate-800">
                Latest: {new Date(nearbyIncidents[0].reportedAt).toLocaleDateString()} ({nearbyIncidents[0].status})
              </span>
              {onNavigateToFeed && (
                <button
                  onClick={onNavigateToFeed}
                  className="text-[10px] text-amber-400 font-bold hover:underline"
                >
                  View Feed →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Maps-Style Routing Engine Panel */}
      {isRoutePlannerOpen && (
        <div className="absolute top-44 left-4 z-30 w-[94%] max-w-md bg-slate-950/95 border border-blue-500/60 rounded-3xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 space-y-3 text-white max-h-[75dvh] overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">Safer Road Routing Engine</h4>
                <p className="text-[10px] text-slate-400">3 Road Alternatives with Safety Scores</p>
              </div>
            </div>
            <button
              onClick={() => setIsRoutePlannerOpen(false)}
              className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher (Driving / Walking) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              onClick={() => setRouteTravelMode('driving')}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                routeTravelMode === 'driving'
                  ? 'bg-blue-600 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Driving Mode</span>
            </button>
            <button
              onClick={() => setRouteTravelMode('walking')}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                routeTravelMode === 'walking'
                  ? 'bg-blue-600 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>Walking Mode</span>
            </button>
          </div>

          {/* Origin & Destination Inputs */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Starting Point (e.g. Current Location)"
                value={routeStartName}
                onChange={(e) => setRouteStartName(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Destination (or click map / pick attraction)"
                value={routeDestName}
                onChange={(e) => setRouteDestName(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {routeDestCoords && (
                <button onClick={handleClearRoute} title="Clear destination">
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Destination Suggestions */}
          {visibleServices.length > 0 && !routeDestCoords && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">
                Quick Dest:
              </span>
              {visibleServices.slice(0, 4).map((poi) => (
                <button
                  key={poi.id}
                  onClick={() => {
                    setRouteDestName(poi.name);
                    setRouteDestCoords([poi.lat, poi.lng]);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 font-semibold border border-slate-800 whitespace-nowrap"
                >
                  {poi.name}
                </button>
              ))}
            </div>
          )}

          {/* Calculate Button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCalculateRoute}
              disabled={isCalculatingRoute}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-900/40 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {isCalculatingRoute ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Road Safety...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Calculate 3 Safer Routes</span>
                </>
              )}
            </button>
            {routeOptions.length > 0 && (
              <button
                onClick={handleClearRoute}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          {/* 3 Route Alternative Cards */}
          {routeOptions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Select Route Alternative:
              </div>
              <div className="space-y-2">
                {routeOptions.map((opt, idx) => {
                  const isSelected = selectedRouteIndex === idx;
                  const isSafest = opt.id === 'safest';
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedRouteIndex(idx)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-blue-400 ring-2 ring-blue-500/30 shadow-md'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                          <span className="text-xs font-extrabold text-white">
                            {opt.title}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isSafest
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white">{opt.durationLabel}</span>
                          <span className="text-slate-400 text-[11px]">({opt.distanceLabel})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-black text-emerald-400">
                            Score: {opt.riskScore}/100
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {opt.description}
                      </p>

                      {isSelected && opt.highlights && opt.highlights.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] space-y-1">
                          {opt.highlights.map((h, i) => (
                            <div key={i} className="text-emerald-300 flex items-center gap-1">
                              <span>✓</span> <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {routeRecommendationReason && (
                <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-200">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Recommendation Analysis:
                  </div>
                  <p className="mt-0.5 text-slate-300">{routeRecommendationReason}</p>
                </div>
              )}

              {routeDisclaimer && (
                <p className="text-[9px] text-slate-500 leading-tight">
                  ℹ️ {routeDisclaimer}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Safety Risk Legend Popover / Modal */}
      {isLegendOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Safety Map Color Legend</h3>
                  <p className="text-[11px] text-slate-400">Context-Aware Risk Assessment Standards</p>
                </div>
              </div>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-emerald-400 text-sm">
                    🟢 Green — Lower Risk / Safe Corridor (Score 80–100)
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Arterial thoroughfares with high illumination, active CCTV monitoring, verified police patrols, and close proximity to 24/7 medical & transit facilities.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-amber-300 text-sm">
                    🟡 Yellow — Caution / Commercial Congestion (Score 60–79)
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    High-density bazaar zones, transit junctions, or persistent tout & aggressive overcharging hotspots. Keep personal belongings secure.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-4 h-4 rounded-full bg-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-orange-400 text-sm">
                    🟠 Orange — Elevated Risk / Pending Review (Score 40–59)
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Reports awaiting secondary community verification or isolated stretches with sparse night lighting. Travel in groups advised.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-4 h-4 rounded-full bg-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-red-400 text-sm">
                    🔴 Red — High Concern / Active Advisory (Score 0–39)
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Verified safety incidents, past harassment clusters, or official hazard notices. Avoid unescorted night travel through these sectors.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="w-4 h-4 rounded-full bg-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-slate-300 text-sm">
                    ⚪ Grey — Insufficient Data
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    Emerging rural or outskirts sectors with limited crowdsourced telemetry. Standard traveler vigilance applies.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Mandatory Safety Disclaimer:</strong> Safety indicators represent aggregated community reports and historical patterns. They do not constitute official safety guarantees or law enforcement directives. Always use personal judgment and call 112 in emergencies.
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsLegendOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Provider Selector & Resilient Fallback Switcher (Bottom Right) */}
      <div className="absolute bottom-6 right-20 sm:right-32 z-20 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setIsProviderSelectorOpen(!isProviderSelectorOpen)}
            className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-[11px] font-bold text-slate-200 border border-slate-800 shadow-xl flex items-center gap-1.5 backdrop-blur-md transition-colors"
            title="Switch map rendering provider or toggle fallbacks"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Provider:</span>
            <span className="text-amber-400 font-black">{activeProvider.name.split(' ')[0]}</span>
          </button>

          {isProviderSelectorOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl p-2 z-40 backdrop-blur-xl animate-fade-in space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 flex items-center justify-between">
                <span>Select Map Provider</span>
                <span className="text-emerald-400">Auto-Fallback ON</span>
              </div>
              {mapProviderService.getAllProviders().map((p: MapProvider) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentMapProviderId(p.id);
                    setIsProviderSelectorOpen(false);
                    showToast(`Switched map provider to ${p.name}`, 'info');
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    currentMapProviderId === p.id
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div>{p.name}</div>
                    <div className="text-[10px] opacity-75">{p.description}</div>
                  </div>
                  {currentMapProviderId === p.id && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Left POI Directory Drawer Trigger */}
      <button
        onClick={() => setIsPoiDrawerOpen(true)}
        className="absolute bottom-6 left-6 z-20 px-4 py-2.5 rounded-2xl bg-slate-900/95 hover:bg-slate-800 text-white font-extrabold text-xs shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-2 transition-transform active:scale-95"
      >
        <List className="w-4 h-4 text-amber-400" />
        <span>Browse City Directory ({visibleServices.length} POIs)</span>
      </button>

      {/* Floating GPS Locate Button */}
      {onLocateMe && (
        <button
          onClick={onLocateMe}
          className="absolute bottom-6 right-6 z-20 p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-2xl border border-blue-400/40 transition-transform active:scale-90 flex items-center gap-2 text-xs font-bold"
          title="Locate my GPS position"
        >
          <Crosshair className="w-5 h-5 animate-pulse" />
          <span className="hidden sm:inline">Locate Me</span>
        </button>
      )}

      {/* Leaflet Map Engine */}
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <ChangeMapView coords={center} />
        <FlyToController target={flyTarget} />
        <MapClickEvents onMapClick={handleMapClick} isReportMode={isReportPinMode} />

        {/* Dynamic Provider Tile Layer with Key-Remount and TileError Fallback */}
        <TileLayer
          key={activeProvider.id}
          url={activeProvider.url}
          attribution={activeProvider.attribution}
          subdomains={activeProvider.subdomains || 'abc'}
          maxZoom={activeProvider.maxZoom || 19}
          eventHandlers={{
            tileerror: handleTileError,
          }}
        />

        {/* User GPS Location Beacon */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-xs p-1 space-y-1">
                <strong className="text-blue-600 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> You are here
                </strong>
                <div className="text-slate-700 text-[11px] font-medium">{userAddress}</div>
                {locationAccuracy && (
                  <div className="text-slate-500 text-[10px]">Accuracy: ±{Math.round(locationAccuracy)}m</div>
                )}
                {lastLocationUpdate && (
                  <div className="text-slate-400 text-[9px]">
                    Updated: {lastLocationUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Radius Perimeter Range Circle around User */}
        {searchRadiusKm && userLocation && (
          <Circle
            center={userLocation}
            radius={searchRadiusKm * 1000}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: '5, 8',
            }}
          />
        )}

        {/* Interactive Report Pin (When User Clicked or Dropped Pin) */}
        {reportPin && (
          <Marker
            position={[reportPin.lat, reportPin.lng]}
            icon={reportDraggableIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                dropReportPinAt(position.lat, position.lng);
              },
            }}
          >
            <Popup>
              <div className="p-1 space-y-1.5 text-xs text-slate-900">
                <div className="font-extrabold text-red-600 flex items-center gap-1">
                  <span>📍 Incident Report Pin</span>
                </div>
                <div className="text-[11px] text-slate-700 font-medium">
                  {reportPin.address || `${reportPin.lat.toFixed(4)}, ${reportPin.lng.toFixed(4)}`}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Coordinates: {reportPin.lat.toFixed(5)}, {reportPin.lng.toFixed(5)}
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <button
                    onClick={() => {
                      if (onOpenIncidentModalWithPin) {
                        onOpenIncidentModalWithPin(reportPin);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-[11px] transition-colors"
                  >
                    Submit Report Here
                  </button>
                  <button
                    onClick={() => setReportPin(null)}
                    className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Safety Zones & Heatmap Rings (Rendered in Safety Map Mode) */}
        {mapDisplayMode === 'SAFETY' &&
          activeLayers.safetyZones &&
          safetyZones.map((zone) => {
            const isGood = zone.riskTier === 'VERY_GOOD' || zone.riskTier === 'GOOD';
            const isModerate = zone.riskTier === 'ACCEPTABLE' || zone.riskTier === 'MODERATE';
            const color = isGood ? '#10B981' : isModerate ? '#F59E0B' : '#EF4444';

            return (
              <Circle
                key={zone.id}
                center={[zone.lat, zone.lng]}
                radius={zone.radiusKm * 1000}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isGood ? 0.12 : 0.18,
                  weight: 2,
                  dashArray: isGood ? undefined : '5, 8',
                }}
              >
                <Popup>
                  <div className="p-1 text-xs">
                    <div className="font-extrabold text-slate-800">🛡️ {zone.name}</div>
                    <div className="text-[11px] text-slate-600 font-bold mt-0.5">
                      Risk Tier: <span style={{ color }}>{zone.riskTier}</span> (Score: {zone.score}/100)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{zone.reason}</div>
                    {zone.timeHazard && (
                      <div className="text-[10px] text-amber-700 font-bold mt-1 bg-amber-50 p-1 rounded">
                        ⚠️ {zone.timeHazard}
                      </div>
                    )}
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* Location Services Markers */}
        {visibleServices.map((service) => {
          let icon = essentialHospitalIcon;
          if (service.category === 'POLICE') icon = essentialPoliceIcon;
          if (service.category === 'PHARMACY') icon = pharmacyIcon;
          if (service.category === 'TRANSPORT') icon = transportIcon;
          if (service.category === 'TOURIST_INFO') icon = touristAttractionIcon;
          if (service.category === 'HOTEL') icon = hotelIcon;
          if (service.category === 'RESTAURANT') icon = restaurantIcon;
          if (service.category === 'SHOPPING') icon = shoppingIcon;

          const dist = userLocation
            ? locationService.computeDistanceKm(userLocation[0], userLocation[1], service.lat, service.lng)
            : null;

          return (
            <Marker
              key={service.id}
              position={[service.lat, service.lng]}
              icon={icon}
              eventHandlers={{
                click: () => setSelectedItem(service),
              }}
            >
              <Popup>
                <div className="text-xs p-1 font-bold text-slate-900">
                  <div className="text-sm font-black">{service.name}</div>
                  <div className="text-[11px] text-slate-600 font-semibold">{service.category}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{service.address}</div>
                  {dist !== null && (
                    <div className="text-[10px] text-blue-600 font-bold mt-1">
                      📍 {dist} km from current location
                    </div>
                  )}
                  {service.openStatus && (
                    <div className="text-[10px] text-emerald-700 font-bold mt-1">
                      {service.openStatus}
                    </div>
                  )}
                  <div className="pt-1.5 flex items-center gap-1">
                    <button
                      onClick={() => {
                        setRouteDestName(service.name);
                        setRouteDestCoords([service.lat, service.lng]);
                        setIsRoutePlannerOpen(true);
                        showToast(`Set ${service.name} as route destination`, 'info');
                      }}
                      className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                      <span>Route Here</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Scam Alerts Markers (Yellow: Community Warnings) */}
        {mapDisplayMode === 'SAFETY' &&
          activeLayers.scams &&
          filteredScams.map((scam) => {
            const dist = userLocation
              ? locationService.computeDistanceKm(userLocation[0], userLocation[1], scam.lat, scam.lng)
              : null;

            return (
              <Marker
                key={scam.id}
                position={[scam.lat, scam.lng]}
                icon={scamWarningIcon}
                eventHandlers={{
                  click: () =>
                    setSelectedItem({
                      ...scam,
                      category: 'SCAM_WARNING',
                      name: scam.title,
                    }),
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-black">
                      ⚠️ Community Warning
                    </span>
                    <div className="font-extrabold text-sm text-slate-900 mt-1">{scam.title}</div>
                    <p className="text-[11px] text-slate-600">{scam.description}</p>
                    {dist !== null && (
                      <div className="text-[10px] text-amber-800 font-bold">
                        📍 {dist} km from you
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Incident Hotspots Markers with Community Verification Workflow */}
        {mapDisplayMode === 'SAFETY' &&
          activeLayers.incidents &&
          filteredIncidents.map((incident) => {
            const isVerified = incident.status === 'VERIFIED' || incident.status === 'ADMIN_VERIFIED';
            const isUnderReview = incident.status === 'UNDER_REVIEW';
            const icon = isVerified ? verifiedIncidentIcon : pendingIncidentIcon;
            const dist = userLocation
              ? locationService.computeDistanceKm(userLocation[0], userLocation[1], incident.lat, incident.lng)
              : null;

            const totalConfirmations =
              (incident.confirmations || 0) + (confirmedIncidents[incident.id] || 0);

            return (
              <Marker
                key={incident.id}
                position={[incident.lat, incident.lng]}
                icon={icon}
                eventHandlers={{
                  click: () =>
                    setSelectedItem({
                      ...incident,
                      category: isVerified ? 'VERIFIED_INCIDENT' : 'PENDING_INCIDENT',
                      name: incident.title,
                    }),
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1.5 text-slate-900 max-w-xs">
                    {/* Verification Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isVerified ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Moderator Verified</span>
                        </span>
                      ) : isUnderReview ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-extrabold border border-orange-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-600" />
                          <span>Under Review</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold border border-amber-300 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-amber-600" />
                          <span>Community Submitted</span>
                        </span>
                      )}

                      {totalConfirmations > 0 && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {totalConfirmations} confirmation{totalConfirmations > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="font-extrabold text-sm text-slate-900">{incident.title}</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{incident.description}</p>

                    {dist !== null && (
                      <div className="text-[10px] text-red-700 font-bold">
                        📍 {dist} km from you
                      </div>
                    )}
                    {incident.amountDemanded && (
                      <div className="text-[10px] text-red-600 font-bold">
                        Demanded: ₹{incident.amountDemanded}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 pt-0.5">
                      Reported: {new Date(incident.reportedAt).toLocaleDateString()}
                    </div>

                    {/* Community Confirmation Button */}
                    <div className="pt-1 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmIncident(incident.id);
                        }}
                        disabled={userConfirmedIds[incident.id]}
                        className={`w-full py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all ${
                          userConfirmedIds[incident.id]
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-sm active:scale-95'
                        }`}
                      >
                        {userConfirmedIds[incident.id] ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Confirmed by you</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Confirm Incident (I saw this too)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Google Maps-Style Routing Polylines & Waypoint Markers */}
        {routeOptions.length > 0 && (
          <>
            <RouteBoundsController
              coordinates={routeOptions[selectedRouteIndex]?.coordinates || null}
            />

            {/* Inactive routes rendered first as background polylines */}
            {routeOptions.map((opt, idx) => {
              if (idx === selectedRouteIndex) return null;
              return (
                <Polyline
                  key={opt.id}
                  positions={opt.coordinates}
                  pathOptions={{
                    color: '#64748B',
                    weight: 4,
                    opacity: 0.45,
                    dashArray: '6, 8',
                  }}
                  eventHandlers={{
                    click: () => setSelectedRouteIndex(idx),
                  }}
                />
              );
            })}

            {/* Selected active route highlighted prominently */}
            {routeOptions[selectedRouteIndex] && (
              <Polyline
                key={`active-${routeOptions[selectedRouteIndex].id}`}
                positions={routeOptions[selectedRouteIndex].coordinates}
                pathOptions={{
                  color: routeOptions[selectedRouteIndex].color,
                  weight: 6,
                  opacity: 0.9,
                }}
              />
            )}

            {/* Origin A Marker */}
            {routeStartCoords && (
              <Marker position={routeStartCoords} icon={routeStartIcon}>
                <Popup>
                  <div className="text-xs font-bold text-slate-900 p-1">
                    <span className="text-blue-600 font-extrabold">Route Origin (A):</span>
                    <div>{routeStartName || 'Current Location'}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination B Marker */}
            {routeDestCoords && (
              <Marker position={routeDestCoords} icon={routeDestIcon}>
                <Popup>
                  <div className="text-xs font-bold text-slate-900 p-1">
                    <span className="text-red-600 font-extrabold">Route Destination (B):</span>
                    <div>{routeDestName || 'Selected Destination'}</div>
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}
      </MapContainer>

      {/* POI Directory Slide-Over Drawer */}
      {isPoiDrawerOpen && (
        <div className="fixed inset-y-0 left-0 z-[150] w-full max-w-md bg-slate-950/95 backdrop-blur-xl border-r border-slate-800 shadow-2xl flex flex-col animate-slide-right">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Verified Location Directory</h3>
                <p className="text-[11px] text-slate-400">
                  {visibleServices.length} safety & service points in current city
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsPoiDrawerOpen(false)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search POI by name or street..."
                value={poiSearch}
                onChange={(e) => setPoiSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {poiSearch && (
                <button onClick={() => setPoiSearch('')}>
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'HOSPITAL', label: '🏥 Hospitals' },
                { id: 'POLICE', label: '👮 Police' },
                { id: 'PHARMACY', label: '💊 Pharmacy' },
                { id: 'TRANSPORT', label: '🚇 Transit' },
                { id: 'TOURIST_INFO', label: '🏛️ Attractions' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPoiCategoryFilter(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    poiCategoryFilter === c.id
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* POI List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {drawerPois.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No verified location points match your filter.
              </div>
            ) : (
              drawerPois.map((poi) => (
                <div
                  key={poi.id}
                  onClick={() => handleSelectPoi(poi)}
                  className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-black text-white group-hover:text-amber-400 transition-colors">
                      {poi.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{poi.address}</div>
                    <div className="flex items-center gap-2 pt-1 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                        {poi.category}
                      </span>
                      {poi.rating && (
                        <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" /> {poi.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRouteDestName(poi.name);
                        setRouteDestCoords([poi.lat, poi.lng]);
                        setIsPoiDrawerOpen(false);
                        setIsRoutePlannerOpen(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[10px] font-bold border border-blue-500/40"
                    >
                      Route
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected Item Floating Detail Card */}
      {selectedItem && (
        <MapCard
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onCheckFare={onCheckFare}
        />
      )}
    </div>
  );
};
