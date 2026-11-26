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
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  getUserDashboardData,
  getSavedDestinations,
  createSavedDestination,
  deleteSavedDestination,
  getNotifications,
  markNotificationRead,
  deleteAccount,
} from '../controllers/userController.js';
import {
  getCommunityPosts,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost,
  reportCommunityPost,
  likeCommunityPost,
  addPostComment,
  getTravelBuddies,
  createTravelBuddy,
} from '../controllers/communityController.js';
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
  verifyIncidentCommunity,
  updateIncidentStatus,
  getScams,
  createScam,
  voteScam,
} from '../controllers/incidentController.js';
import {
  getPriceRecords,
  submitPriceRecord,
  adminUpdatePrice,
  adminDeletePrice,
} from '../controllers/priceController.js';
import {
  calculateRoutePricing,
  reportRouteOvercharge,
} from '../controllers/routePricingController.js';
import {
  getNearbySafetyAlerts,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../controllers/notificationController.js';
import {
  getCities,
  getCity,
  getNearbyServices,
  getNearbyPlacesHandler,
  getEmergencyShortcutsHandler,
  getMultimodalFaresHandler,
  planCompleteRouteHandler,
  autocompletePlacesHandler,
  geocodeLocationHandler,
  reverseGeocodeHandler,
  savePlaceHandler,
  getSavedPlacesHandler,
  deleteSavedPlaceHandler,
  saveRouteHandler,
  getSavedRoutesHandler,
  deleteSavedRouteHandler,
  getMapData,
  searchDestinationsHandler,
  getServiceReviewsHandler,
  createServiceReviewHandler,
  verifyLocalServiceHandler,
  createLocalServiceHandler,
} from '../controllers/servicesController.js';
import {
  getRoadCrowdReports,
  createRoadCrowdReport,
  verifyRoadCrowdReport,
  deleteRoadCrowdReport,
} from '../controllers/roadCrowdController.js';
import {
  getEmergencyInfo,
  triggerSosLog,
  getEmergencyHistory,
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../controllers/emergencyController.js';
import {
  getRiskAlerts,
  createRiskAlert,
  verifyRiskAlert,
  deleteRiskAlert,
} from '../controllers/riskAlertController.js';
import { chatGuardian, getAiHistory, clearAiHistory } from '../controllers/aiController.js';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';
import {
  getBuddyPlans,
  createBuddyPlan,
  updateBuddyPlanStatus,
  cancelBuddyPlan,
  getMyBuddyPlans,
  sendBuddyConnection,
  acceptBuddyConnection,
  rejectBuddyConnection,
  getMyConnections,
  getConnectionMessages,
  sendConnectionMessage,
  submitBuddyFeedback,
  getTravelGroups,
  createTravelGroup,
  joinTravelGroup,
  leaveTravelGroup,
  updateGroupNotes,
  getGroupMessages,
  sendGroupMessage,
  blockSafetyUser,
  getBlockedSafetyUsers,
  unblockSafetyUser,
  reportSafetyUser,
} from '../controllers/buddyController.js';
import {
  getUserTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  generateSmartItinerary,
  getSharedTrip,
  getVaultItems,
  createVaultItem,
  deleteVaultItem,
} from '../controllers/tripController.js';
import {
  getVaultDocuments,
  uploadVaultDocument,
  downloadVaultDocument,
  deleteVaultDocument,
} from '../controllers/vaultController.js';
import {
  getLostFoundItems,
  createLostFoundItem,
  updateLostFoundStatus,
  moderateLostFoundItem,
  inquireLostFoundItem,
  getLostFoundInquiries,
  deleteLostFoundItem,
} from '../controllers/lostFoundController.js';
import {
  uploadProfileMiddleware,
  uploadCommunityMiddleware,
  uploadLostFoundMiddleware,
  uploadVaultDocumentMiddleware,
} from '../services/uploadService.js';
import {
  uploadProfileImage,
  deleteProfileImage,
  uploadCommunityImages,
  adminDeleteImage,
} from '../controllers/uploadController.js';
import {
  getModeratorDashboard,
  getModeratorReports,
  moderateReport,
  getModeratorCommunity,
  hidePost,
  escalatePost,
  getModeratorPrices,
  moderatePrice,
  getModeratorComplaints,
  getModeratorHistory,
  getModeratorProfile,
} from '../controllers/moderationController.js';
import {
  getAdminModerators,
  promoteUserToModerator,
  revokeModerator,
  getAdminImages,
} from '../controllers/adminController.js';
import {
  getAdminOverview,
  getAdminUsers,
  updateUserStatus,
  updateUserRole,
  getAdminIncidents,
  reviewIncident,
  getAdminPrices,
  createCityPrice,
  updateCityPrice,
  deleteCityPrice,
  getAdminDestinations,
  updateDestination,
  getAdminCommunityPosts,
  deleteCommunityPost as adminDeleteCommunityPost,
  getAdminAnalytics,
  getAdminAuditLogs,
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
router.get('/auth/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  });
});
router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.post('/auth/google', authLimiter, googleAuth);
router.post('/auth/forgot-password', authLimiter, forgotPassword);
router.post('/auth/reset-password', authLimiter, resetPassword);
router.get('/auth/me', authenticateToken, getProfile);

// --- USER PROFILE & PERSONAL DASHBOARD ---
router.get('/user/profile', authenticateToken, getUserProfile);
router.put('/user/profile', authenticateToken, updateUserProfile);
router.put('/user/change-password', authenticateToken, changeUserPassword);
router.get('/user/dashboard-data', authenticateToken, getUserDashboardData);
router.get('/user/saved-destinations', authenticateToken, getSavedDestinations);
router.post('/user/saved-destinations', authenticateToken, createSavedDestination);
router.delete('/user/saved-destinations/:id', authenticateToken, deleteSavedDestination);
router.get('/user/notifications', authenticateToken, getNotifications);
router.put('/user/notifications/:id/read', authenticateToken, markNotificationRead);
router.delete('/user/account', authenticateToken, deleteAccount);

// --- TRAVEL COMMUNITY & BUDDY FINDER ---
router.get('/community/posts', getCommunityPosts);
router.post('/community/posts', authenticateToken, createCommunityPost);
router.put('/community/posts/:id', authenticateToken, updateCommunityPost);
router.delete('/community/posts/:id', authenticateToken, deleteCommunityPost);
router.post('/community/posts/:id/report', authenticateToken, reportCommunityPost);
router.post('/community/posts/:id/like', likeCommunityPost);
router.post('/community/posts/:id/comment', authenticateToken, addPostComment);
router.get('/community/buddies', getTravelBuddies);
router.post('/community/buddies', authenticateToken, createTravelBuddy);

// --- TRAVEL BUDDY (Full partner matching system) ---
router.get('/buddy/plans', optionalAuth, getBuddyPlans);
router.post('/buddy/plans', authenticateToken, createBuddyPlan);
router.put('/buddy/plans/:id/status', authenticateToken, updateBuddyPlanStatus);
router.put('/buddy/plans/:id/cancel', authenticateToken, cancelBuddyPlan);
router.get('/buddy/my-plans', authenticateToken, getMyBuddyPlans);
router.post('/buddy/connect', authenticateToken, sendBuddyConnection);
router.put('/buddy/connections/:id/accept', authenticateToken, acceptBuddyConnection);
router.put('/buddy/connections/:id/reject', authenticateToken, rejectBuddyConnection);
router.post('/buddy/connections/:id/feedback', authenticateToken, submitBuddyFeedback);
router.get('/buddy/connections', authenticateToken, getMyConnections);
router.get('/buddy/connections/:id/messages', authenticateToken, getConnectionMessages);
router.post('/buddy/connections/:id/messages', authenticateToken, sendConnectionMessage);

// --- GROUP TRAVEL & SAFETY BLOCKS ---
router.get('/buddy/groups', optionalAuth, getTravelGroups);
router.post('/buddy/groups', authenticateToken, createTravelGroup);
router.post('/buddy/groups/:id/join', authenticateToken, joinTravelGroup);
router.post('/buddy/groups/:id/leave', authenticateToken, leaveTravelGroup);
router.put('/buddy/groups/:id/notes', authenticateToken, updateGroupNotes);
router.get('/buddy/groups/:id/messages', authenticateToken, getGroupMessages);
router.post('/buddy/groups/:id/messages', authenticateToken, sendGroupMessage);
router.get('/buddy/safety/blocks', authenticateToken, getBlockedSafetyUsers);
router.post('/buddy/safety/blocks', authenticateToken, blockSafetyUser);
router.delete('/buddy/safety/blocks/:blockedUserId', authenticateToken, unblockSafetyUser);
router.post('/buddy/safety/report', authenticateToken, reportSafetyUser);

// --- GEOGRAPHY & CITIES ---
router.get('/cities', getCities);
router.get('/cities/:id', getCity);
router.get('/destinations/search', searchDestinationsHandler);

// --- MAP & SERVICES (Coordinate validated) ---
router.get('/map/data', getMapData);
router.get('/map/nearby', validateCoordinatesMiddleware, getNearbyServices);
router.get('/services/nearby', validateCoordinatesMiddleware, getNearbyServices);
router.get('/services/:id/reviews', getServiceReviewsHandler);
router.post('/services/:id/reviews', authenticateToken, createServiceReviewHandler);
router.put('/admin/services/:id/verify', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), verifyLocalServiceHandler);
router.post('/admin/services', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), createLocalServiceHandler);

