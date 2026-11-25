import React, { useEffect, useState } from 'react';
import { ModeratorLayout } from '../../layouts/ModeratorLayout';
import {
  MessageSquare,
  Search,
  Eye,
  EyeOff,
  ArrowUpRight,
  MapPin,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { api, resolveMediaUrl } from '../../services/api';

export function ModeratorCommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/moderator/community', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleHidePost = async (id: string) => {
    const reason = prompt('Please enter reason for hiding/removing this post:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.post(
        `/moderator/posts/${id}/hide`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotification('Post has been removed from public feed and logged.');
      fetchPosts();
    } catch (err) {
      console.error('Hide post failed:', err);
    }
  };

  const handleEscalatePost = async (id: string) => {
    const reason = prompt('Reason for escalating to senior administrators:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.post(
        `/moderator/posts/${id}/escalate`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotification('Content escalated to Admin review queue.');
    } catch (err) {
      console.error('Escalate post failed:', err);
    }
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.content?.toLowerCase().includes(search.toLowerCase()) ||
      p.destinationName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ModeratorLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Community Photo & Post Auditing</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verify traveler stories and multi-image photo submissions against community safety guidelines
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
            Posts Under Watch: <span className="text-white">{posts.length}</span>
          </div>
        </div>

        {notification && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by story, destination, or title..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {post.user?.avatarUrl ? (
                        <img src={resolveMediaUrl(post.user.avatarUrl)} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-blue-400 font-bold flex items-center justify-center text-xs">
                          {post.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-xs">{post.user?.name}</div>
                        <div className="text-[10px] text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-800 text-blue-400 border border-slate-700">
                      {post.category}
                    </span>
                  </div>

                  {/* Image / Gallery Preview */}
                  {(post.imageUrl || (post.media && post.media.length > 0)) && (
                    <div
                      className="relative h-36 rounded-2xl overflow-hidden bg-slate-950 cursor-pointer group"
                      onClick={() => setSelectedImage(resolveMediaUrl(post.imageUrl || post.media[0]?.url) || null)}
                    >
                      <img
                        src={resolveMediaUrl(post.imageUrl || post.media[0]?.url)}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1 bg-slate-900/80 rounded-full text-xs font-bold text-white flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Inspect Image
                        </span>
                      </div>
                      {post.media && post.media.length > 1 && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded-full text-[10px] font-bold text-white">
                          +{post.media.length - 1} more
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="font-extrabold text-sm text-white line-clamp-1">{post.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mt-1">{post.content}</p>
                  </div>
                </div>

                {/* Moderate Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    {post.destinationName}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleHidePost(post.id)}
                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg border border-red-500/20 transition-colors flex items-center gap-1"
                      title="Hide Inappropriate Post"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Hide
                    </button>
                    <button
                      onClick={() => handleEscalatePost(post.id)}
                      className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold rounded-lg border border-purple-500/20 transition-colors flex items-center gap-1"
                      title="Escalate to Admin"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
            No community posts currently under moderation.
          </div>
        )}

        {/* Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
              <img src={selectedImage} alt="Community Post" className="w-full h-full object-contain" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </ModeratorLayout>
  );
}
