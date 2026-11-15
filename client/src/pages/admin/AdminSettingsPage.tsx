import React, { useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Settings, Shield, Key, Bell, Database, Check } from 'lucide-react';

export function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl animate-fade-in">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Platform Configuration & API Settings</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global emergency hotlines, verification thresholds, and AI model parameters
          </p>
        </div>

        {saved && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" /> Platform settings updated successfully.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Security & Moderation Policy */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> Moderation & Scoring Rules
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Community Confirmations Required for "UNDER_REVIEW" Elevation
                </label>
                <input
                  type="number"
                  defaultValue={3}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Duplicate Spatial Match Radius (meters)
                </label>
                <input
                  type="number"
                  defaultValue={150}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Emergency Hotlines */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" /> National Emergency Services
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">National Unified Emergency</label>
                <input
                  type="text"
                  defaultValue="112"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Women Safety Helpline</label>
                <input
                  type="text"
                  defaultValue="1090 / 1091"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all text-xs shadow-lg shadow-amber-500/20"
          >
            Save Configuration Changes
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
