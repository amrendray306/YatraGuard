import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Compass, MapPin, Calendar, IndianRupee, Search,
  PlusCircle, MessageSquare, Send, X, UserCheck, Clock,
  CheckCircle2, XCircle, Loader2, Languages, ChevronRight,
  ArrowLeft, Backpack,
} from 'lucide-react';
import {
  fetchBuddyPlans, createBuddyPlan, cancelBuddyPlan, fetchMyBuddyPlans,
  sendBuddyConnect, acceptBuddyConn, rejectBuddyConn, fetchMyBuddyConnections,
  fetchBuddyMessages, sendBuddyMessage,
} from '../services/api';
import { resolveMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

type Tab = 'find' | 'my-plans' | 'requests' | 'buddies' | 'chat';

const STYLES = [
  { value: 'ALL', label: 'All Styles' },
  { value: 'BACKPACKER', label: '🎒 Backpacker' },
  { value: 'ADVENTURE', label: '🏔️ Adventure' },
  { value: 'CULTURAL', label: '🏛️ Cultural' },
  { value: 'LUXURY', label: '✨ Luxury' },
  { value: 'ROAD_TRIP', label: '🏍️ Road Trip' },
];
const BUDGETS = [
  { value: 'ALL', label: 'All Budgets' },
  { value: 'BUDGET', label: '💰 Budget' },
  { value: 'MODERATE', label: '💳 Moderate' },
  { value: 'LUXURY', label: '💎 Luxury' },
];
const STYLE_COLORS: Record<string, string> = {
  BACKPACKER: 'bg-green-700/80 text-green-200',
  ADVENTURE: 'bg-orange-700/80 text-orange-200',
  CULTURAL: 'bg-indigo-700/80 text-indigo-200',
  LUXURY: 'bg-amber-700/80 text-amber-200',
  ROAD_TRIP: 'bg-cyan-700/80 text-cyan-200',
};
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'bg-amber-900/60 text-amber-300 border-amber-700/50' },
  ACCEPTED: { label: 'Accepted', cls: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-900/60 text-red-300 border-red-700/50' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-800 text-slate-400 border-slate-700' },
};

