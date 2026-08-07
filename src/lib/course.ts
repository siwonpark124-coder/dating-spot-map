import { Place } from "@/types/place";

/**
 * 한 코스에 담을 수 있는 최대 정거장 수.
 * 밥 → 카페 → 술이 기본 3개고 여기에 하나 더 붙일 여지까지가 4개다.
 * 이보다 늘리면 도보 동선이 성립하지 않고 지도의 선도 읽기 어려워진다.
 */
export const MAX_STOPS = 4;

/** 지도상 직선거리를 실제 도보 거리로 보정하는 계수 (골목·횡단보도 우회분) */
const DETOUR_FACTOR = 1.3;
/** 성인 평균 보행 속도 (m/분) */
const WALK_SPEED_M_PER_MIN = 67;
/** 이 거리를 넘으면 걸어가기 애매하다고 알려준다 */
export const FAR_LEG_METERS = 1500;

export interface CourseStop {
  /** 큐레이션 장소면 places.id, 카카오 검색으로 직접 추가한 지점이면 null */
  placeId: string | null;
  label: string;
  lat: number;
  lng: number;
  /** 목록 카드와 같은 부가 설명 (예: "한식-고깃집 식당"). 없으면 생략 */
  subtitle?: string;
}

export function stopFromPlace(place: Place, subtitle?: string): CourseStop {
  return { placeId: place.id, label: place.name, lat: place.lat, lng: place.lng, subtitle };
}

export function isSameStop(a: CourseStop, b: CourseStop): boolean {
  if (a.placeId && b.placeId) return a.placeId === b.placeId;
  // 직접 추가한 지점은 id가 없으니 좌표로 구분한다
  return !a.placeId && !b.placeId && a.lat === b.lat && a.lng === b.lng;
}

export function hasStop(stops: CourseStop[], stop: CourseStop): boolean {
  return stops.some((s) => isSameStop(s, stop));
}

/** 같은 카테고리를 여러 번 담는 건 막지 않는다. 중복 장소만 걸러낸다. */
export function addStop(stops: CourseStop[], stop: CourseStop): CourseStop[] {
  if (stops.length >= MAX_STOPS || hasStop(stops, stop)) return stops;
  return [...stops, stop];
}

export function removeStop(stops: CourseStop[], index: number): CourseStop[] {
  return stops.filter((_, i) => i !== index);
}

export function moveStop(stops: CourseStop[], index: number, direction: -1 | 1): CourseStop[] {
  const target = index + direction;
  if (target < 0 || target >= stops.length) return stops;
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** 두 지점 사이 직선거리 (m) */
export function haversineMeters(a: CourseStop, b: CourseStop): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface Leg {
  meters: number;
  walkMinutes: number;
  isFar: boolean;
  directionsUrl: string;
}

/**
 * 도보만 자체 계산한다. 지하철·버스·자차는 각각 다른 외부 API가 필요한데,
 * 같은 동네 안 1km 남짓 구간에선 대부분 걷는 게 빠르다.
 * 대신 구간마다 카카오맵 길찾기로 넘겨서 나머지 수단은 거기서 보게 한다.
 */
export function legBetween(from: CourseStop, to: CourseStop): Leg {
  const straight = haversineMeters(from, to);
  const meters = Math.round(straight * DETOUR_FACTOR);
  return {
    meters,
    walkMinutes: Math.max(1, Math.round(meters / WALK_SPEED_M_PER_MIN)),
    isFar: meters > FAR_LEG_METERS,
    directionsUrl: kakaoDirectionsUrl(from, to),
  };
}

export function courseLegs(stops: CourseStop[]): Leg[] {
  return stops.slice(0, -1).map((stop, i) => legBetween(stop, stops[i + 1]));
}

export function totalWalkMinutes(stops: CourseStop[]): number {
  return courseLegs(stops).reduce((sum, leg) => sum + leg.walkMinutes, 0);
}

/** 카카오맵 길찾기. 도보·대중교통·자차를 카카오가 알아서 계산해준다. */
export function kakaoDirectionsUrl(from: CourseStop, to: CourseStop): string {
  const point = (s: CourseStop) => `${encodeURIComponent(s.label)},${s.lat},${s.lng}`;
  return `https://map.kakao.com/link/from/${point(from)}/to/${point(to)}`;
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;
}

// ---------------------------------------------------------------------------
// 저장 전 코스는 브라우저에만 둔다. 로그인이 없고, 저장을 눌러야 서버로 간다.
// ---------------------------------------------------------------------------

const DRAFT_KEY = "oroji.course.draft";
const SAVED_KEY = "oroji.course.saved";

function readDraft(): CourseStop[] {
  if (typeof window === "undefined") return EMPTY_STOPS;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_STOPS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_STOPS;
    // 저장 형식이 바뀌었거나 손으로 고친 값이 들어와도 앱이 죽지 않도록 걸러낸다
    return parsed
      .filter(
        (s) =>
          s &&
          typeof s.label === "string" &&
          typeof s.lat === "number" &&
          typeof s.lng === "number",
      )
      .slice(0, MAX_STOPS)
      .map((s) => ({
        placeId: typeof s.placeId === "string" ? s.placeId : null,
        label: s.label,
        lat: s.lat,
        lng: s.lng,
        subtitle: typeof s.subtitle === "string" ? s.subtitle : undefined,
      }));
  } catch {
    return EMPTY_STOPS;
  }
}

// useSyncExternalStore로 읽기 위한 최소한의 스토어.
// localStorage는 React 바깥의 저장소라, effect에서 setState로 끌어오면
// 렌더가 한 번 더 돌고 서버 렌더 결과와도 어긋난다.
const EMPTY_STOPS: CourseStop[] = [];
let draftCache: CourseStop[] | null = null;
const draftListeners = new Set<() => void>();

export function subscribeDraft(listener: () => void): () => void {
  draftListeners.add(listener);
  return () => draftListeners.delete(listener);
}

/** 같은 내용이면 같은 배열을 돌려줘야 무한 렌더에 빠지지 않는다. */
export function getDraftSnapshot(): CourseStop[] {
  if (draftCache === null) draftCache = readDraft();
  return draftCache;
}

/** 서버에는 localStorage가 없으니 항상 빈 코스로 렌더한다. */
export function getDraftServerSnapshot(): CourseStop[] {
  return EMPTY_STOPS;
}

export function saveDraft(stops: CourseStop[]): void {
  draftCache = stops;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(stops));
    } catch {
      // 사생활 보호 모드 등 localStorage를 못 쓰는 환경에서는 메모리에만 둔다
    }
  }
  draftListeners.forEach((listener) => listener());
}

export interface SavedCourseRef {
  id: string;
  title: string;
  savedAt: string;
}

export function loadSavedCourses(): SavedCourseRef[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.id === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSavedCourse(ref: SavedCourseRef): void {
  if (typeof window === "undefined") return;
  try {
    const next = [ref, ...loadSavedCourses().filter((c) => c.id !== ref.id)].slice(0, 20);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  } catch {
    // 무시
  }
}
