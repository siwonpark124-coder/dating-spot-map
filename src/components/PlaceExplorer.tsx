"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlaceWithReviewCount } from "@/types/place";
import {
  DEFAULT_FILTERS,
  PlaceFilterState,
  parseFilters,
  toSearchParams,
  hasActiveFilters,
} from "@/lib/placeFilters";
import KakaoMap from "./KakaoMap";
import PlaceCard from "./PlaceCard";
import Filters from "./Filters";

// 목록에 한 번에 그릴 카드 수. 400곳을 전부 그리면 카드 하나당 DOM 16개라
// 필터를 누를 때마다 7천 노드를 다시 그리게 되고, 그게 체감 렉의 대부분이었다.
const PAGE_SIZE = 40;

export default function PlaceExplorer({ places }: { places: PlaceWithReviewCount[] }) {
  // 필터 상태의 원본은 URL. 그래야 지금 보고 있는 화면을 그대로 링크로 보낼 수 있다.
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const { neighborhood, category, moodTags, priceTiers, firstMeetingOnly, sort } = filters;

  // history API로 URL만 바꾼다. router.replace를 쓰면 force-dynamic인 페이지가
  // 필터 클릭마다 장소 전체를 다시 쿼리하게 된다.
  // pushState 대신 replaceState인 이유: 토글이 많아 히스토리가 금방 쌓이고,
  // 뒤로가기 한 번에 필터 하나씩 되돌아가면 페이지를 빠져나가기 어려워진다.
  const updateFilters = useCallback((patch: Partial<PlaceFilterState>) => {
    const query = toSearchParams({ ...parseFilters(new URLSearchParams(window.location.search)), ...patch }).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  const filteredPlaces = useMemo(() => {
    const filtered = places.filter((place) => {
      const matchesNeighborhood = neighborhood === "all" || place.neighborhood === neighborhood;
      const matchesCategory = category === "all" || place.category === category;
      const matchesMood = moodTags.length === 0 || moodTags.some((tag) => place.mood_tags.includes(tag));
      const matchesPrice =
        priceTiers.length === 0 || (place.price_tier !== null && priceTiers.includes(place.price_tier));
      const matchesFirstMeeting = !firstMeetingOnly || place.first_meeting_ok;
      return matchesNeighborhood && matchesCategory && matchesMood && matchesPrice && matchesFirstMeeting;
    });

    if (sort === "popular") {
      return [...filtered].sort((a, b) => b.review_count - a.review_count);
    }
    return filtered;
  }, [places, neighborhood, category, moodTags, priceTiers, firstMeetingOnly, sort]);

  // 목록은 조금씩 늘려가며 그린다. 지도 마커는 필터 결과 전체를 계속 보여준다.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLButtonElement>(null);

  // 필터가 바뀌면 처음 한 페이지부터 다시 보여준다.
  // effect에서 되돌리면 렌더가 한 번 더 돌기 때문에 렌더 중에 조정한다.
  const [lastFiltered, setLastFiltered] = useState(filteredPlaces);
  if (lastFiltered !== filteredPlaces) {
    setLastFiltered(filteredPlaces);
    setVisibleCount(PAGE_SIZE);
  }

  // 스크롤 위치 되돌리기는 DOM 조작이라 커밋 이후에 한다.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [filteredPlaces]);

  // 지도에서 마커를 누르면 목록에서도 그 카드를 표시해준다 (이동은 하지 않음).
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const selectedIndex = useMemo(
    () => (selectedPlaceId ? filteredPlaces.findIndex((p) => p.id === selectedPlaceId) : -1),
    [filteredPlaces, selectedPlaceId],
  );

  // 선택한 카드가 아직 안 그려진 페이지에 있으면 거기까지는 펼친다.
  // effect에서 visibleCount를 올리면 렌더가 한 번 더 도니 파생값으로 계산한다.
  const effectiveCount = Math.max(visibleCount, selectedIndex + 1);

  const visiblePlaces = useMemo(
    () => filteredPlaces.slice(0, effectiveCount),
    [filteredPlaces, effectiveCount],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || effectiveCount >= filteredPlaces.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(Math.min(effectiveCount + PAGE_SIZE, filteredPlaces.length));
        }
      },
      { root: listRef.current, rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [effectiveCount, filteredPlaces.length]);

  // 선택된 카드를 목록에서 보이는 위치로 스크롤.
  // 목록이 길어 수만 픽셀을 이동할 수 있으니 부드러운 스크롤 대신 바로 이동한다.
  useEffect(() => {
    if (selectedIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-place-id="${selectedPlaceId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedPlaceId, selectedIndex, effectiveCount]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b border-stone-200 bg-[#fbf7ef] px-6 py-5">
        <div className="flex shrink-0 flex-col">
          <h1 className="text-xl font-bold text-stone-900">오로지</h1>
          <p className="text-xs text-stone-500">오늘 로맨틱한 지점 · 오로지 당신의 성공적인 만남을 위해</p>
        </div>
        <Filters
          neighborhood={neighborhood}
          onNeighborhoodChange={(v) => updateFilters({ neighborhood: v })}
          category={category}
          onCategoryChange={(v) => updateFilters({ category: v })}
          moodTags={moodTags}
          onMoodTagsChange={(v) => updateFilters({ moodTags: v })}
          priceTiers={priceTiers}
          onPriceTiersChange={(v) => updateFilters({ priceTiers: v })}
          firstMeetingOnly={firstMeetingOnly}
          onFirstMeetingOnlyChange={(v) => updateFilters({ firstMeetingOnly: v })}
        />
        <div className="flex shrink-0 items-center gap-3 text-sm text-stone-500">
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => updateFilters(DEFAULT_FILTERS)}
              className="underline hover:text-stone-700"
            >
              필터 초기화
            </button>
          )}
          <Link href="/feedback" className="underline hover:text-stone-700">
            피드백 남기기
          </Link>
          <Link href="/course-suggestions" className="underline hover:text-stone-700">
            코스 추천하기
          </Link>
          <Link href="/business" className="underline hover:text-stone-700">
            비즈니스 협업
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="min-h-[50vh] flex-1 md:min-h-0">
          <KakaoMap
            places={filteredPlaces}
            onPlaceClick={(place) => setSelectedPlaceId(place.id)}
            focusedPlaceId={selectedPlaceId}
          />
        </div>

        <div
          ref={listRef}
          className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-stone-200 bg-[#fbf7ef] md:w-[380px] md:border-t-0 md:border-l"
        >
          <div className="flex shrink-0 gap-1.5 border-b border-stone-200 p-3">
            <button
              type="button"
              onClick={() => updateFilters({ sort: "latest" })}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                sort === "latest" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ sort: "popular" })}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                sort === "popular" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              후기 많은순
            </button>

            <span className="ml-auto self-center text-xs text-stone-500">{filteredPlaces.length}곳</span>
          </div>

          <div className="flex flex-col gap-3 p-3">
            {filteredPlaces.length === 0 && (
              <p className="text-sm text-stone-500">
                조건에 맞는 장소가 없어요.
                {firstMeetingOnly && " '첫 만남'을 꺼보면 더 많은 곳이 나와요."}
              </p>
            )}
            {visiblePlaces.map((place) => (
              <PlaceCard key={place.id} place={place} selected={place.id === selectedPlaceId} />
            ))}

            {/* 스크롤이 닿으면 자동으로 더 불러오지만, 버튼으로도 누를 수 있게 둔다.
                IntersectionObserver가 동작하지 않는 환경에서 목록이 막히지 않도록. */}
            {effectiveCount < filteredPlaces.length && (
              <button
                ref={sentinelRef}
                type="button"
                onClick={() =>
                  setVisibleCount(Math.min(effectiveCount + PAGE_SIZE, filteredPlaces.length))
                }
                className="rounded-lg border border-stone-200 py-3 text-center text-xs text-stone-500 hover:bg-stone-100"
              >
                {filteredPlaces.length - effectiveCount}곳 더 보기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
