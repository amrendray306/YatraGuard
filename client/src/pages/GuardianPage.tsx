import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Shield,
  Sparkles,
  MapPin,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  IndianRupee,
  ShieldAlert,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { askTravelGuardian } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'guardian';
  text: string;
  timestamp: string;
  isAiGenerated?: boolean;
}

// Safe Markdown-like renderer that renders pure React nodes (0% XSS risk, eliminates dangerouslySetInnerHTML)
function renderSafeFormattedMessage(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} className="h-1" />;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={lIdx} className="font-extrabold text-amber-300 text-xs mt-2 mb-1">
              {renderFormattedInline(trimmed.replace(/^###\s+/, ''))}
            </h5>
          );
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h4 key={lIdx} className="font-black text-white text-sm mt-2.5 mb-1 border-b border-slate-800 pb-0.5">
              {renderFormattedInline(trimmed.replace(/^#+\s+/, ''))}
            </h4>
          );
        }

        // Bullet items
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-•*]\s+/, '');
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-1.5 text-xs">
              <span className="text-amber-400 font-bold select-none">•</span>
              <span className="flex-1">{renderFormattedInline(itemText)}</span>
            </div>
          );
        }

        // Standard paragraph line
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
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export const GuardianPage: React.FC = () => {
  const { currentCity, userCoords, safetyScoreData } = useCity();

  // Dynamic city-aware quick prompts
  const getCityPrompts = () => {
    const c = currentCity?.name?.toLowerCase() || '';
    if (c.includes('manali')) {
      return [
        'How much is a taxi from Mall Road to Solang Valley?',
        'Driver asking ₹3500 for Solang, is it an overcharge?',
        'Is it safe to walk near Mall Road at night?',
        'What should I know about the winter gear rental scam?',
        'Find the nearest emergency hospital in Manali.',
      ];
    }
    if (c.includes('haridwar') || c.includes('rishikesh')) {
      return [
        'How much to travel from Haridwar to Rishikesh?',
        'Are shared autos / Vikrams safe between Haridwar and Rishikesh?',
        'Is it safe to attend evening Ganga Aarti alone?',
        'Nearest emergency hospital in Haridwar.',
        'What to do if a tout claims ghats are closed?',
      ];
    }
    if (c.includes('delhi')) {
      return [
        'What is Delhi auto meter rate for 5 km?',
        'How to reach New Delhi railway station safely?',
        'Auto driver refusing meter, what should I do?',
        'Is Chandni Chowk safe at night?',
        'Find nearest police station in Delhi.',
      ];
    }
    if (c.includes('agra')) {
      return [
        'Prepaid auto fare from Agra Cantt to Taj Mahal?',
        'Driver asking ₹400 for Taj Mahal, is it fair?',
        'Nearest 24x7 trauma hospital in Agra.',
        'How to avoid marble and gemstone emporium scams?',
      ];
    }
    return [
      `How much should local taxi or auto cost in ${currentCity?.name || 'this city'}?`,
      'I think my taxi driver is overcharging me.',
      'Is it safe to walk here tonight?',
      'Find the nearest emergency hospital.',
      'What should I do if I lose my passport or wallet?',
      'Emergency! I feel unsafe right now.',
    ];
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'guardian',
      text: `Hello, Traveler! I am **YatraGuard AI** — your context-aware travel safety & fare intelligence companion. 🛡️
      
I am actively grounded in live telemetry for **${currentCity?.name || 'India'}**:
• **Local Safety Score:** **${safetyScoreData?.score || 76}/100** ${
        (safetyScoreData?.score || 76) >= 75 ? '🟢 Good' : '🟡 Moderate Caution'
      }
• **Regulated Tariffs:** Auto, taxi, and corridor benchmarks loaded
• **Emergency Protocols:** Pan-India 112 / 100 / 108 first-responder dispatch ready

Ask me anything:
- *"Is ₹2,500 fair for a taxi from Mall Road to Solang Valley?"*
- *"Where is the nearest verified hospital?"*
- *"Is it safe to walk around here at night?"*
- *"What should I do right now during an emergency?"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputText).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await askTravelGuardian({
        query,
        city: currentCity?.name,
        lat: userCoords.lat,
        lng: userCoords.lng,
        safetyScore: safetyScoreData?.score,
      });

      const guardianMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'guardian',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: res.isAiGenerated,
      };

      setMessages((prev) => [...prev, guardianMsg]);
    } catch (err) {
      console.error('Guardian request error:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'guardian',
        text: "I couldn't connect to the safety server right now. In an emergency, please dial **112** immediately.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 h-[calc(100dvh-5.5rem)] max-h-[100dvh] flex flex-col pb-safe">
      {/* Header Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-xl shadow-lg shadow-indigo-900/40">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-white">YatraGuard AI</h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                Safety & Fare Advisor
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                {currentCity?.name}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                Score: {safetyScoreData?.score || 76}/100
              </span>
              <span>•</span>
              <span className="text-amber-400 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Fares Grounded
              </span>
              <span>•</span>
              <span className="text-blue-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> 112 Protocol Active
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: '1',
                sender: 'guardian',
                text: `Context refreshed for **${currentCity?.name}**. How can I assist your travel safety or check fares right now?`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors self-end sm:self-auto"
          title="Reset conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar flex-shrink-0">
        {getCityPrompts().map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="flex-shrink-0 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full text-xs font-medium border border-slate-800 hover:border-amber-500/40 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 glass-panel rounded-3xl border border-slate-800 mb-4">
        {messages.map((msg) => {
          const isGuardian = msg.sender === 'guardian';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isGuardian ? 'justify-start' : 'justify-end'}`}
            >
              {isGuardian && (
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isGuardian
                    ? 'bg-slate-900 border border-slate-800 text-slate-100 shadow-md'
                    : 'bg-red-600 text-white font-medium shadow-md shadow-red-900/30'
                }`}
              >
                {/* Safe React Markdown Renderer (Zero XSS) */}
                {renderSafeFormattedMessage(msg.text)}
                <div
                  className={`mt-2 text-[10px] text-right ${
                    isGuardian ? 'text-slate-500' : 'text-red-200'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {!isGuardian && (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span>Analyzing safety conditions in {currentCity?.name}...</span>
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
        className="glass-panel p-2 rounded-2xl border border-slate-800 flex items-center gap-2 flex-shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask Travel Guardian about safety in ${currentCity?.name || 'India'}...`}
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
