import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { submitScam } from '../services/api';

interface ScamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SCAM_CATEGORIES = [
  { id: 'taxi_scam', label: 'Taxi / Auto Meter Scam' },
  { id: 'fake_guide', label: 'Unauthorized / Fake Tour Guide' },
  { id: 'fake_ticket', label: 'Fake Ticket / Monument Counter' },
  { id: 'overcharging', label: 'Severe Tourist Overcharging' },
  { id: 'fake_hotel', label: 'Fake Hotel / "Hotel Burned Down" Scam' },
  { id: 'shopping_scam', label: 'Gemstone / Handicraft Export Scam' },
  { id: 'atm_payment', label: 'ATM / QR Payment Skimming' },
  { id: 'religious_tourism', label: 'Temple / Ghat Wood Donation Extortion' },
  { id: 'transport', label: 'Unlicensed Transport / Water Sports' },
];

export const ScamModal: React.FC<ScamModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentCity, userCoords } = useCity();
  const [category, setCategory] = useState('taxi_scam');
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState(`${currentCity?.name || 'City'} Tourist Zone`);
  const [description, setDescription] = useState('');
  const [warningSigns, setWarningSigns] = useState('');
  const [typicalPattern, setTypicalPattern] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !warningSigns) return;

    setIsSubmitting(true);
    try {
      await submitScam({
        category,
        title,
        locationName,
        description,
        warningSigns,
        typicalPattern: typicalPattern || 'Solicitation -> Diversion -> Overcharging',
        lat: userCoords.lat,
        lng: userCoords.lng,
        cityId: currentCity?.id,
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to submit scam alert:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl my-auto max-h-[92dvh] overflow-y-auto pb-safe">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Report Tourist Scam Alert</h3>
              <p className="text-xs text-slate-400">Protect fellow travelers from common rackets</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white">Scam Alert Recorded</h4>
              <p className="text-xs text-slate-300 mt-1">
                Your scam pattern has been logged to the intelligence database for {currentCity?.name}.
              </p>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Scam Classification
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {SCAM_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Scam Title / Identifier
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unofficial Guide 'Fast-Track Pass' Detour Racket"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Location or Landmark
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Warning Signs (How can travelers spot this early?)
              </label>
              <textarea
                required
                rows={2}
                value={warningSigns}
                onChange={(e) => setWarningSigns(e.target.value)}
                placeholder="e.g. Stranger claiming the ticket booth has moved; pushing you towards specific auto driver"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Typical Trick Pattern
              </label>
              <input
                type="text"
                value={typicalPattern}
                onChange={(e) => setTypicalPattern(e.target.value)}
                placeholder="e.g. Approach -> False Claim -> Overpriced Shop Diversion"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Description
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of what happens and tips on how to avoid it..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-900/40 transition-colors"
              >
                {isSubmitting ? 'Logging Scam Alert...' : 'Publish Scam Intelligence'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
