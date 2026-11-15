import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
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
} from 'lucide-react';
import { MapCard } from './MapCard';
import { useCity, ReportPinData } from '../../context/CityContext';
import { useToast } from '../../context/ToastContext';
import { mapProviderService, MapProvider } from '../../services/mapProviderService';
import { locationService } from '../../services/locationService';

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

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [isPoiDrawerOpen, setIsPoiDrawerOpen] = useState(false);
  const [isProviderSelectorOpen, setIsProviderSelectorOpen] = useState(false);
  const [poiSearch, setPoiSearch] = useState('');
  const [poiCategoryFilter, setPoiCategoryFilter] = useState<string>('ALL');
  const [nearbyBannerDismissed, setNearbyBannerDismissed] = useState(false);

  // Search Radius filter (1km, 5km, 10km, 25km, or null for citywide)
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null);

  // Active layers state (Multi-layer toggle)
  const [activeLayers, setActiveLayers] = useState<{
    hospitals: boolean;
    police: boolean;
    pharmacies: boolean;
    transport: boolean;
    attractions: boolean;
    hotels: boolean;
    restaurants: boolean;
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

  // Map Click Handler for Dropping Report Pin
  const handleMapClick = async (lat: number, lng: number) => {
    // If in report mode or user clicks map when report pin is open, move or drop pin
    await dropReportPinAt(lat, lng);
    showToast(`Report pin dropped at coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}]`, 'info');
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
        {/* Layer Toggle: All */}
        <button
          onClick={() => setAllLayers(true)}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 flex-shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>All ({visibleServices.length + filteredIncidents.length + filteredScams.length})</span>
        </button>

        {[
          { key: 'incidents' as const, label: 'Incidents (Red/Orange)', color: 'bg-red-600', icon: '🚨' },
          { key: 'scams' as const, label: 'Scam Warnings (Yellow)', color: 'bg-amber-500', icon: '⚠️' },
          { key: 'police' as const, label: 'Police (Green)', color: 'bg-emerald-600', icon: '👮' },
          { key: 'hospitals' as const, label: 'Hospitals (Green)', color: 'bg-emerald-600', icon: '🏥' },
          { key: 'attractions' as const, label: 'Attractions (Blue)', color: 'bg-blue-600', icon: '🏛️' },
          { key: 'transport' as const, label: 'Transit', color: 'bg-cyan-600', icon: '🚇' },
          { key: 'hotels' as const, label: 'Stays', color: 'bg-purple-600', icon: '🏨' },
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
      {!nearbyBannerDismissed && nearbyIncidents.length > 0 && (
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

        {/* Safety Zones & Heatmap Rings */}
        {activeLayers.safetyZones &&
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
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Scam Alerts Markers (Yellow: Community Warnings) */}
        {activeLayers.scams &&
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

        {/* Incident Hotspots Markers (Red: Verified High Priority, Orange: Pending/Under Review) */}
        {activeLayers.incidents &&
          filteredIncidents.map((incident) => {
            const isVerified = incident.status === 'VERIFIED';
            const icon = isVerified ? verifiedIncidentIcon : pendingIncidentIcon;
            const dist = userLocation
              ? locationService.computeDistanceKm(userLocation[0], userLocation[1], incident.lat, incident.lng)
              : null;

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
                  <div className="text-xs p-1 space-y-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-black ${
                        isVerified
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {isVerified ? '🚨 Verified Safety Incident' : '⏳ Awaiting Verification'}
                    </span>
                    <div className="font-extrabold text-sm text-slate-900">{incident.title}</div>
                    <p className="text-[11px] text-slate-600">{incident.description}</p>
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
                    <div className="text-[10px] text-slate-500 pt-1">
                      Reported: {new Date(incident.reportedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
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
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
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
