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

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  rainChance: number;
  humidity: number;
  windKmh: number;
  alertMessage?: string;
  severity?: string;
}

export interface Trip {
  id: string;
  title: string;
  destinationCity: string;
  currentLocation?: string;
  startDate: string;
  endDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  status: string;
  shareToken: string;
  lastKnownEta?: string;
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

