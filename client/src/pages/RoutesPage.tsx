import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Compass,
  Navigation,
  ArrowRight,
  ArrowRightLeft,
  IndianRupee,
  Clock,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Car,
  Bike,
  Train,
  Bus,
  Footprints,
  Info,
  Crosshair,
  Globe,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import {
  planCompleteRoute,
  reverseGeocodeCoords,
  auditOvercharge,
  reportRouteOvercharge,
} from '../services/api';
import { mapProviderService } from '../services/mapProviderService';
import { PlaceAutocompleteInput } from '../components/places/PlaceAutocompleteInput';
import { ComputedRouteGeometry, MultimodalFareOption } from '../types';

interface RoutesPageProps {
  onNavigateToMap?: (coords?: { lat: number; lng: number }) => void;
}

interface LocationPoint {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

const pinOriginIcon = L.divIcon({
  className: 'tariff-pin-origin',
  html: `<div style="background:#0284c7;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;color:#fff;font-weight:900;font-size:13px;box-shadow:0 3px 10px rgba(0,0,0,0.45);">A</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const pinDestIcon = L.divIcon({
  className: 'tariff-pin-dest',
  html: `<div style="background:#dc2626;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;color:#fff;font-weight:900;font-size:13px;box-shadow:0 3px 10px rgba(0,0,0,0.45);">B</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapViewportSync({
  center,
  routeCoords,
}: {
  center: [number, number];
  routeCoords: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      const bounds = L.latLngBounds(routeCoords.map((c) => [c[0], c[1]]));
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });
    } else {
      map.setView(center, 12, { animate: true });
    }
  }, [center[0], center[1], routeCoords, map]);

  return null;
}

