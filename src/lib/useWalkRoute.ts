"use client";

import { useEffect, useState } from "react";
import { CourseStop } from "./course";

export interface WalkLeg {
  path: [number, number][];
  meters: number | null;
  minutes: number | null;
}

const EMPTY: WalkLeg[] = [];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

export interface WalkRouteState {
  legs: WalkLeg[];
  /** 경로를 받아오는 중. 이 동안은 직선으로 그려지므로 화면에 알려준다. */
  loading: boolean;
  /** 응답은 왔는데 경로가 없음 (키 미설정이거나 호출 실패). 직선으로 그려진 이유. */
  unavailable: boolean;
  /** 사용자가 직접 다시 시도 */
  retry: () => void;
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
  // 값을 바꿔 effect를 다시 돌리기 위한 카운터 (좌표가 그대로여도 재요청하고 싶을 때)
  const [attempt, setAttempt] = useState(0);

  // 좌표가 바뀔 때만 다시 부른다. 이름만 바뀐 경우는 경로가 같다.
  const key = stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|");
  const needsRoute = stops.length > 1;

  useEffect(() => {
    if (!needsRoute) return;

    const controller = new AbortController();
    let retriesLeft = MAX_RETRIES;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // 서버가 잠깐 죽었거나 네트워크가 끊긴 경우, 좌표가 그대로면 다시 부를 계기가 없어
    // 그 코스는 계속 직선으로 남는다. 그래서 실패는 몇 번 재시도한다.
    const run = () => {
      fetch("/api/walk-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: stops.map((s) => ({ lat: s.lat, lng: s.lng })) }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => setFetched({ key, legs: Array.isArray(data.legs) ? data.legs : EMPTY }))
        .catch((error) => {
          if ((error as Error).name === "AbortError") return;
          if (retriesLeft > 0) {
            retriesLeft -= 1;
            retryTimer = setTimeout(run, RETRY_DELAY_MS);
            return;
          }
          setFetched({ key, legs: EMPTY });
        });
    };
    run();

    return () => {
      controller.abort();
      clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, needsRoute, attempt]);

  // 정거장이 바뀌었는데 아직 응답이 안 왔으면 이전 코스의 경로를 그리지 않는다.
  const settled = fetched.key === key;
  const legs = settled ? fetched.legs : EMPTY;
  return {
    legs,
    loading: needsRoute && !settled,
    unavailable: needsRoute && settled && legs.every((leg) => leg.path.length < 2),
    retry: () => setAttempt((n) => n + 1),
  };
}