// --- CROWD & ROAD INTELLIGENCE ---
router.get('/road-crowd', getRoadCrowdReports);
router.post('/road-crowd', authenticateToken, createRoadCrowdReport);
router.put('/road-crowd/:id/verify', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), verifyRoadCrowdReport);
router.delete('/road-crowd/:id', authenticateToken, deleteRoadCrowdReport);
router.get('/places/nearby', validateCoordinatesMiddleware, getNearbyPlacesHandler);
router.get('/places/emergency-shortcuts', validateCoordinatesMiddleware, getEmergencyShortcutsHandler);
router.get('/places/autocomplete', autocompletePlacesHandler);
router.get('/places/geocode', geocodeLocationHandler);
router.get('/places/reverse-geocode', validateCoordinatesMiddleware, reverseGeocodeHandler);
router.post('/routes/plan', planCompleteRouteHandler);
router.post('/routes/multimodal-fares', getMultimodalFaresHandler);
router.post('/user/saved-places', authenticateToken, savePlaceHandler);
router.get('/user/saved-places', authenticateToken, getSavedPlacesHandler);
router.delete('/user/saved-places/:id', authenticateToken, deleteSavedPlaceHandler);
router.post('/user/saved-routes', authenticateToken, saveRouteHandler);
router.get('/user/saved-routes', authenticateToken, getSavedRoutesHandler);
router.delete('/user/saved-routes/:id', authenticateToken, deleteSavedRouteHandler);

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

