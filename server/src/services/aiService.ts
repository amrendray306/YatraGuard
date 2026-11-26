import { GoogleGenAI } from '@google/genai';
import prisma from '../lib/prisma.js';

export interface GuardianContext {
  city?: string;
  lat?: number;
  lng?: number;
  safetyScore?: number;
  nearbyPolice?: string;
  nearbyHospital?: string;
  nearbyPharmacy?: string;
  weatherCondition?: string;
  recentIncidents?: string[];
  activeScams?: string[];
  fareRulesSummary?: string;
  activeCorridors?: string[];
  localPriceSummary?: string;
}

export async function askTravelGuardian(
  query: string,
  context: GuardianContext,
  history: Array<{ role: 'user' | 'model'; text: string }> = []
): Promise<{ reply: string; isAiGenerated: boolean; mode: 'LIVE_GEMINI' | 'DEMO_HEURISTIC' }> {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  // If Gemini API Key is supplied, invoke Google GenAI SDK
  if (geminiApiKey && geminiApiKey.length > 5) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const systemInstruction = `You are "YatraGuard AI", a trustworthy intelligent travel safety companion and trip advisor across India.
Current Verified Context from YatraGuard Database:
- Active Destination: ${context.city || 'India'}
- Estimated Area Safety Score: ${context.safetyScore || 'N/A'}/100
- Nearest Listed Hospital: ${context.nearbyHospital || 'Emergency Ambulance via 108 / 112'}
- Nearest Listed Police Desk: ${context.nearbyPolice || 'Police via 112 / 100'}
- Nearest Listed Pharmacy: ${context.nearbyPharmacy || 'Ask for licensed 24/7 chemist or verify locally'}
- Cached Weather Context: ${context.weatherCondition || 'Not currently available from live feed'}
- Recent Incidents Logged: ${context.recentIncidents?.join('; ') || 'None currently logged'}
- Known Scam Patterns Logged: ${context.activeScams?.join('; ') || 'None currently logged'}
- Regulated Transportation Tariffs for ${context.city || 'Current Location'}:
${context.fareRulesSummary || 'Auto: ₹25-30 base, ₹11-15/km. Local taxi: ₹20-25/km. Prefer official prepaid booths or metered rides.'}
${context.activeCorridors && context.activeCorridors.length > 0 ? `Verified Corridor Benchmarks:\n${context.activeCorridors.map((c) => `- ${c}`).join('\n')}` : ''}
${context.localPriceSummary ? `Local Food/Stay/Activity Benchmarks:\n${context.localPriceSummary}` : ''}

Critical Truthfulness & Safety Rules:
1. For budget-based trip suggestions (e.g. "I am in Manali with a budget of ₹2,000"), break down:
   • Suggested destinations / stops
   • Approximate transportation costs (marked as Approximate / Estimated)
   • Estimated food & entry expenses (marked as Estimated)
   • Estimated travel duration
   • Relevant safety advisories & local scam warnings
2. For emergencies: ALWAYS advise dialing official Indian helplines (112 All-in-One, 100 Police, 108/102 Ambulance, 1091 Women Helpline, 1363 Tourist Helpline). Never claim live service bed/medicine availability unless directly stated.
3. For translations: Provide the Hindi script, English pronunciation (transliteration), and polite safety context.
4. NEVER fabricate live road closures, live weather telemetry, phone numbers, or guaranteed transport availability. Clearly label estimates as approximate and state if live data is unavailable.
5. Keep responses concise, structured with clear markdown bullets, and easy to scan on mobile.`;

      const recentTurns = history
        .slice(-8)
        .filter((h) => h.text && h.text.trim())
        .map((h) => ({
          role: h.role === 'model' ? ('model' as const) : ('user' as const),
          parts: [{ text: h.text.slice(0, 1500) }],
        }));

      const contents = [
        ...recentTurns,
        { role: 'user' as const, parts: [{ text: query }] },
      ];

      const withTimeout = <T>(p: Promise<T>, ms = 10000): Promise<T> =>
        Promise.race([
          p,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API request timed out')), ms)
          ),
        ]);

      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            config: { systemInstruction },
            contents,
          })
        );
      } catch {
        response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            config: { systemInstruction },
            contents,
          })
        );
      }

      const reply = response.text || "I don't have verified information for this.";
      return { reply, isAiGenerated: true, mode: 'LIVE_GEMINI' };
    } catch (err) {
      console.warn('⚠️ Gemini API call failed, falling back to heuristic engine:', err);
    }
  }

  // Fallback: Intelligent Contextual Guardian Safety Heuristic Engine (Zero-Key Demo Mode)
  const q = query.toLowerCase();
  const city = context.city || 'Agra';
  const score = context.safetyScore ?? 76;
  const hospital = context.nearbyHospital || 'S.N. Medical College / AIIMS';
  const police = context.nearbyPolice || 'Local Thana / Tourist Police Desk';

  // 1. Emergency / SOS / Immediate danger
  if (
    q.includes('emergency') ||
    q.includes('danger') ||
    q.includes('help me') ||
    q.includes('sos') ||
    q.includes('attack') ||
    q.includes('urgent')
  ) {
    return {
      reply: `🚨 **EMERGENCY ACTION PROTOCOL FOR ${city.toUpperCase()}**

**What to do right now:**
1. **Call 112 immediately** — This is India's Unified Emergency Number (Police, Ambulance, Fire).
2. **Move to a lit, public space** — Enter the nearest hotel lobby, metro station, or crowded shop.
3. **Nearest Police Assistance:** ${police} (Dial 112 / 100).
4. **Nearest Emergency Hospital:** ${hospital} (Dial 108 / 102 for ambulance).
5. **Women Traveler Helpline:** Call **1090** or **1091** (24/7 dedicated response).
6. **Press the red SOS button** on your top navbar to sound the audible alarm and broadcast your live GPS to your emergency contacts.`,
      isAiGenerated: false,
      mode: 'DEMO_HEURISTIC',
    };
  }

  // 2. Hospital / Medical
  if (q.includes('hospital') || q.includes('doctor') || q.includes('medical') || q.includes('medicine') || q.includes('pharmacy')) {
    return {
      reply: `🏥 **MEDICAL ASSISTANCE IN ${city.toUpperCase()}**

**Recommended Immediate Action:**
- **Nearest Emergency Hospital:** ${hospital} (24/7 Emergency & Trauma Centre).
- **National Ambulance Dispatch:** Dial **108** or **102** (Free 24/7 emergency service).
- **Apollo / MedPlus 24x7 Pharmacies:** Look for registered chemist shops on the **Local Services** tab of this app.
- **Tip:** For minor ailments, consult registered pharmacists or licensed MBBS practitioners only. Keep your insurance policy number handy in your **Emergency Vault**.`,
      isAiGenerated: false,
      mode: 'DEMO_HEURISTIC',
    };
  }

  // 3. Walking safety / Is it safe?
  if (q.includes('safe to walk') || q.includes('is it safe') || q.includes('night') || q.includes('walking')) {
    const isNight = new Date().getHours() >= 21 || new Date().getHours() < 5;
    return {
      reply: `🛡️ **SAFETY ASSESSMENT FOR ${city.toUpperCase()}**

**Estimated Safety Score:** **${score} / 100** ${score >= 75 ? '🟢 Good' : '🟡 Moderate Risk'}

**Current Conditions & Advice:**
${isNight ? '⚠️ **It is currently night hours.** Avoid secluded alleys or unlit roads.' : '✓ **Daylight hours:** High commercial and pedestrian activity.'}
- **Recommended Route:** Stick to primary arterial roads with active streetlights and commercial storefronts.
- **Nearby Security:** ${police} is in the vicinity.
- **Solo Traveler Protocol:** Avoid accepting rides or unsolicited guidance from touts lingering near monument entrances or train stations.
- **Next Action:** Check the **Route Safety** tab to preview the safest monitored walking path before heading out.`,
      isAiGenerated: false,
      mode: 'DEMO_HEURISTIC',
    };
  }

  // 4. Taxi / Auto overcharging / Local Fare Intelligence
  if (
    q.includes('taxi') ||
    q.includes('auto') ||
    q.includes('fare') ||
    q.includes('meter') ||
    q.includes('charge') ||
    q.includes('price') ||
    q.includes('cheat') ||
    q.includes('overcharge') ||
    q.includes('solang') ||
    q.includes('mall road') ||
    q.includes('rishikesh') ||
    q.includes('haridwar') ||
    q.includes('cab') ||
    q.includes('how much to pay')
  ) {
    const isManali = city.toLowerCase().includes('manali') || q.includes('manali') || q.includes('solang');
    const isHaridwarRishikesh = city.toLowerCase().includes('haridwar') || city.toLowerCase().includes('rishikesh') || q.includes('haridwar') || q.includes('rishikesh');
    const isDelhi = city.toLowerCase().includes('delhi') || q.includes('delhi');
    const isAgra = city.toLowerCase().includes('agra') || q.includes('taj');

    // Extract any rupee number quoted by traveler (e.g. 2000, 3500, 500)
    const quoteMatch = q.match(/(?:rs\.?|inr|₹|\b)(\d{2,5})\b/i);
    const quotedAmount = quoteMatch ? parseInt(quoteMatch[1], 10) : null;

    if (isManali) {
      const isSolang = q.includes('solang');
      let overchargeVerdict = '';
      if (quotedAmount) {
        if (quotedAmount > 2400) {
          overchargeVerdict = `\n\n⚠️ **AUDIT VERDICT ON ₹${quotedAmount}: SEVERE OVERCHARGE (60–100%+ above union tariff)**. Decline this offer. Official Taxi Union rate is only **₹1,400–₹1,800**.`;
        } else if (quotedAmount > 1900) {
          overchargeVerdict = `\n\n⚠️ **AUDIT VERDICT ON ₹${quotedAmount}: SLIGHTLY ELEVATED (Peak season surcharge)**. Try negotiating down to **₹1,500–₹1,700**.`;
        } else if (quotedAmount >= 1200) {
          overchargeVerdict = `\n\n✓ **AUDIT VERDICT ON ₹${quotedAmount}: FAIR & REASONABLE**. This aligns with the Manali Taxi Operators Union regulated tariff.`;
        }
      }

      return {
        reply: `🚕 **MANALI LOCAL FARE & TRANSPORT INTELLIGENCE**

**Official Regulated Benchmarks (Manali Taxi Operators Union):**
- **Mall Road ↔ Solang Valley (~13 km mountain corridor):**
  • Round trip (with 2–3 hr waiting): **₹1,400 – ₹1,800** (Sedan / Hatchback) or **₹2,000 – ₹2,400** (Innova / 4x4 SUV).
  • One-way drop: **₹800 – ₹1,000**.
- **Mall Road ↔ Atal Tunnel / Sissu (Lahaul Valley):** **₹2,400 – ₹3,200** round trip.
- **Mall Road ↔ Old Manali / Hadimba Temple:** Auto: **₹100 – ₹150**; Local Taxi: **₹250 – ₹350**.
- **Terrain Note:** Mountain hill routes incur a +25% to +30% terrain & altitude fuel adjustment included above.${overchargeVerdict}

**Crucial Safety & Scam Warnings:**
1. **Winter Gear Racket:** On the road to Solang Valley (near Palchan), touts stop vehicles claiming snow dress & gumboots are "mandatory by law". They charge ₹800–₹1,500. It is **NOT** mandatory, and government rental stalls at the spot charge only **₹250–₹350**.
2. **Rohtang Pass Permit:** Permits are issued solely via the official HP Tourism portal (hpmanali.nic.in) for ₹550. Do not pay touts ₹2,000–₹4,000 for "instant black-market passes".`,
        isAiGenerated: false,
        mode: 'DEMO_HEURISTIC',
      };
    }

    if (isHaridwarRishikesh) {
      let overchargeVerdict = '';
      if (quotedAmount) {
        if (quotedAmount > 1200) {
          overchargeVerdict = `\n\n⚠️ **AUDIT VERDICT ON ₹${quotedAmount}: POTENTIAL OVERCHARGE**. A private cab between Haridwar and Rishikesh is normally **₹600–₹800**.`;
        } else if (quotedAmount <= 800) {
          overchargeVerdict = `\n\n✓ **AUDIT VERDICT ON ₹${quotedAmount}: FAIR TARIFF** for Haridwar ↔ Rishikesh private travel.`;
        }
      }

      return {
        reply: `🚖 **HARIDWAR ↔ RISHIKESH TRANSPORT TARIFFS (~28.5 km)**

**Regulated Transit Options:**
- **Private Taxi / Cab:** **₹600 – ₹800** (One-way drop from Haridwar Junction to Rishikesh Tapovan / Ram Jhula).
- **Shared Vikram / Auto Rickshaw:** **₹80 – ₹120** per seat from Haridwar Bus Stand / Station.
- **UTC State Transport Bus:** **₹45 – ₹60** per passenger (Runs every 15–20 minutes).
- **Local Auto within Rishikesh (Ram Jhula to Laxman Jhula/Tapovan):** **₹60 – ₹100**.${overchargeVerdict}

**Traveler Tip:**
- Near Har Ki Pauri and Rishikesh bus stands, decline touts claiming ghats are closed for private VIP pujas. Always walk directly to the public ghat walkways.`,
        isAiGenerated: false,
        mode: 'DEMO_HEURISTIC',
      };
    }

    if (isDelhi) {
      return {
        reply: `🚖 **DELHI LOCAL FARE INTELLIGENCE & METER RULES**

**Official Regulated Rates (Delhi Transport Dept):**
- **Auto Rickshaw (TSR):**
  • **Base Fare:** **₹30** for the first 1.5 km.
  • **Per-km Rate:** **₹11.00 / km** thereafter.
  • **Waiting Charges:** ₹0.75 per minute after 15 min.
  • **Night Surcharge:** **+25% extra** between **23:00 (11:00 PM) and 05:00 (5:00 AM)**.
- **Airport Express Metro:** **₹50 – ₹60** from IGI Airport Terminal 3 to New Delhi Railway Station (takes only 19 minutes and completely avoids highway traffic).
- **Meter Refusal Protocol:**
  • In Delhi, auto drivers are legally required to run on the digital meter.
  • If a driver refuses the meter or demands 3x price, use the **Delhi Traffic Police Helpline (1095)** or book via **Uber Auto / Ola Auto** on your phone for transparent, upfront pricing.`,
        isAiGenerated: false,
        mode: 'DEMO_HEURISTIC',
      };
    }

    if (isAgra) {
      return {
        reply: `🚕 **AGRA LOCAL FARE & MONUMENT TRANSIT BENCHMARKS**

**Official Prepaid Booth Tariffs (Agra Cantt Railway Station Exit):**
- **Agra Cantt ↔ Taj Mahal (West/East Gate, ~5.5 km):**
  • Prepaid Auto Rickshaw: **₹120 – ₹160**
  • Prepaid Taxi / Cab: **₹300 – ₹450**
  • Electric Golf Cart (Shilpgram to Taj East Gate): **₹10 – ₹20** per person or free battery shuttles.
- **Agra Cantt ↔ Agra Fort (~4.5 km):** Auto: **₹90 – ₹130**.
- **Day Rental (Taj Mahal + Agra Fort + Mehtab Bagh):** Auto: **₹600 – ₹800**; Cab: **₹1,400 – ₹1,800**.

**Scam Prevention:**
- Never accept a ride from a driver who offers "₹50 tour" — they make money through mandatory stops at overpriced marble and gemstone emporiums where you will be pressured to buy.`,
        isAiGenerated: false,
        mode: 'DEMO_HEURISTIC',
      };
    }

    // Generic City Fallback
    const corridorInfo = context.activeCorridors && context.activeCorridors.length > 0
      ? `\n\n**Known Corridors in ${city}:**\n${context.activeCorridors.map((c) => `• ${c}`).join('\n')}`
      : '';

    return {
      reply: `🚕 **TRANSPORT & FARE BENCHMARKS FOR ${city.toUpperCase()}**

**Standard Pricing Guidelines:**
${context.fareRulesSummary || `• Auto Rickshaw: Base ₹25–₹30 (first 1.5–2 km), then ₹11–₹16/km.
• Local Taxi / Cab: Base ₹80–₹120, then ₹18–₹25/km.
• Night Surcharge: +20% to +25% between 23:00 and 05:00.`}${corridorInfo}

**Safety Rules for Fair Travel:**
1. **Always insist on meter or prepaid booth:** Locate the official **Traffic Police Prepaid Booth** before leaving the railway station or airport terminal.
2. **Use App Alternatives:** Uber, Ola, or Rapido provide GPS-tracked rides with upfront regulated digital tariffs.
3. **Audit Your Quote:** Use our **Fare Intelligence Tab** to calculate the exact estimated fare and overcharge risk for any distance in ${city}.`,
      isAiGenerated: false,
      mode: 'DEMO_HEURISTIC',
    };
  }

  // 4b. Budget trip / Places to visit / Itinerary suggestion
  if (
    q.includes('budget') ||
    q.includes('visit') ||
    q.includes('itinerary') ||
    q.includes('places') ||
    q.includes('suggest') ||
    q.includes('day trip')
  ) {
    const budgetMatch = q.match(/(?:rs\.?|inr|₹|\b)(\d{3,6})\b/i);
    const totalBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : 2000;
    const estTransport = Math.round(totalBudget * 0.35);
    const estFood = Math.round(totalBudget * 0.35);
    const estEntryBuffer = Math.max(0, totalBudget - estTransport - estFood);

    return {
      reply: `🧭 **ESTIMATED DAY PLAN FOR ${city.toUpperCase()} (BUDGET ~₹${totalBudget.toLocaleString('en-IN')})**

**Suggested Budget Allocation *(Approximate Estimates)*:**
- **Local Transport:** ~₹${estTransport.toLocaleString('en-IN')} (prefer shared autos, HRTC/state buses, or official prepaid counters)
- **Food & Hydration:** ~₹${estFood.toLocaleString('en-IN')} (local dhabas / verified dining)
- **Monument Entry & Buffer:** ~₹${estEntryBuffer.toLocaleString('en-IN')}

**Key Guidance:**
- **Safety Score:** **${score}/100** (${context.weatherCondition || 'Check local weather before departing'})
- **Nearest Medical:** ${hospital} (Call **108** for emergency ambulance)
- **Nearest Police:** ${police} (Call **112** for urgent police help)
- **Travel Tip:** Confirm exact entry fees at official monument counters and avoid touts offering bundled "skip-the-line" packages. Use the **Smart Trip Planner** tab to customize and save a full day-by-day itinerary.`,
      isAiGenerated: false,
      mode: 'DEMO_HEURISTIC',
    };
  }

  // 5. Lost passport / embassy / police FIR
  if (q.includes('passport') || q.includes('wallet') || q.includes('lost') || q.includes('stolen') || q.includes('theft')) {
    return {
      reply: `📋 **ACTION PLAN: LOST PASSPORT OR VALUABLES**

**Step-by-Step Instructions:**
1. **File an e-FIR / Police Report:** Go to the nearest police station (${police}) or use the state police citizen portal to get a "Non-Cognizable Report" (NCR). You need this paper for passport reissue and travel insurance claims.
2. **Contact your Embassy / High Commission:** If you are a foreign national, contact your country's embassy in New Delhi immediately for an Emergency Travel Document (ETD).
3. **Block Cards:** Immediately freeze all lost debit/credit cards via your mobile banking app or customer care hotline.
4. **Tourist Helpline Assistance:** Dial **1363** (Toll-Free, 24/7 Multi-lingual Tourist Helpline operated by the Ministry of Tourism, India).
5. **Retrieve references:** Open your **Emergency Vault** in this app to access your pre-saved passport and insurance policy references.`,
      isAiGenerated: false,
      mode: 'DEMO_HEURISTIC',
    };
  }

  // 6. Translation / Hindi assistance
  if (q.includes('translate') || q.includes('hindi') || q.includes('meaning') || q.includes('say')) {
    return {
      reply: `🗣️ **HINDI TRAVEL PHRASEBOOK & ASSISTANCE**

Here are essential phrases for your safety:
- **"Help me please"** → *“Kripya meri madad kijiye”* (कृपया मेरी मदद कीजिए)
- **"Where is the police station?"** → *“Police station kahan hai?”* (पुलिस स्टेशन कहाँ है?)
- **"Please turn on the meter"** → *“Meter chalu kijiye”* (मीटर चालू कीजिए)
- **"I don't need this, please leave"** → *“Mujhe yeh nahi chahiye, kripya jaiye”* (मुझे यह नहीं चाहिए)
- **"Where is the nearest hospital?"** → *“Nazdeeki aspatal kahan hai?”* (नज़दीकी अस्पताल कहाँ है?)

👉 Use our dedicated **Language Assistant** tab in the main menu for more phrases with audio and transliterations!`,
      isAiGenerated: false,
      mode: 'DEMO_HEURISTIC',
    };
  }

  // 7. General inquiry
  return {
    reply: `🧭 **TRAVEL GUARDIAN ADVISORY (${city.toUpperCase()})**

You asked: *"${query}"*

**Current Status:**
- **City:** ${city} (Safety Score: **${score}/100**)
- **Emergency Police:** Dial **112** (Pan-India)
- **Tourist Helpline:** Dial **1363** (24/7 Multi-lingual)
- **Nearest Medical Facility:** ${hospital}

**Recommended Next Step:**
- Check the **Interactive Safety Map** to view verified safe zones and avoid known incident clusters.
- If you suspect you are being overcharged or misled, ask for "Prepaid fare" or consult the **Travel Costs** screen.
- In any distress situation, tap the red **SOS Button** immediately.

*(Note: Live Demo Mode Active. To enable open-ended generative chat, configure \`GEMINI_API_KEY\` in your environment.)*`,
    isAiGenerated: false,
    mode: 'DEMO_HEURISTIC',
  };
}
