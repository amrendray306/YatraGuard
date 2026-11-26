import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { askTravelGuardian, GuardianContext } from '../services/aiService.js';

export async function chatGuardian(req: AuthenticatedRequest, res: Response) {
  try {
    const { query, city, lat, lng, safetyScore, history } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query prompt is required' });
    }

    let nearbyHospital = '24x7 Trauma Hospital (confirm via 108)';
    let nearbyPolice = 'City Police Station (Dial 112)';
    let nearbyPharmacy = 'Check Local Services tab or dial 108 in emergencies';
    let recentIncidents: string[] = [];
    let activeScams: string[] = [];
    let weatherCondition = 'Cached forecast unavailable — check local advisories';
    let fareRulesSummary = '';
    let activeCorridors: string[] = [];
    let localPriceSummary = '';

    if (city && typeof city === 'string') {
      const trimmedCity = city.trim();
      const cityRec = await prisma.city.findFirst({
        where: {
          OR: [
            { name: { equals: trimmedCity, mode: 'insensitive' } },
            { name: { contains: trimmedCity, mode: 'insensitive' } },
          ],
        },
        include: {
          services: true,
          incidents: { take: 4, where: { status: { not: 'REJECTED' } }, orderBy: { reportedAt: 'desc' } },
          scams: { take: 4, orderBy: { lastReportedAt: 'desc' } },
          weatherAlerts: { take: 1, orderBy: { updatedAt: 'desc' } },
          fareRules: { include: { transportMode: true } },
          priceRecords: { take: 6, where: { verificationStatus: { not: 'REJECTED' } } },
        },
      });

      if (cityRec) {
        const hosp = cityRec.services.find((s) => s.category === 'HOSPITAL');
        if (hosp) nearbyHospital = `${hosp.name}${hosp.phone ? ` (${hosp.phone})` : ''}`;

        const pol = cityRec.services.find((s) => s.category === 'POLICE');
        if (pol) nearbyPolice = `${pol.name}${pol.phone ? ` (${pol.phone})` : ''}`;

        const pharm = cityRec.services.find((s) => s.category === 'PHARMACY');
        if (pharm) nearbyPharmacy = `${pharm.name} — ${pharm.address}`;

        recentIncidents = cityRec.incidents.map((i) => i.title);
        activeScams = cityRec.scams.map((s) => s.title);

        if (cityRec.weatherAlerts[0]) {
          const w = cityRec.weatherAlerts[0];
          weatherCondition = `${w.condition} (${w.temp}°C, Rain chance ${w.rainChance}%, Updated ${new Date(w.updatedAt).toLocaleDateString()})`;
        }

        if (cityRec.fareRules.length > 0) {
          fareRulesSummary = cityRec.fareRules
            .map((r) => {
              const hillInfo =
                r.hillTerrainSurchargePct > 0 ? ` [Hill Surcharge: +${r.hillTerrainSurchargePct}%]` : '';
              return `- ${r.transportMode.displayName}: Base ₹${r.baseFare} (first ${r.baseDistanceKm} km), then ₹${r.perKmRate}/km. Night surcharge: ${r.nightSurchargePct}%.${hillInfo}`;
            })
            .join('\n');
        }

        if (cityRec.priceRecords.length > 0) {
          localPriceSummary = cityRec.priceRecords
            .map((p) => `- ${p.itemName} (${p.category}): ₹${p.minPrice}–₹${p.maxPrice}`)
            .join('\n');
        }

        const verifiedReports = await prisma.fareReport.findMany({
          where: { cityId: cityRec.id, wasOvercharged: false },
          take: 5,
          include: { transportMode: true },
        });

        verifiedReports.forEach((vr) => {
          activeCorridors.push(
            `${vr.originName} to ${vr.destinationName}: ~₹${vr.actualFarePaid} (${vr.transportMode.displayName})`
          );
        });
      }
    }

    const context: GuardianContext = {
      city: city || 'India',
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      safetyScore: safetyScore ? parseInt(safetyScore, 10) : 76,
      nearbyHospital,
      nearbyPolice,
      nearbyPharmacy,
      recentIncidents,
      activeScams,
      weatherCondition,
      fareRulesSummary,
      activeCorridors,
      localPriceSummary,
    };

    const safeHistory = Array.isArray(history) ? history : [];
    const guardianResponse = await askTravelGuardian(query.trim(), context, safeHistory);

    if (req.user) {
      await prisma.aIConversation.create({
        data: {
          userId: req.user.id,
          userPrompt: query.trim(),
          aiResponse: guardianResponse.reply,
          cityContext: city || 'India',
        },
      });
    }

    return res.json({
      reply: guardianResponse.reply,
      mode: guardianResponse.mode,
      isAiGenerated: guardianResponse.isAiGenerated,
      contextUsed: {
        city: context.city,
        safetyScore: context.safetyScore,
        nearbyHospital: context.nearbyHospital,
        nearbyPolice: context.nearbyPolice,
      },
    });
  } catch (error) {
    console.error('Guardian chat error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Travel Guardian' });
  }
}

export async function getAiHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.json({ conversations: [] });
    }

    const rows = await prisma.aIConversation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });

    return res.json({ conversations: rows });
  } catch (error) {
    console.error('Get AI history error:', error);
    return res.status(500).json({ error: 'Failed to load conversation history' });
  }
}

export async function clearAiHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await prisma.aIConversation.deleteMany({
      where: { userId: req.user.id },
    });

    return res.json({ message: 'Conversation history cleared' });
  } catch (error) {
    console.error('Clear AI history error:', error);
    return res.status(500).json({ error: 'Failed to clear conversation history' });
  }
}
