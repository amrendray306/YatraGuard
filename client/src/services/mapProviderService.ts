export interface MapProvider {
  id: string;
  name: string;
  category: 'street' | 'standard' | 'light' | 'terrain';
  url: string;
  attribution: string;
  subdomains?: string[] | string;
  maxZoom?: number;
  description: string;
}

export const MAP_PROVIDERS: MapProvider[] = [
  {
    id: 'carto-voyager',
    name: 'CARTO Voyager (Primary)',
    category: 'street',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    description: 'High-contrast vibrant tourism and safety styling',
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap (Fallback 1)',
    category: 'standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
    description: 'Global crowdsourced map baseline, highly resilient',
  },
  {
    id: 'carto-positron',
    name: 'CARTO Positron (Fallback 2)',
    category: 'light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    description: 'Clean minimalist backdrop prioritizing incident pins',
  },
  {
    id: 'opentopomap',
    name: 'OpenTopoMap (Terrain)',
    category: 'terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: 'abc',
    maxZoom: 17,
    description: 'Topographic contours and mountain terrain for hill stations',
  },
];

// In-memory tracking of error counts per provider to avoid infinite ping-pong loops
const failureCounts: Record<string, number> = {};
let lastSwitchTimestamp = 0;

export const mapProviderService = {
  getAllProviders(): MapProvider[] {
    return MAP_PROVIDERS;
  },

  getProviderById(id: string): MapProvider {
    return MAP_PROVIDERS.find((p) => p.id === id) || MAP_PROVIDERS[0];
  },

  getDefaultProvider(): MapProvider {
    return MAP_PROVIDERS[0];
  },

  recordTileError(providerId: string): boolean {
    const now = Date.now();
    failureCounts[providerId] = (failureCounts[providerId] || 0) + 1;

    // Trigger switch if multiple tile errors arrive within short window (e.g., 3+ tile failures)
    // and we haven't switched within the last 5 seconds to avoid cascading flips
    if (failureCounts[providerId] >= 3 && now - lastSwitchTimestamp > 5000) {
      lastSwitchTimestamp = now;
      return true; // Recommends switching to next fallback provider
    }
    return false;
  },

  getNextFallbackProvider(currentId: string): MapProvider {
    const currentIndex = MAP_PROVIDERS.findIndex((p) => p.id === currentId);
    const nextIndex = (currentIndex + 1) % MAP_PROVIDERS.length;
    return MAP_PROVIDERS[nextIndex];
  },

  resetErrorCount(providerId: string) {
    failureCounts[providerId] = 0;
  },
};
