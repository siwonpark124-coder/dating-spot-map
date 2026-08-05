import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAuthenticated } from "@/app/review/actions";
import {
  resolvePlaceFeedback,
  resolveSiteFeedback,
  resolveCourseSuggestion,
  resolveBusinessInquiry,
} from "./actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FeedbackAdminPage() {
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

  const { data: placeFeedback } = await supabaseAdmin
    .from("place_feedback")
    .select("id, category, message, status, created_at, places(name)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: siteFeedback } = await supabaseAdmin
    .from("site_feedback")
    .select("id, message, status, created_at")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: courseSuggestions } = await supabaseAdmin
    .from("course_suggestions")
    .select("id, nickname, content, status, created_at")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: businessInquiries } = await supabaseAdmin
    .from("business_inquiries")
    .select("id, business_name, contact, message, status, created_at")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f6f1e7] p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <Link href="/review" className="text-sm text-amber-700 underline">
          ← 장소 검수로
        </Link>

        <section className="flex flex-col gap-3">
          <h1 className="text-lg font-bold text-stone-900">장소별 신고</h1>
          {(placeFeedback ?? []).length === 0 && <p className="text-sm text-stone-500">신고된 내용이 없어요.</p>}
          {(placeFeedback ?? []).map((item) => {
            const placeName = (item as unknown as { places: { name: string } | null }).places?.name ?? "(삭제된 장소)";
            return (
              <div
                key={item.id}
                className={`flex flex-col gap-1 rounded-lg border p-3 ${
                  item.status === "resolved" ? "border-stone-200 bg-stone-100 opacity-60" : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-800">
                    {placeName} · {item.category}
                  </span>
                  <span className="text-xs text-stone-400">{formatDate(item.created_at)}</span>
                </div>
                <p className="text-sm text-stone-700">{item.message}</p>
                {item.status === "new" && (
                  <form action={resolvePlaceFeedback} className="self-end">
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="text-xs text-amber-700 underline">
                      처리완료
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-3">
          <h1 className="text-lg font-bold text-stone-900">사이트 피드백</h1>
          {(siteFeedback ?? []).length === 0 && <p className="text-sm text-stone-500">피드백이 없어요.</p>}
          {(siteFeedback ?? []).map((item) => (
            <div
              key={item.id}
              className={`flex flex-col gap-1 rounded-lg border p-3 ${
                item.status === "resolved" ? "border-stone-200 bg-stone-100 opacity-60" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">{formatDate(item.created_at)}</span>
              </div>
              <p className="text-sm text-stone-700">{item.message}</p>
              {item.status === "new" && (
                <form action={resolveSiteFeedback} className="self-end">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="text-xs text-amber-700 underline">
                    처리완료
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h1 className="text-lg font-bold text-stone-900">코스 추천</h1>
          {(courseSuggestions ?? []).length === 0 && (
            <p className="text-sm text-stone-500">추천된 코스가 없어요.</p>
          )}
          {(courseSuggestions ?? []).map((item) => (
            <div
              key={item.id}
              className={`flex flex-col gap-1 rounded-lg border p-3 ${
                item.status === "resolved" ? "border-stone-200 bg-stone-100 opacity-60" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-800">{item.nickname ?? "익명"}</span>
                <span className="text-xs text-stone-400">{formatDate(item.created_at)}</span>
              </div>
              <p className="text-sm text-stone-700">{item.content}</p>
              {item.status === "new" && (
                <form action={resolveCourseSuggestion} className="self-end">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="text-xs text-amber-700 underline">
                    처리완료
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h1 className="text-lg font-bold text-stone-900">비즈니스 문의</h1>
          {(businessInquiries ?? []).length === 0 && (
            <p className="text-sm text-stone-500">문의가 없어요.</p>
          )}
          {(businessInquiries ?? []).map((item) => (
            <div
              key={item.id}
              className={`flex flex-col gap-1 rounded-lg border p-3 ${
                item.status === "resolved" ? "border-stone-200 bg-stone-100 opacity-60" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-800">
                  {item.business_name} · {item.contact}
                </span>
                <span className="text-xs text-stone-400">{formatDate(item.created_at)}</span>
              </div>
              <p className="text-sm text-stone-700">{item.message}</p>
              {item.status === "new" && (
                <form action={resolveBusinessInquiry} className="self-end">
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="text-xs text-amber-700 underline">
                    처리완료
                  </button>
                </form>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
