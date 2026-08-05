'use client';

import { useEffect, useRef } from 'react';
import type { Restaurant } from './page';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window { naver: any; }
}

interface Props {
  restaurants: Restaurant[];
  selected: string | null;
  onSelect: (id: string) => void;
}

function markerHtml(emoji: string, isSelected: boolean) {
  const bg = isSelected
    ? 'linear-gradient(135deg,#6d5ee4,#4f46e5)'
    : '#ffffff';
  const border = isSelected ? '#6d5ee4' : 'rgba(0,0,0,0.18)';
  const shadow = isSelected
    ? '0 4px 16px rgba(109,94,228,.45)'
    : '0 3px 10px rgba(0,0,0,.18)';
  return `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:44px;height:44px;
      background:${bg};
      border:2.5px solid ${border};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:${shadow};
      cursor:pointer;
      transition:all .2s;
    ">
      <span style="transform:rotate(45deg);font-size:20px;line-height:1;">${emoji}</span>
    </div>`;
}

export default function NaverMap({ restaurants, selected, onSelect }: Props) {
  const mapRef    = useRef<any>(null);
  const container = useRef<HTMLDivElement>(null);
  const markers   = useRef<Map<string, any>>(new Map());
  const infoWins  = useRef<Map<string, any>>(new Map());

  // Build map once
  useEffect(() => {
    if (!container.current || !window.naver?.maps || mapRef.current) return;
    const N = window.naver.maps;

    const map = new N.Map(container.current, {
      center: new N.LatLng(37.5563, 126.9239),
      zoom: 15,
      mapTypeControl: false,
      scaleControl: true,
      logoControlOptions: { position: N.Position.BOTTOM_LEFT },
    });
    mapRef.current = map;

    restaurants.forEach((r) => {
      const marker = new N.Marker({
        position: new N.LatLng(r.lat, r.lng),
        map,
        icon: {
          content: markerHtml(r.emoji, r.id === selected),
          anchor: new N.Point(22, 44),
        },
      });

      const infoWin = new N.InfoWindow({
        content: `
          <div style="
            padding:10px 14px;font-family:Inter,sans-serif;
            min-width:140px;
          ">
            <div style="font-size:14px;font-weight:700;color:#111118;margin-bottom:3px;">
              ${r.emoji} ${r.name}
            </div>
            <div style="font-size:11px;font-weight:600;color:#6d5ee4;text-transform:uppercase;letter-spacing:.05em;">
              ${r.category}
            </div>
          </div>`,
        borderWidth: 1,
        borderColor: 'rgba(109,94,228,.35)',
        backgroundColor: '#ffffff',
        disableAnchor: false,
        pixelOffset: new N.Point(0, -4),
      });

      N.Event.addListener(marker, 'click', () => {
        // Close all other infoWindows
        infoWins.current.forEach((iw) => iw.close());
        infoWin.open(map, marker);
        onSelect(r.id);
      });

      markers.current.set(r.id, marker);
      infoWins.current.set(r.id, infoWin);
    });

    return () => {
      markers.current.forEach((m) => m.setMap(null));
      markers.current.clear();
      infoWins.current.forEach((iw) => iw.close());
      infoWins.current.clear();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker icon when selection changes
  useEffect(() => {
    if (!window.naver?.maps || !mapRef.current) return;
    const N = window.naver.maps;
    markers.current.forEach((marker, id) => {
      const r = restaurants.find((x) => x.id === id);
      if (!r) return;
      marker.setIcon({
        content: markerHtml(r.emoji, id === selected),
        anchor: new N.Point(22, 44),
      });
    });
  }, [selected, restaurants]);

  // Pan to selected
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps || !selected) return;
    const r = restaurants.find((x) => x.id === selected);
    if (r) {
      mapRef.current.setCenter(new window.naver.maps.LatLng(r.lat, r.lng));
      mapRef.current.setZoom(16);
    }
  }, [selected, restaurants]);

  return <div ref={container} style={{ width: '100%', height: '100%' }} />;
}
