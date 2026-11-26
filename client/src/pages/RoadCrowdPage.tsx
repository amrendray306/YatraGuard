import React, { useState, useEffect } from 'react';
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
import { RoadCrowdReport, CrowdLevel } from '../types';
import { PageHeader, EmptyState, LoadingSkeleton } from '../components/ui';

const CATEGORIES = [
  { id: 'ALL', label: 'All Conditions' },
  { id: 'ROAD_CONDITION', label: 'Road Surface' },
  { id: 'TRAFFIC', label: 'Traffic Jam' },
  { id: 'CROWD', label: 'Crowd Level' },
  { id: 'ROAD_CLOSURE', label: 'Road Closure' },
  { id: 'CONSTRUCTION', label: 'Construction' },
  { id: 'ACCIDENT', label: 'Accident' },
];

export const RoadCrowdPage: React.FC = () => {
  const { cities, currentCity, userCoords } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reports, setReports] = useState<RoadCrowdReport[]>([]);
  const [crowdLevels, setCrowdLevels] = useState<CrowdLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [diffFilter, setDiffFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    cityId: '',
    locationName: '',
    category: 'TRAFFIC',
    difficulty: 'MODERATE',
    description: '',
    expiresInHours: '24',
  });

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchRoadCrowdReports({
        cityId: cityFilter,
        category: catFilter,
        difficulty: diffFilter,
        lat: userCoords.lat,
        lng: userCoords.lng,
      });
      setReports(res.reports || []);
      setCrowdLevels(res.crowdLevels || []);
    } catch {
      showToast('Failed to load road & crowd intelligence', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cityFilter, catFilter, diffFilter]);

  useEffect(() => {
    if (currentCity && !form.locationName) {
      setForm((p) => ({ ...p, cityId: currentCity.id, locationName: currentCity.name }));
    }
  }, [currentCity?.id]);

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
      const res = await createRoadCrowdReport({
        cityId: form.cityId || undefined,
        locationName: form.locationName.trim(),
        lat: matched?.lat ?? userCoords.lat,
        lng: matched?.lng ?? userCoords.lng,
        category: form.category,
        difficulty: form.difficulty,
        description: form.description.trim(),
        expiresInHours: parseInt(form.expiresInHours, 10) || 24,
      });
      showToast(res.message || 'Road update recorded', 'success');
      setIsModalOpen(false);
      setForm((p) => ({ ...p, description: '' }));
      loadData();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6 yg-page-enter">
      <PageHeader
        eyebrow="Transit & Sightseeing Conditions"
        icon={RouteIcon}
        accentColor="amber"
        title="Crowd & Road Intelligence"
        description="Peak attraction crowd hours, live road condition advisories, traffic bottlenecks, and closure updates."
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 keep-white yg-press"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Report Road / Crowd</span>
          </button>
        }
      />

      {/* Attraction Crowd Density Baselines */}
      {crowdLevels.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            Destination Crowd Timing Guide ({crowdLevels.length} Landmarks)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {crowdLevels.slice(0, 8).map((cl) => (
              <div key={cl.id} className="yg-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {cl.attractionName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>Best: <strong className="text-emerald-600 dark:text-emerald-400">{cl.bestVisitingHours}</strong></div>
                  <div>Peak: <strong className="text-amber-600 dark:text-amber-400">{cl.peakHours}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="yg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
        >
          <option value="ALL">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.state})
            </option>
          ))}
        </select>

        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <select
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
        >
          <option value="ALL">Any Road Difficulty</option>
          <option value="EASY">Easy / Clear</option>
          <option value="MODERATE">Moderate Delays</option>
          <option value="DIFFICULT">Difficult / Caution</option>
          <option value="BLOCKED">Blocked / Closed</option>
        </select>
      </div>

      {/* Live Road/Crowd Feed */}
      {loading ? (
        <LoadingSkeleton variant="list" count={3} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No Active Road or Crowd Updates"
          description="Help fellow travelers by reporting road closures, traffic jams, or crowd surges."
          actionLabel="Post Condition Update"
          onAction={() => setIsModalOpen(true)}
          accentColor="amber"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((rep) => (
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

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {rep.expiresAt
                    ? `Expires ${new Date(rep.expiresAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}`
                    : 'Active'}
                </span>

                <div className="flex items-center gap-1.5">
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

      {/* Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Post Road or Crowd Update</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400">
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

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
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
                  <option value="EASY">Easy</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="DIFFICULT">Difficult</option>
                  <option value="BLOCKED">Blocked</option>
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
