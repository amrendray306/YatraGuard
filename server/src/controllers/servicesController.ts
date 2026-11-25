import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateDistanceKm } from '../services/geoService.js';
import { placesService } from '../services/PlacesService.js';
import { googleMapsService } from '../services/googleMapsService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { isValidCoordinate } from '../middleware/validation.js';

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

export async function autocompletePlacesHandler(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const sessionToken = req.query.sessionToken as string | undefined;

    if (lat !== undefined && lng !== undefined && !isValidCoordinate(lat, lng)) {
      return res.status(400).json({ error: 'Invalid coordinate bias parameters' });
    }

    const data = await placesService.autocompleteGlobal(q, lat, lng, sessionToken);
    return res.json(data);
  } catch (error) {
    console.error('autocompletePlacesHandler error:', error);
    return res.status(500).json({ error: 'Failed to fetch place suggestions' });
  }
}

export async function geocodeLocationHandler(req: Request, res: Response) {
  try {
    const { placeId, address, sessionToken } = req.query;
    if (!placeId && !address) {
      return res.status(400).json({ error: 'placeId or address query parameter is required' });
    }

    const result = await googleMapsService.geocodeLocation({
      placeId: placeId as string | undefined,
      address: address as string | undefined,
      sessionToken: sessionToken as string | undefined,
    });

    if (!result) {
      return res.status(404).json({ error: 'Location could not be geocoded' });
    }

    return res.json(result);
  } catch (error) {
    console.error('geocodeLocationHandler error:', error);
    return res.status(500).json({ error: 'Failed to geocode location' });
  }
}