// --- REAL-TIME SCAM & SAFETY INCIDENT REPORTING ---
router.get('/incidents', getIncidents);
router.post('/incidents', optionalAuth, createIncident);
router.post('/incidents/:id/confirm', optionalAuth, verifyIncidentCommunity);
router.post('/incidents/:id/verify', optionalAuth, verifyIncidentCommunity);
router.put('/admin/incidents/:id/status', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), updateIncidentStatus);
router.patch('/admin/incidents/:id', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), updateIncidentStatus);

// --- CITY-WISE LOCAL PRICE DATABASE (Food, Hotels, Activities, etc.) ---
router.get('/prices', getPriceRecords);
router.post('/prices', optionalAuth, submitPriceRecord);
router.put('/admin/prices/:id', authenticateToken, requireRole(['ADMIN']), adminUpdatePrice);
router.delete('/admin/prices/:id', authenticateToken, requireRole(['ADMIN']), adminDeletePrice);

// --- ROUTE-WISE PRICE INTELLIGENCE MODULE ---
router.post('/routes/pricing', calculateRoutePricing);
router.post('/routes/report-overcharge', optionalAuth, reportRouteOvercharge);

// --- SAFETY ALERT NOTIFICATIONS & PREFERENCES ---
router.get('/notifications/nearby-alerts', optionalAuth, getNearbySafetyAlerts);
router.get('/user/notification-preferences', optionalAuth, getNotificationPreferences);
router.put('/user/notification-preferences', authenticateToken, updateNotificationPreferences);

