import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import {
  MessageSquare,
  Search,
  Trash2,
  AlertTriangle,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  MapPin,
} from 'lucide-react';
import { api, resolveMediaUrl } from '../../services/api';

export function AdminCommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('travel_guardian_token');
      const res = await api.get('/admin/community/posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error('Failed to load community posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this community post?')) return;
    try {
      const token = localStorage.getItem('travel_guardian_token');
      await api.delete(`/admin/community/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPosts();
    } catch (err) {
      console.error('Failed to delete community post:', err);
    }
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.content?.toLowerCase().includes(search.toLowerCase()) ||
      p.destinationName?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Community & Content Moderation</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Oversee travel stories, community photo submissions, and enforce platform guidelines
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            Total Posts: <span className="text-amber-400">{posts.length}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, story, destination, or author..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {post.user?.avatarUrl ? (
                        <img
                          src={resolveMediaUrl(post.user.avatarUrl)}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs">
                          {post.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-xs">{post.user?.name || 'Traveler'}</div>
                        <div className="text-[10px] text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-800 text-amber-400 border border-slate-700">
                      {post.category}
                    </span>
                  </div>

                  {/* Thumbnail / Image Preview if available */}
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
                          <Eye className="w-3.5 h-3.5" /> View Photo
                        </span>
                      </div>
                      {post.media && post.media.length > 1 && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded-full text-[10px] font-bold text-white">
                          +{post.media.length - 1} photos
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title & Story */}
                  <div>
                    <h3 className="font-extrabold text-sm text-white line-clamp-1">{post.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mt-1">{post.content}</p>
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-500" />
                      {post.destinationName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post._count?.comments || post.comments?.length || 0}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
            No community posts found matching your search.
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl">
              <img src={selectedImage} alt="Community Evidence" className="w-full h-full object-contain" />
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
    </AdminLayout>
  );
}
