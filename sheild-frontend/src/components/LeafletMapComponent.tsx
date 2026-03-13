import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Default icon fix for React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const pulsingIconHtml = `
  <div style="
    width: 20px; 
    height: 20px; 
    background: var(--c-danger); 
    border: 3px solid white; 
    border-radius: 50%; 
    box-shadow: 0 0 0 0 rgba(255, 34, 34, 0.7);
    animation: pulse-marker 1.5s infinite;
  "></div>
`;

const pulsingIcon = L.divIcon({
    className: 'custom-pulsing-icon',
    html: pulsingIconHtml,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
});

const defaultOtherIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function RecenterController({ center, triggerFocus }: { center: [number, number], triggerFocus: number }) {
    const map = useMap();
    
    useEffect(() => {
        if (triggerFocus > 0) {
            map.flyTo(center, 16, { animate: true });
        }
    }, [triggerFocus, center, map]);

    useEffect(() => {
        return () => {
            map.remove();
        };
    }, [map]);

    return null;
}

export default function LeafletMapComponent({ center, zoom, myLocation, activeLocations, triggerFocus, status }: any) {
    const popupRef = useRef<any>(null);

    useEffect(() => {
        if (popupRef.current) {
            popupRef.current.openPopup();
        }
    }, [myLocation]);

    return (
        <MapContainer center={center} zoom={zoom} className="h-full w-full z-0 font-sans">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
                className="map-tiles"
            />
            
            {status === 'success' && myLocation && (
                    <Marker position={[myLocation.lat, myLocation.lng]} icon={pulsingIcon} ref={popupRef}>
                    <Popup autoPan={false}>
                        <div className="font-bold text-center">You are here</div>
                    </Popup>
                </Marker>
            )}

            {activeLocations.map((loc: any) => (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={loc.isSos ? pulsingIcon : defaultOtherIcon}>
                    <Popup>
                        <b>{loc.name}</b><br />
                        Status: {loc.isSos ? 'SOS Alert!' : 'Live Tracking'}
                    </Popup>
                </Marker>
            ))}
            
            <RecenterController center={center} triggerFocus={triggerFocus} />

            <style>{`
            .leaflet-container { background: #0F0505 !important; }
            .map-tiles { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
            .leaflet-popup-content-wrapper, .leaflet-popup-tip {
              background: var(--c-surface);
              color: white;
              border: 1px solid var(--c-border);
            }
            .custom-pulsing-icon { background: transparent; border: none; }
            @keyframes pulse-marker {
                0% { box-shadow: 0 0 0 0 rgba(255, 34, 34, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(255, 34, 34, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 34, 34, 0); }
            }
            `}</style>
        </MapContainer>
    );
}
