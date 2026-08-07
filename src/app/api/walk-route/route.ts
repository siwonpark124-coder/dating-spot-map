import { NextRequest } from "next/server";

// 코스 구간을 실제 보행로를 따라 그리기 위한 OpenRouteService 프록시.
//
// 카카오·네이버는 보행자 경로 API가 없어서(카카오 모빌리티는 자동차 전용) OSM 기반을 쓴다.
// 서울 6개 동네에서 골목 단위까지 경로가 나오는 걸 확인했고, 좌표계가 WGS84로 같아
// 카카오 지도에 그대로 얹힌다.
//
// ORS_API_KEY가 없으면 available:false를 돌려주고, 클라이언트는 직선(점선)으로 그린다.

const ORS_ENDPOINT = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
/** 이보다 먼 구간은 애초에 걸어갈 거리가 아니라 호출하지 않는다 */
const MAX_LEG_METERS = 20000;
const MAX_STOPS = 4;

interface Point {
  lat: number;
  lng: number;
}

export interface WalkLeg {
  /** 보행로를 따라가는 [위도, 경도] 좌표열. 비어 있으면 클라이언트가 직선으로 그린다. */
  path: [number, number][];
  meters: number | null;
  minutes: number | null;
}

const EMPTY_LEG: WalkLeg = { path: [], meters: null, minutes: null };

// 같은 코스를 여러 번 조회하는 경우가 많아 프로세스 안에 캐싱해 호출 수를 줄인다.
const cache = new Map<string, WalkLeg[]>();
const CACHE_LIMIT = 300;

function cacheKey(stops: Point[]) {
  return stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|");
}

interface Segment {
  distance?: number;
  duration?: number;
  steps?: { way_points?: number[] }[];
}

/** 구간의 첫 step 시작점 ~ 마지막 step 끝점. 최상위 way_points가 없을 때의 대안. */
function stepBounds(segment?: Segment): readonly [number, number] | null {
  const steps = segment?.steps;
  if (!steps?.length) return null;
  const start = steps[0].way_points?.[0];
  const end = steps[steps.length - 1].way_points?.[1];
  if (typeof start !== "number" || typeof end !== "number" || end <= start) return null;
  return [start, end] as const;
}

function roughMeters(a: Point, b: Point) {
  return Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) * 111000;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    // 키가 없어도 코스 기능 자체는 동작해야 하므로 에러가 아니라 "없음"으로 알린다
    return Response.json({ available: false, legs: [] });
  }

  let stops: Point[];
  try {
    const body = await request.json();
    stops = Array.isArray(body?.stops) ? body.stops : [];
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const valid = stops
    .map((s) => ({ lat: Number(s?.lat), lng: Number(s?.lng) }))
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    .slice(0, MAX_STOPS);

  if (valid.length < 2) return Response.json({ available: true, legs: [] });

  // 너무 먼 구간이 하나라도 있으면 전체를 부르지 않는다 (ORS는 한 번에 전 구간을 계산한다)
  const tooFar = valid.slice(0, -1).some((from, i) => roughMeters(from, valid[i + 1]) > MAX_LEG_METERS);
  if (tooFar) {
    return Response.json({ available: true, legs: valid.slice(0, -1).map(() => EMPTY_LEG) });
  }

  const key = cacheKey(valid);
  const cached = cache.get(key);
  if (cached) return Response.json({ available: true, legs: cached });

  const fallback = valid.slice(0, -1).map(() => EMPTY_LEG);

  try {
    const res = await fetch(ORS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      // ORS는 [경도, 위도] 순서를 쓴다
      body: JSON.stringify({ coordinates: valid.map((s) => [s.lng, s.lat]) }),
    });

    if (!res.ok) {
      console.error("ORS directions failed:", res.status, await res.text());
      return Response.json({ available: true, legs: fallback });
    }

    const data = await res.json();
    const feature = data?.features?.[0];
    const coords: [number, number][] = feature?.geometry?.coordinates ?? [];
    const segments: Segment[] = feature?.properties?.segments ?? [];
    // 전체 경로에서 각 정거장이 놓인 위치. 구간별로 잘라내는 데 쓴다.
    const wayPoints: number[] = feature?.properties?.way_points ?? [];
    const usableWayPoints = wayPoints.length === valid.length;

    const legs: WalkLeg[] = valid.slice(0, -1).map((_, i) => {
      const segment = segments[i];
      const meters = segment?.distance != null ? Math.round(segment.distance) : null;
      const minutes =
        segment?.duration != null ? Math.max(1, Math.round(segment.duration / 60)) : null;

      // 구간 경계는 최상위 way_points로 자르고, 그게 없으면 각 구간의 steps에서 뽑는다.
      // 둘 다 없으면 경로선만 포기하고 거리·시간은 실제 값을 쓴다
      // (지도는 직선 점선, 표시되는 시간은 정확).
      const bounds = usableWayPoints
        ? ([wayPoints[i], wayPoints[i + 1]] as const)
        : stepBounds(segment);

      const path =
        bounds && coords.length > 1
          ? coords
              .slice(bounds[0], bounds[1] + 1)
              .map(([lng, lat]) => [lat, lng] as [number, number])
          : [];

      return { path, meters, minutes };
    });

    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(key, legs);
    return Response.json({ available: true, legs });
  } catch (error) {
    console.error("walk-route error:", error);
    return Response.json({ available: true, legs: fallback });
  }
}