export async function reverseGeocodeHandler(req: Request, res: Response) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    if (!isValidCoordinate(lat, lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
    }

    const result = await googleMapsService.reverseGeocodeCoordinates(lat, lng);
    return res.json(result);
  } catch (error) {
    console.error('reverseGeocodeHandler error:', error);
    return res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
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

/**
 * Backward-compatible endpoint for existing /services/nearby and /map/nearby
 */
export async function getNearbyServices(req: Request, res: Response) {
  try {
    const {
      lat,
      lng,
      category,
      subCategory,
      cityId,
      strictCityFilter,
      radiusKm,
      openNow,
      is24Hours,
      query,
      sortBy,
      format,
      limit,
    } = req.query;

    const userLat = lat ? parseFloat(lat as string) : 28.6139;
    const userLng = lng ? parseFloat(lng as string) : 77.2090;

    const result = await placesService.searchNearbyPlaces({
      lat: userLat,
      lng: userLng,
      category: category as string,
      subCategory: subCategory as string,
      cityId: cityId as string,
      strictCityFilter: strictCityFilter === 'true' || Boolean(cityId && format !== 'full' && category === undefined && radiusKm === undefined),
      radiusKm: radiusKm ? parseFloat(radiusKm as string) : 10,
      openNow: openNow === 'true' || openNow === '1',
      is24Hours: is24Hours === 'true' || is24Hours === '1',
      query: query as string,
      sortBy: sortBy as any,
      limit: limit ? parseInt(limit as string, 10) : 60,
    });

    if (format === 'full') {
      return res.json(result);
    }

    return res.json(result.places);
  } catch (error) {
    console.error('Fetch nearby services error:', error);
    return res.status(500).json({ error: 'Failed to fetch nearby services' });
  }
}

/**
 * Dedicated endpoint for /api/places/nearby with full metadata wrapper
 */
export async function getNearbyPlacesHandler(req: Request, res: Response) {
  try {
    const {
      lat,
      lng,
      category,
      subCategory,
      cityId,
      strictCityFilter,
      radiusKm,
      openNow,
      is24Hours,
      query,
      sortBy,
      limit,
    } = req.query;

    const userLat = lat ? parseFloat(lat as string) : 28.6139;
    const userLng = lng ? parseFloat(lng as string) : 77.2090;
    const parsedRadius = radiusKm ? Math.max(0.5, Math.min(50, parseFloat(radiusKm as string))) : 5;

    const result = await placesService.searchNearbyPlaces({
      lat: userLat,
      lng: userLng,
      category: (category as string) || 'ALL',
      subCategory: subCategory as string,
      cityId: cityId as string,
      strictCityFilter: strictCityFilter === 'true',
      radiusKm: parsedRadius,
      openNow: openNow === 'true' || openNow === '1',
      is24Hours: is24Hours === 'true' || is24Hours === '1',
      query: query as string,
      sortBy: (sortBy as any) || 'distance',
      limit: limit ? Math.min(100, parseInt(limit as string, 10)) : 60,
    });

    return res.json(result);
  } catch (error) {
    console.error('getNearbyPlacesHandler error:', error);
    return res.status(500).json({ error: 'Failed to search nearby places' });
  }
}

/**
 * Emergency shortcuts (Nearest Hospital, 24/7 Pharmacy, Trauma, Police, Helplines)
 */
export async function getEmergencyShortcutsHandler(req: Request, res: Response) {
  try {
    const { lat, lng } = req.query;
    const userLat = lat ? parseFloat(lat as string) : 28.6139;
    const userLng = lng ? parseFloat(lng as string) : 77.2090;

    const shortcuts = await placesService.getEmergencyShortcuts(userLat, userLng);
    return res.json(shortcuts);
  } catch (error) {
    console.error('getEmergencyShortcutsHandler error:', error);
    return res.status(500).json({ error: 'Failed to resolve emergency shortcuts' });
  }
}

/**
 * Full Source & Destination Route Planner + Safety + Multi-Modal Fares
 */
export async function planCompleteRouteHandler(req: Request, res: Response) {
  try {
    const {
      origin,
      destination,
      travelMode,
      avoidTolls,
      avoidHighways,
      travelHour,
      waitingMins,
      hasLuggage,
    } = req.body;

    if (
      !origin ||
      !destination ||
      !isValidCoordinate(origin.lat, origin.lng) ||
      !isValidCoordinate(destination.lat, destination.lng)
    ) {
      return res.status(400).json({
        error: 'Valid origin and destination coordinates (lat/lng within bounds) are required.',
      });
    }

    const result = await placesService.planCompleteRoute({
      origin: { lat: Number(origin.lat), lng: Number(origin.lng), name: origin.name },
      destination: { lat: Number(destination.lat), lng: Number(destination.lng), name: destination.name },
      travelMode: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'].includes(travelMode) ? travelMode : 'DRIVE',
      avoidTolls: Boolean(avoidTolls),
      avoidHighways: Boolean(avoidHighways),
      travelHour: travelHour !== undefined ? parseInt(travelHour, 10) : undefined,
      waitingMins: waitingMins !== undefined ? Math.max(0, parseInt(waitingMins, 10)) : 0,
      hasLuggage: Boolean(hasLuggage),
    });

    return res.json(result);
  } catch (error) {
    console.error('planCompleteRouteHandler error:', error);
    return res.status(500).json({ error: 'Failed to plan route' });
  }
}

/**
 * Multimodal Transport & Fare Estimation Comparator between any two locations
 */
export async function getMultimodalFaresHandler(req: Request, res: Response) {
  try {
    const {
      origin,
      destination,
      cityName,
      travelHour,
      explicitRoadDistanceKm,
      waitingMins,
      hasLuggage,
      tollAmount,
    } = req.body;

    if (
      !origin ||
      !destination ||
      !isValidCoordinate(origin.lat, origin.lng) ||
      !isValidCoordinate(destination.lat, destination.lng)
    ) {
      return res.status(400).json({ error: 'Valid origin and destination coordinates are required' });
    }

    const comparison = await placesService.calculateMultimodalFares({
      origin: { lat: Number(origin.lat), lng: Number(origin.lng), name: origin.name },
      destination: { lat: Number(destination.lat), lng: Number(destination.lng), name: destination.name },
      cityName,
      travelHour: travelHour !== undefined ? parseInt(travelHour, 10) : undefined,
      explicitRoadDistanceKm: explicitRoadDistanceKm ? Number(explicitRoadDistanceKm) : undefined,
      waitingMins: waitingMins !== undefined ? Math.max(0, parseInt(waitingMins, 10)) : 0,
      hasLuggage: Boolean(hasLuggage),
      tollAmount: tollAmount ? Number(tollAmount) : 0,
    });

    return res.json(comparison);
  } catch (error) {
    console.error('getMultimodalFaresHandler error:', error);
    return res.status(500).json({ error: 'Failed to calculate multimodal fares' });
  }
}

/**
 * Saved Places Bookmarks Handlers
 */
export async function savePlaceHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to save places' });
    }

    const { placeId, name, category, address, lat, lng, phone, notes } = req.body;
    if (!name || !isValidCoordinate(lat, lng)) {
      return res.status(400).json({ error: 'Valid name, lat, and lng are required' });
    }

    const saved = await placesService.savePlace(userId, {
      placeId,
      name: String(name).slice(0, 200),
      category: String(category || 'GENERAL').slice(0, 50),
      address: String(address || '').slice(0, 400),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      phone,
      notes,
    });

    return res.status(201).json({ success: true, savedPlace: saved });
  } catch (error) {
    console.error('savePlaceHandler error:', error);
    return res.status(500).json({ error: 'Failed to save place' });
  }
}

