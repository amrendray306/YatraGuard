export type Role = 'TRAVELER' | 'MODERATOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: Role;
  avatarUrl?: string | null;
  authProvider?: string;
  location?: string;
  aboutMe?: string;
  travelPreferences?: string;
  reputationScore?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt?: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  defaultSafetyScore: number;
  tier?: string;
  description?: string;
}

export interface LocationService {
  id: string;
  name: string;
  category: 'HOSPITAL' | 'POLICE' | 'PHARMACY' | 'TRANSPORT' | 'ATM' | 'FUEL' | 'HOTEL' | 'RESTAURANT' | 'TOURIST_INFO';
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  rating?: number;
  openStatus: string;
  isVerified: boolean;
  cityId: string;
  distanceKm?: number;
  distanceLabel?: string;
}

export interface IncidentReport {
  id: string;
  category: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  cityId: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'COMMUNITY_CONFIRMED' | 'ADMIN_VERIFIED' | 'REJECTED' | 'RESOLVED' | 'EXPIRED' | 'ESCALATED';
  confidenceScore: number;
  confirmations: number;
  evidenceUrl?: string;
  reportedAt: string;
  reporter?: {
    name: string;
    role: string;
  };
}

export interface ScamReport {
  id: string;
  category: string;
  title: string;
  locationName: string;
  lat: number;
  lng: number;
  address: string;
  cityId: string;
  description: string;
  warningSigns: string;
  typicalPattern: string;
  reportCount: number;
  confidence: number;
  lastReportedAt: string;
}

export interface SafetyZone {
  id: string;
  name: string;
  cityId: string;
  lat: number;
  lng: number;
  radiusKm: number;
  riskTier: 'HIGH_RISK' | 'MODERATE' | 'ACCEPTABLE' | 'GOOD' | 'VERY_GOOD';
  score: number;
  reason: string;
  timeHazard?: string;
}

export interface SafetyScoreFactor {
  type: 'positive' | 'warning' | 'negative' | 'info';
  category?: 'POLICE' | 'MEDICAL' | 'INCIDENTS' | 'SCAMS' | 'ZONES' | 'TIME' | 'WEATHER';
  text: string;
  impact?: number;
}

export interface SafetyScoreData {
  score: number;
  tier: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Insufficient Data' | 'Acceptable' | 'Good' | 'Very Good';
  tierColor: string;
  label: string;
  timeContext?: {
    hour: number;
    isNightTime: boolean;
    timeLabel: string;
  };
  factors: SafetyScoreFactor[];
  nearestServices: {
    hospital?: { name: string; distance: string; distanceKm: number; phone?: string | null };
    police?: { name: string; distance: string; distanceKm: number; phone?: string | null };
    pharmacy?: { name: string; distance: string; distanceKm: number; phone?: string | null };
    transport?: { name: string; distance: string; distanceKm: number; phone?: string | null };
  };
  incidentCountNearby: number;
  scamCountNearby: number;
  activeZoneName?: string;
  disclaimer: string;
}

export interface RouteOption {
  id: 'fastest' | 'safest' | 'balanced';
  title: string;
  badge: string;
  isRecommended?: boolean;
  distanceKm: number;
  distanceLabel: string;
  durationMinutes: number;
  durationLabel: string;
  riskTier: 'Low' | 'Moderate' | 'Elevated';
  riskScore: number;
  color: string;
  description: string;
  highlights: string[];
  hazards: string[];
  waypoints: Array<{ lat: number; lng: number; name: string }>;
}

export interface RouteEvaluationResult {
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  routes: RouteOption[];
  disclaimer: string;
  recommendationReason: string;
}

export interface TravelCost {
  id: string;
  cityId: string;
  category: string;
  name: string;
  estimatedMin: number;
  estimatedMax: number;
  localReportedMin: number;
  localReportedMax: number;
  unit: string;
  notes?: string;
  isOverchargingProne: boolean;
}

export interface CrowdLevel {
  id: string;
  cityId: string;
  attractionName: string;
  currentLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  bestVisitingHours: string;
  peakHours: string;
  crowdEstimateLabel: string;
}