// --- SCAM INTELLIGENCE ---
router.get('/scams', getScams);
router.post('/scams', optionalAuth, createScam);
router.post('/scams/:id/vote', voteScam);

// --- LIVE TRAVEL RISK ALERTS ---
router.get('/risk-alerts', optionalAuth, getRiskAlerts);
router.post('/risk-alerts', authenticateToken, createRiskAlert);
router.put('/risk-alerts/:id/verify', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), verifyRiskAlert);
router.delete('/risk-alerts/:id', authenticateToken, deleteRiskAlert);

// --- EMERGENCY & SOS (Rate-limited with priority logging) ---
router.get('/emergency/info', validateCoordinatesMiddleware, getEmergencyInfo);
router.post('/emergency/sos', emergencyLimiter, optionalAuth, triggerSosLog);
router.get('/emergency/history', authenticateToken, getEmergencyHistory);
router.get('/emergency/contacts', authenticateToken, getEmergencyContacts);
router.post('/emergency/contacts', authenticateToken, createEmergencyContact);
router.put('/emergency/contacts/:id', authenticateToken, updateEmergencyContact);
router.delete('/emergency/contacts/:id', authenticateToken, deleteEmergencyContact);

// --- AI TRAVEL GUARDIAN (Rate-limited to prevent token drainage) ---
router.post('/ai/chat', aiAssistantLimiter, optionalAuth, chatGuardian);
router.get('/ai/history', optionalAuth, getAiHistory);
router.delete('/ai/history', authenticateToken, clearAiHistory);

// --- TRIPS, SMART PLANNER & SHARING ---
router.post('/trips/generate', optionalAuth, generateSmartItinerary);
router.get('/trips', authenticateToken, getUserTrips);
router.post('/trips', authenticateToken, createTrip);
router.put('/trips/:id', authenticateToken, updateTrip);
router.delete('/trips/:id', authenticateToken, deleteTrip);
router.get('/trips/share/:token', getSharedTrip); // Public share endpoint

// --- TRAVEL EXPENSE TRACKER ---
router.get('/expenses', authenticateToken, getExpenses);
router.post('/expenses', authenticateToken, createExpense);
router.put('/expenses/:id', authenticateToken, updateExpense);
router.delete('/expenses/:id', authenticateToken, deleteExpense);

// --- PRIVATE EMERGENCY & TRAVEL DOCUMENT VAULT ---
router.get('/vault', authenticateToken, getVaultItems);
router.post('/vault', authenticateToken, createVaultItem);
router.delete('/vault/:id', authenticateToken, deleteVaultItem);
router.get('/vault/documents', authenticateToken, getVaultDocuments);
router.post('/vault/documents', authenticateToken, uploadVaultDocumentMiddleware, uploadVaultDocument);
router.get('/vault/documents/:id/download', authenticateToken, downloadVaultDocument);
router.delete('/vault/documents/:id', authenticateToken, deleteVaultDocument);

// --- LOST & FOUND HUB (Privacy-safe relay inquiries) ---
router.get('/lost-found', optionalAuth, getLostFoundItems);
router.post('/lost-found', authenticateToken, uploadLostFoundMiddleware, createLostFoundItem);
router.put('/lost-found/:id/status', authenticateToken, updateLostFoundStatus);
router.put('/lost-found/:id/moderate', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), moderateLostFoundItem);
router.post('/lost-found/:id/inquire', authenticateToken, inquireLostFoundItem);
router.get('/lost-found/:id/inquiries', authenticateToken, getLostFoundInquiries);
router.delete('/lost-found/:id', authenticateToken, deleteLostFoundItem);

