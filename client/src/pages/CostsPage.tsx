import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Utensils,
  Hotel,
  Ticket,
  Compass,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Car,
  Footprints,
  Sparkles,
  ShieldCheck,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { fetchPriceRecords, submitPriceRecord } from '../services/api';
import { PageHeader, EmptyState, LoadingSkeleton } from '../components/ui';

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'FOOD_DINING', label: '🍽️ Food & Restaurants' },
  { id: 'STREET_FOOD', label: '🥟 Street Food' },
  { id: 'HOTEL_RESORT', label: '🏨 Hotels & Resorts' },
  { id: 'HOSTEL', label: '🛏️ Hostels & Dorms' },
  { id: 'HOMESTAY', label: '🏡 Homestays' },
  { id: 'ATTRACTION_ENTRY', label: '🏛️ Monument Tickets' },
  { id: 'ADVENTURE_ACTIVITY', label: '🪂 Adventure Activities' },
  { id: 'LOCAL_SHOPPING', label: '🛍️ Local Shopping' },
  { id: 'PARKING', label: '🅿️ Parking' },
  { id: 'LOCAL_TRANSPORT', label: '🛵 Scooter & Bike Rental' },
  { id: 'SERVICES', label: '💼 Local Services' },
];

export const CostsPage: React.FC = () => {
  const { cities, currentCity } = useCity();
  const { showToast } = useToast();

  const [prices, setPrices] = useState<any[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>(currentCity?.id || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Submit Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitCategory, setSubmitCategory] = useState('FOOD_DINING');
  const [submitItemName, setSubmitItemName] = useState('');
  const [submitMinPrice, setSubmitMinPrice] = useState('');
  const [submitMaxPrice, setSubmitMaxPrice] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitSourceRef, setSubmitSourceRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPrices = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPriceRecords({
        cityId: selectedCityId !== 'ALL' ? selectedCityId : undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        search: searchQuery.trim() || undefined,
      });
      setPrices(data || []);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      showToast('Failed to load local price records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentCity) {
      setSelectedCityId(currentCity.id);
    }
  }, [currentCity]);

  useEffect(() => {
    loadPrices();
  }, [selectedCityId, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPrices();
  };

  const handleSubmitPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitItemName.trim() || !submitMinPrice) {
      showToast('Please provide an item name and minimum price', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetCity = cities.find((c) => c.id === selectedCityId) || currentCity || cities[0];
      await submitPriceRecord({
        cityId: targetCity.id,
        category: submitCategory,
        itemName: submitItemName.trim(),
        minPrice: parseFloat(submitMinPrice),
        maxPrice: submitMaxPrice ? parseFloat(submitMaxPrice) : parseFloat(submitMinPrice),
        notes: submitNotes.trim() || undefined,
        sourceReference: submitSourceRef.trim() || 'Traveler Verified Submission',
      });

      showToast('Price submission recorded! Added to community benchmark feed.', 'success');
      setIsSubmitModalOpen(false);
      setSubmitItemName('');
      setSubmitMinPrice('');
      setSubmitMaxPrice('');
      setSubmitNotes('');
      loadPrices();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit price', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'FOOD_DINING':
      case 'STREET_FOOD':
        return <Utensils className="w-4 h-4 text-emerald-400" />;
      case 'HOTEL_RESORT':
      case 'HOSTEL':
      case 'HOMESTAY':
        return <Hotel className="w-4 h-4 text-purple-400" />;
      case 'ATTRACTION_ENTRY':
        return <Ticket className="w-4 h-4 text-blue-400" />;
      case 'ADVENTURE_ACTIVITY':
        return <Compass className="w-4 h-4 text-amber-400" />;
      case 'LOCAL_SHOPPING':
        return <ShoppingBag className="w-4 h-4 text-rose-400" />;
      case 'PARKING':
      case 'LOCAL_TRANSPORT':
        return <Car className="w-4 h-4 text-cyan-400" />;
      default:
        return <IndianRupee className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16 yg-page-enter">
      <PageHeader
        eyebrow="Fair Price Transparency"
        icon={IndianRupee}
        accentColor="amber"
        title="Local Price Benchmarks"
        description="Fair price guides for food, stays, monument tickets, and local services across cities."
        actions={
          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center gap-1.5 keep-white yg-press"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Submit Price Paid</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* City and Search Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-4">
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Destinations ({cities.length} Cities)</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSearchSubmit} className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items like Thali, Scuba Diving, Scooter Rental, Pashmina..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Price Cards Grid */}
      {isLoading ? (
        <LoadingSkeleton variant="card" count={6} />
      ) : prices.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No Price Records Found"
          description="Be the first traveler to submit an authentic price benchmark for this category."
          actionLabel="Submit Price Paid"
          onAction={() => setIsSubmitModalOpen(true)}
          accentColor="amber"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prices.map((record) => (
            <div
              key={record.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Category & City */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      {getCategoryIcon(record.category)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {record.category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                    {record.city?.name || 'Local Destination'}
                  </span>
                </div>

                {/* Item Name */}
                <h3 className="text-base font-black text-white leading-snug">{record.itemName}</h3>

                {/* Price Display */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500 font-bold uppercase">Fair Benchmark</span>
                  <div className="text-xl font-black text-amber-400">
                    ₹{record.minPrice}{' '}
                    {record.maxPrice > record.minPrice && (
                      <span className="text-slate-400 text-sm font-semibold">
                        – ₹{record.maxPrice}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes & Authority Reference */}
                {record.notes && (
                  <p className="text-xs text-slate-400 leading-relaxed">{record.notes}</p>
                )}
              </div>

              {/* Footer Meta */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[170px]" title={record.sourceReference || 'Benchmark'}>
                  Source: {record.sourceReference || record.sourceType}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {record.verificationStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Local Price Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Submit Real Local Price Paid</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPrice} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={submitCategory}
                  onChange={(e) => setSubmitCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {CATEGORIES.filter((c) => c.id !== 'ALL').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Item or Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={submitItemName}
                  onChange={(e) => setSubmitItemName(e.target.value)}
                  placeholder="e.g. Traditional Himachali Thali or Solang Paragliding"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Min Price Paid (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={submitMinPrice}
                    onChange={(e) => setSubmitMinPrice(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Max Price Paid (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={submitMaxPrice}
                    onChange={(e) => setSubmitMaxPrice(e.target.value)}
                    placeholder="e.g. 400"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Vendor Name / Street Location
                </label>
                <input
                  type="text"
                  value={submitSourceRef}
                  onChange={(e) => setSubmitSourceRef(e.target.value)}
                  placeholder="e.g. Old Manali River Road Cafe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Traveler Advice / Context
                </label>
                <textarea
                  rows={2}
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                  placeholder="e.g. Standard rate includes video recording. Avoid roadside agents asking more."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
              >
                {isSubmitting ? <span>Recording Price...</span> : <span>Submit Community Price</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
