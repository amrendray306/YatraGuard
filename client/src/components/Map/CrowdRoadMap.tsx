import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  Globe,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  SlidersHorizontal,
  ShieldCheck,
  Users,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { useCity } from '../../context/CityContext';
import { useToast } from '../../context/ToastContext';
import { mapProviderService, MapProvider } from '../../services/mapProviderService';
import { locationService } from '../../services/locationService';
import { RoadCrowdReport, CrowdLevel, TravelRiskAlert } from '../../types';

export type CrowdRoadMapMode = 'CROWD' | 'ROAD';

interface CrowdRoadMapProps {
  mode: CrowdRoadMapMode;
  center: { lat: number; lng: number };
  centerLabel?: string;
  reports: RoadCrowdReport[];
  crowdLevels?: CrowdLevel[];
  riskAdvisories?: TravelRiskAlert[];
  focusedItem?: { lat: number; lng: number; label: string; nonce: number } | null;
  pickPinMode?: boolean;
  onMapPickLocation?: (lat: number, lng: number) => void;
  onRequestGps?: () => void;
  gpsLoading?: boolean;
  isPrivileged?: boolean;
  currentUserId?: string;
  onVerifyReport?: (id: string, action: 'APPROVE' | 'REJECT') => void;
  onDeleteReport?: (id: string) => void;
}

const createPinIcon = (bgColor: string, glyph: string, ringColor = '#ffffff') =>
  L.divIcon({
    className: 'yg-crowd-road-pin',
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
        box-shadow: 0 4px 10px rgba(0,0,0,0.45);
        border: 2px solid ${ringColor};
      ">
        <span style="transform: rotate(45deg); font-size: 13px; line-height: 1;">${glyph}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });

