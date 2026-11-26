import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  MapPin,
  Calendar,
  MessageSquare,
  CheckCircle2,
  EyeOff,
  Trash2,
  X,
  ShieldCheck,
  PackageSearch,
  Upload,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  fetchLostFoundItems,
  createLostFoundItem,
  updateLostFoundStatus,
  moderateLostFoundItem,
  inquireLostFoundItem,
  fetchLostFoundInquiries,
  deleteLostFoundItem,
  resolveMediaUrl,
} from '../services/api';
import { LostFoundItem, LostFoundInquiry } from '../types';
import { PageHeader, EmptyState, LoadingSkeleton, ConfirmationModal } from '../components/ui';

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'PHONE', label: 'Phone / Electronics' },
  { id: 'WALLET_ID', label: 'Wallet / ID Card' },
  { id: 'LUGGAGE', label: 'Luggage / Bag' },
  { id: 'DOCUMENTS', label: 'Tickets / Documents' },
  { id: 'JEWELRY', label: 'Jewelry / Watch' },
  { id: 'KEYS', label: 'Keys' },
  { id: 'OTHER', label: 'Other' },
];

export const LostFoundPage: React.FC = () => {
  const { cities, currentCity, userCoords } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);

  // Create Modal
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [postForm, setPostForm] = useState({
    type: 'LOST' as 'LOST' | 'FOUND',
    title: '',
    category: 'PHONE',
    description: '',
    locationName: '',
    cityId: '',
    eventDate: new Date().toISOString().split('T')[0],
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Privacy-safe Inquiry Modal
  const [inquireItem, setInquireItem] = useState<LostFoundItem | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryHint, setInquiryHint] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);

  // View Received Inquiries Modal (Owner)
  const [viewingInquiriesFor, setViewingInquiriesFor] = useState<LostFoundItem | null>(null);
  const [inquiriesList, setInquiriesList] = useState<LostFoundInquiry[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchLostFoundItems({
        type: typeFilter,
        category: categoryFilter,
        cityId: cityFilter,
        search: searchQuery || undefined,
        mine: onlyMine && Boolean(user),
      });
      setItems(res.items || []);
    } catch {
      showToast('Failed to load Lost & Found items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [typeFilter, categoryFilter, cityFilter, onlyMine]);

  useEffect(() => {
    if (currentCity && !postForm.locationName) {
      setPostForm((p) => ({ ...p, locationName: currentCity.name, cityId: currentCity.id }));
    }
  }, [currentCity?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to post a Lost or Found report', 'error');
      return;
    }
    if (!postForm.title.trim() || !postForm.description.trim() || !postForm.locationName.trim()) {
      showToast('Please complete all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('type', postForm.type);
      fd.append('title', postForm.title.trim());
      fd.append('category', postForm.category);
      fd.append('description', postForm.description.trim());
      fd.append('locationName', postForm.locationName.trim());
      if (postForm.cityId) fd.append('cityId', postForm.cityId);
      fd.append('eventDate', postForm.eventDate);
      fd.append('lat', String(userCoords.lat));
      fd.append('lng', String(userCoords.lng));
      if (photoFile) fd.append('image', photoFile);

      const res = await createLostFoundItem(fd);
      showToast(res.message || 'Listing published', 'success');
      setIsPostOpen(false);
      setPostForm((p) => ({ ...p, title: '', description: '' }));
      setPhotoFile(null);
      loadItems();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to publish listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquireItem || !inquiryMessage.trim()) return;
    setSendingInquiry(true);
    try {
      const res = await inquireLostFoundItem(inquireItem.id, {
        message: inquiryMessage.trim(),
        contactHint: inquiryHint.trim() || undefined,
      });
      showToast(res.message || 'Private inquiry sent', 'success');
      setInquireItem(null);
      setInquiryMessage('');
      setInquiryHint('');
      loadItems();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not send inquiry', 'error');
    } finally {
      setSendingInquiry(false);
    }
  };

  const openOwnerInquiries = async (item: LostFoundItem) => {
    setViewingInquiriesFor(item);
    setLoadingInquiries(true);
    try {
      const res = await fetchLostFoundInquiries(item.id);
      setInquiriesList(res.inquiries || []);
    } catch {
      showToast('Failed to load inquiries', 'error');
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'OPEN' | 'MATCHED' | 'RESOLVED') => {
    try {
      await updateLostFoundStatus(id, status);
      showToast(`Marked as ${status}`, 'success');
      loadItems();
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleModerate = async (id: string, moderationStatus: 'APPROVED' | 'HIDDEN') => {
    try {
      await moderateLostFoundItem(id, moderationStatus);
      showToast(`Listing ${moderationStatus.toLowerCase()}`, 'success');
      loadItems();
    } catch {
      showToast('Failed to moderate listing', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLostFoundItem(deleteId);
      showToast('Listing removed', 'success');
      setDeleteId(null);
      loadItems();
    } catch {
      showToast('Failed to delete listing', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6 yg-page-enter">
      <PageHeader
        eyebrow="Traveler Assistance Network"
        icon={PackageSearch}
        accentColor="teal"
        title="Lost & Found Hub"
        description="Report misplaced belongings or found items with privacy-preserving in-app relay messaging."
        actions={
          <button
            type="button"
            onClick={() => setIsPostOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-2 keep-white yg-press"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Report Lost / Found</span>
          </button>
        }
      />

      {/* Privacy Design Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" aria-hidden="true" />
        <span>
          <strong>Privacy Protection:</strong> Personal emails and phone numbers are never exposed on listings. Interested users send inquiries via secure in-app notifications.
        </span>
      </div>

      {/* Filters */}
      <div className="yg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(['ALL', 'LOST', 'FOUND'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  typeFilter === t
                    ? 'bg-teal-600 text-white keep-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border dark:border-slate-800'
                }`}
              >
                {t === 'ALL' ? 'All Items' : t === 'LOST' ? 'Lost Items' : 'Found Items'}
              </button>
            ))}
          </div>

          {user && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
                className="accent-teal-600 w-4 h-4"
              />
              My Listings Only
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="ALL">All Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadItems();
            }}
            className="sm:col-span-6 relative"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search item, landmark, station, or keyword..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-slate-800 text-white text-[11px] font-semibold keep-white"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <LoadingSkeleton variant="card" count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No Lost & Found Listings Match"
          description="Be the first to report a misplaced item or found belonging in this location."
          actionLabel="Report Lost / Found Item"
          onAction={() => setIsPostOpen(true)}
          accentColor="teal"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isOwner = user?.id === item.userId;
            return (
              <div key={item.id} className="yg-card overflow-hidden flex flex-col justify-between">
                {item.imageUrl && (
                  <div className="h-44 bg-slate-100 dark:bg-slate-950 overflow-hidden">
                    <img
                      src={resolveMediaUrl(item.imageUrl)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.type === 'LOST'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'RESOLVED'
                            ? 'bg-emerald-600 text-white keep-white'
                            : 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.locationName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                        <span>Date: {item.eventDate} • Posted by {item.user?.name || 'Traveler'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {!isOwner ? (
                      <button
                        type="button"
                        disabled={item.status === 'RESOLVED'}
                        onClick={() => {
                          if (!user) {
                            showToast('Please sign in to send a private inquiry', 'error');
                            return;
                          }
                          setInquireItem(item);
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 keep-white"
                      >
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{item.type === 'LOST' ? 'I Found This' : 'Claim / Inquire'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap flex-1">
                        <button
                          type="button"
                          onClick={() => openOwnerInquiries(item)}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-semibold text-[11px]"
                        >
                          Inquiries ({item._count?.inquiries ?? 0})
                        </button>
                        {item.status !== 'RESOLVED' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'RESOLVED')}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1 keep-white"
                          >
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                            Resolve
                          </button>
                        )}
                      </div>
                    )}

                    {isPrivileged && (
                      <button
                        type="button"
                        onClick={() =>
                          handleModerate(
                            item.id,
                            item.moderationStatus === 'HIDDEN' ? 'APPROVED' : 'HIDDEN'
                          )
                        }
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500"
                        title={item.moderationStatus === 'HIDDEN' ? 'Restore listing' : 'Hide listing'}
                      >
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}

                    {(isOwner || isPrivileged) && (
                      <button
                        type="button"
                        onClick={() => setDeleteId(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                        title="Delete listing"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Lost / Found Item */}
      {isPostOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Post Lost or Found Item</h3>
              <button type="button" onClick={() => setIsPostOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(['LOST', 'FOUND'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPostForm((p) => ({ ...p, type: t }))}
                    className={`py-2 rounded-xl font-bold border ${
                      postForm.type === t
                        ? 'bg-teal-600 text-white border-teal-600 keep-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {t === 'LOST' ? 'I Lost Something' : 'I Found Something'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={postForm.title}
                  onChange={(e) => setPostForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Black OnePlus Phone / Blue Backpack"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={postForm.category}
                    onChange={(e) => setPostForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={postForm.eventDate}
                    onChange={(e) => setPostForm((p) => ({ ...p, eventDate: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <select
                    value={postForm.cityId}
                    onChange={(e) => setPostForm((p) => ({ ...p, cityId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Hub</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Landmark / Station *
                  </label>
                  <input
                    type="text"
                    required
                    value={postForm.locationName}
                    onChange={(e) => setPostForm((p) => ({ ...p, locationName: e.target.value }))}
                    placeholder="e.g. ISBT Platform 4, Manali"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={postForm.description}
                  onChange={(e) => setPostForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Identifying marks, cover color, approximate time (avoid posting raw Aadhaar/passport numbers)..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Photo (Optional, JPEG/PNG/WebP up to 5MB)
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer text-slate-600 dark:text-slate-400 hover:border-teal-500">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span className="truncate">{photoFile ? photoFile.name : 'Choose optional item photo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPostOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold keep-white disabled:opacity-60"
                >
                  {submitting ? 'Publishing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send Privacy-Safe Inquiry */}
      {inquireItem && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Private Inquiry: {inquireItem.title}
              </h3>
              <button type="button" onClick={() => setInquireItem(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
              <textarea
                required
                rows={3}
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                placeholder="Describe unique identifying details to verify ownership or coordinate return..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={inquiryHint}
                onChange={(e) => setInquiryHint(e.target.value)}
                placeholder="Optional contact handle shared ONLY with poster"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInquireItem(null)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInquiry}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold keep-white"
                >
                  {sendingInquiry ? 'Sending...' : 'Send Relay Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Owner Inquiries Viewer */}
      {viewingInquiriesFor && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[80dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Inquiries for {viewingInquiriesFor.title}
              </h3>
              <button type="button" onClick={() => setViewingInquiriesFor(null)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingInquiries ? (
              <LoadingSkeleton variant="list" count={2} />
            ) : inquiriesList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No inquiries received yet.</p>
            ) : (
              <div className="space-y-2.5">
                {inquiriesList.map((inq) => (
                  <div
                    key={inq.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span>{inq.sender?.name || 'Traveler'}</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{inq.message}</p>
                    {inq.contactHint && (
                      <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                        Contact: {inq.contactHint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(deleteId)}
        title="Delete Lost & Found Listing"
        description="Are you sure you want to permanently remove this listing?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
        tone="danger"
      />
    </div>
  );
};
