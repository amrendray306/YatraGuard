import axios from 'axios';

// Base API instance
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

export const fetchMapData = async (params: { cityId?: string; lat?: number; lng?: number }) =>
  (await api.get('/map/data', { params })).data;

export const fetchIncidents = async (params?: { cityId?: string; category?: string; status?: string }) =>
  (await api.get('/incidents', { params })).data;

export const submitIncident = async (payload: any) =>
  (await api.post('/incidents', payload)).data;

export const confirmIncident = async (id: string) =>
  (await api.post(`/incidents/${id}/confirm`)).data;

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

export const fetchAdminOverview = async () => (await api.get('/admin/overview')).data;
export const reviewIncident = async (id: string, action: 'APPROVE' | 'REJECT') =>
  (await api.post(`/admin/incidents/${id}/review`, { action })).data;
export const reviewFareReport = async (id: string, action: 'APPROVE' | 'REJECT') =>
  (await api.post(`/admin/fare-reports/${id}/review`, { action })).data;

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

// Authentication APIs
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
