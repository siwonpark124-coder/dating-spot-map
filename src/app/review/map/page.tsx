import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/app/review/actions";
import { Place } from "@/types/place";
import PendingPlacesMap from "@/components/PendingPlacesMap";

export default async function ReviewMapPage() {
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
    .order("created_at", { ascending: true });

  return (
    <main className="flex h-screen flex-col bg-[#f6f1e7]">
      <div className="flex shrink-0 items-center justify-between px-6 py-3">
        <Link href="/review" className="text-sm text-amber-700 underline">
          ← 한 곳씩 검수하기
        </Link>
        <p className="text-sm text-stone-600">지도에서 빠르게 제외하기</p>
      </div>
      <div className="min-h-0 flex-1">
        <PendingPlacesMap initialPlaces={(places ?? []) as Place[]} />
      </div>
    </main>
  );
}
