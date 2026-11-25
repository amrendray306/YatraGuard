import axios from 'axios';

// Base API instance
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/uploads/') && API_BASE_URL.startsWith('http')) {
    try {
      const origin = new URL(API_BASE_URL).origin;
      return `${origin}${url}`;
    } catch {
      return url;
    }
  }
  return url;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('travel_guardian_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Helper Methods
export const fetchCities = async () => (await api.get('/cities')).data;
export const fetchCity = async (id: string) => (await api.get(`/cities/${id}`)).data;
export const searchDestinations = async (query: string) =>
  (await api.get('/destinations/search', { params: { q: query } })).data;

export const fetchSafetyScore = async (
  lat: number,
  lng: number,
  cityId?: string,
  hour?: number,
  weatherSeverity?: string
) =>
  (await api.get(`/safety-score`, { params: { lat, lng, cityId, hour, weatherSeverity } })).data;

export const evaluateRouteRisk = async (payload: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  fromName?: string;
  toName?: string;
  cityId?: string;
}) => (await api.post('/route-risk', payload)).data;

export const fetchWeather = async (cityId?: string, cityName?: string) =>
  (await api.get('/weather', { params: { cityId, cityName } })).data;

export const fetchCosts = async (cityId?: string, category?: string) =>
  (await api.get('/costs', { params: { cityId, category } })).data;

export const fetchCrowd = async (cityId?: string) =>
  (await api.get('/crowd', { params: { cityId } })).data;

export const fetchNearbyServices = async (params: {
  lat?: number;
  lng?: number;
  category?: string;
  cityId?: string;
  sortBy?: 'distance' | 'rating';
}) => (await api.get('/services/nearby', { params })).data;

export const fetchNearbyPlaces = async (params: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  category?: string;
  subCategory?: string;
  cityId?: string;
  strictCityFilter?: boolean;
  openNow?: boolean;
  is24Hours?: boolean;
  query?: string;
  sortBy?: 'distance' | 'roadDistance' | 'fastest' | 'category' | 'rating';
  limit?: number;
}) => (await api.get('/places/nearby', { params })).data;

export const fetchEmergencyShortcuts = async (lat?: number, lng?: number) =>
  (await api.get('/places/emergency-shortcuts', { params: { lat, lng } })).data;

export const autocompletePlacesGlobal = async (params: {
  q: string;
  lat?: number;
  lng?: number;
  sessionToken?: string;
}) => (await api.get('/places/autocomplete', { params })).data;

export const geocodePlaceOrAddress = async (params: {
  placeId?: string;
  address?: string;
  sessionToken?: string;
}) => (await api.get('/places/geocode', { params })).data;

export const reverseGeocodeCoords = async (lat: number, lng: number) =>
  (await api.get('/places/reverse-geocode', { params: { lat, lng } })).data;

export const planCompleteRoute = async (payload: {
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  travelHour?: number;
  waitingMins?: number;
  hasLuggage?: boolean;
}) => (await api.post('/routes/plan', payload)).data;

export const calculateMultimodalFares = async (payload: {
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  cityName?: string;
  travelHour?: number;
  explicitRoadDistanceKm?: number;
  waitingMins?: number;
  hasLuggage?: boolean;
  tollAmount?: number;
}) => (await api.post('/routes/multimodal-fares', payload)).data;

export const savePlaceBookmark = async (payload: {
  placeId?: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  notes?: string;
}) => (await api.post('/user/saved-places', payload)).data;

export const fetchSavedPlaceBookmarks = async () =>
  (await api.get('/user/saved-places')).data;

export const deleteSavedPlaceBookmark = async (id: string) =>
  (await api.delete(`/user/saved-places/${id}`)).data;

export const saveRouteBookmark = async (payload: {
  originName: string;
  destName: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  distanceKm: number;
  travelMode?: string;
  estimatedMinutes: number;
}) => (await api.post('/user/saved-routes', payload)).data;

export const fetchSavedRouteBookmarks = async () =>
  (await api.get('/user/saved-routes')).data;

export const deleteSavedRouteBookmark = async (id: string) =>
  (await api.delete(`/user/saved-routes/${id}`)).data;

export const fetchMapData = async (params: { cityId?: string; lat?: number; lng?: number }) =>
  (await api.get('/map/data', { params })).data;

