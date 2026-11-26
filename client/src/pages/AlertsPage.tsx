import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Clock,
  Compass,
  Search,
  Flag,
  ThumbsUp,
  Navigation,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  HelpCircle,
  Bell,
  CloudRain,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchIncidents,
  verifyIncident,
  fetchNearbyAlerts,
  fetchRiskAlerts,
  createRiskAlert,
  verifyRiskAlert,
  deleteRiskAlert,
  fetchWeather,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '../services/api';
import { TravelRiskAlert, WeatherData } from '../types';
import { PageHeader, EmptyState, LoadingSkeleton } from '../components/ui';

interface AlertsPageProps {
  onOpenReportModal: () => void;
  onNavigateToMap: (coords?: { lat: number; lng: number }) => void;
}

const RISK_CATEGORIES = [
  { id: 'ALL', label: 'All Hazard Types' },
  { id: 'HEAVY_RAINFALL', label: 'Heavy Rainfall' },
  { id: 'FLOOD', label: 'Flooding' },
  { id: 'LANDSLIDE', label: 'Landslide' },
  { id: 'SNOWFALL', label: 'Snowfall / Ice' },
  { id: 'ROAD_CLOSURE', label: 'Road Closure' },
  { id: 'ACCIDENT', label: 'Major Accident' },
  { id: 'OVERCROWDING', label: 'Overcrowding' },
  { id: 'UNSAFE_AREA', label: 'Unsafe Area' },
  { id: 'SCAM_WARNING', label: 'Scam Warning' },
];

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onOpenReportModal,
  onNavigateToMap,
}) => {
  const { cities, currentCity, userCoords, userAddress, requestUserLocation } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Primary View Switcher: Risk Advisories vs Scam & Incident Reports vs Preferences
  const [sectionTab, setSectionTab] = useState<'risk_alerts' | 'scam_reports' | 'preferences'>('risk_alerts');

  // --- LIVE TRAVEL RISK ALERTS STATE ---
  const [riskAlerts, setRiskAlerts] = useState<TravelRiskAlert[]>([]);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskSourceTab, setRiskSourceTab] = useState<'ALL' | 'OFFICIAL' | 'COMMUNITY'>('ALL');
  const [riskSeverity, setRiskSeverity] = useState<string>('ALL');
  const [riskCategory, setRiskCategory] = useState<string>('ALL');
  const [riskCityId, setRiskCityId] = useState<string>('ALL');
  const [riskSearch, setRiskSearch] = useState<string>('');
  const [riskCounts, setRiskCounts] = useState({ officialCount: 0, communityCount: 0 });
  const [liveWeatherAlert, setLiveWeatherAlert] = useState<WeatherData | null>(null);

  // New Risk Alert Modal
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [submittingRisk, setSubmittingRisk] = useState(false);
  const [newRiskForm, setNewRiskForm] = useState({
    destinationName: '',
    category: 'ROAD_CLOSURE',
    severity: 'MODERATE',
    title: '',
    description: '',
    sourceType: 'COMMUNITY',
    sourceName: '',
    expiresInHours: '48',
  });

  // --- SCAM & INCIDENT REPORTS STATE (Existing) ---
  const [incidents, setIncidents] = useState<any[]>([]);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('latest');
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // --- NOTIFICATION PREFERENCES STATE ---
  const [prefs, setPrefs] = useState({
    nearbyAlerts: true,
    fareAudits: true,
    communityUpdates: true,
    radiusKm: 5,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const loadRiskAlerts = async () => {
    setRiskLoading(true);
    try {
      const res = await fetchRiskAlerts({
        cityId: riskCityId,
        category: riskCategory,
        severity: riskSeverity,
        tab: riskSourceTab,
        search: riskSearch || undefined,
        lat: userCoords.lat,
        lng: userCoords.lng,
      });
      setRiskAlerts(res.alerts || []);
      setRiskCounts({
        officialCount: res.officialCount ?? 0,
        communityCount: res.communityCount ?? 0,
      });
    } catch (err) {
      console.error('Failed to load risk alerts:', err);
    } finally {
      setRiskLoading(false);
    }
  };

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const res = await fetchIncidents({
        cityId: selectedCityId,
        category: selectedCategory,
        filterType,
        search: searchQuery,
        lat: userCoords.lat,
        lng: userCoords.lng,
        radiusKm: filterType === 'nearby' ? 25 : undefined,
        page: currentPage,
        limit: 10,
      });

      setIncidents(res.incidents || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalCount(res.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load incidents:', err);
      showToast('Failed to load scam & safety reports', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRiskAlerts();
  }, [riskCityId, riskCategory, riskSeverity, riskSourceTab]);

  useEffect(() => {
    if (currentCity) {
      setNewRiskForm((prev) => ({
        ...prev,
        destinationName: prev.destinationName || currentCity.name,
      }));
      fetchWeather(currentCity.id, currentCity.name)
        .then(setLiveWeatherAlert)
        .catch(() => {});
    }
  }, [currentCity?.id]);

  useEffect(() => {
    if (userCoords.lat && userCoords.lng) {
      fetchNearbyAlerts({
        lat: userCoords.lat,
        lng: userCoords.lng,
        radiusKm: 15,
      })
        .then((res) => {
          if (res.count > 0) {
            setNearbyNotice(res.safetyNotice);
            setNearbyCount(res.count);
          }
        })
        .catch(() => {});
    }
  }, [userCoords]);

  useEffect(() => {
    loadIncidents();
  }, [selectedCityId, selectedCategory, filterType, currentPage]);

  useEffect(() => {
    fetchNotificationPreferences()
      .then((res) => {
        if (res) {
          setPrefs({
            nearbyAlerts: res.nearbyAlerts ?? true,
            fareAudits: res.fareAudits ?? true,
            communityUpdates: res.communityUpdates ?? true,
            radiusKm: res.radiusKm ?? 5,
          });
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const handleSubmitRiskAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to submit a live risk alert', 'error');
      return;
    }
    if (!newRiskForm.destinationName.trim() || !newRiskForm.title.trim() || !newRiskForm.description.trim()) {
      showToast('Destination, title, and description are required', 'error');
      return;
    }

    setSubmittingRisk(true);
    try {
      const matchedCity = cities.find(
        (c) => c.name.toLowerCase() === newRiskForm.destinationName.trim().toLowerCase()
      );
      const res = await createRiskAlert({
        cityId: matchedCity?.id,
        destinationName: newRiskForm.destinationName.trim(),
        lat: matchedCity?.lat ?? userCoords.lat,
        lng: matchedCity?.lng ?? userCoords.lng,
        category: newRiskForm.category,
        severity: newRiskForm.severity,
        title: newRiskForm.title.trim(),
        description: newRiskForm.description.trim(),
        sourceType: isPrivileged ? newRiskForm.sourceType : 'COMMUNITY',
        sourceName: isPrivileged && newRiskForm.sourceName.trim() ? newRiskForm.sourceName.trim() : undefined,
        expiresInHours: parseInt(newRiskForm.expiresInHours, 10) || 48,
      });
      showToast(res.message || 'Risk alert submitted', 'success');
      setIsRiskModalOpen(false);
      setNewRiskForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        sourceName: '',
      }));
      loadRiskAlerts();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to publish risk alert', 'error');
    } finally {
      setSubmittingRisk(false);
    }
  };

  const handleVerifyRisk = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await verifyRiskAlert(id, action);
      showToast(res.message || 'Alert updated', 'success');
      loadRiskAlerts();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to update alert', 'error');
    }
  };

  const handleDeleteRisk = async (id: string) => {
    try {
      await deleteRiskAlert(id);
      showToast('Risk alert removed', 'success');
      loadRiskAlerts();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to delete alert', 'error');
    }
  };

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Sign in to persist notification preferences', 'error');
      return;
    }
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences(prefs);
      showToast('Alert notification preferences saved', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to save preferences', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadIncidents();
  };

  const handleCommunityAction = async (
    id: string,
    action: 'CONFIRM_RELEVANT' | 'MARK_OUTDATED' | 'FLAG_INACCURATE'
  ) => {
    try {
      const res = await verifyIncident(id, { action });
      showToast(res.message || 'Feedback recorded successfully', 'success');
      loadIncidents();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to register community action', 'error');
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-600 text-white border-red-700 keep-white';
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800';
      case 'MODERATE':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'ADMIN_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60">
            <ShieldCheck className="w-3 h-3" aria-hidden="true" />
            Verified Incident
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60">
            <Clock className="w-3 h-3" aria-hidden="true" />
            Under Review
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            Outdated / Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-700/60">
            <HelpCircle className="w-3 h-3" aria-hidden="true" />
            Pending Verification
          </span>
        );
    }
  };

  const getCategoryColor = (cat: string) => {
    if (cat.includes('overcharge') || cat.includes('fare')) {
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/50';
    }
    if (cat.includes('theft') || cat.includes('harassment') || cat.includes('unsafe')) {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-700/50';
    }
    if (cat.includes('scam') || cat.includes('fake')) {
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700/50';
    }
    return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/50';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16 yg-page-enter">
      <PageHeader
        eyebrow="Live Travel Vigilance"
        icon={ShieldAlert}
        accentColor="red"
        title="Risk Advisories & Scam Alerts"
        description="Real-time weather & road advisories separated cleanly from crowdsourced scam and incident reports."
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigateToMap()}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>View Safety Map</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRiskModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-2 keep-white yg-press"
            >
              <AlertTriangle className="w-4 h-4 text-white" aria-hidden="true" />
              <span>Report Hazard</span>
            </button>
            <button
              type="button"
              onClick={onOpenReportModal}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-2 keep-white yg-press"
            >
              <PlusCircle className="w-4 h-4 text-white" aria-hidden="true" />
              <span>Report Scam</span>
            </button>
          </>
        }
      />

      {/* Primary Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setSectionTab('risk_alerts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            sectionTab === 'risk_alerts'
              ? 'bg-sky-600 text-white keep-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Live Risk Advisories ({riskAlerts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSectionTab('scam_reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            sectionTab === 'scam_reports'
              ? 'bg-sky-600 text-white keep-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Scam & Incident Feed ({totalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setSectionTab('preferences')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
            sectionTab === 'preferences'
              ? 'bg-sky-600 text-white keep-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Alert Preferences</span>
        </button>
      </div>

      {/* Nearby Active Incident Notice Banner */}
      {nearbyNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-white font-black keep-white">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">Local Perimeter Advisory</div>
              <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">{nearbyNotice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSectionTab('scam_reports');
              setFilterType('nearby');
              setCurrentPage(1);
            }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-sm keep-white"
          >
            Show Nearby ({nearbyCount})
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: LIVE TRAVEL RISK ALERTS (Weather, Roads, Hazards)          */}
      {/* ================================================================= */}
      {sectionTab === 'risk_alerts' && (
        <div className="space-y-5">
          {/* Active Open-Meteo Weather Risk Notice for Selected Hub */}
          {liveWeatherAlert && (liveWeatherAlert.severity === 'HIGH' || liveWeatherAlert.severity === 'MODERATE') && (
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-sky-600 text-white keep-white flex-shrink-0">
                <CloudRain className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-600 text-white keep-white">
                    {liveWeatherAlert.sourceName || 'Open-Meteo Weather'}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {liveWeatherAlert.city} • {liveWeatherAlert.temp}°C ({liveWeatherAlert.condition})
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-sky-200 mt-1">{liveWeatherAlert.alertMessage}</p>
              </div>
            </div>
          )}

          {/* Filter Panel */}
          <div className="yg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: `All Active (${riskCounts.officialCount + riskCounts.communityCount})` },
                { id: 'OFFICIAL', label: `Official & Verified (${riskCounts.officialCount})` },
                { id: 'COMMUNITY', label: `Community Submitted (${riskCounts.communityCount})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRiskSourceTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    riskSourceTab === t.id
                      ? 'bg-slate-900 text-white dark:bg-sky-600 keep-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border dark:border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <select
                  value={riskCityId}
                  onChange={(e) => setRiskCityId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="ALL">All Destinations</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={riskCategory}
                  onChange={(e) => setRiskCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
                >
                  {RISK_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={riskSeverity}
                  onChange={(e) => setRiskSeverity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
                >
                  <option value="ALL">Any Severity</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadRiskAlerts();
                }}
                className="sm:col-span-4 relative"
              >
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={riskSearch}
                  onChange={(e) => setRiskSearch(e.target.value)}
                  placeholder="Search highway, pass, or risk..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[11px] font-semibold keep-white"
                >
                  Go
                </button>
              </form>
            </div>
          </div>

          {riskLoading ? (
            <LoadingSkeleton variant="list" count={3} />
          ) : riskAlerts.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Active Travel Risk Alerts"
              description="No active road, weather, or overcrowding advisories match these filters right now."
              actionLabel="Report a Travel Hazard"
              onAction={() => setIsRiskModalOpen(true)}
              accentColor="emerald"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {riskAlerts.map((alert) => (
                <div key={alert.id} className="yg-card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                          alert.severity
                        )}`}
                      >
                        {alert.severity} Risk
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          alert.sourceType === 'OFFICIAL' || alert.sourceType === 'MODERATOR_VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {alert.sourceType === 'OFFICIAL'
                          ? 'Official Advisory'
                          : alert.sourceType === 'MODERATOR_VERIFIED'
                          ? 'Moderator Verified'
                          : alert.verificationStatus === 'PENDING'
                          ? 'Community (Pending Review)'
                          : 'Community Report'}
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {alert.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                        {alert.destinationName}
                      </span>
                      {alert.distanceKm !== null && alert.distanceKm !== undefined && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                          {alert.distanceKm} km away
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{alert.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>Source: {alert.sourceName || alert.sourceType}</span>
                      {alert.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Active until {new Date(alert.expiresAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isPrivileged && alert.verificationStatus === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVerifyRisk(alert.id, 'APPROVE')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 keep-white"
                          >
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            Verify
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyRisk(alert.id, 'REJECT')}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold flex items-center gap-1 keep-white"
                          >
                            <XCircle className="w-3 h-3" aria-hidden="true" />
                            Reject
                          </button>
                        </>
                      )}

                      {(isPrivileged || (user && alert.createdById === user.id)) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRisk(alert.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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

      {/* ================================================================= */}
      {/* TAB 2: SCAM & SAFETY INCIDENT FEED (All existing functionality)   */}
      {/* ================================================================= */}
      {sectionTab === 'scam_reports' && (
        <div className="space-y-5">
          {/* Filter and Search Bar */}
          <div className="yg-card p-4 space-y-3">
            {filterType === 'nearby' && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Navigation className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                  <span>
                    Radius Center: <strong className="text-slate-900 dark:text-white">{userAddress}</strong> (25 km search perimeter)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => requestUserLocation(true)}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-600/30 dark:hover:bg-sky-600/40 text-sky-700 dark:text-sky-300 text-[11px] font-bold border border-sky-200 dark:border-sky-500/40 transition-colors"
                >
                  Refresh GPS
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'latest', label: 'Latest Alerts' },
                { id: 'nearby', label: 'Nearby My GPS' },
                { id: 'most_reported', label: 'Most Reported' },
                { id: 'verified', label: 'Verified Only' },
                { id: 'pending', label: 'Pending Verification' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setFilterType(pill.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterType === pill.id
                      ? 'bg-amber-500 text-white keep-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-3">
                <select
                  value={selectedCityId}
                  onChange={(e) => {
                    setSelectedCityId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Cities & Regions</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500 capitalize"
                >
                  <option value="ALL">All Categories</option>
                  <option value="taxi_overcharging">Taxi Overcharging</option>
                  <option value="auto_overcharging">Auto Overcharging</option>
                  <option value="fake_tour_operator">Fake Tour Operator</option>
                  <option value="hotel_scam">Hotel Booking Scam</option>
                  <option value="fake_guide">Fake Guide / Priest Tout</option>
                  <option value="shopping_scam">Shopping Scam</option>
                  <option value="online_fraud">Online Payment Fraud</option>
                  <option value="theft">Theft / Pickpocketing</option>
                  <option value="harassment">Harassment</option>
                  <option value="unsafe_location">Unsafe Location / Road</option>
                  <option value="suspicious_activity">Suspicious Activity</option>
                </select>
              </div>

              <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reports by landmark, station, or tout pattern..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-20 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors keep-white"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {isLoading ? (
            <LoadingSkeleton variant="list" count={4} />
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Scam Reports Found"
              description="No active incidents match your filters in this sector right now."
              actionLabel="Report Scam / Incident"
              onAction={onOpenReportModal}
              accentColor="emerald"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>
                  Showing {incidents.length} of {totalCount} reported incidents
                </span>
                <span>Sorted by {filterType.replace('_', ' ')}</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="yg-card p-5 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border capitalize ${getCategoryColor(
                            inc.category
                          )}`}
                        >
                          {inc.category.replace(/_/g, ' ')}
                        </span>
                        {getStatusBadge(inc.status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500" aria-hidden="true" />
                          <strong className="text-slate-800 dark:text-slate-200">{inc.cityName}</strong>, {inc.cityState}
                        </span>
                        {inc.distanceKm !== null && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/40">
                            {inc.distanceKm} km away
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          {new Date(inc.incidentDate || inc.reportedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{inc.title}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1.5">
                          {inc.description}
                        </p>
                        {inc.scamFlagSignal && inc.scamFlagSignal !== 'LOW_SIGNAL' && (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            <span>{inc.scamAdvisoryNote || `Advisory signal (${inc.scamFlagSignal}) — awaiting verification`}</span>
                          </div>
                        )}
                      </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                      <Navigation className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{inc.address}</span>
                    </div>

                    {(inc.amountDemanded || inc.amountPaid) && (
                      <div className="flex items-center gap-4 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                        {inc.amountDemanded && (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Demanded</span>
                            <span className="font-extrabold text-red-600 dark:text-red-400">₹{inc.amountDemanded}</span>
                          </div>
                        )}
                        {inc.amountPaid && (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Actually Paid</span>
                            <span className="font-extrabold text-amber-600 dark:text-amber-400">₹{inc.amountPaid}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCommunityAction(inc.id, 'CONFIRM_RELEVANT')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors active:scale-95"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                          <span>Still Relevant ({inc.confirmationsCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCommunityAction(inc.id, 'MARK_OUTDATED')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] transition-colors"
                          title="Mark as no longer happening"
                        >
                          Mark Outdated
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCommunityAction(inc.id, 'FLAG_INACCURATE')}
                          className="p-1.5 rounded-xl bg-slate-50 hover:bg-red-50 dark:bg-slate-950 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 transition-colors"
                          title="Flag as inaccurate / false"
                        >
                          <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateToMap({ lat: inc.lat, lng: inc.lng })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs transition-colors"
                      >
                        <span>View on Map</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Previous</span>
                  </button>

                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: NOTIFICATION & PERIMETER PREFERENCES                       */}
      {/* ================================================================= */}
      {sectionTab === 'preferences' && (
        <form onSubmit={handleSavePrefs} className="yg-card p-6 max-w-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Bell className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Alert Perimeter & Subscriptions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose which safety advisories highlight around your current location.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                key: 'nearbyAlerts' as const,
                title: 'Nearby Risk & Incident Alerts',
                desc: 'Highlight severe weather, road closures, and verified safety reports within your alert radius.',
              },
              {
                key: 'fareAudits' as const,
                title: 'Transit Overcharge & Scam Advisories',
                desc: 'Notify when new tout warnings or transport fare alerts appear in your selected city.',
              },
              {
                key: 'communityUpdates' as const,
                title: 'Community Hazard Reports',
                desc: 'Include pending traveler-submitted advisories prior to moderator verification.',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={(e) => setPrefs((p) => ({ ...p, [item.key]: e.target.checked }))}
                  className="mt-1 w-4 h-4 accent-sky-600 rounded"
                />
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Alert Monitoring Radius: <span className="text-sky-600 dark:text-sky-400">{prefs.radiusKm} km</span>
            </label>
            <input
              type="range"
              min={1}
              max={50}
              value={prefs.radiusKm}
              onChange={(e) => setPrefs((p) => ({ ...p, radiusKm: Number(e.target.value) }))}
              className="w-full accent-sky-600"
            />
          </div>

          <button
            type="submit"
            disabled={savingPrefs}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold keep-white"
          >
            {savingPrefs ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      )}

      {/* ================================================================= */}
      {/* MODAL: SUBMIT TRAVEL RISK / HAZARD ALERT                          */}
      {/* ================================================================= */}
      {isRiskModalOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Report Road, Weather or Safety Risk
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isPrivileged
                    ? 'You can publish as Official/Verified Advisory or Community report.'
                    : 'Community submissions are labeled "Pending Review" until verified by moderators.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRiskModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitRiskAlert} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination / Highway *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRiskForm.destinationName}
                    onChange={(e) => setNewRiskForm((p) => ({ ...p, destinationName: e.target.value }))}
                    placeholder="e.g. Manali, NH-3"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hazard Category *
                  </label>
                  <select
                    value={newRiskForm.category}
                    onChange={(e) => setNewRiskForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {RISK_CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Severity *
                  </label>
                  <select
                    value={newRiskForm.severity}
                    onChange={(e) => setNewRiskForm((p) => ({ ...p, severity: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="LOW">Low Advisory</option>
                    <option value="MODERATE">Moderate Risk</option>
                    <option value="HIGH">High Risk</option>
                    <option value="CRITICAL">Critical Closure / Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Valid Duration
                  </label>
                  <select
                    value={newRiskForm.expiresInHours}
                    onChange={(e) => setNewRiskForm((p) => ({ ...p, expiresInHours: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="48">48 Hours</option>
                    <option value="168">7 Days</option>
                  </select>
                </div>
              </div>

              {isPrivileged && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Source Type
                    </label>
                    <select
                      value={newRiskForm.sourceType}
                      onChange={(e) => setNewRiskForm((p) => ({ ...p, sourceType: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="OFFICIAL">Official Advisory</option>
                      <option value="MODERATOR_VERIFIED">Moderator Verified</option>
                      <option value="COMMUNITY">Community</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Authority / Source Name
                    </label>
                    <input
                      type="text"
                      value={newRiskForm.sourceName}
                      onChange={(e) => setNewRiskForm((p) => ({ ...p, sourceName: e.target.value }))}
                      placeholder="e.g. IMD / BRO Highway Desk"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Headline *
                </label>
                <input
                  type="text"
                  required
                  value={newRiskForm.title}
                  onChange={(e) => setNewRiskForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Waterlogging & traffic diversion near Mall Road bypass"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Details & Alternate Route Guidance *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newRiskForm.description}
                  onChange={(e) => setNewRiskForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe affected stretch, timing, and safer alternatives..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRiskModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRisk}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold keep-white"
                >
                  {submittingRisk ? 'Submitting...' : 'Submit Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
