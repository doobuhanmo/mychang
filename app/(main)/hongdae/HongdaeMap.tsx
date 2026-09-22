'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import type { Restaurant } from './page';

interface Props {
  restaurants: Restaurant[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function HongdaeMap({ restaurants, selected, onSelect }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, {
        center: [37.5563, 126.9239],
        zoom: 15,
        zoomControl: true,
      });

      mapRef.current = map;

      // Standard OSM — roads, subway, bus routes all visible
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      restaurants.forEach((r) => {
        const isSelected = r.id === selected;

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              display:flex; align-items:center; justify-content:center;
              width:42px; height:42px;
              background:${isSelected ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(17,17,24,0.92)'};
              border: 2px solid ${isSelected ? '#a78bfa' : 'rgba(255,255,255,0.15)'};
              border-radius:50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: ${isSelected ? '0 0 16px rgba(139,92,246,0.6)' : '0 2px 8px rgba(0,0,0,0.4)'};
              transition: all 0.2s;
              cursor: pointer;
            ">
              <span style="transform:rotate(45deg); font-size:18px; line-height:1;">${r.emoji}</span>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 42],
          popupAnchor: [0, -46],
        });

        const marker = L.marker([r.lat, r.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div class="popup-name">${r.emoji} ${r.name}</div>
            <div class="popup-category">${r.category}</div>
          `, { maxWidth: 200 });

        marker.on('click', () => onSelect(r.id));
        markersRef.current.set(r.id, marker);
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan to selected
  useEffect(() => {
    if (!mapRef.current || !selected) return;
    const r = restaurants.find((x) => x.id === selected);
    if (r) {
      mapRef.current.setView([r.lat, r.lng], 16, { animate: true });
      markersRef.current.get(r.id)?.openPopup();
    }
  }, [selected, restaurants]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
