"use client";

import { useEffect, useState } from "react";
import { CourseStop } from "./course";

export interface WalkLeg {
  path: [number, number][];
  meters: number | null;
  minutes: number | null;
}

const EMPTY: WalkLeg[] = [];

export interface WalkRouteState {
  legs: WalkLeg[];
  /** 경로를 받아오는 중. 이 동안은 직선으로 그려지므로 화면에 알려준다. */
  loading: boolean;
}

/**
 * 코스 구간의 실제 보행 경로를 가져온다.
 * ORS_API_KEY가 없거나 호출이 실패하면 빈 배열을 돌려주고,
 * 지도는 직선(점선)으로, 시간은 직선거리 추정치로 되돌아간다.
 */
export function useWalkRoute(stops: CourseStop[]): WalkLeg[] {
  return useWalkRouteState(stops).legs;
}

export function useWalkRouteState(stops: CourseStop[]): WalkRouteState {
  // status를 따로 두는 이유: 응답이 빈 배열인 경우가 두 가지다.
  // 아직 안 온 것(loading)과 키가 없어 못 주는 것(done). 후자를 계속 "계산 중"으로
  // 보여주면 안 되므로 구분한다.
  const [fetched, setFetched] = useState<{ key: string; legs: WalkLeg[] }>({
    key: "",
    legs: EMPTY,
  });

  // 좌표가 바뀔 때만 다시 부른다. 이름만 바뀐 경우는 경로가 같다.
  const key = stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|");
  const needsRoute = stops.length > 1;

  useEffect(() => {
    if (!needsRoute) return;

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
  }, [key, needsRoute]);

  // 정거장이 바뀌었는데 아직 응답이 안 왔으면 이전 코스의 경로를 그리지 않는다.
  const settled = fetched.key === key;
  return {
    legs: settled ? fetched.legs : EMPTY,
    loading: needsRoute && !settled,
  };
}
