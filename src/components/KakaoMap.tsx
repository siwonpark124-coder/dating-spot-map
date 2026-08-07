"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Kakao Maps SDK has no official TS types */

import { useEffect, useRef, useState } from "react";
import { Place, PlaceCategory } from "@/types/place";
import { CATEGORY_LABELS } from "@/lib/constants";
import { CourseStop } from "@/lib/course";
import { buildCourseLines, buildNumberedMarkerSrc } from "@/lib/kakaoSdk";

const DEFAULT_CENTER = { lat: 37.5563, lng: 126.9236 }; // 홍대입구역

const CATEGORY_MARKER_STYLE: Record<PlaceCategory, { emoji: string; color: string }> = {
  restaurant: { emoji: "🍽️", color: "#f97316" },
  cafe: { emoji: "☕", color: "#92400e" },
  bar: { emoji: "🍸", color: "#7c3aed" },
};

/** 호버 말풍선에 넣을 한 줄 코멘트 길이. 이보다 길면 잘라낸다. */
const HOVER_NOTE_MAX = 45;

// InfoWindow는 HTML 문자열로만 받으므로 직접 이스케이프해야 한다.
// 실제로 따옴표가 들어간 이름·추천 이유가 51곳 있다.
function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInfoWindowContent(place: Place) {
  const subtitle = place.cuisine
    ? `${place.cuisine} ${CATEGORY_LABELS[place.category]}`
    : CATEGORY_LABELS[place.category];

  const note = place.curation_note?.trim() ?? "";
  const shortNote =
    note.length > HOVER_NOTE_MAX ? `${note.slice(0, HOVER_NOTE_MAX).trimEnd()}…` : note;

  return `<div style="padding:8px 10px;max-width:230px;line-height:1.45;">
    <div style="font-size:13px;font-weight:700;color:#1c1917;">${escapeHtml(place.name)}</div>
    <div style="font-size:11px;color:#78716c;margin-top:1px;">${escapeHtml(subtitle)}</div>
    ${shortNote ? `<div style="font-size:11px;color:#44403c;margin-top:4px;">${escapeHtml(shortNote)}</div>` : ""}
  </div>`;
}

