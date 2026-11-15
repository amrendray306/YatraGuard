import React, { useState, useEffect } from 'react';
import {
  Users,
  Compass,
  MapPin,
  Calendar,
  MessageSquare,
  PlusCircle,
  Search,
  Filter,
  Sparkles,
  Heart,
  Share2,
  ShieldCheck,
  Send,
  X,
  UserCheck,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import {
  api,
  fetchCommunityPosts,
  submitCommunityPost,
  likeCommunityPost,
  submitPostComment,
  fetchTravelBuddies,
  submitTravelBuddy,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CommunityPostCard } from '../components/cards/CommunityPostCard';

export const CommunityPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'POSTS' | 'BUDDIES'>('POSTS');
  const [posts, setPosts] = useState<any[]>([]);
  const [buddies, setBuddies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStyle, setSelectedStyle] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isBuddyModalOpen, setIsBuddyModalOpen] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Multi-image upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form states
  const [newPost, setNewPost] = useState({
    title: '',
    destinationName: 'Manali',
    category: 'SAFETY_TIP',
    content: '',
    imageUrl: '',
  });

  const [newBuddy, setNewBuddy] = useState({
    destinationCity: 'Manali',
    startDate: '',
    endDate: '',
    travelStyle: 'ADVENTURE',
    notes: '',
  });

  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadPosts = async () => {
    try {
      const data = await fetchCommunityPosts({
        city: selectedCity === 'ALL' ? undefined : selectedCity,
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
      });
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Failed to load community posts:', err);
    }
  };

  const loadBuddies = async () => {
    try {
      const data = await fetchTravelBuddies({
        city: selectedCity === 'ALL' ? undefined : selectedCity,
        style: selectedStyle === 'ALL' ? undefined : selectedStyle,
      });
      setBuddies(data.buddies || []);
    } catch (err) {
      console.error('Failed to load travel buddies:', err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    if (activeTab === 'POSTS') {
      loadPosts().finally(() => setIsLoading(false));
    } else {
      loadBuddies().finally(() => setIsLoading(false));
    }
  }, [activeTab, selectedCity, selectedCategory, selectedStyle]);

  const handleLike = async (postId: string) => {
    try {
      const res = await likeCommunityPost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount: res.likesCount, isLiked: true } : p))
      );
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    try {
      const res = await submitPostComment(postId, commentText);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...(p.comments || []), res.comment] }
            : p
        )
      );
      setCommentText('');
      setCommentingPostId(null);
      setStatusMessage({ text: 'Comment posted successfully', type: 'success' });
    } catch (err) {
      console.error('Failed to add comment:', err);
      setStatusMessage({ text: 'Failed to post comment', type: 'error' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedFiles.length + files.length > 8) {
      alert('Maximum of 8 photos allowed per community post.');
      return;
    }

    const updated = [...selectedFiles, ...files].slice(0, 8);
    setSelectedFiles(updated);

    // Generate previews
    const previews: string[] = [];
    updated.forEach((f) => {
      previews.push(URL.createObjectURL(f));
    });
    setFilePreviews(previews);
  };

  const removeSelectedFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = filePreviews.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setFilePreviews(updatedPreviews);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content || !newPost.destinationName) {
      setStatusMessage({ text: 'Please fill in all required fields', type: 'error' });
      return;
    }

    try {
      setUploadingImages(true);
      let mediaItems: any[] = [];

      // If user selected files, upload them first
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('images', file));

        const token = localStorage.getItem('travel_guardian_token');
        const uploadRes = await api.post('/upload/community', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        mediaItems = uploadRes.data.images || [];
      }

      await submitCommunityPost({
        ...newPost,
        media: mediaItems,
        imageUrl: mediaItems[0]?.url || newPost.imageUrl,
      });

      setIsPostModalOpen(false);
      setNewPost({
        title: '',
        destinationName: 'Manali',
        category: 'SAFETY_TIP',
        content: '',
        imageUrl: '',
      });
      setSelectedFiles([]);
      setFilePreviews([]);
      setStatusMessage({ text: 'Experience posted to the travel community!', type: 'success' });
      loadPosts();
    } catch (err: any) {
      console.error('Failed to create post:', err);
      setStatusMessage({
        text: err?.response?.data?.error || 'Failed to create post. Please try again.',
        type: 'error',
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleCreateBuddy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuddy.destinationCity || !newBuddy.startDate || !newBuddy.endDate) {
      setStatusMessage({ text: 'Please fill in destination and travel dates', type: 'error' });
      return;
    }

    try {
      await submitTravelBuddy(newBuddy);
      setIsBuddyModalOpen(false);
      setNewBuddy({
        destinationCity: 'Manali',
        startDate: '',
        endDate: '',
        travelStyle: 'ADVENTURE',
        notes: '',
      });
      setStatusMessage({ text: 'Travel buddy request published!', type: 'success' });
      loadBuddies();
    } catch (err) {
      console.error('Failed to create buddy request:', err);
      setStatusMessage({ text: 'Failed to publish buddy request.', type: 'error' });
    }
  };

  const citiesList = [
    'ALL',
    'Manali',
    'Shimla',
    'Rishikesh',
    'Haridwar',
    'Jaipur',
    'Goa',
    'Leh',
    'Dehradun',
    'Delhi',
    'Mumbai',
    'Agra',
    'Varanasi',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
              : 'bg-red-950/90 text-red-300 border border-red-800'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>YatraGuard Travel Community</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Shared Knowledge. Verified Buddies. Safer Journeys.
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore firsthand travel experiences, vetted route safety advisories, and connect with verified travel companions heading to the same destinations across India.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'POSTS' ? (
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-900/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Share Experience</span>
              </button>
            ) : (
              <button
                onClick={() => setIsBuddyModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-900/40 transition-all flex items-center gap-2 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Find Travel Buddy</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center gap-3">
          <button
            onClick={() => setActiveTab('POSTS')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
              activeTab === 'POSTS'
                ? 'bg-amber-500 text-slate-950 shadow-lg'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Travel Stories & Advisories ({posts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BUDDIES')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
              activeTab === 'BUDDIES'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Travel Buddy Finder ({buddies.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <span className="text-[11px] font-black uppercase text-amber-400 px-2 flex items-center gap-1 flex-shrink-0">
            <MapPin className="w-3.5 h-3.5" /> Destination:
          </span>
          {citiesList.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCity(c)}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex-shrink-0 transition-colors ${
                selectedCity === c
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Category / Style Filter */}
        {activeTab === 'POSTS' ? (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="SAFETY_TIP">🛡️ Safety Tips</option>
            <option value="RECOMMENDATION">⭐ Recommendations</option>
            <option value="STORY">📖 Travel Stories</option>
            <option value="BUDGET">💰 Budget Hacks</option>
          </select>
        ) : (
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Travel Styles</option>
            <option value="ADVENTURE">Adventure & Trekking</option>
            <option value="SOLO_FEMALE">Solo Female Friendly</option>
            <option value="BACKPACKER">Budget Backpacker</option>
            <option value="HERITAGE">Cultural & Heritage</option>
            <option value="BALANCED">Balanced Leisure</option>
          </select>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Loading community experiences...</p>
        </div>
      ) : activeTab === 'POSTS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="flex flex-col">
              <CommunityPostCard
                id={post.id}
                authorName={post.user?.name || 'Fellow Traveler'}
                authorRole={post.user?.role}
                authorAvatar={post.user?.avatarUrl}
                destinationName={post.destinationName}
                title={post.title}
                content={post.content}
                category={post.category}
                likesCount={post.likesCount}
                commentsCount={post.comments?.length || 0}
                createdAt={new Date(post.createdAt).toLocaleDateString()}
                imageUrl={post.imageUrl}
                media={post.media}
                isLiked={post.isLiked}
                onLike={() => handleLike(post.id)}
                onComment={() => setCommentingPostId(commentingPostId === post.id ? null : post.id)}
                onImageClick={(url) => setLightboxImage(url)}
              />

              {/* Comments Dropdown */}
              {commentingPostId === post.id && (
                <div className="mt-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <h6 className="text-[11px] font-black uppercase text-slate-400">
                    Discussion ({post.comments?.length || 0})
                  </h6>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {post.comments?.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No comments yet. Be the first!</p>
                    ) : (
                      post.comments?.map((c: any) => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-300">{c.user?.name}</span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      placeholder="Add verified comment or tip..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Travel Buddies Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buddies.map((buddy) => (
            <div
              key={buddy.id}
              className="bg-slate-900/95 border border-slate-800 hover:border-blue-500/60 rounded-2xl p-6 transition-all shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md">
                      {buddy.sender?.name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">{buddy.sender?.name}</h4>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                          Score: {buddy.sender?.reputationScore ?? 100}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block">{buddy.sender?.email}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-blue-300 border border-blue-800">
                    {buddy.travelStyle}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" /> Destination:
                    </span>
                    <span className="font-bold text-white">{buddy.destinationCity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" /> Dates:
                    </span>
                    <span className="font-bold text-slate-200">
                      {buddy.startDate} to {buddy.endDate}
                    </span>
                  </div>
                </div>

                {buddy.notes && (
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-850 p-2.5 rounded-xl border border-slate-800">
                    "{buddy.notes}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Verified Traveler Match
                </span>
                <a
                  href={`mailto:${buddy.sender?.email}?subject=YatraGuard Travel Buddy Connect: ${buddy.destinationCity}`}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Connect with {buddy.sender?.name?.split(' ')[0]}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE POST MODAL */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Share Travel Experience or Safety Tip</h3>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Destination Name</label>
                <input
                  type="text"
                  value={newPost.destinationName}
                  onChange={(e) => setNewPost({ ...newPost, destinationName: e.target.value })}
                  placeholder="e.g. Manali, Shimla, Rishikesh, Goa..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Category</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="SAFETY_TIP">🛡️ Safety Advisory</option>
                  <option value="RECOMMENDATION">⭐ Destination Recommendation</option>
                  <option value="STORY">📖 Traveler Story</option>
                  <option value="BUDGET">💰 Budget / Transit Fare Hack</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="e.g. Solang Valley Paragliding Safety & Operator Rates"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Detailed Description & Safety Tips</label>
                <textarea
                  rows={4}
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Write clear, helpful travel guidance for other travelers..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Upload Photos (Up to 8 Images — JPG, PNG, WebP)
                </label>
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl cursor-pointer bg-slate-950/60 transition-colors">
                    <Upload className="w-6 h-6 text-amber-400 mb-1" />
                    <span className="text-xs font-bold text-slate-300">Click to Select Photos</span>
                    <span className="text-[10px] text-slate-500">Max 10MB per image, up to 8 images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>

                  {/* Previews Grid */}
                  {filePreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {filePreviews.map((src, i) => (
                        <div key={i} className="relative h-20 rounded-xl overflow-hidden group border border-slate-700">
                          <img src={src} alt="preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(i)}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full hover:bg-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Or Photo URL (Optional)</label>
                <input
                  type="url"
                  value={newPost.imageUrl}
                  onChange={(e) => setNewPost({ ...newPost, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImages}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadingImages ? 'Uploading Images...' : 'Publish Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BUDDY REQUEST MODAL */}
      {isBuddyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Create Travel Buddy Request</h3>
              <button
                onClick={() => setIsBuddyModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBuddy} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Destination City / Corridor</label>
                <input
                  type="text"
                  value={newBuddy.destinationCity}
                  onChange={(e) => setNewBuddy({ ...newBuddy, destinationCity: e.target.value })}
                  placeholder="e.g. Manali & Solang Valley, Rishikesh, Goa..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newBuddy.startDate}
                    onChange={(e) => setNewBuddy({ ...newBuddy, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    value={newBuddy.endDate}
                    onChange={(e) => setNewBuddy({ ...newBuddy, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Travel Style</label>
                <select
                  value={newBuddy.travelStyle}
                  onChange={(e) => setNewBuddy({ ...newBuddy, travelStyle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="ADVENTURE">Adventure & High Altitude Trekking</option>
                  <option value="SOLO_FEMALE">Solo Female Safe Group</option>
                  <option value="BACKPACKER">Budget Backpacking & Hostels</option>
                  <option value="HERITAGE">Heritage Architecture & Food Walks</option>
                  <option value="BALANCED">Balanced Leisure</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Trip Details & Notes</label>
                <textarea
                  rows={3}
                  value={newBuddy.notes}
                  onChange={(e) => setNewBuddy({ ...newBuddy, notes: e.target.value })}
                  placeholder="Share details on shared taxi costs, itinerary plans, and expectations..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBuddyModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-lg"
                >
                  Post Buddy Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PHOTO LIGHTBOX */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
            <img src={lightboxImage} alt="Community Photo Fullscreen" className="w-full h-full object-contain" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
