import { supabase } from "./supabase";
import { PlaceWithReviewCount } from "@/types/place";

// reviews(count)는 드라이버 버전에 따라 배열로도 객체로도 온다.
function extractReviewCount(raw: unknown): number {
  if (Array.isArray(raw)) return (raw[0] as { count?: number } | undefined)?.count ?? 0;
  if (raw && typeof raw === "object" && "count" in raw) return (raw as { count?: number }).count ?? 0;
  return 0;
}

/**
 * 지도에 뿌릴 장소 전체.
 * status 조건을 걸지 않는 건 RLS가 이미 published만 내주기 때문이다 (0002).
 * 첫 화면과 관리자 코스 작성 화면이 같은 목록을 봐야 해서 여기로 모았다.
 */
export async function fetchPlacesWithReviewCount(): Promise<{
  places: PlaceWithReviewCount[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("places")
    .select("*, reviews(count)")
    .order("created_at", { ascending: false });

  if (error) return { places: [], error: error.message };

  const places = (data ?? []).map((place) => {
    const { reviews, ...rest } = place as Record<string, unknown>;
    return { ...rest, review_count: extractReviewCount(reviews) } as PlaceWithReviewCount;
  });

  return { places, error: null };
}
