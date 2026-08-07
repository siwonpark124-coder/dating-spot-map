"use client";

import Link from "next/link";
import { CourseStop, courseLegs, formatDistance, totalWalkMinutes } from "@/lib/course";
import { useWalkRouteState } from "@/lib/useWalkRoute";
import CourseMap from "./CourseMap";

/**
 * 저장된 코스를 보여주는 화면.
 * 보행 경로를 한 번만 가져와서 지도와 구간 시간이 같은 값을 쓰도록 여기서 묶는다.
 */
export default function CourseView({ stops }: { stops: CourseStop[] }) {
  const { legs: walkLegs, loading, noPath, retry } = useWalkRouteState(stops);
  const legs = courseLegs(stops, walkLegs);
  const estimated = legs.some((leg) => !leg.isActualRoute);

  return (
    <>
      <p className="text-sm text-stone-500">
        {stops.length}곳 · 걸어서 총 {totalWalkMinutes(stops, walkLegs)}분
        {loading && <span className="ml-1 text-stone-400">· 경로 계산 중…</span>}
      </p>

      <div className="h-72 overflow-hidden rounded-xl border border-stone-200">
        <CourseMap stops={stops} walkLegs={walkLegs} />
      </div>

      <ol className="flex flex-col gap-2">
        {stops.map((stop, i) => (
          <li key={`${stop.lat}-${stop.lng}-${i}`} className="flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-800 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-stone-900">{stop.label}</span>
              {stop.placeId && (
                <Link
                  href={`/place/${stop.placeId}`}
                  className="shrink-0 text-xs text-amber-700 underline"
                >
                  자세히
                </Link>
              )}
            </div>

            {legs[i] && (
              <div className="flex items-center gap-2 pl-10 text-xs text-stone-500">
                <span>
                  도보 {legs[i].walkMinutes}분 · {formatDistance(legs[i].meters)}
                </span>
                {legs[i].isFar && <span className="text-amber-700">걷기엔 좀 멀어요</span>}
                <a
                  href={legs[i].directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-stone-700"
                >
                  길찾기
                </a>
              </div>
            )}
          </li>
        ))}
      </ol>

      <p className="text-xs text-stone-400">
        {loading
          ? "보행 경로를 불러오는 중이에요."
          : estimated
            ? "도보 시간은 직선거리 기준 추정치예요."
            : "도보 시간은 실제 보행로 기준이에요."}{" "}
        지하철·버스·자차는 각 구간의 길찾기에서 확인할 수 있어요.
        {noPath && !loading && (
          <button type="button" onClick={retry} className="ml-1 underline hover:text-stone-600">
            경로 다시 불러오기
          </button>
        )}
      </p>
    </>
  );
}
