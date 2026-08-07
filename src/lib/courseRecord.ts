// 서버 전용. 코스 한 벌(courses + course_stops)을 저장하는 공통 경로.
// 사용자 저장과 관리자의 추천 코스 등록이 같은 표를 쓰므로 여기로 모았다.
// ("use server" 파일에 두면 export 하나하나가 외부에서 호출 가능한 엔드포인트가 된다.)
import { supabaseAdmin } from "./supabaseAdmin";
import { MAX_STOPS } from "./course";

/** URL에 그대로 노출되는 슬러그. 헷갈리는 글자(0/O, 1/l)는 뺐다. */
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const SLUG_LENGTH = 8;

function generateSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

export interface StopInput {
  placeId: string | null;
  label: string;
  lat: number;
  lng: number;
}

/** 정거장 입력을 다듬는다. 형식이 어긋나면 null. */
export function cleanStops(stops: StopInput[]): StopInput[] | null {
  const clean = stops.map((stop) => ({
    placeId: stop.placeId,
    label: String(stop.label ?? "").trim().slice(0, 120),
    lat: Number(stop.lat),
    lng: Number(stop.lng),
  }));

  if (clean.some((s) => !s.label || !Number.isFinite(s.lat) || !Number.isFinite(s.lng))) {
    return null;
  }
  return clean;
}

export interface CourseMeta {
  title: string | null;
  subtitle?: string | null;
  isCurated?: boolean;
  sortOrder?: number;
}

/**
 * 코스와 정거장을 함께 넣는다. 정거장 삽입이 실패하면 코스도 되돌려서
 * 정거장이 없는 빈 코스가 남지 않게 한다.
 */
export async function insertCourse(
  meta: CourseMeta,
  stops: StopInput[],
): Promise<{ id: string } | { error: string }> {
  if (stops.length < 2) return { error: "두 곳 이상 담아야 코스가 돼요." };
  if (stops.length > MAX_STOPS) return { error: `코스는 최대 ${MAX_STOPS}곳까지예요.` };

  const clean = cleanStops(stops);
  if (!clean) return { error: "코스 정보가 올바르지 않아요." };

  const id = generateSlug();

  const { error: courseError } = await supabaseAdmin.from("courses").insert({
    id,
    title: meta.title,
    subtitle: meta.subtitle ?? null,
    is_curated: meta.isCurated ?? false,
    sort_order: meta.sortOrder ?? 0,
  });

  if (courseError) {
    console.error("insertCourse failed:", courseError.message);
    return { error: "저장에 실패했어요." };
  }

  const { error: stopsError } = await supabaseAdmin.from("course_stops").insert(
    clean.map((stop, i) => ({
      course_id: id,
      position: i + 1,
      place_id: stop.placeId,
      lat: stop.lat,
      lng: stop.lng,
      label: stop.label,
    })),
  );

  if (stopsError) {
    console.error("insertCourse stops failed:", stopsError.message);
    await supabaseAdmin.from("courses").delete().eq("id", id);
    return { error: "저장에 실패했어요." };
  }

  return { id };
}
