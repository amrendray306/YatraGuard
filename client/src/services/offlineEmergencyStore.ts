export interface OfflineContactSummary {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary?: boolean;
}

export interface OfflinePlaceSummary {
  name: string;
  address?: string;
  phone?: string | null;
  distanceLabel?: string;
  lat?: number;
  lng?: number;
}

export interface OfflineTripSummary {
  title: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface OfflineRouteSummary {
  originName: string;
  destName: string;
  distanceKm: number;
  travelMode: string;
  estimatedMinutes: number;
}

export interface OfflineEmergencyPacket {
  syncedAt: string;
  cityName: string;
  cityState: string;
  lastCoords: {
    lat: number;
    lng: number;
    address: string;
    capturedAt: string;
  };
  contacts: OfflineContactSummary[];
  nearestHospital?: OfflinePlaceSummary | null;
  nearestPolice?: OfflinePlaceSummary | null;
  activeTrip?: OfflineTripSummary | null;
  savedRoutes: OfflineRouteSummary[];
  savedDestinations: Array<{ cityName: string; state: string }>;
  officialHelplines: Array<{ name: string; number: string; desc: string }>;
}

const STORAGE_KEY = 'yatraguard_offline_emergency_packet_v1';

export const STATIC_OFFICIAL_HELPLINES = [
  { name: 'Unified National Emergency', number: '112', desc: 'Police, Fire & Ambulance Pan-India' },
  { name: 'Police Control Room', number: '100', desc: 'Immediate Local Police Dispatch' },
  { name: 'National Ambulance', number: '108', desc: 'Free 24x7 Medical Trauma Care' },
  { name: 'Women in Distress', number: '1091', desc: '24x7 Women Safety Helpline' },
  { name: 'UP Women Powerline', number: '1090', desc: 'Dedicated Women Rapid Support' },
  { name: 'Tourist Infoline', number: '1363', desc: 'Ministry of Tourism Multi-lingual' },
  { name: 'Railway Security (RPF)', number: '139', desc: 'Train & Station Emergency Help' },
  { name: 'Disaster Helpline', number: '1078', desc: 'Floods, Landslides & Mountain Rescue' },
];

export const OFFLINE_PHRASES = [
  {
    hi: 'मुझे तुरंत मदद चाहिए। कृपया पुलिस को 112 पर फोन करें।',
    en: 'I need immediate help. Please call the police at 112.',
  },
  {
    hi: 'कृपया एम्बुलेंस को 108 पर कॉल करें, यहाँ कोई घायल है।',
    en: 'Please call an ambulance at 108, someone is injured here.',
  },
  {
    hi: 'नजदीकी अस्पताल या पुलिस स्टेशन किस तरफ है?',
    en: 'Which way is the nearest hospital or police station?',
  },
  {
    hi: 'मेरा सामान या फोन खो गया है। मुझे शिकायत दर्ज करनी है।',
    en: 'My luggage or phone is lost. I need to file a police report.',
  },
];

export function loadOfflinePacket(): OfflineEmergencyPacket | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveOfflinePacket(packet: OfflineEmergencyPacket): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packet));
  } catch (err) {
    console.warn('Could not persist offline emergency packet:', err);
  }
}

export function getPacketFreshness(syncedAt?: string): {
  label: string;
  isStale: boolean;
} {
  if (!syncedAt) return { label: 'Never synced', isStale: true };
  const diffMs = Date.now() - new Date(syncedAt).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return { label: 'Just synced', isStale: false };
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return { label: 'Just now', isStale: false };
  if (mins < 60) return { label: `${mins} min ago`, isStale: false };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { label: `${hours}h ago`, isStale: false };
  const days = Math.floor(hours / 24);
  return { label: `${days}d ago (Stale — sync when online)`, isStale: true };
}
