import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, Building2, Heart, Navigation, Phone, 
    MapPin, RefreshCw, List, Map as MapIcon, ChevronRight, AlertCircle, 
    ArrowLeft 
} from 'lucide-react';
import toast from 'react-hot-toast';
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

const typeConfig = {
    POLICE: { label: 'Police Station', color: 'text-blue-400', bgColor: 'bg-blue-500/15', borderColor: 'border-blue-500/30', Icon: ShieldCheck },
    HOSPITAL: { label: 'Hospital', color: 'text-green-400', bgColor: 'bg-green-500/15', borderColor: 'border-green-500/30', Icon: Building2 },
    HELPLINE: { label: "Women's Center", color: 'text-purple-400', bgColor: 'bg-purple-500/15', borderColor: 'border-purple-500/30', Icon: Heart }
};

export default function SafeZonesPage() {
    const navigate = useNavigate();
    
    const [zones, setZones] = useState<SafeZone[]>([]);
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'POLICE' | 'HOSPITAL' | 'HELPLINE'>('ALL');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');

    const fetchSafeZones = async (lat: number, lng: number) => {
        try {
            const data = await api.get(`/safe-zones/nearby?lat=${lat}&lng=${lng}&radiusMeters=5000`);
            setZones(data);
            setLoading(false);
        } catch (e) {
            setError('Could not load safe zones. Please check your connection.');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!("geolocation" in navigator)) {
            setLocationStatus('error');
            setLoading(false);
            setError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setUserLocation({ lat, lng });
                setLocationStatus('success');
                fetchSafeZones(lat, lng);
            },
            () => {
                setLocationStatus('error');
                setLoading(false);
                setError('Location permission is required to find nearby safe zones. Please enable it in your browser settings.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    const filteredZones = useMemo(() => {
        if (activeFilter === 'ALL') return zones;
        return zones.filter(z => z.type === activeFilter);
    }, [zones, activeFilter]);

    const filterCounts = useMemo(() => {
        return {
            ALL: zones.length,
            POLICE: zones.filter(z => z.type === 'POLICE').length,
            HOSPITAL: zones.filter(z => z.type === 'HOSPITAL').length,
            HELPLINE: zones.filter(z => z.type === 'HELPLINE').length
        };
    }, [zones]);

    return (
        <div className="min-h-screen bg-bg pb-[96px] text-white">
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-4 bg-surface border-b border-border sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-text-2 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-display text-xl font-bold">Safe Zones</h1>
                </div>
                <div className="flex items-center bg-surface-2 rounded-lg p-1 border border-border">
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-text-3'}`}
                    >
                        <List size={18} />
                    </button>
                    <button 
                        onClick={() => setViewMode('map')} 
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'map' ? 'bg-primary text-white' : 'text-text-3'}`}
                    >
                        <MapIcon size={18} />
                    </button>
                </div>
            </div>

            {/* FILTER TABS */}
            <div className="overflow-x-auto no-scrollbar">
                <div className="px-4 py-3 flex gap-2 flex-shrink-0 min-w-max">
                    <button 
                        onClick={() => setActiveFilter('ALL')}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === 'ALL' ? 'bg-primary text-white font-bold' : 'bg-surface text-text-2 border border-border'}`}
                    >
                        All ({filterCounts.ALL})
                    </button>
                    <button 
                        onClick={() => setActiveFilter('POLICE')}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === 'POLICE' ? 'bg-primary text-white font-bold' : 'bg-surface text-text-2 border border-border'}`}
                    >
                        Police ({filterCounts.POLICE})
                    </button>
                    <button 
                        onClick={() => setActiveFilter('HOSPITAL')}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === 'HOSPITAL' ? 'bg-primary text-white font-bold' : 'bg-surface text-text-2 border border-border'}`}
                    >
                        Hospital ({filterCounts.HOSPITAL})
                    </button>
                    <button 
                        onClick={() => setActiveFilter('HELPLINE')}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${activeFilter === 'HELPLINE' ? 'bg-primary text-white font-bold' : 'bg-surface text-text-2 border border-border'}`}
                    >
                        Helpline ({filterCounts.HELPLINE})
                    </button>
                </div>
            </div>

            {/* LOADING STATE */}
            {loading && (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <RefreshCw className="animate-spin text-primary" size={32} />
                    <span className="font-mono text-sm text-text-2">Finding safe zones near you...</span>
                </div>
            )}

            {/* ERROR STATE */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
                    <AlertCircle className="text-warning" size={32} />
                    <p className="text-text-2">{error}</p>
                    {locationStatus === 'error' && (
                        <button 
                            onClick={() => {
                                const didOpen = window.open('app-settings:', '_blank');
                                if (!didOpen) toast.error('Please enable location in your device settings');
                            }}
                            className="bg-surface-2 text-white font-medium px-4 py-2 rounded-full border border-border hover:bg-surface-3 transition-colors mt-2"
                        >
                            Open Settings
                        </button>
                    )}
                </div>
            )}

            {/* EMPTY STATE */}
            {!loading && !error && filteredZones.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 gap-4 px-6 text-center">
                    <ShieldCheck size={48} className="text-text-3" />
                    <p className="text-lg font-bold text-white">No safe zones found nearby</p>
                    <p className="text-text-3 text-sm">Try increasing the search radius or check a different area</p>
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && !loading && !error && filteredZones.length > 0 && (
                <div className="px-4 space-y-3 pt-2">
                    {filteredZones.map(zone => (
                        <SafeZoneCard key={zone.id} zone={zone} />
                    ))}
                </div>
            )}

            {/* MAP VIEW */}
            {viewMode === 'map' && !loading && !error && (
                <div className="h-[calc(100vh-160px)]">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin text-primary" size={24} /></div>}>
                        <LeafletMapComponent
                            center={userLocation ? [userLocation.lat, userLocation.lng] : [20.5937, 78.9629]}
                            zoom={userLocation ? 14 : 5}
                            myLocation={userLocation}
                            activeLocations={filteredZones.map(z => ({ id: z.id, lat: z.lat, lng: z.lng, name: z.name, type: z.type }))}
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}

function SafeZoneCard({ zone }: { zone: SafeZone }) {
    const config = typeConfig[zone.type];
    const { Icon } = config;

    return (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-4">
                <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center border rounded-full px-2 py-0.5 text-xs font-medium ${config.bgColor} ${config.color} ${config.borderColor}`}>
                        <Icon size={12} className="mr-1" />
                        {config.label}
                    </div>
                    <div className="flex-1" />
                    <div className="bg-surface-2 text-text-3 rounded-full px-2 py-0.5 text-xs font-mono">
                        {zone.distanceKm.toFixed(2)} km
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
                        onClick={() => window.location.href = 'tel:' + zone.phone?.replace(/\s/g, '')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-safe font-medium text-sm hover:bg-safe/10 transition-colors"
                    >
                        <Phone size={14} /> Call
                    </button>
                )}
                
                <button 
                    onClick={() => window.open(zone.directionsLink, '_blank')}
                    className={`${zone.phone ? 'flex-1 border-l border-border' : 'w-full'} flex items-center justify-center gap-2 py-3 text-primary font-medium text-sm hover:bg-primary/10 transition-colors`}
                >
                    <Navigation size={14} /> Directions
                </button>
            </div>
        </div>
    );
}