export interface DailyForecastItem {
  date: string;
  dayLabel: string;
  condition: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainChance: number;
  windMaxKmh: number;
  uvIndexMax?: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface WeatherData {
  city: string;
  cityId?: string;
  temp: number;
  feelsLike?: number;
  condition: string;
  weatherCode?: number;
  rainChance: number;
  humidity: number;
  windKmh: number;
  uvIndexMax?: number;
  alertMessage?: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | string;
  sourceName?: string;
  sourceType?: 'LIVE_OPEN_METEO' | 'DB_CACHE' | 'UNAVAILABLE_FALLBACK';
  isCached?: boolean;
  updatedAt?: string;
  lat?: number;
  lng?: number;
  forecast?: DailyForecastItem[];
}

export interface TravelRiskAlert {
  id: string;
  cityId?: string | null;
  city?: { id: string; name: string; state: string; lat?: number; lng?: number } | null;
  destinationName: string;
  lat?: number | null;
  lng?: number | null;
  category:
    | 'HEAVY_RAINFALL'
    | 'FLOOD'
    | 'LANDSLIDE'
    | 'SNOWFALL'
    | 'ROAD_CLOSURE'
    | 'ACCIDENT'
    | 'OVERCROWDING'
    | 'UNSAFE_AREA'
    | 'SCAM_WARNING';
  title: string;
  description: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  sourceType: 'OFFICIAL' | 'MODERATOR_VERIFIED' | 'COMMUNITY';
  sourceName?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  expiresAt?: string | null;
  createdById?: string | null;
  distanceKm?: number | null;
  isOfficial?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
  canShareLocation: boolean;
  createdAt: string;
}

export interface EmergencyLogItem {
  id: string;
  emergencyType: string;
  lat: number;
  lng: number;
  address?: string | null;
  messageText?: string | null;
  sharedWithCount: number;
  status: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  title: string;
  originCity?: string | null;
  destinationCity: string;
  currentLocation?: string | null;
  startDate: string;
  endDate: string;
  travelersCount?: number;
  totalBudget?: number | null;
  transportPref?: string | null;
  interests?: string | null;
  itineraryData?: any;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: string;
  shareToken: string;
  lastKnownEta?: string | null;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'TRANSPORTATION'
  | 'FOOD'
  | 'ACCOMMODATION'
  | 'SHOPPING'
  | 'ACTIVITIES'
  | 'EMERGENCY'
  | 'OTHER';

export interface TripExpense {
  id: string;
  tripId?: string | null;
  trip?: {
    id: string;
    title: string;
    destinationCity: string;
    totalBudget?: number | null;
  } | null;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  id: string;
  title: string;
  category: string;
  referenceData: string;
  notes?: string;
  createdAt: string;
}

export type VaultDocType =
  | 'TICKET'
  | 'HOTEL'
  | 'ID_REF'
  | 'PERMIT'
  | 'INSURANCE'
  | 'RESERVATION';

export interface DocumentRecord {
  id: string;
  tripId?: string | null;
  trip?: { id: string; title: string; destinationCity: string } | null;
  title: string;
  docType: VaultDocType;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  notes?: string | null;
  createdAt: string;
}

export type LostFoundCategory =
  | 'PHONE'
  | 'WALLET_ID'
  | 'LUGGAGE'
  | 'DOCUMENTS'
  | 'JEWELRY'
  | 'KEYS'
  | 'OTHER';

export interface LostFoundItem {
  id: string;
  userId: string;
  cityId?: string | null;
  city?: { id: string; name: string; state: string } | null;
  type: 'LOST' | 'FOUND';
  title: string;
  category: LostFoundCategory;
  description: string;
  locationName: string;
  lat?: number | null;
  lng?: number | null;
  eventDate: string;
  imageUrl?: string | null;
  status: 'OPEN' | 'MATCHED' | 'RESOLVED';
  moderationStatus: 'APPROVED' | 'PENDING' | 'HIDDEN';
  user?: { id: string; name: string; avatarUrl?: string | null };
  _count?: { inquiries: number };
  createdAt: string;
  updatedAt: string;
}

export interface LostFoundInquiry {
  id: string;
  itemId: string;
  senderId: string;
  sender?: { id: string; name: string; avatarUrl?: string | null };
  message: string;
  contactHint?: string | null;
  createdAt: string;
}

export interface ServiceReview {
  id: string;
  serviceId: string;
  userId: string;
  user?: { id: string; name: string; avatarUrl?: string | null };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface RoadCrowdReport {
  id: string;
  userId?: string | null;
  user?: { id: string; name: string } | null;
  cityId?: string | null;
  city?: { id: string; name: string; state: string } | null;
  locationName: string;
  lat: number;
  lng: number;
  category: 'ROAD_CONDITION' | 'TRAFFIC' | 'CROWD' | 'ROAD_CLOSURE' | 'CONSTRUCTION' | 'ACCIDENT';
  difficulty: 'EASY' | 'MODERATE' | 'DIFFICULT' | 'BLOCKED';
  description: string;
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REJECTED';
  expiresAt?: string | null;
  distanceKm?: number | null;
  createdAt: string;
}

export interface TravelGroup {
  id: string;
  creatorId: string;
  creator?: { id: string; name: string; avatarUrl?: string | null };
  title: string;
  destinationCity: string;
  originCity?: string | null;
  startDate: string;
  endDate: string;
  maxMembers: number;
  budgetNote?: string | null;
  itineraryNotes?: string | null;
  sharedExpenseNote?: string | null;
  status: string;
  members?: Array<{ id: string; userId: string; role: string; user?: { id: string; name: string; avatarUrl?: string | null } }>;
  _count?: { members: number; messages: number };
  createdAt: string;
}

// --- LOCAL TRANSPORTATION FARE INTELLIGENCE TYPES ---
export interface TransportationMode {
  id: string;
  displayName: string;
  vehicleType: string;
  isMetered: boolean;
  description?: string;
}

export interface TransitOptionEstimate {
  transportModeId: string;
  displayName: string;
  vehicleType: string;
  isMetered: boolean;
  minFare: number;
  avgFare: number;
  maxFare: number;
  estimatedDurationMin: number;
  perKmRate: number;
  baseFare: number;
  baseDistanceKm: number;
  nightSurchargeApplied: boolean;
  nightSurchargePct: number;
  hillTerrainSurchargeApplied: boolean;
  hillTerrainSurchargePct: number;
  sourceType: string;
  officialCircularRef?: string | null;
  reliabilityScore: number;
  notes?: string | null;
  communityReportCount: number;
  communityAvgPaid?: number | null;
}

export interface MultiModalFareResult {
  city: {
    id: string;
    name: string;
    state: string;
    tier: string;
  };
  tripDetails: {
    origin: string;
    destination: string;
    distanceKm: number;
    travelHour: number;
    isNightTime: boolean;
    isMountainTerrain: boolean;
  };
  options: TransitOptionEstimate[];
  timestamp: string;
}

export interface OverchargeAuditResult {
  verdict: 'FAIR' | 'SLIGHTLY_ELEVATED' | 'POTENTIAL_OVERCHARGE' | 'SEVERE_OVERCHARGE';
  isOvercharge: boolean;
  quotedFare: number;
  expectedFare: {
    min: number;
    avg: number;
    max: number;
  };
  differenceAmount: number;
  differencePercentage: number;
  transportMode: string;
  confidenceScore: number;
  warningMessage: string;
  recommendedAction: string;
  officialReference?: string | null;
  disclaimer: string;
}

export interface CommunityFareReport {
  id: string;
  cityId: string;
  city?: City;
  transportModeId: string;
  transportMode?: TransportationMode;
  originName: string;
  destinationName: string;
  distanceKm: number;
  actualFarePaid: number;
  quotedFare?: number;
  wasOvercharged: boolean;
  verificationStatus: string;
  reliabilityWeight: number;
  comments?: string;
  tripTime: string;
  createdAt: string;
}

export interface EnrichedNearbyPlace {
  id: string;
  placeId?: string;
  name: string;
  category: string;
  subCategory?: string | null;
  lat: number;
  lng: number;
  address: string;
  phone?: string | null;
  rating?: number | null;
  openStatus: string;
  openingHours?: string | null;
  isOpenNow: boolean | null;
  is24Hours: boolean;
  isVerified: boolean;
  cityId?: string;
  cityName?: string;
  straightLineDistanceKm: number;
  straightLineLabel: string;
  roadDistanceKm: number;
  roadDistanceLabel: string;
  distanceSource: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN';
  estimatedDrivingTimeMin: number;
  estimatedWalkingTimeMin: number;
  estimatedCyclingTimeMin: number;
  source: 'OFFICIAL_REGISTRY' | 'GOOGLE_PLACES' | 'COMMUNITY_VERIFIED';
  website?: string | null;
  googleMapsUri?: string | null;
  priceLevel?: string | null;
}

export interface MultimodalFareBreakdown {
  baseFare: number;
  distanceCharge: number;
  waitingCharge: number;
  nightCharge: number;
  hillSurcharge: number;
  tollCharge: number;
  luggageCharge: number;
}

export interface MultimodalFareOption {
  modeId: string;
  name: string;
  vehicleType: string;
  durationMin: number;
  distanceKm: number;
  fareMin: number;
  fareAvg: number;
  fareMax: number;
  fareLabel: string;
  priceType:
    | 'OFFICIAL_GOVT'
    | 'LIVE_PROVIDER'
    | 'ESTIMATED'
    | 'COMMUNITY_VERIFIED'
    | 'COMMUNITY_REPORTED'
    | 'UNAVAILABLE';
  priceTypeLabel: string;
  description: string;
  conditions: string[];
  breakdown?: MultimodalFareBreakdown;
  isAvailable: boolean;
  circularRef?: string | null;
}

export interface DetailedRouteStep {
  instruction: string;
  maneuver: string;
  distanceMeters: number;
  distanceLabel: string;
  durationSeconds: number;
  durationLabel: string;
}

export interface ComputedRouteGeometry {
  id: string;
  summary: string;
  distanceKm: number;
  distanceLabel: string;
  durationMinutes: number;
  durationLabel: string;
  coordinates: [number, number][];
  steps: DetailedRouteStep[];
  tollInfo?: {
    hasTolls: boolean;
    estimatedAmount?: number;
    currency?: string;
    note?: string;
  };
  routingProvider: 'GOOGLE_ROUTES' | 'OSRM_ROAD' | 'ESTIMATED_TERRAIN';
  isEstimated: boolean;
  labels?: string[];
}

export interface PlaceAutocompleteSuggestion {
  id: string;
  placeId?: string;
  name: string;
  secondaryText: string;
  fullText: string;
  lat?: number;
  lng?: number;
  category?: string;
  source: 'LOCAL_REGISTRY' | 'GOOGLE_PLACES' | 'NOMINATIM';
}

export interface SavedPlaceItem {
  id: string;
  placeId?: string | null;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface SavedRouteItem {
  id: string;
  originName: string;
  destName: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  distanceKm: number;
  travelMode: string;
  estimatedMinutes: number;
  createdAt: string;
}

