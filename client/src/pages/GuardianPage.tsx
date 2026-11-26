import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  MapPin,
  Trash2,
  IndianRupee,
  ShieldAlert,
  RotateCcw,
  Languages,
  HeartPulse,
  Compass,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { askTravelGuardian, fetchAiHistory, clearAiHistory } from '../services/api';
import { PageHeader, ConfirmationModal } from '../components/ui';

interface Message {
  id: string;
  sender: 'user' | 'guardian';
  text: string;
  timestamp: string;
  isAiGenerated?: boolean;
  isError?: boolean;
  retryQuery?: string;
}

// Safe React Markdown renderer (0% XSS risk)
function renderSafeFormattedMessage(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={lIdx} className="font-bold text-sky-600 dark:text-sky-400 text-xs mt-2 mb-1">
              {renderFormattedInline(trimmed.replace(/^###\s+/, ''))}
            </h5>
          );
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h4
              key={lIdx}
              className="font-bold text-slate-900 dark:text-white text-sm mt-2.5 mb-1 border-b border-slate-200 dark:border-slate-800 pb-0.5"
            >
              {renderFormattedInline(trimmed.replace(/^#+\s+/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-•*]\s+/, '');
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-1 text-xs">
              <span className="text-sky-600 dark:text-sky-400 font-bold select-none">•</span>
              <span className="flex-1">{renderFormattedInline(itemText)}</span>
            </div>
          );
        }

        return (
          <p key={lIdx} className="text-xs leading-relaxed">
            {renderFormattedInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderFormattedInline(content: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic opacity-90">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return parts.length > 0 ? parts : content;
}

export const GuardianPage: React.FC = () => {
  const { currentCity, userCoords, safetyScoreData } = useCity();
  const { user } = useAuth();
  const { showToast } = useToast();

  const cityName = currentCity?.name || 'India';

  const makeWelcomeMessage = (): Message => ({
    id: 'welcome',
    sender: 'guardian',
    text: `Hello${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! I am **YatraGuard AI** — your travel safety & planning assistant.

Currently grounded for **${cityName}** (Safety Index: **${safetyScoreData?.score ?? 76}/100**). Ask me about:
- **Budget day plans** (e.g. *"I am in ${cityName} with a budget of ₹2,000. Suggest places I can visit today."*)
- **Local transport fares**, prepaid booths & scam prevention
- **Emergency instructions** & nearest listed medical / police help
- **Quick Hindi travel translations** & cultural tips`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const [messages, setMessages] = useState<Message[]>([makeWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      label: `₹2,000 budget day plan in ${cityName}`,
      icon: IndianRupee,
      query: `I am in ${cityName} with a budget of ₹2,000. Suggest places I can visit today with approximate transport, food, duration and safety info.`,
    },
    {
      label: 'Local taxi & auto fares',
      icon: Compass,
      query: `What are fair local taxi and auto rickshaw fares in ${cityName}, and what scams should I watch out for?`,
    },
    {
      label: 'Nearest hospital & medical help',
      icon: HeartPulse,
      query: `Where can I find emergency hospital or medical assistance in ${cityName}?`,
    },
    {
      label: 'Essential Hindi phrases',
      icon: Languages,
      query: `Translate essential Hindi travel safety phrases for asking about meter fare and directions to police/hospital.`,
    },
    {
      label: 'Emergency protocol',
      icon: ShieldAlert,
      query: `What should I do right now if I feel unsafe or have an emergency in ${cityName}?`,
    },
  ];

  // Load persisted conversation history when logged in
  useEffect(() => {
    if (!user) {
      setMessages([makeWelcomeMessage()]);
      return;
    }

    setIsHistoryLoading(true);
    fetchAiHistory()
      .then((res) => {
        const rows = res.conversations || [];
        if (rows.length === 0) {
          setMessages([makeWelcomeMessage()]);
          return;
        }
        const loaded: Message[] = [makeWelcomeMessage()];
        rows.forEach((row: any) => {
          const ts = new Date(row.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          loaded.push({
            id: `u-${row.id}`,
            sender: 'user',
            text: row.userPrompt,
            timestamp: ts,
          });
          loaded.push({
            id: `m-${row.id}`,
            sender: 'guardian',
            text: row.aiResponse,
            timestamp: ts,
            isAiGenerated: true,
          });
        });
        setMessages(loaded);
      })
      .catch(() => setMessages([makeWelcomeMessage()]))
      .finally(() => setIsHistoryLoading(false));
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputText).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const historyPayload = messages
      .filter((m) => m.id !== 'welcome' && !m.isError)
      .slice(-8)
      .map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputText('');
    setIsLoading(true);

    try {
      const res = await askTravelGuardian({
        query,
        city: currentCity?.name,
        lat: userCoords.lat,
        lng: userCoords.lng,
        safetyScore: safetyScoreData?.score,
        history: historyPayload,
      });

      const guardianMsg: Message = {
        id: `m-${Date.now()}`,
        sender: 'guardian',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: res.isAiGenerated,
      };
      setMessages((prev) => [...prev, guardianMsg]);
    } catch {
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        sender: 'guardian',
        text: 'Unable to reach YatraGuard AI right now. For immediate emergencies, dial **112** (Police/Ambulance/Fire).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        retryQuery: query,
      };
      setMessages((prev) => [...prev, errorMsg]);
      showToast('AI assistant request failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      if (user) {
        await clearAiHistory();
      }
      setMessages([makeWelcomeMessage()]);
      setShowClearConfirm(false);
      showToast('Conversation cleared', 'info');
    } catch {
      showToast('Failed to clear history', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 h-[calc(100dvh-5rem)] flex flex-col gap-4 yg-page-enter">
      <PageHeader
        eyebrow="Intelligent Travel Companion"
        icon={Bot}
        accentColor="blue"
        title="AI Travel Assistant"
        description={`Grounded in verified local tariffs & safety telemetry for ${cityName}.`}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              {cityName} • {safetyScoreData?.score ?? 76}/100
            </span>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
              title="Clear conversation history"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        }
      />

      {/* Suggested Questions */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-shrink-0">
        {quickPrompts.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSend(p.query)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white hover:bg-sky-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-500/40 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Icon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Stream */}
      <div className="yg-card flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {isHistoryLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            Loading your saved conversation history...
          </div>
        ) : (
          messages.map((msg) => {
            const isGuardian = msg.sender === 'guardian';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isGuardian ? 'justify-start' : 'justify-end'}`}
              >
                {isGuardian && (
                  <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed ${
                    isGuardian
                      ? msg.isError
                        ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                        : 'bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                      : 'bg-sky-600 text-white keep-white shadow-sm'
                  }`}
                >
                  {renderSafeFormattedMessage(msg.text)}

                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px] opacity-75">
                    {msg.isError && msg.retryQuery ? (
                      <button
                        type="button"
                        onClick={() => handleSend(msg.retryQuery)}
                        className="inline-flex items-center gap-1 font-semibold underline"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" /> Retry
                      </button>
                    ) : (
                      <span>{isGuardian ? 'Estimates & advisories — verify locally' : ''}</span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {!isGuardian && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" aria-hidden="true" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" aria-hidden="true" />
              <span>Checking fares, medical contacts &amp; safety tips for {cityName}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="yg-card p-2 flex items-center gap-2 flex-shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask about budgets, safe routes, translations, or hospitals in ${cityName}...`}
          aria-label="Ask YatraGuard AI"
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          aria-label="Send message"
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold keep-white yg-press"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>

      <ConfirmationModal
        isOpen={showClearConfirm}
        title="Clear conversation history?"
        description={
          user
            ? 'This permanently removes your saved AI chat messages from your account.'
            : 'This clears the current chat session.'
        }
        confirmLabel="Clear History"
        cancelLabel="Keep Chat"
        tone="warning"
        onConfirm={handleClearHistory}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};
