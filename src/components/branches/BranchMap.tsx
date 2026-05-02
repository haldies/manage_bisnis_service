"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet + React
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface BranchMapProps {
  lat: number;
  lng: number;
  radius: number;
  onChange: (lat: number, lng: number) => void;
}

// Component to handle map center updates
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center]);
  return null;
}

// Component to handle click events on the map
function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function BranchMap({ lat, lng, radius, onChange }: BranchMapProps) {
  const center: [number, number] = [lat || -6.200000, lng || 106.816666]; 

  // Modern Apple-style Icon
  const appleIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: #0071e3; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <div className="h-[350px] w-full rounded-3xl overflow-hidden border border-border/40 shadow-2xl relative z-0 group">
      <MapContainer 
        center={center} 
        zoom={16} 
        zoomControl={false} // Hide default zoom controls
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", background: "#f5f5f7" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ChangeView center={center} />
        <MapEvents onClick={onChange} />
        
        {lat && lng && (
          <>
            <Marker position={[lat, lng]} icon={appleIcon} />
            <Circle 
              center={[lat, lng]} 
              radius={radius} 
              pathOptions={{ 
                fillColor: '#0071e3', 
                color: '#0071e3', 
                weight: 2, 
                fillOpacity: 0.1,
                dashArray: '5, 10' // Subtle dashed line for premium feel
              }} 
            />
          </>
        )}
      </MapContainer>

      {/* Floating Modern Header Over Map */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
         <div className="bg-background/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-xl pointer-events-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Geofence Live Preview</p>
            <p className="text-[11px] font-bold mt-0.5">{radius} Meter Radius</p>
         </div>
      </div>
    </div>
  );
}
