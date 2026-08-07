import { supabase } from "@/lib/supabase";
import { fetchPlacesWithReviewCount } from "@/lib/places";
import { fetchCuratedCourses } from "@/lib/curatedCourses";
import PlaceExplorer from "@/components/PlaceExplorer";

export const dynamic = "force-dynamic"; // 검수 페이지에서 발행한 장소가 재배포 없이 바로 반영되도록

export default async function Home() {
  // 추천 코스는 정거장까지 함께 실어 보낸다. 버튼을 눌렀을 때 추가 요청 없이 지도에 뜨도록.
  const [{ places, error }, curatedCourses] = await Promise.all([
    fetchPlacesWithReviewCount(),
    fetchCuratedCourses(supabase),
  ]);

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-sm text-red-600">데이터를 불러오지 못했어요: {error}</p>
      </main>
    );
  }

  // force-dynamic이라 프리렌더가 없으므로 useSearchParams용 Suspense 경계는 필요 없다.
  return <PlaceExplorer places={places} curatedCourses={curatedCourses} />;
}
