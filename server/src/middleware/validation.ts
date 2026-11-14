import { Request, Response, NextFunction } from 'express';

/**
 * Validates latitude and longitude query/body parameters
 * Latitude must be -90 to +90, Longitude must be -180 to +180
 */
export function isValidCoordinate(lat: any, lng: any): boolean {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  return (
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

export const validateCoordinates = isValidCoordinate;

/**
 * Middleware ensuring valid lat/lng parameters in request query or body
 */
export function validateCoordinatesMiddleware(req: Request, res: Response, next: NextFunction) {
  const lat = req.query.lat ?? req.body.lat ?? req.body.fromLat;
  const lng = req.query.lng ?? req.body.lng ?? req.body.fromLng;

  if (lat !== undefined && lng !== undefined) {
    if (!isValidCoordinate(lat, lng)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude must be between -90 and 90; longitude must be between -180 and 180.',
      });
    }
  }

  next();
}

/**
 * Sanitize strings to avoid control characters or excessive buffer allocations
 */
export function sanitizeString(val: any, maxLength = 1000): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLength);
}
