import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, Clock, Phone, AlertTriangle, ArrowLeft } from 'lucide-react';
import { fetchSharedTrip } from '../services/api';

interface SharedTripPageProps {
  token: string;
  onBack: () => void;
}

export const SharedTripPage: React.FC<SharedTripPageProps> = ({ token, onBack }) => {
  const [trip, setTrip] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSharedTrip(token)
      .then(setTrip)
      .catch((err) => {
        console.error('Failed to load shared trip:', err);
        setError('Shared trip link is invalid or has expired.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading traveler live status...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Trip Not Found</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
        >
          Return to App
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Guardian Platform</span>
      </button>

      <div className="glass-panel-elevated rounded-3xl p-6 border-2 border-emerald-500/50 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">
                Live Family Safety Tracking
              </div>
              <h2 className="text-xl font-black text-white">{trip.title}</h2>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
            🟢 Active
          </span>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-xs text-slate-400">Traveler:</div>
            <div className="text-lg font-black text-white">{trip.travelerName}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-400" /> Current Sector
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {trip.currentLocation || trip.destinationCity}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" /> Estimated Arrival
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                {trip.lastKnownEta || '18 min ETA'}
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Emergency ICE Contact:</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">{trip.emergencyContactName}</div>
            </div>
            <a
              href="tel:112"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold"
            >
              <Phone className="w-3.5 h-3.5" /> Call Police 112
            </a>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-800">
          Last status ping: {new Date(trip.lastUpdated).toLocaleTimeString()} • Verified by India Travel Guardian
        </div>
      </div>
    </div>
  );
};
