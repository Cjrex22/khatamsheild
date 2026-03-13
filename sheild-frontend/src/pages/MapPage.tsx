import { useEffect, useState, Suspense, lazy } from 'react';
import { useAuthStore } from '../stores/authStore';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { MapPin, Target } from 'lucide-react';

// Dynamically import the Leaflet map component to prevent SSR issues if any exist
const LeafletMapComponent = lazy(() => import('../components/LeafletMapComponent'));

export default function MapPage() {
    const { profile } = useAuthStore();
    const [activeLocations, setActiveLocations] = useState<any[]>([]);
    const [myLocation, setMyLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [triggerFocus, setTriggerFocus] = useState(0);

    const fallbackCenter: [number, number] = [20.5937, 78.9629];
    const fallbackZoom = 5;

    const requestLocation = () => {
        setStatus('loading');
        navigator.geolocation.getCurrentPosition(
            pos => {
                setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setStatus('success');
                setTriggerFocus(prev => prev + 1);
            },
            _err => {
                setStatus('error');
                toast.error('Enable location permission for accurate positioning', { id: 'loc-err' });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };

    useEffect(() => {
        requestLocation();
    }, []);

    useEffect(() => {
        if (!profile?.uid) return;
        const unsub = onSnapshot(collection(db, 'activeLocations'), (snap) => {
            const locs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActiveLocations(locs);
        });
        return unsub;
    }, [profile?.uid]);

    if (status === 'loading' && !myLocation) {
        return (
            <div className="min-h-screen bg-bg flex flex-col items-center justify-center text-text-2 gap-4 pb-16">
                <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="font-mono text-sm animate-pulse">Finding your location...</p>
            </div>
        );
    }

    const mapCenter: [number, number] = status === 'success' && myLocation ? [myLocation.lat, myLocation.lng] : fallbackCenter;
    const mapZoom = status === 'success' && myLocation ? 16 : fallbackZoom;

    return (
        <div className="h-[calc(100vh-64px)] w-full relative">
            <header className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-center pointer-events-none">
                <div className="bg-surface/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-border pointer-events-auto flex items-center gap-2">
                    <MapPin className="text-primary" size={18} />
                    <span className="text-white font-bold text-sm">Live Movement Map</span>
                </div>
                <button 
                    onClick={requestLocation}
                    className="w-10 h-10 bg-surface/90 backdrop-blur-md rounded-xl shadow-lg border border-border flex items-center justify-center text-text-2 hover:text-white pointer-events-auto transition-colors focus:outline-none"
                    aria-label="Re-center"
                >
                    <Target size={20} />
                </button>
            </header>

            {status === 'error' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[400]">
                     <button onClick={requestLocation} className="bg-primary hover:bg-primary-hover transition-colors text-white font-bold py-2 px-4 flex items-center gap-2 rounded-full shadow-lg text-sm">
                        <Target size={16} /> Use My Location
                     </button>
                </div>
            )}

            <Suspense fallback={<div className="h-full w-full bg-bg flex items-center justify-center text-text-3 font-mono">Loading Map Engine...</div>}>
                <LeafletMapComponent 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    myLocation={myLocation} 
                    activeLocations={activeLocations} 
                    triggerFocus={triggerFocus}
                    status={status}
                />
            </Suspense>
        </div>
    );
}
