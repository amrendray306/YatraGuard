import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Clock,
  Compass,
  IndianRupee,
  Search,
  Filter,
  Flag,
  Share2,
  ThumbsUp,
  Eye,
  Navigation,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { fetchIncidents, verifyIncident, fetchNearbyAlerts } from '../services/api';

interface AlertsPageProps {
  onOpenReportModal: () => void;
  onNavigateToMap: (coords?: { lat: number; lng: number }) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onOpenReportModal,
  onNavigateToMap,
}) => {
  const { cities, currentCity, userCoords } = useCity();
  const { showToast } = useToast();

  const [incidents, setIncidents] = useState<any[]>([]);
  const [nearbyNotice, setNearbyNotice] = useState<string | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [filterType, setFilterType] = useState<string>('latest'); // 'latest' | 'nearby' | 'most_reported' | 'verified' | 'pending'
  const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Fetch alerts & incidents
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
      showToast('Failed to load live scam alerts', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check nearby alerts for top banner
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Verified Incident
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/60">
            <Clock className="w-3 h-3 text-amber-400" />
            Under Moderator Review
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            Outdated / Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-950/80 text-orange-300 border border-orange-700/60">
            <HelpCircle className="w-3 h-3 text-orange-400" />
            Pending Verification
          </span>
        );
    }
  };

  const getCategoryColor = (cat: string) => {
    if (cat.includes('overcharge') || cat.includes('fare')) return 'bg-amber-950/60 text-amber-400 border-amber-700/50';
    if (cat.includes('theft') || cat.includes('harassment') || cat.includes('unsafe')) return 'bg-red-950/60 text-red-400 border-red-700/50';
    if (cat.includes('scam') || cat.includes('fake')) return 'bg-orange-950/60 text-orange-400 border-orange-700/50';
    return 'bg-blue-950/60 text-blue-400 border-blue-700/50';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-red-400 mb-1">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>Real-Time Travel Vigilance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Community Scam & Safety Alert Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Live crowdsourced reports of touts, overcharging, fake operators, and unsafe locations. Every report is audited and distinguished by verification tier.
          </p>
        </div>

        {/* Primary Action: Report Scam */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToMap()}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>View Scam Map</span>
          </button>
          <button
            onClick={onOpenReportModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-red-900/40 transition-all flex items-center gap-2 active:scale-95 keep-white"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Report Scam / Incident</span>
          </button>
        </div>
      </div>

      {/* Nearby Active Incident Notice Banner */}
      {nearbyNotice && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-700/60 flex items-start sm:items-center justify-between gap-3 animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
              <AlertTriangle className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white">Local Perimeter Advisory</div>
              <p className="text-xs text-amber-300 font-medium">{nearbyNotice}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFilterType('nearby');
              setCurrentPage(1);
            }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-sm keep-white"
          >
            Show Nearby ({nearbyCount})
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        {/* Filter Pills */}
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
              onClick={() => {
                setFilterType(pill.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterType === pill.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Dropdowns & Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* City Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedCityId}
              onChange={(e) => {
                setSelectedCityId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Cities & Regions</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500 capitalize"
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

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by landmark, station, or tout pattern..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Incidents Feed Stream */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Loading live scam reports from database...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No Incident Reports Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No active incidents matching your filter criteria in this destination sector.
          </p>
          <button
            onClick={onOpenReportModal}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
          >
            Report First Incident
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing {incidents.length} of {totalCount} reported incidents</span>
            <span>Sorted by {filterType.replace('_', ' ')}</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md space-y-3.5"
              >
                {/* Header: Category Badge + Status + City */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border capitalize ${getCategoryColor(
                        inc.category
                      )}`}
                    >
                      {inc.category.replace(/_/g, ' ')}
                    </span>
                    {getStatusBadge(inc.status)}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <strong className="text-slate-200">{inc.cityName}</strong>, {inc.cityState}
                    </span>
                    {inc.distanceKm !== null && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/40">
                        {inc.distanceKm} km away
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">
                      {new Date(inc.incidentDate || inc.reportedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Main Content: Title & Description */}
                <div>
                  <h3 className="text-base font-black text-white">{inc.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1.5">{inc.description}</p>
                </div>

                {/* Specific Location Landmark */}
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <Navigation className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="truncate">{inc.address}</span>
                </div>

                {/* Financial Impact (if applicable) */}
                {(inc.amountDemanded || inc.amountPaid) && (
                  <div className="flex items-center gap-4 text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    {inc.amountDemanded && (
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Demanded</span>
                        <span className="font-extrabold text-red-400">₹{inc.amountDemanded}</span>
                      </div>
                    )}
                    {inc.amountPaid && (
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Actually Paid</span>
                        <span className="font-extrabold text-amber-400">₹{inc.amountPaid}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Controls: Community Verifications + Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    {/* Confirm Relevance */}
                    <button
                      onClick={() => handleCommunityAction(inc.id, 'CONFIRM_RELEVANT')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 font-bold transition-colors active:scale-95"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Still Relevant ({inc.confirmationsCount})</span>
                    </button>

                    {/* Mark Outdated */}
                    <button
                      onClick={() => handleCommunityAction(inc.id, 'MARK_OUTDATED')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-300 text-[11px] transition-colors"
                      title="Mark as no longer happening"
                    >
                      Mark Outdated
                    </button>

                    {/* Flag Inaccurate */}
                    <button
                      onClick={() => handleCommunityAction(inc.id, 'FLAG_INACCURATE')}
                      className="p-1.5 rounded-xl bg-slate-950 hover:bg-red-950/40 border border-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                      title="Flag as inaccurate / false"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* View on Map CTA */}
                  <button
                    onClick={() => onNavigateToMap({ lat: inc.lat, lng: inc.lng })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-xs transition-colors"
                  >
                    <span>View on Map</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="text-xs text-slate-400 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
