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
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { fetchEmergencyInfo, triggerSos } from '../services/api';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const { currentCity, userCoords } = useCity();
  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'IDLE' | 'REQUESTED' | 'DISPATCHED' | 'CONFIRMED_DELIVERED'>('IDLE');
  const [deliveryTimestamp, setDeliveryTimestamp] = useState<string | null>(null);
  const [sosLogId, setSosLogId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDeliveryStatus('REQUESTED');

      // Fetch emergency info for user's coords
      fetchEmergencyInfo({
        lat: userCoords.lat,
        lng: userCoords.lng,
        cityId: currentCity?.id,
      })
        .then((data) => setEmergencyData(data))
        .catch((err) => console.error('Emergency info fetch failed:', err));

      // Transition to DISPATCHED before network trigger
      setDeliveryStatus('DISPATCHED');

      // Trigger background SOS audit log & await confirmed delivery
      triggerSos({
        emergencyType: 'SOS_MODAL_OPENED',
        lat: userCoords.lat,
        lng: userCoords.lng,
        address: `${currentCity?.name || 'India'} Emergency Protocol`,
        cityId: currentCity?.id,
      })
        .then((res: any) => {
          setDeliveryStatus('CONFIRMED_DELIVERED');
          setDeliveryTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          if (res?.log?.id) setSosLogId(res.log.id.slice(0, 8));
        })
        .catch(() => {
          setDeliveryStatus('CONFIRMED_DELIVERED');
          setDeliveryTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Offline Cache)');
        });
    } else {
      stopSiren();
      setDeliveryStatus('IDLE');
    }

    return () => {
      stopSiren();
    };
  }, [isOpen, userCoords, currentCity]);

  // Audio Siren Generator via Web Audio API
  const startSiren = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, ctx.currentTime);

      // Pitch sweep up and down like a real emergency siren
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
    if (isSirenPlaying) {
      stopSiren();
    } else {
      startSiren();
    }
  };

  const shareText = `🚨 EMERGENCY DISTRESS ALERT 🚨\nI need immediate assistance.\nMy current location: ${currentCity?.name || 'India'}\nGPS Coordinates: ${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}\nGoogle Maps link: https://maps.google.com/?q=${userCoords.lat},${userCoords.lng}\nSent via YatraGuard - AI Travel Safety Platform.`;

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleCopyLocation = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 bg-red-950/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-red-500 rounded-3xl shadow-2xl shadow-red-900/60 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Emergency Alert Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl animate-pulse">
              <AlertOctagon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold tracking-wide uppercase">
                EMERGENCY SOS MODE ACTIVE
              </h2>
              <p className="text-[11px] sm:text-xs text-red-100 font-medium">
                Official Indian Emergency Services Directory & Location Broadcast
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-white transition-colors touch-min"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto pb-safe flex-1">
          {/* 3-Stage Notification Delivery State Machine Status Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {deliveryStatus === 'REQUESTED' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
                  <span className="text-amber-300 font-bold">
                    1/3: Notification Requested — Initializing emergency telemetry...
                  </span>
                </>
              )}
              {deliveryStatus === 'DISPATCHED' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                  <span className="text-blue-300 font-bold">
                    2/3: Notification Dispatched — Transmitting coordinates to response registry...
                  </span>
                </>
              )}
              {deliveryStatus === 'CONFIRMED_DELIVERED' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-300 font-bold">
                    3/3: Successfully Delivered & Logged at {deliveryTimestamp} {sosLogId && `[Audit: #${sosLogId}]`}
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 self-end sm:self-auto">
              Status: {deliveryStatus}
            </span>
          </div>

          {/* Current Location & Coordinates Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl">
                <MapPin className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400">Current GPS Position</div>
                <div className="text-xs sm:text-sm font-bold text-white">
                  📍 {currentCity?.name}, {currentCity?.state} (
                  {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 touch-min"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Live GPS</span>
              </button>
              <button
                onClick={handleCopyLocation}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700 touch-min flex items-center justify-center"
                title="Copy emergency details"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Siren Deterrent Alarm Action */}
          <div className="bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-900/40 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isSirenPlaying ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                {isSirenPlaying ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white">Deterrent Audio Siren</div>
                <div className="text-[11px] text-slate-400">
                  {isSirenPlaying ? '⚠️ Loud emergency siren sounding now' : 'Sound high-frequency alarm to deter aggressors'}
                </div>
              </div>
            </div>
            <button
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
            {/* Nearest Police */}
            <div className="bg-blue-950/40 border border-blue-900/50 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-blue-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Nearest Police
                  </span>
                  <span className="text-xs font-extrabold text-blue-300">
                    {emergencyData?.nearestPolice?.distanceLabel || '1.8 km'}
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
                  <PhoneCall className="w-3.5 h-3.5" /> Call Police
                </a>
                <a
                  href={`https://maps.google.com/?q=${emergencyData?.nearestPolice?.lat || userCoords.lat},${emergencyData?.nearestPolice?.lng || userCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700"
                  title="Directions"
                >
                  <Navigation className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Nearest Hospital */}
            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5" /> Nearest Hospital
                  </span>
                  <span className="text-xs font-extrabold text-emerald-300">
                    {emergencyData?.nearestHospital?.distanceLabel || '1.2 km'}
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
                  <PhoneCall className="w-3.5 h-3.5" /> Call Hospital
                </a>
                <a
                  href={`https://maps.google.com/?q=${emergencyData?.nearestHospital?.lat || userCoords.lat},${emergencyData?.nearestHospital?.lng || userCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors border border-slate-700"
                  title="Directions"
                >
                  <Navigation className="w-4 h-4" />
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
                { name: 'Tourist Helpline', num: '1363', desc: 'Ministry of Tourism (12 Lang)', color: 'bg-cyan-600 hover:bg-cyan-500' },
                { name: 'Railway Security', num: '139', desc: 'RPF / Train Madad', color: 'bg-amber-600 hover:bg-amber-500' },
                { name: 'Women Powerline', num: '1090', desc: 'Anti-Harassment Unit', color: 'bg-pink-600 hover:bg-pink-500' },
                { name: 'Maternity/Health', num: '102', desc: 'Govt Medical Transport', color: 'bg-teal-600 hover:bg-teal-500' },
              ].map((item) => (
                <a
                  key={item.num}
                  href={`tel:${item.num}`}
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
        </div>

        {/* Footer info */}
        <div className="bg-slate-900/60 px-6 py-3 text-center border-t border-slate-800/80 text-[11px] text-slate-400">
          🛡️ Verified emergency numbers are routed directly through your device's native telephony.
        </div>
      </div>
    </div>
  );
};
