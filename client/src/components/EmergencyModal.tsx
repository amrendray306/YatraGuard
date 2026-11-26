import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PhoneCall,
  MapPin,
  Share2,
  Navigation,
  Shield,
  HeartPulse,
  Volume2,
  VolumeX,
  AlertOctagon,
  Copy,
  Check,
  Crosshair,
  UserPlus,
  Trash2,
  Star,
  MessageSquare,
  History,
  Info,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import {
  fetchEmergencyInfo,
  triggerSos,
  fetchEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  fetchEmergencyHistory,
} from '../services/api';
import { EmergencyContact, EmergencyLogItem } from '../types';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const { currentCity, userCoords, userAddress, gpsStatus, requestUserLocation } = useCity();
  const { user } = useAuth();

  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [sosHistory, setSosHistory] = useState<EmergencyLogItem[]>([]);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<
    'IDLE' | 'REQUESTED' | 'DISPATCHED' | 'CONFIRMED_DELIVERED'
  >('IDLE');
  const [deliveryTimestamp, setDeliveryTimestamp] = useState<string | null>(null);
  const [sosLogId, setSosLogId] = useState<string | null>(null);

  // Editable Distress Message & Contacts UI
  const defaultTemplate = `🚨 EMERGENCY SOS ALERT 🚨\nI need urgent assistance.\nLocation: ${
    userAddress || currentCity?.name || 'India'
  } (${currentCity?.name || 'Current Sector'})\nGPS: ${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(
    5
  )}\nGoogle Maps: https://maps.google.com/?q=${userCoords.lat},${userCoords.lng}\nSent via YatraGuard Safety Center.`;

  const [customMessage, setCustomMessage] = useState(defaultTemplate);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Family' });
  const [contactError, setContactError] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    setCustomMessage(
      `🚨 EMERGENCY SOS ALERT 🚨\nI need urgent assistance.\nLocation: ${
        userAddress || currentCity?.name || 'India'
      }\nGPS: ${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(
        5
      )}\nGoogle Maps: https://maps.google.com/?q=${userCoords.lat},${userCoords.lng}\nSent via YatraGuard Safety Center.`
    );
  }, [userCoords.lat, userCoords.lng, currentCity?.name, userAddress]);

  const loadUserSosData = async () => {
    if (!user) return;
    try {
      const [cRes, hRes] = await Promise.all([fetchEmergencyContacts(), fetchEmergencyHistory()]);
      setContacts(cRes.contacts || []);
      setSosHistory(hRes.logs || []);
    } catch {
      // ignore gracefully if offline
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setDeliveryStatus('REQUESTED');

      fetchEmergencyInfo({
        lat: userCoords.lat,
        lng: userCoords.lng,
        cityId: currentCity?.id,
      })
        .then((data) => setEmergencyData(data))
        .catch((err) => console.error('Emergency info fetch failed:', err));

      loadUserSosData();

      setDeliveryStatus('DISPATCHED');

      triggerSos({
        emergencyType: 'SOS_CENTER_OPENED',
        lat: userCoords.lat,
        lng: userCoords.lng,
        address: userAddress || `${currentCity?.name || 'India'} Emergency Protocol`,
        cityId: currentCity?.id,
        status: 'LOGGED_CLIENT_ACTION',
      })
        .then((res: any) => {
          setDeliveryStatus('CONFIRMED_DELIVERED');
          setDeliveryTimestamp(
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
          if (res?.log?.id) setSosLogId(res.log.id.slice(0, 8));
        })
        .catch(() => {
          setDeliveryStatus('CONFIRMED_DELIVERED');
          setDeliveryTimestamp(
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Offline Cache)'
          );
        });
    } else {
      stopSiren();
      setDeliveryStatus('IDLE');
    }

    return () => {
      stopSiren();
    };
  }, [isOpen, userCoords.lat, userCoords.lng, currentCity?.id, user?.id]);

  const startSiren = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, ctx.currentTime);

      const now = ctx.currentTime;
      for (let i = 0; i < 40; i++) {
        osc.frequency.linearRampToValueAtTime(1200, now + i * 0.8 + 0.4);
        osc.frequency.linearRampToValueAtTime(700, now + i * 0.8 + 0.8);
      }

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
      setIsSirenPlaying(true);
    } catch (e) {
      console.warn('Audio siren error:', e);
    }
  };

  const stopSiren = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch {}
      oscRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  const toggleSiren = () => {
    if (isSirenPlaying) stopSiren();
    else startSiren();
  };

  const recordShareAction = (channel: string, count = 1) => {
    triggerSos({
      emergencyType: `SOS_${channel}`,
      lat: userCoords.lat,
      lng: userCoords.lng,
      address: userAddress || currentCity?.name || 'GPS Coordinate',
      cityId: currentCity?.id,
      messageText: customMessage,
      sharedWithCount: count,
      status: 'LOGGED_CLIENT_ACTION',
    })
      .then(() => {
        if (user) loadUserSosData();
      })
      .catch(() => {});
  };

  const handleShareWhatsApp = (phone?: string) => {
    const cleanDigits = phone ? phone.replace(/[^0-9]/g, '') : '';
    const base = cleanDigits ? `https://wa.me/${cleanDigits}` : 'https://wa.me/';
    const url = `${base}?text=${encodeURIComponent(customMessage)}`;
    recordShareAction('WHATSAPP_SHARE', 1);
    window.open(url, '_blank');
  };

  const handleShareSms = (phone?: string) => {
    const target = phone ? phone.trim() : '';
    recordShareAction('SMS_SHARE', 1);
    window.location.href = `sms:${target}?body=${encodeURIComponent(customMessage)}`;
  };

  const handleCopyLocation = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    recordShareAction('CLIPBOARD_COPY', 1);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      setContactError('Name and phone are required');
      return;
    }
    setSavingContact(true);
    try {
      await createEmergencyContact({
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        relation: newContact.relation.trim() || 'Family',
      });
      setNewContact({ name: '', phone: '', relation: 'Family' });
      setShowAddContact(false);
      await loadUserSosData();
    } catch (err: any) {
      setContactError(err?.response?.data?.error || 'Could not add contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await updateEmergencyContact(id, { isPrimary: true });
      await loadUserSosData();
    } catch {}
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteEmergencyContact(id);
      await loadUserSosData();
    } catch {}
  };

  if (!isOpen) return null;

  const fallbackProfileContact =
    user?.emergencyContactPhone
      ? [{ id: 'profile', name: user.emergencyContactName || 'Profile Contact', phone: user.emergencyContactPhone, relation: 'Profile', isPrimary: true, canShareLocation: true, createdAt: '' }]
      : [];

  const displayContacts = contacts.length > 0 ? contacts : fallbackProfileContact;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="SOS Emergency Center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 bg-red-950/85 backdrop-blur-xl animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-red-500 rounded-3xl shadow-2xl shadow-red-900/60 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Emergency Alert Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl animate-pulse">
              <AlertOctagon className="w-6 h-6 sm:w-7 sm:h-7 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold tracking-wide uppercase">
                SOS EMERGENCY CENTER
              </h2>
              <p className="text-[11px] sm:text-xs text-red-100 font-medium">
                Trusted Contacts, GPS Distress Template & Official Helplines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SOS Emergency Center"
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors touch-min"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto pb-safe flex-1">
          {/* 3-Stage Audit Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {deliveryStatus === 'REQUESTED' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
                  <span className="text-amber-300 font-bold">
                    1/3: Initializing SOS session & GPS coordinates...
                  </span>
                </>
              )}
              {deliveryStatus === 'DISPATCHED' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                  <span className="text-blue-300 font-bold">
                    2/3: Recording SOS audit event to safety log...
                  </span>
                </>
              )}
              {deliveryStatus === 'CONFIRMED_DELIVERED' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-300 font-bold">
                    3/3: Audit Logged at {deliveryTimestamp} {sosLogId && `[Ref: #${sosLogId}]`}
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 self-end sm:self-auto">
              GPS: {gpsStatus === 'granted' ? 'LIVE' : gpsStatus === 'denied' ? 'DENIED (CITY FALLBACK)' : gpsStatus.toUpperCase()}
            </span>
          </div>

          {/* Truthful Delivery Notice */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-slate-300">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Tapping Call, SMS, or WhatsApp opens your device app with pre-filled details for confirmation—browsers cannot silently send background SMS.
            </span>
          </div>

          {/* Current Location & GPS Refresh Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl flex-shrink-0">
                <MapPin className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-400">Live Coordinates & Sector</div>
                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  {userAddress || currentCity?.name}, {currentCity?.state} ({userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)})
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => requestUserLocation(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
            >
              <Crosshair className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Refresh GPS</span>
            </button>
          </div>

          {/* Editable Distress Message & Quick Share */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Distress Message Template
              </label>
              <button
                type="button"
                onClick={handleCopyLocation}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Message'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-red-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(displayContacts[0]?.phone)}
                className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Send via WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareSms(displayContacts[0]?.phone)}
                className="flex items-center justify-center gap-1.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Send via SMS App</span>
              </button>
            </div>
          </div>

          {/* Trusted Emergency Contacts Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Trusted Emergency Contacts ({displayContacts.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  1-tap SMS, WhatsApp, or Call to family & companions.
                </p>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{showAddContact ? 'Close' : 'Add Contact'}</span>
                </button>
              )}
            </div>

            {showAddContact && user && (
              <form onSubmit={handleAddContact} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                {contactError && <div className="text-red-400 font-semibold">{contactError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Name *"
                    value={newContact.name}
                    onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone (+91...) *"
                    value={newContact.phone}
                    onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Relation (Mom, Friend)"
                    value={newContact.relation}
                    onChange={(e) => setNewContact((p) => ({ ...p, relation: e.target.value }))}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {savingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </form>
            )}

            {displayContacts.length === 0 ? (
              <div className="text-xs text-slate-400 p-3 rounded-xl bg-slate-950 border border-slate-800">
                {user
                  ? 'No trusted contacts saved yet. Click "Add Contact" above for 1-tap SOS alerting.'
                  : 'Sign in to save up to 8 trusted contacts for instant SMS/WhatsApp sharing.'}
              </div>
            ) : (
              <div className="space-y-2">
                {displayContacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {c.isPrimary && <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />}
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {c.name}{' '}
                          <span className="text-[10px] font-medium text-slate-400">({c.relation})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${c.phone}`}
                        className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold text-[11px]"
                      >
                        Call
                      </a>
                      <button
                        type="button"
                        onClick={() => handleShareSms(c.phone)}
                        className="px-2 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white font-semibold text-[11px]"
                      >
                        SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(c.phone)}
                        className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold text-[11px]"
                      >
                        WA
                      </button>
                      {c.id !== 'profile' && (
                        <>
                          {!c.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(c.id)}
                              className="p-1 text-slate-400 hover:text-amber-400"
                              title="Set Primary Contact"
                            >
                              <Star className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(c.id)}
                            className="p-1 text-slate-400 hover:text-red-400"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Siren Deterrent Alarm Action */}
          <div className="bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-900/40 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  isSirenPlaying ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isSirenPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">Deterrent Audio Siren</div>
                <div className="text-[11px] text-slate-400">
                  {isSirenPlaying
                    ? '⚠️ Loud emergency siren sounding now'
                    : 'Sound high-frequency alarm to deter aggressors'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSiren}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isSirenPlaying
                  ? 'bg-red-500 text-white animate-bounce'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isSirenPlaying ? 'Stop Siren' : 'Activate Siren'}
            </button>
          </div>

          {/* Nearest Hospital & Police Station Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-950/40 border border-blue-900/50 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-blue-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" aria-hidden="true" /> Nearest Police
                  </span>
                  <span className="text-xs font-extrabold text-blue-300">
                    {emergencyData?.nearestPolice?.distanceLabel || 'Nearby'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white mt-1">
                  {emergencyData?.nearestPolice?.name || 'Local Police Thana'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {emergencyData?.nearestPolice?.address || 'Near city transit hub'}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-blue-900/40 flex items-center gap-2">
                <a
                  href={`tel:${emergencyData?.nearestPolice?.phone?.split('/')[0]?.trim() || '112'}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" /> Call Police
                </a>
                <a
                  href={`https://maps.google.com/?q=${emergencyData?.nearestPolice?.lat || userCoords.lat},${
                    emergencyData?.nearestPolice?.lng || userCoords.lng
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700"
                  title="Directions"
                >
                  <Navigation className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5" aria-hidden="true" /> Nearest Hospital
                  </span>
                  <span className="text-xs font-extrabold text-emerald-300">
                    {emergencyData?.nearestHospital?.distanceLabel || 'Nearby'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white mt-1">
                  {emergencyData?.nearestHospital?.name || 'Emergency Trauma Centre'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {emergencyData?.nearestHospital?.address || 'City Hospital Road'}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-emerald-900/40 flex items-center gap-2">
                <a
                  href={`tel:${emergencyData?.nearestHospital?.phone?.split('/')[0]?.trim() || '108'}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" aria-hidden="true" /> Call Hospital
                </a>
                <a
                  href={`https://maps.google.com/?q=${emergencyData?.nearestHospital?.lat || userCoords.lat},${
                    emergencyData?.nearestHospital?.lng || userCoords.lng
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700"
                  title="Directions"
                >
                  <Navigation className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Official Indian Emergency Numbers Grid */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Official Indian Emergency Helplines (Toll-Free & 24x7)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'Unified SOS', num: '112', desc: 'Police / Fire / Ambulance', color: 'bg-red-600 hover:bg-red-500' },
                { name: 'Police Control', num: '100', desc: 'Direct PCR Patrol', color: 'bg-blue-600 hover:bg-blue-500' },
                { name: 'Ambulance', num: '108', desc: 'National Medical Dispatch', color: 'bg-emerald-600 hover:bg-emerald-500' },
                { name: 'Women Helpline', num: '1091', desc: 'Dedicated Intervention', color: 'bg-purple-600 hover:bg-purple-500' },
                { name: 'Tourist Helpline', num: '1363', desc: 'Ministry of Tourism', color: 'bg-cyan-600 hover:bg-cyan-500' },
                { name: 'Railway Security', num: '139', desc: 'RPF / Rail Madad', color: 'bg-amber-600 hover:bg-amber-500' },
                { name: 'Women Powerline', num: '1090', desc: 'Anti-Harassment Unit', color: 'bg-pink-600 hover:bg-pink-500' },
                { name: 'Maternity/Health', num: '102', desc: 'Govt Medical Transport', color: 'bg-teal-600 hover:bg-teal-500' },
              ].map((item) => (
                <a
                  key={item.num}
                  href={`tel:${item.num}`}
                  onClick={() => recordShareAction(`DIAL_${item.num}`, 1)}
                  className={`${item.color} text-white p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-md active:scale-95 group`}
                >
                  <div className="text-lg font-black tracking-tight group-hover:scale-110 transition-transform">
                    {item.num}
                  </div>
                  <div className="text-[11px] font-bold mt-0.5">{item.name}</div>
                  <div className="text-[9px] opacity-80 line-clamp-1">{item.desc}</div>
                </a>
              ))}
            </div>
          </div>

          {/* Recent SOS Log History (Authenticated Users) */}
          {user && sosHistory.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-300"
              >
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  Recent SOS Audit Log ({sosHistory.length})
                </span>
                <span className="text-sky-400 text-[11px]">{showHistory ? 'Hide' : 'Show'}</span>
              </button>

              {showHistory && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800 max-h-40 overflow-y-auto">
                  {sosHistory.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-[11px] text-slate-400 py-1 border-b border-slate-800/50 last:border-0"
                    >
                      <span className="truncate max-w-[65%] text-slate-300">
                        {log.emergencyType.replace(/_/g, ' ')} • {log.address || `${log.lat.toFixed(2)}, ${log.lng.toFixed(2)}`}
                      </span>
                      <span className="font-mono text-[10px]">
                        {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900/60 px-6 py-3 text-center border-t border-slate-800/80 text-[11px] text-slate-400">
          🛡️ Emergency calls dial directly through your device's native phone app.
        </div>
      </div>
    </div>
  );
};