export const fetchIncidents = async (params?: {
  cityId?: string;
  category?: string;
  status?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  filterType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => (await api.get('/incidents', { params })).data;

export const submitIncident = async (payload: {
  category: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  cityId?: string;
  cityName?: string;
  amountDemanded?: number;
  amountPaid?: number;
  evidenceUrl?: string;
  incidentDate?: string;
}) => (await api.post('/incidents', payload)).data;

export const verifyIncident = async (
  id: string,
  payload: { action: 'CONFIRM_RELEVANT' | 'MARK_OUTDATED' | 'FLAG_INACCURATE' | 'ADD_EVIDENCE'; notes?: string; evidenceUrl?: string }
) => (await api.post(`/incidents/${id}/verify`, payload)).data;

export const confirmIncident = async (id: string) =>
  (await api.post(`/incidents/${id}/confirm`, { action: 'CONFIRM_RELEVANT' })).data;

// --- ROUTE-WISE PRICE INTELLIGENCE API ---
export const fetchRoutePricing = async (payload: {
  fromName: string;
  toName: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  cityId?: string;
  cityName?: string;
  travelHour?: number;
  travelDate?: string;
}) => (await api.post('/routes/pricing', payload)).data;

export const reportRouteOvercharge = async (payload: {
  originName: string;
  destinationName: string;
  cityName?: string;
  transportModeId?: string;
  expectedPriceMin?: number;
  expectedPriceMax?: number;
  amountDemanded: number;
  amountActuallyPaid?: number;
  lat?: number;
  lng?: number;
  notes?: string;
}) => (await api.post('/routes/report-overcharge', payload)).data;

// --- CITY-WISE LOCAL PRICE DATABASE API ---
export const fetchPriceRecords = async (params?: {
  cityId?: string;
  category?: string;
  search?: string;
  verificationStatus?: string;
}) => (await api.get('/prices', { params })).data;

export const submitPriceRecord = async (payload: {
  cityId: string;
  category: string;
  itemName: string;
  minPrice: number;
  maxPrice: number;
  notes?: string;
  sourceReference?: string;
}) => (await api.post('/prices', payload)).data;

// --- NEARBY SAFETY NOTIFICATIONS API ---
export const fetchNearbyAlerts = async (params?: {
  lat?: number;
  lng?: number;
  cityId?: string;
  radiusKm?: number;
}) => (await api.get('/notifications/nearby-alerts', { params })).data;

export const fetchNotificationPreferences = async () =>
  (await api.get('/user/notification-preferences')).data;

export const updateNotificationPreferences = async (payload: any) =>
  (await api.put('/user/notification-preferences', payload)).data;

export const fetchScams = async (params?: { cityId?: string; category?: string }) =>
  (await api.get('/scams', { params })).data;

export const submitScam = async (payload: any) =>
  (await api.post('/scams', payload)).data;

export const voteScam = async (id: string) =>
  (await api.post(`/scams/${id}/vote`)).data;

export const fetchEmergencyInfo = async (params: { lat?: number; lng?: number; cityId?: string }) =>
  (await api.get('/emergency/info', { params })).data;

export const triggerSos = async (payload: {
  emergencyType: string;
  lat: number;
  lng: number;
  address?: string;
  cityId?: string;
}) => (await api.post('/emergency/sos', payload)).data;

export const askTravelGuardian = async (payload: {
  query: string;
  city?: string;
  lat?: number;
  lng?: number;
  safetyScore?: number;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
}) => (await api.post('/ai/chat', payload)).data;

export const fetchUserTrips = async () => (await api.get('/trips')).data;
export const createTrip = async (payload: any) => (await api.post('/trips', payload)).data;
export const fetchSharedTrip = async (token: string) => (await api.get(`/trips/share/${token}`)).data;

export const fetchVault = async () => (await api.get('/vault')).data;
export const createVaultItem = async (payload: any) => (await api.post('/vault', payload)).data;
export const deleteVaultItem = async (id: string) => (await api.delete(`/vault/${id}`)).data;

// --- LOCAL TRANSPORTATION FARE INTELLIGENCE API ---
export const estimateFare = async (payload: {
  cityId?: string;
  cityName?: string;
  origin?: string;
  destination?: string;
  distanceKm?: number;
  travelHour?: number;
  hasLuggage?: boolean;
  passengerCount?: number;
}) => (await api.post('/fare/estimate', payload)).data;

export const auditOvercharge = async (payload: {
  cityId?: string;
  cityName?: string;
  transportModeId: string;
  quotedFare: number;
  distanceKm?: number;
  origin?: string;
  destination?: string;
  travelHour?: number;
}) => (await api.post('/fare/check-overcharge', payload)).data;

export const submitCommunityFareReport = async (payload: {
  cityId: string;
  transportModeId: string;
  originName: string;
  destinationName: string;
  distanceKm: number;
  actualFarePaid: number;
  quotedFare?: number;
  wasOvercharged?: boolean;
  comments?: string;
}) => (await api.post('/fare/report', payload)).data;

export const fetchCityFareRules = async (cityId: string) =>
  (await api.get(`/fare/rules/${cityId}`)).data;

export const fetchTransportModes = async () =>
  (await api.get('/fare/modes')).data;

export const fetchCommunityFareReports = async (cityId?: string) =>
  (await api.get('/fare/reports', { params: { cityId } })).data;

// --- AUTHENTICATION APIS ---
export const apiLogin = async (payload: { email: string; password: string }) =>
  (await api.post('/auth/login', payload)).data;

export const apiRegister = async (payload: { name: string; email: string; password: string; phone?: string }) =>
  (await api.post('/auth/register', payload)).data;

export const apiGoogleAuth = async (payload: {
  idToken?: string;
  email?: string;
  name?: string;
  photoUrl?: string;
  googleId?: string;
}) => (await api.post('/auth/google', payload)).data;

export const apiForgotPassword = async (email: string) =>
  (await api.post('/auth/forgot-password', { email })).data;

export const apiResetPassword = async (payload: { resetToken: string; newPassword: string }) =>
  (await api.post('/auth/reset-password', payload)).data;

export const apiGetProfile = async () =>
  (await api.get('/auth/me')).data;

export const apiGetAuthConfig = async (): Promise<{ googleClientId: string }> => {
  try {
    const res = await api.get('/auth/config');
    return res.data;
  } catch (err) {
    return { googleClientId: '' };
  }
};

// --- USER PROFILE & PERSONAL DASHBOARD APIS ---
export const fetchUserProfile = async () => (await api.get('/user/profile')).data;
export const updateUserProfile = async (payload: any) => (await api.put('/user/profile', payload)).data;
export const changeUserPassword = async (payload: { currentPassword: string; newPassword: string }) =>
  (await api.put('/user/change-password', payload)).data;
export const fetchUserDashboardData = async () => (await api.get('/user/dashboard-data')).data;
export const fetchSavedDestinations = async () => (await api.get('/user/saved-destinations')).data;
export const saveDestination = async (payload: { cityName: string; state?: string; imageUrl?: string; notes?: string }) =>
  (await api.post('/user/saved-destinations', payload)).data;
export const removeSavedDestination = async (id: string) => (await api.delete(`/user/saved-destinations/${id}`)).data;
export const fetchNotifications = async () => (await api.get('/user/notifications')).data;
export const markNotificationAsRead = async (id: string) => (await api.put(`/user/notifications/${id}/read`)).data;
export const requestAccountDeletion = async () => (await api.delete('/user/account')).data;

// --- COMMUNITY & TRAVEL BUDDY APIS ---
export const fetchCommunityPosts = async (params?: { city?: string; category?: string; limit?: number }) =>
  (await api.get('/community/posts', { params })).data;
export const submitCommunityPost = async (payload: {
  title: string;
  content: string;
  destinationName: string;
  category?: string;
  imageUrl?: string;
  media?: any[];
}) => (await api.post('/community/posts', payload)).data;
export const likeCommunityPost = async (id: string) => (await api.post(`/community/posts/${id}/like`)).data;
export const submitPostComment = async (postId: string, content: string) =>
  (await api.post(`/community/posts/${postId}/comment`, { content })).data;
export const fetchTravelBuddies = async (params?: { city?: string; style?: string }) =>
  (await api.get('/community/buddies', { params })).data;
export const submitTravelBuddy = async (payload: {
  destinationCity: string;
  startDate: string;
  endDate: string;
  travelStyle: string;
  notes?: string;
}) => (await api.post('/community/buddies', payload)).data;

// --- ADMIN DASHBOARD APIS ---
export const fetchAdminOverview = async () => (await api.get('/admin/overview')).data;
export const fetchAdminUsers = async (params?: { search?: string; role?: string; status?: string }) =>
  (await api.get('/admin/users', { params })).data;
export const updateAdminUserStatus = async (id: string, isActive: boolean) =>
  (await api.put(`/admin/users/${id}/status`, { isActive })).data;
export const updateAdminUserRole = async (id: string, role: string) =>
  (await api.put(`/admin/users/${id}/role`, { role })).data;
export const fetchAdminIncidents = async (params?: { status?: string; cityId?: string }) =>
  (await api.get('/admin/incidents', { params })).data;
export const reviewIncident = async (id: string, action: 'APPROVE' | 'REJECT', notes?: string) =>
  (await api.post(`/admin/incidents/${id}/review`, { action, notes })).data;
export const reviewFareReport = async (id: string, action: 'APPROVE' | 'REJECT') =>
  (await api.post(`/admin/fare-reports/${id}/review`, { action })).data;
export const fetchAdminPrices = async (params?: { cityId?: string }) =>
  (await api.get('/admin/prices', { params })).data;
export const createAdminPriceRule = async (payload: any) =>
  (await api.post('/admin/prices', payload)).data;
export const updateAdminPriceRule = async (id: string, payload: any) =>
  (await api.put(`/admin/prices/${id}`, payload)).data;
export const deleteAdminPriceRule = async (id: string) =>
  (await api.delete(`/admin/prices/${id}`)).data;
export const fetchAdminDestinations = async () =>
  (await api.get('/admin/destinations')).data;
export const updateAdminDestination = async (id: string, payload: { defaultSafetyScore?: number; description?: string }) =>
  (await api.put(`/admin/destinations/${id}`, payload)).data;
export const fetchAdminCommunityPosts = async () =>
  (await api.get('/admin/community/posts')).data;
export const deleteAdminCommunityPost = async (id: string) =>
  (await api.delete(`/admin/community/posts/${id}`)).data;
export const fetchAdminAnalytics = async () =>
  (await api.get('/admin/analytics')).data;
export const fetchAdminAuditLogs = async () =>
  (await api.get('/admin/audit-logs')).data;
