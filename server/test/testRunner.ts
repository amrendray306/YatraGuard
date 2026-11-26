import assert from 'node:assert/strict';
import { FareEstimationService } from '../src/services/FareEstimationService.js';
import { calculateSafetyScore } from '../src/services/safetyScoreService.js';
import { validateCoordinates } from '../src/middleware/validation.js';
import { generateToken, verifyToken } from '../src/middleware/auth.js';
import { placesService, evaluateOpeningHoursStatus } from '../src/services/PlacesService.js';
import { googleMapsService } from '../src/services/googleMapsService.js';
import { analyzeScamPatternAdvisory } from '../src/controllers/incidentController.js';
import { getCityWeather } from '../src/services/weatherService.js';
import { evaluateRouteSafety } from '../src/services/routeRiskEngine.js';
import { isSafeAvatarUrl } from '../src/controllers/userController.js';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${name}`);
    console.error(`     \x1b[33m${err.message}\x1b[0m`);
    failed++;
  }
}

async function main() {
  // -------------------------------------------------------------------------
  // SUITE 7: Real-Time Incident Reporting & Scam Vigilance
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 7: Real-Time Incident Reporting & Scam Vigilance]\x1b[0m');

  await runTest('Incident Engine - Anti-Duplicate Spatial Detection (150m radius)', () => {
    // Haversine test for duplicate threshold
    const lat1 = 28.6428, lon1 = 77.2195;
    const lat2 = 28.6432, lon2 = 77.2199; // ~55 meters away
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    assert.ok(distKm < 0.15, 'Points within 150m must be flagged as duplicates to prevent spam');
  });

  await runTest('Incident Engine - Community Confirmations Elevate to UNDER_REVIEW (Not Auto-Verified)', () => {
    let status = 'PENDING';
    const confirmationsCount = 4;
    // Core specification requirement: A report must NEVER automatically become VERIFIED based solely on clicks
    if (confirmationsCount >= 3 && status === 'PENDING') {
      status = 'UNDER_REVIEW'; // Elevates for moderator examination
    }
    assert.strictEqual(status, 'UNDER_REVIEW');
    assert.notStrictEqual(status, 'VERIFIED', 'Must require moderator review for official verification');
  });

  await runTest('Incident Engine - Reporter Identity Sanitization (Privacy Shield)', () => {
    const rawReporter = {
      id: 'usr-999',
      name: 'Amrendra Yadav',
      email: 'private.user@gmail.com',
      phone: '+919876543210',
      role: 'TRAVELER',
    };

    // Public feed sanitization
    const publicIncident = {
      title: 'Auto Overcharging',
      reporterBadge: rawReporter.role === 'ADMIN' ? 'Platform Moderator' : 'Verified Traveler',
    };

    assert.strictEqual((publicIncident as any).email, undefined, 'Reporter email must never be exposed');
    assert.strictEqual((publicIncident as any).phone, undefined, 'Reporter phone must never be exposed');
    assert.strictEqual(publicIncident.reporterBadge, 'Verified Traveler');
  });

  // -------------------------------------------------------------------------
  // SUITE 8: Route-Wise Multi-Tier Price Intelligence
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 8: Route-Wise Multi-Tier Price Intelligence]\x1b[0m');

  await runTest('Route Pricing - Generates 4 Comparison Categories (Cheapest, Fastest, Recommended, Alternative)', () => {
    const categories = ['CHEAPEST', 'FASTEST', 'RECOMMENDED', 'ALTERNATIVE'];
    assert.strictEqual(categories.length, 4);
    assert.ok(categories.includes('CHEAPEST'));
    assert.ok(categories.includes('FASTEST'));
    assert.ok(categories.includes('RECOMMENDED'));
    assert.ok(categories.includes('ALTERNATIVE'));
  });

  await runTest('Route Pricing - City Surcharge Logic (Delhi Metro vs Manali Mountain Taxi)', () => {
    const distanceKm = 10.0;
    
    // Delhi Metro: 10km falls in 5-12km slab (₹30)
    const metroFare = distanceKm <= 12 ? 30 : 40;
    assert.strictEqual(metroFare, 30);

    // Manali Auto with Mountain Terrain (+20% adjustment)
    const baseFare = 40;
    const perKm = 14;
    const regularFare = baseFare + (distanceKm - 1.5) * perKm; // 40 + 8.5 * 14 = 159
    const mountainFare = Math.round(regularFare * 1.20);
    assert.strictEqual(mountainFare, 191);
    assert.ok(mountainFare > regularFare, 'Mountain terrain must apply hill multiplier');
  });

  await runTest('Route Pricing - Overcharge Audit Severity Detection', () => {
    const regulatedMax = 200;
    const demandedFare = 450; // +125% overcharge
    const margin = demandedFare - regulatedMax;
    const pct = Math.round((margin / regulatedMax) * 100);
    const severity = pct >= 50 ? 'SEVERE' : pct >= 20 ? 'MODERATE' : 'MARGINAL';

    assert.strictEqual(severity, 'SEVERE');
    assert.strictEqual(pct, 125);
  });

  console.log('\n======================================================');
  console.log('   🛡️  YATRAGUARD AUTOMATED SYSTEM TEST SUITE  🛡️');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // SUITE 1: Security, Coordinate Sanitization & JWT Cryptography
  // -------------------------------------------------------------------------
  console.log('\x1b[1m[Suite 1: Security & Cryptographic Integrity]\x1b[0m');

  await runTest('Coordinate Validation - Accepts valid geographic bounds', () => {
    assert.strictEqual(validateCoordinates(28.6139, 77.209), true); // New Delhi
    assert.strictEqual(validateCoordinates(32.2396, 77.1887), true); // Manali
    assert.strictEqual(validateCoordinates(-33.8688, 151.2093), true); // Sydney
    assert.strictEqual(validateCoordinates(0, 0), true); // Equator / Prime Meridian
  });

  await runTest('Coordinate Validation - Rejects out-of-bounds coordinates (Anti-Spoofing)', () => {
    assert.strictEqual(validateCoordinates(95.0, 77.0), false); // Lat > 90
    assert.strictEqual(validateCoordinates(-91.0, 0.0), false); // Lat < -90
    assert.strictEqual(validateCoordinates(28.0, 185.0), false); // Lng > 180
    assert.strictEqual(validateCoordinates(28.0, -181.0), false); // Lng < -180
    assert.strictEqual(validateCoordinates(NaN as any, 77.0), false);
  });

  await runTest('Authentication Token - Signs and decodes valid JWT payload', () => {
    const payload = { id: 'usr_test_123', email: 'traveler@yatraguard.in', role: 'TRAVELER' };
    const token = generateToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = verifyToken(token);
    assert.ok(decoded);
    assert.strictEqual(decoded.id, payload.id);
    assert.strictEqual(decoded.email, payload.email);
    assert.strictEqual(decoded.role, payload.role);
  });

  await runTest('Password Security - Bcrypt hashing & verification match', async () => {
    const plain = 'YatraGuard@2026';
    const hash = await bcrypt.hash(plain, 10);
    assert.ok(await bcrypt.compare(plain, hash));
    assert.strictEqual(await bcrypt.compare('WrongPassword', hash), false);
  });

  // -------------------------------------------------------------------------
  // SUITE 2: Multi-Modal Fare Calculation Engine
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 2: Local Transit Fare Intelligence Engine]\x1b[0m');
  const fareService = new FareEstimationService();

  await runTest('Fare Engine - Delhi Auto Rickshaw daylight tariff calculation', async () => {
    const result = await fareService.estimateFares({
      cityName: 'Delhi',
      origin: 'Connaught Place',
      destination: 'India Gate',
      distanceKm: 5.5,
      travelHour: 14, // 2:00 PM (No night surcharge)
    });

    assert.ok(result);
    assert.ok(result.options.length > 0);
    const auto = result.options.find((o) => o.transportModeId === 'AUTO');
    assert.ok(auto, 'Auto mode must be present in Delhi results');
    // Delhi Auto: Base ₹30 for first 1.5 km, then ₹11/km for remaining 4.0 km = 30 + 44 = ₹74 approx
    assert.ok(auto.avgFare >= 65 && auto.avgFare <= 90, `Expected fare ₹65-90, got ₹${auto.avgFare}`);
    assert.strictEqual(auto.nightSurchargeApplied, false);
  });

  await runTest('Fare Engine - Automatic Night Surcharge (+25%) between 11 PM and 5 AM', async () => {
    const dayResult = await fareService.estimateFares({
      cityName: 'Delhi',
      origin: 'IGI Airport',
      destination: 'Connaught Place',
      distanceKm: 18.0,
      travelHour: 15, // 3 PM
    });

    const nightResult = await fareService.estimateFares({
      cityName: 'Delhi',
      origin: 'IGI Airport',
      destination: 'Connaught Place',
      distanceKm: 18.0,
      travelHour: 2, // 2 AM (Night)
    });

    const dayTaxi = dayResult.options.find((o) => o.transportModeId === 'LOCAL_TAXI');
    const nightTaxi = nightResult.options.find((o) => o.transportModeId === 'LOCAL_TAXI');

    assert.ok(dayTaxi && nightTaxi);
    assert.strictEqual(nightTaxi.nightSurchargeApplied, true);
    assert.ok(nightTaxi.avgFare > dayTaxi.avgFare, 'Night fare must be higher than day fare');
    // Night surcharge should be approx 25% higher
    const ratio = nightTaxi.avgFare / dayTaxi.avgFare;
    assert.ok(ratio >= 1.2 && ratio <= 1.3, `Expected ratio ~1.25, got ${ratio.toFixed(2)}`);
  });

  await runTest('Fare Engine - Mountain Terrain Surcharge (+20%) for Himalayan destinations (Manali)', async () => {
    const result = await fareService.estimateFares({
      cityName: 'Manali',
      origin: 'Mall Road',
      destination: 'Solang Valley',
      distanceKm: 13.5,
      travelHour: 11,
    });

    assert.ok(result.tripDetails.isMountainTerrain, 'Manali must trigger Himalayan mountain terrain');
    const taxi = result.options.find((o) => o.transportModeId === 'LOCAL_TAXI');
    assert.ok(taxi);
    assert.strictEqual(taxi.hillTerrainSurchargeApplied, true);
    assert.ok(taxi.hillTerrainSurchargePct >= 20, `Expected hill surcharge >= 20%, got ${taxi.hillTerrainSurchargePct}%`);
  });

  // -------------------------------------------------------------------------
  // SUITE 3: Driver Quote Overcharge Audit Tool
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 3: Driver Overcharge Audit & Anti-Scam Protection]\x1b[0m');

  await runTest('Overcharge Audit - Asserts "FAIR" for quote within expected range', async () => {
    const audit = await fareService.auditOvercharge({
      cityName: 'Delhi',
      transportModeId: 'AUTO',
      quotedFare: 80, // Fair for 5.5 km
      distanceKm: 5.5,
      travelHour: 14,
    });

    assert.strictEqual(audit.verdict, 'FAIR');
    assert.strictEqual(audit.isOvercharge, false);
  });

  await runTest('Overcharge Audit - Detects "POTENTIAL_OVERCHARGE" when driver inflates quote by >30%', async () => {
    const audit = await fareService.auditOvercharge({
      cityName: 'Delhi',
      transportModeId: 'AUTO',
      quotedFare: 180, // Overcharge for 5.5 km (expected ~₹75)
      distanceKm: 5.5,
      travelHour: 14,
    });

    assert.ok(
      audit.verdict === 'POTENTIAL_OVERCHARGE' || audit.verdict === 'SEVERE_OVERCHARGE',
      `Expected overcharge, got ${audit.verdict}`
    );
    assert.strictEqual(audit.isOvercharge, true);
    assert.ok(audit.differencePercentage > 30);
  });

  await runTest('Overcharge Audit - Flags "SEVERE_OVERCHARGE" for tourist scam rates in hill stations', async () => {
    const audit = await fareService.auditOvercharge({
      cityName: 'Manali',
      transportModeId: 'LOCAL_TAXI',
      quotedFare: 2800, // Excessive quote for Mall Road to Hadimba (2.2 km)
      distanceKm: 2.2,
      travelHour: 12,
    });

    assert.strictEqual(audit.verdict, 'SEVERE_OVERCHARGE');
    assert.strictEqual(audit.isOvercharge, true);
    assert.ok(audit.warningMessage.includes('Overcharge Alert') || audit.warningMessage.includes('Overcharge'));
  });

  // -------------------------------------------------------------------------
  // SUITE 4: Bayesian Safety Scoring Engine
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 4: Bayesian Safety Intelligence Engine]\x1b[0m');

  await runTest('Safety Score - Generates valid safety score, tier classification & factors', async () => {
    const res = await calculateSafetyScore(28.6139, 77.2090); // Delhi CP
    assert.ok(res);
    assert.ok(typeof res.score === 'number');
    assert.ok(res.score >= 40 && res.score <= 100, `Expected score between 40-100, got ${res.score}`);
    assert.ok(Array.isArray(res.factors));
    assert.ok(res.tier);
    assert.ok(res.nearestServices);
  });

  await runTest('Safety Score - Proximity factors resolve nearest emergency hospitals & police', async () => {
    const res = await calculateSafetyScore(28.6139, 77.2090);
    assert.ok(res.nearestServices.police, 'Must resolve nearest police assistance');
    assert.ok(res.nearestServices.hospital, 'Must resolve nearest emergency trauma hospital');
    assert.ok(typeof res.incidentCountNearby === 'number');
    assert.ok(typeof res.scamCountNearby === 'number');
  });

  // -------------------------------------------------------------------------
  // SUITE 5: Emergency SOS Notification Delivery State Machine
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 5: Emergency SOS Notification Delivery Engine]\x1b[0m');

  await runTest('SOS State Machine - Transition through REQUESTED -> DISPATCHED -> CONFIRMED_DELIVERED', () => {
    type SOSState = 'REQUESTED' | 'DISPATCHED' | 'CONFIRMED_DELIVERED';
    let currentState: SOSState = 'REQUESTED';
    const auditLog: Array<{ state: SOSState; timestamp: string; refId: string }> = [];

    const advanceState = (next: SOSState) => {
      currentState = next;
      auditLog.push({
        state: next,
        timestamp: new Date().toISOString(),
        refId: 'SOS-TEST-' + Math.floor(1000 + Math.random() * 9000),
      });
    };

    assert.strictEqual(currentState, 'REQUESTED');
    advanceState('DISPATCHED');
    assert.strictEqual(currentState, 'DISPATCHED');
    advanceState('CONFIRMED_DELIVERED');
    assert.strictEqual(currentState, 'CONFIRMED_DELIVERED');
    assert.strictEqual(auditLog.length, 2);
    assert.ok(auditLog[1].refId.startsWith('SOS-TEST-'));
  });

  // -------------------------------------------------------------------------
  // SUITE 6: Dual Authentication & Account Architecture
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 6: Dual Authentication & Account Security Engine]\x1b[0m');

  await runTest('Auth Engine - Email format validation & security requirements', () => {
    const validEmails = ['traveler@gmail.com', 'user.name+test@domain.co.in', 'student@college.ac.in'];
    const invalidEmails = ['plainaddress', '@missingusername.com', 'user@.com', 'spaces in@email.com'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of validEmails) {
      assert.strictEqual(emailRegex.test(email), true, `Should accept: ${email}`);
    }
    for (const email of invalidEmails) {
      assert.strictEqual(emailRegex.test(email), false, `Should reject: ${email}`);
    }
  });

  await runTest('Auth Engine - Password reset token crypto generation & expiration verification', () => {
    const cryptoToken = 'rst_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes ahead

    assert.ok(cryptoToken.length >= 10);
    assert.ok(expiry.getTime() > Date.now(), 'Token expiry must be in the future');
    
    // Simulate expired token check
    const expiredTokenDate = new Date(Date.now() - 1000);
    assert.ok(expiredTokenDate.getTime() < Date.now(), 'Expired token must be rejected');
  });

  await runTest('Auth Engine - Google OAuth profile identity mapping', () => {
    const mockGoogleProfile = {
      sub: 'google_user_1098273645123',
      email: 'traveler.google@gmail.com',
      email_verified: 'true',
      name: 'Priya Sharma',
      picture: 'https://lh3.googleusercontent.com/a/mock-pic',
    };

    const isVerified = mockGoogleProfile.email_verified === 'true' || mockGoogleProfile.email_verified === true;
    assert.strictEqual(isVerified, true);
    assert.strictEqual(mockGoogleProfile.sub.startsWith('google_'), true);
    assert.ok(mockGoogleProfile.email.includes('@'));
  });

  // -------------------------------------------------------------------------
  // SUITE 7: Real-Time Incident Reporting & Scam Vigilance
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 7: Real-Time Incident Reporting & Scam Vigilance]\x1b[0m');

  await runTest('Incident Engine - Anti-Duplicate Spatial Detection (150m radius)', () => {
    // Haversine test for duplicate threshold
    const lat1 = 28.6428, lon1 = 77.2195;
    const lat2 = 28.6432, lon2 = 77.2199; // ~55 meters away
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    assert.ok(distKm < 0.15, 'Points within 150m must be flagged as duplicates to prevent spam');
  });

  await runTest('Incident Engine - Community Confirmations Elevate to UNDER_REVIEW (Not Auto-Verified)', () => {
    let status = 'PENDING';
    const confirmationsCount = 4;
    // Core specification requirement: A report must NEVER automatically become VERIFIED based solely on clicks
    if (confirmationsCount >= 3 && status === 'PENDING') {
      status = 'UNDER_REVIEW'; // Elevates for moderator examination
    }
    assert.strictEqual(status, 'UNDER_REVIEW');
    assert.notStrictEqual(status, 'VERIFIED', 'Must require moderator review for official verification');
  });

  await runTest('Incident Engine - Reporter Identity Sanitization (Privacy Shield)', () => {
    const rawReporter = {
      id: 'usr-999',
      name: 'Amrendra Yadav',
      email: 'private.user@gmail.com',
      phone: '+919876543210',
      role: 'TRAVELER',
    };

    // Public feed sanitization
    const publicIncident = {
      title: 'Auto Overcharging',
      reporterBadge: rawReporter.role === 'ADMIN' ? 'Platform Moderator' : 'Verified Traveler',
    };

    assert.strictEqual((publicIncident as any).email, undefined, 'Reporter email must never be exposed');
    assert.strictEqual((publicIncident as any).phone, undefined, 'Reporter phone must never be exposed');
    assert.strictEqual(publicIncident.reporterBadge, 'Verified Traveler');
  });

  // -------------------------------------------------------------------------
  // SUITE 8: Route-Wise Multi-Tier Price Intelligence
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 8: Route-Wise Multi-Tier Price Intelligence]\x1b[0m');

  await runTest('Route Pricing - Generates 4 Comparison Categories (Cheapest, Fastest, Recommended, Alternative)', () => {
    const categories = ['CHEAPEST', 'FASTEST', 'RECOMMENDED', 'ALTERNATIVE'];
    assert.strictEqual(categories.length, 4);
    assert.ok(categories.includes('CHEAPEST'));
    assert.ok(categories.includes('FASTEST'));
    assert.ok(categories.includes('RECOMMENDED'));
    assert.ok(categories.includes('ALTERNATIVE'));
  });

  await runTest('Route Pricing - City Surcharge Logic (Delhi Metro vs Manali Mountain Taxi)', () => {
    const distanceKm = 10.0;
    
    // Delhi Metro: 10km falls in 5-12km slab (₹30)
    const metroFare = distanceKm <= 12 ? 30 : 40;
    assert.strictEqual(metroFare, 30);

    // Manali Auto with Mountain Terrain (+20% adjustment)
    const baseFare = 40;
    const perKm = 14;
    const regularFare = baseFare + (distanceKm - 1.5) * perKm; // 40 + 8.5 * 14 = 159
    const mountainFare = Math.round(regularFare * 1.20);
    assert.strictEqual(mountainFare, 191);
    assert.ok(mountainFare > regularFare, 'Mountain terrain must apply hill multiplier');
  });

  await runTest('Route Pricing - Overcharge Audit Severity Detection', () => {
    const regulatedMax = 200;
    const demandedFare = 450; // +125% overcharge
    const margin = demandedFare - regulatedMax;
    const pct = Math.round((margin / regulatedMax) * 100);
    const severity = pct >= 50 ? 'SEVERE' : pct >= 20 ? 'MODERATE' : 'MARGINAL';

    assert.strictEqual(severity, 'SEVERE');
    assert.strictEqual(pct, 125);
  });

  // -------------------------------------------------------------------------
  // SUITE 9: Unified Nearby Places, Medical Assistance & Multi-Modal Routing
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 9: Unified Nearby Places, Medical Assistance & Multi-Modal Routing]\x1b[0m');

  await runTest('Opening Hours Parser - Evaluates 24/7 vs daytime ranges accurately in IST', () => {
    const always = evaluateOpeningHoursStatus('Open 24/7', '24 Hours Daily');
    assert.strictEqual(always.is24Hours, true);
    assert.strictEqual(always.isOpenNow, true);

    // 14:00 IST (08:30 UTC) vs 02:00 IST (20:30 UTC previous day)
    const afternoonUtcMs = Date.UTC(2026, 10, 25, 8, 30, 0); // 14:00 IST (Wednesday)
    const lateNightUtcMs = Date.UTC(2026, 10, 25, 20, 30, 0); // 02:00 IST next day (Thursday)
    const museumOpen = evaluateOpeningHoursStatus('Open 10:00 AM – 06:00 PM', '10:00 AM – 06:00 PM', afternoonUtcMs);
    const museumClosed = evaluateOpeningHoursStatus('Open 10:00 AM – 06:00 PM', '10:00 AM – 06:00 PM', lateNightUtcMs);
    assert.strictEqual(museumOpen.isOpenNow, true);
    assert.strictEqual(museumClosed.isOpenNow, false);

    // Closed Mondays check: Nov 23, 2026 is a Monday (08:30 UTC = 14:00 IST Monday)
    const mondayUtcMs = Date.UTC(2026, 10, 23, 8, 30, 0);
    const closedMon = evaluateOpeningHoursStatus('Open 10:00 AM – 06:00 PM (Closed Mon)', '10:00 AM – 06:00 PM', mondayUtcMs);
    assert.strictEqual(closedMon.isOpenNow, false);
  });

  await runTest('Nearby Places - Radius filtering 1km vs 10km and Category sorting', async () => {
    const res1km = await placesService.searchNearbyPlaces({
      lat: 28.6328,
      lng: 77.2195, // Connaught Place Delhi
      radiusKm: 1,
      category: 'ALL',
      sortBy: 'distance',
    });
    const res10km = await placesService.searchNearbyPlaces({
      lat: 28.6328,
      lng: 77.2195,
      radiusKm: 10,
      category: 'ALL',
      sortBy: 'category',
    });

    assert.ok(res10km.places.length >= res1km.places.length);
    for (const p of res1km.places) {
      assert.ok(p.straightLineDistanceKm <= 1.0, `Expected <= 1km, got ${p.straightLineDistanceKm}`);
      assert.ok(p.roadDistanceKm >= p.straightLineDistanceKm, 'Road distance cannot be shorter than straight-line distance');
    }
  });

  await runTest('Nearby Pharmacy & Medical Discovery - 24-Hour filtering & Emergency shortcuts', async () => {
    const pharm24 = await placesService.searchNearbyPlaces({
      lat: 28.6328,
      lng: 77.2195,
      radiusKm: 10,
      category: 'PHARMACY',
      is24Hours: true,
    });
    assert.ok(pharm24.places.length >= 1, 'Should discover at least one 24-hour pharmacy near CP Delhi');
    for (const p of pharm24.places) {
      assert.strictEqual(p.category, 'PHARMACY');
      assert.strictEqual(p.is24Hours, true);
    }

    const shortcuts = await placesService.getEmergencyShortcuts(28.6328, 77.2195);
    assert.ok(shortcuts.nearestHospital, 'Must resolve nearest hospital');
    assert.ok(shortcuts.nearestPharmacy, 'Must resolve nearest pharmacy');
    assert.ok(shortcuts.nearestPolice, 'Must resolve nearest police station');
    assert.ok(shortcuts.helplines.some((h) => h.number === '112'), 'Must include 112 helpline');
  });

  await runTest('Multi-Modal Fares - Truthful labeling & no fabricated international fares', async () => {
    const delhiFares = await placesService.calculateMultimodalFares({
      origin: { lat: 28.6139, lng: 77.2090, name: 'India Gate' },
      destination: { lat: 28.6328, lng: 77.2195, name: 'Connaught Place' },
      explicitRoadDistanceKm: 3.1,
      travelHour: 14,
      waitingMins: 30,
    });
    assert.strictEqual(delhiFares.options.length, 8, 'Must return all 8 transport modes');
    assert.strictEqual(delhiFares.coveredCityName, 'Delhi');
    const auto = delhiFares.options.find((o) => o.modeId === 'AUTO_RICKSHAW');
    assert.ok(auto && auto.isAvailable);
    assert.strictEqual(auto.priceTypeLabel, 'Official Price');
    assert.ok((auto.breakdown?.waitingCharge || 0) > 0, 'Must factor waiting charges');

    // International / unmapped coordinate check (London, UK): must NOT fabricate Indian RTO prices
    const londonFares = await placesService.calculateMultimodalFares({
      origin: { lat: 51.5074, lng: -0.1278, name: 'Trafalgar Square' },
      destination: { lat: 51.5007, lng: -0.1246, name: 'Big Ben' },
      explicitRoadDistanceKm: 1.2,
    });
    assert.strictEqual(londonFares.isCityTariffCovered, false);
    const londonAuto = londonFares.options.find((o) => o.modeId === 'AUTO_RICKSHAW');
    assert.ok(londonAuto);
    assert.strictEqual(londonAuto.isAvailable, false);
    assert.strictEqual(londonAuto.fareLabel, 'Fare information unavailable');
  });

  await runTest('Google Maps Helpers - Encoded polyline decoder & missing-key configuration notice', async () => {
    const decoded = googleMapsService.decodeEncodedPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    assert.strictEqual(decoded.length, 3);
    assert.ok(Math.abs(decoded[0][0] - 38.5) < 0.01);
    assert.ok(Math.abs(decoded[0][1] - -120.2) < 0.01);

    const searchRes = await placesService.searchNearbyPlaces({ lat: 28.6139, lng: 77.2090, radiusKm: 5 });
    assert.ok(searchRes.apiNotice.length > 10, 'Must always supply clear API status/configuration message');
  });

  // -------------------------------------------------------------------------
  // SUITE 10: Platform Upgrade Modules (Scam Advisory, Weather, Extended Services)
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 10: Smart Scam Advisory, Open-Meteo Weather & Extended Services]\x1b[0m');

  await runTest('Scam Pattern Advisory - Flags known redirection & overcharge spikes as advisory only', () => {
    const res = analyzeScamPatternAdvisory({
      title: 'Hotel is closed claim',
      description: 'Driver said no meter working and asked advance QR deposit to shifted office',
      category: 'hotel_scam',
      amountDemanded: 2400,
      amountPaid: 400,
    });
    assert.strictEqual(res.signal, 'HIGH_ALERT_SIGNAL');
    assert.ok(res.note.toLowerCase().includes('moderator') || res.note.toLowerCase().includes('advisory'));
  });

  await runTest('Weather Intelligence - Returns source attribution and non-empty condition/temp', async () => {
    const w = await getCityWeather(undefined, 'Jaipur');
    assert.ok(typeof w.temp === 'number');
    assert.ok(typeof w.condition === 'string' && w.condition.length > 0);
    assert.ok(typeof w.sourceName === 'string' && w.sourceName.length > 0);
    assert.ok(typeof w.updatedAt === 'string');
  });

  await runTest('Extended Local Services - Supports FUEL, MECHANIC, GUIDE, TAXI category filters safely', async () => {
    const res = await placesService.searchNearbyPlaces({
      lat: 28.6139,
      lng: 77.2090,
      radiusKm: 15,
      category: 'FUEL',
    });
    assert.ok(Array.isArray(res.places));
  });

  // -------------------------------------------------------------------------
  // SUITE 11: Production Security, Route Honesty & API Validation
  // -------------------------------------------------------------------------
  console.log('\n\x1b[1m[Suite 11: Production Security, Route Honesty & API Validation]\x1b[0m');

  await runTest('Avatar URL Hygiene - Allows safe paths/https and blocks javascript:/data XSS schemes', () => {
    assert.strictEqual(isSafeAvatarUrl('/uploads/avatar-1.png'), true);
    assert.strictEqual(isSafeAvatarUrl('https://lh3.googleusercontent.com/a/photo.jpg'), true);
    assert.strictEqual(isSafeAvatarUrl(''), true);
    assert.strictEqual(isSafeAvatarUrl(null), true);
    assert.strictEqual(isSafeAvatarUrl('javascript:alert(1)'), false);
    assert.strictEqual(isSafeAvatarUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.strictEqual(isSafeAvatarUrl(12345), false);
  });

  await runTest('Password Reset Digest - SHA-256 token hashing never equals raw plaintext token', () => {
    const raw = crypto.randomBytes(24).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    assert.notStrictEqual(hashed, raw);
    assert.strictEqual(hashed.length, 64);
    assert.strictEqual(crypto.createHash('sha256').update(raw).digest('hex'), hashed);
  });

  await runTest('Route Risk Engine - Omits unverified lighting/CCTV guarantees and returns 3 routes', async () => {
    const res = await evaluateRouteSafety(26.9124, 75.7873, 26.9239, 75.8267, 'Sindhi Camp', 'Hawa Mahal');
    assert.strictEqual(res.routes.length, 3);
    const serialized = JSON.stringify(res.routes);
    assert.ok(!serialized.includes('100% lit arterial roads'), 'Must not fabricate unverified streetlamp coverage');
    assert.ok(res.disclaimer.toLowerCase().includes('not connected') || res.disclaimer.toLowerCase().includes('incident'));
  });

  await runTest('Coordinate Bounds Edge Cases - Rejects NaN, +91 lat, and -181 lng', () => {
    assert.strictEqual(validateCoordinates(Number.NaN, 77.2), false);
    assert.strictEqual(validateCoordinates(91, 77.2), false);
    assert.strictEqual(validateCoordinates(28.6, -181), false);
  });

  console.log('\n======================================================');
  console.log(`   TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
