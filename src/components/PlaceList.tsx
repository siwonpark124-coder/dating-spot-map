"use client";

import { RefObject } from "react";
import Link from "next/link";
import { PlaceWithReviewCount } from "@/types/place";
import { SortOption } from "@/lib/placeFilters";
import PlaceCard from "./PlaceCard";

interface PlaceListProps {
  /** 지금 그릴 카드들 (무한 스크롤로 잘린 상태) */
  visiblePlaces: PlaceWithReviewCount[];
  /** 필터를 통과한 전체 수 */
  totalCount: number;
  remainingCount: number;
  onShowMore: () => void;
  sentinelRef: RefObject<HTMLButtonElement | null>;

  searchInput: string;
  onSearchChange: (value: string) => void;

  sort: SortOption;
  onSortChange: (sort: SortOption) => void;

  hasFilters: boolean;
  onResetFilters: () => void;
  /** 결과가 0건일 때 '첫 만남'을 꺼보라고 안내할지 */
  firstMeetingOnly: boolean;

  selectedPlaceId: string | null;
  inCourse: (place: PlaceWithReviewCount) => boolean;
  courseFull: boolean;
  onAddToCourse: (place: PlaceWithReviewCount) => void;
  /** 넘기면 카드 본문 탭이 상세 이동 대신 이걸 부른다 (모바일) */
  onSelectPlace?: (place: PlaceWithReviewCount) => void;

  /** 카드 아래 여백 (모바일에서 코스 바에 가리지 않게) */
  bottomPadding?: string;
  /** 보조 링크를 목록 끝에 붙일지 (모바일 전용) */
  showFooterLinks?: boolean;
}

export default function PlaceList({
  visiblePlaces,
  totalCount,
  remainingCount,
  onShowMore,
  sentinelRef,
  searchInput,
  onSearchChange,
  sort,
  onSortChange,
  hasFilters,
  onResetFilters,
  firstMeetingOnly,
  selectedPlaceId,
  inCourse,
  courseFull,
  onAddToCourse,
  onSelectPlace,
  bottomPadding = "",
  showFooterLinks = false,
}: PlaceListProps) {
  const sortChip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs transition-colors ${
      active ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
    }`;

  return (
    <>
      <div className="shrink-0 border-b border-stone-200 p-3 pb-0">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          maxLength={40}
          placeholder="가게 이름 검색"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-b border-stone-200 p-3">
        <button type="button" onClick={() => onSortChange("latest")} className={sortChip(sort === "latest")}>
          최신순
        </button>
        <button type="button" onClick={() => onSortChange("popular")} className={sortChip(sort === "popular")}>
          후기 많은순
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto text-xs text-stone-500 underline hover:text-stone-700"
          >
            필터 초기화
          </button>
        )}
        <span className={`text-xs text-stone-500 ${hasFilters ? "ml-3" : "ml-auto"}`}>
          {totalCount}곳
        </span>
      </div>

      <div className={`flex flex-col gap-3 p-3 ${bottomPadding}`}>
        {totalCount === 0 && (
          <p className="text-sm text-stone-500">
            조건에 맞는 장소가 없어요.
            {firstMeetingOnly && " '첫 만남'을 꺼보면 더 많은 곳이 나와요."}
          </p>
        )}

        {visiblePlaces.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            selected={place.id === selectedPlaceId}
            inCourse={inCourse(place)}
            courseFull={courseFull}
            onAddToCourse={onAddToCourse}
            onSelect={onSelectPlace}
          />
        ))}

        {/* 스크롤이 닿으면 자동으로 더 불러오지만, 버튼으로도 누를 수 있게 둔다.
            IntersectionObserver가 동작하지 않는 환경에서 목록이 막히지 않도록. */}
        {remainingCount > 0 && (
          <button
            ref={sentinelRef}
            type="button"
            onClick={onShowMore}
            className="rounded-lg border border-stone-200 py-3 text-center text-xs text-stone-500 hover:bg-stone-100"
          >
            {remainingCount}곳 더 보기
          </button>
        )}

        {showFooterLinks && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-xs text-stone-500">
            <Link href="/feedback" className="underline">
              피드백 남기기
            </Link>
            <Link href="/course-suggestions" className="underline">
              코스 추천하기
            </Link>
            <Link href="/business" className="underline">
              비즈니스 협업
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
