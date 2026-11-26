import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Route as RouteIcon,
  Users,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  MapPin,
  AlertTriangle,
  X,
  Crosshair,
  Eye,
  Compass,
  Navigation,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchRoadCrowdReports,
  createRoadCrowdReport,
  verifyRoadCrowdReport,
  deleteRoadCrowdReport,
} from '../services/api';
import { reverseGeocodingService } from '../services/reverseGeocodingService';
import { RoadCrowdReport, CrowdLevel, TravelRiskAlert } from '../types';
import { PageHeader, EmptyState, LoadingSkeleton } from '../components/ui';
import { PlaceAutocompleteInput } from '../components/places/PlaceAutocompleteInput';
import { CrowdRoadMap } from '../components/Map/CrowdRoadMap';

const ROAD_CATEGORIES = [
  { id: 'ALL', label: 'All Road Conditions' },
  { id: 'TRAFFIC', label: 'Traffic Jam' },
  { id: 'ROAD_CLOSURE', label: 'Roadblock / Closure' },
  { id: 'ACCIDENT', label: 'Accident' },
  { id: 'CONSTRUCTION', label: 'Construction' },
  { id: 'ROAD_CONDITION', label: 'Road Surface' },
];

export type CrowdRoadModule = 'CROWD' | 'ROAD';

interface RoadCrowdPageProps {
  initialModule?: CrowdRoadModule;
}

