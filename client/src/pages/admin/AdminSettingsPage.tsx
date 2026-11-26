import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { Settings, Shield, Bell, Database, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export function AdminSettingsPage() {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch {
      setHealth({ status: 'unreachable', database: 'unreachable' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Platform Configuration & Runtime Status</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live server health, moderation enforcement policies, and official emergency numbers
            </p>
          </div>
          <button
            type="button"
            onClick={loadHealth}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs font-bold text-slate-300 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Live Runtime Health */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" /> Backend & Integrations Runtime
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">PostgreSQL Database</div>
              <div className={`font-bold mt-1 ${health?.database === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                {health?.database === 'connected' ? `Connected (${health.dbLatencyMs ?? '—'} ms)` : health?.database || 'Checking...'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Environment & Memory</div>
              <div className="font-bold text-white mt-1">
                {health?.environment || 'unknown'} · {health?.memoryUsageMB ?? '—'} MB heap
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Gemini AI Live Mode</div>
              <div className={`font-bold mt-1 ${health?.geminiLive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {health?.geminiLive ? 'Live API Key Active' : 'Fallback Knowledge Mode'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Server Uptime</div>
              <div className="font-bold text-white mt-1">{health?.uptimeSeconds ?? '—'}s</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            API keys and server secrets are managed exclusively through environment variables on the host runtime.
          </p>
        </div>

        {/* Active Moderation Policy Constants */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" /> Enforced Moderation & Safety Rules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Community Confirmation Elevation</div>
              <div className="font-bold text-white mt-1">3 confirmations &rarr; UNDER_REVIEW</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Duplicate Incident Cluster Window</div>
              <div className="font-bold text-white mt-1">150m radius · 48 hours</div>
            </div>
          </div>
        </div>

        {/* Official Helplines */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-500" /> Official National Emergency Helplines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Pan-India Unified Emergency</div>
              <div className="font-bold text-white mt-1">112 (Police · Fire · Ambulance)</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Women Safety &amp; Tourist Infoline</div>
              <div className="font-bold text-white mt-1">1090 / 1091 · 1363</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
