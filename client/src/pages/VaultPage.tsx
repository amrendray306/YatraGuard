import React, { useState, useEffect } from 'react';
import { Lock, PlusCircle, Trash2, ShieldCheck, Copy, Check, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchVault, createVaultItem, deleteVaultItem } from '../services/api';
import { VaultItem } from '../types';

export const VaultPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('INSURANCE');
  const [referenceData, setReferenceData] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadVault = () => {
    fetchVault()
      .then(setItems)
      .catch(console.error);
  };

  useEffect(() => {
    loadVault();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !referenceData) return;

    try {
      await createVaultItem({ title, category, referenceData, notes });
      setTitle('');
      setReferenceData('');
      setNotes('');
      setIsAdding(false);
      loadVault();
    } catch (err) {
      console.error('Failed to create vault item:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVaultItem(id);
      loadVault();
    } catch (err) {
      console.error('Failed to delete vault item:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            Zero-Knowledge Reference Storage
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Private Emergency Vault
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Store critical travel insurance policy numbers, hotel bookings, and embassy references
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isAdding ? 'Cancel' : 'Add Vault Reference'}</span>
        </button>
      </div>

      {/* Security Privacy Notice Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Privacy By Design:</strong> To safeguard your identity abroad, India Travel Guardian
          stores only policy references, emergency phone numbers, and reservation codes. Never upload raw passport scans or sensitive credentials.
        </div>
      </div>

      {/* Add New Vault Item Form */}
      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="glass-panel p-5 rounded-3xl border border-emerald-500/40 space-y-4 animate-fade-in"
        >
          <h3 className="text-sm font-extrabold text-white">Save New Emergency Reference</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="INSURANCE">Travel Insurance Policy</option>
                <option value="HOTEL_RES">Hotel Booking Reference</option>
                <option value="FLIGHT_TRAIN">Flight / Train PNR</option>
                <option value="VISA_REF">Visa Reference / Reg No</option>
                <option value="DOCTOR">Family Physician / ICE Contact</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reference Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Overseas Medical Evacuation Policy"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Reference Code / Number / Contact
              </label>
              <input
                type="text"
                required
                value={referenceData}
                onChange={(e) => setReferenceData(e.target.value)}
                placeholder="e.g. POL-TATA-AIG-9988231 (Assistance: 1800-266-7780)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Additional Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Inclusions: Cashless hospitalization across all Fortis & Apollo centres"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Save to Vault
            </button>
          </div>
        </form>
      )}

      {/* Vault Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="glass-panel-elevated rounded-3xl p-5 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                  {item.category.replace('_', ' ')}
                </span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-extrabold text-sm text-white mt-2">
                {item.title}
              </h3>

              <div className="mt-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                <span className="font-mono text-xs text-emerald-300 select-all truncate mr-2">
                  {item.referenceData}
                </span>
                <button
                  onClick={() => handleCopy(item.referenceData, item.id)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex-shrink-0"
                  title="Copy reference code"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {item.notes && (
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  📝 {item.notes}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
              Encrypted session reference • User: {user?.name || 'Traveler'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
