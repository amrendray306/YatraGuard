import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { askTravelGuardian, GuardianContext } from '../services/aiService.js';

const prisma = new PrismaClient();

export async function chatGuardian(req: AuthenticatedRequest, res: Response) {
  try {
    const { query, city, lat, lng, safetyScore, history } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query prompt is required' });
    }

    // Lookup city context details if available
    let nearbyHospital = '24x7 Trauma Hospital';
    let nearbyPolice = 'City Police Thana (Dial 112)';
    let recentIncidents: string[] = [];
    let activeScams: string[] = [];
    let weatherCondition = 'Clear & Dry (29°C)';
    let fareRulesSummary = '';
    let activeCorridors: string[] = [];

    if (city) {
      const trimmedCity = city.trim();
      const cityRec = await prisma.city.findFirst({
        where: {
          OR: [
            { name: { equals: trimmedCity } },
            { name: { contains: trimmedCity } },
          ],
        },
        include: {
          services: true,
          incidents: { take: 3, where: { status: { not: 'REJECTED' } } },
          scams: { take: 3 },
          weatherAlerts: { take: 1 },
          fareRules: { include: { transportMode: true } },
        },
      });

      if (cityRec) {
        const hosp = cityRec.services.find((s) => s.category === 'HOSPITAL');
        if (hosp) nearbyHospital = hosp.name;

        const pol = cityRec.services.find((s) => s.category === 'POLICE');
        if (pol) nearbyPolice = pol.name;

        recentIncidents = cityRec.incidents.map((i) => i.title);
        activeScams = cityRec.scams.map((s) => s.title);
        if (cityRec.weatherAlerts[0]) {
          weatherCondition = `${cityRec.weatherAlerts[0].condition} (${cityRec.weatherAlerts[0].temp}°C)`;
        }

        if (cityRec.fareRules && cityRec.fareRules.length > 0) {
          fareRulesSummary = cityRec.fareRules
            .map((r) => {
              const hillInfo = r.hillTerrainSurchargePct > 0 ? ` [Hill Surcharge: +${r.hillTerrainSurchargePct}%]` : '';
              return `- ${r.transportMode.displayName}: Base ₹${r.baseFare} (first ${r.baseDistanceKm} km), then ₹${r.perKmRate}/km. Night surcharge: ${r.nightSurchargePct}%.${hillInfo} ${r.notes || ''}`;
            })
            .join('\n');
        }

        // Fetch verified corridors for this city
        const verifiedReports = await prisma.fareReport.findMany({
          where: { cityId: cityRec.id, wasOvercharged: false },
          take: 5,
          include: { transportMode: true },
        });

        verifiedReports.forEach((vr) => {
          activeCorridors.push(`${vr.originName} to ${vr.destinationName}: ~₹${vr.actualFarePaid} (${vr.transportMode.displayName})`);
        });
      }
    }

    const context: GuardianContext = {
      city: city || 'Agra',
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      safetyScore: safetyScore ? parseInt(safetyScore) : 76,
      nearbyHospital,
      nearbyPolice,
      recentIncidents,
      activeScams,
      weatherCondition,
      fareRulesSummary,
      activeCorridors,
    };

    const guardianResponse = await askTravelGuardian(query, context, history || []);

    // Optionally record to AI conversation table
    if (req.user) {
      await prisma.aIConversation.create({
        data: {
          userId: req.user.id,
          userPrompt: query,
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
