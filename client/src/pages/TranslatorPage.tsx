import React, { useState } from 'react';
import { Languages, Volume2, Camera, Copy, Check, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui';

interface Phrase {
  category: 'EMERGENCY' | 'TRANSIT' | 'MEDICAL' | 'GENERAL';
  english: string;
  hindi: string;
  transliteration: string;
}

const PHRASES: Phrase[] = [
  {
    category: 'EMERGENCY',
    english: 'Help me please!',
    hindi: 'कृपया मेरी मदद कीजिए!',
    transliteration: 'Kripya meri madad kijiye!',
  },
  {
    category: 'EMERGENCY',
    english: 'Where is the police station?',
    hindi: 'पुलिस स्टेशन कहाँ है?',
    transliteration: 'Police station kahan hai?',
  },
  {
    category: 'EMERGENCY',
    english: 'Call the doctor or ambulance immediately.',
    hindi: 'डॉक्टर या एम्बुलेंस को तुरंत बुलाइए।',
    transliteration: 'Doctor ya ambulance ko turant bulaiye.',
  },
  {
    category: 'EMERGENCY',
    english: 'Stop the vehicle immediately, I want to get down!',
    hindi: 'गाड़ी तुरंत रोकिए, मुझे उतरना है!',
    transliteration: 'Gadi turant rokiye, mujhe utarna hai!',
  },
  {
    category: 'TRANSIT',
    english: 'Please turn on the digital meter.',
    hindi: 'कृपया डिजिटल मीटर चालू कीजिए।',
    transliteration: 'Kripya digital meter chalu kijiye.',
  },
  {
    category: 'TRANSIT',
    english: 'This fare is too high, please charge the official government rate.',
    hindi: 'यह किराया बहुत ज़्यादा है, कृपया सरकारी दर लगाइए।',
    transliteration: 'Yeh kiraya bohot zyada hai, kripya sarkari dar lagaiye.',
  },
  {
    category: 'TRANSIT',
    english: 'Take me to the official prepaid taxi / auto booth.',
    hindi: 'मुझे सरकारी प्रीपेड टैक्सी / ऑटो बूथ पर ले चलिए।',
    transliteration: 'Mujhe sarkari prepaid taxi / auto booth par le chaliye.',
  },
  {
    category: 'TRANSIT',
    english: 'How much to reach the railway station?',
    hindi: 'रेलवे स्टेशन जाने का कितना किराया है?',
    transliteration: 'Railway station jaane ka kitna kiraya hai?',
  },
  {
    category: 'TRANSIT',
    english: 'Do not stop at any commercial emporium or shop.',
    hindi: 'कृपया रास्ते में किसी दुकान या एम्पोरियम पर मत रोकिए।',
    transliteration: 'Kripya raste mein kisi dukaan ya emporium par mat rokiye.',
  },
  {
    category: 'MEDICAL',
    english: 'Where is the nearest 24/7 medical store?',
    hindi: 'सबसे नज़दीकी दवाई की दुकान कहाँ है?',
    transliteration: 'Sabse nazdeeki dawai ki dukan kahan hai?',
  },
  {
    category: 'MEDICAL',
    english: 'I have an allergy (Peanuts / Dairy / Medicine).',
    hindi: 'मुझे एलर्जी है (मूँगफली / दूध / दवाई से)।',
    transliteration: 'Mujhe allergy hai (Moongfali / Doodh / Dawai se).',
  },
  {
    category: 'GENERAL',
    english: 'I do not need a guide or tour, please leave.',
    hindi: 'मुझे गाइड नहीं चाहिए, कृपया मुझे अकेला छोड़ दीजिए।',
    transliteration: 'Mujhe guide nahi chahiye, kripya mujhe akela chhod dijiye.',
  },
  {
    category: 'GENERAL',
    english: 'Where is the official monument ticket counter?',
    hindi: 'स्मारक का असली टिकट काउंटर कहाँ है?',
    transliteration: 'Smarak ka asli ticket counter kahan hai?',
  },
  {
    category: 'GENERAL',
    english: 'Is this bottled drinking water sealed?',
    hindi: 'क्या यह पीने का पानी सीलबंद है?',
    transliteration: 'Kya yeh peene ka paani seal-band hai?',
  },
];

export const TranslatorPage: React.FC = () => {
  const { showToast } = useToast();
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [ocrDemoActive, setOcrDemoActive] = useState(false);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Phrase copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredPhrases = PHRASES.filter(
    (p) => selectedCat === 'ALL' || p.category === selectedCat
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-16 yg-page-enter">
      <PageHeader
        eyebrow="Safety & Travel Phrasebook"
        icon={Languages}
        accentColor="cyan"
        title="Language Assistant (Hindi ⇄ English)"
        description="Essential emergency, medical, and transit phrases with instant audio playback and transliterations."
      />

      {/* OCR Simulator Demo Card */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                Signboard & Ticket OCR Assistant
              </h3>
              <p className="text-xs text-slate-400">
                Snap or inspect Hindi signs, railway boards, or handwritten auto tariff cards
              </p>
            </div>
          </div>

          <button
            onClick={() => setOcrDemoActive(!ocrDemoActive)}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {ocrDemoActive ? 'Hide Demo' : 'Simulate Signboard Scan'}
          </button>
        </div>

        {ocrDemoActive && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-900/40 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[11px] uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Simulated Railway Station Board Detected:
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-lg font-black text-white">“प्रीपेड ऑटो रिक्शा बूथ - बिना मीटर यात्रा न करें”</div>
              <div className="text-xs font-mono text-cyan-300 mt-1">
                Transliteration: “Prepaid Auto Rickshaw Booth - Bina meter yatra na karein”
              </div>
              <div className="text-xs text-slate-200 mt-1 font-semibold">
                English Translation: “Prepaid Auto Rickshaw Counter - Do not travel without meter.”
              </div>
              <div className="text-[11px] text-amber-300 mt-1.5 bg-amber-950/40 p-2 rounded-lg border border-amber-900/40">
                💡 <strong>Guardian Safety Note:</strong> This official traffic police sign warns you that getting in an auto outside this queue without a meter ticket leads to overcharging.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'EMERGENCY', 'TRANSIT', 'MEDICAL', 'GENERAL'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 touch-min ${
              selectedCat === cat
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Phrases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredPhrases.map((phrase, idx) => (
          <div
            key={idx}
            className="glass-panel-elevated p-4 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  {phrase.category}
                </span>
                <button
                  onClick={() => speak(phrase.hindi)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors"
                  title="Play Hindi Pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-sm font-black text-white mt-1">
                {phrase.english}
              </div>
              <div className="text-sm font-bold text-cyan-300 mt-1">
                {phrase.hindi}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-0.5">
                🗣️ "{phrase.transliteration}"
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex justify-end">
              <button
                onClick={() => handleCopy(`${phrase.hindi} (${phrase.transliteration})`, idx.toString())}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white"
              >
                {copiedId === idx.toString() ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
