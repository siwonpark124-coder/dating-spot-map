"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { MoodTag, PlaceWithReviewCount } from "@/types/place";
import { CategoryFilter, NeighborhoodFilter, SortOption } from "@/lib/placeFilters";
import { CourseStop, MAX_STOPS, totalWalkMinutes } from "@/lib/course";
import { CuratedCourse } from "@/lib/curatedCourses";
import {
  CategoryChips,
  CuisineChips,
  FirstMeetingChip,
  MoodChips,
  NEIGHBORHOOD_OPTIONS,
  PriceChips,
} from "./Filters";
import Sheet from "./Sheet";
import PlaceList from "./PlaceList";
import PlaceCard from "./PlaceCard";
import { CuratedCourseList } from "./CuratedCoursePicker";
import { CourseTrayBody, CourseTrayBodyProps } from "./CourseTray";

type Panel = "filters" | "list" | "courses" | "tray" | null;

interface MobileChromeProps {
  neighborhood: NeighborhoodFilter;
  onNeighborhoodChange: (v: NeighborhoodFilter) => void;
  category: CategoryFilter;
  onCategoryChange: (v: CategoryFilter) => void;
  moodTags: MoodTag[];
  onMoodTagsChange: (v: MoodTag[]) => void;
  priceTiers: (1 | 2 | 3)[];
  onPriceTiersChange: (v: (1 | 2 | 3)[]) => void;
  firstMeetingOnly: boolean;
  onFirstMeetingOnlyChange: (v: boolean) => void;
  cuisineOptions: string[];
  cuisines: string[];
  onCuisinesChange: (v: string[]) => void;

  /** 필터 아이콘 배지에 쓰는, 지금 걸린 조건 수 */
  activeFilterCount: number;
  onResetFilters: () => void;

  visiblePlaces: PlaceWithReviewCount[];
  totalCount: number;
  remainingCount: number;
  onShowMore: () => void;
  sentinelRef: RefObject<HTMLButtonElement | null>;
  searchInput: string;
  onSearchChange: (v: string) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;

  /** 지도에서 고른 장소. 하단에 카드 하나로 뜬다. */
  selectedPlace: PlaceWithReviewCount | null;
  onSelectPlace: (place: PlaceWithReviewCount | null) => void;

  inCourse: (place: PlaceWithReviewCount) => boolean;
  onAddToCourse: (place: PlaceWithReviewCount) => void;

  curatedCourses: CuratedCourse[];
  onPickCuratedCourse: (course: CuratedCourse) => void;

  courseStops: CourseStop[];
  trayProps: CourseTrayBodyProps;
  walkLoading?: boolean;
}

