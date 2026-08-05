"use client";

import { useState } from "react";
import { Place, MoodTag } from "@/types/place";
import { MOOD_TAGS, CATEGORY_LABELS, PRICE_TIER_LABELS } from "@/lib/constants";
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
}

export default function PlaceEditor({
  place,
  primaryAction,
  primaryLabel,
  secondaryAction,
  secondaryLabel,
  imageCheck,
}: PlaceEditorProps) {
  const [moodTags, setMoodTags] = useState<MoodTag[]>(place.mood_tags ?? []);
  const [priceTier, setPriceTier] = useState<1 | 2 | 3 | null>(place.price_tier);
  const [note, setNote] = useState(place.curation_note ?? "");
  const [rejectionReason, setRejectionReason] = useState("");

  const canSubmit = moodTags.length > 0 && priceTier !== null;
  const canReject = rejectionReason.trim().length > 0;

  function toggleTag(tag: MoodTag) {
    setMoodTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-stone-200 bg-white p-6 md:w-[420px] md:border-b-0 md:border-r">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-stone-900">{place.name}</h2>
          <p className="text-sm text-stone-500">
            {CATEGORY_LABELS[place.category]} · {place.neighborhood} · {place.address}
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
          <form action={primaryAction} className="flex-1">
            <input type="hidden" name="id" value={place.id} />
            {moodTags.map((tag) => (
              <input key={tag} type="hidden" name="mood_tags" value={tag} />
            ))}
            <input type="hidden" name="price_tier" value={priceTier ?? ""} />
            <input type="hidden" name="curation_note" value={note} />
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {primaryLabel}
            </button>
          </form>
          <form action={secondaryAction}>
            <input type="hidden" name="id" value={place.id} />
            <input type="hidden" name="rejection_reason" value={rejectionReason} />
            <button
              type="submit"
              disabled={!canReject}
              title={canReject ? undefined : "제외 사유를 입력해야 할 수 있어요"}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {secondaryLabel}
            </button>
          </form>
        </div>
      </div>

      <div className="min-h-[50vh] flex-1 md:min-h-0">
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
  );
}