// --- DEDICATED ADMIN DASHBOARD MODULES (Restricted to ADMIN & MODERATOR) ---
router.get(
  '/admin/overview',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminOverview
);
router.get(
  '/admin/users',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminUsers
);
router.put(
  '/admin/users/:id/status',
  authenticateToken,
  requireRole(['ADMIN']),
  updateUserStatus
);
router.patch(
  '/admin/users/:id/status',
  authenticateToken,
  requireRole(['ADMIN']),
  updateUserStatus
);
router.put(
  '/admin/users/:id/role',
  authenticateToken,
  requireRole(['ADMIN']),
  updateUserRole
);
router.get(
  '/admin/incidents',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminIncidents
);
router.post(
  '/admin/incidents/:id/review',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  reviewIncident
);
router.get(
  '/admin/prices',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminPrices
);
router.post(
  '/admin/prices',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  createCityPrice
);
router.put(
  '/admin/prices/:id',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  updateCityPrice
);
router.delete(
  '/admin/prices/:id',
  authenticateToken,
  requireRole(['ADMIN']),
  deleteCityPrice
);
router.get(
  '/admin/destinations',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminDestinations
);
router.put(
  '/admin/destinations/:id',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  updateDestination
);
router.get(
  '/admin/community/posts',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminCommunityPosts
);
router.delete(
  '/admin/community/posts/:id',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  adminDeleteCommunityPost
);
router.get(
  '/admin/analytics',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminAnalytics
);
router.get(
  '/admin/audit-logs',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  getAdminAuditLogs
);
router.post(
  '/admin/fare-reports/:id/review',
  authenticateToken,
  requireRole(['ADMIN', 'MODERATOR']),
  reviewFareReport
);

// ==========================================
// UPLOAD ROUTES (Profile & Multi-Image Community)
// ==========================================
router.post('/upload/profile', authenticateToken, uploadProfileMiddleware, uploadProfileImage);
router.delete('/upload/profile', authenticateToken, deleteProfileImage);
router.post('/upload/community', authenticateToken, uploadCommunityMiddleware, uploadCommunityImages);
router.delete('/upload/image/:id', authenticateToken, requireRole(['ADMIN', 'MODERATOR']), adminDeleteImage);

// ==========================================
// MODERATOR PORTAL ROUTES
// ==========================================
router.get('/moderator/dashboard', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), getModeratorDashboard);
router.get('/moderator/reports', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), getModeratorReports);
router.post('/moderator/reports/:id/action', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), moderateReport);
router.get('/moderator/community', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), getModeratorCommunity);
router.post('/moderator/posts/:id/hide', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), hidePost);
router.post('/moderator/posts/:id/escalate', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), escalatePost);
router.get('/moderator/prices', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), getModeratorPrices);
router.post('/moderator/prices/:id/action', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), moderatePrice);
router.get('/moderator/complaints', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), getModeratorComplaints);
router.get('/moderator/history', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), getModeratorHistory);
router.get('/moderator/profile', authenticateToken, requireRole(['MODERATOR', 'ADMIN']), getModeratorProfile);

// ==========================================
// ADMIN MODERATOR APPOINTMENT & IMAGE MGMT
// ==========================================
router.get('/admin/moderators', authenticateToken, requireRole(['ADMIN']), getAdminModerators);
router.post('/admin/users/:id/promote', authenticateToken, requireRole(['ADMIN']), promoteUserToModerator);
router.post('/admin/users/:id/demote', authenticateToken, requireRole(['ADMIN']), revokeModerator);
router.get('/admin/images', authenticateToken, requireRole(['ADMIN']), getAdminImages);

export default router;
