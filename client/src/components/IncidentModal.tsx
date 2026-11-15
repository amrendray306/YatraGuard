import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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
  SlidersHorizontal,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { submitIncident } from '../services/api';
import { locationService } from '../services/locationService';
import { reverseGeocodingService } from '../services/reverseGeocodingService';

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

const modalPinIcon = L.divIcon({
  className: 'modal-pin-marker',
  html: `
    <div style="
      background-color: #DC2626;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.6);
      border: 2px solid #ffffff;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 14px;">📍</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Mini Map Click & Drag Controller
function MiniMapController({
  lat,
  lng,
  onPinChange,
}: {
  lat: number;
  lng: number;
  onPinChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], 14, { animate: true });
  }, [lat, lng, map]);

  useMapEvents({
    click(e) {
      onPinChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={[lat, lng]}
      icon={modalPinIcon}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onPinChange(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCategory = 'taxi_overcharging',
}) => {
  const { cities, currentCity, userCoords, reportPin, setReportPin } = useCity();
  const { showToast } = useToast();

  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCityId, setSelectedCityId] = useState(currentCity?.id || '');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>(reportPin?.lat || userCoords.lat || 28.6139);
  const [lng, setLng] = useState<number>(reportPin?.lng || userCoords.lng || 77.209);
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

      const initialLat = reportPin?.lat || userCoords.lat || currentCity?.lat || 28.6139;
      const initialLng = reportPin?.lng || userCoords.lng || currentCity?.lng || 77.209;
      setLat(initialLat);
      setLng(initialLng);

      if (reportPin?.address) {
        setAddress(reportPin.address);
      } else if (currentCity) {
        setAddress(`${currentCity.name}, ${currentCity.state}`);
      } else {
        setAddress('New Delhi, India');
      }

      setSubmittedReport(null);
      setErrorMessage(null);
      setLocationStatus(reportPin ? 'Pre-filled from map selected pin' : '');
    }
  }, [isOpen, currentCity, initialCategory, reportPin, userCoords]);

  // Handle Coordinate Update from Mini Map Click/Drag
  const handleCoordinateUpdate = async (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setLocationStatus(`Pin adjusted to [${newLat.toFixed(4)}, ${newLng.toFixed(4)}]`);

    try {
      const rev = await reverseGeocodingService.reverseGeocode(newLat, newLng);
      setAddress(rev.displayName);
    } catch {
      setAddress(`${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
    }
  };

  // Request browser geolocation permission & acquire coordinates
  const handleDetectCurrentLocation = async () => {
    setIsDetectingLocation(true);
    setLocationStatus('Requesting high-accuracy GPS permission...');

    try {
      const result = await locationService.requestBrowserLocation();
      const detectedLat = result.coords.lat;
      const detectedLng = result.coords.lng;
      setLat(detectedLat);
      setLng(detectedLng);
      setLocationStatus(`GPS Pinpoint: ±${Math.round(result.coords.accuracy)}m accuracy`);

      if (result.address?.displayName) {
        setAddress(result.address.displayName);
      }
      showToast('Current GPS coordinates captured successfully', 'success');
    } catch (err: any) {
      setLocationStatus(err.message || 'GPS permission declined or unavailable.');
      showToast(err.message || 'Unable to access location', 'error');
    } finally {
      setIsDetectingLocation(false);
    }
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
      setReportPin(null); // Clear map report pin once recorded
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

              {/* Interactive Mini Map & Location Section */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Pinpoint Incident Location (Drag or Click Map)</span>
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

                {/* Embedded Interactive Mini Leaflet Map with Draggable Pin */}
                <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-800 relative z-0">
                  <MapContainer
                    center={[lat, lng]}
                    zoom={14}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      attribution="&copy; OpenStreetMap &copy; CARTO"
                    />
                    <MiniMapController lat={lat} lng={lng} onPinChange={handleCoordinateUpdate} />
                  </MapContainer>
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

                {/* Coordinate Pin Fine Adjustment */}
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-slate-400 text-[11px]">
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Latitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => {
                        const newLat = parseFloat(e.target.value);
                        setLat(newLat);
                        handleCoordinateUpdate(newLat, lng);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Longitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => {
                        const newLng = parseFloat(e.target.value);
                        setLng(newLng);
                        handleCoordinateUpdate(lat, newLng);
                      }}
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
                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      value={amountDemanded}
                      onChange={(e) => setAmountDemanded(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Amount Actually Paid (₹ Optional)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="number"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="e.g. 800"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Incident Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Date & Time of Incident
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Photo / Evidence URL (Optional)
                  </label>
                  <div className="relative">
                    <Camera className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="url"
                      value={evidenceUrl}
                      onChange={(e) => setEvidenceUrl(e.target.value)}
                      placeholder="https://imgur.com/example.jpg"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-black transition-all shadow-lg shadow-red-900/30 flex items-center gap-2 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Submit Incident Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
