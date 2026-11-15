import React, { useState, useEffect } from 'react';
import { SafetyMap } from '../components/Map/SafetyMap';
import { DestinationSearch } from '../components/DestinationSearch';
import { useCity } from '../context/CityContext';
import { fetchMapData } from '../services/api';
import {
  ShieldAlert,
  PlusCircle,
  RefreshCw,
  Crosshair,
  MapPin,
  Layers,
  Sparkles,
  Navigation,
  Globe,
  SlidersHorizontal,
  CheckCircle2,
  X,
} from 'lucide-react';
import { mapProviderService } from '../services/mapProviderService';

interface MapPageProps {
  openEmergencyModal: () => void;
  openIncidentModal: () => void;
  setCurrentTab?: (tab: string) => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  openEmergencyModal,
  openIncidentModal,
  setCurrentTab,
}) => {
  const {
    cities,
    currentCity,
    setCity,
    userCoords,
    setUserCoords,
    userAddress,
    locationSource,
    locationAccuracy,
    lastLocationUpdate,
    gpsStatus,
    requestUserLocation,
    isReportPinMode,
    setIsReportPinMode,
    reportPin,
    setReportPin,
    dropReportPinAt,
    currentMapProviderId,
    setCurrentMapProviderId,
  } = useCity();

  const [mapData, setMapData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMapData({
        cityId: currentCity?.id,
        lat: userCoords.lat,
        lng: userCoords.lng,
      });
      setMapData(data);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCity, userCoords]);

  const handleLocateMe = async () => {
    await requestUserLocation(true);
  };

  const handleCheckFareToPlace = (placeName: string) => {
    if (setCurrentTab) {
      setCurrentTab('fare');
    }
  };

  // Toggle Report Pin Mode or Open Incident Report Form
  const handleToggleReportPin = async () => {
    if (reportPin) {
      // Pin already placed -> Open incident report form immediately!
      openIncidentModal();
    } else if (isReportPinMode) {
      setIsReportPinMode(false);
    } else {
      setIsReportPinMode(true);
      await dropReportPinAt(userCoords.lat, userCoords.lng);
    }
  };

  const activeProvider = mapProviderService.getProviderById(currentMapProviderId);

  return (
    <div className="relative w-full h-[calc(100dvh-8rem)] md:h-[calc(100dvh-4rem)] overflow-hidden bg-slate-950">
      {/* Top Floating Destination Search & Controls */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-30 pointer-events-none flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Search Bar Container */}
        <div className="w-full md:max-w-md pointer-events-auto">
          <DestinationSearch
            placeholder="Search Indian city, town, or landmark..."
            onSelect={(dest) => {
              if (dest.city) {
                setCity(dest.city);
              }
              setUserCoords({ lat: dest.lat, lng: dest.lng });
            }}
          />
        </div>

        {/* Top Right Quick Action Badges */}
        <div className="flex items-center gap-2 pointer-events-auto self-end md:self-auto flex-wrap justify-end">
          {/* GPS Status Indicator & Accuracy Info */}
          <button
            onClick={handleLocateMe}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-xl border transition-all ${
              gpsStatus === 'granted'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                : gpsStatus === 'locating'
                ? 'bg-blue-950/90 text-blue-300 border-blue-800 animate-pulse'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
            title={
              locationAccuracy
                ? `GPS accuracy ±${Math.round(locationAccuracy)}m (Source: ${locationSource})`
                : 'Request GPS location'
            }
          >
            <Crosshair className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">
              {gpsStatus === 'granted'
                ? `GPS Active ${locationAccuracy ? `(±${Math.round(locationAccuracy)}m)` : ''}`
                : gpsStatus === 'locating'
                ? 'Locating...'
                : 'Locate Me'}
            </span>
          </button>

          {/* Refresh Map */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-700 shadow-xl transition-colors"
            title="Refresh map pins"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Report Pin Toggle Button */}
          <button
            onClick={handleToggleReportPin}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-xl text-xs font-bold border transition-all ${
              reportPin
                ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 ring-2 ring-red-400/30'
                : isReportPinMode
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/90 hover:bg-slate-800 text-amber-400 border-slate-700'
            }`}
            title="Click to place pin or open incident report form"
          >
            <MapPin className="w-4 h-4" />
            <span>{reportPin ? 'View / Submit Pin Form' : isReportPinMode ? 'Pinning Mode ON' : 'Report Pin'}</span>
          </button>

          {/* Emergency SOS Button */}
          <button
            onClick={openEmergencyModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-xl shadow-red-900/40 text-xs font-extrabold transition-all animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>SOS</span>
          </button>
        </div>
      </div>

      {/* Prominent Active Report Pin Card Above Map */}
      {reportPin && (
        <div className="absolute top-20 sm:top-20 right-3 sm:right-4 z-30 max-w-sm w-[calc(100%-1.5rem)] sm:w-auto bg-slate-950/95 backdrop-blur-xl border-2 border-red-500 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-red-600 text-white animate-pulse">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span>📍 Incident Pin Selected</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate max-w-[220px]">
                  {reportPin.address || `[${reportPin.lat.toFixed(4)}, ${reportPin.lng.toFixed(4)}]`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setReportPin(null)}
              className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              title="Remove pin"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={openIncidentModal}
              className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-900/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Fill Report Form</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReportPinMode(!isReportPinMode)}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              {isReportPinMode ? 'Done Moving' : 'Move Pin'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Destination Corridor Pills (Floating under Search on desktop) */}
      <div className="absolute top-20 left-4 z-20 hidden sm:flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl max-w-xl overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-black uppercase text-amber-400 px-2 flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3" /> Quick Switch:
        </span>
        {[
          'Manali',
          'Shimla',
          'Rishikesh',
          'Haridwar',
          'Jaipur',
          'Goa',
          'Leh',
          'Dehradun',
          'Delhi',
          'Mumbai',
          'Agra',
          'Varanasi',
        ].map((cityName) => (
          <button
            key={cityName}
            onClick={() => {
              const targetCity = cities.find(
                (c) => c.name.toLowerCase() === cityName.toLowerCase()
              );
              if (targetCity) {
                setCity(targetCity);
                setUserCoords({ lat: targetCity.lat, lng: targetCity.lng });
              }
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 ${
              currentCity?.name.toLowerCase() === cityName.toLowerCase()
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cityName}
          </button>
        ))}
      </div>

      {/* Interactive Leaflet Safety Map Engine */}
      <SafetyMap
        center={[userCoords.lat, userCoords.lng]}
        services={mapData?.services || []}
        incidents={mapData?.incidents || []}
        scams={mapData?.scams || []}
        safetyZones={mapData?.safetyZones || []}
        userLocation={[userCoords.lat, userCoords.lng]}
        height="100%"
        onLocateMe={handleLocateMe}
        onCheckFare={handleCheckFareToPlace}
        onOpenIncidentModalWithPin={(pin) => {
          openIncidentModal();
        }}
      />
    </div>
  );
};
