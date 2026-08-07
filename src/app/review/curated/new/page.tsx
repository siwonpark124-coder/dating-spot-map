import Link from "next/link";
import { isAuthenticated } from "@/app/review/actions";
import { fetchPlacesWithReviewCount } from "@/lib/places";
import PlaceExplorer from "@/components/PlaceExplorer";
import { registerCuratedCourse } from "../actions";

export const dynamic = "force-dynamic";

/**
 * 추천 코스를 짜는 화면.
 * 첫 화면과 똑같은 도구(지도·필터·장소 검색·코스 트레이)가 필요하므로
 * PlaceExplorer를 그대로 쓰고, 다 짠 코스를 어디에 저장할지만 바꿔 넘긴다.
 */
export default async function NewCuratedCoursePage() {
  if (!(await isAuthenticated())) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#f6f1e7]">
        <p className="text-stone-600">
          <Link href="/review" className="text-amber-700 underline">
            /review
          </Link>
          에서 먼저 로그인해주세요.
        </p>
      </main>
    );
  }

  const { places, error } = await fetchPlacesWithReviewCount();

  if (error) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-sm text-red-600">데이터를 불러오지 못했어요: {error}</p>
      </main>
    );
  }

  return <PlaceExplorer places={places} registerCuratedAction={registerCuratedCourse} />;
}
