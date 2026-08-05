import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated, restorePlace } from "@/app/review/actions";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Place } from "@/types/place";

export default async function RejectedPlacesPage() {
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
    .eq("status", "rejected")
    .order("updated_at", { ascending: false });

  const typedPlaces = (places ?? []) as Place[];

  return (
    <main className="min-h-screen bg-[#f6f1e7] p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/review" className="text-sm text-amber-700 underline">
          ← 장소 검수로
        </Link>
        <h1 className="text-lg font-bold text-stone-900">제외한 장소 ({typedPlaces.length}개)</h1>

        {typedPlaces.length === 0 && <p className="text-sm text-stone-500">제외한 장소가 없어요.</p>}

        <div className="flex flex-col gap-2">
          {typedPlaces.map((place) => (
            <div
              key={place.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3"
            >
              <div>
                <p className="font-semibold text-stone-900">{place.name}</p>
                <p className="text-xs text-stone-500">
                  {CATEGORY_LABELS[place.category]} · {place.neighborhood} · {place.address}
                </p>
                {place.rejection_reason && (
                  <p className="mt-1 text-sm text-red-600">사유: {place.rejection_reason}</p>
                )}
              </div>
              <form action={restorePlace}>
                <input type="hidden" name="id" value={place.id} />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100"
                >
                  복구
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