export default function MobileChrome(props: MobileChromeProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [hoodOpen, setHoodOpen] = useState(false);
  const closePanel = useCallback(() => setPanel(null), []);

  const {
    neighborhood,
    onNeighborhoodChange,
    category,
    cuisineOptions,
    activeFilterCount,
    onResetFilters,
    totalCount,
    selectedPlace,
    onSelectPlace,
    inCourse,
    onAddToCourse,
    curatedCourses,
    onPickCuratedCourse,
    courseStops,
    trayProps,
    walkLoading,
  } = props;

  const showCuisines = category === "restaurant" && cuisineOptions.length > 0;
  const courseFull = courseStops.length >= MAX_STOPS;

  // 동네 드롭다운 바깥을 누르면 닫는다
  const hoodRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hoodOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!hoodRef.current?.contains(e.target as Node)) setHoodOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [hoodOpen]);

  const barButton =
    "flex items-center gap-1 rounded-full border border-stone-300 bg-white/95 px-3 py-1.5 text-sm font-medium text-stone-800 shadow-sm backdrop-blur";

  return (
    <div className="md:hidden">
      {/* ── 상단 바 ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <div ref={hoodRef} className="relative">
            <button type="button" onClick={() => setHoodOpen((v) => !v)} className={barButton}>
              {neighborhood === "all" ? "전체 동네" : neighborhood}
              <span aria-hidden className={`text-[10px] ${hoodOpen ? "rotate-180" : ""}`}>
                ▼
              </span>
            </button>
            {hoodOpen && (
              <div className="absolute left-0 top-full mt-1.5 flex w-36 flex-col rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
                {NEIGHBORHOOD_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onNeighborhoodChange(option);
                      setHoodOpen(false);
                    }}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${
                      neighborhood === option
                        ? "bg-amber-800 font-medium text-white"
                        : "text-stone-800 hover:bg-amber-50"
                    }`}
                  >
                    {option === "all" ? "전체 동네" : option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {curatedCourses.length > 0 && (
            <button
              type="button"
              onClick={() => setPanel("courses")}
              className="flex items-center gap-1 rounded-full bg-amber-800 px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
            >
              <span aria-hidden>✦</span> 추천 코스
            </button>
          )}

          <button
            type="button"
            onClick={() => setPanel("filters")}
            aria-label="필터"
            className={`relative ml-auto ${barButton} px-2.5`}
          >
            <span aria-hidden className="text-base leading-none">
              ⚙
            </span>
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-700 px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* ── 하단: 고른 장소 카드 → 코스 바 → 목록 버튼 ─────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-end gap-2 p-3">
        <button
          type="button"
          onClick={() => setPanel("list")}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          <span aria-hidden>🔍</span> 목록 {totalCount}곳
        </button>

        {selectedPlace && (
          <div className="pointer-events-auto w-full">
            <div className="relative rounded-lg shadow-xl">
              <button
                type="button"
                onClick={() => onSelectPlace(null)}
                aria-label="카드 닫기"
                className="absolute -top-2 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900/80 text-sm text-white shadow"
              >
                ✕
              </button>
              <PlaceCard
                place={selectedPlace}
                selected
                inCourse={inCourse(selectedPlace)}
                courseFull={courseFull}
                onAddToCourse={onAddToCourse}
              />
            </div>
          </div>
        )}

        {courseStops.length > 0 && (
          <button
            type="button"
            onClick={() => setPanel("tray")}
            className="pointer-events-auto flex w-full items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-left shadow-lg"
          >
            <span className="text-sm font-bold text-stone-900">
              내 코스 {courseStops.length}/{MAX_STOPS}
            </span>
            {courseStops.length > 1 && (
              <span className="text-xs text-stone-500">
                걸어서 {totalWalkMinutes(courseStops, trayProps.walkLegs)}분
                {walkLoading && " · 계산 중…"}
              </span>
            )}
            <span aria-hidden className="ml-auto text-stone-400">
              ›
            </span>
          </button>
        )}
      </div>

      {/* ── 창들 ────────────────────────────────────────────────── */}
      <Sheet
        open={panel === "filters"}
        onClose={closePanel}
        title="필터"
        variant="modal"
        footer={
          <div className="flex gap-2">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm text-stone-600"
              >
                초기화
              </button>
            )}
            <button
              type="button"
              onClick={closePanel}
              className="flex-1 rounded-lg bg-stone-900 py-2.5 text-sm font-semibold text-white"
            >
              {totalCount}곳 보기
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 p-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-stone-500">첫 만남</h3>
            <div className="flex">
              <FirstMeetingChip
                value={props.firstMeetingOnly}
                onChange={props.onFirstMeetingOnlyChange}
              />
            </div>
            <p className="text-xs text-stone-400">
              시끌벅적하거나 냄새·손이 신경 쓰이는 곳을 빼고 봅니다.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-stone-500">종류</h3>
            <CategoryChips value={category} onChange={props.onCategoryChange} stacked />
          </section>

          {showCuisines && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-stone-500">식당 분류</h3>
              <CuisineChips
                options={cuisineOptions}
                value={props.cuisines}
                onChange={props.onCuisinesChange}
                stacked
              />
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-stone-500">분위기</h3>
            <MoodChips value={props.moodTags} onChange={props.onMoodTagsChange} stacked />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-stone-500">가격대</h3>
            <PriceChips value={props.priceTiers} onChange={props.onPriceTiersChange} stacked />
          </section>
        </div>
      </Sheet>

      <Sheet open={panel === "list"} onClose={closePanel} title={`장소 ${totalCount}곳`}>
        <PlaceList
          visiblePlaces={props.visiblePlaces}
          totalCount={totalCount}
          remainingCount={props.remainingCount}
          onShowMore={props.onShowMore}
          sentinelRef={props.sentinelRef}
          searchInput={props.searchInput}
          onSearchChange={props.onSearchChange}
          sort={props.sort}
          onSortChange={props.onSortChange}
          hasFilters={activeFilterCount > 0}
          onResetFilters={onResetFilters}
          firstMeetingOnly={props.firstMeetingOnly}
          selectedPlaceId={selectedPlace?.id ?? null}
          inCourse={inCourse}
          courseFull={courseFull}
          onAddToCourse={onAddToCourse}
          // 카드를 누르면 창을 닫고 지도의 그 지점으로 보낸다
          onSelectPlace={(place) => {
            onSelectPlace(place);
            closePanel();
          }}
          showFooterLinks
        />
      </Sheet>

      <Sheet open={panel === "courses"} onClose={closePanel} title="추천 코스">
        <div className="flex flex-col p-2">
          <p className="px-2.5 py-1.5 text-xs text-stone-500">
            고르면 지도에 코스가 그려져요. 담은 뒤 바꿔도 돼요.
          </p>
          <CuratedCourseList
            courses={curatedCourses}
            onPick={(course) => {
              onPickCuratedCourse(course);
              closePanel();
            }}
          />
        </div>
      </Sheet>

      <Sheet
        open={panel === "tray"}
        onClose={closePanel}
        title={`내 코스 ${courseStops.length}/${MAX_STOPS}`}
        footer={
          <button
            type="button"
            onClick={() => {
              trayProps.onChange([]);
              closePanel();
            }}
            className="w-full rounded-lg border border-stone-300 py-2.5 text-sm text-stone-600"
          >
            코스 비우기
          </button>
        }
      >
        <div className="flex flex-col gap-3 p-3">
          {courseStops.length > 0 && <CourseTrayBody {...trayProps} />}
        </div>
      </Sheet>
    </div>
  );
}
