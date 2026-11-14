import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateDistanceKm, formatDistance } from '../services/geoService.js';
import { placesService } from '../services/PlacesService.js';

const prisma = new PrismaClient();

export async function searchDestinationsHandler(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const results = await placesService.searchDestinations(q);
    return res.json(results);
  } catch (error) {
    console.error('Search destinations error:', error);
    return res.status(500).json({ error: 'Failed to search destinations' });
  }
}

export async function getCities(req: Request, res: Response) {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(cities);
  } catch (error) {
    console.error('Fetch cities error:', error);
    return res.status(500).json({ error: 'Failed to fetch cities' });
  }
}

export async function getCity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        services: true,
        safetyZones: true,
        weatherAlerts: true,
        crowdLevels: true,
      },
    });

    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }

    return res.json(city);
  } catch (error) {
    console.error('Fetch city error:', error);
    return res.status(500).json({ error: 'Failed to fetch city details' });
  }
}

export async function getNearbyServices(req: Request, res: Response) {
  try {
    const { lat, lng, category, cityId, sortBy } = req.query;

    const userLat = lat ? parseFloat(lat as string) : 27.1767;
    const userLng = lng ? parseFloat(lng as string) : 78.0081;

    const where: any = {};
    if (cityId) where.cityId = cityId as string;
    if (category && category !== 'ALL') where.category = (category as string).toUpperCase();

    const services = await prisma.locationService.findMany({
      where,
      include: { city: true },
    });

    const enriched = services.map((s) => {
      const distanceKm = calculateDistanceKm(userLat, userLng, s.lat, s.lng);
      return {
        ...s,
        distanceKm,
        distanceLabel: formatDistance(distanceKm),
      };
    });

    if (sortBy === 'rating') {
      enriched.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      enriched.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return res.json(enriched);
  } catch (error) {
    console.error('Fetch nearby services error:', error);
    return res.status(500).json({ error: 'Failed to fetch nearby services' });
  }
}

export async function getMapData(req: Request, res: Response) {
  try {
    const { cityId, lat, lng } = req.query;

    let targetCityId = cityId as string | undefined;

    if (!targetCityId && lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const allCities = await prisma.city.findMany();
      let minDist = Infinity;
      for (const c of allCities) {
        const d = calculateDistanceKm(userLat, userLng, c.lat, c.lng);
        if (d < minDist) {
          minDist = d;
          targetCityId = c.id;
        }
      }
    }

    if (!targetCityId) {
      const defaultCity = await prisma.city.findFirst({ where: { name: 'Agra' } });
      targetCityId = defaultCity?.id;
    }

    const [city, services, incidents, scams, safetyZones] = await Promise.all([
      prisma.city.findUnique({ where: { id: targetCityId } }),
      prisma.locationService.findMany({ where: { cityId: targetCityId } }),
      prisma.incidentReport.findMany({
        where: { cityId: targetCityId, status: { not: 'REJECTED' } },
        include: { reporter: { select: { name: true } } },
      }),
      prisma.scamReport.findMany({ where: { cityId: targetCityId } }),
      prisma.safetyZone.findMany({ where: { cityId: targetCityId } }),
    ]);

    return res.json({
      city,
      services,
      incidents,
      scams,
      safetyZones,
    });
  } catch (error) {
    console.error('Fetch map data error:', error);
    return res.status(500).json({ error: 'Failed to retrieve interactive map data' });
  }
}
