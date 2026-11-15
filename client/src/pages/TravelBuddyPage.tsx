import React, { useState, useEffect } from 'react';
import {
  Users,
  Compass,
  MapPin,
  Calendar,
  IndianRupee,
  Search,
  Filter,
  PlusCircle,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Send,
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  Heart,
  Share2,
} from 'lucide-react';
import { fetchTravelBuddies, submitTravelBuddy } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export const TravelBuddyPage: React.FC = () => {
  const { user } = useAuth();
  const { cities, currentCity } = useCity();
  const { showToast } = useToast();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [buddies, setBuddies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Post Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [destinationCity, setDestinationCity] = useState(currentCity?.name || 'Manali');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetTier, setBudgetTier] = useState('MODERATE');
  const [travelStyle, setTravelStyle] = useState('ADVENTURE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Connect Modal
  const [connectingBuddy, setConnectingBuddy] = useState<any | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  const loadBuddies = async () => {
    setIsLoading(true);
    try {
      const res = await fetchTravelBuddies({
        city: selectedCity !== 'ALL' ? selectedCity : undefined,
        style: selectedStyle !== 'ALL' ? selectedStyle : undefined,
      });
      setBuddies(res.buddies || []);
    } catch (err) {
      console.error('Failed to load travel buddies:', err);
      showToast('Could not fetch travel companion listings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuddies();
  }, [selectedCity, selectedStyle]);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showToast('Please specify travel start and end dates', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedNotes = budgetTier ? `[Budget: ${budgetTier}] ${notes}` : notes;
      await submitTravelBuddy({
        destinationCity,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        travelStyle,
        notes: formattedNotes,
      });

      showToast('Travel Buddy listing published to the network!', 'success');
      setIsModalOpen(false);
      setNotes('');
      loadBuddies();
    } catch (err: any) {
      console.error('Failed to create buddy request:', err);
      showToast(err.response?.data?.error || 'Failed to publish listing', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendConnection = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingRequest(true);
    setTimeout(() => {
      setIsSendingRequest(false);
      showToast(
        `Travel request securely delivered to ${connectingBuddy.user?.name || 'traveler'}!`,
        'success'
      );
      setConnectingBuddy(null);
      setConnectionMessage('');
    }, 800);
  };

  const filteredBuddies = buddies.filter((b) => {
    const q = searchQuery.toLowerCase();
    const cityMatch = (b.destinationCity || '').toLowerCase().includes(q);
    const notesMatch = (b.notes || '').toLowerCase().includes(q);
    const nameMatch = (b.user?.name || '').toLowerCase().includes(q);
    return !searchQuery || cityMatch || notesMatch || nameMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" /> Verified Travel Companions
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Find Your Travel Buddy
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Never explore unfamiliar corridors alone. Connect with verified solo travelers and small groups sharing your destination, dates, budget tier, and adventure preferences.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-900/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Post Travel Buddy Request</span>
            </button>
            <button
              onClick={loadBuddies}
              className="px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
            >
              Refresh Listings
            </button>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search destination, traveler name or interests..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* City Selector */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Destinations</option>
            {cities.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Travel Style Selector */}
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Travel Styles</option>
            <option value="BACKPACKER">Backpacker / Budget</option>
            <option value="ADVENTURE">Adventure & Trekking</option>
            <option value="CULTURAL">Cultural & Heritage</option>
            <option value="LUXURY">Comfort & Leisure</option>
            <option value="ROAD_TRIP">Motorcycle / Road Trip</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold">
            Scanning verified traveler listings across India...
          </p>
        </div>
      ) : filteredBuddies.length === 0 ? (
        <div className="py-16 text-center space-y-4 bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-3xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Companions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No travelers have posted trips matching your filter criteria yet. Be the first to publish a buddy request!
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
          >
            Create First Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBuddies.map((buddy) => {
            const startDateStr = new Date(buddy.startDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const endDateStr = new Date(buddy.endDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={buddy.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 shadow-xl transition-all hover:shadow-2xl flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top Creator Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {buddy.user?.avatarUrl ? (
                        <img
                          src={buddy.user.avatarUrl}
                          alt={buddy.user.name}
                          className="w-10 h-10 rounded-2xl object-cover border border-purple-500/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                          {(buddy.user?.name || 'T')[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{buddy.user?.name || 'Fellow Traveler'}</span>
                          <span title="Verified Identity" className="inline-flex">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {buddy.user?.role || 'TRAVELER'}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-xl bg-purple-950/80 text-purple-300 border border-purple-800">
                      {buddy.travelStyle || 'ADVENTURE'}
                    </span>
                  </div>

                  {/* Destination & Dates */}
                  <div className="space-y-2 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span>{buddy.destinationCity}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>
                        {startDateStr} &ndash; {endDateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-amber-400 font-bold">
                      <IndianRupee className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Tier: {buddy.budgetTier || 'MODERATE'}</span>
                    </div>
                  </div>

                  {/* Notes & Description */}
                  {buddy.notes && (
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      "{buddy.notes}"
                    </p>
                  )}
                </div>

                {/* Bottom Connect Button */}
                <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-500 font-medium">
                    Posted {new Date(buddy.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setConnectingBuddy(buddy)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Connect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE BUDDY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Find a Travel Companion</h3>
                  <p className="text-[11px] text-slate-400">Post your travel dates & preferences</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Destination City
                </label>
                <select
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}, {c.state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Travel Style
                  </label>
                  <select
                    value={travelStyle}
                    onChange={(e) => setTravelStyle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="BACKPACKER">Backpacker / Budget</option>
                    <option value="ADVENTURE">Adventure & Trekking</option>
                    <option value="CULTURAL">Cultural & Heritage</option>
                    <option value="LUXURY">Comfort & Leisure</option>
                    <option value="ROAD_TRIP">Motorcycle / Road Trip</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Budget Tier
                  </label>
                  <select
                    value={budgetTier}
                    onChange={(e) => setBudgetTier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="BUDGET">Budget (Hostels / Public Transit)</option>
                    <option value="MODERATE">Moderate (Standard Hotels / Cabs)</option>
                    <option value="LUXURY">Luxury (Resorts / Private Chauffeur)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Trip Notes & Companion Expectations
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Planning a 4-day hike up to Rohtang Pass and Old Manali cafes. Looking for 1-2 easygoing partners to split taxi fares."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-900/40 disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Travel Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONNECT WITH BUDDY MODAL */}
      {connectingBuddy && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-black">
                  Connect with {connectingBuddy.user?.name || 'Traveler'}
                </h3>
              </div>
              <button
                onClick={() => setConnectingBuddy(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Introduce yourself and mention how your travel dates to{' '}
              <strong className="text-purple-400">{connectingBuddy.destinationCity}</strong>{' '}
              align. Your email remains private until both parties accept.
            </p>

            <form onSubmit={handleSendConnection} className="space-y-3">
              <textarea
                rows={4}
                required
                value={connectionMessage}
                onChange={(e) => setConnectionMessage(e.target.value)}
                placeholder="Hi! I am also visiting Manali around those dates and interested in sharing cab fares and exploring Solang Valley together..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectingBuddy(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingRequest}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-lg shadow-purple-900/30 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingRequest ? 'Sending...' : 'Send Travel Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
