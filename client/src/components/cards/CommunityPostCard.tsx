import React from 'react';
import { Heart, MessageSquare, MapPin, Share2, Flag, Trash2 } from 'lucide-react';
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
  canDelete?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
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
  canDelete = false,
  onLike,
  onComment,
  onShare,
  onDelete,
  onReport,
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
    <article className="yg-card yg-card-interactive overflow-hidden flex flex-col justify-between">
      {/* Multi-Image Gallery or Single Header Image */}
      {images.length > 0 && (
        <div className="photo-overlay relative w-full bg-slate-950">
          {images.length === 1 ? (
            <button
              type="button"
              className="relative h-48 sm:h-52 w-full overflow-hidden cursor-pointer group block text-left"
              onClick={() => onImageClick?.(images[0])}
              aria-label={`View image for ${title}`}
            >
              <img
                src={images[0]}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent opacity-70" />
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-1 h-48 sm:h-52 p-1">
              {images.slice(0, 4).map((imgUrl, index) => {
                const isFourth = index === 3 && images.length > 4;
                return (
                  <button
                    type="button"
                    key={index}
                    className="relative w-full h-full overflow-hidden rounded-xl cursor-pointer group block"
                    onClick={() => onImageClick?.(imgUrl)}
                    aria-label={`View photo ${index + 1} for ${title}`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${title} - Photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {isFourth && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-sm keep-white">
                        +{images.length - 3} more
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="absolute top-3 left-3 pointer-events-none">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider border backdrop-blur-md ${cat.color}`}
            >
              {cat.label}
            </span>
          </div>
        </div>
      )}

      <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
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
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
              {title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
              {content}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onLike}
              className={`flex items-center gap-1.5 transition-colors font-semibold ${
                isLiked ? 'text-red-500 dark:text-red-400' : 'hover:text-red-500 dark:hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
              <span>{likesCount}</span>
            </button>

            <button
              type="button"
              onClick={onComment}
              className="flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-semibold"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>{commentsCount} comments</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {onReport && (
              <button
                type="button"
                onClick={onReport}
                className="hover:text-amber-500 transition-colors"
                title="Report post for moderation"
                aria-label={`Report ${title}`}
              >
                <Flag className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="hover:text-red-500 transition-colors"
                title="Delete post"
                aria-label={`Delete ${title}`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Share post"
                aria-label={`Share ${title}`}
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
