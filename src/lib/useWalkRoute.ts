"use client";

import { useEffect, useState } from "react";
import { CourseStop } from "./course";

export interface WalkLeg {
  path: [number, number][];
  meters: number | null;
  minutes: number | null;
}

/**
 * 코스 구간의 실제 보행 경로를 가져온다.
 * TMAP_APP_KEY가 없거나 호출이 실패하면 빈 배열을 돌려주고,
 * 지도는 직선으로, 시간은 직선거리 추정치로 되돌아간다.
 */
const EMPTY: WalkLeg[] = [];

export function useWalkRoute(stops: CourseStop[]): WalkLeg[] {
  const [fetched, setFetched] = useState<{ key: string; legs: WalkLeg[] }>({
    key: "",
    legs: EMPTY,
  });

  // 좌표가 바뀔 때만 다시 부른다. 이름만 바뀐 경우는 경로가 같다.
  const key = stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|");

  useEffect(() => {
    if (stops.length < 2) return;

    const controller = new AbortController();
    fetch("/api/walk-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops: stops.map((s) => ({ lat: s.lat, lng: s.lng })) }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { legs: EMPTY }))
      .then((data) => setFetched({ key, legs: Array.isArray(data.legs) ? data.legs : EMPTY }))
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setFetched({ key, legs: EMPTY });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 정거장이 바뀌었는데 아직 새 경로가 안 왔으면, 이전 코스의 경로를 그리지 않는다.
  return fetched.key === key ? fetched.legs : EMPTY;
}
