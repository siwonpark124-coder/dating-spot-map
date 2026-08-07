"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- Kakao Maps SDK has no official TS types */

import { useEffect, useRef, useState } from "react";
import { CourseStop } from "@/lib/course";
import { buildNumberedMarkerSrc, loadKakaoSdk } from "@/lib/kakaoSdk";

/** 저장된 코스만 보여주는 읽기 전용 지도. 번호 마커 + 순서대로 이은 선. */
export default function CourseMap({ stops }: { stops: CourseStop[] }) {
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

    const line = new kakao.maps.Polyline({
      map,
      path: stops.map((s) => new kakao.maps.LatLng(s.lat, s.lng)),
      strokeWeight: 4,
      strokeColor: "#92400e",
      strokeOpacity: 0.85,
      strokeStyle: "solid",
    });

    const bounds = new kakao.maps.LatLngBounds();
    stops.forEach((s) => bounds.extend(new kakao.maps.LatLng(s.lat, s.lng)));
    map.setBounds(bounds, 40, 40, 40, 40);

    return () => {
      markers.forEach((m: any) => m.setMap(null));
      line.setMap(null);
    };
  }, [ready, stops]);

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm text-stone-500">
        지도를 불러올 수 없어요
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
