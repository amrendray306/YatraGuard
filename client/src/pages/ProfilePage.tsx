import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  MapPin,
  Mail,
  Phone,
  Compass,
  Heart,
  Lock,
  AlertTriangle,
  MessageSquare,
  Users,
  ShieldAlert,
  Navigation,
  Bell,
  Settings,
  Edit2,
  Key,
  LogOut,
  Trash2,
  PlusCircle,
  ExternalLink,
  CheckCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserDashboardData,
  updateUserProfile,
  changeUserPassword,
  removeSavedDestination,
  markNotificationAsRead,
  requestAccountDeletion,
} from '../services/api';
import { ProfileCard } from '../components/cards/ProfileCard';
import { EmergencyContactCard } from '../components/cards/EmergencyContactCard';
import { NotificationCard } from '../components/cards/NotificationCard';
import { ProfileImageModal } from '../components/shared/ProfileImageModal';
import { ConfirmationModal } from '../components/ui';

interface ProfilePageProps {
  setCurrentTab: (tab: string) => void;
  openEmergencyModal: () => void;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;
  initialSection?: 'OVERVIEW' | 'SETTINGS';
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  setCurrentTab,
  openEmergencyModal,
  openAuthModal,
  initialSection = 'OVERVIEW',
}) => {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'OVERVIEW' | 'SETTINGS'>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // Modals
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    location: '',
    aboutMe: '',
    travelPreferences: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    if (!user) {
      setDashboardData(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await fetchUserDashboardData();
      setDashboardData(data);
      if (data.user) {
        setEditForm({
          name: data.user.name || '',
          phone: data.user.phone || '',
          location: data.user.location || '',
          aboutMe: data.user.aboutMe || '',
          travelPreferences: data.user.travelPreferences || '',
          emergencyContactName: data.user.emergencyContactName || '',
          emergencyContactPhone: data.user.emergencyContactPhone || '',
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserProfile(editForm);
      setIsEditModalOpen(false);
      setToastMessage({ text: 'Profile updated successfully', type: 'success' });
      loadData();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setToastMessage({ text: 'Failed to update profile details', type: 'error' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      setToastMessage({ text: 'New password must be at least 8 characters long', type: 'error' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToastMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }

    try {
      await changeUserPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToastMessage({ text: 'Password updated successfully', type: 'success' });
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setToastMessage({
        text: err.response?.data?.error || 'Failed to update password. Check your current password.',
        type: 'error',
      });
    }
  };

  const handleRemoveSavedDest = async (id: string) => {
    try {
      await removeSavedDestination(id);
      setDashboardData((prev: any) => ({
        ...prev,
        savedDestinations: prev.savedDestinations.filter((d: any) => d.id !== id),
      }));
      setToastMessage({ text: 'Destination removed from saved', type: 'success' });
    } catch (err) {
      console.error('Failed to remove saved destination:', err);
    }
  };

  const handleMarkNotification = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setDashboardData((prev: any) => ({
        ...prev,
        notifications: prev.notifications.map((n: any) => (n.id === id ? { ...n, isRead: true } : n)),
      }));
    } catch (err) {
      console.error('Failed to mark notification:', err);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await requestAccountDeletion();
      logout();
      setCurrentTab('landing');
    } catch (err) {
      console.error('Failed to delete account:', err);
      setToastMessage({ text: 'Failed to delete account', type: 'error' });
    }
  };

  if (!user && !isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Sign In to View Your Profile</h2>
        <p className="text-sm text-slate-300">
          Access your personal travel dashboard, saved destinations, trip sharing links, and emergency contacts.
        </p>
        <button
          onClick={() => openAuthModal('LOGIN')}
          className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const profileUser = dashboardData?.user || user;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800'
              : 'bg-red-950/90 text-red-300 border border-red-800'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Header Card */}
      {profileUser && (
        <ProfileCard
          user={profileUser}
          onEditPhoto={() => setIsPhotoModalOpen(true)}
          onEditProfile={() => setIsEditModalOpen(true)}
          onChangePassword={() => setIsPasswordModalOpen(true)}
          onLogout={() => {
            logout();
            setCurrentTab('landing');
          }}
        />
      )}

      {/* Sub-Navigation Switcher */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeSection === 'OVERVIEW'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Personal Dashboard</span>
        </button>

        <button
          onClick={() => setActiveSection('SETTINGS')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeSection === 'SETTINGS'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Account & Security Settings</span>
        </button>
      </div>

      {activeSection === 'OVERVIEW' ? (
        /* PERSONAL DASHBOARD CARDS GRID */
        <div className="space-y-8">
          {/* Top 3 Quick Action Dashboard Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Trips</span>
              <div className="text-2xl font-black text-white">{dashboardData?.trips?.length || 0}</div>
              <span className="text-[10px] text-emerald-400 font-semibold">1 with Live Sharing</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Saved Destinations</span>
              <div className="text-2xl font-black text-amber-400">
                {dashboardData?.savedDestinations?.length || 0}
              </div>
              <span className="text-[10px] text-slate-400">Manali, Leh, Rishikesh</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Incident Reports</span>
              <div className="text-2xl font-black text-red-400">{dashboardData?.incidents?.length || 0}</div>
              <span className="text-[10px] text-slate-400">Crowdsourced verified</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Community Stories</span>
              <div className="text-2xl font-black text-blue-400">
                {dashboardData?.communityPosts?.length || 0}
              </div>
              <span className="text-[10px] text-slate-400">Safety tips published</span>
            </div>
          </div>

          {/* 1. MY TRIPS & SAVED ROUTES */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-black text-white">My Trips & Live Location Broadcast</h3>
              </div>
              <button
                onClick={() => setCurrentTab('trips')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>Manage Trips</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {dashboardData?.trips?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No trips planned yet. Click Manage Trips to create one.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboardData?.trips?.map((trip: any) => (
                  <div
                    key={trip.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{trip.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {trip.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>{trip.destinationCity} • {trip.currentLocation}</span>
                    </p>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span>ICE Contact: {trip.emergencyContactPhone}</span>
                      <button
                        onClick={() => setCurrentTab('trips')}
                        className="text-blue-400 font-bold hover:underline"
                      >
                        View Live ETA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. SAVED DESTINATIONS */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-black text-white">Saved Destinations</h3>
              </div>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>Explore More</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {dashboardData?.savedDestinations?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No saved destinations. Click heart on any destination card to save.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardData?.savedDestinations?.map((dest: any) => (
                  <div
                    key={dest.id}
                    className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden group hover:border-amber-500/60 transition-all flex flex-col justify-between"
                  >
                    {dest.imageUrl && (
                      <div className="h-28 w-full overflow-hidden relative">
                        <img
                          src={dest.imageUrl}
                          alt={dest.cityName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <button
                          onClick={() => handleRemoveSavedDest(dest.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                          title="Remove saved"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="p-3.5 space-y-2">
                      <div>
                        <h4 className="text-sm font-black text-white">{dest.cityName}</h4>
                        <p className="text-[11px] text-slate-400">{dest.state}</p>
                      </div>
                      {dest.notes && (
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed bg-slate-900/80 p-2 rounded-lg">
                          {dest.notes}
                        </p>
                      )}
                      <button
                        onClick={() => setCurrentTab('dashboard')}
                        className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors"
                      >
                        Explore City
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. EMERGENCY CONTACTS & OFFLINE VAULT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary ICE Emergency Contact */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-black text-white">Emergency ICE Contacts</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Update ICE</span>
                </button>
              </div>

              {profileUser?.emergencyContactName ? (
                <EmergencyContactCard
                  name={profileUser.emergencyContactName}
                  relation="Designated Family Guardian"
                  phone={profileUser.emergencyContactPhone || '+919876543210'}
                  isPrimary={true}
                  onEdit={() => setIsEditModalOpen(true)}
                />
              ) : (
                <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/50 text-xs text-red-300 space-y-2">
                  <p className="font-bold">No Emergency ICE Contact designated yet!</p>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold"
                  >
                    Add ICE Contact
                  </button>
                </div>
              )}
            </div>

            {/* Offline Emergency Vault */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white">Emergency Vault Documents</h3>
                </div>
                <button
                  onClick={() => setCurrentTab('vault')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Open Vault</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {dashboardData?.vaultItems?.slice(0, 3).map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{item.title}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{item.referenceData}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      AES-256
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. NOTIFICATIONS */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Recent Notifications & Platform Alerts</h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {dashboardData?.notifications?.map((notif: any) => (
                <NotificationCard
                  key={notif.id}
                  id={notif.id}
                  title={notif.title}
                  message={notif.message}
                  type={notif.type}
                  isRead={notif.isRead}
                  createdAt={new Date(notif.createdAt).toLocaleDateString()}
                  onMarkRead={() => handleMarkNotification(notif.id)}
                  onClick={() => {
                    if (notif.linkUrl) {
                      if (notif.linkUrl.includes('map')) setCurrentTab('map');
                      else if (notif.linkUrl.includes('fare')) setCurrentTab('fare');
                      else if (notif.linkUrl.includes('admin')) setCurrentTab('admin');
                      else setCurrentTab('dashboard');
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ACCOUNT & SECURITY SETTINGS */
        <div className="max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">Account Security & Privacy</h3>
            <p className="text-xs text-slate-400">
              Manage credentials, authentication session, trip sharing permissions, and account data deletion.
            </p>
          </div>

          <div className="space-y-6 text-xs divide-y divide-slate-800">
            <div className="pt-4 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-white text-sm">Profile Details</h5>
                <p className="text-slate-400">Update your name, bio, and travel preferences</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                Edit Details
              </button>
            </div>

            {profileUser?.authProvider === 'LOCAL' && (
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-sm">Account Password</h5>
                  <p className="text-slate-400">Update your password to keep your account secure</p>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  Change Password
                </button>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-white text-sm">Emergency ICE Contacts</h5>
                <p className="text-slate-400">Manage family phone numbers alerted during SOS broadcasts</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                Update Contact
              </button>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-white text-sm">Trip Privacy & Sharing</h5>
                <p className="text-slate-400">Control end-to-end tokenized link sharing for live journeys</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                Token Protected
              </span>
            </div>

            {/* Danger Zone */}
            <div className="pt-6 space-y-3">
              <h5 className="font-bold text-red-400 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </h5>
              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Delete YatraGuard Account</div>
                  <p className="text-slate-400 text-[11px]">
                    Permanently delete your profile, trips, saved documents, and reports.
                  </p>
                </div>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Edit Profile & Travel Preferences</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Home Location / Base</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">About Me / Bio</label>
                <textarea
                  rows={2}
                  value={editForm.aboutMe}
                  onChange={(e) => setEditForm({ ...editForm, aboutMe: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Travel Style (comma separated)</label>
                <input
                  type="text"
                  value={editForm.travelPreferences}
                  onChange={(e) => setEditForm({ ...editForm, travelPreferences: e.target.value })}
                  placeholder="e.g. Mountains, Solo Female, Budget, Heritage"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-3">
                <span className="font-bold text-red-400 block">Emergency ICE Contact</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editForm.emergencyContactName}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                      placeholder="e.g. Rajesh Yadav (Father)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={editForm.emergencyContactPhone}
                      onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })}
                      placeholder="+919876543210"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white">Change Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">New Password (min. 8 chars)</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete YatraGuard Account?"
        description="This action is permanent and cannot be undone. All your trips, saved destinations, and emergency vault entries will be permanently deleted."
        confirmLabel="Yes, Delete Account"
        cancelLabel="Keep Account"
        tone="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* PROFILE PHOTO UPLOAD & CROP MODAL */}
      <ProfileImageModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentAvatarUrl={profileUser?.avatarUrl}
        onSuccess={() => loadData()}
      />
    </div>
  );
};
