import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Car,
  Bus,
  ShieldCheck,
  Clock,
  Navigation,
  Compass,
  ArrowRight,
  TrendingDown,
  Info,
  SlidersHorizontal,
  PlusCircle,
  HelpCircle,
  Share2,
  FileText,
  Mountain,
  Moon,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import {
  estimateFare,
  auditOvercharge,
  submitCommunityFareReport,
  fetchCommunityFareReports,
} from '../services/api';
import {
  MultiModalFareResult,
  TransitOptionEstimate,
  OverchargeAuditResult,
  CommunityFareReport,
} from '../types';

export const FareIntelligencePage: React.FC = () => {
  const { cities, currentCity, setCity } = useCity();

  // Search & Calculation state
  const [origin, setOrigin] = useState<string>('Mall Road');
  const [destination, setDestination] = useState<string>('Solang Valley');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [travelHour, setTravelHour] = useState<number>(new Date().getHours());
  const [hasLuggage, setHasLuggage] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [fareResult, setFareResult] = useState<MultiModalFareResult | null>(null);
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY');
  const [waitingHours, setWaitingHours] = useState<number>(2);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);
  const [selectedCircular, setSelectedCircular] = useState<TransitOptionEstimate | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhrase(id);
    setTimeout(() => setCopiedPhrase(null), 2500);
  };

  // Overcharge Checker state
  const [auditMode, setAuditMode] = useState<string>('LOCAL_TAXI');
  const [quotedFare, setQuotedFare] = useState<string>('1200');
  const [auditing, setAuditing] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<OverchargeAuditResult | null>(null);

  // Community Reports state
  const { showToast } = useToast();
  const [communityReports, setCommunityReports] = useState<CommunityFareReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportOrigin, setReportOrigin] = useState<string>('');
  const [reportDestination, setReportDestination] = useState<string>('');
  const [reportDistance, setReportDistance] = useState<string>('10');
  const [reportActualFare, setReportActualFare] = useState<string>('200');
  const [reportQuotedFare, setReportQuotedFare] = useState<string>('');
  const [reportMode, setReportMode] = useState<string>('AUTO');
  const [reportComments, setReportComments] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const openReportModal = () => {
    if (origin && !reportOrigin) setReportOrigin(origin);
    if (destination && !reportDestination) setReportDestination(destination);
    if (distanceKm && (!reportDistance || reportDistance === '10')) setReportDistance(distanceKm);
    setReportError(null);
    setIsReportModalOpen(true);
  };

  // Quick Corridors dictionary for one-click testing
  const quickCorridors: Record<string, Array<{ label: string; origin: string; dest: string; dist?: string }>> = {
    Manali: [
      { label: 'Mall Road ➔ Solang Valley (13.5 km)', origin: 'Mall Road', dest: 'Solang Valley', dist: '13.5' },
      { label: 'Mall Road ➔ Rohtang Pass (51 km)', origin: 'Mall Road', dest: 'Rohtang Pass', dist: '51.0' },
      { label: 'Mall Road ➔ Hadimba Temple (2.2 km)', origin: 'Mall Road', dest: 'Hadimba Temple', dist: '2.2' },
      { label: 'Mall Road ➔ Atal Tunnel (28 km)', origin: 'Mall Road', dest: 'Atal Tunnel', dist: '28.0' },
    ],
    Haridwar: [
      { label: 'Haridwar Rly Stn ➔ Rishikesh (28 km)', origin: 'Haridwar Railway Station', dest: 'Rishikesh', dist: '28.0' },
      { label: 'Haridwar Rly Stn ➔ Har Ki Pauri (2.5 km)', origin: 'Haridwar Railway Station', dest: 'Har Ki Pauri', dist: '2.5' },
    ],
    Rishikesh: [
      { label: 'Rishikesh Natraj Chowk ➔ Tapovan (4.5 km)', origin: 'Natraj Chowk', dest: 'Tapovan', dist: '4.5' },
      { label: 'Ram Jhula ➔ Shivpuri Rafting (16 km)', origin: 'Ram Jhula', dest: 'Shivpuri', dist: '16.0' },
    ],
    Delhi: [
      { label: 'IGI Airport T3 ➔ Connaught Place (18 km)', origin: 'Delhi Airport', dest: 'Connaught Place', dist: '18.0' },
      { label: 'New Delhi Rly Stn ➔ India Gate (5.5 km)', origin: 'New Delhi Railway Station', dest: 'India Gate', dist: '5.5' },
      { label: 'Connaught Place ➔ Qutub Minar (15 km)', origin: 'Connaught Place', dest: 'Qutub Minar', dist: '15.0' },
    ],
    Mumbai: [
      { label: 'Mumbai Airport ➔ Marine Drive (22 km)', origin: 'Mumbai Airport', dest: 'Marine Drive', dist: '22.0' },
      { label: 'CSMT Railway Stn ➔ Gateway of India (2.5 km)', origin: 'Chhatrapati Shivaji Terminus', dest: 'Gateway of India', dist: '2.5' },
    ],
  };

  // Sync corridor presets when currentCity changes
  useEffect(() => {
    if (currentCity?.name === 'Manali') {
      setOrigin('Mall Road');
      setDestination('Solang Valley');
      setDistanceKm('13.5');
      setQuotedFare('1400');
    } else if (currentCity?.name === 'Haridwar') {
      setOrigin('Haridwar Railway Station');
      setDestination('Rishikesh');
      setDistanceKm('28.0');
      setQuotedFare('1200');
    } else if (currentCity?.name === 'Delhi') {
      setOrigin('IGI Airport');
      setDestination('Connaught Place');
      setDistanceKm('18.0');
      setQuotedFare('900');
    }

    handleCalculateFares();
    loadCommunityReports();
  }, [currentCity]);

  const loadCommunityReports = async () => {
    try {
      const reports = await fetchCommunityFareReports(currentCity?.id);
      setCommunityReports(reports || []);
    } catch (err) {
      console.error('Error fetching community reports:', err);
    }
  };

  const handleCalculateFares = async (customOrigin?: string, customDest?: string, customDist?: string, forceTripType?: 'ONE_WAY' | 'ROUND_TRIP') => {
    setLoading(true);
    setAuditResult(null); // Reset audit until recalculated
    try {
      const activeOrigin = customOrigin || origin;
      const activeDest = customDest || destination;
      const activeDist = customDist !== undefined ? customDist : distanceKm;
      const activeTripType = forceTripType || tripType;

      const baseDistance = activeDist ? parseFloat(activeDist) : undefined;
      const effectiveDistance = baseDistance ? (activeTripType === 'ROUND_TRIP' ? baseDistance * 2 : baseDistance) : undefined;

      const res = await estimateFare({
        cityId: currentCity?.id,
        cityName: currentCity?.name,
        origin: activeOrigin,
        destination: activeDest,
        distanceKm: effectiveDistance,
        travelHour,
        hasLuggage,
      });

      // If Round-Trip, incorporate waiting charges into options
      if (res && activeTripType === 'ROUND_TRIP') {
        res.options = res.options.map((opt: TransitOptionEstimate) => {
          const isBusOrMetro = opt.transportModeId.includes('BUS') || opt.transportModeId === 'METRO';
          const hourlyWaitingRate = opt.transportModeId === 'AUTO' || opt.transportModeId === 'E_RICKSHAW' ? 100 : 150;
          const totalWaitingCost = isBusOrMetro ? 0 : hourlyWaitingRate * waitingHours;

          return {
            ...opt,
            minFare: opt.minFare + totalWaitingCost,
            avgFare: opt.avgFare + totalWaitingCost,
            maxFare: opt.maxFare + totalWaitingCost,
            notes: isBusOrMetro
              ? opt.notes
              : `${opt.notes ? opt.notes + ' • ' : ''}Includes ${waitingHours} hrs union waiting allowance (₹${totalWaitingCost})`,
          };
        });
      }

      setFareResult(res);
      if (res?.options?.length > 0) {
        setAuditMode(res.options[0].transportModeId);
      }
    } catch (err) {
      console.error('Failed to estimate fares:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuditQuotedFare = async () => {
    if (!quotedFare || isNaN(parseFloat(quotedFare))) return;
    setAuditing(true);
    try {
      const res = await auditOvercharge({
        cityId: currentCity?.id,
        cityName: currentCity?.name,
        transportModeId: auditMode,
        quotedFare: parseFloat(quotedFare),
        distanceKm: fareResult?.tripDetails?.distanceKm || (distanceKm ? parseFloat(distanceKm) : undefined),
        origin,
        destination,
        travelHour,
      });
      setAuditResult(res);
    } catch (err) {
      console.error('Failed to audit quote:', err);
    } finally {
      setAuditing(false);
    }
  };

  const handleSubmitCommunityReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);

    const activeCity = currentCity || cities[0];
    if (!activeCity?.id) {
      setReportError('Please select a destination city first.');
      showToast('Please select a destination city first.', 'error');
      return;
    }
    if (!reportOrigin.trim() || !reportDestination.trim()) {
      setReportError('Please enter pickup origin and destination.');
      showToast('Please enter pickup origin and destination.', 'error');
      return;
    }
    if (!reportDistance || parseFloat(reportDistance) <= 0) {
      setReportError('Please enter a valid trip distance (km).');
      showToast('Please enter a valid trip distance (km).', 'error');
      return;
    }
    if (!reportActualFare || parseFloat(reportActualFare) <= 0) {
      setReportError('Please enter the fare paid in ₹.');
      showToast('Please enter the fare paid in ₹.', 'error');
      return;
    }

    setSubmittingReport(true);
    setReportSuccess(null);
    try {
      await submitCommunityFareReport({
        cityId: activeCity.id,
        transportModeId: reportMode,
        originName: reportOrigin.trim(),
        destinationName: reportDestination.trim(),
        distanceKm: parseFloat(reportDistance),
        actualFarePaid: parseFloat(reportActualFare),
        quotedFare: reportQuotedFare ? parseFloat(reportQuotedFare) : undefined,
        wasOvercharged: Boolean(reportQuotedFare && parseFloat(reportQuotedFare) > parseFloat(reportActualFare)),
        comments: reportComments.trim() || undefined,
      });

      showToast('🎉 Thank you! Your fare submission is live in Community Intelligence.', 'success');
      setIsReportModalOpen(false);
      setReportOrigin('');
      setReportDestination('');
      setReportQuotedFare('');
      setReportComments('');
      await loadCommunityReports();
    } catch (err: any) {
      console.error('Failed to submit community report:', err);
      const msg = err.response?.data?.error || 'Failed to submit community fare report. Please check your inputs.';
      setReportError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const getModeIcon = (modeId: string) => {
    switch (modeId) {
      case 'AUTO':
      case 'E_RICKSHAW':
        return <Car className="w-5 h-5 text-amber-400" />;
      case 'LOCAL_TAXI':
        return <Car className="w-5 h-5 text-yellow-400" />;
      case 'PRIVATE_CAB':
        return <Car className="w-5 h-5 text-sky-400" />;
      case 'SHARED_TAXI':
        return <Car className="w-5 h-5 text-purple-400" />;
      case 'LOCAL_BUS':
      case 'GOVT_BUS':
        return <Bus className="w-5 h-5 text-emerald-400" />;
      case 'METRO':
        return <Navigation className="w-5 h-5 text-cyan-400" />;
      default:
        return <Car className="w-5 h-5 text-slate-300" />;
    }
  };

  const getSourceBadge = (sourceType: string) => {
    switch (sourceType) {
      case 'OFFICIAL_GOVT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800">
            Official Govt Tariff
          </span>
        );
      case 'UNION_NOTIFIED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-950/90 text-blue-300 border border-blue-800">
            Union Approved Tariff
          </span>
        );
      case 'COMMUNITY_BENCHMARK':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-950/90 text-purple-300 border border-purple-800">
            Community Verified
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800">
            Estimated Guideline
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-20">
      {/* Header Banner */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-xs font-bold text-amber-300">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Flagship Transparency Engine</span>
              <span className="text-amber-600">•</span>
              <span>City-Specific Tariffs</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Local Transportation Fare Intelligence
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Transparent, government-notified, and union-approved fare estimation for any destination in India.
              Never get overcharged by unregistered touts, off-meter taxis, or private autos.
            </p>
          </div>

          {/* City Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-lg">
              <Compass className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Selected City:</span>
                <select
                  value={currentCity?.id || ''}
                  onChange={(e) => {
                    const sel = cities.find((c) => c.id === e.target.value);
                    if (sel) setCity(sel);
                  }}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={openReportModal}
              className="px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-900/30 transition-all hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report What You Paid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Corridor Selection */}
      {quickCorridors[currentCity?.name || ''] && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Popular {currentCity?.name} Tourist Corridors (Click to Load):
          </div>
          <div className="flex flex-wrap gap-2">
            {quickCorridors[currentCity?.name || ''].map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setOrigin(q.origin);
                  setDestination(q.dest);
                  if (q.dist) setDistanceKm(q.dist);
                  handleCalculateFares(q.origin, q.dest, q.dist);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all hover:border-amber-500/50 flex items-center gap-1.5"
              >
                <span>{q.label}</span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Calculation Bar */}
      <div className="glass-panel-elevated rounded-3xl p-5 border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pickup / Origin</label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Mall Road or Haridwar Rly Stn"
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Solang Valley or Rishikesh"
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Distance (km) <span className="text-slate-500 font-normal">(Auto-calculated if blank)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="e.g. 13.5"
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => handleCalculateFares()}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-md shadow-amber-900/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Calculating...</span>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Calculate Fares</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filters and Context Options */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Trip Type Selector: One-Way vs Round-Trip with Waiting */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTripType('ONE_WAY');
                  handleCalculateFares(undefined, undefined, undefined, 'ONE_WAY');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  tripType === 'ONE_WAY'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                One-Way
              </button>
              <button
                type="button"
                onClick={() => {
                  setTripType('ROUND_TRIP');
                  handleCalculateFares(undefined, undefined, undefined, 'ROUND_TRIP');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  tripType === 'ROUND_TRIP'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Round-Trip + Waiting</span>
              </button>
            </div>

            {tripType === 'ROUND_TRIP' && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-amber-900/40">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 text-xs">Waiting:</span>
                <select
                  value={waitingHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setWaitingHours(val);
                    handleCalculateFares();
                  }}
                  className="bg-transparent border-none text-amber-300 font-bold text-xs focus:ring-0 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 8].map((h) => (
                    <option key={h} value={h} className="bg-slate-950 text-white">
                      {h} {h === 1 ? 'Hour' : 'Hours'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Travel Hour:</span>
              <select
                value={travelHour}
                onChange={(e) => setTravelHour(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs font-semibold"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12:00 AM (Night Surcharge)' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                    {i >= 23 || i < 5 ? ' 🌙 Night Surcharge' : ''}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasLuggage}
                onChange={(e) => setHasLuggage(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-0"
              />
              <span className="text-slate-300">Luggage (+₹10-20 bag)</span>
            </label>
          </div>

          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Night surcharge (20-25%) applies between 11 PM and 5 AM</span>
          </div>
        </div>
      </div>

      {/* Main Results Container */}
      {fareResult && (
        <div className="space-y-6">
          {/* Trip Summary Card */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <Navigation className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>{fareResult.tripDetails.origin}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>{fareResult.tripDetails.destination}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  City: <span className="text-slate-200 font-semibold">{fareResult.city.name}</span> • Road Distance: <span className="text-amber-400 font-bold">{fareResult.tripDetails.distanceKm} km</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tripType === 'ROUND_TRIP' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Round-Trip + {waitingHours}h Waiting Included
                </span>
              )}
              {fareResult.tripDetails.isNightTime && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  Night Surcharge Active (+20-25%)
                </span>
              )}
              {fareResult.tripDetails.isMountainTerrain && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5" />
                  Himalayan Mountain Terrain (+20% Gradient Factor)
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Local Transportation Comparison Grid & Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-400" />
                Available Transportation Options & Estimated Fares
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                {fareResult.options.length} Modes Configured for {fareResult.city.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fareResult.options.map((opt) => (
                <div
                  key={opt.transportModeId}
                  className="glass-panel-elevated rounded-3xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 bg-slate-900/60"
                >
                  <div className="space-y-3">
                    {/* Mode Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-800 rounded-xl">
                          {getModeIcon(opt.transportModeId)}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-white">
                            {opt.displayName}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {opt.vehicleType} • {opt.isMetered ? 'Meter Enforced' : 'Fixed / Surcharge tariff'}
                          </span>
                        </div>
                      </div>

                      {getSourceBadge(opt.sourceType)}
                    </div>

                    {/* Fare Block */}
                    <div className="bg-slate-950/90 rounded-2xl p-3.5 border border-slate-800/80 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-400">Estimated Fair Range:</span>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-400">
                            ₹{opt.minFare} – ₹{opt.maxFare}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/70">
                        <span className="text-slate-400">Expected Average:</span>
                        <span className="font-extrabold text-white text-sm">
                          ₹{opt.avgFare}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Est. Duration:</span>
                        <span className="font-bold text-slate-300">~{opt.estimatedDurationMin} mins</span>
                      </div>
                    </div>

                    {/* Breakdown Details */}
                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Base Drop:</span>
                        <span className="text-slate-300">₹{opt.baseFare} (first {opt.baseDistanceKm} km)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rate per km:</span>
                        <span className="text-slate-300">₹{opt.perKmRate} / km</span>
                      </div>
                      {opt.communityReportCount > 0 && opt.communityAvgPaid && (
                        <div className="flex justify-between text-amber-300 font-medium">
                          <span>Community Reported Avg:</span>
                          <span>₹{opt.communityAvgPaid} ({opt.communityReportCount} reports)</span>
                        </div>
                      )}
                    </div>

                    {/* Official Notes / Statutory Reference */}
                    {opt.officialCircularRef && (
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[10px] text-slate-400 leading-relaxed flex items-center justify-between gap-2">
                        <div className="truncate">
                          <span className="font-bold text-slate-300">Tariff:</span> {opt.officialCircularRef}
                        </div>
                        <button
                          onClick={() => setSelectedCircular(opt)}
                          className="text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1 flex-shrink-0"
                          title="View statutory legal backing & consumer rights"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Law</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      Reliability: <span className="text-emerald-400 font-bold">{opt.reliabilityScore}%</span>
                    </span>
                    <button
                      onClick={() => {
                        setAuditMode(opt.transportModeId);
                        const element = document.getElementById('overcharge-detector');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                    >
                      <span>Audit Driver Quote</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Overcharging Detection Tool (Flagship Feature) */}
          <div
            id="overcharge-detector"
            className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-xs font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Real-Time Scam & Overcharge Protection</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Driver Fare Quote Audit Tool
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Did a taxi, auto, or cab driver quote a price? Enter it below to check whether you are being overcharged.
                </p>
              </div>

              <div className="text-xs text-slate-400 italic bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                Covers route: {fareResult.tripDetails.origin} ➔ {fareResult.tripDetails.destination} ({fareResult.tripDetails.distanceKm} km)
              </div>
            </div>

            {/* Input Bar for Driver Quote */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Vehicle Type
                </label>
                <select
                  value={auditMode}
                  onChange={(e) => setAuditMode(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  {fareResult.options.map((opt) => (
                    <option key={opt.transportModeId} value={opt.transportModeId}>
                      {opt.displayName} (Fair: ₹{opt.minFare}–₹{opt.maxFare})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Driver Quoted Fare (₹)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={quotedFare}
                    onChange={(e) => setQuotedFare(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-3 text-base font-extrabold text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAuditQuotedFare}
                  disabled={auditing}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-900/40 transition-all flex items-center justify-center gap-2"
                >
                  {auditing ? (
                    <span>Auditing Quote...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Audit Driver's Quote</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Audit Result Display */}
            {auditResult && (
              <div
                className={`rounded-2xl p-5 border transition-all ${
                  auditResult.verdict === 'FAIR'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                    : auditResult.verdict === 'SLIGHTLY_ELEVATED'
                    ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                    : 'bg-red-950/50 border-red-800 text-red-200'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {auditResult.isOvercharge ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-wider shadow">
                          ⚠️ Potential Overcharging Detected
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white uppercase tracking-wider shadow">
                          ✅ Fair & Reasonable Fare
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-300">
                        Mode: {auditResult.transportMode}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white mt-2 leading-relaxed">
                      {auditResult.warningMessage}
                    </p>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      💡 <span className="font-bold text-white">Recommended Action:</span> {auditResult.recommendedAction}
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 w-full sm:w-auto sm:min-w-[200px] text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Driver Quote vs Fair Range</span>
                    <div className="text-xl font-black text-white">
                      ₹{auditResult.quotedFare}
                    </div>
                    <div className="text-xs font-bold text-emerald-400">
                      Fair: ₹{auditResult.expectedFare.min} – ₹{auditResult.expectedFare.max}
                    </div>
                    {auditResult.differencePercentage > 0 && (
                      <div className="text-[11px] font-bold text-red-400">
                        +{auditResult.differencePercentage}% above expected
                      </div>
                    )}
                  </div>
                </div>

                {/* Tactical Driver Negotiation Assistant (Smart Scripts) */}
                {auditResult.isOvercharge && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          Driver Negotiation Assistant (1-Click Safe Phrases)
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Polite, assertive scripts to settle at government fair rate
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Hindi Negotiation Script */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                            <span>🇮🇳 Hindi (Local Spoken)</span>
                            <span className="bg-amber-950/60 px-1.5 py-0.5 rounded text-[9px] border border-amber-800/40">Recommended</span>
                          </div>
                          <p className="text-xs text-white mt-1.5 italic font-semibold">
                            "Bhaiya, YatraGuard par official rate ₹{auditResult.expectedFare.min} se ₹{auditResult.expectedFare.max} hai. Hum ₹{auditResult.expectedFare.avg} de denge, chaliye?"
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            (Brother, official government tariff is ₹{auditResult.expectedFare.min}–₹{auditResult.expectedFare.max}. We will pay fair rate ₹{auditResult.expectedFare.avg}.)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`Bhaiya, YatraGuard par official rate ₹${auditResult.expectedFare.min} se ₹${auditResult.expectedFare.max} hai. Hum ₹${auditResult.expectedFare.avg} de denge, chaliye?`, 'hi')}
                          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 transition-colors touch-min"
                        >
                          {copiedPhrase === 'hi' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedPhrase === 'hi' ? 'Copied to Clipboard!' : 'Copy Hindi Negotiation Phrase'}</span>
                        </button>
                      </div>

                      {/* English Negotiation Script */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400">
                            <span>🌐 English (Formal Assertion)</span>
                            <span className="bg-cyan-950/60 px-1.5 py-0.5 rounded text-[9px] border border-cyan-800/40">Prepaid Counter Alternative</span>
                          </div>
                          <p className="text-xs text-white mt-1.5 italic font-semibold">
                            "Sir, government notified tariff is ₹{auditResult.expectedFare.min}–₹{auditResult.expectedFare.max}. Let's agree on ₹{auditResult.expectedFare.avg} or take a prepaid booth slip."
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            (Official Traffic Police prepaid counters at stations and airports protect this rate)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`Sir, the government notified tariff for this route is ₹${auditResult.expectedFare.min}–₹${auditResult.expectedFare.max}. Let's agree on ₹${auditResult.expectedFare.avg} or take a prepaid booth slip.`, 'en')}
                          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors touch-min"
                        >
                          {copiedPhrase === 'en' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedPhrase === 'en' ? 'Copied to Clipboard!' : 'Copy English Negotiation Phrase'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed italic">
                  {auditResult.disclaimer}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Verified Community Reported Fares */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-400" />
                  Community Fare Intelligence ({currentCity?.name})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual fares paid and submitted by real travelers to prevent local transit scams
                </p>
              </div>

              <button
                onClick={openReportModal}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Fare</span>
              </button>
            </div>

            {communityReports.length === 0 ? (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                No community fare submissions yet for {currentCity?.name}. Be the first traveler to contribute!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communityReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3 bg-slate-900/50 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        {rep.transportMode?.displayName || rep.transportModeId}
                      </span>
                      {rep.wasOvercharged ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                          ⚠️ Overcharged Quote Prevented
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ✅ Fair Price Paid
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-white font-extrabold flex items-center gap-1.5">
                      <span>{rep.originName}</span>
                      <ArrowRight className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span>{rep.destinationName}</span>
                    </div>

                    <div className="flex items-baseline justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Actual Paid:</span>
                        <span className="text-base font-black text-emerald-400">₹{rep.actualFarePaid}</span>
                      </div>
                      {rep.quotedFare && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Initial Quote:</span>
                          <span className="text-xs font-bold line-through text-red-400">₹{rep.quotedFare}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Distance:</span>
                        <span className="text-xs font-bold text-slate-200">{rep.distanceKm} km</span>
                      </div>
                    </div>

                    {rep.comments && (
                      <p className="text-[11px] text-slate-400 italic">
                        "{rep.comments}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Community Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-400" />
                Submit What You Paid ({currentCity?.name})
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Your real trip cost helps maintain fair pricing benchmarks for fellow tourists and travelers.
            </p>

            {reportError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCommunityReport} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Origin Pickup</label>
                  <input
                    type="text"
                    required
                    value={reportOrigin}
                    onChange={(e) => setReportOrigin(e.target.value)}
                    placeholder="e.g. Mall Road Stand"
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Destination</label>
                  <input
                    type="text"
                    required
                    value={reportDestination}
                    onChange={(e) => setReportDestination(e.target.value)}
                    placeholder="e.g. Solang Valley"
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Mode</label>
                  <select
                    value={reportMode}
                    onChange={(e) => setReportMode(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="AUTO">Auto Rickshaw</option>
                    <option value="LOCAL_TAXI">Local Taxi</option>
                    <option value="SHARED_TAXI">Shared Taxi</option>
                    <option value="PRIVATE_CAB">Private Cab</option>
                    <option value="GOVT_BUS">Government Bus</option>
                    <option value="LOCAL_BUS">Local Bus</option>
                    <option value="E_RICKSHAW">E-Rickshaw</option>
                    <option value="METRO">Metro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Distance (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={reportDistance}
                    onChange={(e) => setReportDistance(e.target.value)}
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Actual Fare Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={reportActualFare}
                    onChange={(e) => setReportActualFare(e.target.value)}
                    placeholder="e.g. 150"
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Initial Driver Quote (Optional)</label>
                <input
                  type="number"
                  value={reportQuotedFare}
                  onChange={(e) => setReportQuotedFare(e.target.value)}
                  placeholder="e.g. 500 (if driver originally asked for more)"
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Traveler Advice / Experience</label>
                <textarea
                  rows={2}
                  value={reportComments}
                  onChange={(e) => setReportComments(e.target.value)}
                  placeholder="e.g. Took the shared sumo from the main stand, avoided the touts at the corner."
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow"
                >
                  {submittingReport ? 'Submitting...' : 'Submit to Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Statutory Regulatory Circular Details Modal */}
      {selectedCircular && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-white">Statutory Regulatory Reference</h3>
              </div>
              <button
                onClick={() => setSelectedCircular(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-500">Legal Authority & Citation</div>
                <div className="font-extrabold text-white text-sm">{selectedCircular.officialCircularRef || 'State Transport Authority Notified Tariff'}</div>
                <div className="text-[11px] text-amber-400">Mode: {selectedCircular.displayName} ({selectedCircular.vehicleType})</div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-white">Legal Protection Under Motor Vehicles Act:</div>
                <p>
                  Under Section 67(1) of the Motor Vehicles Act 1988, State Governments and Regional Transport Authorities (RTA/MMRTA/STA) notify maximum fares for contract carriages, auto-rickshaws, and stage carriages. Refusing to ply by meter or charging above the notified rate is a punishable violation under Section 178/179.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-white">Official Tariff Breakdown:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                  <li>Base Fare: ₹{selectedCircular.baseFare} for the first {selectedCircular.baseDistanceKm} km</li>
                  <li>Subsequent Rate: ₹{selectedCircular.perKmRate} per km</li>
                  <li>Night Surcharge: +25% between 11:00 PM and 5:00 AM</li>
                  <li>Waiting Charges: ₹{selectedCircular.transportModeId === 'AUTO' || selectedCircular.transportModeId === 'E_RICKSHAW' ? '100' : '150'} per hour</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200">
                <strong>Dispute Resolution:</strong> If a driver refuses to charge by meter or government rate, note the vehicle registration number and call the Traffic Police Helpline (1095 / 112) or file an e-complaint on the State Transport Department portal.
              </div>
            </div>

            <button
              onClick={() => setSelectedCircular(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors touch-min"
            >
              Close Statutory Reference
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

