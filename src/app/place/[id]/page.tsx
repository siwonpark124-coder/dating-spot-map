import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Place } from "@/types/place";
import { Review } from "@/types/review";
import { CATEGORY_LABELS, PRICE_TIER_LABELS } from "@/lib/constants";
import ReviewSection from "@/components/ReviewSection";
import ReportPlaceForm from "@/components/ReportPlaceForm";
import KakaoMap from "@/components/KakaoMap";

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

  return (
    <main className="min-h-screen bg-[#f6f1e7]">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <Link href="/" className="text-sm text-amber-700 underline">
          ← 지도로 돌아가기
        </Link>

        <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-6">
          <h1 className="text-xl font-bold text-stone-900">{typedPlace.name}</h1>
          <p className="text-sm text-stone-500">
            {typedPlace.cuisine ? `${typedPlace.cuisine} ${CATEGORY_LABELS[typedPlace.category]}` : CATEGORY_LABELS[typedPlace.category]}
            {" · "}
            {typedPlace.neighborhood} · {typedPlace.address}
            {typedPlace.price_tier && ` · ${PRICE_TIER_LABELS[typedPlace.price_tier]}`}
          </p>

          {typedPlace.mood_tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {typedPlace.mood_tags.map((tag) => (
                <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {typedPlace.curation_note && <p className="text-sm text-stone-700">{typedPlace.curation_note}</p>}
          {typedPlace.business_hours && <p className="text-xs text-stone-500">{typedPlace.business_hours}</p>}

          <div className="mt-1 flex gap-3 text-xs">
            {typedPlace.kakao_map_url && (
              <a href={typedPlace.kakao_map_url} target="_blank" rel="noreferrer" className="text-amber-700 underline">
                카카오맵
              </a>
            )}
            {typedPlace.naver_map_url && (
              <a href={typedPlace.naver_map_url} target="_blank" rel="noreferrer" className="text-amber-700 underline">
                네이버 길찾기
              </a>
            )}
            {typedPlace.reservation_url && (
              <a href={typedPlace.reservation_url} target="_blank" rel="noreferrer" className="text-stone-700 underline">
                예약
              </a>
            )}
          </div>

          <div className="h-48 overflow-hidden rounded-lg">
            <KakaoMap places={[typedPlace]} />
          </div>

          <ReportPlaceForm placeId={typedPlace.id} />
        </div>

        <ReviewSection placeId={typedPlace.id} reviews={(reviews ?? []) as Review[]} />
      </div>
    </main>
  );
}
