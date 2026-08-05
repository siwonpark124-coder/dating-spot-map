import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Place } from "@/types/place";
import PlaceEditor from "@/components/PlaceEditor";
import { checkImageUrl } from "@/lib/checkImageUrl";
import { authenticate, isAuthenticated, publishPlace, rejectPlace } from "./actions";

export default async function ReviewPage() {
  const authed = await isAuthenticated();

  if (!authed) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#f6f1e7]">
        <form
          action={authenticate}
          className="flex w-80 flex-col gap-3 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-lg font-bold text-stone-900">검수 페이지</h1>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoFocus
            className="rounded border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700">
            입장
          </button>
        </form>
      </main>
    );
  }

  const [
    { count: pendingCount },
    { count: rejectedCount },
    { count: draftedCount },
    { data: nextPlace },
    { count: placeFeedbackCount },
    { count: siteFeedbackCount },
    { count: courseSuggestionCount },
    { count: businessInquiryCount },
  ] = await Promise.all([
    supabaseAdmin.from("places").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabaseAdmin.from("places").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabaseAdmin
      .from("places")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review")
      .not("mood_tags", "eq", "{}"),
    supabaseAdmin
      .from("places")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.from("place_feedback").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabaseAdmin.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabaseAdmin.from("course_suggestions").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabaseAdmin.from("business_inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  const newFeedbackCount =
    (placeFeedbackCount ?? 0) +
    (siteFeedbackCount ?? 0) +
    (courseSuggestionCount ?? 0) +
    (businessInquiryCount ?? 0);

  const imageCheck = nextPlace ? await checkImageUrl(nextPlace.cover_image_url) : undefined;

  return (
    <main className="flex h-screen flex-col bg-[#f6f1e7]">
      <div className="flex shrink-0 items-center justify-between px-6 py-3">
        <p className="text-sm text-stone-600">검수 대기: {pendingCount ?? 0}개</p>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/review/map" className="text-amber-700 underline">
            지도로 빠르게 제외하기
          </Link>
          <Link href="/review/drafted" className="text-amber-700 underline">
            초안 준비된 장소{draftedCount ? ` (${draftedCount})` : ""}
          </Link>
          <Link href="/review/published" className="text-amber-700 underline">
            발행된 장소 수정
          </Link>
          <Link href="/review/rejected" className="text-amber-700 underline">
            제외한 장소{rejectedCount ? ` (${rejectedCount})` : ""}
          </Link>
          <Link href="/review/feedback" className="text-amber-700 underline">
            피드백 확인{newFeedbackCount > 0 ? ` (${newFeedbackCount})` : ""}
          </Link>
        </div>
      </div>
      {nextPlace ? (
        <PlaceEditor
          place={nextPlace as Place}
          primaryAction={publishPlace}
          primaryLabel="발행"
          secondaryAction={rejectPlace}
          secondaryLabel="제외"
          imageCheck={imageCheck}
        />
      ) : (
        <p className="px-6 text-stone-600">검수할 장소가 없어요 🎉</p>
      )}
    </main>
  );
}
