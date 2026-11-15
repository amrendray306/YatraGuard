import React, { useState, useEffect } from 'react';
import {
  Compass,
  Navigation,
  ArrowRight,
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
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { fetchRoutePricing, reportRouteOvercharge } from '../services/api';

interface RoutesPageProps {
  onNavigateToMap?: (coords?: { lat: number; lng: number }) => void;
}

export const RoutesPage: React.FC<RoutesPageProps> = ({ onNavigateToMap }) => {
  const { cities, currentCity, userAddress, requestUserLocation } = useCity();
  const { showToast } = useToast();

  const [fromName, setFromName] = useState('New Delhi Railway Station');
  const [toName, setToName] = useState('India Gate');
  const [selectedCityId, setSelectedCityId] = useState(currentCity?.id || '');
  const [travelHour, setTravelHour] = useState<number>(new Date().getHours());
  const [hasLuggage, setHasLuggage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<any>(null);

  // Overcharge modal state
  const [overchargeModalOpen, setOverchargeModalOpen] = useState(false);
  const [selectedRouteForReport, setSelectedRouteForReport] = useState<any>(null);
  const [demandedFare, setDemandedFare] = useState('');
  const [paidFare, setPaidFare] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);

  const calculatePrices = async (fName = fromName, tName = toName) => {
    setIsLoading(true);
    try {
      const cityObj = cities.find((c) => c.id === selectedCityId) || currentCity;
      const res = await fetchRoutePricing({
        fromName: fName,
        toName: tName,
        cityName: cityObj?.name || 'Delhi',
        cityId: cityObj?.id,
        travelHour,
      });
      setRouteResult(res);
    } catch (err) {
      console.error('Route calculation error:', err);
      showToast('Failed to calculate route prices. Please check route endpoints.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentCity) {
      setSelectedCityId(currentCity.id);
      if (currentCity.name === 'Manali') {
        setFromName('Mall Road Manali');
        setToName('Solang Valley Snow Point');
        calculatePrices('Mall Road Manali', 'Solang Valley Snow Point');
      } else if (currentCity.name === 'Rishikesh') {
        setFromName('Triveni Ghat');
        setToName('Shivpuri Rafting Camp');
        calculatePrices('Triveni Ghat', 'Shivpuri Rafting Camp');
      } else {
        calculatePrices();
      }
    }
  }, [currentCity]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculatePrices();
  };

  const handleOpenOvercharge = (card: any) => {
    setSelectedRouteForReport(card);
    setDemandedFare('');
    setPaidFare('');
    setDriverNotes('');
    setOverchargeModalOpen(true);
  };

  const handleSubmitOvercharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demandedFare) {
      showToast('Please enter the fare demanded by the driver', 'error');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const cityObj = cities.find((c) => c.id === selectedCityId) || currentCity;
      const res = await reportRouteOvercharge({
        originName: fromName,
        destinationName: toName,
        cityName: cityObj?.name,
        transportModeId: selectedRouteForReport.typeId,
        expectedPriceMin: selectedRouteForReport.minPrice,
        expectedPriceMax: selectedRouteForReport.maxPrice,
        amountDemanded: parseFloat(demandedFare),
        amountActuallyPaid: paidFare ? parseFloat(paidFare) : undefined,
        notes: driverNotes,
      });

      showToast(`Overcharge report logged! Audit rating: ${res.audit.severity}`, 'success');
      setOverchargeModalOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit overcharge report', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getTransportIcon = (typeId: string) => {
    switch (typeId) {
      case 'METRO':
        return <Train className="w-5 h-5 text-blue-400" />;
      case 'AUTO':
        return <Car className="w-5 h-5 text-amber-400" />;
      case 'BIKE_TAXI':
        return <Bike className="w-5 h-5 text-emerald-400" />;
      case 'LOCAL_BUS':
      case 'BUS':
        return <Bus className="w-5 h-5 text-indigo-400" />;
      default:
        return <Car className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400 mb-1">
          <Compass className="w-4 h-4 text-amber-400" />
          <span>RTO-Regulated Transportation Auditing</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Route-Wise Price Intelligence & Fare Comparison
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
          Real-time fair tariff auditing. Compare regulated auto-rickshaw meters, metro rail, buses, and private cabs with official government circulars, night surcharges, and mountain adjustments.
        </p>
      </div>

      {/* Route Search Configuration Form */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Origin Location */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Origin / Starting Point
                </label>
                {userAddress && (
                  <button
                    type="button"
                    onClick={() => setFromName(userAddress)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
                    title="Use detected current location"
                  >
                    <Navigation className="w-2.5 h-2.5" />
                    <span>My Location</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="e.g. Railway Station / Airport"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Destination Location */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Destination Point
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={toName}
                  onChange={(e) => setToName(e.target.value)}
                  placeholder="e.g. Mall Road / Hotel / Fort"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                City / Fare Zone
              </label>
              <select
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Travel Hour (to test 25% night surcharge) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Travel Time (Night Tariff Check)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={travelHour}
                  onChange={(e) => setTravelHour(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value={9}>09:00 AM (Daylight Regular)</option>
                  <option value={14}>02:00 PM (Daylight Regular)</option>
                  <option value={19}>07:00 PM (Evening Peak)</option>
                  <option value={23}>11:30 PM (+25% Night Surcharge)</option>
                  <option value={2}>02:00 AM (+25% Night Surcharge)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>City-specific RTO algorithms active. Surcharges dynamically calibrated.</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-900/40 transition-all flex items-center gap-2 active:scale-95 keep-white"
            >
              {isLoading ? (
                <span>Auditing Fares...</span>
              ) : (
                <>
                  <span>Audit & Compare Routes</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Audit Results Stream */}
      {routeResult && (
        <div className="space-y-6">
          {/* Query Summary Info */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">Audited Route:</span>
              <span className="text-slate-300">{routeResult.query.fromName}</span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-300">{routeResult.query.toName}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <span>Road Distance: <strong className="text-white">{routeResult.query.roadDistanceKm} km</strong></span>
              {routeResult.query.isNight && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold text-[11px]">
                  🌙 +25% Night Tariff Active
                </span>
              )}
              {routeResult.query.isHillCity && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300 font-bold text-[11px]">
                  ⛰️ Mountain Gradient Adjustment
                </span>
              )}
            </div>
          </div>

          {/* SECTION 3 REQUIREMENT: 4 Separate Comparison Cards */}
          <div>
            <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Route Recommendations & Price Intelligence</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {routeResult.comparisonCards.map((card: any, idx: number) => {
                const isExpanded = expandedCardIndex === idx;

                const getCategoryBadge = (cat: string) => {
                  switch (cat) {
                    case 'CHEAPEST':
                      return { label: 'Cheapest Route', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60' };
                    case 'FASTEST':
                      return { label: 'Fastest Route', bg: 'bg-blue-950/80 text-blue-300 border-blue-700/60' };
                    case 'RECOMMENDED':
                      return { label: 'Recommended Route', bg: 'bg-amber-950/80 text-amber-300 border-amber-700/60' };
                    default:
                      return { label: 'Alternative Route', bg: 'bg-purple-950/80 text-purple-300 border-purple-700/60' };
                  }
                };

                const badge = getCategoryBadge(card.category);

                return (
                  <div
                    key={card.category}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Category Badge */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-500 font-bold">
                          {card.priceConfidence}% Confidence
                        </span>
                      </div>

                      {/* Title & Mode */}
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0">
                          {getTransportIcon(card.typeId)}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white leading-tight">{card.typeName}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">{card.description}</p>
                        </div>
                      </div>

                      {/* Pricing Highlight */}
                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-slate-400 font-medium">Estimated Fare</span>
                          <div className="text-xl font-black text-amber-400">
                            ₹{card.estimatedPrice}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Regulated Range</span>
                          <span className="font-bold text-slate-300">₹{card.minPrice} – ₹{card.maxPrice}</span>
                        </div>
                      </div>

                      {/* Distance & Duration */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Distance</span>
                          <span className="font-extrabold text-white">{card.distanceKm} km</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Duration</span>
                          <span className="font-extrabold text-white">~{card.durationMins} mins</span>
                        </div>
                      </div>

                      {/* Safety Info Note */}
                      <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/30 text-[11px] text-blue-200 leading-snug">
                        {card.safetyInfo}
                      </div>

                      {/* Price Breakdown Accordion */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1 text-slate-400 animate-fade-in">
                          <div className="flex justify-between">
                            <span>Base Flag-Drop:</span>
                            <span className="text-slate-200">₹{card.priceBreakdown.baseFare}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Per-KM Distance:</span>
                            <span className="text-slate-200">₹{card.priceBreakdown.distanceCharge}</span>
                          </div>
                          {card.priceBreakdown.nightSurcharge > 0 && (
                            <div className="flex justify-between text-indigo-300">
                              <span>Night Surcharge (25%):</span>
                              <span>+₹{card.priceBreakdown.nightSurcharge}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                            <span>Source:</span>
                            <span className="truncate max-w-[150px]">{card.sourceReference}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setExpandedCardIndex(isExpanded ? null : idx)}
                        className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1"
                      >
                        <span>{isExpanded ? 'Hide Calculation Breakdown' : 'View Formula Breakdown'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        {onNavigateToMap && (
                          <button
                            type="button"
                            onClick={() => onNavigateToMap()}
                            className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition-colors"
                          >
                            View on Map
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenOvercharge(card)}
                          className="w-full py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-700/60 text-xs font-black text-red-300 transition-colors"
                        >
                          Overcharged?
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Transportation Modes Matrix (All 9 Options) */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">Full Transportation Spectrum</h3>
                <p className="text-xs text-slate-400">All viable transit methods for this {routeResult.query.roadDistanceKm} km corridor</p>
              </div>
              <span className="text-xs font-bold text-slate-400">9 Transit Modes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {routeResult.allTransportModes.map((mode: any) => (
                <div
                  key={mode.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    mode.available
                      ? 'bg-slate-950/80 border-slate-800 text-white'
                      : 'bg-slate-950/40 border-slate-850 text-slate-500 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs">{mode.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {mode.available ? `Duration: ${mode.duration}` : 'Not practical for distance'}
                    </div>
                  </div>

                  <div className="text-right">
                    {mode.price !== null && mode.available ? (
                      <div className="font-black text-amber-400 text-sm">
                        {mode.price === 0 ? 'Free' : `₹${mode.price}`}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">N/A</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Overcharging Modal */}
      {overchargeModalOpen && selectedRouteForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-950 rounded-xl border border-red-800 text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Report Transit Overcharge</h3>
                  <p className="text-xs text-slate-400">Directly flags predatory pricing against official RTO rules</p>
                </div>
              </div>
              <button
                onClick={() => setOverchargeModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Pre-filled Route Reference */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-slate-400">
                Route: <strong className="text-white">{fromName} → {toName}</strong>
              </div>
              <div className="text-slate-400">
                Vehicle Mode: <strong className="text-amber-400">{selectedRouteForReport.typeName}</strong>
              </div>
              <div className="text-slate-400">
                Expected Tariff Range: <strong className="text-emerald-400">₹{selectedRouteForReport.minPrice} – ₹{selectedRouteForReport.maxPrice}</strong>
              </div>
            </div>

            <form onSubmit={handleSubmitOvercharge} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Amount Demanded by Driver (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={demandedFare}
                  onChange={(e) => setDemandedFare(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Amount Actually Paid (₹ Optional)
                </label>
                <input
                  type="number"
                  value={paidFare}
                  onChange={(e) => setPaidFare(e.target.value)}
                  placeholder="e.g. 350 after negotiation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  What did the driver say or do?
                </label>
                <textarea
                  rows={2}
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="e.g. Refused to turn on electronic meter, claimed extra charge for luggage..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-medium resize-none focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReport}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2 active:scale-95 keep-white"
              >
                {isSubmittingReport ? <span>Logging Overcharge Audit...</span> : <span>Submit Overcharge Alert</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
