import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/app/review/actions";
import { CATEGORY_LABELS, PRICE_TIER_LABELS } from "@/lib/constants";
import { Place } from "@/types/place";

export default async function PublishedPlacesPage() {
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
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  const typedPlaces = (places ?? []) as Place[];

  return (
    <main className="min-h-screen bg-[#f6f1e7] p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/review" className="text-sm text-amber-700 underline">
          ← 장소 검수로
        </Link>
        <h1 className="text-lg font-bold text-stone-900">발행된 장소 ({typedPlaces.length}개)</h1>

        {typedPlaces.length === 0 && <p className="text-sm text-stone-500">발행된 장소가 없어요.</p>}

        <div className="flex flex-col gap-2">
          {typedPlaces.map((place) => (
            <Link
              key={place.id}
              href={`/review/edit/${place.id}`}
              className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 hover:border-stone-400"
            >
              <div>
                <p className="font-semibold text-stone-900">{place.name}</p>
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
              <span className="text-sm text-amber-700 underline">수정 →</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
