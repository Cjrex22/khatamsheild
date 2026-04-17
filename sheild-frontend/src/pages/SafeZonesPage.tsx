// Safe Zones — uses Overpass API (OpenStreetMap) for free nearby place search.
// No API key required. Falls back between multiple Overpass servers for reliability.

import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    RefreshCw, List, Map as MapIcon, AlertCircle, ArrowLeft, Clock, Phone
} from 'lucide-react';

const SafeZonesMap = lazy(() => import('../components/SafeZonesMap'));

// ─── Types ──────────────────────────────────────────────────────────────────
interface PlaceResult {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    lat: number;
    lng: number;
    distanceKm: number;
    openNow: boolean | null;
    googleMapsUri: string | null;
    category: 'police' | 'hospital' | 'helpline';
    rating: number | null;
}

type FilterType = 'ALL' | 'POLICE' | 'HOSPITAL' | 'HELPLINE';

// ─── Haversine distance (km) ────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180)
            * Math.cos(lat2 * Math.PI / 180)
            * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Static helplines ───────────────────────────────────────────────────────
const HELPLINES: PlaceResult[] = [
    { id: 'hl-1', name: 'Women Helpline',     phone: '1091', category: 'helpline', address: 'National Women Helpline — India', lat: 0, lng: 0, distanceKm: 0, openNow: true, googleMapsUri: null, rating: null },
    { id: 'hl-2', name: 'Police Emergency',   phone: '100',  category: 'helpline', address: 'Police Control Room — India',    lat: 0, lng: 0, distanceKm: 0, openNow: true, googleMapsUri: null, rating: null },
    { id: 'hl-3', name: 'Ambulance',          phone: '108',  category: 'helpline', address: 'Emergency Medical Services',      lat: 0, lng: 0, distanceKm: 0, openNow: true, googleMapsUri: null, rating: null },
    { id: 'hl-4', name: 'National Emergency', phone: '112',  category: 'helpline', address: 'Unified Emergency Number — India',lat: 0, lng: 0, distanceKm: 0, openNow: true, googleMapsUri: null, rating: null },
    { id: 'hl-5', name: 'Domestic Violence',  phone: '181',  category: 'helpline', address: 'Women Helpline for Domestic Abuse',lat: 0, lng: 0, distanceKm: 0, openNow: true, googleMapsUri: null, rating: null },
];

// ─── Overpass API (free, no key) ────────────────────────────────────────────
const OVERPASS_SERVERS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

function buildOverpassQuery(lat: number, lng: number, amenityTypes: string[], radius: number = 10000): string {
    const filters = amenityTypes.map(t => `node["amenity"="${t}"](around:${radius},${lat},${lng});way["amenity"="${t}"](around:${radius},${lat},${lng});`).join('\n');
    return `[out:json][timeout:15];(\n${filters}\n);out center body;`;
}

async function queryOverpass(query: string): Promise<any[]> {
    for (const server of OVERPASS_SERVERS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);
            const res = await fetch(server, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(query),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) continue;
            const json = await res.json();
            return json.elements ?? [];
        } catch (e) {
            console.warn(`[SafeZones] Overpass server ${server} failed:`, e);
            continue;
        }
    }
    return [];
}

function parseOverpassResults(
    elements: any[],
    userLat: number, userLng: number,
    category: 'police' | 'hospital'
): PlaceResult[] {
    return elements
        .map((el: any, i: number) => {
            const lat = el.lat ?? el.center?.lat;
            const lng = el.lon ?? el.center?.lon;
            if (!lat || !lng) return null;

            const tags = el.tags ?? {};
            const name = tags.name || tags['name:en'] || (category === 'police' ? 'Police Station' : 'Hospital');
            const phone = tags.phone || tags['contact:phone'] || tags['phone:mobile'] || null;

            const addressParts = [tags['addr:street'], tags['addr:city'], tags['addr:state']].filter(Boolean);
            const address = addressParts.length > 0 ? addressParts.join(', ') : (tags['addr:full'] || null);

            const dist = haversineKm(userLat, userLng, lat, lng);
            const mapsUri = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

            return {
                id: `${category}-${el.id || i}`,
                name,
                address,
                phone,
                lat,
                lng,
                distanceKm: Math.round(dist * 10) / 10,
                openNow: null,
                googleMapsUri: mapsUri,
                category,
                rating: null,
            } as PlaceResult;
        })
        .filter((p): p is PlaceResult => p !== null)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 20);
}

// ─── Card icons ─────────────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
    police:   { emoji: '🚓', bgClass: 'bg-blue-500/15',    borderClass: 'border-blue-500/30'    },
    hospital: { emoji: '🏥', bgClass: 'bg-emerald-500/15', borderClass: 'border-emerald-500/30' },
    helpline: { emoji: '📞', bgClass: 'bg-red-500/15',     borderClass: 'border-red-500/30'     },
};

