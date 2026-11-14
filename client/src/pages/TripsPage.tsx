import React, { useState, useEffect } from 'react';
import {
  Compass,
  PlusCircle,
  Share2,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  IndianRupee,
  Calendar,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { fetchUserTrips, createTrip } from '../services/api';
import { Trip } from '../types';

interface ItineraryStop {
  time: string;
  activity: string;
  safetyScore: number;
  safetyVerdict: 'HIGH_SAFETY' | 'MODERATE' | 'CAUTION';
  transportMode: string;
  estimatedTransitFare: string;
  safetyTip: string;
}

interface ItineraryDay {
  dayNumber: number;
  title: string;
  theme: string;
  stops: ItineraryStop[];
}

const PRESET_ITINERARIES: Record<string, { title: string; duration: string; days: ItineraryDay[] }> = {
  Manali: {
    title: 'Manali 3-Day Alpine & Mountain Safe Expedition',
    duration: '3 Days / 2 Nights',
    days: [
      {
        dayNumber: 1,
        title: 'Day 1: Cultural Old Manali & Forest Trails',
        theme: 'Heritage, Monasteries & Pine Forests',
        stops: [
          {
            time: '09:30 AM',
            activity: 'Hadimba Devi Ancient Temple & Cedar Woods',
            safetyScore: 88,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Auto Rickshaw from Mall Road',
            estimatedTransitFare: '₹100 – ₹150 (Metered/Fixed)',
            safetyTip: 'Avoid unsolicited photographers charging hidden framing fees.',
          },
          {
            time: '02:00 PM',
            activity: 'Old Manali Cafes & Manu Temple Walk',
            safetyScore: 84,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Walking through Old Village road',
            estimatedTransitFare: 'Free / ₹0',
            safetyTip: 'Keep on well-lit stone paths; avoid steep hillside edges after dusk.',
          },
          {
            time: '06:00 PM',
            activity: 'Mall Road Stroll & Tibetan Monastery',
            safetyScore: 90,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Pedestrian Only Zone',
            estimatedTransitFare: 'Free',
            safetyTip: 'Beware of touts peddling fake saffron and substandard pashminas.',
          },
        ],
      },
      {
        dayNumber: 2,
        title: 'Day 2: Solang Valley & Adventure Sports',
        theme: 'Snow Activities, Cable Car & Waterfalls',
        stops: [
          {
            time: '08:30 AM',
            activity: 'Scenic Mountain Drive to Solang Valley (13 km)',
            safetyScore: 82,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Manali Taxi Operators Union Cab',
            estimatedTransitFare: '₹1,400 – ₹1,800 Round-trip',
            safetyTip: 'Do not rent snow dress at private road stops for ₹1,500; official stalls charge ₹250–₹350.',
          },
          {
            time: '01:30 PM',
            activity: 'Anjani Mahadev Trek & Paragliding Area',
            safetyScore: 78,
            safetyVerdict: 'MODERATE',
            transportMode: 'Walk / Pony Ride',
            estimatedTransitFare: '₹400 – ₹600 (Pony negotiation)',
            safetyTip: 'Only book paragliding with pilots having valid Himachal Tourism licences and insurance.',
          },
        ],
      },
      {
        dayNumber: 3,
        title: 'Day 3: Atal Tunnel & Sissu Valley',
        theme: 'Engineering Marvel & Lahaul Trans-Himalayas',
        stops: [
          {
            time: '09:00 AM',
            activity: 'Atal Tunnel North Portal & Sissu Waterfall',
            safetyScore: 76,
            safetyVerdict: 'MODERATE',
            transportMode: 'Union 4x4 / Shared Cab',
            estimatedTransitFare: '₹2,400 – ₹3,000 Private / ₹400 Shared',
            safetyTip: 'Depart by 15:30 PM to avoid sudden sub-zero black ice on mountain hairpin turns.',
          },
        ],
      },
    ],
  },
  Haridwar: {
    title: 'Haridwar & Rishikesh 2-Day Spiritual & River Rafting Trail',
    duration: '2 Days / 1 Night',
    days: [
      {
        dayNumber: 1,
        title: 'Day 1: Sacred Ghats & Hilltop Temples',
        theme: 'Spiritual Immersion & Ganga Aarti',
        stops: [
          {
            time: '10:00 AM',
            activity: 'Mansa Devi Temple Ropeway & Viewpoint',
            safetyScore: 84,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'E-Rickshaw to Ropeway Base',
            estimatedTransitFare: '₹30 – ₹50',
            safetyTip: 'Watch out for aggressive macaques; keep snacks and eyewear inside your bag.',
          },
          {
            time: '05:30 PM',
            activity: 'World-Famous Har Ki Pauri Evening Aarti',
            safetyScore: 82,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Walk via Moti Bazaar',
            estimatedTransitFare: 'Free',
            safetyTip: 'Extremely dense crowds; secure wallets in front zip pockets. Decline touts claiming private VIP seats.',
          },
        ],
      },
      {
        dayNumber: 2,
        title: 'Day 2: Rishikesh Adventure & Suspension Bridges',
        theme: 'White Water Rafting, Yoga & Cafes',
        stops: [
          {
            time: '08:00 AM',
            activity: 'Transit from Haridwar to Rishikesh (28 km)',
            safetyScore: 86,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Private Cab or Shared Vikram',
            estimatedTransitFare: '₹600 – ₹800 (Cab) / ₹100 (Shared)',
            safetyTip: 'Ask the driver to drop at Tapovan or Laxman Jhula parking, avoiding high luggage porter fees.',
          },
          {
            time: '11:00 AM',
            activity: 'Shivpuri to Nim Beach White Water Rafting (16 km)',
            safetyScore: 80,
            safetyVerdict: 'MODERATE',
            transportMode: 'Outfitter Shuttle',
            estimatedTransitFare: 'Included in Rafting Package (₹800–₹1,200)',
            safetyTip: 'Wear the certified life jacket securely; never raft during unseasonal river surges.',
          },
        ],
      },
    ],
  },
  Agra: {
    title: 'Agra 1-Day Heritage & Wonder of the World Tour',
    duration: '1 Full Day',
    days: [
      {
        dayNumber: 1,
        title: 'Day 1: Imperial Mughal Architecture',
        theme: 'Taj Mahal Sunrise to Agra Fort',
        stops: [
          {
            time: '06:00 AM',
            activity: 'Sunrise Visit to Taj Mahal (West Gate)',
            safetyScore: 88,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Prepaid Auto from Hotel / Cantt',
            estimatedTransitFare: '₹120 – ₹160',
            safetyTip: 'Buy tickets exclusively at official ASI portal or counter. Decline touts claiming lines are 4 hours long.',
          },
          {
            time: '11:30 AM',
            activity: 'Agra Fort Palace & Diwan-i-Khas',
            safetyScore: 84,
            safetyVerdict: 'HIGH_SAFETY',
            transportMode: 'Auto Rickshaw (4 km)',
            estimatedTransitFare: '₹80 – ₹100',
            safetyTip: 'Hire only government-badged guides with official Ministry of Tourism photo IDs.',
          },
          {
            time: '04:30 PM',
            activity: 'Mehtab Bagh Sunset Across Yamuna River',
            safetyScore: 78,
            safetyVerdict: 'MODERATE',
            transportMode: 'Cab / Return Auto',
            estimatedTransitFare: '₹150 – ₹200',
            safetyTip: 'Leave the riverbank before full darkness sets in. Stick to the paved garden exit.',
          },
        ],
      },
    ],
  },
};

export const TripsPage: React.FC = () => {
  const { currentCity } = useCity();
  const [activeTab, setActiveTab] = useState<'trips' | 'itinerary'>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('Golden Triangle Heritage Tour');
  const [destinationCity, setDestinationCity] = useState(currentCity?.name || 'Agra');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [contactName, setContactName] = useState('Parent / Spouse Contact');
  const [contactPhone, setContactPhone] = useState('+919876543210');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const selectedPresetKey =
    Object.keys(PRESET_ITINERARIES).find((k) =>
      currentCity?.name?.toLowerCase().includes(k.toLowerCase())
    ) || 'Manali';

  const activeItinerary = PRESET_ITINERARIES[selectedPresetKey];

  const loadTrips = () => {
    fetchUserTrips()
      .then(setTrips)
      .catch(console.error);
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !destinationCity) return;

    try {
      await createTrip({
        title,
        destinationCity,
        currentLocation: `${currentCity?.name || 'Agra'} Heritage Quarter`,
        startDate,
        endDate,
        emergencyContactName: contactName,
        emergencyContactPhone: contactPhone,
      });

      setIsCreating(false);
      loadTrips();
    } catch (err) {
      console.error('Failed to create trip:', err);
    }
  };

  const getShareLink = (token: string) => {
    return `${window.location.origin}/?tab=share&token=${token}`;
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getShareLink(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            YatraGuard Journey & Safety Planner
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Trip Management & Safe Itineraries
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Coordinate multi-day travel, track live family ETA, and evaluate route safety benchmarks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/30 flex items-center gap-2 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isCreating ? 'Cancel' : 'Register New Trip'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('trips')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'trips'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Active Trips & Family Sharing ({trips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('itinerary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'itinerary'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>AI Safe Multi-Day Itinerary ({currentCity?.name || 'Manali'})</span>
        </button>
      </div>

      {/* CREATE TRIP FORM */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="glass-panel p-6 rounded-3xl border border-blue-500/40 space-y-4 animate-fade-in"
        >
          <h3 className="text-sm font-extrabold text-white">Plan & Share a New Journey</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Trip Name</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solo Himachal Expedition"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Destination City</label>
              <input
                type="text"
                required
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="e.g. Manali, Himachal Pradesh"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Emergency ICE Contact Name</label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Rakesh Sharma (Father)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Emergency Contact Phone</label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Save & Generate Live Tracking Link
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1: ACTIVE TRIPS & LIVE TRACKING */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl border border-slate-800 text-center space-y-3">
              <Compass className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Active Trips Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Register a new trip above to generate an encrypted public share link with live location coordinates for your family.
              </p>
            </div>
          ) : (
            trips.map((trip) => (
              <div
                key={trip.id}
                className="glass-panel-elevated rounded-3xl p-6 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Status: {trip.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({trip.startDate} to {trip.endDate})
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white mt-1">{trip.title}</h3>
                  </div>

                  <button
                    onClick={() => handleCopyLink(trip.shareToken)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    {copiedToken === trip.shareToken ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Share Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-blue-400" />
                        <span>Copy Family Share Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase">
                      📍 Current Location
                    </span>
                    <span className="font-bold text-white mt-0.5 block">
                      {trip.currentLocation || `${trip.destinationCity} Sector`}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase">
                      ⏱️ Transit / Destination ETA
                    </span>
                    <span className="font-bold text-emerald-400 mt-0.5 block">
                      {trip.lastKnownEta || 'On Schedule (18 min ETA)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase">
                      📞 Emergency ICE Contact
                    </span>
                    <span className="font-bold text-slate-200 mt-0.5 block">
                      {trip.emergencyContactName} ({trip.emergencyContactPhone})
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-3">
                  <span>Encrypted Public Share URL Active</span>
                  <a
                    href={getShareLink(trip.shareToken)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                  >
                    <span>Preview Family Tracking View</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: AI SAFE MULTI-DAY ITINERARY PLANNER */}
      {activeTab === 'itinerary' && (
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Curated Safe Blueprint
                </span>
                <span className="text-xs text-slate-400">{activeItinerary?.duration || '3 Days'}</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                {activeItinerary?.title || `${currentCity?.name} Safe Itinerary`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Each stop is calibrated with localized safety scores, regulated transit fares, and proactive scam warnings.
              </p>
            </div>

            <button
              onClick={() => {
                setTitle(activeItinerary?.title || `${currentCity?.name} Trip`);
                setDestinationCity(currentCity?.name || 'Manali');
                setIsCreating(true);
                setActiveTab('trips');
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-900/40 flex items-center gap-1.5 transition-colors flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Apply to My Active Trip</span>
            </button>
          </div>

          {/* Days Accordion / Timeline */}
          <div className="space-y-6">
            {activeItinerary?.days?.map((day) => (
              <div
                key={day.dayNumber}
                className="glass-panel-elevated rounded-3xl p-6 border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-white">{day.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{day.theme}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                    Day {day.dayNumber}
                  </span>
                </div>

                <div className="space-y-4">
                  {day.stops.map((stop, sIdx) => (
                    <div
                      key={sIdx}
                      className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {stop.time}
                          </span>
                          <h4 className="text-sm font-extrabold text-white">{stop.activity}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              stop.safetyScore >= 85
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            🛡️ Safety: {stop.safetyScore}/100
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                            <IndianRupee className="w-3 h-3 text-amber-400" /> Recommended Transit & Fare
                          </span>
                          <span className="font-semibold text-white mt-0.5 block">
                            {stop.transportMode}
                          </span>
                          <span className="text-emerald-400 font-bold block mt-0.5">
                            Fair Fare: {stop.estimatedTransitFare}
                          </span>
                        </div>

                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-amber-400 block flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Safety Tip & Scam Watch
                          </span>
                          <p className="text-slate-300 mt-0.5 leading-relaxed">
                            {stop.safetyTip}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
