"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Place } from "@/types/place";
import { CATEGORY_LABELS, PRICE_TIER_LABELS } from "@/lib/constants";

/** 한 번에 그릴 개수. 발행 장소가 수백 개라 전부 그리면 입력할 때마다 버벅인다. */
const PAGE_SIZE = 50;

/** 이름·주소·음식종류·동네를 한 번에 훑는다. 관리자는 보통 가게 이름으로 찾지만
 *  "성수 카페" 처럼 섞어 치는 경우도 있어서 여러 필드를 붙여 검색한다. */
function haystack(place: Place): string {
  return [
    place.name,
    place.address,
    place.cuisine ?? "",
    place.neighborhood,
    CATEGORY_LABELS[place.category],
  ]
    .join(" ")
    .toLowerCase();
}

export default function PublishedPlacesList({ places }: { places: Place[] }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const indexed = useMemo(
    () => places.map((place) => ({ place, text: haystack(place) })),
    [places],
  );

  const matches = useMemo(() => {
    // 공백으로 나눠 전부 포함하는 것만 (예: "성수 카페" → 둘 다 들어간 곳)
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return places;
    return indexed.filter(({ text }) => terms.every((t) => text.includes(t))).map((i) => i.place);
  }, [indexed, places, query]);

  // 검색어가 바뀌면 처음부터 다시 보여준다 (effect로 되돌리면 렌더가 한 번 더 돈다)
  const [lastMatches, setLastMatches] = useState(matches);
  if (lastMatches !== matches) {
    setLastMatches(matches);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = matches.slice(0, visibleCount);

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="가게 이름, 주소, 음식 종류, 동네로 검색"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
      />

      <p className="text-sm text-stone-500">
        {query.trim() ? `${matches.length}개 찾음` : `발행된 장소 ${places.length}개`}
      </p>

      {matches.length === 0 && (
        <p className="text-sm text-stone-500">검색 결과가 없어요.</p>
      )}

      <div className="flex flex-col gap-2">
        {visible.map((place) => (
          <Link
            key={place.id}
            href={`/review/edit/${place.id}`}
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 hover:border-stone-400"
          >
            <div>
              <p className="font-semibold text-stone-900">{place.name}</p>
              <p className="text-xs text-stone-500">
                {place.cuisine ? `${place.cuisine} ` : ""}
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
                {!place.first_meeting_ok && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    첫 만남 제외
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-sm text-amber-700 underline">수정 →</span>
          </Link>
        ))}
      </div>

      {visibleCount < matches.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="rounded-lg border border-stone-200 bg-white py-3 text-center text-xs text-stone-500 hover:bg-stone-100"
        >
          {matches.length - visibleCount}개 더 보기
        </button>
      )}
    </>
  );
}
