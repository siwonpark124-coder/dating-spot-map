import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Place } from "@/types/place";
import { Review } from "@/types/review";
import { CATEGORY_LABELS, PRICE_TIER_LABELS } from "@/lib/constants";
import ReviewSection from "@/components/ReviewSection";
import ReportPlaceForm from "@/components/ReportPlaceForm";

export const dynamic = "force-dynamic"; // 새 후기/발행 상태가 재배포 없이 바로 반영되도록

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: place } = await supabase
    .from("places")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!place) notFound();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, place_id, nickname, content, created_at")
    .eq("place_id", id)
    .order("created_at", { ascending: false });

  const typedPlace = place as Place;

  const subtitle = typedPlace.cuisine
    ? `${typedPlace.cuisine} ${CATEGORY_LABELS[typedPlace.category]}`
    : CATEGORY_LABELS[typedPlace.category];

  return (
    // 지도 화면의 카드가 분위기·추천 이유·길찾기·예약을 이미 다 보여준다.
    // 여기는 그걸 되풀이하지 않고 후기를 읽고 쓰는 자리로 둔다.
    <main className="min-h-screen bg-[#f6f1e7]">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 p-5">
        <Link href="/" className="text-sm text-amber-700 underline">
          ← 지도로 돌아가기
        </Link>

        {/* 어느 가게의 후기인지 알아볼 만큼만. 링크로 바로 들어온 사람도 있으니
            이름·분류·주소까지는 남겨둔다. */}
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-stone-900">{typedPlace.name}</h1>
          <p className="text-sm text-stone-500">
            {subtitle}
            {typedPlace.price_tier && ` · ${PRICE_TIER_LABELS[typedPlace.price_tier]}`}
            {" · "}
            {typedPlace.neighborhood}
          </p>
          <p className="text-xs text-stone-400">{typedPlace.address}</p>

          {typedPlace.kakao_map_url && (
            <a
              href={typedPlace.kakao_map_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 self-start text-sm text-amber-700 underline"
            >
              사진 · 메뉴 보기
            </a>
          )}
        </header>

        <ReviewSection placeId={typedPlace.id} reviews={(reviews ?? []) as Review[]} />

        <details className="rounded-xl border border-stone-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-stone-700">
            정보가 잘못됐거나 문 닫았나요?
          </summary>
          <div className="pt-3">
            <ReportPlaceForm placeId={typedPlace.id} />
          </div>
        </details>
      </div>
    </main>
  );
}
