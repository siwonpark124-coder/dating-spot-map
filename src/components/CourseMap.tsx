"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Kakao Maps SDK has no official TS types */

import { useEffect, useRef, useState } from "react";
import { CourseStop } from "@/lib/course";
import { buildCourseLines, buildNumberedMarkerSrc, loadKakaoSdk } from "@/lib/kakaoSdk";

/** 저장된 코스만 보여주는 읽기 전용 지도. 번호 마커 + 구간별 보행 경로. */
export default function CourseMap({
  stops,
  walkLegs,
}: {
  stops: CourseStop[];
  walkLegs?: { path: [number, number][] }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk().then((kakao) => {
      if (cancelled || !kakao || !containerRef.current) return;
      mapRef.current = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(stops[0]?.lat ?? 37.5563, stops[0]?.lng ?? 126.9236),
        level: 5,
        tileAnimation: false,
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = window.kakao;
    const map = mapRef.current;

    const markers = stops.map(
      (stop, i) =>
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(stop.lat, stop.lng),
          map,
          image: new kakao.maps.MarkerImage(
            buildNumberedMarkerSrc(i + 1),
            new kakao.maps.Size(36, 46),
            { offset: new kakao.maps.Point(18, 46) },
          ),
          title: stop.label,
        }),
    );

    const lines = buildCourseLines(map, stops, walkLegs);

    const bounds = new kakao.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend(new kakao.maps.LatLng(s.lat, s.lng)));
    map.setBounds(bounds, 40, 40, 40, 40);

    return () => {
      markers.forEach((m: any) => m.setMap(null));
      lines.forEach((line: any) => line.setMap(null));
    };
  }, [ready, stops, walkLegs]);

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm text-stone-500">
        지도를 불러올 수 없어요
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