function Avatar({ url, name, size = 'md' }: { url?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  if (url) {
    return <img src={resolveMediaUrl(url) || url} alt={name} className={`${sz} rounded-2xl object-cover border border-purple-500/40 flex-shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PlanCard({ plan, myId, onConnect }: { plan: any; myId?: string; onConnect: (plan: any) => void }) {
  const myConn = plan.connections?.[0];
  const startD = new Date(plan.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const endD = new Date(plan.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 shadow-lg flex flex-col gap-4 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar url={plan.sender?.avatarUrl} name={plan.sender?.name || 'T'} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">{plan.sender?.name || 'Fellow Traveler'}</div>
            <div className="text-[10px] text-slate-400">{plan.sender?.travelPreferences || 'Traveler'}</div>
          </div>
        </div>
        <span className={`text-[10px] font-black px-2 py-1 rounded-xl flex-shrink-0 ${STYLE_COLORS[plan.travelStyle] || 'bg-slate-800 text-slate-300'}`}>
          {plan.travelStyle}
        </span>
      </div>

      <div className="bg-slate-950/60 rounded-xl p-3 space-y-2 border border-slate-800/80">
        {plan.fromLocation && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>From: <strong className="text-slate-300">{plan.fromLocation}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <MapPin className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span>{plan.destinationCity}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{startD} – {endD}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{plan.budgetTier}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{plan.companionsNeeded} companion{plan.companionsNeeded !== 1 ? 's' : ''}</span>
          {plan.preferredLanguage && <span className="flex items-center gap-1"><Languages className="w-3 h-3" />{plan.preferredLanguage}</span>}
        </div>
      </div>

      {plan.notes && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">"{plan.notes}"</p>
      )}

      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
        <span className="text-[10px] text-slate-500">Posted {new Date(plan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        {myConn ? (
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${STATUS_BADGE[myConn.status]?.cls || ''}`}>
            {STATUS_BADGE[myConn.status]?.label || myConn.status}
          </span>
        ) : (
          <button
            onClick={() => onConnect(plan)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" /> Connect
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectionCard({ conn, myId, onAccept, onReject, onChat }: {
  conn: any; myId: string; onAccept?: () => void; onReject?: () => void; onChat?: () => void;
}) {
  const isSender = conn.senderId === myId;
  const other = isSender ? conn.receiverUser : conn.senderUser;
  const dest = conn.request?.destinationCity;
  const unread = conn.messages?.[0]?.senderId !== myId && !conn.messages?.[0]?.isRead;

  return (
    <div className={`bg-slate-900 border rounded-2xl p-4 flex items-start gap-3 transition-all ${conn.status === 'ACCEPTED' ? 'border-emerald-700/50' : 'border-slate-800'}`}>
      <Avatar url={other?.avatarUrl} name={other?.name || 'T'} size="sm" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-white truncate">{other?.name || 'Traveler'}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${STATUS_BADGE[conn.status]?.cls || ''}`}>
            {STATUS_BADGE[conn.status]?.label}
          </span>
        </div>
        {dest && <div className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{dest}</div>}
        {conn.message && <p className="text-[11px] text-slate-400 line-clamp-1">"{conn.message}"</p>}
        <div className="flex items-center gap-2 pt-1">
          {conn.status === 'PENDING' && !isSender && onAccept && (
            <>
              <button onClick={onAccept} className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Accept
              </button>
              <button onClick={onReject} className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-300 text-[11px] font-bold flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Reject
              </button>
            </>
          )}
          {conn.status === 'PENDING' && isSender && onReject && (
            <button onClick={onReject} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold">
              Cancel Request
            </button>
          )}
          {conn.status === 'ACCEPTED' && onChat && (
            <button onClick={onChat} className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-[11px] font-bold flex items-center gap-1 relative">
              <MessageSquare className="w-3 h-3" /> Message
              {unread && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatView({ conn, myId, onBack }: { conn: any; myId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const other = conn.senderId === myId ? conn.receiverUser : conn.senderUser;

  const load = async () => {
    try {
      const d = await fetchBuddyMessages(conn.id);
      setMessages(d.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [conn.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const d = await sendBuddyMessage(conn.id, text.trim());
      setMessages(prev => [...prev, d.message]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send message', 'error');
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] max-h-[640px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Avatar url={other?.avatarUrl} name={other?.name || 'T'} size="sm" />
        <div>
          <div className="text-sm font-bold text-white">{other?.name || 'Traveler'}</div>
          <div className="text-[10px] text-emerald-400">Connected • {conn.request?.destinationCity}</div>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-8">Start the conversation! You are both going to {conn.request?.destinationCity}.</div>
        ) : (
          messages.map(m => {
            const isMe = m.senderId === myId;
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  isMe ? 'bg-purple-700 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                }`}>
                  <p>{m.content}</p>
                  <div className={`text-[9px] mt-1 ${isMe ? 'text-purple-300' : 'text-slate-500'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-slate-800 flex-shrink-0">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

export const TravelBuddyPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>('find');
  const [plans, setPlans] = useState<any[]>([]);
  const [myPlans, setMyPlans] = useState<any[]>([]);
  const [connections, setConnections] = useState<{ sent: any[]; received: any[] }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(false);

  // Find filters
  const [destFilter, setDestFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('ALL');
  const [budgetFilter, setBudgetFilter] = useState('ALL');

  // Create Plan modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    destinationCity: '', fromLocation: '', startDate: '', endDate: '',
    travelStyle: 'ADVENTURE', budgetTier: 'MODERATE', companionsNeeded: 1,
    preferredLanguage: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Connect modal
  const [connectPlan, setConnectPlan] = useState<any>(null);
  const [connectMsg, setConnectMsg] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Chat
  const [chatConn, setChatConn] = useState<any>(null);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const d = await fetchBuddyPlans({
        destination: destFilter || undefined,
        style: styleFilter !== 'ALL' ? styleFilter : undefined,
        budget: budgetFilter !== 'ALL' ? budgetFilter : undefined,
      });
      setPlans(d.plans || []);
    } catch { showToast('Could not load travel plans', 'error'); }
    finally { setLoading(false); }
  };

  const loadMyPlans = async () => {
    if (!user) return;
    try { const d = await fetchMyBuddyPlans(); setMyPlans(d.plans || []); } catch { /* silent */ }
  };

  const loadConnections = async () => {
    if (!user) return;
    try { const d = await fetchMyBuddyConnections(); setConnections(d); } catch { /* silent */ }
  };

  useEffect(() => { loadPlans(); }, [destFilter, styleFilter, budgetFilter]);
  useEffect(() => {
    if (tab === 'my-plans') loadMyPlans();
    if (tab === 'requests' || tab === 'buddies') loadConnections();
  }, [tab, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showToast('Please login to post a travel plan', 'error'); return; }
    if (!form.destinationCity || !form.startDate || !form.endDate) {
      showToast('Destination, start date and end date are required', 'error'); return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      showToast('End date must be after start date', 'error'); return;
    }
    setSubmitting(true);
    try {
      await createBuddyPlan({ ...form });
      showToast('Travel plan published!', 'success');
      setShowCreate(false);
      setForm({ destinationCity: '', fromLocation: '', startDate: '', endDate: '', travelStyle: 'ADVENTURE', budgetTier: 'MODERATE', companionsNeeded: 1, preferredLanguage: '', notes: '' });
      loadPlans();
      setTab('my-plans');
      loadMyPlans();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to publish plan', 'error');
    } finally { setSubmitting(false); }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showToast('Please login to send a request', 'error'); return; }
    setConnecting(true);
    try {
      await sendBuddyConnect(connectPlan.id, connectMsg);
      showToast('Buddy request sent!', 'success');
      setConnectPlan(null); setConnectMsg('');
      loadPlans();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send request', 'error');
    } finally { setConnecting(false); }
  };

  const handleAccept = async (connId: string) => {
    try { await acceptBuddyConn(connId); showToast('Request accepted!', 'success'); loadConnections(); }
    catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleReject = async (connId: string) => {
    try { await rejectBuddyConn(connId); showToast('Request updated', 'info'); loadConnections(); }
    catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const handleCancelPlan = async (planId: string) => {
    try { await cancelBuddyPlan(planId); showToast('Plan cancelled', 'info'); loadMyPlans(); }
    catch (err: any) { showToast(err.response?.data?.error || 'Failed', 'error'); }
  };

  const incoming = connections.received?.filter(c => c.status === 'PENDING') || [];
  const accepted = [
    ...(connections.sent?.filter(c => c.status === 'ACCEPTED') || []),
    ...(connections.received?.filter(c => c.status === 'ACCEPTED') || []),
  ];

  if (chatConn) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ChatView conn={chatConn} myId={user?.id || ''} onBack={() => setChatConn(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-500/30 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-black uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" /> Travel Companion Matching
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Find Your Travel Buddy</h1>
            <p className="text-xs text-slate-400">Post your travel plan and connect with compatible travelers.</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg flex-shrink-0">
              <PlusCircle className="w-4 h-4" /> Post Travel Plan
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
        {([
          { key: 'find', label: 'Find Buddies', icon: Search },
          { key: 'my-plans', label: 'My Plans', icon: Backpack },
          { key: 'requests', label: `Requests${incoming.length ? ` (${incoming.length})` : ''}`, icon: Clock },
          { key: 'buddies', label: 'My Buddies', icon: UserCheck },
        ] as { key: Tab; label: string; icon: React.FC<any> }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              tab === t.key ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Find Buddies Tab */}
      {tab === 'find' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={destFilter} onChange={e => setDestFilter(e.target.value)}
                placeholder="Search destination..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500" />
            </div>
            <select value={styleFilter} onChange={e => setStyleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-purple-500">
              {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={budgetFilter} onChange={e => setBudgetFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-purple-500">
              {BUDGETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
              <p className="text-xs text-slate-400">Finding compatible travelers...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="py-14 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
              <Users className="w-10 h-10 text-purple-400/50 mx-auto" />
              <p className="text-sm font-bold text-white">No travel plans found</p>
              <p className="text-xs text-slate-400">Be the first! Post your travel plan and others will find you.</p>
              {user && (
                <button onClick={() => setShowCreate(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
                  Post Travel Plan
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} myId={user?.id} onConnect={setConnectPlan} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Plans Tab */}
      {tab === 'my-plans' && (
        <div className="space-y-3">
          {!user ? (
            <div className="py-12 text-center text-slate-400 text-sm">Please login to view your travel plans.</div>
          ) : myPlans.length === 0 ? (
            <div className="py-14 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
              <Backpack className="w-10 h-10 text-purple-400/50 mx-auto" />
              <p className="text-sm font-bold text-white">No travel plans yet</p>
              <button onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
                Create Your First Plan
              </button>
            </div>
          ) : (
            myPlans.map(plan => {
              const startD = new Date(plan.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              const endD = new Date(plan.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span className="font-bold text-white text-sm">{plan.destinationCity}</span>
                      {plan.fromLocation && <span className="text-[11px] text-slate-400">from {plan.fromLocation}</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${STYLE_COLORS[plan.travelStyle] || 'bg-slate-800 text-slate-300'}`}>{plan.travelStyle}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        plan.status === 'OPEN' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' :
                        plan.status === 'CANCELLED' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-blue-900/40 text-blue-300 border-blue-700/50'
                      }`}>{plan.status}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{startD} – {endD}</div>
                    {plan.notes && <p className="text-[11px] text-slate-400 line-clamp-1">"{plan.notes}"</p>}
                    {plan.connections?.length > 0 && (
                      <div className="text-[11px] text-purple-300">{plan.connections.length} buddy request{plan.connections.length !== 1 ? 's' : ''} received</div>
                    )}
                  </div>
                  {plan.status === 'OPEN' && (
                    <button onClick={() => handleCancelPlan(plan.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 text-[11px] font-bold border border-slate-700 flex-shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-5">
          {!user ? (
            <div className="py-12 text-center text-slate-400 text-sm">Please login to view requests.</div>
          ) : (
            <>
              {incoming.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Incoming Requests ({incoming.length})</h3>
                  {incoming.map(c => (
                    <ConnectionCard key={c.id} conn={c} myId={user.id}
                      onAccept={() => handleAccept(c.id)}
                      onReject={() => handleReject(c.id)} />
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Sent Requests</h3>
                {(connections.sent?.filter(c => c.status === 'PENDING') || []).length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No pending sent requests.</p>
                ) : (
                  connections.sent?.filter(c => c.status === 'PENDING').map(c => (
                    <ConnectionCard key={c.id} conn={c} myId={user.id}
                      onReject={() => handleReject(c.id)} />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* My Buddies Tab */}
      {tab === 'buddies' && (
        <div className="space-y-3">
          {!user ? (
            <div className="py-12 text-center text-slate-400 text-sm">Please login to view your buddies.</div>
          ) : accepted.length === 0 ? (
            <div className="py-14 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
              <UserCheck className="w-10 h-10 text-purple-400/50 mx-auto" />
              <p className="text-sm font-bold text-white">No accepted buddies yet</p>
              <p className="text-xs text-slate-400">Find a travel plan and send a connect request to get started.</p>
            </div>
          ) : (
            accepted.map(c => (
              <ConnectionCard key={c.id} conn={c} myId={user.id}
                onChat={() => setChatConn(c)} />
            ))
          )}
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl my-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl"><Users className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-base font-black text-white">Post Travel Plan</h3>
                  <p className="text-[11px] text-slate-400">Help others find you as a compatible companion</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Destination *</label>
                  <input type="text" required value={form.destinationCity}
                    onChange={e => setForm(f => ({ ...f, destinationCity: e.target.value }))}
                    placeholder="e.g. Kedarnath, Manali, Spiti Valley"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Starting From</label>
                  <input type="text" value={form.fromLocation}
                    onChange={e => setForm(f => ({ ...f, fromLocation: e.target.value }))}
                    placeholder="e.g. Delhi, Mumbai"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Start Date *</label>
                  <input type="date" required value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">End Date *</label>
                  <input type="date" required value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Travel Style</label>
                  <select value={form.travelStyle} onChange={e => setForm(f => ({ ...f, travelStyle: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500">
                    <option value="ADVENTURE">🏔️ Adventure</option>
                    <option value="BACKPACKER">🎒 Backpacker</option>
                    <option value="CULTURAL">🏛️ Cultural</option>
                    <option value="LUXURY">✨ Luxury</option>
                    <option value="ROAD_TRIP">🏍️ Road Trip</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Budget</label>
                  <select value={form.budgetTier} onChange={e => setForm(f => ({ ...f, budgetTier: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500">
                    <option value="BUDGET">💰 Budget</option>
                    <option value="MODERATE">💳 Moderate</option>
                    <option value="LUXURY">💎 Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Companions Needed</label>
                  <input type="number" min={1} max={10} value={form.companionsNeeded}
                    onChange={e => setForm(f => ({ ...f, companionsNeeded: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Preferred Language</label>
                  <input type="text" value={form.preferredLanguage}
                    onChange={e => setForm(f => ({ ...f, preferredLanguage: e.target.value }))}
                    placeholder="e.g. Hindi, English"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">Trip Description</label>
                  <textarea rows={3} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Describe your trip and what kind of companion you are looking for..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black disabled:opacity-50 flex items-center gap-2">
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Publishing...</> : 'Publish Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONNECT MODAL */}
      {connectPlan && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-black text-white">Connect with {connectPlan.sender?.name || 'Traveler'}</h3>
              </div>
              <button onClick={() => setConnectPlan(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
              <Avatar url={connectPlan.sender?.avatarUrl} name={connectPlan.sender?.name || 'T'} size="sm" />
              <div>
                <div className="font-bold text-white">{connectPlan.sender?.name}</div>
                <div className="text-slate-400">→ {connectPlan.destinationCity} · {new Date(connectPlan.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Introduce yourself</label>
                <textarea rows={4} required value={connectMsg} onChange={e => setConnectMsg(e.target.value)}
                  placeholder="Hi! I'm also heading to this destination around those dates and would love to travel together..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none" />
              </div>
              <p className="text-[10px] text-slate-500">Your contact details remain private until both parties accept.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConnectPlan(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={connecting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black disabled:opacity-50 flex items-center gap-2">
                  {connecting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</> : <><Send className="w-3.5 h-3.5" />Send Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
