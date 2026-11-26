import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { safetyIntelligenceService } from '../services/SafetyIntelligenceService.js';
import { evaluateRouteSafety } from '../services/routeRiskEngine.js';
import { getCityWeather } from '../services/weatherService.js';

export async function getSafetyScore(req: Request, res: Response) {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 28.6139;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : 77.2090;
    const cityId = req.query.cityId as string | undefined;
    const simulatedHour = req.query.hour ? parseInt(req.query.hour as string, 10) : undefined;
    const weatherSeverity = req.query.weatherSeverity as any;

    const result = await safetyIntelligenceService.calculateSafetyScore({
      lat,
      lng,
      cityId,
      simulatedHour,
      weatherSeverity,
    });
    return res.json(result);
  } catch (error) {
    console.error('Safety score error:', error);
    return res.status(500).json({ error: 'Failed to calculate safety score' });
  }
}

export async function postRouteRisk(req: Request, res: Response) {
  try {
    const { fromLat, fromLng, toLat, toLng, fromName, toName, cityId } = req.body;

    if (fromLat === undefined || fromLng === undefined || toLat === undefined || toLng === undefined) {
      return res.status(400).json({ error: 'fromLat, fromLng, toLat, and toLng are required' });
    }

    const result = await evaluateRouteSafety(
      parseFloat(fromLat),
      parseFloat(fromLng),
      parseFloat(toLat),
      parseFloat(toLng),
      fromName || 'Current Location',
      toName || 'Destination',
      cityId
    );

    return res.json(result);
  } catch (error) {
    console.error('Route risk evaluation error:', error);
    return res.status(500).json({ error: 'Failed to evaluate route risk' });
  }
}

export async function getWeather(req: Request, res: Response) {
  try {
    const cityId = req.query.cityId as string | undefined;
    const cityName = req.query.cityName as string | undefined;
    const lat = req.query.lat !== undefined ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng !== undefined ? parseFloat(req.query.lng as string) : undefined;
    const forceRefresh = req.query.refresh === 'true';

    if (!cityId && !cityName && (lat === undefined || Number.isNaN(lat))) {
      const defaultCity = await prisma.city.findFirst({ where: { name: 'Agra' } });
      const weather = await getCityWeather(defaultCity?.id, defaultCity?.name || 'Agra', { forceRefresh });
      return res.json(weather);
    }

    let targetCityId = cityId;
    if (!targetCityId && cityName) {
      const city = await prisma.city.findFirst({
        where: { name: { equals: cityName.trim(), mode: 'insensitive' } },
      });
      if (city) targetCityId = city.id;
    }

    const validLat = lat !== undefined && !Number.isNaN(lat) ? lat : undefined;
    const validLng = lng !== undefined && !Number.isNaN(lng) ? lng : undefined;

    const weather = await getCityWeather(targetCityId, cityName, {
      lat: validLat,
      lng: validLng,
      forceRefresh,
    });
    return res.json(weather);
  } catch (error) {
    console.error('Weather error:', error);
    return res.status(500).json({ error: 'Failed to fetch weather data' });
  }
}

export async function getCosts(req: Request, res: Response) {
  try {
    const cityId = req.query.cityId as string;
    const category = req.query.category as string;

    const where: any = {};
    if (cityId) where.cityId = cityId;
    if (category) where.category = category.toUpperCase();

    const costs = await prisma.travelCost.findMany({
      where,
      include: { city: true },
      orderBy: { category: 'asc' },
    });

    return res.json(costs);
  } catch (error) {
    console.error('Travel cost error:', error);
    return res.status(500).json({ error: 'Failed to retrieve travel costs' });
  }
}

export async function getCrowd(req: Request, res: Response) {
  try {
    const cityId = req.query.cityId as string;

    const where: any = {};
    if (cityId) where.cityId = cityId;

    const crowd = await prisma.crowdLevel.findMany({
      where,
      include: { city: true },
    });

    return res.json(crowd);
  } catch (error) {
    console.error('Crowd error:', error);
    return res.status(500).json({ error: 'Failed to retrieve crowd data' });
  }
}
