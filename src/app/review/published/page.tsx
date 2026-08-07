import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/app/review/actions";
import { Place } from "@/types/place";
import PublishedPlacesList from "@/components/PublishedPlacesList";

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
        <h1 className="text-lg font-bold text-stone-900">발행된 장소</h1>

        {typedPlaces.length === 0 ? (
          <p className="text-sm text-stone-500">발행된 장소가 없어요.</p>
        ) : (
          <PublishedPlacesList places={typedPlaces} />
        )}
      </div>
    </main>
  );
}
