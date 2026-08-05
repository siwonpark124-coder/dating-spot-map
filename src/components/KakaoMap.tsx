"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Kakao Maps SDK has no official TS types */

import { useEffect, useRef, useState } from "react";
import { Place, PlaceCategory } from "@/types/place";

declare global {
  interface Window {
    kakao: any;
  }
}

const DEFAULT_CENTER = { lat: 37.5563, lng: 126.9236 }; // 홍대입구역

const CATEGORY_MARKER_STYLE: Record<PlaceCategory, { emoji: string; color: string }> = {
  restaurant: { emoji: "🍽️", color: "#f97316" },
  cafe: { emoji: "☕", color: "#92400e" },
  bar: { emoji: "🍸", color: "#7c3aed" },
};

function buildMarkerImageSrc(category: PlaceCategory) {
  const { emoji, color } = CATEGORY_MARKER_STYLE[category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
    <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="${color}"/>
    <circle cx="20" cy="19" r="13" fill="white"/>
    <text x="20" y="25" font-size="16" text-anchor="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface KakaoMapProps {
  places: Place[];
  center?: { lat: number; lng: number };
}

export default function KakaoMap({ places, center }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const markerImageCacheRef = useRef<Partial<Record<PlaceCategory, any>>>({});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // SDK 로드 + 지도 인스턴스 생성 (한 번만)
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appKey || !containerRef.current) return;

    const scriptId = "kakao-map-sdk";

    const initMap = () => {
      window.kakao.maps.load(() => {
        if (!containerRef.current) return;

        const initialCenter = center ?? DEFAULT_CENTER;
        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
          level: 5,
          tileAnimation: false, // 확대/축소 시 타일이 늘어났다 줄어드는 전환 애니메이션 끔
        });
        mapRef.current = map;
        setMapReady(true);

        // 컨테이너 크기가 바뀔 때마다(헤더 줄바꿈, 창 크기 변경 등) 지도를 재계산.
        // 이걸 안 하면 확대/축소가 어긋나거나 지도가 컨테이너를 다 못 채우는 문제가 생김.
        const resizeObserver = new ResizeObserver(() => {
          const currentCenter = map.getCenter();
          map.relayout();
          map.setCenter(currentCenter);
        });
        resizeObserver.observe(containerRef.current);
        resizeObserverRef.current = resizeObserver;
      });
    };

    if (window.kakao?.maps) {
      initMap();
      return () => resizeObserverRef.current?.disconnect();
    }

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
      document.head.appendChild(script);
    }
    script.addEventListener("load", initMap);
    return () => {
      script?.removeEventListener("load", initMap);
      resizeObserverRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 필터링된 장소가 바뀔 때마다 마커만 다시 그림 (지도 재생성/재중심 없음)
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    places.forEach((place) => {
      let markerImage = markerImageCacheRef.current[place.category];
      if (!markerImage) {
        markerImage = new window.kakao.maps.MarkerImage(
          buildMarkerImageSrc(place.category),
          new window.kakao.maps.Size(40, 52),
          { offset: new window.kakao.maps.Point(20, 52) }
        );
        markerImageCacheRef.current[place.category] = markerImage;
      }

      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(place.lat, place.lng),
        map,
        image: markerImage,
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:13px;white-space:nowrap;">${place.name}</div>`,
      });

      window.kakao.maps.event.addListener(marker, "mouseover", () => infowindow.open(map, marker));
      window.kakao.maps.event.addListener(marker, "mouseout", () => infowindow.close());

      markersRef.current.push(marker);
    });

    // 필터링된 장소들이 다 보이도록 지도 범위를 자동으로 맞춤
    if (places.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      places.forEach((place) => bounds.extend(new window.kakao.maps.LatLng(place.lat, place.lng)));
      map.setBounds(bounds);
    }
  }, [places, mapReady]);

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm text-stone-500">
        NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았어요 (.env.local 확인)
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
