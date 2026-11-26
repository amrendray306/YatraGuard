import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  CloudRain,
  Wind,
  Droplets,
  Sun,
  Thermometer,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Search,
  Crosshair,
  Clock,
  CheckCircle2,
  Snowflake,
  CloudFog,
  Zap,
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useToast } from '../context/ToastContext';
import { fetchWeather } from '../services/api';
import { WeatherData, DailyForecastItem } from '../types';
import { PageHeader, StatCard, LoadingSkeleton } from '../components/ui';

interface WeatherPageProps {
  onNavigateToAlerts?: () => void;
  onNavigateToTrips?: () => void;
}

export const WeatherPage: React.FC<WeatherPageProps> = ({
  onNavigateToAlerts,
  onNavigateToTrips,
}) => {
  const { cities, currentCity, setCity, userCoords, gpsStatus, requestUserLocation } = useCity();
  const { showToast } = useToast();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customSearch, setCustomSearch] = useState('');
  const [usingGps, setUsingGps] = useState(false);

  const loadWeather = async (opts?: {
    cityId?: string;
    cityName?: string;
    lat?: number;
    lng?: number;
    refresh?: boolean;
  }) => {
    const isManual = opts?.refresh;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchWeather(opts?.cityId, opts?.cityName, {
        lat: opts?.lat,
        lng: opts?.lng,
        refresh: opts?.refresh,
      });
      setWeather(data);
      if (isManual) showToast('Weather forecast updated', 'success');
    } catch (err) {
      console.error('Weather fetch failed:', err);
      showToast('Could not refresh live forecast', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!usingGps && currentCity) {
      loadWeather({ cityId: currentCity.id, cityName: currentCity.name });
    }
  }, [currentCity?.id, usingGps]);

  const handleCitySelect = (id: string) => {
    setUsingGps(false);
    setCustomSearch('');
    const found = cities.find((c) => c.id === id);
    if (found) setCity(found);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearch.trim()) return;
    setUsingGps(false);
    loadWeather({ cityName: customSearch.trim(), refresh: true });
  };

  const handleUseGps = () => {
    setUsingGps(true);
    requestUserLocation(true);
    loadWeather({
      cityName: 'Current GPS Location',
      lat: userCoords.lat,
      lng: userCoords.lng,
      refresh: true,
    });
  };

  const renderConditionIcon = (condition: string, sizeClass = 'w-6 h-6') => {
    const c = condition.toLowerCase();
    if (c.includes('thunder')) return <Zap className={`${sizeClass} text-amber-500`} aria-hidden="true" />;
    if (c.includes('snow')) return <Snowflake className={`${sizeClass} text-sky-400`} aria-hidden="true" />;
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) {
      return <CloudRain className={`${sizeClass} text-sky-500`} aria-hidden="true" />;
    }
    if (c.includes('fog')) return <CloudFog className={`${sizeClass} text-slate-400`} aria-hidden="true" />;
    if (c.includes('clear') || c.includes('sunny')) {
      return <Sun className={`${sizeClass} text-amber-500`} aria-hidden="true" />;
    }
    return <CloudSun className={`${sizeClass} text-amber-500`} aria-hidden="true" />;
  };

  const severityStyles = (sev?: string) => {
    switch (sev) {
      case 'HIGH':
        return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-200';
      case 'MODERATE':
        return 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200';
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/35 dark:border-emerald-800/60 dark:text-emerald-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 space-y-6 yg-page-enter">
      <PageHeader
        eyebrow="Open-Meteo Weather Intelligence"
        icon={CloudSun}
        accentColor="amber"
        title="Live Destination Weather & Advisories"
        description="Real-time weather, rain & wind alerts, and 5-day destination forecasts with cached offline resilience."
        actions={
          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              loadWeather({
                cityId: usingGps ? undefined : currentCity?.id,
                cityName: customSearch.trim() || (usingGps ? 'Current GPS Location' : currentCity?.name),
                lat: usingGps ? userCoords.lat : undefined,
                lng: usingGps ? userCoords.lng : undefined,
                refresh: true,
              })
            }
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-2 transition-colors keep-white yg-press"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Forecast'}</span>
          </button>
        }
      />

      {/* City Selector, Custom Search & GPS Toggle */}
      <div className="yg-card p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Monitored Travel Hub
          </label>
          <select
            value={usingGps ? '' : currentCity?.id || ''}
            onChange={(e) => handleCitySelect(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
          >
            {usingGps && <option value="">Using Live GPS ({userCoords.lat.toFixed(2)}, {userCoords.lng.toFixed(2)})</option>}
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.state}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCustomSearch} className="md:col-span-5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Any Other Indian / Global Destination
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={customSearch}
              onChange={(e) => setCustomSearch(e.target.value)}
              placeholder="e.g. Kedarnath, Leh, Darjeeling, Munnar..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-20 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold hover:bg-slate-700"
            >
              Check
            </button>
          </div>
        </form>

        <div className="md:col-span-3 flex flex-col justify-end">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            GPS Coordinates
          </span>
          <button
            type="button"
            onClick={handleUseGps}
            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              usingGps
                ? 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-800'
            }`}
          >
            <Crosshair className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Use My GPS Location</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : weather ? (
        <>
          {/* Source & Freshness Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
              <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>{weather.city}</span>
              {weather.lat !== undefined && weather.lng !== undefined && (
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  ({weather.lat.toFixed(2)}, {weather.lng.toFixed(2)})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  weather.sourceType === 'LIVE_OPEN_METEO'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : weather.sourceType === 'DB_CACHE'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                {weather.sourceName || 'Weather Forecast'}
              </span>
              {weather.updatedAt && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  Updated {new Date(weather.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Current Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Temperature"
              value={`${weather.temp}°C`}
              subtext={
                weather.feelsLike !== undefined
                  ? `Feels like ${weather.feelsLike}°C • ${weather.condition}`
                  : weather.condition
              }
              icon={Thermometer}
              accentColor="amber"
            />
            <StatCard
              title="Rain Probability"
              value={`${weather.rainChance}%`}
              subtext={weather.rainChance >= 50 ? 'Carry rain protection' : 'Low precipitation risk'}
              icon={CloudRain}
              accentColor="blue"
            />
            <StatCard
              title="Wind Speed"
              value={`${weather.windKmh} km/h`}
              subtext={weather.windKmh >= 35 ? 'Strong gusts expected' : 'Calm to moderate breeze'}
              icon={Wind}
              accentColor="teal"
            />
            <StatCard
              title="Humidity"
              value={`${weather.humidity}%`}
              subtext={
                weather.uvIndexMax !== undefined ? `Peak UV Index: ${weather.uvIndexMax}` : 'Relative humidity'
              }
              icon={Droplets}
              accentColor="purple"
            />
          </div>

          {/* Travel Advisory Banner */}
          {weather.alertMessage && (
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${severityStyles(weather.severity)}`}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 flex-shrink-0">
                  {weather.severity === 'HIGH' || weather.severity === 'MODERATE' ? (
                    <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      {weather.severity || 'LOW'} Weather Travel Advisory
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium mt-0.5">{weather.alertMessage}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {onNavigateToAlerts && (
                  <button
                    type="button"
                    onClick={onNavigateToAlerts}
                    className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-white transition-colors"
                  >
                    View Risk Alerts
                  </button>
                )}
                {onNavigateToTrips && (
                  <button
                    type="button"
                    onClick={onNavigateToTrips}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold keep-white transition-colors"
                  >
                    Plan Trip Here
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 5-Day Forecast Strip */}
          {weather.forecast && weather.forecast.length > 0 && (
            <section className="yg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">5-Day Destination Forecast</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Daily temperature range, precipitation risk, and transit weather rating.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {weather.forecast.map((day: DailyForecastItem) => (
                  <div
                    key={day.date}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{day.dayLabel}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          day.severity === 'HIGH'
                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                            : day.severity === 'MODERATE'
                            ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {day.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {renderConditionIcon(day.condition, 'w-7 h-7')}
                      <div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {day.tempMax}° / {day.tempMin}°C
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">{day.condition}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-sky-500" aria-hidden="true" />
                        {day.rainChance}% rain
                      </span>
                      <span className="flex items-center gap-1 justify-end">
                        <Wind className="w-3 h-3 text-teal-500" aria-hidden="true" />
                        {day.windMaxKmh} km/h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
};
