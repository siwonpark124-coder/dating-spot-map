import { SupabaseClient } from "@supabase/supabase-js";
import { CourseStop, MAX_STOPS } from "./course";

/** 첫 화면 '추천 코스' 버튼에 뜨는 한 개의 코스 */
export interface CuratedCourse {
  id: string;
  title: string;
  subtitle: string | null;
  stops: CourseStop[];
}

export interface CuratedCourseAdmin extends CuratedCourse {
  sortOrder: number;
  hidden: boolean;
  /** 코스에 들어간 큐레이션 장소 중 지금은 발행 상태가 아닌 것들의 이름 */
  unpublishedLabels: string[];
}

/** 한 번에 보여줄 추천 코스 수. 이보다 늘면 목록이 아니라 페이지가 필요하다. */
export const MAX_CURATED_COURSES = 30;

interface StopRow {
  course_id: string;
  position: number;
  place_id: string | null;
  lat: number;
  lng: number;
  label: string;
}

/**
 * 코스별 정거장을 한 번의 쿼리로 가져와 코스 id별로 묶는다.
 * 코스마다 따로 조회하면 첫 화면 렌더가 코스 수만큼 왕복하게 된다.
 */
async function fetchStopsByCourse(
  client: SupabaseClient,
  courseIds: string[],
): Promise<Map<string, CourseStop[]>> {
  const byCourse = new Map<string, CourseStop[]>();
  if (courseIds.length === 0) return byCourse;

  const { data } = await client
    .from("course_stops")
    .select("course_id, position, place_id, lat, lng, label")
    .in("course_id", courseIds)
    .order("position");

  ((data ?? []) as StopRow[]).forEach((row) => {
    const stops = byCourse.get(row.course_id) ?? [];
    stops.push({ placeId: row.place_id, label: row.label, lat: row.lat, lng: row.lng });
    byCourse.set(row.course_id, stops);
  });

  return byCourse;
}

interface CourseRow {
  id: string;
  title: string | null;
  subtitle: string | null;
  sort_order: number;
  hidden: boolean;
}

/**
 * 사용자에게 보여줄 추천 코스. 숨긴 것과 정거장이 없는 것은 빼고 노출 순서대로 준다.
 * 첫 화면에서 정거장까지 함께 실어 보내므로, 버튼을 눌러도 추가 요청이 없다.
 */
export async function fetchCuratedCourses(client: SupabaseClient): Promise<CuratedCourse[]> {
  const { data: courses } = await client
    .from("courses")
    .select("id, title, subtitle, sort_order, hidden")
    .eq("is_curated", true)
    .eq("hidden", false)
    .order("sort_order")
    .order("created_at")
    .limit(MAX_CURATED_COURSES);

  const rows = (courses ?? []) as CourseRow[];
  const stopsByCourse = await fetchStopsByCourse(
    client,
    rows.map((row) => row.id),
  );

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title ?? "추천 코스",
      subtitle: row.subtitle,
      stops: (stopsByCourse.get(row.id) ?? []).slice(0, MAX_STOPS),
    }))
    .filter((course) => course.stops.length > 0);
}

/**
 * 관리 화면용. 숨긴 코스까지 모두 주고, 코스에 들어간 장소가 아직 발행 중인지 확인한다.
 * 제외된 장소는 상세 페이지가 404가 되므로 관리자가 알아채야 한다.
 */
export async function fetchCuratedCoursesForAdmin(
  client: SupabaseClient,
): Promise<CuratedCourseAdmin[]> {
  const { data: courses } = await client
    .from("courses")
    .select("id, title, subtitle, sort_order, hidden")
    .eq("is_curated", true)
    .order("sort_order")
    .order("created_at");

  const rows = (courses ?? []) as CourseRow[];
  const stopsByCourse = await fetchStopsByCourse(
    client,
    rows.map((row) => row.id),
  );

  const placeIds = [...stopsByCourse.values()]
    .flat()
    .map((stop) => stop.placeId)
    .filter((id): id is string => id !== null);

  const publishedIds = new Set<string>();
  if (placeIds.length > 0) {
    const { data: places } = await client
      .from("places")
      .select("id")
      .eq("status", "published")
      .in("id", [...new Set(placeIds)]);
    (places ?? []).forEach((place) => publishedIds.add(place.id as string));
  }

  return rows.map((row) => {
    const stops = stopsByCourse.get(row.id) ?? [];
    return {
      id: row.id,
      title: row.title ?? "추천 코스",
      subtitle: row.subtitle,
      stops,
      sortOrder: row.sort_order,
      hidden: row.hidden,
      unpublishedLabels: stops
        .filter((stop) => stop.placeId !== null && !publishedIds.has(stop.placeId))
        .map((stop) => stop.label),
    };
  });
}
