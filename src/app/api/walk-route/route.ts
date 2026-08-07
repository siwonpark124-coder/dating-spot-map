import { NextRequest } from "next/server";

// 코스 구간을 실제 보행로를 따라 그리기 위한 TMAP 보행자 경로 프록시.
//
// 카카오 모빌리티는 자동차 경로만 주고 보행자 경로 API가 없어서, 국내 보행 경로는
// TMAP(SK open API)이 사실상 유일한 선택지다. appKey는 서버 전용이라 여기서 부른다.
//
// TMAP_APP_KEY가 없으면 available:false를 돌려주고, 클라이언트는 직선으로 그린다.

const TMAP_ENDPOINT = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json";
/** TMAP 보행자 경로가 감당하는 최대 거리. 이보다 멀면 애초에 걸어갈 구간이 아니다. */
const MAX_LEG_METERS = 20000;
const MAX_LEGS = 3; // 정거장 4개 → 구간 3개

interface Point {
  lat: number;
  lng: number;
}

export interface WalkLeg {
  /** 보행로를 따라가는 좌표열. 실패하면 빈 배열이고 클라이언트가 직선으로 그린다. */
  path: [number, number][];
  meters: number | null;
  minutes: number | null;
}

// 같은 구간이 반복 조회되므로 프로세스 안에 캐싱해 호출 수를 줄인다.
const cache = new Map<string, WalkLeg>();
const CACHE_LIMIT = 500;

function cacheKey(from: Point, to: Point) {
  const r = (n: number) => n.toFixed(5);
  return `${r(from.lat)},${r(from.lng)}>${r(to.lat)},${r(to.lng)}`;
}

async function fetchLeg(from: Point, to: Point, apiKey: string): Promise<WalkLeg> {
  const key = cacheKey(from, to);
  const cached = cache.get(key);
  if (cached) return cached;

  const empty: WalkLeg = { path: [], meters: null, minutes: null };

  const res = await fetch(TMAP_ENDPOINT, {
    method: "POST",
    headers: { appKey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      startX: from.lng,
      startY: from.lat,
      endX: to.lng,
      endY: to.lat,
      reqCoordType: "WGS84GEO",
      resCoordType: "WGS84GEO",
      // TMAP은 이름이 비어 있으면 400을 준다. 표시용이 아니라 형식상 필요한 값.
      startName: encodeURIComponent("출발"),
      endName: encodeURIComponent("도착"),
    }),
  });

  if (!res.ok) {
    console.error("TMAP pedestrian route failed:", res.status, await res.text());
    return empty;
  }

  const data = await res.json();
  const features: {
    geometry: { type: string; coordinates: number[] | number[][] };
    properties?: { totalDistance?: number; totalTime?: number };
  }[] = data.features ?? [];

  const path: [number, number][] = [];
  for (const feature of features) {
    if (feature.geometry?.type !== "LineString") continue;
    for (const coord of feature.geometry.coordinates as number[][]) {
      // TMAP은 [경도, 위도] 순으로 준다
      path.push([coord[1], coord[0]]);
    }
  }

  const summary = features.find((f) => f.properties?.totalDistance != null)?.properties;
  const leg: WalkLeg = {
    path,
    meters: summary?.totalDistance ?? null,
    minutes: summary?.totalTime != null ? Math.max(1, Math.round(summary.totalTime / 60)) : null,
  };

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, leg);
  return leg;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.TMAP_APP_KEY;
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

  const valid = stops.filter(
    (s) => s && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)),
  );
  if (valid.length < 2) return Response.json({ available: true, legs: [] });

  const pairs = valid
    .slice(0, MAX_LEGS + 1)
    .slice(0, -1)
    .map((from, i) => [from, valid[i + 1]] as const);

  try {
    const legs = await Promise.all(
      pairs.map(async ([from, to]) => {
        // 너무 먼 구간은 부르지 않는다. 어차피 걸어갈 거리가 아니다.
        const rough = Math.hypot(from.lat - to.lat, from.lng - to.lng) * 111000;
        if (rough > MAX_LEG_METERS) return { path: [], meters: null, minutes: null };
        return fetchLeg(from, to, apiKey);
      }),
    );
    return Response.json({ available: true, legs });
  } catch (error) {
    console.error("walk-route error:", error);
    return Response.json({ available: true, legs: [] });
  }
}
