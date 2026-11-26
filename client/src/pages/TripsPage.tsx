import React, { useState, useEffect } from 'react';
import {
  Compass,
  PlusCircle,
  Share2,
  MapPin,
  Clock,
  Check,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  IndianRupee,
  Calendar,
  Trash2,
  Edit2,
  HeartPulse,
  CloudSun,
  Users,
  Save,
  Loader2,
  X,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchUserTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  generateSmartItinerary,
} from '../services/api';
import { Trip } from '../types';
import { PageHeader, EmptyState, LoadingSkeleton, ConfirmationModal } from '../components/ui';

interface PlannerStop {
  id: string;
  time: string;
  activity: string;
  location: string;
  transportMode: string;
  estimatedCost: number;
  safetyTip: string;
}

interface PlannerDay {
  dayNumber: number;
  date: string;
  title: string;
  stops: PlannerStop[];
}

const INTEREST_OPTIONS = [
  'Heritage',
  'Nature & Hills',
  'Adventure',
  'Spiritual',
  'Local Food',
  'Budget Travel',
];

export const TripsPage: React.FC = () => {
  const { currentCity } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'planner' | 'saved'>('planner');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Smart Planner Form Inputs
  const [originCity, setOriginCity] = useState('Delhi');
  const [destinationCity, setDestinationCity] = useState(currentCity?.name || 'Manali');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );
  const [travelersCount, setTravelersCount] = useState(2);
  const [totalBudget, setTotalBudget] = useState(8000);
  const [transportPref, setTransportPref] = useState('MIXED');
  const [interests, setInterests] = useState<string[]>(['Heritage', 'Local Food']);

  // Generated Plan State
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Add Stop Inline State
  const [addingDayNumber, setAddingDayNumber] = useState<number | null>(null);
  const [newStopText, setNewStopText] = useState('');
  const [newStopTime, setNewStopTime] = useState('04:00 PM');

  // Saved Trips View / Edit / Delete
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadTrips = () => {
    if (!user) return;
    setLoadingTrips(true);
    fetchUserTrips()
      .then(setTrips)
      .catch(() => {})
      .finally(() => setLoadingTrips(false));
  };

  useEffect(() => {
    loadTrips();
  }, [user]);

  useEffect(() => {
    if (currentCity?.name && !generatedPlan) {
      setDestinationCity(currentCity.name);
    }
  }, [currentCity?.name]);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((i) => i !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationCity.trim()) {
      showToast('Please enter a destination', 'error');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateSmartItinerary({
        originCity,
        destinationCity,
        startDate,
        endDate,
        travelersCount,
        totalBudget,
        transportPref,
        interests,
      });
      setGeneratedPlan(res.plan);
      showToast('Smart trip plan ready — customize any stop below!', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to generate trip plan', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddStopToDay = (dayNumber: number) => {
    if (!newStopText.trim() || !generatedPlan) return;
    const updatedDays = generatedPlan.days.map((d: PlannerDay) => {
      if (d.dayNumber !== dayNumber) return d;
      return {
        ...d,
        stops: [
          ...d.stops,
          {
            id: `custom-${Date.now()}`,
            time: newStopTime || '04:00 PM',
            activity: newStopText.trim(),
            location: generatedPlan.destinationCity,
            transportMode: 'Local Auto / Cab',
            estimatedCost: 0,
            safetyTip: 'Confirm fare or entry fees upfront.',
          },
        ],
      };
    });
    setGeneratedPlan({ ...generatedPlan, days: updatedDays });
    setNewStopText('');
    setAddingDayNumber(null);
  };

  const handleRemoveStopFromDay = (dayNumber: number, stopId: string) => {
    if (!generatedPlan) return;
    const updatedDays = generatedPlan.days.map((d: PlannerDay) => {
      if (d.dayNumber !== dayNumber) return d;
      return { ...d, stops: d.stops.filter((s) => s.id !== stopId) };
    });
    setGeneratedPlan({ ...generatedPlan, days: updatedDays });
  };

  const handleSaveGeneratedTrip = async () => {
    if (!user) {
      showToast('Please sign in to save trips to your account', 'error');
      return;
    }
    if (!generatedPlan) return;
    setSavingPlan(true);
    try {
      await createTrip({
        title: generatedPlan.title,
        originCity: generatedPlan.originCity,
        destinationCity: generatedPlan.destinationCity,
        startDate: generatedPlan.startDate,
        endDate: generatedPlan.endDate,
        travelersCount: generatedPlan.travelersCount,
        totalBudget: generatedPlan.estimatedExpenses?.totalBudget || totalBudget,
        transportPref: generatedPlan.transportPref,
        interests: generatedPlan.interests,
        itineraryData: {
          days: generatedPlan.days,
          estimatedExpenses: generatedPlan.estimatedExpenses,
          nearbyMedical: generatedPlan.nearbyMedical,
          estimatedJourneyDuration: generatedPlan.estimatedJourneyDuration,
        },
      });
      showToast('Trip & itinerary saved to My Trips!', 'success');
      loadTrips();
      setActiveTab('saved');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to save trip', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleSaveEditedTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    try {
      await updateTrip(editingTrip.id, {
        title: editingTrip.title,
        originCity: editingTrip.originCity,
        destinationCity: editingTrip.destinationCity,
        startDate: editingTrip.startDate,
        endDate: editingTrip.endDate,
        totalBudget: editingTrip.totalBudget,
        status: editingTrip.status,
      });
      showToast('Trip updated successfully', 'success');
      setEditingTrip(null);
      loadTrips();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to update trip', 'error');
    }
  };

  const handleConfirmDeleteTrip = async () => {
    if (!deleteTripId) return;
    setDeletingTrip(true);
    try {
      await deleteTrip(deleteTripId);
      showToast('Trip deleted', 'info');
      if (selectedTrip?.id === deleteTripId) setSelectedTrip(null);
      setDeleteTripId(null);
      loadTrips();
    } catch {
      showToast('Failed to delete trip', 'error');
    } finally {
      setDeletingTrip(false);
    }
  };

  const getShareLink = (token: string) => `${window.location.origin}/?tab=share&token=${token}`;

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getShareLink(token));
    setCopiedToken(token);
    showToast('Live trip share link copied!', 'success');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16 yg-page-enter">
      <PageHeader
        eyebrow="Plan Smart & Stay Safe"
        icon={Compass}
        accentColor="blue"
        title="Smart Trip Planner"
        description="Build customizable day-wise itineraries with estimated budgets, medical contacts, weather & safety checks."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                activeTab === 'planner'
                  ? 'bg-sky-600 text-white border-sky-600 keep-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              Plan New Trip
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                activeTab === 'saved'
                  ? 'bg-sky-600 text-white border-sky-600 keep-white'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              My Saved Trips ({trips.length})
            </button>
          </div>
        }
      />

      {/* TAB 1: SMART PLANNER */}
      {activeTab === 'planner' && (
        <div className="space-y-6">
          <form onSubmit={handleGenerate} className="yg-card p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Starting Location
                </label>
                <input
                  type="text"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder="e.g. Delhi, Mumbai"
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination *
                </label>
                <input
                  type="text"
                  required
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  placeholder="e.g. Manali, Jaipur, Goa"
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transport Preference
                </label>
                <select
                  value={transportPref}
                  onChange={(e) => setTransportPref(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="MIXED">Balanced (Bus / Auto / Cab)</option>
                  <option value="PUBLIC_TRANSIT">Budget Public Transit</option>
                  <option value="CAB">Private Cab / Taxi</option>
                  <option value="BIKE_RENTAL">Two-Wheeler / Scooter</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Travellers
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={travelersCount}
                    onChange={(e) => setTravelersCount(Number(e.target.value))}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Budget (₹)
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Travel Interests
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_OPTIONS.map((tag) => {
                  const active = interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-sky-600 text-white border-sky-600 keep-white'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={generating}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2 keep-white yg-press disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Building Smart Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    <span>Generate Smart Itinerary</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* GENERATED RESULT */}
          {generatedPlan && (
            <div className="space-y-5 yg-page-enter">
              {/* Overview & Save Header */}
              <div className="yg-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold">
                      {generatedPlan.daysCount} Days • {generatedPlan.travelersCount} Traveller(s)
                    </span>
                    {generatedPlan.safetyScore && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
                        Safety Index: {generatedPlan.safetyScore}/100
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {generatedPlan.title}
                  </h2>
                  {generatedPlan.estimatedJourneyDuration && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                      <span>{generatedPlan.estimatedJourneyDuration}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={savingPlan}
                  onClick={handleSaveGeneratedTrip}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 keep-white yg-press disabled:opacity-60 flex-shrink-0"
                >
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>{savingPlan ? 'Saving...' : 'Save to My Trips'}</span>
                </button>
              </div>

              {/* Estimated Budget + Weather + Medical */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="yg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                      Estimated Budget Split
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Estimated
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block">Transport</span>
                      <strong className="text-slate-900 dark:text-white">
                        ~₹{generatedPlan.estimatedExpenses?.breakdown?.transportation?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block">Food</span>
                      <strong className="text-slate-900 dark:text-white">
                        ~₹{generatedPlan.estimatedExpenses?.breakdown?.food?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block">Stay</span>
                      <strong className="text-slate-900 dark:text-white">
                        ~₹{generatedPlan.estimatedExpenses?.breakdown?.accommodation?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 block">Activities/Buffer</span>
                      <strong className="text-slate-900 dark:text-white">
                        ~₹{generatedPlan.estimatedExpenses?.breakdown?.activitiesAndBuffer?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {generatedPlan.estimatedExpenses?.note}
                  </p>
                </div>

                <div className="yg-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CloudSun className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    Weather &amp; Safety Warnings
                  </h3>
                  {generatedPlan.weather ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {generatedPlan.weather.temp}°C • {generatedPlan.weather.condition}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">
                        Rain chance: {generatedPlan.weather.rainChance}% • Wind: {generatedPlan.weather.windKmh} km/h
                      </div>
                      {generatedPlan.weather.alertMessage && (
                        <div className="text-amber-700 dark:text-amber-300 font-medium">
                          {generatedPlan.weather.alertMessage}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live weather forecast unavailable for this destination—verify local weather advisories before departure.
                    </p>
                  )}

                  {generatedPlan.safetyAlerts?.length > 0 && (
                    <div className="space-y-1.5">
                      {generatedPlan.safetyAlerts.slice(0, 2).map((a: any) => (
                        <div
                          key={a.id}
                          className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-[11px] text-red-700 dark:text-red-300"
                        >
                          ⚠ {a.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="yg-card p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Nearby Medical &amp; Police
                  </h3>
                  <div className="space-y-2 text-xs">
                    {[
                      ...(generatedPlan.nearbyMedical?.hospitals || []).slice(0, 2),
                      ...(generatedPlan.nearbyMedical?.pharmacies || []).slice(0, 1),
                    ].map((svc: any) => (
                      <div
                        key={svc.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                          {svc.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {svc.address} {svc.phone ? `• ${svc.phone}` : ''}
                        </div>
                      </div>
                    ))}
                    {(generatedPlan.nearbyMedical?.hospitals?.length || 0) === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Emergency Ambulance: <strong>108</strong> • Police: <strong>112</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Day-Wise Editable Itinerary */}
              <div className="space-y-4">
                {generatedPlan.days?.map((day: PlannerDay) => (
                  <div key={day.dayNumber} className="yg-card p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {day.title}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{day.date}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAddingDayNumber(addingDayNumber === day.dayNumber ? null : day.dayNumber)
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                        <span>Add Destination</span>
                      </button>
                    </div>

                    {addingDayNumber === day.dayNumber && (
                      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          value={newStopTime}
                          onChange={(e) => setNewStopTime(e.target.value)}
                          placeholder="Time (e.g. 04:00 PM)"
                          className="w-28 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          value={newStopText}
                          onChange={(e) => setNewStopText(e.target.value)}
                          placeholder="Place or activity name..."
                          className="flex-1 min-w-[180px] rounded-lg px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddStopToDay(day.dayNumber)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold keep-white"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {day.stops.map((stop) => (
                        <div
                          key={stop.id}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                                {stop.time}
                              </span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {stop.activity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {stop.transportMode} • Est. ~₹{stop.estimatedCost} • {stop.safetyTip}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveStopFromDay(day.dayNumber, stop.id)}
                            aria-label={`Remove ${stop.activity}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 self-end sm:self-center"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED TRIPS */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {!user ? (
            <EmptyState
              icon={Users}
              title="Sign in to view saved trips"
              description="Save generated itineraries, track trip expenses, and generate family share links."
              accentColor="blue"
            />
          ) : loadingTrips ? (
            <LoadingSkeleton variant="card" count={3} />
          ) : trips.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No saved trips yet"
              description="Generate a smart itinerary and save it to manage stops, budgets, and share links."
              actionLabel="Plan a Trip"
              onAction={() => setActiveTab('planner')}
              accentColor="blue"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trips.map((trip) => (
                <div key={trip.id} className="yg-card p-5 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                          trip.status === 'ACTIVE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {trip.status}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        {trip.startDate} – {trip.endDate}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {trip.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                        {trip.originCity ? `${trip.originCity} → ` : ''}
                        {trip.destinationCity}
                      </span>
                      {trip.totalBudget && (
                        <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <IndianRupee className="w-3.5 h-3.5" aria-hidden="true" />
                          Budget: ₹{trip.totalBudget.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(trip.shareToken)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                      >
                        {copiedToken === trip.shareToken ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                        )}
                        <span>{copiedToken === trip.shareToken ? 'Copied' : 'Share'}</span>
                      </button>

                      <a
                        href={getShareLink(trip.shareToken)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingTrip(trip)}
                        aria-label={`Edit ${trip.title}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTripId(trip.id)}
                        aria-label={`Delete ${trip.title}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/50 text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT TRIP MODAL */}
      {editingTrip && (
        <div className="fixed inset-0 z-[200] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditedTrip}
            className="yg-card w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Trip Details</h3>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editingTrip.title}
                  onChange={(e) => setEditingTrip({ ...editingTrip, title: e.target.value })}
                  className="w-full rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={editingTrip.totalBudget || ''}
                    onChange={(e) =>
                      setEditingTrip({
                        ...editingTrip,
                        totalBudget: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editingTrip.status}
                    onChange={(e) => setEditingTrip({ ...editingTrip, status: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold keep-white"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteTripId)}
        title="Delete this trip?"
        description="This deletes the saved itinerary and disables its share link."
        confirmLabel="Delete Trip"
        cancelLabel="Keep Trip"
        tone="danger"
        isLoading={deletingTrip}
        onConfirm={handleConfirmDeleteTrip}
        onCancel={() => setDeleteTripId(null)}
      />
    </div>
  );
};
