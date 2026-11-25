import React from 'react';
import { Heart, MessageSquare, MapPin, Share2, ShieldCheck, Tag, Eye } from 'lucide-react';
import { resolveMediaUrl } from '../../services/api';

export interface CommunityPostCardProps {
  id: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  destinationName: string;
  title: string;
  content: string;
  category: string;
  likesCount: number;
  commentsCount?: number;
  createdAt?: string;
  imageUrl?: string;
  media?: Array<{ id: string; url: string; altText?: string }>;
  isLiked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onImageClick?: (url: string) => void;
}

const categoryBadges: Record<string, { label: string; color: string }> = {
  SAFETY_TIP: { label: '🛡️ Safety Advisory', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800' },
  RECOMMENDATION: { label: '⭐ Recommended', color: 'bg-blue-950/80 text-blue-300 border-blue-800' },
  STORY: { label: '📖 Traveler Story', color: 'bg-purple-950/80 text-purple-300 border-purple-800' },
  BUDGET: { label: '💰 Budget Tip', color: 'bg-amber-950/80 text-amber-300 border-amber-800' },
  HIDDEN_GEM: { label: '💎 Hidden Gem', color: 'bg-rose-950/80 text-rose-300 border-rose-800' },
};

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  id,
  authorName,
  authorRole = 'TRAVELER',
  authorAvatar,
  destinationName,
  title,
  content,
  category,
  likesCount,
  commentsCount = 0,
  createdAt = 'Recently',
  imageUrl,
  media,
  isLiked = false,
  onLike,
  onComment,
  onShare,
  onImageClick,
}) => {
  const cat = categoryBadges[category] || {
    label: category,
    color: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const images = ((media && media.length > 0)
    ? media.map((m) => resolveMediaUrl(m.url) || m.url)
    : (imageUrl ? [resolveMediaUrl(imageUrl) || imageUrl] : []));

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden transition-all duration-300 shadow-xl flex flex-col justify-between">
      {/* Multi-Image Gallery or Single Header Image */}
      {images.length > 0 && (
        <div className="photo-overlay relative w-full bg-slate-950">
          {images.length === 1 ? (
            <div
              className="relative h-48 sm:h-56 w-full overflow-hidden cursor-pointer group"
              onClick={() => onImageClick?.(images[0])}
            >
              <img
                src={images[0]}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1 h-52 sm:h-60 p-1">
              {images.slice(0, 4).map((imgUrl, index) => {
                const isFourth = index === 3 && images.length > 4;
                return (
                  <div
                    key={index}
                    className="relative w-full h-full overflow-hidden rounded-xl cursor-pointer group"
                    onClick={() => onImageClick?.(imgUrl)}
                  >
                    <img
                      src={imgUrl}
                      alt={`${title} - Photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {isFourth && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-sm">
                        +{images.length - 3} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="absolute top-3 left-3 pointer-events-none">
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${cat.color}`}
            >
              {cat.label}
            </span>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Author Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {authorAvatar ? (
                <img
                  src={resolveMediaUrl(authorAvatar)}
                  alt={authorName}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white text-xs font-black">
                  {authorName.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{authorName}</span>
                  {authorRole === 'MODERATOR' || authorRole === 'ADMIN' ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-900/60 text-blue-300 border border-blue-700/60">
                      Verified {authorRole}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] text-slate-400 block">{createdAt}</span>
              </div>
            </div>

            <span className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400" />
              <span>{destinationName}</span>
            </span>
          </div>

          {images.length === 0 && (
            <div>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${cat.color}`}
              >
                {cat.label}
              </span>
            </div>
          )}

          {/* Title & Body */}
          <div className="space-y-1.5">
            <h4 className="text-base font-black text-white hover:text-amber-400 transition-colors">
              {title}
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {content}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 transition-colors font-semibold ${
                isLiked ? 'text-red-400' : 'hover:text-red-400 text-slate-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likesCount}</span>
            </button>

            <button
              onClick={onComment}
              className="flex items-center gap-1.5 hover:text-amber-400 text-slate-400 transition-colors font-semibold"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{commentsCount} comments</span>
            </button>
          </div>

          {onShare && (
            <button
              onClick={onShare}
              className="hover:text-white transition-colors"
              title="Share tip"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
