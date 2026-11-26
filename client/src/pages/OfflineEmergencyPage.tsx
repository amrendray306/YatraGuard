import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  PhoneCall,
  RefreshCw,
  MapPin,
  Shield,
  HeartPulse,
  MessageSquare,
  Compass,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Navigation,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchEmergencyInfo,
  fetchEmergencyContacts,
  fetchUserTrips,
  fetchSavedRouteBookmarks,
  fetchSavedDestinations,
} from '../services/api';
import {
  loadOfflinePacket,
  saveOfflinePacket,
  getPacketFreshness,
  STATIC_OFFICIAL_HELPLINES,
  OFFLINE_PHRASES,
  OfflineEmergencyPacket,
} from '../services/offlineEmergencyStore';
import { PageHeader } from '../components/ui';

export const OfflineEmergencyPage: React.FC = () => {
  const { currentCity, userCoords, userAddress } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [packet, setPacket] = useState<OfflineEmergencyPacket | null>(() => loadOfflinePacket());
  const [syncing, setSyncing] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const syncNow = async (silent = false) => {
    if (!navigator.onLine) {
      if (!silent) showToast('Cannot sync while offline — showing last saved snapshot', 'error');
      return;
    }

    setSyncing(true);
    try {
      const [infoRes, contactsRes, tripsRes, routesRes, destsRes] = await Promise.allSettled([
        fetchEmergencyInfo({
          lat: userCoords.lat,
          lng: userCoords.lng,
          cityId: currentCity?.id,
        }),
        user ? fetchEmergencyContacts() : Promise.resolve({ contacts: [] }),
        user ? fetchUserTrips() : Promise.resolve([]),
        user ? fetchSavedRouteBookmarks() : Promise.resolve({ routes: [] }),
        user ? fetchSavedDestinations() : Promise.resolve([]),
      ]);

      const info = infoRes.status === 'fulfilled' ? infoRes.value : null;
      const contactsList =
        contactsRes.status === 'fulfilled' ? contactsRes.value?.contacts || [] : [];

      if (contactsList.length === 0 && user?.emergencyContactPhone) {
        contactsList.push({
          id: 'profile-contact',
          name: user.emergencyContactName || 'Profile Emergency Contact',
          phone: user.emergencyContactPhone,
          relation: 'Profile',
          isPrimary: true,
        });
      }

      const trips = tripsRes.status === 'fulfilled' && Array.isArray(tripsRes.value) ? tripsRes.value : [];
      const activeTrip = trips[0]
        ? {
            title: trips[0].title,
            destinationCity: trips[0].destinationCity,
            startDate: trips[0].startDate,
            endDate: trips[0].endDate,
            emergencyContactName: trips[0].emergencyContactName,
            emergencyContactPhone: trips[0].emergencyContactPhone,
          }
        : null;

      const savedRoutes =
        routesRes.status === 'fulfilled' && Array.isArray(routesRes.value?.routes)
          ? routesRes.value.routes.slice(0, 5)
          : [];

      const savedDestinations =
        destsRes.status === 'fulfilled' && Array.isArray(destsRes.value)
          ? destsRes.value.slice(0, 6).map((d: any) => ({
              cityName: d.cityName,
              state: d.state,
            }))
          : [];

      const nextPacket: OfflineEmergencyPacket = {
        syncedAt: new Date().toISOString(),
        cityName: currentCity?.name || 'India',
        cityState: currentCity?.state || '',
        lastCoords: {
          lat: userCoords.lat,
          lng: userCoords.lng,
          address: userAddress || currentCity?.name || 'Current Sector',
          capturedAt: new Date().toISOString(),
        },
        contacts: contactsList,
        nearestHospital: info?.nearestHospital || null,
        nearestPolice: info?.nearestPolice || null,
        activeTrip,
        savedRoutes,
        savedDestinations,
        officialHelplines: STATIC_OFFICIAL_HELPLINES,
      };

      saveOfflinePacket(nextPacket);
      setPacket(nextPacket);
      if (!silent) showToast('Offline emergency packet synced for low-network travel', 'success');
    } catch {
      if (!silent) showToast('Failed to sync offline packet', 'error');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (isOnline && currentCity) {
      syncNow(true);
    }
  }, [isOnline, currentCity?.id, user?.id]);

  const freshness = getPacketFreshness(packet?.syncedAt);
  const displayHelplines = packet?.officialHelplines || STATIC_OFFICIAL_HELPLINES;
  const coords = packet?.lastCoords || {
    lat: userCoords.lat,
    lng: userCoords.lng,
    address: userAddress || currentCity?.name || 'India',
    capturedAt: new Date().toISOString(),
  };

  const smsTemplate = `SOS HELP! Last known location: ${coords.address} (${coords.lat.toFixed(
    5
  )}, ${coords.lng.toFixed(5)}). Maps: https://maps.google.com/?q=${coords.lat},${coords.lng}`;

  const copyCoords = () => {
    navigator.clipboard.writeText(smsTemplate);
    setCopiedCoords(true);
    showToast('Offline SOS message & GPS copied', 'success');
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6 yg-page-enter">
      <PageHeader
        eyebrow="Offline Resilience Packet"
        icon={WifiOff}
        accentColor="red"
        title="Offline Emergency Mode"
        description="Cached emergency contacts, helplines, saved trips, and last known GPS coordinates accessible without internet."
        actions={
          <button
            type="button"
            disabled={!isOnline || syncing}
            onClick={() => syncNow(false)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 keep-white yg-press"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{syncing ? 'Syncing Packet...' : 'Sync Offline Packet'}</span>
          </button>
        }
      />

      {/* Explicit Connectivity & Staleness Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          !isOnline
            ? 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200'
            : freshness.isStale
            ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/60 flex-shrink-0">
            {isOnline ? <Wifi className="w-5 h-5" aria-hidden="true" /> : <WifiOff className="w-5 h-5" aria-hidden="true" />}
          </div>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider">
              {isOnline ? 'Online — Auto-Caching Active' : 'Offline Mode Active — Live Maps & Cloud APIs Unavailable'}
            </div>
            <p className="text-xs mt-0.5">
              {!isOnline
                ? `No internet connection. Live GPS updates and online alerts are unavailable; showing emergency data saved ${
                    packet?.syncedAt ? new Date(packet.syncedAt).toLocaleString('en-IN') : 'in browser storage'
                  }. Cellular phone calls (112/100/108) and SMS still work via your SIM network.`
                : `Last cached snapshot: ${
                    packet?.syncedAt ? new Date(packet.syncedAt).toLocaleString('en-IN') : 'Syncing...'
                  } (${freshness.label})`}
            </p>
          </div>
        </div>
        {freshness.isStale && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-600 text-white keep-white flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            Stale Snapshot
          </span>
        )}
      </div>

      {/* Last Known GPS & Offline SMS Copy */}
      <div className="yg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <MapPin className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Last Known Location ({packet?.cityName || currentCity?.name})
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {coords.address} • <span className="font-mono">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              Captured {new Date(coords.capturedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={copyCoords}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 keep-white self-start sm:self-center"
        >
          {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedCoords ? 'Copied SOS Text' : 'Copy Offline SOS Text'}</span>
        </button>
      </div>

      {/* Official Indian Helplines (1-Tap Cellular Dialing) */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Offline Cellular Emergency Helplines (Tap to Call)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayHelplines.map((h) => (
            <a
              key={h.number}
              href={`tel:${h.number}`}
              className="yg-card p-4 hover:border-red-400 dark:hover:border-red-700 transition-colors flex flex-col justify-between gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-red-600 dark:text-red-400">{h.number}</span>
                <PhoneCall className="w-4 h-4 text-red-500" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{h.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{h.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Trusted Contacts & Cached Nearest Police/Hospital */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="yg-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            Cached Trusted Emergency Contacts
          </h2>

          {!packet?.contacts?.length ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No saved emergency contacts cached yet. Add trusted contacts in the SOS Center while online.
            </p>
          ) : (
            <div className="space-y-2">
              {packet.contacts.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {c.name} <span className="text-[11px] font-normal text-slate-500">({c.relation})</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">{c.phone}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${c.phone}`}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold keep-white"
                    >
                      Call
                    </a>
                    <a
                      href={`sms:${c.phone}?body=${encodeURIComponent(smsTemplate)}`}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold keep-white"
                    >
                      SMS
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="yg-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Cached Nearest Help & Active Itinerary
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" /> Nearest Police
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                {packet?.nearestPolice?.name || 'Dial 112 / 100'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                {packet?.nearestPolice?.address || 'Cached police details unavailable offline'}
              </div>
              {packet?.nearestPolice?.phone && (
                <a
                  href={`tel:${packet.nearestPolice.phone.split('/')[0].trim()}`}
                  className="inline-block mt-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 underline"
                >
                  Call {packet.nearestPolice.phone}
                </a>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5" aria-hidden="true" /> Nearest Hospital
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                {packet?.nearestHospital?.name || 'Dial 108'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                {packet?.nearestHospital?.address || 'Cached hospital details unavailable offline'}
              </div>
              {packet?.nearestHospital?.phone && (
                <a
                  href={`tel:${packet.nearestHospital.phone.split('/')[0].trim()}`}
                  className="inline-block mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 underline"
                >
                  Call {packet.nearestHospital.phone}
                </a>
              )}
            </div>
          </div>

          {packet?.activeTrip && (
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                Cached Active Trip: {packet.activeTrip.title} ({packet.activeTrip.destinationCity})
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                {packet.activeTrip.startDate} to {packet.activeTrip.endDate}
                {packet.activeTrip.emergencyContactPhone &&
                  ` • Trip Contact: ${packet.activeTrip.emergencyContactName} (${packet.activeTrip.emergencyContactPhone})`}
              </div>
            </div>
          )}

          {packet?.savedRoutes && packet.savedRoutes.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Cached Route Summaries
              </div>
              {packet.savedRoutes.slice(0, 3).map((r, idx) => (
                <div key={idx} className="text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="truncate flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-sky-500 flex-shrink-0" aria-hidden="true" />
                    {r.originName} → {r.destName}
                  </span>
                  <span className="font-semibold text-[11px] flex-shrink-0 ml-2">
                    {r.distanceKm} km
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Offline Phrase Cards */}
      <section className="yg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Offline Emergency Phrasebook (Show to Locals / Authorities)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {OFFLINE_PHRASES.map((p, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
            >
              <div className="text-sm font-bold text-amber-700 dark:text-amber-300">{p.hi}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{p.en}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
