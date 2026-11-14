import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, ShieldCheck, MapPin } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { submitIncident } from '../services/api';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: 'pickpocketing', label: 'Pickpocketing' },
  { id: 'theft', label: 'Theft / Luggage Tampering' },
  { id: 'scam', label: 'Touting / Pricing Scam' },
  { id: 'harassment', label: 'Harassment / Following' },
  { id: 'unsafe_road', label: 'Unsafe Road / Unlit Alley' },
  { id: 'suspicious_activity', label: 'Suspicious Activity' },
  { id: 'transport_issue', label: 'Transport Dispute / Meter Refusal' },
  { id: 'medical_emergency', label: 'Medical Emergency' },
  { id: 'lost_item', label: 'Lost Valuables' },
  { id: 'other', label: 'Other Safety Hazard' },
];

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentCity, userCoords } = useCity();
  const [category, setCategory] = useState('pickpocketing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(`${currentCity?.name || 'Local'} City Sector`);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      const res = await submitIncident({
        category,
        title,
        description,
        address,
        lat: userCoords.lat,
        lng: userCoords.lng,
        cityId: currentCity?.id,
        evidenceUrl: evidenceUrl || undefined,
      });

      setSubmittedReport(res.incident);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to submit incident:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 shadow-2xl my-auto max-h-[92dvh] overflow-y-auto pb-safe">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Report Travel Incident</h3>
              <p className="text-xs text-slate-400">Crowdsourced Community Protection</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedReport ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-white">Report Submitted Successfully</h4>
              <div className="inline-block mt-2 px-3 py-1 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-full text-xs font-bold">
                Status: Pending Verification
              </div>
            </div>

            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              To prevent false alarms, your report is now queued for Community Confirmation and
              Moderator review. Thank you for protecting fellow travelers in {currentCity?.name}.
            </p>

            <button
              onClick={() => {
                setSubmittedReport(null);
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
                Incident Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Incident Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Aggressive auto touts refusing meter outside station"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Specific Location or Landmark
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <MapPin className="w-3.5 h-3.5 text-red-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Detailed Description of What Happened
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the sequence of events, specific vehicle numbers, or warning signs for other travelers..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Supporting Photo / Receipt URL (Optional)
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
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
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/40 transition-colors"
              >
                {isSubmitting ? 'Submitting Report...' : 'Submit Incident Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
