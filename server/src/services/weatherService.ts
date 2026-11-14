import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  rainChance: number;
  humidity: number;
  windKmh: number;
  alertMessage?: string;
  severity?: string;
}

export async function getCityWeather(cityId: string, cityName?: string): Promise<WeatherData> {
  const alert = await prisma.weatherAlert.findFirst({
    where: { cityId },
    include: { city: true },
  });

  if (alert) {
    return {
      city: alert.city.name,
      temp: alert.temp,
      condition: alert.condition,
      rainChance: alert.rainChance,
      humidity: alert.humidity,
      windKmh: alert.windKmh,
      alertMessage: alert.alertMessage || undefined,
      severity: alert.severity || undefined,
    };
  }

  // Fallback default
  return {
    city: cityName || 'Agra',
    temp: 29,
    condition: 'Partly Sunny',
    rainChance: 15,
    humidity: 50,
    windKmh: 12,
    alertMessage: 'Normal travel weather. Keep hydrated.',
    severity: 'LOW',
  };
}
