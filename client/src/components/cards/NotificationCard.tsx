import React from 'react';
import { Bell, AlertTriangle, ShieldCheck, IndianRupee, Info, Check, ExternalLink } from 'lucide-react';

export interface NotificationCardProps {
  id: string;
  title: string;
  message: string;
  type?: 'INFO' | 'ALERT' | 'BUDDY' | 'FARE' | 'SOS';
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
  onMarkRead?: () => void;
  onClick?: () => void;
}

const typeConfigs = {
  INFO: { icon: Info, color: 'bg-blue-500/15 text-blue-400 border-blue-800' },
  ALERT: { icon: AlertTriangle, color: 'bg-red-500/15 text-red-400 border-red-800' },
  BUDDY: { icon: ShieldCheck, color: 'bg-purple-500/15 text-purple-400 border-purple-800' },
  FARE: { icon: IndianRupee, color: 'bg-amber-500/15 text-amber-400 border-amber-800' },
  SOS: { icon: AlertTriangle, color: 'bg-rose-600 text-white border-rose-500' },
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  id,
  title,
  message,
  type = 'INFO',
  isRead,
  createdAt,
  linkUrl,
  onMarkRead,
  onClick,
}) => {
  const conf = typeConfigs[type] || typeConfigs.INFO;
  const Icon = conf.icon;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
        isRead
          ? 'bg-slate-900/60 border-slate-800/80 text-slate-400'
          : 'bg-slate-900 border-slate-700/80 text-white shadow-lg'
      } ${onClick ? 'cursor-pointer hover:border-slate-600' : ''}`}
    >
      <div className={`p-2.5 rounded-xl border flex-shrink-0 ${conf.color}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h5 className={`text-xs sm:text-sm font-bold truncate ${isRead ? 'text-slate-300' : 'text-white'}`}>
            {title}
          </h5>
          <span className="text-[10px] text-slate-400 flex-shrink-0">{createdAt}</span>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{message}</p>

        <div className="pt-2 flex items-center justify-between gap-2">
          {linkUrl && (
            <span className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <span>View Details</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          )}

          {!isRead && onMarkRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 ml-auto"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Mark as Read</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
