import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/app/review/actions";
import { CATEGORY_LABELS, PRICE_TIER_LABELS } from "@/lib/constants";
import { Place } from "@/types/place";

// 초안(분위기/가격대/추천 이유)이 미리 채워진 검수 대기 장소 목록
export default async function DraftedPlacesPage() {
  const authed = await isAuthenticated();

  if (!authed) {
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

  const { data: places } = await supabaseAdmin
    .from("places")
    .select("*")
    .eq("status", "pending_review")
    .not("mood_tags", "eq", "{}")
    .order("created_at", { ascending: true });

  const typedPlaces = (places ?? []) as Place[];
  const flaggedCount = typedPlaces.filter((p) => p.curation_note?.startsWith("⚠️")).length;

  return (
    <main className="min-h-screen bg-[#f6f1e7] p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/review" className="text-sm text-amber-700 underline">
          ← 장소 검수로
        </Link>
        <h1 className="text-lg font-bold text-stone-900">초안 준비된 장소 ({typedPlaces.length}개)</h1>
        {flaggedCount > 0 && (
          <p className="text-sm text-red-600">⚠️ 확인 필요 표시된 항목 {flaggedCount}개 — 먼저 살펴보는 걸 추천해요.</p>
        )}

        {typedPlaces.length === 0 && <p className="text-sm text-stone-500">초안이 준비된 장소가 없어요.</p>}

        <div className="flex flex-col gap-2">
          {typedPlaces.map((place) => {
            const flagged = place.curation_note?.startsWith("⚠️");
            return (
              <Link
                key={place.id}
                href={`/review/queue/${place.id}`}
                className={`flex items-center justify-between gap-3 rounded-lg border bg-white p-3 hover:border-stone-400 ${
                  flagged ? "border-red-300" : "border-stone-200"
                }`}
              >
                <div>
                  <p className="font-semibold text-stone-900">
                    {flagged && "⚠️ "}
                    {place.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {CATEGORY_LABELS[place.category]} · {place.neighborhood} · {place.address}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {place.mood_tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                        {tag}
                      </span>
                    ))}
                    {place.price_tier && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                        {PRICE_TIER_LABELS[place.price_tier]}
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm text-amber-700 underline">확인 →</span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
