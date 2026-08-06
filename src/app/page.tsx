import { supabase } from "@/lib/supabase";
import { PlaceWithReviewCount } from "@/types/place";
import PlaceExplorer from "@/components/PlaceExplorer";

export const dynamic = "force-dynamic"; // 검수 페이지에서 발행한 장소가 재배포 없이 바로 반영되도록

function extractReviewCount(raw: unknown): number {
  if (Array.isArray(raw)) return (raw[0] as { count?: number } | undefined)?.count ?? 0;
  if (raw && typeof raw === "object" && "count" in raw) return (raw as { count?: number }).count ?? 0;
  return 0;
}

export default async function Home() {
  const { data: places, error } = await supabase
    .from("places")
    .select("*, reviews(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-sm text-red-600">데이터를 불러오지 못했어요: {error.message}</p>
      </main>
    );
  }

  const placesWithReviewCount: PlaceWithReviewCount[] = (places ?? []).map((place) => {
    const { reviews, ...rest } = place as Record<string, unknown>;
    return { ...rest, review_count: extractReviewCount(reviews) } as PlaceWithReviewCount;
  });

  // force-dynamic이라 프리렌더가 없으므로 useSearchParams용 Suspense 경계는 필요 없다.
  return <PlaceExplorer places={placesWithReviewCount} />;
}
