"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Place, MoodTag } from "@/types/place";
import { MOOD_TAGS, CATEGORY_LABELS, PRICE_TIER_LABELS, CUISINE_SUGGESTIONS } from "@/lib/constants";
import { ImageCheckResult } from "@/lib/checkImageUrl";

const PRICE_TIER_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3];

function toHttps(url: string) {
  return url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;
}

interface PlaceEditorProps {
  place: Place;
  primaryAction: (formData: FormData) => void | Promise<void>;
  primaryLabel: string;
  secondaryAction: (formData: FormData) => void | Promise<void>;
  secondaryLabel: string;
  imageCheck?: ImageCheckResult;
  // 검수 대기열에서 몇 번째 카드인지 (예: 42/677). 큐 흐름이 아닌 화면(발행된 장소 수정 등)에서는 생략.
  progress?: { current: number; total: number };
}

export default function PlaceEditor({
  place,
  primaryAction,
  primaryLabel,
  secondaryAction,
  secondaryLabel,
  imageCheck,
  progress,
}: PlaceEditorProps) {
  const [moodTags, setMoodTags] = useState<MoodTag[]>(place.mood_tags ?? []);
  const [priceTier, setPriceTier] = useState<1 | 2 | 3 | null>(place.price_tier);
  const [cuisine, setCuisine] = useState(place.cuisine ?? "");
  const [note, setNote] = useState(place.curation_note ?? "");
  const [firstMeetingOk, setFirstMeetingOk] = useState(place.first_meeting_ok ?? true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "primary" | "secondary"; status: "ok" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = moodTags.length > 0 && priceTier !== null;
  const canReject = rejectionReason.trim().length > 0;

  function toggleTag(tag: MoodTag) {
    setMoodTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function submitPrimary() {
    const formData = new FormData();
    formData.set("id", place.id);
    moodTags.forEach((tag) => formData.append("mood_tags", tag));
    formData.set("price_tier", String(priceTier ?? ""));
    formData.set("cuisine", cuisine.trim());
    formData.set("curation_note", note);
    formData.set("first_meeting_ok", String(firstMeetingOk));

    setFeedback(null);
    startTransition(async () => {
      try {
        await primaryAction(formData);
        setFeedback({ kind: "primary", status: "ok" });
        router.refresh();
      } catch {
        setFeedback({ kind: "primary", status: "error" });
      }
    });
  }

  function submitSecondary() {
    const formData = new FormData();
    formData.set("id", place.id);
    formData.set("rejection_reason", rejectionReason.trim());

    setFeedback(null);
    startTransition(async () => {
      try {
        await secondaryAction(formData);
        setFeedback({ kind: "secondary", status: "ok" });
        router.refresh();
      } catch {
        setFeedback({ kind: "secondary", status: "error" });
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto p-4 md:p-8">
      <div className="flex w-full max-w-5xl flex-col gap-6 self-start rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:flex-row">
        <div className="flex w-full flex-col gap-4 md:w-[380px] md:shrink-0">
        {progress && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500">
              <span>
                {progress.current} / {progress.total}
              </span>
              <span>{Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-stone-800 transition-all"
                style={{ width: `${Math.min(100, (progress.current / Math.max(progress.total, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-stone-900">{place.name}</h2>
          <p className="text-sm text-stone-500">
            {place.cuisine ? `${place.cuisine} ${CATEGORY_LABELS[place.category]}` : CATEGORY_LABELS[place.category]} ·{" "}
            {place.neighborhood} · {place.address}
          </p>
          {place.kakao_map_url && (
            <a
              href={place.kakao_map_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-amber-700 underline"
            >
              새 탭에서 열기 →
            </a>
          )}
        </div>

        {imageCheck && imageCheck.status !== "none" && (
          <div className="flex items-center gap-3 rounded-lg border border-stone-200 p-2">
            {place.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={place.cover_image_url}
                alt=""
                className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
              />
            )}
            <div className="flex flex-col gap-0.5">
              {imageCheck.status === "valid" ? (
                <span className="text-sm font-medium text-emerald-700">✅ 이미지 URL 정상</span>
              ) : (
                <span className="text-sm font-medium text-red-600">
                  ⚠️ 이미지 URL 확인 필요{imageCheck.detail ? ` (${imageCheck.detail})` : ""}
                </span>
              )}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">분위기</p>
          <div className="flex flex-wrap gap-1.5">
            {MOOD_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  moodTags.includes(tag)
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-300 text-stone-700 hover:bg-stone-100"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">가격대</p>
          <div className="flex gap-1.5">
            {PRICE_TIER_OPTIONS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setPriceTier(tier)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  priceTier === tier
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-300 text-stone-700 hover:bg-stone-100"
                }`}
              >
                {PRICE_TIER_LABELS[tier]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">음식 종류 (선택)</p>
          <input
            type="text"
            list="cuisine-suggestions"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="예: 한식-감자탕, 일식-라멘, 이자카야, 디저트"
            className="w-full rounded border border-stone-300 p-2 text-sm text-stone-800 focus:border-stone-500 focus:outline-none"
          />
          <datalist id="cuisine-suggestions">
            {CUISINE_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">첫 만남</p>
          <label className="flex cursor-pointer items-start gap-2 rounded border border-stone-300 p-2 text-sm text-stone-800">
            <input
              type="checkbox"
              checked={firstMeetingOk}
              onChange={(e) => setFirstMeetingOk(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              첫 만남(1차) 자리로 적합
              <span className="block text-xs text-stone-500">
                끄면 &apos;첫 만남&apos; 필터에서 숨겨집니다. 시끌벅적하거나 냄새·손이 신경 쓰이는 곳,
                테이크아웃 위주인 곳은 꺼주세요.
              </span>
            </span>
          </label>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">추천 이유 (선택)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="특별히 덧붙일 말이 있으면 적어주세요 (없어도 괜찮아요, 후기가 쌓이면 그게 대신해줘요)"
            className="w-full rounded border border-stone-300 p-2 text-sm text-stone-800 focus:border-stone-500 focus:outline-none"
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">{secondaryLabel} 사유 ({secondaryLabel}하려면 필수)</p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={2}
            placeholder="예: 폐업 확인됨 / 소개팅 장소로 부적절함 / 정보 부족"
            className="w-full rounded border border-stone-300 p-2 text-sm text-stone-800 focus:border-stone-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={submitPrimary}
            disabled={!canSubmit || isPending}
            className="flex-1 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "처리 중..." : primaryLabel}
          </button>
          <button
            type="button"
            onClick={submitSecondary}
            disabled={!canReject || isPending}
            title={canReject ? undefined : "제외 사유를 입력해야 할 수 있어요"}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "처리 중..." : secondaryLabel}
          </button>
        </div>

        {feedback && (
          <p className={`text-sm ${feedback.status === "ok" ? "text-emerald-700" : "text-red-600"}`}>
            {feedback.status === "ok"
              ? `✅ ${feedback.kind === "primary" ? primaryLabel : secondaryLabel} 완료`
              : "⚠️ 처리에 실패했어요. 페이지를 새로고침한 뒤 다시 시도해주세요."}
          </p>
        )}
        </div>

        <div className="min-h-[320px] w-full flex-1 overflow-hidden rounded-lg border border-stone-200 md:min-h-[520px]">
          {place.kakao_map_url ? (
            <iframe
              key={place.id}
              src={toHttps(place.kakao_map_url)}
              className="h-full w-full border-0"
              title={`${place.name} 카카오맵`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-100 text-sm text-stone-500">
              카카오맵 링크가 없어요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
