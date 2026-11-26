import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Compass,
  Building2,
  IndianRupee,
  Users,
  Navigation,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  User as UserIcon,
  Settings,
  Bot,
  Lock,
  Languages,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Wallet,
  CloudSun,
  WifiOff,
  PackageSearch,
  Route as RouteIcon,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../services/api';

export type NavSectionKey =
  | 'dashboard'
  | 'services'
  | 'routes'
  | 'buddy'
  | 'map'
  | 'alerts'
  | 'safety'
  | 'community'
  | 'highlights'
  | 'profile'
  | 'settings'
  | 'guardian'
  | 'fare'
  | 'trips'
  | 'expenses'
  | 'weather'
  | 'women-safety'
  | 'offline-emergency'
  | 'road-crowd'
  | 'lost-found'
  | 'vault'
  | 'translator'
  | 'admin';

interface SidebarProps {
  currentTab: string;
  activeSubSection?: 'PROFILE' | 'SETTINGS' | 'COMMUNITY' | 'HIGHLIGHTS';
  onSelectNav: (key: NavSectionKey) => void;
  openEmergencyModal: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavGroup {
  label: string;
  items: {
    key: NavSectionKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isEmergency?: boolean;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeSubSection,
  onSelectNav,
  openEmergencyModal,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const [showTools, setShowTools] = useState(true);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', onKeyDown);
    const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 20);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  const groups: NavGroup[] = [
    {
      label: 'EXPLORE',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: Compass },
        { key: 'guardian', label: 'AI Assistant', icon: Bot },
        { key: 'services', label: 'Nearby Services', icon: Building2 },
        { key: 'road-crowd', label: 'Crowd & Road Intel', icon: RouteIcon },
      ],
    },
    {
      label: 'NAVIGATE',
      items: [
        { key: 'routes', label: 'Travel Tariff', icon: IndianRupee },
        { key: 'fare', label: 'Local Prices', icon: IndianRupee },
        { key: 'translator', label: 'Translator', icon: Languages },
      ],
    },
    {
      label: 'SAFETY',
      items: [
        { key: 'map', label: 'Safety Map', icon: Navigation },
        { key: 'alerts', label: 'Risk & Scam Alerts', icon: AlertTriangle },
        { key: 'weather', label: 'Weather Forecast', icon: CloudSun },
        { key: 'women-safety', label: 'Women Safety', icon: ShieldCheck },
        { key: 'offline-emergency', label: 'Offline Emergency', icon: WifiOff },
        { key: 'safety', label: 'Emergency Services', icon: ShieldAlert },
      ],
    },
    {
      label: 'COMMUNITY',
      items: [
        { key: 'community', label: 'Travel Community', icon: MessageSquare },
        { key: 'highlights', label: 'Community Highlights', icon: Sparkles },
        { key: 'buddy', label: 'Buddies & Groups', icon: Users },
        { key: 'lost-found', label: 'Lost & Found', icon: PackageSearch },
      ],
    },
    {
      label: 'MY TRAVEL',
      items: [
        { key: 'trips', label: 'Smart Trip Planner', icon: MapPin },
        { key: 'expenses', label: 'Expense Tracker', icon: Wallet },
        { key: 'vault', label: 'Document Vault', icon: Lock },
      ],
    },
    {
      label: 'ACCOUNT',
      items: [
        { key: 'profile', label: 'Profile', icon: UserIcon },
        { key: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const utilityItems: { key: NavSectionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    ...(user?.role === 'ADMIN' || user?.role === 'MODERATOR'
      ? [{ key: 'admin' as NavSectionKey, label: 'Admin Portal', icon: ShieldAlert }]
      : []),
  ];

  const isItemActive = (key: NavSectionKey) => {
    if (key === 'profile') return currentTab === 'profile' && activeSubSection !== 'SETTINGS';
    if (key === 'settings') return currentTab === 'profile' && activeSubSection === 'SETTINGS';
    if (key === 'community') return currentTab === 'community' && activeSubSection !== 'HIGHLIGHTS';
    if (key === 'highlights') return currentTab === 'community' && activeSubSection === 'HIGHLIGHTS';
    if (key === 'services') return currentTab === 'services' || currentTab === 'nearby' || currentTab === 'places';
    if (key === 'fare') return currentTab === 'fare' || currentTab === 'costs';
    return currentTab === key;
  };

  const renderContent = (isDrawer = false) => {
    const isCollapsed = !isDrawer && collapsed;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/90 select-none">
        {/* Brand Header */}
        <div
          className={`flex items-center h-16 border-b border-slate-200 dark:border-slate-800/90 px-3 ${
            isCollapsed ? 'justify-center' : 'justify-between px-4'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              onSelectNav('dashboard');
              if (isDrawer) onCloseMobile();
            }}
            className="flex items-center gap-2.5 text-left min-w-0"
            aria-label="YatraGuard Dashboard"
          >
            <div className="p-2 bg-gradient-to-br from-sky-600 to-teal-600 rounded-xl shadow-sm flex items-center justify-center keep-white flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white block leading-none">
                  Yatra<span className="text-sky-600 dark:text-sky-400">Guard</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                  Travel Safety Platform
                </span>
              </div>
            )}
          </button>

          {isDrawer ? (
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 touch-min flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            !isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Categorized Navigation */}
        <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.label}
                </div>
              )}

              {/* Insert SOS Emergency inside SAFETY right after Safety Map */}
              {group.items.map((item, idx) => {
                const Icon = item.icon;
                const active = isItemActive(item.key);
                return (
                  <React.Fragment key={item.key}>
                    <button
                      type="button"
                      title={isCollapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => {
                        onSelectNav(item.key);
                        if (isDrawer) onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isCollapsed ? 'justify-center' : ''
                      } ${
                        active
                          ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>

                    {group.label === 'SAFETY' && idx === 0 && (
                      <button
                        type="button"
                        title={isCollapsed ? 'SOS Emergency' : undefined}
                        onClick={() => {
                          openEmergencyModal();
                          if (isDrawer) onCloseMobile();
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                          isCollapsed ? 'justify-center' : ''
                        } bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/50 dark:hover:bg-red-900/60 dark:text-red-300 dark:border-red-800/60`}
                      >
                        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" aria-hidden="true" />
                        {!isCollapsed && <span className="truncate">SOS Emergency</span>}
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))}

          {/* Admin / Staff Portal (only rendered for ADMIN / MODERATOR) */}
          {utilityItems.length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                aria-expanded={showTools}
                className="w-full px-2.5 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <span>STAFF CONSOLE</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showTools ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            ) : null}

            {(isCollapsed || showTools) &&
              utilityItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    title={isCollapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      onSelectNav(item.key);
                      if (isDrawer) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
          </div>
          )}
        </nav>

        {/* User Profile & Auth Access Footer */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800/90 flex-shrink-0">
          {user ? (
            <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <button
                type="button"
                onClick={() => {
                  onSelectNav('profile');
                  if (isDrawer) onCloseMobile();
                }}
                className={`flex items-center gap-2.5 min-w-0 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-left ${
                  isCollapsed ? 'justify-center' : 'flex-1'
                }`}
                title="Open profile"
              >
                {user.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(user.avatarUrl)}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-600 to-teal-600 text-white text-xs font-bold flex items-center justify-center keep-white flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                )}
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.role}</div>
                  </div>
                )}
              </button>
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    if (isDrawer) onCloseMobile();
                  }}
                  aria-label="Sign out"
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors flex-shrink-0"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              onClick={isDrawer ? onCloseMobile : undefined}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors keep-white ${
                isCollapsed ? 'justify-center px-2' : 'justify-center'
              }`}
              title="Sign In to YatraGuard"
            >
              <UserIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {!isCollapsed && <span>Sign In / Register</span>}
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:block flex-shrink-0 transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-60'
        }`}
      >
        <div className="sticky top-0 h-[100dvh]">{renderContent(false)}</div>
      </aside>

      {/* Tablet / Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[150] flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-72 max-w-[82vw] h-full shadow-2xl">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
