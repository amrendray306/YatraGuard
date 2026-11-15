import React, { useState } from 'react';
import {
  ShieldAlert,
  Compass,
  MapPin,
  IndianRupee,
  Navigation,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Sparkles,
  Bot,
  Lock,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to YatraGuard',
      subtitle: 'Explore Freely. Travel Safely Across India.',
      icon: ShieldAlert,
      badge: 'Platform Introduction',
      color: 'from-amber-500 to-red-600',
      description:
        'YatraGuard was architected to eliminate travel uncertainty, prevent tout extortion, and provide context-aware safety intelligence across India. Whether you are navigating crowded transit hubs or mountain passes, your safety is backed by real data.',
      highlights: [
        'Real-time crowdsourced scam vigilance',
        'Official government RTO transit fare protection',
        'Instant emergency SOS with 112 integration',
      ],
      actionLabel: 'Discover Features',
      tabTarget: 'landing',
    },
    {
      title: 'Explore Destinations & Safety Scores',
      subtitle: 'Context-Aware Intelligence Before You Go',
      icon: Compass,
      badge: 'Destination Intelligence',
      color: 'from-blue-500 to-indigo-600',
      description:
        'Search Indian cities, hill stations, and tourist hubs. Every destination features a 0–100 Bayesian Safety Score combining active police outposts, 24/7 hospitals, lighting factors, and weather conditions.',
      highlights: [
        'Live weather forecasts and seasonal crowd indicators',
        'Direct distance to nearest hospitals, police stations & pharmacies',
        'Curated cultural tips and verified tourist police contacts',
      ],
      actionLabel: 'Explore Destinations',
      tabTarget: 'dashboard',
    },
    {
      title: 'Community-Powered Safety Map',
      subtitle: 'Google Maps-Style Navigation with Risk Intelligence',
      icon: Navigation,
      badge: 'Interactive Geospatial Map',
      color: 'from-emerald-500 to-teal-600',
      description:
        'View live color-coded risk zones (🟢 Lower Risk, 🟡 Caution, 🟠 Elevated Risk, 🔴 High Concern). Drop report pins anywhere on the map and calculate safety-aware route alternatives that bypass hazard zones.',
      highlights: [
        'Multi-provider map engine with automatic fallback',
        'GPS locate me with high-accuracy spatial coordinates',
        'Compare Fastest Route vs Lower Reported Safety-Risk Route',
      ],
      actionLabel: 'Open Safety Map',
      tabTarget: 'map',
    },
    {
      title: 'Local Price Intelligence & Tariff Engine',
      subtitle: 'Never Get Overcharged by Touts or Taxis',
      icon: IndianRupee,
      badge: 'Fair Tariffs & Anti-Scam',
      color: 'from-amber-500 to-orange-600',
      description:
        'Access official RTO fare charts for Auto-Rickshaws, Taxis, and Metro systems. Enter your driver’s quote into our instant Overcharge Auditor to know if a rate is Fair, a Potential Overcharge, or a Severe Tourist Scam.',
      highlights: [
        'Automatic +25% night surcharges (11 PM – 5 AM)',
        'Himalayan mountain terrain surcharge (+20% for hill stations like Manali)',
        'Prepaid taxi counter locations and transit terminal tips',
      ],
      actionLabel: 'Check Local Prices',
      tabTarget: 'fare',
    },
    {
      title: 'Travel Community & Travel Buddy',
      subtitle: 'Connect with Verified Fellow Travelers',
      icon: Users,
      badge: 'Social & Buddy Matching',
      color: 'from-purple-500 to-pink-600',
      description:
        'Share authentic travel stories, photos, and safety alerts. Find compatible travel companions heading to the same destination by matching dates, budgets, and travel preferences.',
      highlights: [
        'Post and filter travel stories with high-resolution photos',
        'Travel Buddy requests with verified traveler profiles',
        'Moderator-verified community safety alerts',
      ],
      actionLabel: 'Visit Community',
      tabTarget: 'community',
    },
    {
      title: 'Emergency SOS & Document Vault',
      subtitle: 'Instant Lifeline in Critical Situations',
      icon: ShieldCheck,
      badge: 'Emergency Security',
      color: 'from-red-600 to-rose-700',
      description:
        'One-click Emergency SOS triggers automatic SMS notifications with your exact GPS coordinates to trusted contacts, connects directly to India’s nationwide 112 emergency helpline, and securely stores encrypted passport and ticket copies.',
      highlights: [
        'Direct 112 / 100 / 108 emergency telephone integration',
        'Real-time emergency dispatch log in PostgreSQL',
        'Encrypted Vault item storage with privacy protection',
      ],
      actionLabel: 'View Emergency Info',
      tabTarget: 'services',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('yatraguard_onboarding_completed', 'true');
    onClose();
    if (onNavigateToTab && currentStep.tabTarget) {
      onNavigateToTab(currentStep.tabTarget);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all flex flex-col ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Header Banner */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${currentStep.color} flex items-center justify-center shadow-lg text-white flex-shrink-0`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {currentStep.badge} &bull; Step {step + 1} of {steps.length}
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1">
                {currentStep.title}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {currentStep.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Skip Onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60dvh]">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentStep.description}
          </p>

          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-400">
              Key Capabilities:
            </div>
            <div className="space-y-1.5">
              {currentStep.highlights.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? 'w-6 bg-amber-500'
                    : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>{step === steps.length - 1 ? 'Start Exploring' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
