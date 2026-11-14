import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  getProfile,
} from '../controllers/authController.js';
import {
  getSafetyScore,
  postRouteRisk,
  getWeather,
  getCosts,
  getCrowd,
} from '../controllers/safetyController.js';
import {
  getIncidents,
  createIncident,
  confirmIncident,
  getScams,
  createScam,
  voteScam,
} from '../controllers/incidentController.js';
import {
  getCities,
  getCity,
  getNearbyServices,
  getMapData,
  searchDestinationsHandler,
} from '../controllers/servicesController.js';
import {
  getEmergencyInfo,
  triggerSosLog,
} from '../controllers/emergencyController.js';
import { chatGuardian } from '../controllers/aiController.js';
import {
  getUserTrips,
  createTrip,
  getSharedTrip,
  getVaultItems,
  createVaultItem,
  deleteVaultItem,
} from '../controllers/tripController.js';
import {
  getAdminOverview,
  reviewIncident,
  reviewFareReport,
} from '../controllers/adminController.js';
import {
  calculateFareEstimate,
  checkOvercharge,
  reportCommunityFare,
  getCityRules,
  getTransportModes,
  getRecentCommunityReports,
} from '../controllers/fareController.js';
import {
  authenticateToken,
  optionalAuth,
  requireRole,
} from '../middleware/auth.js';
import {
  authLimiter,
  aiAssistantLimiter,
  emergencyLimiter,
} from '../middleware/security.js';
import { validateCoordinatesMiddleware } from '../middleware/validation.js';

const router = Router();

// --- AUTHENTICATION (Rate-limited to prevent brute-force attacks) ---
router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.post('/auth/google', authLimiter, googleAuth);
router.post('/auth/forgot-password', authLimiter, forgotPassword);
router.post('/auth/reset-password', authLimiter, resetPassword);
router.get('/auth/me', authenticateToken, getProfile);
router.get('/user/profile', authenticateToken, getProfile);

// --- GEOGRAPHY & CITIES ---
router.get('/cities', getCities);
router.get('/cities/:id', getCity);
router.get('/destinations/search', searchDestinationsHandler);

// --- MAP & SERVICES (Coordinate validated) ---
router.get('/map/data', getMapData);
router.get('/map/nearby', validateCoordinatesMiddleware, getNearbyServices);
router.get('/services/nearby', validateCoordinatesMiddleware, getNearbyServices);

// --- SAFETY SCORING & ROUTE RISK ---
router.get('/safety-score', validateCoordinatesMiddleware, getSafetyScore);
router.post('/route-risk', validateCoordinatesMiddleware, postRouteRisk);
router.get('/weather', getWeather);
router.get('/costs', getCosts);
router.get('/crowd', getCrowd);

// --- LOCAL TRANSPORTATION FARE INTELLIGENCE ---
router.post('/fare/estimate', calculateFareEstimate);
router.post('/fare/check-overcharge', checkOvercharge);
router.post('/fare/report', optionalAuth, reportCommunityFare);
router.get('/fare/rules/:cityId', getCityRules);
router.get('/fare/modes', getTransportModes);
router.get('/fare/reports', getRecentCommunityReports);

// --- INCIDENT REPORTING ---
router.get('/incidents', getIncidents);
router.post('/incidents', optionalAuth, createIncident);
router.post('/incidents/:id/confirm', optionalAuth, confirmIncident);

// --- SCAM INTELLIGENCE ---
router.get('/scams', getScams);
router.post('/scams', optionalAuth, createScam);
router.post('/scams/:id/vote', voteScam);

// --- EMERGENCY & SOS (Rate-limited with priority logging) ---
router.get('/emergency/info', validateCoordinatesMiddleware, getEmergencyInfo);
router.post('/emergency/sos', emergencyLimiter, optionalAuth, triggerSosLog);

// --- AI TRAVEL GUARDIAN (Rate-limited to prevent token drainage) ---
router.post('/ai/chat', aiAssistantLimiter, optionalAuth, chatGuardian);

// --- TRIPS & SHARING ---
router.get('/trips', authenticateToken, getUserTrips);
router.post('/trips', authenticateToken, createTrip);
router.get('/trips/share/:token', getSharedTrip); // Public share endpoint

// --- PRIVATE EMERGENCY VAULT ---
router.get('/vault', authenticateToken, getVaultItems);
router.post('/vault', authenticateToken, createVaultItem);
router.delete('/vault/:id', authenticateToken, deleteVaultItem);

// --- ADMIN & MODERATION ---
router.get(
  '/admin/overview',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminOverview
);
router.post(
  '/admin/incidents/:id/review',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  reviewIncident
);
router.post(
  '/admin/fare-reports/:id/review',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  reviewFareReport
);

export default router;
