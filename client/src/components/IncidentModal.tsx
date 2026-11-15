import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Compass,
  IndianRupee,
  Calendar,
  Clock,
  Camera,
  Navigation,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { submitIncident } from '../services/api';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCategory?: string;
}

const CATEGORIES = [
  { id: 'taxi_overcharging', label: 'Taxi overcharging' },
  { id: 'auto_overcharging', label: 'Auto-rickshaw overcharging' },
  { id: 'fake_tour_operator', label: 'Fake tour operator' },
  { id: 'hotel_scam', label: 'Hotel booking scam' },
  { id: 'fake_guide', label: 'Fake guide' },
  { id: 'shopping_scam', label: 'Shopping scam' },
  { id: 'online_fraud', label: 'Online payment fraud' },
  { id: 'theft', label: 'Theft / Pickpocketing' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'unsafe_location', label: 'Unsafe location' },
  { id: 'suspicious_activity', label: 'Suspicious activity' },
  { id: 'other', label: 'Other' },
];

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCategory = 'taxi_overcharging',
}) => {
  const { cities, currentCity, userCoords } = useCity();
  const { showToast } = useToast();

  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCityId, setSelectedCityId] = useState(currentCity?.id || '');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>(userCoords.lat || 28.6139);
  const [lng, setLng] = useState<number>(userCoords.lng || 77.2090);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('');
  const [amountDemanded, setAmountDemanded] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [incidentDate, setIncidentDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setSelectedCityId(currentCity?.id || cities[0]?.id || '');
      setLat(userCoords.lat || currentCity?.lat || 28.6139);
      setLng(userCoords.lng || currentCity?.lng || 77.2090);
      setAddress(currentCity ? `${currentCity.name}, ${currentCity.state}` : 'New Delhi, India');
      setSubmittedReport(null);
      setErrorMessage(null);
    }
  }, [isOpen, currentCity, initialCategory]);

  // Reverse geocoding helper using OpenStreetMap Nominatim with timeout and fallback
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'YatraGuard-TravelPlatform/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          // Format a clean, human-readable address
          const parts = data.display_name.split(', ');
          const shortAddr = parts.slice(0, 3).join(', ');
          setAddress(shortAddr || data.display_name);
          return;
        }
      }
    } catch {
      // Fallback if network blocked or offline
    }
    setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)} (${currentCity?.name || 'Local Sector'})`);
  };

  // Request browser geolocation permission & acquire coordinates
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationStatus('Requesting GPS permission from browser...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = pos.coords.latitude;
        const detectedLng = pos.coords.longitude;
        setLat(detectedLat);
        setLng(detectedLng);
        setLocationStatus(`GPS Pinpoint: ±${Math.round(pos.coords.accuracy)}m accuracy`);
        setIsDetectingLocation(false);
        reverseGeocode(detectedLat, detectedLng);
        showToast('Current GPS location captured successfully', 'success');
      },
      (err) => {
        setIsDetectingLocation(false);
        setLocationStatus('GPS permission declined. You can adjust the coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide both an incident title and detailed description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitIncident({
        category,
        title: title.trim(),
        description: description.trim(),
        address: address.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        cityId: selectedCityId,
        amountDemanded: amountDemanded ? parseFloat(amountDemanded) : undefined,
        amountPaid: amountPaid ? parseFloat(amountPaid) : undefined,
        incidentDate: incidentDate ? new Date(incidentDate).toISOString() : undefined,
        evidenceUrl: evidenceUrl.trim() || undefined,
      });

      setSubmittedReport(res.incident);
      showToast('Incident report recorded. Thank you for protecting travelers.', 'success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to submit incident report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-400">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Report Scam / Safety Incident</h2>
              <p className="text-xs text-slate-400">
                Crowdsourced vigilance. Helps travelers verify fair fares and avoid tourist traps.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {submittedReport ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Incident Recorded</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Your report <span className="font-bold text-amber-400">"{submittedReport.title}"</span> has been
                added to the live Community Scam Feed. Status:{' '}
                <span className="font-bold text-amber-400">{submittedReport.status}</span>.
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl max-w-sm mx-auto text-left text-xs space-y-1 text-slate-400">
                <div><span className="text-slate-500">Category:</span> <span className="text-slate-200 capitalize">{submittedReport.category.replace('_', ' ')}</span></div>
                <div><span className="text-slate-500">Location:</span> <span className="text-slate-200">{submittedReport.address}</span></div>
                <div><span className="text-slate-500">Confidence:</span> <span className="text-slate-200">{submittedReport.confidenceScore}%</span></div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Category Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Incident Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Incident Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Driver demanded ₹1,200 for 4km auto ride claiming festival tariff"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Description of What Happened *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what occurred, quotes given, vehicle number or tout names if known, and how other travelers can avoid it..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium leading-relaxed resize-none"
                />
              </div>

              {/* Automatic Geolocation & Manual Pin Adjust */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Location & Coordinates</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={isDetectingLocation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-black text-amber-300 transition-all active:scale-95"
                  >
                    <Navigation className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                    <span>{isDetectingLocation ? 'Detecting...' : 'Detect My Location'}</span>
                  </button>
                </div>

                {locationStatus && (
                  <p className="text-[11px] text-amber-400/90 font-medium">{locationStatus}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      City / Destination
                    </label>
                    <select
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Readable Address / Landmark
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Near Mall Road Taxi Stand"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-medium"
                    />
                  </div>
                </div>

                {/* Coordinate Pin Adjust */}
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-slate-400 text-[11px]">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Latitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Longitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Impact (Demanded vs Paid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Amount Demanded (₹ Optional)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      value={amountDemanded}
                      onChange={(e) => setAmountDemanded(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Amount Actually Paid (₹ Optional)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="e.g. 800"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Incident Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Incident Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Optional Photo / Receipt URL
                  </label>
                  <div className="relative">
                    <Camera className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://... photo or bill evidence"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-start gap-2.5 text-[11px] text-blue-200">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy Protected:</strong> Your email, phone number, and personal profile are never publicly exposed. Only the incident details and approximate sector are shared to protect other travelers.
                </span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-900/40 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <span>Recording Report...</span>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-white" />
                    <span>Submit Verified Report</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
