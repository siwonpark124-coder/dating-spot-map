import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated, updatePublishedPlace, unpublishPlace } from "@/app/review/actions";
import PlaceEditor from "@/components/PlaceEditor";
import { checkImageUrl } from "@/lib/checkImageUrl";
import { Place } from "@/types/place";

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: place } = await supabaseAdmin.from("places").select("*").eq("id", id).maybeSingle();

  if (!place) notFound();

  const imageCheck = await checkImageUrl(place.cover_image_url);

  return (
    <main className="flex h-screen flex-col bg-[#f6f1e7]">
      <div className="flex shrink-0 items-center px-6 py-3">
        <Link href="/review/published" className="text-sm text-amber-700 underline">
          ← 발행된 장소 목록
        </Link>
      </div>
      <PlaceEditor
        place={place as Place}
        primaryAction={updatePublishedPlace}
        primaryLabel="저장"
        secondaryAction={unpublishPlace}
        secondaryLabel="내리기"
        imageCheck={imageCheck}
      />
    </main>
  );
}
