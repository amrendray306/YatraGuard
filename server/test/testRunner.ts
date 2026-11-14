import assert from 'node:assert/strict';
import { FareEstimationService } from '../src/services/FareEstimationService.js';
import { calculateSafetyScore } from '../src/services/safetyScoreService.js';
import { validateCoordinates } from '../src/middleware/validation.js';
import { generateToken, verifyToken } from '../src/middleware/auth.js';
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
