import React from 'react';
import { Phone, User, ShieldAlert, Edit2, Trash2 } from 'lucide-react';

export interface EmergencyContactCardProps {
  name: string;
  relation: string;
  phone: string;
  isPrimary?: boolean;
  onCall?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const EmergencyContactCard: React.FC<EmergencyContactCardProps> = ({
  name,
  relation,
  phone,
  isPrimary = false,
  onCall,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-md hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-bold text-white truncate">{name}</h5>
            {isPrimary && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-950 text-red-300 border border-red-800">
                Primary ICE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{relation}</p>
          <p className="text-xs font-mono font-semibold text-slate-300 mt-0.5">{phone}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={`tel:${phone}`}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-xs"
        >
          <Phone className="w-4 h-4" />
          <span className="hidden sm:inline">Call</span>
        </a>

        {onEdit && (
          <button
            onClick={onEdit}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Edit contact"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
            title="Delete contact"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
