import React, { useState } from 'react';
import {
  Navigation,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { evaluateRouteRisk } from '../services/api';
import { RouteOption, RouteEvaluationResult } from '../types';

interface RouteSafetyModalProps {
  onClose?: () => void;
}

export const RouteSafetyModal: React.FC<RouteSafetyModalProps> = ({ onClose }) => {
  const { currentCity, userCoords } = useCity();
  const [fromName, setFromName] = useState(
    currentCity?.name === 'Agra' ? 'Agra Cantt Railway Station' : 'Current Transit Hub'
  );
  const [toName, setToName] = useState(
    currentCity?.name === 'Agra' ? 'Taj Mahal East Gate' : 'City Center Monument'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RouteEvaluationResult | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<'fastest' | 'safest' | 'balanced'>('balanced');

  const handleEvaluate = async () => {
    setIsLoading(true);
    try {
      // Calculate realistic destination coordinates offset from user coords
      const toLat = userCoords.lat + 0.015;
      const toLng = userCoords.lng + 0.022;

      const res = await evaluateRouteRisk({
        fromLat: userCoords.lat,
        fromLng: userCoords.lng,
        toLat,
        toLng,
        fromName,
        toName,
        cityId: currentCity?.id,
      });

      setResult(res);
      setSelectedRouteId('balanced');
    } catch (err) {
      console.error('Route evaluation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoute = result?.routes.find((r) => r.id === selectedRouteId);

  return (
    <div className="glass-panel-elevated rounded-3xl p-6 relative overflow-hidden space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Standout Travel Risk Engine
          </span>
          <h3 className="text-xl font-extrabold text-white mt-0.5">
            Real-Time Safe Route Planner ({currentCity?.name || 'City'})
          </h3>
        </div>
      </div>

      {/* Input Origin & Destination Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            📍 Origin (Starting Point)
          </label>
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            placeholder="Enter starting location"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            🎯 Destination (Target)
          </label>
          <input
            type="text"
            value={toName}
            onChange={(e) => setToName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            placeholder="Enter destination"
          />
        </div>

        <div className="sm:col-span-2 flex justify-end mt-1">
          <button
            onClick={handleEvaluate}
            disabled={isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            {isLoading ? 'Analyzing Corridor Hazards...' : 'Calculate Safe Routes'}
          </button>
        </div>
      </div>

      {/* Route Evaluation Cards */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.routes.map((route) => {
              const isSelected = selectedRouteId === route.id;
              const isRec = route.isRecommended;

              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`cursor-pointer rounded-2xl p-4 border transition-all relative ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500 shadow-xl shadow-blue-950/50 scale-[1.02]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isRec && (
                    <span className="absolute -top-2.5 right-3 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                      ⭐ Recommended
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      {route.id === 'fastest' ? (
                        <Zap className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      )}
                      {route.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        route.riskTier === 'Low'
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
                          : 'bg-amber-950/70 text-amber-400 border-amber-800'
                      }`}
                    >
                      Risk: {route.riskTier}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{route.durationLabel}</span>
                    <span className="text-xs font-medium text-slate-400">({route.distanceLabel})</span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {route.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>Guardian Score</span>
                    <span className="font-extrabold text-blue-400">{route.riskScore} / 100</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Route Detailed Breakdown */}
          {selectedRoute && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-white">
                    Detailed Route Safety Breakdown: {selectedRoute.title}
                  </h4>
                  <p className="text-xs text-slate-400">{selectedRoute.badge}</p>
                </div>
                <div className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-xl">
                  Estimated Travel: {selectedRoute.durationLabel} • {selectedRoute.distanceLabel}
                </div>
              </div>

              {/* Waypoint Corridor */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Corridor Monitored Checkpoints
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {selectedRoute.waypoints.map((wp, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <div className="text-[10px] font-bold text-blue-400">Checkpoint {idx + 1}</div>
                        <div className="text-white font-medium line-clamp-1">{wp.name}</div>
                      </div>
                      {idx < selectedRoute.waypoints.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:block flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Highlights & Hazards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-emerald-400">
                    ✓ Protective Factors
                  </span>
                  {selectedRoute.highlights.map((h, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-amber-400">
                    ⚠️ Potential Travel Hazards
                  </span>
                  {selectedRoute.hazards.map((hz, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{hz}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 italic">
            🛡️ {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
