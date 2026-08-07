/* eslint-disable @typescript-eslint/no-explicit-any -- Kakao Maps SDK has no official TS types */

declare global {
  interface Window {
    kakao: any;
  }
}

const SCRIPT_ID = "kakao-map-sdk";

let loadPromise: Promise<any> | null = null;

/**
 * 카카오 지도 SDK를 한 번만 불러온다.
 * 지도를 쓰는 컴포넌트가 여러 개라 각자 script 태그를 넣지 않도록 여기로 모았다.
 */
export function loadKakaoSdk(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!appKey) return Promise.resolve(null);

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const done = () => window.kakao.maps.load(() => resolve(window.kakao));

    if (window.kakao?.maps) {
      done();
      return;
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
      document.head.appendChild(script);
    }
    script.addEventListener("load", done, { once: true });
  });

  return loadPromise;
}

interface LatLngLike {
  lat: number;
  lng: number;
}

/**
 * 코스 구간을 잇는 선을 그린다.
 * 보행 경로(walkLegs)가 있으면 실제 길을 따라 그리고, 없는 구간만 직선으로 잇는다.
 * 직선 구간은 점선으로 그려서 "실제 경로가 아니라 이어준 선"임을 구분한다.
 */
export function buildCourseLines(
  map: any,
  stops: LatLngLike[],
  walkLegs?: { path: [number, number][] }[],
): any[] {
  if (stops.length < 2) return [];
  const kakao = window.kakao;

  return stops.slice(0, -1).map((from, i) => {
    const to = stops[i + 1];
    const walkPath = walkLegs?.[i]?.path;
    const hasRoute = Array.isArray(walkPath) && walkPath.length > 1;

    const path = hasRoute
      ? walkPath.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng))
      : [new kakao.maps.LatLng(from.lat, from.lng), new kakao.maps.LatLng(to.lat, to.lng)];

    return new kakao.maps.Polyline({
      map,
      path,
      strokeWeight: 5,
      strokeColor: "#92400e",
      strokeOpacity: 0.85,
      strokeStyle: hasRoute ? "solid" : "shortdash",
      zIndex: 9,
    });
  });
}

/** 코스 순서를 나타내는 번호 마커 (①②③④ 대신 직접 그린다) */
export function buildNumberedMarkerSrc(index: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
    <path d="M18 0C8 0 0 8 0 18c0 12.5 18 28 18 28s18-15.5 18-28C36 8 28 0 18 0z" fill="#92400e"/>
    <circle cx="18" cy="17" r="11" fill="white"/>
    <text x="18" y="22" font-size="14" font-weight="bold" fill="#92400e" text-anchor="middle" font-family="sans-serif">${index}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
