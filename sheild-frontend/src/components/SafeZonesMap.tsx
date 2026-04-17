// SafeZonesMap — Leaflet map for the Safe Zones page.
// Uses the same tile layer and dark-mode styling as the Map tab,
// but with custom markers for police/hospital and popup actions.

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── User location pulsing dot (identical to Map tab) ───────────────────────
const pulsingIcon = L.divIcon({
    className: 'custom-pulsing-icon',
    html: `<div style="
        width: 20px; height: 20px;
        background: var(--c-danger);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 0 rgba(255, 34, 34, 0.7);
        animation: pulse-sz 1.5s infinite;
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
});

// ─── Category markers ───────────────────────────────────────────────────────
function emojiIcon(emoji: string, bg: string) {
    return L.divIcon({
        className: 'sz-marker',
        html: `<div style="
            width: 32px; height: 32px;
            background: ${bg};
            border: 2px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; line-height: 1;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        ">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
    });
}

const policeIcon   = emojiIcon('🚓', '#2563eb');
const hospitalIcon = emojiIcon('🏥', '#10b981');

// ─── auto-cleanup on dismount ───────────────────────────────────────────────
function Cleanup() {
    const map = useMap();
    useEffect(() => () => { map.remove(); }, [map]);
    return null;
}

// ─── Component ──────────────────────────────────────────────────────────────
interface Place {
    id: string;
    name: string;
    lat: number;
    lng: number;
    phone: string | null;
    googleMapsUri: string | null;
    category: 'police' | 'hospital';
}

interface SafeZonesMapProps {
    userLocation: { lat: number; lng: number } | null;
    places: Place[];
}

export default function SafeZonesMap({ userLocation, places }: SafeZonesMapProps) {
    const userRef = useRef<any>(null);

    useEffect(() => { userRef.current?.openPopup(); }, [userLocation]);

    const center: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [20.5937, 78.9629];

    return (
        <MapContainer center={center} zoom={userLocation ? 13 : 5} className="h-full w-full z-0 font-sans">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                className="map-tiles"
            />

            {/* User dot */}
            {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={pulsingIcon} ref={userRef}>
                    <Popup autoPan={false}>
                        <div className="font-bold text-center">You are here</div>
                    </Popup>
                </Marker>
            )}

            {/* Place markers */}
            {places.map(p => (
                <Marker
                    key={p.id}
                    position={[p.lat, p.lng]}
                    icon={p.category === 'police' ? policeIcon : hospitalIcon}
                >
                    <Popup>
                        <div style={{ minWidth: 160 }}>
                            <b style={{ fontSize: 14 }}>{p.name}</b>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                {p.googleMapsUri && (
                                    <button
                                        onClick={() => window.open(p.googleMapsUri!, '_blank')}
                                        style={{
                                            flex: 1, padding: '6px 0', borderRadius: 8,
                                            background: 'var(--c-primary)', color: 'white',
                                            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        }}
                                    >
                                        Directions
                                    </button>
                                )}
                                {p.phone && (
                                    <button
                                        onClick={() => { window.location.href = `tel:${p.phone!.replace(/\s/g, '')}`; }}
                                        style={{
                                            flex: 1, padding: '6px 0', borderRadius: 8,
                                            background: '#e11d48', color: 'white',
                                            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        }}
                                    >
                                        Call
                                    </button>
                                )}
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            <Cleanup />

            <style>{`
                .leaflet-container { background: #0F0505 !important; }
                .map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
                .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                    background: var(--c-surface);
                    color: white;
                    border: 1px solid var(--c-border);
                }
                .custom-pulsing-icon, .sz-marker { background: transparent; border: none; }
                @keyframes pulse-sz {
                    0% { box-shadow: 0 0 0 0 rgba(255, 34, 34, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 34, 34, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 34, 34, 0); }
                }
            `}</style>
        </MapContainer>
    );
}