export const RoadCrowdPage: React.FC<RoadCrowdPageProps> = ({ initialModule = 'CROWD' }) => {
  const {
    cities,
    currentCity,
    setCity,
    userCoords,
    userAddress,
    gpsStatus,
    locationAccuracy,
    locationError,
    requestUserLocation,
    setUserSelectedPin,
  } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeModule, setActiveModule] = useState<CrowdRoadModule>(initialModule);
  useEffect(() => {
    setActiveModule(initialModule);
  }, [initialModule]);

  const [reports, setReports] = useState<RoadCrowdReport[]>([]);
  const [crowdLevels, setCrowdLevels] = useState<CrowdLevel[]>([]);
  const [riskAdvisories, setRiskAdvisories] = useState<TravelRiskAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Module filters
  const [cityFilter, setCityFilter] = useState('ALL');
  const [crowdLevelFilter, setCrowdLevelFilter] = useState('ALL');
  const [roadCatFilter, setRoadCatFilter] = useState('ALL');
  const [roadDiffFilter, setRoadDiffFilter] = useState('ALL');

  // Location Bar + Interactive Map State
  const [locationQuery, setLocationQuery] = useState('');
  const [manualCoordsOpen, setManualCoordsOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [pickPinMode, setPickPinMode] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [focusedItem, setFocusedItem] = useState<{ lat: number; lng: number; label: string; nonce: number } | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Report Submission Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    cityId: '',
    locationName: '',
    lat: '',
    lng: '',
    category: initialModule === 'CROWD' ? 'CROWD' : 'TRAFFIC',
    difficulty: 'MODERATE',
    description: '',
    expiresInHours: '24',
  });

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  // Lock background scroll & handle Escape when report modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchRoadCrowdReports({
        cityId: cityFilter,
        lat: userCoords.lat,
        lng: userCoords.lng,
      });
      setReports(res.reports || []);
      setCrowdLevels(res.crowdLevels || []);
      setRiskAdvisories(res.riskAdvisories || []);
    } catch {
      showToast('Failed to load crowd & road intelligence', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cityFilter, userCoords.lat, userCoords.lng]);

  useEffect(() => {
    if (currentCity && !form.locationName) {
      setForm((p) => ({
        ...p,
        cityId: currentCity.id,
        locationName: currentCity.name,
        lat: currentCity.lat.toFixed(5),
        lng: currentCity.lng.toFixed(5),
      }));
    }
  }, [currentCity?.id]);

  // Keep report form default category aligned with active module when switching
  useEffect(() => {
    setForm((p) => ({
      ...p,
      category: activeModule === 'CROWD' ? 'CROWD' : p.category === 'CROWD' ? 'TRAFFIC' : p.category,
    }));
  }, [activeModule]);

  const focusOnMap = (lat: number, lng: number, label: string) => {
    setIsMapExpanded(true);
    setFocusedItem({ lat, lng, label, nonce: Date.now() });
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleUseGps = async () => {
    const ok = await requestUserLocation(true);
    if (ok) {
      showToast('GPS location detected and centered on map', 'success');
      setCityFilter('ALL');
      setIsMapExpanded(true);
      setTimeout(() => {
        mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    } else {
      showToast('Location permission denied or unavailable. Enter a location manually or pick on map.', 'error');
    }
  };

  const handleManualPlaceSelect = async (loc: { name: string; address: string; lat: number; lng: number }) => {
    await setUserSelectedPin({ lat: loc.lat, lng: loc.lng }, loc.address || loc.name);
    setCityFilter('ALL');
    setForm((p) => ({
      ...p,
      locationName: loc.name,
      lat: loc.lat.toFixed(5),
      lng: loc.lng.toFixed(5),
    }));
    focusOnMap(loc.lat, loc.lng, loc.address || loc.name);
    showToast(`Focused location on ${loc.name}`, 'success');
  };

  const handleApplyManualCoords = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(manualLat);
    const lngNum = parseFloat(manualLng);
    if (
      Number.isNaN(latNum) ||
      Number.isNaN(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      showToast('Enter valid latitude (-90 to 90) and longitude (-180 to 180).', 'error');
      return;
    }
    await setUserSelectedPin({ lat: latNum, lng: lngNum });
    setCityFilter('ALL');
    setManualCoordsOpen(false);
    focusOnMap(latNum, lngNum, `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`);
    showToast('Custom map coordinates applied', 'success');
  };

  const handleMapClickLocation = async (lat: number, lng: number) => {
    if (!pickPinMode) return;
    setPickPinMode(false);
    try {
      const rev = await reverseGeocodingService.reverseGeocode(lat, lng);
      await setUserSelectedPin({ lat, lng }, rev.displayName);
      setLocationQuery(rev.displayName);
      setForm((p) => ({
        ...p,
        locationName: rev.displayName,
        lat: lat.toFixed(5),
        lng: lng.toFixed(5),
      }));
      focusOnMap(lat, lng, rev.displayName);
      showToast(`Location set to ${rev.displayName}`, 'success');
    } catch {
      const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      await setUserSelectedPin({ lat, lng }, label);
      focusOnMap(lat, lng, label);
    }
  };

  const openReportModalForModule = () => {
    setForm((p) => ({
      ...p,
      cityId: cityFilter !== 'ALL' ? cityFilter : currentCity?.id || '',
      locationName: locationQuery.trim() || userAddress || currentCity?.name || '',
      lat: userCoords.lat.toFixed(5),
      lng: userCoords.lng.toFixed(5),
      category: activeModule === 'CROWD' ? 'CROWD' : 'TRAFFIC',
    }));
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Sign in to report road or crowd conditions', 'error');
      return;
    }
    if (!form.locationName.trim() || !form.description.trim()) {
      showToast('Location and condition details are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const matched = cities.find((c) => c.id === form.cityId);
      const parsedLat = parseFloat(form.lat);
      const parsedLng = parseFloat(form.lng);
      const submitLat = !Number.isNaN(parsedLat) ? parsedLat : matched?.lat ?? userCoords.lat;
      const submitLng = !Number.isNaN(parsedLng) ? parsedLng : matched?.lng ?? userCoords.lng;

      const res = await createRoadCrowdReport({
        cityId: form.cityId || undefined,
        locationName: form.locationName.trim(),
        lat: submitLat,
        lng: submitLng,
        category: form.category,
        difficulty: form.difficulty,
        description: form.description.trim(),
        expiresInHours: parseInt(form.expiresInHours, 10) || 24,
      });
      showToast(res.message || 'Condition update recorded', 'success');
      setIsModalOpen(false);
      setForm((p) => ({ ...p, description: '' }));
      await loadData();
      focusOnMap(submitLat, submitLng, form.locationName.trim());
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to post update', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await verifyRoadCrowdReport(id, action);
      showToast(`Report ${action === 'APPROVE' ? 'verified' : 'rejected'}`, 'success');
      loadData();
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRoadCrowdReport(id);
      showToast('Report removed', 'success');
      loadData();
    } catch {
      showToast('Failed to remove report', 'error');
    }
  };

  const difficultyBadge = (diff: string) => {
    switch (diff) {
      case 'BLOCKED':
        return 'bg-red-600 text-white keep-white';
      case 'DIFFICULT':
        return 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300';
      case 'MODERATE':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300';
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300';
    }
  };

  // Module-partitioned datasets
  const filteredCrowdGuides = useMemo(() => {
    return crowdLevels.filter((cl) => crowdLevelFilter === 'ALL' || cl.currentLevel === crowdLevelFilter);
  }, [crowdLevels, crowdLevelFilter]);

  const crowdReports = useMemo(() => reports.filter((r) => r.category === 'CROWD'), [reports]);

  const roadReports = useMemo(() => {
    return reports.filter((r) => {
      if (r.category === 'CROWD') return false;
      if (roadCatFilter !== 'ALL' && r.category !== roadCatFilter) return false;
      if (roadDiffFilter !== 'ALL' && r.difficulty !== roadDiffFilter) return false;
      return true;
    });
  }, [reports, roadCatFilter, roadDiffFilter]);

  const crowdAdvisoriesList = useMemo(
    () => riskAdvisories.filter((a) => a.category === 'OVERCROWDING'),
    [riskAdvisories]
  );

  const roadAdvisoriesList = useMemo(
    () => riskAdvisories.filter((a) => a.category !== 'OVERCROWDING'),
    [riskAdvisories]
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 pb-20 space-y-5 sm:space-y-6 yg-page-enter">
      <PageHeader
        eyebrow={activeModule === 'CROWD' ? 'Sightseeing & Visitor Flow' : 'Traffic, Closures & Hazards'}
        icon={activeModule === 'CROWD' ? Users : RouteIcon}
        accentColor={activeModule === 'CROWD' ? 'blue' : 'amber'}
        title={activeModule === 'CROWD' ? 'Crowd Intelligence' : 'Road Intelligence'}
        description={
          activeModule === 'CROWD'
            ? 'Inspect live crowd density, best visiting windows, and community crowd updates on an interactive open-source map.'
            : 'Track live traffic bottlenecks, roadblocks, construction zones, and accidents across highways and tourist corridors.'
        }
        actions={
          <button
            type="button"
            onClick={openReportModalForModule}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 keep-white yg-press"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>{activeModule === 'CROWD' ? 'Report Crowd Update' : 'Report Road Condition'}</span>
          </button>
        }
      />

      {/* Separate Module Switcher */}
      <div
        role="tablist"
        aria-label="Intelligence modules"
        className="yg-card p-1.5 flex items-center gap-1.5 w-full sm:w-fit overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeModule === 'CROWD'}
          onClick={() => setActiveModule('CROWD')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] ${
            activeModule === 'CROWD'
              ? 'bg-sky-600 text-white shadow-sm keep-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          <span>Crowd Intelligence</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 dark:bg-white/15">
            {crowdLevels.length + crowdReports.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeModule === 'ROAD'}
          onClick={() => setActiveModule('ROAD')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] ${
            activeModule === 'ROAD'
              ? 'bg-amber-600 text-white shadow-sm keep-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <RouteIcon className="w-4 h-4" aria-hidden="true" />
          <span>Road Intelligence</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 dark:bg-white/15">
            {roadReports.length + roadAdvisoriesList.length}
          </span>
        </button>
      </div>

      {/* Unified GPS + Manual Location Search + View Map Toolbar */}
      <section className="yg-card p-4 space-y-3" aria-label="Location selection and map controls">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
                  gpsStatus === 'granted'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : gpsStatus === 'locating'
                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                <Compass className="w-3 h-3" aria-hidden="true" />
                {gpsStatus === 'granted'
                  ? `GPS Active${locationAccuracy ? ` (±${Math.round(locationAccuracy)}m)` : ''}`
                  : gpsStatus === 'locating'
                  ? 'Detecting GPS...'
                  : 'Manual / Hub Location'}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {userAddress || `${currentCity?.name || 'India'}, ${currentCity?.state || ''}`}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto lg:min-w-[520px] min-w-0">
            <PlaceAutocompleteInput
              className="flex-1 min-w-0"
              value={locationQuery}
              onChange={setLocationQuery}
              biasCoords={userCoords}
              placeholder="Enter city, highway, landmark, or area..."
              ariaLabel="Search or enter location manually"
              onSelectLocation={handleManualPlaceSelect}
            />

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleUseGps}
                disabled={gpsStatus === 'locating'}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 keep-white whitespace-nowrap min-h-[40px]"
              >
                {gpsStatus === 'locating' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{gpsStatus === 'locating' ? 'Locating...' : 'Use GPS'}</span>
              </button>

              <button
                type="button"
                onClick={() => focusOnMap(userCoords.lat, userCoords.lng, userAddress)}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[40px]"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>View Map</span>
              </button>

              <button
                type="button"
                aria-pressed={pickPinMode}
                onClick={() => {
                  setIsMapExpanded(true);
                  setPickPinMode((v) => !v);
                  if (!pickPinMode) {
                    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[40px] ${
                  pickPinMode
                    ? 'bg-sky-600 text-white border-sky-500 keep-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {pickPinMode ? 'Tap Map Now' : 'Pick on Map'}
              </button>

              <button
                type="button"
                aria-expanded={manualCoordsOpen}
                onClick={() => setManualCoordsOpen((v) => !v)}
                className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold min-h-[40px]"
                title="Enter custom latitude and longitude"
              >
                Coords
              </button>
            </div>
          </div>
        </div>

        {/* GPS Permission Denied / Error Notice */}
        {(gpsStatus === 'denied' || locationError) && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true" />
              <span>{locationError || 'Location access denied. Search a city, pick a hub, or tap directly on the map.'}</span>
            </div>
            <button
              type="button"
              onClick={handleUseGps}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] self-start sm:self-auto"
            >
              Retry GPS
            </button>
          </div>
        )}

        {/* Quick Hub Filter + Optional Manual Coordinates Form */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              Hub Scope:
            </span>
            <select
              aria-label="Filter by city hub"
              value={cityFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCityFilter(val);
                const chosen = cities.find((c) => c.id === val);
                if (chosen) {
                  setCity(chosen);
                  focusOnMap(chosen.lat, chosen.lng, `${chosen.name}, ${chosen.state}`);
                }
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">All Supported Hubs</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsMapExpanded((v) => !v)}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline self-start sm:self-auto"
          >
            {isMapExpanded ? 'Hide Interactive Map' : 'Show Interactive Map'}
          </button>
        </div>

        {manualCoordsOpen && (
          <form onSubmit={handleApplyManualCoords} className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <input
              type="number"
              step="any"
              required
              placeholder="Latitude (e.g. 32.2396)"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
            <input
              type="number"
              step="any"
              required
              placeholder="Longitude (e.g. 77.1887)"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold keep-white"
            >
              Apply &amp; View on Map
            </button>
          </form>
        )}
      </section>

      {/* Interactive Module Map */}
      {isMapExpanded && (
        <div ref={mapSectionRef} id="crowd-road-map-section">
          <CrowdRoadMap
            mode={activeModule}
            center={userCoords}
            centerLabel={userAddress}
            reports={reports}
            crowdLevels={crowdLevels}
            riskAdvisories={riskAdvisories}
            focusedItem={focusedItem}
            pickPinMode={pickPinMode}
            onMapPickLocation={handleMapClickLocation}
            onRequestGps={handleUseGps}
            gpsLoading={gpsStatus === 'locating'}
            isPrivileged={isPrivileged}
            currentUserId={user?.id}
            onVerifyReport={handleVerify}
            onDeleteReport={handleDelete}
          />
        </div>
      )}

      {/* ======================================================= */}
      {/* MODULE 1: CROWD INTELLIGENCE                             */}
      {/* ======================================================= */}
      {activeModule === 'CROWD' && (
        <div className="space-y-6">
          {/* Crowd Module Density Filter Pills */}
          <div className="yg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              Filter Crowd Density Levels:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'ALL', label: 'All Levels' },
                { id: 'VERY_HIGH', label: 'Very High' },
                { id: 'HIGH', label: 'High' },
                { id: 'MEDIUM', label: 'Moderate' },
                { id: 'LOW', label: 'Low' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setCrowdLevelFilter(lvl.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap flex-shrink-0 border ${
                    crowdLevelFilter === lvl.id
                      ? 'bg-sky-600 text-white border-sky-500 keep-white'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attraction Crowd Timing Guide */}
          {filteredCrowdGuides.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                Destination Crowd Timing Guide ({filteredCrowdGuides.length} Landmarks)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredCrowdGuides.map((cl) => (
                  <div key={cl.id} className="yg-card p-4 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {cl.attractionName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                            cl.currentLevel === 'VERY_HIGH' || cl.currentLevel === 'HIGH'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : cl.currentLevel === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {cl.currentLevel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">{cl.crowdEstimateLabel}</p>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800 space-y-0.5">
                        <div>Best: <strong className="text-emerald-600 dark:text-emerald-400">{cl.bestVisitingHours}</strong></div>
                        <div>Peak: <strong className="text-amber-600 dark:text-amber-400">{cl.peakHours}</strong></div>
                      </div>
                    </div>

                    {cl.lat !== undefined && cl.lng !== undefined && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {cl.distanceKm !== null && cl.distanceKm !== undefined ? `${cl.distanceKm} km away` : cl.city?.name || 'Landmark'}
                        </span>
                        <button
                          type="button"
                          onClick={() => focusOnMap(cl.lat!, cl.lng!, cl.attractionName)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 keep-white"
                        >
                          <Eye className="w-3 h-3" aria-hidden="true" />
                          <span>View Map</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Community Crowd Reports & Overcrowding Advisories */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
              Live Crowd Surge Reports ({crowdReports.length + crowdAdvisoriesList.length})
            </h2>

            {loading ? (
              <LoadingSkeleton variant="list" count={2} />
            ) : crowdReports.length === 0 && crowdAdvisoriesList.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Live Crowd Surge Reports"
                description="Share crowd wait-times at temples, forts, stations, or bazaars."
                actionLabel="Report Crowd Update"
                onAction={openReportModalForModule}
                accentColor="blue"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {crowdAdvisoriesList.map((adv) => (
                  <div key={`crowd-adv-card-${adv.id}`} className="yg-card p-5 space-y-2.5 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white keep-white">
                        OVERCROWDING • {adv.severity}
                      </span>
                      {adv.distanceKm !== null && adv.distanceKm !== undefined && (
                        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">{adv.distanceKm} km away</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{adv.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{adv.description}</p>
                    {adv.lat && adv.lng && (
                      <button
                        type="button"
                        onClick={() => focusOnMap(adv.lat!, adv.lng!, adv.title)}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center gap-1.5 keep-white"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>View Map</span>
                      </button>
                    )}
                  </div>
                ))}

                {crowdReports.map((rep) => (
                  <div key={rep.id} className="yg-card p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${difficultyBadge(rep.difficulty)}`}>
                          {rep.difficulty}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rep.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>

                      {rep.distanceKm !== null && rep.distanceKm !== undefined && (
                        <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          {rep.distanceKm} km away
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" aria-hidden="true" />
                        <span>{rep.locationName}</span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{rep.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {rep.expiresAt
                          ? `Expires ${new Date(rep.expiresAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`
                          : 'Active'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => focusOnMap(rep.lat, rep.lng, rep.locationName)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold flex items-center gap-1 keep-white"
                        >
                          <Eye className="w-3 h-3" aria-hidden="true" /> View Map
                        </button>
                        {isPrivileged && rep.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVerify(rep.id, 'APPROVE')}
                              className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 keep-white"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerify(rep.id, 'REJECT')}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 keep-white"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                        {(isPrivileged || (user && rep.userId === user.id)) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(rep.id)}
                            aria-label="Delete report"
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODULE 2: ROAD INTELLIGENCE                              */}
      {/* ======================================================= */}
      {activeModule === 'ROAD' && (
        <div className="space-y-6">
          {/* Road Module Independent List Filters */}
          <div className="yg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <select
              aria-label="Filter by road condition category"
              value={roadCatFilter}
              onChange={(e) => setRoadCatFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
            >
              {ROAD_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by road difficulty"
              value={roadDiffFilter}
              onChange={(e) => setRoadDiffFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="ALL">Any Road Difficulty</option>
              <option value="EASY">Easy / Clear</option>
              <option value="MODERATE">Moderate Delays</option>
              <option value="DIFFICULT">Difficult / Caution</option>
              <option value="BLOCKED">Blocked / Closed</option>
            </select>
          </div>

          {/* Live Road Feed + Verified Hazard Advisories */}
          {loading ? (
            <LoadingSkeleton variant="list" count={3} />
          ) : roadReports.length === 0 && roadAdvisoriesList.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No Active Road Advisories Match Filters"
              description="Help fellow travelers by reporting traffic jams, road closures, landslides, or accidents."
              actionLabel="Report Road Condition"
              onAction={openReportModalForModule}
              accentColor="amber"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadAdvisoriesList.map((adv) => (
                <div key={`road-adv-card-${adv.id}`} className="yg-card p-5 space-y-2.5 border-l-4 border-l-amber-500">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white keep-white">
                        {adv.category.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                        {adv.severity}
                      </span>
                    </div>
                    {adv.distanceKm !== null && adv.distanceKm !== undefined && (
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                        {adv.distanceKm} km away
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" aria-hidden="true" />
                    <span>{adv.title}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{adv.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{adv.sourceName || 'Verified Travel Advisory'}</span>
                    {adv.lat && adv.lng && (
                      <button
                        type="button"
                        onClick={() => focusOnMap(adv.lat!, adv.lng!, adv.title)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 keep-white"
                      >
                        <Eye className="w-3 h-3" aria-hidden="true" /> View Map
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {roadReports.map((rep) => (
                <div key={rep.id} className="yg-card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${difficultyBadge(rep.difficulty)}`}>
                        {rep.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rep.category.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rep.status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    {rep.distanceKm !== null && rep.distanceKm !== undefined && (
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                        {rep.distanceKm} km away
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" aria-hidden="true" />
                      <span>{rep.locationName}</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{rep.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {rep.expiresAt
                        ? `Expires ${new Date(rep.expiresAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`
                        : 'Active'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => focusOnMap(rep.lat, rep.lng, rep.locationName)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center gap-1 keep-white"
                      >
                        <Eye className="w-3 h-3" aria-hidden="true" /> View Map
                      </button>
                      {isPrivileged && rep.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVerify(rep.id, 'APPROVE')}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 keep-white"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerify(rep.id, 'REJECT')}
                            className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 keep-white"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
                      {(isPrivileged || (user && rep.userId === user.id)) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(rep.id)}
                          aria-label="Delete report"
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Post Road or Crowd Update"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {activeModule === 'CROWD' ? 'Post Live Crowd Update' : 'Post Road Condition Update'}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white touch-min flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <select
                value={form.cityId}
                onChange={(e) => setForm((p) => ({ ...p, cityId: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="">Select Hub (Optional)</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                required
                value={form.locationName}
                onChange={(e) => setForm((p) => ({ ...p, locationName: e.target.value }))}
                placeholder="Stretch / Attraction (e.g. Rohtang Approach Rd) *"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                  placeholder="Latitude"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                />
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                  placeholder="Longitude"
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="CROWD">Crowd Level / Surge</option>
                  {ROAD_CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="EASY">Easy / Low</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="DIFFICULT">Difficult / Heavy</option>
                  <option value="BLOCKED">Blocked / Closed</option>
                </select>
              </div>

              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Details (e.g. 45 min wait at ticket gate, single-lane diversion) *"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />

              <select
                value={form.expiresInHours}
                onChange={(e) => setForm((p) => ({ ...p, expiresInHours: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="6">Expires in 6 Hours</option>
                <option value="12">Expires in 12 Hours</option>
                <option value="24">Expires in 24 Hours</option>
                <option value="72">Expires in 3 Days</option>
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold keep-white"
                >
                  {submitting ? 'Submitting...' : 'Submit Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
