import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated, publishPlace, rejectPlace } from "@/app/review/actions";
import PlaceEditor from "@/components/PlaceEditor";
import { checkImageUrl } from "@/lib/checkImageUrl";
import { Place } from "@/types/place";

// 검수 대기열에서 특정 장소 하나를 지정해서 여는 화면 (초안 목록 등에서 바로 진입할 때 사용)
export default async function QueuePlacePage({ params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;

  const { data: place } = await supabaseAdmin
    .from("places")
    .select("*")
    .eq("id", id)
    .eq("status", "pending_review")
    .maybeSingle();

  if (!place) notFound();

  const imageCheck = await checkImageUrl(place.cover_image_url);

  return (
    <main className="flex h-screen flex-col bg-[#f6f1e7]">
      <div className="flex shrink-0 items-center px-6 py-3">
        <Link href="/review/drafted" className="text-sm text-amber-700 underline">
          ← 초안 준비된 장소 목록
        </Link>
      </div>
      <PlaceEditor
        place={place as Place}
        primaryAction={publishPlace}
        primaryLabel="발행"
        secondaryAction={rejectPlace}
        secondaryLabel="제외"
        imageCheck={imageCheck}
      />
    </main>
  );
}