// ─── Place Card ─────────────────────────────────────────────────────────────
function PlaceCard({ place }: { place: PlaceResult }) {
    const cfg = CATEGORY_CONFIG[place.category];

    const handleCardClick = () => {
        if (place.category === 'helpline') {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(place.name)}+India`, '_blank');
        } else if (place.googleMapsUri) {
            window.open(place.googleMapsUri, '_blank');
        }
    };

    const handleCall = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (place.phone) {
            window.location.href = `tel:${place.phone.replace(/\s/g, '')}`;
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm cursor-pointer hover:border-white/10 transition-colors active:scale-[0.98]"
        >
            <div className="p-4 flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border ${cfg.bgClass} ${cfg.borderClass}`}>
                    {cfg.emoji}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-[15px] leading-tight truncate">{place.name}</h3>
                    {place.address && (
                        <p className="text-text-3 text-xs mt-0.5 truncate">{place.address}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                        {place.category !== 'helpline' && (
                            <span className="text-text-3 text-xs">{place.distanceKm} km away</span>
                        )}
                        {place.openNow === true && (
                            <span className="flex items-center gap-1 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                <span className="text-green-400">Open</span>
                            </span>
                        )}
                        {place.openNow === false && (
                            <span className="flex items-center gap-1 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                                <span className="text-red-400">Closed</span>
                            </span>
                        )}
                    </div>
                </div>

                {place.phone && (
                    <button
                        onClick={handleCall}
                        className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 hover:bg-rose-500/25 active:scale-90 transition-all"
                    >
                        <Phone size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function SafeZonesPage() {
    const navigate = useNavigate();
    const [policeResults, setPoliceResults]     = useState<PlaceResult[]>([]);
    const [hospitalResults, setHospitalResults] = useState<PlaceResult[]>([]);
    const [activeFilter, setActiveFilter]       = useState<FilterType>('ALL');
    const [viewMode, setViewMode]               = useState<'list' | 'map'>('list');
    const [loading, setLoading]                 = useState(true);
    const [error, setError]                     = useState<string | null>(null);
    const [userLocation, setUserLocation]       = useState<{ lat: number; lng: number } | null>(null);
    const [locationStatus, setLocationStatus]   = useState<'loading' | 'success' | 'denied'>('loading');
    const [refreshKey, setRefreshKey]           = useState(0);
    const [apiWarning, setApiWarning]           = useState<string | null>(null);

    // ── Computed ────────────────────────────────────────────────────────
    const allPlaces = useMemo(() => {
        const mapped: PlaceResult[] = [];
        if (activeFilter === 'ALL' || activeFilter === 'POLICE')   mapped.push(...policeResults);
        if (activeFilter === 'ALL' || activeFilter === 'HOSPITAL') mapped.push(...hospitalResults);
        if (activeFilter === 'ALL' || activeFilter === 'HELPLINE') mapped.push(...HELPLINES);
        if (activeFilter === 'ALL') {
            const api = mapped.filter(p => p.category !== 'helpline').sort((a, b) => a.distanceKm - b.distanceKm);
            const hl  = mapped.filter(p => p.category === 'helpline');
            return [...api, ...hl];
        }
        if (activeFilter === 'HELPLINE') return HELPLINES;
        return mapped.sort((a, b) => a.distanceKm - b.distanceKm);
    }, [policeResults, hospitalResults, activeFilter]);

    const counts = useMemo(() => ({
        ALL:      policeResults.length + hospitalResults.length + 5,
        POLICE:   policeResults.length,
        HOSPITAL: hospitalResults.length,
        HELPLINE: 5,
    }), [policeResults, hospitalResults]);

    // ── Fetch places via Overpass ────────────────────────────────────────
    const fetchAllPlaces = useCallback(async (lat: number, lng: number) => {
        setLoading(true);
        setError(null);
        setApiWarning(null);
        try {
            const policeQuery = buildOverpassQuery(lat, lng, ['police']);
            const hospitalQuery = buildOverpassQuery(lat, lng, ['hospital', 'clinic', 'pharmacy', 'doctors']);

            const [policeRaw, hospitalRaw] = await Promise.all([
                queryOverpass(policeQuery),
                queryOverpass(hospitalQuery),
            ]);

            const police = parseOverpassResults(policeRaw, lat, lng, 'police');
            const hospitals = parseOverpassResults(hospitalRaw, lat, lng, 'hospital');

            setPoliceResults(police);
            setHospitalResults(hospitals);
            if (police.length === 0 && hospitals.length === 0) {
                setApiWarning('No nearby police stations or hospitals found in OpenStreetMap data. Helplines are still available below.');
            }
        } catch (e) {
            console.error('[SafeZones] Fetch error:', e);
            setApiWarning('Could not load nearby places. Helplines are still available below.');
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Geolocation on mount ────────────────────────────────────────────
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setLocationStatus('denied');
            setError('Location services are not supported by your browser.');
            setLoading(false);
            return;
        }
        setLocationStatus('loading');
        setLoading(true);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);
                setLocationStatus('success');
                fetchAllPlaces(loc.lat, loc.lng);
            },
            () => {
                setLocationStatus('denied');
                setLoading(false);
                setError('Location access is needed to find safe zones near you. Please enable location in your browser settings.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    const handleRetry = () => {
        setPoliceResults([]);
        setHospitalResults([]);
        setError(null);
        setApiWarning(null);
        setRefreshKey(k => k + 1);
    };

    const FILTERS: { key: FilterType; label: string }[] = [
        { key: 'ALL',      label: 'All' },
        { key: 'POLICE',   label: 'Police' },
        { key: 'HOSPITAL', label: 'Hospital' },
        { key: 'HELPLINE', label: 'Helpline' },
    ];

    // Map-only data (no helplines on map since they have no coordinates)
    const mapPlaces = useMemo(() => {
        const places: Array<PlaceResult & { category: 'police' | 'hospital' }> = [];
        if (activeFilter === 'ALL' || activeFilter === 'POLICE')   places.push(...policeResults as Array<PlaceResult & { category: 'police' }>);
        if (activeFilter === 'ALL' || activeFilter === 'HOSPITAL') places.push(...hospitalResults as Array<PlaceResult & { category: 'hospital' }>);
        return places;
    }, [policeResults, hospitalResults, activeFilter]);

    return (
        <div className="min-h-screen bg-bg pb-[96px] text-white">
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-3 hover:text-white hover:bg-white/5 rounded-full transition-all">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="font-display text-xl font-bold leading-tight">Safe Zones</h1>
                        {locationStatus === 'success' && !loading && (
                            <p className="text-xs text-text-3 font-medium flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {counts.ALL} place{counts.ALL !== 1 ? 's' : ''} within 10 km
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-surface-2 rounded-xl p-0.5 border border-border">
                        <button onClick={() => setViewMode('list')} className={`p-2 transition-colors rounded-lg ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-3'}`}>
                             <List size={18} />
                        </button>
                        <button onClick={() => setViewMode('map')}  className={`p-2 transition-colors rounded-lg ${viewMode === 'map'  ? 'bg-primary text-white' : 'text-text-3'}`}>
                             <MapIcon size={18} />
                        </button>
                    </div>
                    <button onClick={handleRetry} disabled={loading} className="p-2 text-text-3 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-40">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* FILTER CHIPS */}
            <div className="overflow-x-auto no-scrollbar">
                <div className="px-4 py-3 flex gap-2 flex-shrink-0 min-w-max">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === f.key ? 'bg-primary text-white' : 'bg-surface text-text-2 border border-border'}`}>
                            {f.label} ({counts[f.key]})
                        </button>
                    ))}
                </div>
            </div>

            {/* LOADING */}
            {loading && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <RefreshCw className="animate-spin text-primary" size={32} />
                    <span className="font-mono text-sm text-text-2">
                        {locationStatus === 'loading' ? 'Finding your location...' : 'Searching nearby safe zones...'}
                    </span>
                </div>
            )}

            {/* LOCATION DENIED */}
            {!loading && locationStatus === 'denied' && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
                    <AlertCircle className="text-warning" size={32} />
                    <p className="text-text-2">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="mt-2 bg-primary text-white rounded-xl px-6 py-2.5 font-medium text-sm active:scale-95 transition-transform">
                        Retry
                    </button>
                </div>
            )}

            {/* EMPTY FILTER */}
            {!loading && allPlaces.length === 0 && activeFilter !== 'ALL' && activeFilter !== 'HELPLINE' && (
                <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
                    <p className="text-text-2">No {activeFilter.toLowerCase()} locations found within 10 km.</p>
                    <button onClick={() => setActiveFilter('ALL')} className="text-primary text-sm font-medium mt-2">Show all ({counts.ALL})</button>
                </div>
            )}

            {/* LIST VIEW */}
            {!loading && locationStatus === 'success' && allPlaces.length > 0 && viewMode === 'list' && (
                <div className="px-4 space-y-3 pt-2">
                    {apiWarning && (
                        <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2 mb-1">
                            <AlertCircle size={14} className="text-warning flex-shrink-0" />
                            <p className="text-xs text-warning">{apiWarning}</p>
                            <button onClick={handleRetry} className="ml-auto text-xs text-primary font-medium whitespace-nowrap">Retry</button>
                        </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-text-3 font-semibold px-1 mb-1">
                        <span>
                            {allPlaces.length} place{allPlaces.length !== 1 ? 's' : ''} sorted by distance
                        </span>
                    </div>
                    {allPlaces.map(place => <PlaceCard key={place.id} place={place} />)}
                </div>
            )}

            {/* MAP VIEW */}
            {!loading && locationStatus === 'success' && viewMode === 'map' && (
                <div className="h-[calc(100vh-160px)] relative">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-primary" size={24} /> Loading map...</div>}>
                        <SafeZonesMap
                            userLocation={userLocation}
                            places={mapPlaces}
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
