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

/** 키 없음 경고는 요청마다 찍으면 시끄러우니 한 번만 남긴다 */
let warnedMissingKey = false;

function cacheKey(stops: Point[]) {
  return stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|");
}

interface Segment {
  distance?: number;
  duration?: number;
  steps?: { way_points?: number[] }[];
}

interface Feature {
  geometry?: { coordinates?: [number, number][] };
  properties?: { segments?: Segment[]; way_points?: number[] };
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

/** ORS GeoJSON 응답을 구간별 경로로 자른다. */
function splitLegs(data: unknown, stopCount: number): WalkLeg[] {
  const feature = (data as { features?: Feature[] })?.features?.[0];
  const coords: [number, number][] = feature?.geometry?.coordinates ?? [];
  const segments: Segment[] = feature?.properties?.segments ?? [];
  const wayPoints: number[] = feature?.properties?.way_points ?? [];
  const usableWayPoints = wayPoints.length === stopCount;

  return Array.from({ length: stopCount - 1 }, (_, i) => {
    const segment = segments[i];
    const meters = segment?.distance != null ? Math.round(segment.distance) : null;
    const minutes =
      segment?.duration != null ? Math.max(1, Math.round(segment.duration / 60)) : null;

    // 구간 경계는 최상위 way_points로 자르고, 없으면 그 구간의 steps에서 뽑는다.
    const bounds = usableWayPoints
      ? ([wayPoints[i], wayPoints[i + 1]] as const)
      : stepBounds(segment);

    const path =
      bounds && coords.length > 1
        ? coords.slice(bounds[0], bounds[1] + 1).map(([lng, lat]) => [lat, lng] as [number, number])
        : [];

    return { path, meters, minutes };
  });
}

/** 구간 하나만 따로 계산한다. 전체 요청에서 그 구간을 못 잘랐을 때의 보강. */
async function fetchLeg(from: Point, to: Point, apiKey: string): Promise<WalkLeg | null> {
  try {
    const res = await fetch(ORS_ENDPOINT, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      }),
    });
    if (!res.ok) {
      console.error("ORS single leg failed:", res.status, await res.text());
      return null;
    }
    const [leg] = splitLegs(await res.json(), 2);
    return leg?.path.length > 1 ? leg : null;
  } catch (error) {
    console.error("ORS single leg error:", error);
    return null;
  }
}

function roughMeters(a: Point, b: Point) {
  return Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) * 111000;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    // 키가 없어도 코스 기능 자체는 동작해야 하므로 에러가 아니라 "없음"으로 알린다.
    // 다만 배포 환경에 키를 안 넣어 조용히 직선으로 그려지는 일이 잦아 로그는 남긴다.
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "ORS_API_KEY가 없어 보행 경로를 계산하지 않습니다. 코스는 직선으로 그려집니다.",
      );
    }
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

    const legs = splitLegs(await res.json(), valid.length);

    // 한 번에 계산한 경로를 구간별로 못 자른 경우가 있다. 그때는 그 구간만 따로 부른다
    // (구간 하나짜리 요청은 자를 일이 없어 항상 경로가 나온다).
    // 이걸 안 하면 지도에 직선이 그려지는데, 그게 원래 그런 건지 실패한 건지 알 수 없다.
    for (let i = 0; i < legs.length; i++) {
      if (legs[i].path.length > 1) continue;
      const single = await fetchLeg(valid[i], valid[i + 1], apiKey);
      if (single) legs[i] = single;
    }

    // 경로가 온전히 나온 결과만 캐싱한다.
    // 실패한 결과를 캐싱하면 이후 재시도가 전부 그 빈 결과를 되돌려받아 영영 복구되지 않는다.
    if (legs.every((leg) => leg.path.length > 1)) {
      if (cache.size >= CACHE_LIMIT) cache.clear();
      cache.set(key, legs);
    }
    return Response.json({ available: true, legs });
  } catch (error) {
    console.error("walk-route error:", error);
    return Response.json({ available: true, legs: fallback });
  }
}