export async function getSavedPlacesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const savedPlaces = await placesService.getSavedPlaces(userId);
    return res.json({ savedPlaces });
  } catch (error) {
    console.error('getSavedPlacesHandler error:', error);
    return res.status(500).json({ error: 'Failed to retrieve saved places' });
  }
}

export async function deleteSavedPlaceHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await placesService.deleteSavedPlace(userId, id);
    return res.json({ success: true });
  } catch (error) {
    console.error('deleteSavedPlaceHandler error:', error);
    return res.status(500).json({ error: 'Failed to delete saved place' });
  }
}

/**
 * Saved Routes Bookmarks Handlers
 */
export async function saveRouteHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to save routes' });
    }

    const { originName, destName, originLat, originLng, destLat, destLng, distanceKm, travelMode, estimatedMinutes } = req.body;
    if (
      !originName ||
      !destName ||
      !isValidCoordinate(originLat, originLng) ||
      !isValidCoordinate(destLat, destLng)
    ) {
      return res.status(400).json({ error: 'Valid origin and destination details are required' });
    }

    const savedRoute = await placesService.saveRoute(userId, {
      originName: String(originName).slice(0, 200),
      destName: String(destName).slice(0, 200),
      originLat: parseFloat(originLat),
      originLng: parseFloat(originLng),
      destLat: parseFloat(destLat),
      destLng: parseFloat(destLng),
      distanceKm: parseFloat(distanceKm) || 0,
      travelMode: String(travelMode || 'DRIVE'),
      estimatedMinutes: parseInt(estimatedMinutes, 10) || 10,
    });

    return res.status(201).json({ success: true, savedRoute });
  } catch (error) {
    console.error('saveRouteHandler error:', error);
    return res.status(500).json({ error: 'Failed to save route' });
  }
}

export async function getSavedRoutesHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const savedRoutes = await placesService.getSavedRoutes(userId);
    return res.json({ savedRoutes });
  } catch (error) {
    console.error('getSavedRoutesHandler error:', error);
    return res.status(500).json({ error: 'Failed to retrieve saved routes' });
  }
}

export async function deleteSavedRouteHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await placesService.deleteSavedRoute(userId, id);
    return res.json({ success: true });
  } catch (error) {
    console.error('deleteSavedRouteHandler error:', error);
    return res.status(500).json({ error: 'Failed to delete saved route' });
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
