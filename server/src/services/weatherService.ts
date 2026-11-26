import { prisma } from '../lib/prisma.js';

export interface DailyForecastItem {
  date: string;
  dayLabel: string;
  condition: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainChance: number;
  windMaxKmh: number;
  uvIndexMax?: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface WeatherData {
  city: string;
  cityId?: string;
  temp: number;
  feelsLike?: number;
  condition: string;
  weatherCode?: number;
  rainChance: number;
  humidity: number;
  windKmh: number;
  uvIndexMax?: number;
  alertMessage?: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH';
  sourceName: string;
  sourceType: 'LIVE_OPEN_METEO' | 'DB_CACHE' | 'UNAVAILABLE_FALLBACK';
  isCached: boolean;
  updatedAt: string;
  lat?: number;
  lng?: number;
  forecast?: DailyForecastItem[];
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function mapWmoWeatherCode(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Dense Fog';
  if (code >= 51 && code <= 55) return 'Light Drizzle';
  if (code === 56 || code === 57) return 'Freezing Drizzle';
  if (code >= 61 && code <= 63) return 'Rain Showers';
  if (code === 65 || code === 66 || code === 67) return 'Heavy Rain';
  if (code >= 71 && code <= 77) return 'Snowfall';
  if (code >= 80 && code <= 82) return 'Heavy Rain Showers';
  if (code === 85 || code === 86) return 'Snow Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Partly Cloudy';
}

function deriveAdvisory(params: {
  temp: number;
  rainChance: number;
  windKmh: number;
  weatherCode: number;
}): { severity: 'LOW' | 'MODERATE' | 'HIGH'; alertMessage: string } {
  const { temp, rainChance, windKmh, weatherCode } = params;

  if (weatherCode >= 95 || weatherCode === 65 || weatherCode === 82 || rainChance >= 75 || windKmh >= 45) {
    return {
      severity: 'HIGH',
      alertMessage:
        'Severe Weather Advisory: Expect heavy rainfall, strong gusts, or thunderstorms. Avoid mountain slopes, flooded underpasses, and exposed transit.',
    };
  }
  if (weatherCode >= 71 && weatherCode <= 86) {
    return {
      severity: temp <= 2 ? 'HIGH' : 'MODERATE',
      alertMessage:
        'Mountain Snow/Ice Advisory: Possible slippery roads and pass delays. Carry thermal layers and verify highway status.',
    };
  }
  if (weatherCode === 45 || weatherCode === 48) {
    return {
      severity: 'MODERATE',
      alertMessage:
        'Low Visibility Fog Advisory: Allow extra transit time and prefer main highways during early morning or late night.',
    };
  }
  if (temp >= 40) {
    return {
      severity: 'HIGH',
      alertMessage:
        'Extreme Heat Advisory: Avoid midday sun (12 PM – 4 PM), carry ORS/water, and opt for AC/shaded transport.',
    };
  }
  if (temp >= 35) {
    return {
      severity: 'MODERATE',
      alertMessage: 'Warm Weather Notice: Stay hydrated and carry sun protection during outdoor sightseeing.',
    };
  }
  if (rainChance >= 40 || (weatherCode >= 51 && weatherCode <= 63)) {
    return {
      severity: 'MODERATE',
      alertMessage: 'Rain Likely: Carry waterproof gear and factor potential traffic delays into fare estimates.',
    };
  }
  if (temp <= 5) {
    return {
      severity: 'MODERATE',
      alertMessage: 'Cold Weather Notice: Temperatures drop sharply after sunset. Pack insulated layers.',
    };
  }
  return {
    severity: 'LOW',
    alertMessage: 'Favorable travel weather conditions for sightseeing and road transit.',
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 5000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeCityViaOpenMeteo(cityName: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName
    )}&count=1&language=en&format=json`;
    const json = await fetchJsonWithTimeout(url, 4000);
    const hit = json?.results?.[0];
    if (hit && typeof hit.latitude === 'number' && typeof hit.longitude === 'number') {
      return { lat: hit.latitude, lng: hit.longitude, name: hit.name || cityName };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCityWeather(
  cityId?: string,
  cityName?: string,
  opts?: { lat?: number; lng?: number; forceRefresh?: boolean }
): Promise<WeatherData> {
  let cityRecord: any = null;
  if (cityId && cityId !== 'default') {
    cityRecord = await prisma.city.findUnique({ where: { id: cityId } }).catch(() => null);
  }
  if (!cityRecord && cityName) {
    cityRecord = await prisma.city
      .findFirst({ where: { name: { equals: cityName.trim(), mode: 'insensitive' } } })
      .catch(() => null);
  }

  const resolvedName = cityRecord?.name || cityName || 'Agra';
  let targetLat = opts?.lat ?? cityRecord?.lat;
  let targetLng = opts?.lng ?? cityRecord?.lng;

  // Check cached DB record
  const cachedAlert = cityRecord
    ? await prisma.weatherAlert
        .findFirst({
          where: { cityId: cityRecord.id },
          include: { city: true },
          orderBy: { updatedAt: 'desc' },
        })
        .catch(() => null)
    : null;

  const isFreshLiveCache =
    cachedAlert &&
    !opts?.forceRefresh &&
    opts?.lat === undefined &&
    opts?.lng === undefined &&
    cachedAlert.sourceName?.includes('Open-Meteo') &&
    Array.isArray(cachedAlert.forecastJson) &&
    Date.now() - cachedAlert.updatedAt.getTime() < CACHE_TTL_MS;

  if (isFreshLiveCache && cachedAlert) {
    return {
      city: cachedAlert.city.name,
      cityId: cachedAlert.cityId,
      temp: cachedAlert.temp,
      condition: cachedAlert.condition,
      rainChance: cachedAlert.rainChance,
      humidity: cachedAlert.humidity,
      windKmh: cachedAlert.windKmh,
      alertMessage: cachedAlert.alertMessage || undefined,
      severity: (cachedAlert.severity as WeatherData['severity']) || 'LOW',
      sourceName: 'Open-Meteo Forecast (Cached)',
      sourceType: 'LIVE_OPEN_METEO',
      isCached: true,
      updatedAt: cachedAlert.updatedAt.toISOString(),
      lat: cachedAlert.city.lat,
      lng: cachedAlert.city.lng,
      forecast: (cachedAlert.forecastJson as unknown as DailyForecastItem[]) || [],
    };
  }

  // Geocode if coordinates are missing (e.g. non-seeded city searched by name)
  if ((targetLat === undefined || targetLng === undefined) && resolvedName) {
    const geo = await geocodeCityViaOpenMeteo(resolvedName);
    if (geo) {
      targetLat = geo.lat;
      targetLng = geo.lng;
    }
  }

  // Attempt live Open-Meteo call
  if (typeof targetLat === 'number' && typeof targetLng === 'number') {
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat.toFixed(
        4
      )}&longitude=${targetLng.toFixed(
        4
      )}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=Asia%2FKolkata&forecast_days=5`;

      const om = await fetchJsonWithTimeout(omUrl, 5000);
      const current = om?.current;
      const daily = om?.daily;

      if (current && daily && Array.isArray(daily.time)) {
        const temp = Math.round((current.temperature_2m ?? 28) * 10) / 10;
        const feelsLike = Math.round((current.apparent_temperature ?? temp) * 10) / 10;
        const humidity = Math.round(current.relative_humidity_2m ?? 50);
        const windKmh = Math.round((current.wind_speed_10m ?? 10) * 10) / 10;
        const weatherCode = Number(current.weather_code ?? 1);
        const condition = mapWmoWeatherCode(weatherCode);
        const todayRainChance = Math.round(daily.precipitation_probability_max?.[0] ?? 10);
        const todayUvMax = daily.uv_index_max?.[0] !== undefined ? Math.round(daily.uv_index_max[0] * 10) / 10 : undefined;

        const advisory = deriveAdvisory({
          temp,
          rainChance: todayRainChance,
          windKmh,
          weatherCode,
        });

        const forecast: DailyForecastItem[] = daily.time.map((dateStr: string, idx: number) => {
          const dCode = Number(daily.weather_code?.[idx] ?? 1);
          const dRain = Math.round(daily.precipitation_probability_max?.[idx] ?? 10);
          const dWind = Math.round((daily.wind_speed_10m_max?.[idx] ?? 12) * 10) / 10;
          const dMax = Math.round((daily.temperature_2m_max?.[idx] ?? temp) * 10) / 10;
          const dMin = Math.round((daily.temperature_2m_min?.[idx] ?? temp - 6) * 10) / 10;
          const dUv = daily.uv_index_max?.[idx] !== undefined ? Math.round(daily.uv_index_max[idx] * 10) / 10 : undefined;
          const dayAdv = deriveAdvisory({
            temp: dMax,
            rainChance: dRain,
            windKmh: dWind,
            weatherCode: dCode,
          });
          const dayLabel =
            idx === 0
              ? 'Today'
              : new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                });

          return {
            date: dateStr,
            dayLabel,
            condition: mapWmoWeatherCode(dCode),
            weatherCode: dCode,
            tempMax: dMax,
            tempMin: dMin,
            rainChance: dRain,
            windMaxKmh: dWind,
            uvIndexMax: dUv,
            severity: dayAdv.severity,
          };
        });

        const now = new Date();

        // Persist fresh live forecast to WeatherAlert cache for known DB city
        if (cityRecord) {
          try {
            if (cachedAlert) {
              await prisma.weatherAlert.update({
                where: { id: cachedAlert.id },
                data: {
                  temp,
                  condition,
                  rainChance: todayRainChance,
                  humidity,
                  windKmh,
                  alertMessage: advisory.alertMessage,
                  severity: advisory.severity,
                  sourceName: 'Open-Meteo Forecast',
                  forecastJson: forecast as any,
                  updatedAt: now,
                },
              });
            } else {
              await prisma.weatherAlert.create({
                data: {
                  cityId: cityRecord.id,
                  temp,
                  condition,
                  rainChance: todayRainChance,
                  humidity,
                  windKmh,
                  alertMessage: advisory.alertMessage,
                  severity: advisory.severity,
                  sourceName: 'Open-Meteo Forecast',
                  forecastJson: forecast as any,
                  updatedAt: now,
                },
              });
            }
          } catch (cacheErr) {
            console.warn('Weather cache save skipped:', (cacheErr as Error).message);
          }
        }

        return {
          city: resolvedName,
          cityId: cityRecord?.id,
          temp,
          feelsLike,
          condition,
          weatherCode,
          rainChance: todayRainChance,
          humidity,
          windKmh,
          uvIndexMax: todayUvMax,
          alertMessage: advisory.alertMessage,
          severity: advisory.severity,
          sourceName: 'Open-Meteo Forecast',
          sourceType: 'LIVE_OPEN_METEO',
          isCached: false,
          updatedAt: now.toISOString(),
          lat: targetLat,
          lng: targetLng,
          forecast,
        };
      }
    } catch (omErr) {
      console.warn('Open-Meteo fetch failed, falling back to cache:', (omErr as Error).message);
    }
  }

  // Fallback 1: Return cached DB WeatherAlert
  if (cachedAlert) {
    return {
      city: cachedAlert.city.name,
      cityId: cachedAlert.cityId,
      temp: cachedAlert.temp,
      condition: cachedAlert.condition,
      rainChance: cachedAlert.rainChance,
      humidity: cachedAlert.humidity,
      windKmh: cachedAlert.windKmh,
      alertMessage:
        cachedAlert.alertMessage ||
        'Showing last cached regional weather snapshot (live forecast temporarily unreachable).',
      severity: (cachedAlert.severity as WeatherData['severity']) || 'LOW',
      sourceName: cachedAlert.sourceName || 'Cached Weather Snapshot',
      sourceType: 'DB_CACHE',
      isCached: true,
      updatedAt: cachedAlert.updatedAt.toISOString(),
      lat: cachedAlert.city.lat,
      lng: cachedAlert.city.lng,
      forecast: Array.isArray(cachedAlert.forecastJson)
        ? (cachedAlert.forecastJson as unknown as DailyForecastItem[])
        : undefined,
    };
  }

  // Fallback 2: Honest unavailable fallback (clearly marked as fallback, never claimed live)
  return {
    city: resolvedName,
    cityId: cityRecord?.id,
    temp: 28,
    condition: 'Baseline Estimate',
    rainChance: 15,
    humidity: 50,
    windKmh: 12,
    alertMessage: 'Live weather telemetry unavailable offline. Verify local forecast before mountain or highway travel.',
    severity: 'LOW',
    sourceName: 'Offline Baseline Fallback',
    sourceType: 'UNAVAILABLE_FALLBACK',
    isCached: true,
    updatedAt: new Date().toISOString(),
    lat: targetLat,
    lng: targetLng,
  };
}