function MapClickSelector({
  onSelectPoint,
}: {
  onSelectPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelectPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const PRESET_CORRIDORS: Array<{
  label: string;
  origin: LocationPoint;
  dest: LocationPoint;
}> = [
  {
    label: 'New Delhi Stn → India Gate',
    origin: { name: 'New Delhi Railway Station', lat: 28.6428, lng: 77.2195 },
    dest: { name: 'India Gate, New Delhi', lat: 28.6129, lng: 77.2295 },
  },
  {
    label: 'Manali Mall Rd → Solang Valley',
    origin: { name: 'Mall Road, Manali', lat: 32.2432, lng: 77.1892 },
    dest: { name: 'Solang Valley, Manali', lat: 32.3168, lng: 77.1573 },
  },
  {
    label: 'Haridwar Stn → Rishikesh',
    origin: { name: 'Haridwar Railway Station', lat: 29.948, lng: 78.1558 },
    dest: { name: 'Ram Jhula, Rishikesh', lat: 30.1235, lng: 78.3144 },
  },
  {
    label: 'Jaipur Airport → Hawa Mahal',
    origin: { name: 'Jaipur International Airport', lat: 26.8242, lng: 75.8122 },
    dest: { name: 'Hawa Mahal, Jaipur', lat: 26.9239, lng: 75.8267 },
  },
];

export const RoutesPage: React.FC<RoutesPageProps> = ({ onNavigateToMap }) => {
  const {
    currentCity,
    userCoords,
    userAddress,
    gpsStatus,
    requestUserLocation,
    currentMapProviderId,
    setCurrentMapProviderId,
    switchMapProviderFallback,
  } = useCity();
  const { showToast } = useToast();

  // Source & Destination state (supports any worldwide coordinates)
  const [sourceText, setSourceText] = useState<string>('New Delhi Railway Station');
  const [sourcePoint, setSourcePoint] = useState<LocationPoint | null>({
    name: 'New Delhi Railway Station',
    address: 'New Delhi, Delhi, India',
    lat: 28.6428,
    lng: 77.2195,
  });

  const [destText, setDestText] = useState<string>('India Gate, New Delhi');
  const [destPoint, setDestPoint] = useState<LocationPoint | null>({
    name: 'India Gate, New Delhi',
    address: 'Kartavya Path, New Delhi, India',
    lat: 28.6129,
    lng: 77.2295,
  });

  // Map selection state ('NONE' | 'SOURCE' | 'DESTINATION')
  const [mapPickMode, setMapPickMode] = useState<'NONE' | 'SOURCE' | 'DESTINATION'>('DESTINATION');
  const [isProviderOpen, setIsProviderOpen] = useState(false);

  // Route & Tariff Options
  const [travelMode, setTravelMode] = useState<'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT'>('DRIVE');
  const [travelHour, setTravelHour] = useState<number>(new Date().getHours());
  const [waitingMins, setWaitingMins] = useState<number>(0);
  const [hasLuggage, setHasLuggage] = useState<boolean>(false);
  const [avoidTolls, setAvoidTolls] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  // Route Results State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [plannedData, setPlannedData] = useState<{
    routes: ComputedRouteGeometry[];
    selectedRouteIndex: number;
    routingProvider: string;
    routingNotice: string;
    safetyEvaluation: any;
    fares: {
      straightLineKm: number;
      roadDistanceKm: number;
      distanceSource: string;
      terrainType: string;
      coveredCityName: string | null;
      isCityTariffCovered: boolean;
      options: MultimodalFareOption[];
      nightSurchargeApplied: boolean;
      mountainSurchargeApplied: boolean;
    };
  } | null>(null);

  // Expandable details
  const [expandedModeId, setExpandedModeId] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [showQuoteAudit, setShowQuoteAudit] = useState<boolean>(false);

  // Quote Audit & Overcharge Report
  const [quotedFareInput, setQuotedFareInput] = useState<string>('');
  const [auditTransportId, setAuditTransportId] = useState<string>('AUTO_RICKSHAW');
  const [auditVerdict, setAuditVerdict] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  const [overchargeModalOpen, setOverchargeModalOpen] = useState<boolean>(false);
  const [selectedModeForReport, setSelectedModeForReport] = useState<MultimodalFareOption | null>(null);
  const [demandedFare, setDemandedFare] = useState<string>('');
  const [paidFare, setPaidFare] = useState<string>('');
  const [driverNotes, setDriverNotes] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  const activeProvider = useMemo(
    () => mapProviderService.getProviderById(currentMapProviderId),
    [currentMapProviderId]
  );

  // Core route & tariff calculation
  const calculateRouteAndFares = useCallback(
    async (src: LocationPoint, dst: LocationPoint) => {
      setIsLoading(true);
      setRouteError(null);
      setAuditVerdict(null);
      try {
        const res = await planCompleteRoute({
          origin: { lat: src.lat, lng: src.lng, name: src.name },
          destination: { lat: dst.lat, lng: dst.lng, name: dst.name },
          travelMode,
          avoidTolls,
          travelHour,
          waitingMins,
          hasLuggage,
        });

        setPlannedData({
          routes: res.routes || [],
          selectedRouteIndex: 0,
          routingProvider: res.routingProvider,
          routingNotice: res.routingNotice,
          safetyEvaluation: res.safetyEvaluation,
          fares: res.fares,
        });
      } catch (err: any) {
        console.error('Travel tariff calculation failed:', err);
        setRouteError(err?.response?.data?.error || 'Unable to compute route and fare estimates right now.');
      } finally {
        setIsLoading(false);
      }
    },
    [travelMode, avoidTolls, travelHour, waitingMins, hasLuggage]
  );

  // Auto-recalculate whenever sourcePoint, destPoint, or options change
  useEffect(() => {
    if (sourcePoint && destPoint) {
      calculateRouteAndFares(sourcePoint, destPoint);
    }
  }, [sourcePoint, destPoint, calculateRouteAndFares]);

  // Select current GPS location as Source
  const handleUseCurrentLocation = async () => {
    const ok = await requestUserLocation(true);
    if (!ok) {
      showToast('Location permission unavailable. Search an address or click the map instead.', 'error');
      return;
    }

    let label = userAddress || `GPS (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})`;
    try {
      const geo = await reverseGeocodeCoords(userCoords.lat, userCoords.lng);
      if (geo?.formattedAddress) label = geo.formattedAddress;
    } catch {
      // Fallback to existing userAddress
    }

    setSourceText(label);
    setSourcePoint({
      name: label,
      address: label,
      lat: userCoords.lat,
      lng: userCoords.lng,
    });
    showToast('Source updated to your current GPS location.', 'success');
  };

  // Map click handler sets Source or Destination with reverse geocoding
  const handleMapClick = async (lat: number, lng: number) => {
    const targetMode = mapPickMode === 'NONE' ? 'DESTINATION' : mapPickMode;
    const fallbackLabel = `Pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    let resolvedLabel = fallbackLabel;
    try {
      const geo = await reverseGeocodeCoords(lat, lng);
      if (geo?.formattedAddress) {
        resolvedLabel = geo.formattedAddress;
      }
    } catch {
      // keep fallback coordinates label
    }

    if (targetMode === 'SOURCE') {
      setSourceText(resolvedLabel);
      setSourcePoint({ name: resolvedLabel, address: resolvedLabel, lat, lng });
      setMapPickMode('DESTINATION');
      showToast('Source pinned from map.', 'success');
    } else {
      setDestText(resolvedLabel);
      setDestPoint({ name: resolvedLabel, address: resolvedLabel, lat, lng });
      showToast('Destination pinned from map.', 'success');
    }
  };

  // Swap Source and Destination
  const handleSwapLocations = () => {
    if (!sourcePoint && !destPoint) return;
    const prevSourcePoint = sourcePoint;
    const prevSourceText = sourceText;

    setSourcePoint(destPoint);
    setSourceText(destText);
    setDestPoint(prevSourcePoint);
    setDestText(prevSourceText);
  };

  // Clear locations & results
  const handleClear = () => {
    setDestPoint(null);
    setDestText('');
    setPlannedData(null);
    setRouteError(null);
    setAuditVerdict(null);
  };

  // Audit quoted driver fare against computed range or backend auditor
  const handleCheckQuote = async () => {
    const quote = parseFloat(quotedFareInput);
    if (isNaN(quote) || quote <= 0 || !plannedData) {
      showToast('Enter a valid fare quote amount in ₹.', 'error');
      return;
    }

    const chosenOpt = plannedData.fares.options.find((o) => o.modeId === auditTransportId);
    if (!chosenOpt || !chosenOpt.isAvailable || chosenOpt.priceType === 'UNAVAILABLE') {
      showToast('No verified fare baseline exists for this mode in this area.', 'info');
      return;
    }

    setIsAuditing(true);
    try {
      const backendModeMap: Record<string, string> = {
        AUTO_RICKSHAW: 'AUTO',
        TAXI: 'LOCAL_TAXI',
        E_RICKSHAW: 'E_RICKSHAW',
        BIKE_TAXI: 'BIKE_TAXI',
        BUS: 'LOCAL_BUS',
        METRO: 'METRO',
      };

      if (plannedData.fares.isCityTariffCovered && backendModeMap[auditTransportId]) {
        const res = await auditOvercharge({
          cityName: plannedData.fares.coveredCityName || currentCity?.name,
          transportModeId: backendModeMap[auditTransportId],
          quotedFare: quote,
          distanceKm: plannedData.fares.roadDistanceKm,
          origin: sourcePoint?.name,
          destination: destPoint?.name,
          travelHour,
        });
        setAuditVerdict(res);
      } else {
        const ratio = chosenOpt.fareMax > 0 ? quote / chosenOpt.fareMax : 1;
        setAuditVerdict({
          verdict: ratio <= 1.1 ? 'FAIR' : ratio <= 1.35 ? 'SLIGHTLY_ELEVATED' : 'SEVERE_OVERCHARGE',
          expectedMin: chosenOpt.fareMin,
          expectedMax: chosenOpt.fareMax,
          advice:
            ratio <= 1.1
              ? `Quote ₹${quote} is within expected benchmark (₹${chosenOpt.fareMin}–₹${chosenOpt.fareMax}).`
              : `Quote ₹${quote} exceeds benchmark (₹${chosenOpt.fareMin}–₹${chosenOpt.fareMax}). Consider metered or official counters.`,
        });
      }
    } catch {
      const ratio = chosenOpt.fareMax > 0 ? quote / chosenOpt.fareMax : 1;
      setAuditVerdict({
        verdict: ratio <= 1.1 ? 'FAIR' : 'POTENTIAL_OVERCHARGE',
        expectedMin: chosenOpt.fareMin,
        expectedMax: chosenOpt.fareMax,
        advice: `Fair range is ₹${chosenOpt.fareMin}–₹${chosenOpt.fareMax}.`,
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSubmitOvercharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandedFare || !selectedModeForReport || !sourcePoint || !destPoint) {
      showToast('Please enter the demanded fare.', 'error');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await reportRouteOvercharge({
        originName: sourcePoint.name,
        destinationName: destPoint.name,
        cityName: plannedData?.fares?.coveredCityName || currentCity?.name,
        transportModeId: selectedModeForReport.modeId,
        expectedPriceMin: selectedModeForReport.fareMin,
        expectedPriceMax: selectedModeForReport.fareMax,
        amountDemanded: parseFloat(demandedFare),
        amountActuallyPaid: paidFare ? parseFloat(paidFare) : undefined,
        lat: sourcePoint.lat,
        lng: sourcePoint.lng,
        notes: driverNotes,
      });

      showToast(`Overcharge logged (${res.audit?.severity || 'Recorded'}).`, 'success');
      setOverchargeModalOpen(false);
      setDemandedFare('');
      setPaidFare('');
      setDriverNotes('');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to log overcharge report.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const activeRoute = plannedData?.routes?.[plannedData.selectedRouteIndex] || null;

  const activeRouteCoords: [number, number][] | null = useMemo(() => {
    if (activeRoute?.coordinates && activeRoute.coordinates.length > 1) {
      return activeRoute.coordinates;
    }
    if (sourcePoint && destPoint) {
      return [
        [sourcePoint.lat, sourcePoint.lng],
        [destPoint.lat, destPoint.lng],
      ];
    }
    return null;
  }, [activeRoute, sourcePoint, destPoint]);

  const mapCenter: [number, number] = sourcePoint
    ? [sourcePoint.lat, sourcePoint.lng]
    : [userCoords.lat, userCoords.lng];

  const getModeIcon = (modeId: string) => {
    switch (modeId) {
      case 'METRO':
        return <Train className="w-4 h-4 text-sky-400" />;
      case 'BUS':
        return <Bus className="w-4 h-4 text-indigo-400" />;
      case 'BIKE_TAXI':
      case 'CYCLING':
        return <Bike className="w-4 h-4 text-teal-400" />;
      case 'WALKING':
        return <Footprints className="w-4 h-4 text-emerald-400" />;
      default:
        return <Car className="w-4 h-4 text-amber-400" />;
    }
  };

  const getPriceBadgeStyle = (priceType: MultimodalFareOption['priceType']) => {
    switch (priceType) {
      case 'OFFICIAL_GOVT':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'COMMUNITY_VERIFIED':
      case 'COMMUNITY_REPORTED':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      case 'ESTIMATED':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const displayDistanceKm =
    activeRoute?.distanceKm ?? plannedData?.fares?.roadDistanceKm ?? null;
  const displayDurationLabel =
    activeRoute?.durationLabel ??
    (plannedData?.fares?.options?.[0]
      ? `~${plannedData.fares.options.find((o) => o.isAvailable)?.durationMin || 15} min`
      : null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
            <Compass className="w-4 h-4" />
            <span>Global Route &amp; Fare Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5">Travel Tariff</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Search any location worldwide or pick points directly on the map to compare routes and fair transport fares.
          </p>
        </div>

        {/* Quick Preset Corridors */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_CORRIDORS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setSourceText(preset.origin.name);
                setSourcePoint(preset.origin);
                setDestText(preset.dest.name);
                setDestPoint(preset.dest);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. SOURCE & DESTINATION SEARCH BAR (Elevated z-index above Leaflet) */}
      <div className="relative z-[1100] bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Source Input */}
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-1">
              <span className="text-sky-400">Source (A)</span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-emerald-400 hover:underline flex items-center gap-1 normal-case font-semibold"
                >
                  <Crosshair className={`w-3 h-3 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
                  <span>Current Location</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapPickMode(mapPickMode === 'SOURCE' ? 'NONE' : 'SOURCE')}
                  className={`flex items-center gap-1 normal-case font-semibold ${
                    mapPickMode === 'SOURCE' ? 'text-amber-400 underline' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{mapPickMode === 'SOURCE' ? 'Click Map...' : 'Pick on Map'}</span>
                </button>
              </div>
            </div>

            <PlaceAutocompleteInput
              value={sourceText}
              onChange={(v) => {
                setSourceText(v);
                if (!v.trim()) setSourcePoint(null);
              }}
              biasCoords={userCoords}
              leftIcon={<span className="w-2.5 h-2.5 rounded-full bg-sky-500 block" />}
              placeholder="City, village, airport, railway station, landmark..."
              onSelectLocation={(loc) => {
                const label = loc.address || loc.name;
                setSourceText(label);
                setSourcePoint({ name: loc.name, address: label, lat: loc.lat, lng: loc.lng });
              }}
            />
          </div>

          {/* Swap & Clear Actions */}
          <div className="lg:col-span-2 flex items-center justify-center gap-2 lg:pt-6">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Swap source and destination"
              aria-label="Swap source and destination"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="lg:hidden">Swap</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors"
              title="Clear destination"
              aria-label="Clear destination"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {/* Destination Input */}
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider px-1">
              <span className="text-red-400">Destination (B)</span>
              <button
                type="button"
                onClick={() => setMapPickMode(mapPickMode === 'DESTINATION' ? 'NONE' : 'DESTINATION')}
                className={`flex items-center gap-1 normal-case font-semibold ${
                  mapPickMode === 'DESTINATION' ? 'text-amber-400 underline' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>{mapPickMode === 'DESTINATION' ? 'Click Map...' : 'Pick on Map'}</span>
              </button>
            </div>

            <PlaceAutocompleteInput
              value={destText}
              onChange={(v) => {
                setDestText(v);
                if (!v.trim()) setDestPoint(null);
              }}
              biasCoords={sourcePoint || userCoords}
              leftIcon={<span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />}
              placeholder="Any destination worldwide (cities, villages, airports)..."
              onSelectLocation={(loc) => {
                const label = loc.address || loc.name;
                setDestText(label);
                setDestPoint({ name: loc.name, address: label, lat: loc.lat, lng: loc.lng });
              }}
            />
          </div>
        </div>

        {/* Travel Modes & Expandable Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'DRIVE' as const, label: 'Drive', icon: Car },
              { id: 'TRANSIT' as const, label: 'Transit', icon: Train },
              { id: 'BICYCLE' as const, label: 'Cycle', icon: Bike },
              { id: 'WALK' as const, label: 'Walk', icon: Footprints },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTravelMode(m.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition-colors ${
                    travelMode === m.id
                      ? 'bg-sky-600 text-white border-sky-500 keep-white'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold flex items-center gap-1"
            >
              <span>Fare Options</span>
              {showAdvancedOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {sourcePoint && destPoint && (
              <button
                type="button"
                onClick={() => calculateRouteAndFares(sourcePoint, destPoint)}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{isLoading ? 'Calculating...' : 'Recalculate'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Fare Options (Night time, Waiting, Luggage, Avoid Tolls) */}
        {showAdvancedOptions && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Travel Time</label>
              <select
                value={travelHour}
                onChange={(e) => setTravelHour(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
              >
                <option value={10}>10:00 AM (Daytime)</option>
                <option value={18}>06:00 PM (Evening)</option>
                <option value={23}>11:30 PM (Night Surcharge)</option>
                <option value={2}>02:00 AM (Night Surcharge)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Waiting Time</label>
              <select
                value={waitingMins}
                onChange={(e) => setWaitingMins(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
              >
                <option value={0}>No waiting (0 min)</option>
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer self-end">
              <input type="checkbox" checked={hasLuggage} onChange={(e) => setHasLuggage(e.target.checked)} />
              <span className="text-slate-300 font-semibold">Extra Luggage</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer self-end">
              <input type="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} />
              <span className="text-slate-300 font-semibold">Avoid Toll Roads</span>
            </label>
          </div>
        )}
      </div>

      {/* 2. INTERACTIVE MAP + ROUTE DETAILS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Interactive Map */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl relative h-[380px] sm:h-[460px] lg:h-[540px]">
          {/* Map Controls */}
          <div className="absolute top-3 left-3 right-3 z-[500] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 text-[11px] pointer-events-auto">
              <button
                type="button"
                onClick={() => setMapPickMode('SOURCE')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  mapPickMode === 'SOURCE' ? 'bg-sky-600 text-white keep-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Tap Map: Source (A)
              </button>
              <button
                type="button"
                onClick={() => setMapPickMode('DESTINATION')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  mapPickMode === 'DESTINATION' ? 'bg-red-600 text-white keep-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Tap Map: Dest (B)
              </button>
            </div>

            {/* Map Tile Provider Selector */}
            <div className="relative pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsProviderOpen(!isProviderOpen)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 text-slate-200 border border-slate-800 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>{activeProvider.name.split(' ')[0]}</span>
              </button>
              {isProviderOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1">
                  {mapProviderService.getAllProviders().map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCurrentMapProviderId(p.id);
                        setIsProviderOpen(false);
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
            center={mapCenter}
            zoom={12}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
          >
            <MapViewportSync center={mapCenter} routeCoords={activeRouteCoords} />
            <MapClickSelector onSelectPoint={handleMapClick} />

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
                    showToast(`Switched map layer to ${nextName}`, 'info');
                  }
                },
              }}
            />

            {plannedData?.routes?.map((rt, idx) => {
              const isSelected = plannedData.selectedRouteIndex === idx;
              return (
                <Polyline
                  key={rt.id}
                  positions={rt.coordinates}
                  pathOptions={{
                    color: isSelected ? '#0284c7' : '#64748b',
                    weight: isSelected ? 6 : 4,
                    opacity: isSelected ? 0.92 : 0.55,
                    dashArray: isSelected ? undefined : '6, 8',
                  }}
                  eventHandlers={{
                    click: () => setPlannedData({ ...plannedData, selectedRouteIndex: idx }),
                  }}
                />
              );
            })}

            {!activeRoute && sourcePoint && destPoint && (
              <Polyline
                positions={[
                  [sourcePoint.lat, sourcePoint.lng],
                  [destPoint.lat, destPoint.lng],
                ]}
                pathOptions={{ color: '#0284c7', weight: 4, dashArray: '6, 8', opacity: 0.7 }}
              />
            )}

            {sourcePoint && (
              <Marker position={[sourcePoint.lat, sourcePoint.lng]} icon={pinOriginIcon}>
                <Popup>
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-sky-600">Source (A)</div>
                    <div>{sourcePoint.name}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {destPoint && (
              <Marker position={[destPoint.lat, destPoint.lng]} icon={pinDestIcon}>
                <Popup>
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-red-600">Destination (B)</div>
                    <div>{destPoint.name}</div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Right Panel: Route Summary, Alternatives, Safety & Quote Audit */}
        <div className="lg:col-span-5 space-y-4">
          {!sourcePoint || !destPoint ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <Navigation className="w-10 h-10 text-sky-400 mx-auto" />
              <h3 className="text-base font-black text-white">Select Source &amp; Destination</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Search any city, village, airport, or landmark above — or click directly on the map to pin points A and B.
              </p>
            </div>
          ) : isLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-300">
                Calculating route distance, alternatives, and tariffs...
              </p>
            </div>
          ) : routeError ? (
            <div className="bg-slate-900 border border-red-800/50 rounded-3xl p-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Route Error</h3>
              <p className="text-xs text-slate-400">{routeError}</p>
              <button
                type="button"
                onClick={() => calculateRouteAndFares(sourcePoint, destPoint)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold keep-white"
              >
                Retry
              </button>
            </div>
          ) : plannedData ? (
            <>
              {/* Route Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Selected Route
                    </div>
                    <div className="text-sm font-extrabold text-white flex flex-wrap items-center gap-1.5">
                      <span className="truncate max-w-[160px]">{sourcePoint.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span className="truncate max-w-[160px]">{destPoint.name}</span>
                    </div>
                  </div>
                  {onNavigateToMap && (
                    <button
                      type="button"
                      onClick={() => onNavigateToMap({ lat: destPoint.lat, lng: destPoint.lng })}
                      className="text-[11px] font-bold text-sky-400 hover:underline flex-shrink-0"
                    >
                      Safety Map →
                    </button>
                  )}
                </div>

                {/* Distance & Duration Metrics */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Distance</span>
                    <span className="text-base font-black text-white">
                      {displayDistanceKm !== null ? `${displayDistanceKm} km` : '—'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Est. Time</span>
                    <span className="text-base font-black text-emerald-400">{displayDurationLabel || '—'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Coverage</span>
                    <span className="text-xs font-bold text-amber-400 truncate block mt-0.5">
                      {plannedData.fares.coveredCityName || 'Standard Model'}
                    </span>
                  </div>
                </div>

                {/* Notices & Modifiers */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                    {plannedData.routingProvider.replace(/_/g, ' ')}
                  </span>
                  {plannedData.fares.nightSurchargeApplied && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">
                      Night Surcharge
                    </span>
                  )}
                  {plannedData.fares.mountainSurchargeApplied && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                      Mountain Terrain
                    </span>
                  )}
                </div>

                {/* Alternative Routes */}
                {plannedData.routes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Available Routes ({plannedData.routes.length})
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {plannedData.routes.map((rt, idx) => {
                        const isSelected = plannedData.selectedRouteIndex === idx;
                        return (
                          <button
                            key={rt.id}
                            type="button"
                            onClick={() => setPlannedData({ ...plannedData, selectedRouteIndex: idx })}
                            className={`w-full text-left p-3 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-blue-950/40 border-sky-500'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span className="truncate">{rt.summary}</span>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
                              </div>
                              {rt.tollInfo?.note && (
                                <div className="text-[10px] text-slate-400 truncate">{rt.tollInfo.note}</div>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs font-black text-emerald-400">{rt.durationLabel}</div>
                              <div className="text-[11px] text-slate-400">{rt.distanceLabel}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expandable Turn-by-Turn Steps */}
                {activeRoute?.steps && activeRoute.steps.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowSteps(!showSteps)}
                      className="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white"
                    >
                      <span>Turn-by-Turn Steps ({activeRoute.steps.length})</span>
                      {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showSteps && (
                      <div className="mt-2 max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {activeRoute.steps.map((st, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 text-[11px] p-2 rounded-xl bg-slate-950 border border-slate-800"
                          >
                            <span className="text-slate-200 truncate">
                              <strong className="text-sky-400 mr-1.5">{idx + 1}.</strong>
                              {st.instruction}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                              {st.distanceLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Expandable Driver Quote Audit Tool */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowQuoteAudit(!showQuoteAudit)}
                  className="w-full flex items-center justify-between text-xs font-extrabold text-white"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Check Driver Fare Quote (Overcharge Audit)
                  </span>
                  {showQuoteAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showQuoteAudit && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={auditTransportId}
                        onChange={(e) => setAuditTransportId(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                      >
                        {plannedData.fares.options
                          .filter((o) => o.isAvailable && o.modeId !== 'WALKING')
                          .map((o) => (
                            <option key={o.modeId} value={o.modeId}>
                              {o.name}
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        value={quotedFareInput}
                        onChange={(e) => setQuotedFareInput(e.target.value)}
                        placeholder="Quoted ₹"
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={handleCheckQuote}
                        disabled={isAuditing}
                        className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                      >
                        {isAuditing ? 'Checking...' : 'Check Quote'}
                      </button>
                    </div>

                    {auditVerdict && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="font-bold text-amber-400">
                          Status: {String(auditVerdict.verdict || auditVerdict.severity || 'Checked').replace(/_/g, ' ')}
                        </div>
                        <p className="text-slate-300">{auditVerdict.advice || auditVerdict.message}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* 3. FARE ESTIMATION & TRANSPARENCY SECTION */}
      {plannedData?.fares && (
        <div className="space-y-4">
          {/* Transparency Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-400" />
                <span>Transport Fare Estimates</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {plannedData.fares.isCityTariffCovered
                  ? `Showing tariffs for ${plannedData.fares.coveredCityName} (${plannedData.fares.roadDistanceKm} km road).`
                  : `Outside mapped RTO tariff hubs (${plannedData.fares.roadDistanceKm} km road). Unverified modes are marked unavailable instead of guessing prices.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <span className="px-2 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                Official Price = Govt / Union Tariff
              </span>
              <span className="px-2 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-700/60">
                Estimated = Modeled Range
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                Unavailable = Never Invented
              </span>
            </div>
          </div>

          {/* Transport Modes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plannedData.fares.options.map((opt) => {
              const isExpanded = expandedModeId === opt.modeId;
              return (
                <div
                  key={opt.modeId}
                  className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 transition-colors ${
                    opt.isAvailable
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/60 opacity-75'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0">
                          {getModeIcon(opt.modeId)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-extrabold text-white truncate">{opt.name}</h3>
                          <span className="text-[10px] text-slate-400">{opt.vehicleType}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${getPriceBadgeStyle(
                          opt.priceType
                        )}`}
                      >
                        {opt.priceTypeLabel}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div
                        className={`text-base font-black ${
                          opt.isAvailable ? 'text-emerald-400' : 'text-slate-400 text-xs'
                        }`}
                      >
                        {opt.fareLabel}
                      </div>
                      {opt.isAvailable && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>~{opt.durationMin} mins · {opt.distanceKm} km</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">{opt.description}</p>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1">
                        {opt.conditions.map((c, ci) => (
                          <div key={ci}>• {c}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setExpandedModeId(isExpanded ? null : opt.modeId)}
                      className="text-slate-400 hover:text-white font-semibold flex items-center gap-0.5"
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {opt.isAvailable && opt.modeId !== 'WALKING' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModeForReport(opt);
                          setOverchargeModalOpen(true);
                        }}
                        className="text-red-400 hover:underline font-bold"
                      >
                        Report Overcharge
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Overcharge Modal */}
      {overchargeModalOpen && selectedModeForReport && sourcePoint && destPoint && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-black text-white">Report Transit Overcharge</h3>
              </div>
              <button
                type="button"
                onClick={() => setOverchargeModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-slate-400 truncate">
                Route: <strong className="text-white">{sourcePoint.name} → {destPoint.name}</strong>
              </div>
              <div className="text-slate-400">
                Mode: <strong className="text-amber-400">{selectedModeForReport.name}</strong>
              </div>
              <div className="text-slate-400">
                Expected: <strong className="text-emerald-400">{selectedModeForReport.fareLabel}</strong>
              </div>
            </div>

            <form onSubmit={handleSubmitOvercharge} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Demanded Fare (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={demandedFare}
                  onChange={(e) => setDemandedFare(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Paid Fare (₹ Optional)
                </label>
                <input
                  type="number"
                  value={paidFare}
                  onChange={(e) => setPaidFare(e.target.value)}
                  placeholder="e.g. 350"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="Driver refused meter or demanded extra..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReport}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs keep-white"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Overcharge Report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