function buildMarkerImageSrc(category: PlaceCategory) {
  const { emoji, color } = CATEGORY_MARKER_STYLE[category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
    <path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="${color}"/>
    <circle cx="20" cy="19" r="13" fill="white"/>
    <text x="20" y="25" font-size="16" text-anchor="middle">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 마커를 클릭했을 때 확대할 지도 레벨 (숫자가 작을수록 확대) */
const FOCUS_LEVEL = 3;

interface KakaoMapProps {
  places: Place[];
  center?: { lat: number; lng: number };
  onPlaceClick?: (place: Place) => void;
  /** 이 장소로 지도를 확대·이동시킴. 마커 클릭 외에 목록 쪽에서 선택했을 때도 쓸 수 있다. */
  focusedPlaceId?: string | null;
  /** 코스에 담긴 정거장. 번호 마커와 순서대로 이은 선으로 덧그린다. */
  courseStops?: CourseStop[];
  /** 구간별 실제 보행 경로. 없으면 정거장끼리 직선으로 잇는다. */
  walkLegs?: { path: [number, number][] }[];
  /**
   * 이 값이 바뀔 때만 지도 범위를 다시 맞춘다 (그리고 최초 1회).
   * 카테고리·분위기처럼 위치가 그대로인 필터에서 시야가 튀지 않게 하려는 것.
   * 동네처럼 보고 있어야 할 지역 자체가 달라지는 경우에만 넘긴다.
   */
  fitBoundsKey?: string;
}

export default function KakaoMap({
  places,
  center,
  onPlaceClick,
  focusedPlaceId,
  courseStops,
  walkLegs,
  fitBoundsKey = "",
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  // 장소 id -> 마커. 필터가 바뀌어도 겹치는 마커는 그대로 두고 차이만 반영한다.
  const markersRef = useRef<Map<string, any>>(new Map());
  // InfoWindow는 한 번에 하나만 뜨므로 장소마다 만들지 않고 하나를 돌려쓴다.
  const infoWindowRef = useRef<any>(null);
  // 마커를 재사용하므로 클릭 리스너는 마커를 만든 시점의 콜백을 계속 붙들고 있게 된다.
  // 항상 최신 콜백을 부르도록 ref를 거친다.
  const onPlaceClickRef = useRef(onPlaceClick);
  const markerImageCacheRef = useRef<Partial<Record<PlaceCategory, any>>>({});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastFitKeyRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onPlaceClickRef.current = onPlaceClick;
  }, [onPlaceClick]);

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

  // 필터링된 장소가 바뀔 때마다 마커 차이만 반영 (지도 재생성/재중심 없음).
  // 전부 지웠다 다시 만들면 필터를 누를 때마다 마커 수백 개를 새로 붙이게 된다.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.kakao.maps.InfoWindow({ content: "" });
    }
    const infoWindow = infoWindowRef.current;

    const nextIds = new Set(places.map((place) => place.id));

    // 이번 필터에서 빠진 마커만 지도에서 뗀다
    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });

    places.forEach((place) => {
      if (markersRef.current.has(place.id)) return; // 이미 떠 있는 마커는 건드리지 않는다

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

      window.kakao.maps.event.addListener(marker, "mouseover", () => {
        infoWindow.setContent(buildInfoWindowContent(place));
        infoWindow.open(map, marker);
      });
      window.kakao.maps.event.addListener(marker, "mouseout", () => infoWindow.close());
      window.kakao.maps.event.addListener(marker, "click", () => onPlaceClickRef.current?.(place));

      markersRef.current.set(place.id, marker);
    });

  }, [places, mapReady]);

  // 지도 범위 맞추기는 최초 1회, 그리고 fitBoundsKey가 바뀔 때만.
  // 필터를 눌렀다고 보던 위치가 튀면 지도를 옮겨가며 훑어보기가 어렵다.
  useEffect(() => {
    if (!mapReady || !mapRef.current || places.length === 0) return;
    if (lastFitKeyRef.current === fitBoundsKey) return;

    const bounds = new window.kakao.maps.LatLngBounds();
    places.forEach((place) => bounds.extend(new window.kakao.maps.LatLng(place.lat, place.lng)));
    mapRef.current.setBounds(bounds);
    lastFitKeyRef.current = fitBoundsKey;
  }, [places, fitBoundsKey, mapReady]);

  // 코스 오버레이: 번호 마커와 이어주는 선. 기존 카테고리 마커 위에 덧그린다.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const stops = courseStops ?? [];
    if (stops.length === 0) return;

    const markers = stops.map(
      (stop, i) =>
        new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(stop.lat, stop.lng),
          map,
          image: new window.kakao.maps.MarkerImage(
            buildNumberedMarkerSrc(i + 1),
            new window.kakao.maps.Size(36, 46),
            { offset: new window.kakao.maps.Point(18, 46) },
          ),
          zIndex: 10,
          title: stop.label,
        }),
    );

    const lines = buildCourseLines(map, stops, walkLegs);

    return () => {
      markers.forEach((m: any) => m.setMap(null));
      lines.forEach((line) => line.setMap(null));
    };
  }, [courseStops, walkLegs, mapReady]);

  // 선택된 장소로 확대·이동. 이미 그보다 확대해서 보고 있다면 배율은 건드리지 않는다.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !focusedPlaceId) return;
    const place = places.find((p) => p.id === focusedPlaceId);
    if (!place) return;

    const map = mapRef.current;
    const position = new window.kakao.maps.LatLng(place.lat, place.lng);
    if (map.getLevel() > FOCUS_LEVEL) map.setLevel(FOCUS_LEVEL);
    map.panTo(position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedPlaceId, mapReady]);

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm text-stone-500">
        NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았어요 (.env.local 확인)
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
