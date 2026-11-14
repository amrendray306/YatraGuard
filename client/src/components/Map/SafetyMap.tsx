import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Shield,
  HeartPulse,
  Pill,
  Bus,
  AlertTriangle,
  Flame,
  Filter,
  Layers,
  MapPin,
  Utensils,
  Hotel,
  Landmark,
  Crosshair,
  Compass,
} from 'lucide-react';
import { MapCard } from './MapCard';

// Component to dynamically re-center map when city or coords change
function ChangeMapView({ coords, zoom }: { coords: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, zoom || map.getZoom(), { animate: true });
  }, [coords, zoom, map]);
  return null;
}

// Custom Leaflet DivIcons with color-coded pins
const createCustomPin = (bgColor: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        border: 2px solid #ffffff;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 14px;
          font-weight: bold;
          line-height: 1;
        ">${symbol}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const userIcon = L.divIcon({
  className: 'user-beacon',
  html: `
    <div style="position: relative; width: 26px; height: 26px;">
      <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: #3B82F6; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 18px; height: 18px; border-radius: 50%; background: #2563EB; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.9);"></div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Category Pin Definitions
const hospitalIcon = createCustomPin('#10B981', '🏥');
const policeIcon = createCustomPin('#3B82F6', '👮');
const pharmacyIcon = createCustomPin('#8B5CF6', '💊');
const transportIcon = createCustomPin('#06B6D4', '🚇');
const touristIcon = createCustomPin('#6366F1', '🏛️');
const hotelIcon = createCustomPin('#F59E0B', '🏨');
const restaurantIcon = createCustomPin('#F43F5E', '🍽️');
const scamIcon = createCustomPin('#EAB308', '⚠️');
const incidentIcon = createCustomPin('#EF4444', '🚨');

interface SafetyMapProps {
  center: [number, number];
  services: any[];
  incidents: any[];
  scams: any[];
  safetyZones: any[];
  userLocation?: [number, number];
  height?: string;
  onLocateMe?: () => void;
  onCheckFare?: (placeName: string) => void;
}

export const SafetyMap: React.FC<SafetyMapProps> = ({
  center,
  services,
  incidents,
  scams,
  safetyZones,
  userLocation,
  height = 'calc(100vh - 4rem)',
  onLocateMe,
  onCheckFare,
}) => {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Active layers state (Multi-layer toggle)
  const [activeLayers, setActiveLayers] = useState<{
    hospitals: boolean;
    police: boolean;
    pharmacies: boolean;
    transport: boolean;
    attractions: boolean;
    hotels: boolean;
    restaurants: boolean;
    scams: boolean;
    incidents: boolean;
    safetyZones: boolean;
  }>({
    hospitals: true,
    police: true,
    pharmacies: true,
    transport: true,
    attractions: true,
    hotels: true,
    restaurants: true,
    scams: true,
    incidents: true,
    safetyZones: true,
  });

  const toggleLayer = (layerKey: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const setAllLayers = (enabled: boolean) => {
    setActiveLayers({
      hospitals: enabled,
      police: enabled,
      pharmacies: enabled,
      transport: enabled,
      attractions: enabled,
      hotels: enabled,
      restaurants: enabled,
      scams: enabled,
      incidents: enabled,
      safetyZones: enabled,
    });
  };

  // Filter services by category according to active layers
  const visibleServices = services.filter((s) => {
    if (s.category === 'HOSPITAL') return activeLayers.hospitals;
    if (s.category === 'POLICE') return activeLayers.police;
    if (s.category === 'PHARMACY') return activeLayers.pharmacies;
    if (s.category === 'TRANSPORT') return activeLayers.transport;
    if (s.category === 'TOURIST_INFO') return activeLayers.attractions;
    if (s.category === 'HOTEL') return activeLayers.hotels;
    if (s.category === 'RESTAURANT') return activeLayers.restaurants;
    return true;
  });

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      {/* Dynamic Layer Toggle Bar */}
      <div className="absolute top-4 left-4 z-[999] flex flex-wrap items-center gap-1.5 max-w-[92%] sm:max-w-3xl bg-slate-950/85 p-2 rounded-2xl backdrop-blur-md border border-slate-800 shadow-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setAllLayers(true)}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1 flex-shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>All Layers</span>
        </button>

        {[
          { key: 'safetyZones' as const, label: 'Safety Zones', color: 'bg-emerald-600', icon: '🛡️' },
          { key: 'police' as const, label: 'Police', color: 'bg-blue-600', icon: '👮' },
          { key: 'hospitals' as const, label: 'Hospitals', color: 'bg-emerald-600', icon: '🏥' },
          { key: 'pharmacies' as const, label: 'Pharmacies', color: 'bg-purple-600', icon: '💊' },
          { key: 'transport' as const, label: 'Transit', color: 'bg-cyan-600', icon: '🚇' },
          { key: 'attractions' as const, label: 'Attractions', color: 'bg-indigo-600', icon: '🏛️' },
          { key: 'hotels' as const, label: 'Hotels', color: 'bg-amber-600', icon: '🏨' },
          { key: 'restaurants' as const, label: 'Dining', color: 'bg-rose-600', icon: '🍽️' },
          { key: 'scams' as const, label: 'Scams', color: 'bg-amber-500', icon: '⚠️' },
          { key: 'incidents' as const, label: 'Incidents', color: 'bg-red-600', icon: '🚨' },
        ].map((layer) => {
          const isActive = activeLayers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 ${
                isActive
                  ? `${layer.color} text-white shadow-md`
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{layer.icon}</span>
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* Floating GPS Locate Button */}
      {onLocateMe && (
        <button
          onClick={onLocateMe}
          className="absolute bottom-6 right-6 z-[999] p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-2xl border border-blue-400/40 transition-transform active:scale-90 flex items-center gap-2 text-xs font-bold"
          title="Locate my GPS position"
        >
          <Crosshair className="w-5 h-5 animate-pulse" />
          <span className="hidden sm:inline">Locate Me</span>
        </button>
      )}

      {/* Leaflet Map Engine */}
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <ChangeMapView coords={center} />

        {/* Dark Mode Voyager Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* User GPS Location Beacon */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-blue-600">📍 You are here</strong>
                <div className="text-slate-600 text-[10px]">Active GPS Monitoring</div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Safety Zones & Heatmap Rings */}
        {activeLayers.safetyZones &&
          safetyZones.map((zone) => {
            const isGood = zone.riskTier === 'VERY_GOOD' || zone.riskTier === 'GOOD';
            const isModerate = zone.riskTier === 'ACCEPTABLE' || zone.riskTier === 'MODERATE';
            const color = isGood ? '#10B981' : isModerate ? '#F59E0B' : '#EF4444';

            return (
              <Circle
                key={zone.id}
                center={[zone.lat, zone.lng]}
                radius={zone.radiusKm * 1000}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isGood ? 0.12 : 0.18,
                  weight: 2,
                  dashArray: isGood ? undefined : '5, 8',
                }}
              >
                <Popup>
                  <div className="p-1 text-xs">
                    <div className="font-extrabold text-slate-800">🛡️ {zone.name}</div>
                    <div className="text-[11px] text-slate-600 font-bold mt-0.5">
                      Risk Tier: <span style={{ color }}>{zone.riskTier}</span> (Score: {zone.score}/100)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{zone.reason}</div>
                    {zone.timeHazard && (
                      <div className="text-[10px] text-amber-700 font-bold mt-1 bg-amber-50 p-1 rounded">
                        ⚠️ {zone.timeHazard}
                      </div>
                    )}
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* Location Services Markers */}
        {visibleServices.map((service) => {
          let icon = hospitalIcon;
          if (service.category === 'POLICE') icon = policeIcon;
          if (service.category === 'PHARMACY') icon = pharmacyIcon;
          if (service.category === 'TRANSPORT') icon = transportIcon;
          if (service.category === 'TOURIST_INFO') icon = touristIcon;
          if (service.category === 'HOTEL') icon = hotelIcon;
          if (service.category === 'RESTAURANT') icon = restaurantIcon;

          return (
            <Marker
              key={service.id}
              position={[service.lat, service.lng]}
              icon={icon}
              eventHandlers={{
                click: () => setSelectedItem(service),
              }}
            >
              <Popup>
                <div className="text-xs p-0.5 font-bold text-slate-800">
                  {service.name}
                  <div className="text-[10px] font-normal text-slate-500">{service.category}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Scam Alerts Markers */}
        {activeLayers.scams &&
          scams.map((scam) => (
            <Marker
              key={scam.id}
              position={[scam.lat, scam.lng]}
              icon={scamIcon}
              eventHandlers={{
                click: () =>
                  setSelectedItem({
                    ...scam,
                    category: 'SCAM_ALERT',
                    name: scam.title,
                  }),
              }}
            />
          ))}

        {/* Incident Hotspots Markers */}
        {activeLayers.incidents &&
          incidents.map((incident) => (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={incidentIcon}
              eventHandlers={{
                click: () =>
                  setSelectedItem({
                    ...incident,
                    category: 'INCIDENT_ALERT',
                    name: incident.title,
                  }),
              }}
            />
          ))}
      </MapContainer>

      {/* Selected Marker Detail Card */}
      {selectedItem && (
        <MapCard
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onCheckFare={onCheckFare}
        />
      )}
    </div>
  );
};
