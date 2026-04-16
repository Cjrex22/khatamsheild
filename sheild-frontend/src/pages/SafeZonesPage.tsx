import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShieldCheck, Building2, Heart, Navigation, Phone,
    MapPin, RefreshCw, List, Map as MapIcon, AlertCircle, ArrowLeft, Clock
} from 'lucide-react';
import { api } from '../lib/api';

const LeafletMapComponent = lazy(() => import('../components/LeafletMapComponent'));

interface SafeZone {
    id: string;
    name: string;
    type: 'POLICE' | 'HOSPITAL' | 'HELPLINE';
    address: string | null;
    phone: string | null;
    lat: number;
    lng: number;
    distanceKm: number;
    openNow: boolean;
    mapsLink: string;
    directionsLink: string;
}

type FilterType = 'ALL' | 'POLICE' | 'HOSPITAL' | 'HELPLINE';

const TYPE_CONFIG = {
    POLICE:   { label: 'Police Station',    Icon: ShieldCheck, badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30'    },
    HOSPITAL: { label: 'Hospital',          Icon: Building2,   badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
    HELPLINE: { label: "Women's Centre",    Icon: Heart,       badgeClass: 'bg-purple-500/15 text-purple-400 border border-purple-500/30'  },
};

function SafeZoneCard({ zone }: { zone: SafeZone }) {
    const cfg = TYPE_CONFIG[zone.type];
    const Icon = cfg.Icon;
    return (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-4">
                <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center border rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}>
                        <Icon size={12} className="mr-1" />
                        {cfg.label}
                    </div>
                    <div className="flex-1" />
                    <div className="bg-surface-2 text-text-3 rounded-full px-2 py-0.5 text-xs font-mono">
                        {zone.distanceKm < 1 ? `${Math.round(zone.distanceKm * 1000)} m` : `${zone.distanceKm.toFixed(2)} km`}
                    </div>
                    {zone.openNow && (
                        <div className="bg-safe/20 text-safe rounded-full px-2 py-0.5 text-xs font-medium">
                            Open
                        </div>
                    )}
                </div>
                <h3 className="text-white font-bold text-base mt-2 leading-tight">{zone.name}</h3>
                {zone.address && (
                    <div className="flex items-start gap-1 mt-1 text-text-3">
                        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                        <span className="text-xs leading-tight line-clamp-1">{zone.address}</span>
                    </div>
                )}
            </div>
            <div className="border-t border-border flex">
                {zone.phone && (
                    <button 
                        onClick={() => { window.location.href = 'tel:' + zone.phone!.replace(/\s/g, ''); }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-safe font-medium text-sm hover:bg-safe/10 active:bg-safe/20 transition-colors"
                    >
                        <Phone size={14} /> Call
                    </button>
                )}
                <button 
                    onClick={() => window.open(zone.directionsLink, '_blank', 'noopener,noreferrer')}
                    className={`${zone.phone ? 'flex-1 border-l border-border' : 'w-full'} flex items-center justify-center gap-2 py-3 text-primary font-medium text-sm hover:bg-primary/10 active:bg-primary/20 transition-colors`}
                >
                    <Navigation size={14} /> Directions
                </button>
            </div>
        </div>
    );
}

export default function SafeZonesPage() {
    const navigate = useNavigate();
    const [zones, setZones] = useState<SafeZone[]>([]);
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [refreshKey, setRefreshKey] = useState(0);

    const filteredZones = useMemo(() =>
        activeFilter === 'ALL' ? zones : zones.filter(z => z.type === activeFilter),
    [zones, activeFilter]);

    const counts = useMemo(() => ({
        ALL:      zones.length,
        POLICE:   zones.filter(z => z.type === 'POLICE').length,
        HOSPITAL: zones.filter(z => z.type === 'HOSPITAL').length,
        HELPLINE: zones.filter(z => z.type === 'HELPLINE').length,
    }), [zones]);

    const fetchZones = async (lat: number, lng: number) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get(`/safe-zones/nearby?lat=${lat}&lng=${lng}&radiusMeters=5000`);
            setZones(Array.isArray(data) ? data : []);
        } catch {
            setError('Could not load safe zones. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setLocationStatus('error');
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
                fetchZones(loc.lat, loc.lng);
            },
            () => {
                setLocationStatus('error');
                setLoading(false);
                setError('Location permission is required to find nearby safe zones. Please enable it and refresh.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    const FILTERS: { key: FilterType; label: string }[] = [
        { key: 'ALL', label: 'All' },
        { key: 'POLICE', label: 'Police' },
        { key: 'HOSPITAL', label: 'Hospital' },
        { key: 'HELPLINE', label: 'Helpline' },
    ];

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
                                <Clock size={10} /> {counts.ALL} place{counts.ALL !== 1 ? 's' : ''} within 5 km
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-surface-2 rounded-xl p-0.5 border border-border">
                        <button onClick={() => setViewMode('list')} className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-3'}`}>
                             <List size={18} />
                        </button>
                        <button onClick={() => setViewMode('map')}  className={`p-2 transition-colors ${viewMode === 'map'  ? 'bg-primary text-white' : 'text-text-3'}`}>
                             <MapIcon size={18} />
                        </button>
                    </div>
                    <button onClick={() => { setZones([]); setRefreshKey(k => k + 1); }} disabled={loading} className="p-2 text-text-3 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-40">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* FILTERS */}
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

            {loading && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <RefreshCw className="animate-spin text-primary" size={32} />
                    <span className="font-mono text-sm text-text-2">
                        {locationStatus === 'loading' ? 'Finding your location...' : 'Searching nearby safe zones...'}
                    </span>
                </div>
            )}

            {!loading && error && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
                    <AlertCircle className="text-warning" size={32} />
                    <p className="text-text-2">{error}</p>
                    <button 
                        onClick={() => { setZones([]); setRefreshKey(k => k + 1); }}
                        className="mt-2 bg-primary text-white rounded-xl px-6 py-2.5 font-medium text-sm active:scale-95 transition-transform">
                        Try Again
                    </button>
                </div>
            )}

            {!loading && !error && zones.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
                    <ShieldCheck size={48} className="text-text-3 opacity-50" />
                    <p className="text-lg font-bold text-white">No safe zones found nearby</p>
                    <p className="text-text-3 text-sm">OpenStreetMap data may be sparse in your area.</p>
                </div>
            )}

            {!loading && !error && zones.length > 0 && filteredZones.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
                    <p className="text-text-2">No {activeFilter.toLowerCase()} locations found within 5 km.</p>
                    <button onClick={() => setActiveFilter('ALL')} className="text-primary text-sm font-medium mt-2">Show all ({counts.ALL})</button>
                </div>
            )}

            {!loading && !error && filteredZones.length > 0 && viewMode === 'list' && (
                <div className="px-4 space-y-3 pt-2">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-text-3 font-semibold px-1 mb-1">
                        <span>
                        {filteredZones.length} place{filteredZones.length !== 1 ? 's' : ''} sorted by distance · Data from OpenStreetMap
                        </span>
                    </div>
                    {filteredZones.map(zone => <SafeZoneCard key={zone.id} zone={zone} />)}
                </div>
            )}

            {!loading && !error && viewMode === 'map' && (
                <div className="h-[calc(100vh-160px)] relative">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-primary" size={24} /> Loading map...</div>}>
                        <LeafletMapComponent
                            center={userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629]}
                            zoom={userLocation ? 14 : 5}
                            myLocation={userLocation}
                            activeLocations={filteredZones.map(z => ({ id: z.id, lat: z.lat, lng: z.lng, name: z.name, type: z.type }))}
                            triggerFocus={0}
                            status={locationStatus === 'success' ? 'success' : 'error'}
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