const selectedLocationIcon = L.divIcon({
  className: 'yg-selected-loc-pin',
  html: `
    <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(37, 99, 235, 0.32);"></span>
      <span style="width: 14px; height: 14px; border-radius: 9999px; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.45);"></span>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapViewportSync({
  center,
  zoom,
  focusedItem,
}: {
  center: { lat: number; lng: number };
  zoom: number;
  focusedItem?: { lat: number; lng: number; label: string; nonce: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom, map]);

  useEffect(() => {
    if (focusedItem) {
      map.flyTo([focusedItem.lat, focusedItem.lng], 15, { duration: 0.9 });
    }
  }, [focusedItem?.nonce, focusedItem?.lat, focusedItem?.lng, map]);

  return null;
}

function MapZoomBridge({ zoomRef }: { zoomRef: React.MutableRefObject<{ in: () => void; out: () => void; reset: () => void } | null> }) {
  const map = useMap();
  useEffect(() => {
    zoomRef.current = {
      in: () => map.zoomIn(),
      out: () => map.zoomOut(),
      reset: () => map.setZoom(13),
    };
  }, [map, zoomRef]);
  return null;
}

function MapClickListener({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const CrowdRoadMap: React.FC<CrowdRoadMapProps> = ({
  mode,
  center,
  centerLabel = 'Selected Location',
  reports,
  crowdLevels = [],
  riskAdvisories = [],
  focusedItem,
  pickPinMode = false,
  onMapPickLocation,
  onRequestGps,
  gpsLoading = false,
  isPrivileged = false,
  currentUserId,
  onVerifyReport,
  onDeleteReport,
}) => {
  const { currentMapProviderId, setCurrentMapProviderId, switchMapProviderFallback } = useCity();
  const { showToast } = useToast();

  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Module-specific independent map filter state
  const [crowdFilter, setCrowdFilter] = useState<string>('ALL');
  const [roadCategoryFilter, setRoadCategoryFilter] = useState<string>('ALL');
  const [roadDifficultyFilter, setRoadDifficultyFilter] = useState<string>('ALL');

  const zoomBridgeRef = React.useRef<{ in: () => void; out: () => void; reset: () => void } | null>(null);
  const activeProvider = mapProviderService.getProviderById(currentMapProviderId);

  const withinRadius = (lat?: number | null, lng?: number | null) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    if (!radiusKm) return true;
    return locationService.computeDistanceKm(center.lat, center.lng, lat, lng) <= radiusKm;
  };

  // Filtered markers for CROWD module
  const filteredCrowdBaselines = useMemo(() => {
    if (mode !== 'CROWD') return [];
    if (crowdFilter === 'USER_REPORTS') return [];
    return crowdLevels.filter((cl) => {
      if (!withinRadius(cl.lat, cl.lng)) return false;
      if (crowdFilter !== 'ALL' && cl.currentLevel !== crowdFilter) return false;
      return true;
    });
  }, [mode, crowdLevels, crowdFilter, radiusKm, center.lat, center.lng]);

  const filteredCrowdReports = useMemo(() => {
    if (mode !== 'CROWD') return [];
    if (crowdFilter !== 'ALL' && crowdFilter !== 'USER_REPORTS') return [];
    return reports.filter((r) => {
      if (r.category !== 'CROWD') return false;
      if (verifiedOnly && r.status !== 'VERIFIED') return false;
      return withinRadius(r.lat, r.lng);
    });
  }, [mode, reports, crowdFilter, verifiedOnly, radiusKm, center.lat, center.lng]);

  const filteredCrowdAdvisories = useMemo(() => {
    if (mode !== 'CROWD') return [];
    if (crowdFilter !== 'ALL' && crowdFilter !== 'VERY_HIGH' && crowdFilter !== 'USER_REPORTS') return [];
    return riskAdvisories.filter((a) => {
      if (a.category !== 'OVERCROWDING') return false;
      if (verifiedOnly && a.verificationStatus !== 'VERIFIED') return false;
      return withinRadius(a.lat, a.lng);
    });
  }, [mode, riskAdvisories, crowdFilter, verifiedOnly, radiusKm, center.lat, center.lng]);

  // Filtered markers for ROAD module
  const filteredRoadReports = useMemo(() => {
    if (mode !== 'ROAD') return [];
    return reports.filter((r) => {
      if (r.category === 'CROWD') return false;
      if (roadCategoryFilter !== 'ALL' && r.category !== roadCategoryFilter) return false;
      if (roadDifficultyFilter !== 'ALL' && r.difficulty !== roadDifficultyFilter) return false;
      if (verifiedOnly && r.status !== 'VERIFIED') return false;
      return withinRadius(r.lat, r.lng);
    });
  }, [mode, reports, roadCategoryFilter, roadDifficultyFilter, verifiedOnly, radiusKm, center.lat, center.lng]);

  const filteredRoadAdvisories = useMemo(() => {
    if (mode !== 'ROAD') return [];
    if (roadDifficultyFilter === 'EASY') return [];
    return riskAdvisories.filter((a) => {
      if (a.category === 'OVERCROWDING') return false;
      if (roadCategoryFilter !== 'ALL') {
        if (roadCategoryFilter === 'ROAD_CLOSURE' && !['ROAD_CLOSURE', 'LANDSLIDE', 'FLOOD'].includes(a.category)) {
          return false;
        }
        if (roadCategoryFilter === 'ACCIDENT' && a.category !== 'ACCIDENT') return false;
        if (['TRAFFIC', 'CONSTRUCTION', 'ROAD_CONDITION'].includes(roadCategoryFilter)) return false;
      }
      if (verifiedOnly && a.verificationStatus !== 'VERIFIED') return false;
      return withinRadius(a.lat, a.lng);
    });
  }, [mode, riskAdvisories, roadCategoryFilter, roadDifficultyFilter, verifiedOnly, radiusKm, center.lat, center.lng]);

  const visibleMarkerCount =
    mode === 'CROWD'
      ? filteredCrowdBaselines.length + filteredCrowdReports.length + filteredCrowdAdvisories.length
      : filteredRoadReports.length + filteredRoadAdvisories.length;

  const getCrowdColor = (level: string) => {
    if (level === 'VERY_HIGH') return { color: '#dc2626', glyph: '🔥' };
    if (level === 'HIGH') return { color: '#ea580c', glyph: '👥' };
    if (level === 'MEDIUM') return { color: '#d97706', glyph: '🕒' };
    return { color: '#10b981', glyph: '✨' };
  };

  const getRoadPinStyle = (category: string, difficulty?: string) => {
    if (category === 'ROAD_CLOSURE' || category === 'LANDSLIDE' || category === 'FLOOD' || difficulty === 'BLOCKED') {
      return { color: '#dc2626', glyph: '⛔' };
    }
    if (category === 'ACCIDENT') return { color: '#e11d48', glyph: '🚨' };
    if (category === 'TRAFFIC') return { color: '#f59e0b', glyph: '🚗' };
    if (category === 'CONSTRUCTION') return { color: '#eab308', glyph: '🚧' };
    return { color: '#0ea5e9', glyph: '🛣️' };
  };

  const handleTileError = () => {
    if (mapProviderService.recordTileError(currentMapProviderId)) {
      const nextName = switchMapProviderFallback();
      showToast(`Map tiles switched to ${nextName} automatically`, 'info');
    }
  };

  return (
    <div className="yg-card overflow-hidden">
      {/* Module-Specific Map Filter Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
            {mode === 'CROWD' ? (
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            ) : (
              <Navigation className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            )}
            <span>{mode === 'CROWD' ? 'Crowd Intelligence Map' : 'Road Intelligence Map'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              {visibleMarkerCount} {visibleMarkerCount === 1 ? 'pin' : 'pins'} shown
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Free Map Provider Switcher */}
            <div className="relative">
              <button
                type="button"
                aria-expanded={isProviderOpen}
                aria-label="Switch free map provider"
                onClick={() => setIsProviderOpen((v) => !v)}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-sky-500 flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                <span>Map: {activeProvider.name.split(' ')[0]}</span>
              </button>

              {isProviderOpen && (
                <div className="absolute right-0 mt-1.5 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-1.5 z-[600] space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span>Free Map Providers</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Open-Source</span>
                  </div>
                  {mapProviderService.getAllProviders().map((p: MapProvider) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCurrentMapProviderId(p.id);
                        setIsProviderOpen(false);
                        showToast(`Switched map to ${p.name}`, 'info');
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 ${
                        currentMapProviderId === p.id
                          ? 'bg-sky-600 text-white font-bold keep-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-[10px] opacity-80 line-clamp-1">{p.description}</div>
                      </div>
                      {currentMapProviderId === p.id && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              aria-pressed={verifiedOnly}
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                verifiedOnly
                  ? 'bg-emerald-600 text-white border-emerald-500 keep-white'
                  : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Verified Only</span>
            </button>
          </div>
        </div>

        {/* Filter Chips Row (Scrollable horizontally on tight mobile screens) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
          {mode === 'CROWD' ? (
            <>
              {[
                { id: 'ALL', label: 'All Crowd Pins' },
                { id: 'VERY_HIGH', label: 'Very High Crowd' },
                { id: 'HIGH', label: 'High Crowd' },
                { id: 'MEDIUM', label: 'Moderate' },
                { id: 'LOW', label: 'Low Crowd' },
                { id: 'USER_REPORTS', label: 'User Crowd Reports' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  aria-pressed={crowdFilter === pill.id}
                  onClick={() => setCrowdFilter(pill.id)}
                  className={`px-2.5 py-1.5 rounded-xl font-semibold whitespace-nowrap flex-shrink-0 transition-colors border ${
                    crowdFilter === pill.id
                      ? 'bg-sky-600 text-white border-sky-500 keep-white'
                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: 'ALL', label: 'All Road Conditions' },
                { id: 'TRAFFIC', label: 'Traffic Jams' },
                { id: 'ROAD_CLOSURE', label: 'Roadblocks & Closures' },
                { id: 'ACCIDENT', label: 'Accidents' },
                { id: 'CONSTRUCTION', label: 'Construction' },
                { id: 'ROAD_CONDITION', label: 'Road Surface' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  aria-pressed={roadCategoryFilter === pill.id}
                  onClick={() => setRoadCategoryFilter(pill.id)}
                  className={`px-2.5 py-1.5 rounded-xl font-semibold whitespace-nowrap flex-shrink-0 transition-colors border ${
                    roadCategoryFilter === pill.id
                      ? 'bg-amber-600 text-white border-amber-500 keep-white'
                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </>
          )}

          {/* Radius Selector Pills */}
          <div className="flex items-center gap-1 pl-2 ml-1 border-l border-slate-300 dark:border-slate-700 flex-shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            {[
              { label: 'All', val: null },
              { label: '5 km', val: 5 },
              { label: '15 km', val: 15 },
              { label: '50 km', val: 50 },
            ].map((r) => (
              <button
                key={r.label}
                type="button"
                aria-pressed={radiusKm === r.val}
                onClick={() => setRadiusKm(r.val)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  radiusKm === r.val
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Road Difficulty sub-strip in ROAD mode */}
        {mode === 'ROAD' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10px]">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex-shrink-0">
              Severity:
            </span>
            {[
              { id: 'ALL', label: 'Any' },
              { id: 'BLOCKED', label: 'Blocked / Closed' },
              { id: 'DIFFICULT', label: 'Difficult' },
              { id: 'MODERATE', label: 'Moderate Delays' },
              { id: 'EASY', label: 'Clear / Easy' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={roadDifficultyFilter === d.id}
                onClick={() => setRoadDifficultyFilter(d.id)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap flex-shrink-0 border ${
                  roadDifficultyFilter === d.id
                    ? 'bg-red-600 text-white border-red-500 keep-white'
                    : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Map Canvas */}
      <div className={`relative w-full h-[340px] sm:h-[420px] lg:h-[460px] ${pickPinMode ? 'cursor-crosshair' : ''}`}>
        {pickPinMode && (
          <div className="absolute top-3 left-3 right-14 sm:right-auto z-[450] px-3 py-2 rounded-xl bg-sky-600/95 text-white text-xs font-bold shadow-lg flex items-center gap-2 keep-white pointer-events-none">
            <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Tap anywhere on the map to set your active location</span>
          </div>
        )}

        {/* Custom Accessible Zoom & Locate Map Controls (Right Side) */}
        <div className="absolute top-3 right-3 z-[450] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => zoomBridgeRef.current?.in()}
            aria-label="Zoom in map"
            title="Zoom in"
            className="w-9 h-9 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-white border border-slate-700 shadow-lg flex items-center justify-center keep-white"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBridgeRef.current?.out()}
            aria-label="Zoom out map"
            title="Zoom out"
            className="w-9 h-9 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-white border border-slate-700 shadow-lg flex items-center justify-center keep-white"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => zoomBridgeRef.current?.reset()}
            aria-label="Reset map zoom"
            title="Reset zoom"
            className="w-9 h-9 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-700 shadow-lg flex items-center justify-center keep-white"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {onRequestGps && (
            <button
              type="button"
              onClick={onRequestGps}
              disabled={gpsLoading}
              aria-label="Locate my GPS position on map"
              title="Use current GPS location"
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 shadow-lg flex items-center justify-center keep-white"
            >
              <Crosshair className={`w-4 h-4 ${gpsLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Active Center Info Badge (Bottom Left) */}
        <div className="hidden sm:flex absolute bottom-3 left-3 z-[450] px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] text-slate-200 items-center gap-2 max-w-xs keep-white pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="truncate">{centerLabel}</span>
        </div>

        <MapContainer
          center={[center.lat, center.lng]}
          zoom={12}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <MapViewportSync center={center} zoom={12} focusedItem={focusedItem} />
          <MapZoomBridge zoomRef={zoomBridgeRef} />
          <MapClickListener onMapClick={onMapPickLocation} />

          <TileLayer
            key={activeProvider.id}
            url={activeProvider.url}
            attribution={activeProvider.attribution}
            subdomains={activeProvider.subdomains || 'abc'}
            maxZoom={activeProvider.maxZoom || 19}
            eventHandlers={{ tileerror: handleTileError }}
          />

          {/* Selected / Current GPS Marker */}
          <Marker position={[center.lat, center.lng]} icon={selectedLocationIcon}>
            <Popup>
              <div className="p-1 text-xs space-y-1">
                <div className="font-bold text-blue-500">Active Focus Location</div>
                <div className="font-semibold">{centerLabel}</div>
                <div className="text-[10px] opacity-75 font-mono">
                  {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>

          {radiusKm && (
            <Circle
              center={[center.lat, center.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: mode === 'CROWD' ? '#0284c7' : '#d97706',
                fillColor: mode === 'CROWD' ? '#0284c7' : '#d97706',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '5, 8',
              }}
            />
          )}

          {/* CROWD MODULE MARKERS */}
          {filteredCrowdBaselines.map((cl) => {
            if (cl.lat === undefined || cl.lng === undefined) return null;
            const style = getCrowdColor(cl.currentLevel);
            return (
              <Marker
                key={`crowd-base-${cl.id}`}
                position={[cl.lat, cl.lng]}
                icon={createPinIcon(style.color, style.glyph)}
              >
                <Popup>
                  <div className="p-1 text-xs space-y-1.5 max-w-[230px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm leading-tight">{cl.attractionName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white">
                        {cl.currentLevel} CROWD
                      </span>
                      {cl.distanceKm !== null && cl.distanceKm !== undefined && (
                        <span className="text-[10px] text-sky-400 font-semibold">{cl.distanceKm} km away</span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90">{cl.crowdEstimateLabel}</p>
                    <div className="text-[10px] space-y-0.5 pt-1 border-t border-slate-700/60">
                      <div>Best: <strong>{cl.bestVisitingHours}</strong></div>
                      <div>Peak: <strong>{cl.peakHours}</strong></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {filteredCrowdReports.map((rep) => (
            <Marker
              key={`crowd-rep-${rep.id}`}
              position={[rep.lat, rep.lng]}
              icon={createPinIcon(rep.difficulty === 'BLOCKED' || rep.difficulty === 'DIFFICULT' ? '#dc2626' : '#0ea5e9', '👥')}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1.5 max-w-[230px]">
                  <div className="font-bold text-sm">{rep.locationName}</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white">CROWD REPORT</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white">{rep.status}</span>
                  </div>
                  <p className="text-[11px]">{rep.description}</p>
                  {rep.distanceKm !== null && rep.distanceKm !== undefined && (
                    <div className="text-[10px] text-sky-400 font-bold">{rep.distanceKm} km from focus</div>
                  )}
                  <div className="flex items-center gap-1 pt-1">
                    {isPrivileged && rep.status === 'PENDING' && onVerifyReport && (
                      <>
                        <button
                          type="button"
                          onClick={() => onVerifyReport(rep.id, 'APPROVE')}
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => onVerifyReport(rep.id, 'REJECT')}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {(isPrivileged || (currentUserId && rep.userId === currentUserId)) && onDeleteReport && (
                      <button
                        type="button"
                        onClick={() => onDeleteReport(rep.id)}
                        className="px-2 py-1 rounded bg-slate-800 text-red-400 text-[10px] font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {filteredCrowdAdvisories.map((adv) => (
            <Marker
              key={`crowd-adv-${adv.id}`}
              position={[adv.lat!, adv.lng!]}
              icon={createPinIcon('#dc2626', '⚠️')}
            >
              <Popup>
                <div className="p-1 text-xs space-y-1 max-w-[230px]">
                  <div className="font-bold text-red-400">{adv.title}</div>
                  <div className="text-[10px] font-bold uppercase">{adv.destinationName} • {adv.severity}</div>
                  <p className="text-[11px]">{adv.description}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* ROAD MODULE MARKERS */}
          {filteredRoadReports.map((rep) => {
            const style = getRoadPinStyle(rep.category, rep.difficulty);
            return (
              <Marker
                key={`road-rep-${rep.id}`}
                position={[rep.lat, rep.lng]}
                icon={createPinIcon(style.color, style.glyph)}
              >
                <Popup>
                  <div className="p-1 text-xs space-y-1.5 max-w-[235px]">
                    <div className="font-bold text-sm">{rep.locationName}</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                        {rep.category.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                        {rep.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white">
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-[11px]">{rep.description}</p>
                    <div className="flex items-center justify-between text-[10px] opacity-80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rep.expiresAt ? `Exp: ${new Date(rep.expiresAt).toLocaleDateString('en-IN')}` : 'Active'}
                      </span>
                      {rep.distanceKm !== null && rep.distanceKm !== undefined && (
                        <span className="font-bold text-sky-400">{rep.distanceKm} km away</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {isPrivileged && rep.status === 'PENDING' && onVerifyReport && (
                        <>
                          <button
                            type="button"
                            onClick={() => onVerifyReport(rep.id, 'APPROVE')}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => onVerifyReport(rep.id, 'REJECT')}
                            className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                      {(isPrivileged || (currentUserId && rep.userId === currentUserId)) && onDeleteReport && (
                        <button
                          type="button"
                          onClick={() => onDeleteReport(rep.id)}
                          className="px-2 py-1 rounded bg-slate-800 text-red-400 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {filteredRoadAdvisories.map((adv) => {
            const style = getRoadPinStyle(adv.category);
            return (
              <Marker
                key={`road-adv-${adv.id}`}
                position={[adv.lat!, adv.lng!]}
                icon={createPinIcon(style.color, style.glyph, '#fbbf24')}
              >
                <Popup>
                  <div className="p-1 text-xs space-y-1 max-w-[235px]">
                    <div className="flex items-center gap-1 font-bold text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{adv.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-red-900 text-red-200 font-bold">
                        {adv.category.replace('_', ' ')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                        {adv.severity}
                      </span>
                    </div>
                    <p className="text-[11px]">{adv.description}</p>
                    {adv.sourceName && (
                      <div className="text-[10px] opacity-75">Source: {adv.sourceName}</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
