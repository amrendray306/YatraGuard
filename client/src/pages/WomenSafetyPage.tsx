import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  PhoneCall,
  MapPin,
  Share2,
  MessageSquare,
  AlertTriangle,
  HeartPulse,
  Shield,
  Navigation,
  EyeOff,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchNearbyPlaces,
  fetchEmergencyContacts,
  fetchIncidents,
  triggerSos,
} from '../services/api';
import { EnrichedNearbyPlace, EmergencyContact } from '../types';
import { PageHeader, LoadingSkeleton } from '../components/ui';

interface WomenSafetyPageProps {
  openEmergencyModal: () => void;
  openIncidentModal: () => void;
}

export const WomenSafetyPage: React.FC<WomenSafetyPageProps> = ({
  openEmergencyModal,
  openIncidentModal,
}) => {
  const { currentCity, userCoords, userAddress } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [safeHubs, setSafeHubs] = useState<EnrichedNearbyPlace[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [harassmentAlerts, setHarassmentAlerts] = useState<any[]>([]);
  const [privacyMode, setPrivacyMode] = useState(true);
  const [checkInNote, setCheckInNote] = useState('Reaching hotel shortly, sharing live coordinates.');

  useEffect(() => {
    setLoadingHubs(true);
    Promise.allSettled([
      fetchNearbyPlaces({
        lat: userCoords.lat,
        lng: userCoords.lng,
        radiusKm: 10,
        limit: 12,
        sortBy: 'distance',
      }),
      fetchIncidents({
        cityId: currentCity?.id,
        category: 'harassment',
        limit: 5,
      }),
    ])
      .then(([placesRes, incRes]) => {
        if (placesRes.status === 'fulfilled') {
          const all: EnrichedNearbyPlace[] = placesRes.value?.places || [];
          const filtered = all.filter((p) =>
            ['POLICE', 'HOSPITAL', 'PHARMACY', 'TRANSPORT'].includes(p.category)
          );
          setSafeHubs(filtered.slice(0, 8));
        }
        if (incRes.status === 'fulfilled') {
          setHarassmentAlerts(incRes.value?.incidents || []);
        }
      })
      .finally(() => setLoadingHubs(false));
  }, [userCoords.lat, userCoords.lng, currentCity?.id]);

  useEffect(() => {
    if (user) {
      fetchEmergencyContacts()
        .then((res) => setContacts(res.contacts || []))
        .catch(() => {});
    }
  }, [user?.id]);

  const checkInText = `Safe Check-In from ${user?.name || 'Traveler'}: ${checkInNote}\nLocation: ${
    userAddress || currentCity?.name || 'India'
  } (${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(
    5
  )})\nMaps: https://maps.google.com/?q=${userCoords.lat},${userCoords.lng}`;

  const handleShareCheckIn = (channel: 'WHATSAPP' | 'SMS', phone?: string) => {
    triggerSos({
      emergencyType: `WOMEN_SAFETY_CHECKIN_${channel}`,
      lat: userCoords.lat,
      lng: userCoords.lng,
      address: userAddress || currentCity?.name || 'Check-in GPS',
      cityId: currentCity?.id,
      messageText: checkInText,
      sharedWithCount: 1,
      status: 'LOGGED_CLIENT_ACTION',
    }).catch(() => {});

    if (channel === 'WHATSAPP') {
      const clean = phone ? phone.replace(/[^0-9]/g, '') : '';
      const base = clean ? `https://wa.me/${clean}` : 'https://wa.me/';
      window.open(`${base}?text=${encodeURIComponent(checkInText)}`, '_blank');
    } else {
      window.location.href = `sms:${phone || ''}?body=${encodeURIComponent(checkInText)}`;
    }
    showToast('Check-in draft opened in messaging app', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6 yg-page-enter">
      <PageHeader
        eyebrow="Dedicated Safety Toolkit"
        icon={ShieldCheck}
        accentColor="purple"
        title="Women Traveller Safety Center"
        description="1-tap dedicated helplines, trusted check-in sharing, nearby police/medical hubs, and verified safety advisories."
        actions={
          <>
            <button
              type="button"
              onClick={openIncidentModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-2 keep-white"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>Report Unsafe Spot</span>
            </button>
            <button
              type="button"
              onClick={openEmergencyModal}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 keep-white yg-press"
            >
              <PhoneCall className="w-4 h-4" aria-hidden="true" />
              <span>Emergency SOS Desk</span>
            </button>
          </>
        }
      />

      {/* Honest Situational Safety Disclaimer */}
      <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/35 border border-purple-200 dark:border-purple-800/60 flex items-start gap-3 text-xs text-purple-950 dark:text-purple-200">
        <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong>Situational Safety Notice:</strong> Proximity to police stations or public hubs improves emergency response options, but <strong>no route or area can be guaranteed 100% safe</strong>. Keep trusted check-ins active, verify vehicle license plates, and call 1091 or 112 immediately if anything feels wrong.
        </div>
      </div>

      {/* Dedicated Helplines */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { num: '1091', name: 'Women Helpline', desc: '24x7 National Cell', color: 'text-purple-600 dark:text-purple-400' },
          { num: '1090', name: 'UP Women Power', desc: 'Anti-Harassment Unit', color: 'text-pink-600 dark:text-pink-400' },
          { num: '181', name: 'Women Support', desc: 'State Crisis Support', color: 'text-indigo-600 dark:text-indigo-400' },
          { num: '112', name: 'Unified SOS', desc: 'Police / Medical', color: 'text-red-600 dark:text-red-400' },
          { num: '139', name: 'Railway RPF', desc: 'Train Security Help', color: 'text-amber-600 dark:text-amber-400' },
          { num: '108', name: 'Ambulance', desc: 'Free 24x7 Trauma', color: 'text-emerald-600 dark:text-emerald-400' },
        ].map((h) => (
          <a
            key={h.num}
            href={`tel:${h.num}`}
            className="yg-card p-3.5 hover:border-purple-400 dark:hover:border-purple-700 transition-colors space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className={`text-lg font-black ${h.color}`}>{h.num}</span>
              <PhoneCall className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">{h.name}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{h.desc}</div>
          </a>
        ))}
      </section>

      {/* Check-In + Privacy Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 yg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Trusted Contact Safe Check-In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share live GPS coordinates and cab/hotel notes via WhatsApp or SMS.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {userCoords.lat.toFixed(3)}, {userCoords.lng.toFixed(3)}
            </span>
          </div>

          <textarea
            rows={2}
            value={checkInNote}
            onChange={(e) => setCheckInNote(e.target.value)}
            placeholder="Add cab number, hotel name, or route note..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleShareCheckIn('WHATSAPP', contacts[0]?.phone)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 keep-white"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Share Check-In (WhatsApp)</span>
            </button>
            <button
              type="button"
              onClick={() => handleShareCheckIn('SMS', contacts[0]?.phone)}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 keep-white"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Share Check-In (SMS)</span>
            </button>
          </div>

          {contacts.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleShareCheckIn('WHATSAPP', c.phone)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                >
                  Send to {c.name} ({c.relation})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="yg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              Privacy & Travel Safeguards
            </h2>
          </div>

          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs cursor-pointer">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Mask public itinerary sharing details
            </span>
            <input
              type="checkbox"
              checked={privacyMode}
              onChange={(e) => setPrivacyMode(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
          </label>

          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>Share cab registration plate & driver details before boarding at night.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>Enable Offline Emergency Packet before entering low-signal hill/highway zones.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>Meet Travel Buddy matches strictly at verified daytime public landmarks.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Nearby Verified Safe Hubs */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Nearby Verified Police Stations, Hospitals & Transit Hubs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Closest registered support services near your current sector ({currentCity?.name || 'India'}).
          </p>
        </div>

        {loadingHubs ? (
          <LoadingSkeleton variant="card" count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {safeHubs.map((hub) => (
              <div key={hub.id} className="yg-card p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800 flex items-center gap-1">
                      {hub.category === 'POLICE' ? (
                        <Shield className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <HeartPulse className="w-3 h-3" aria-hidden="true" />
                      )}
                      {hub.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {hub.roadDistanceLabel || hub.straightLineLabel}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{hub.name}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                    <span>{hub.address}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  {hub.phone && (
                    <a
                      href={`tel:${hub.phone.split('/')[0].trim()}`}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-center font-semibold keep-white"
                    >
                      Call
                    </a>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${hub.lat},${hub.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-center font-semibold flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3 h-3" aria-hidden="true" />
                    Directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {harassmentAlerts.length > 0 && (
        <section className="yg-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
            Recent Sector Harassment & Safety Advisories
          </h2>
          <div className="space-y-2">
            {harassmentAlerts.map((inc) => (
              <div
                key={inc.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="font-bold text-slate-900 dark:text-white">{inc.title}</div>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">{inc.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
