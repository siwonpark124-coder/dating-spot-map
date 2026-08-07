"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PlaceWithReviewCount } from "@/types/place";
import {
  DEFAULT_FILTERS,
  PlaceFilterState,
  parseFilters,
  toSearchParams,
  hasActiveFilters,
  cuisineMajor,
  normalizeForSearch,
} from "@/lib/placeFilters";
import {
  CourseStop,
  MAX_STOPS,
  addStop,
  courseDraft,
  curatedDraft,
  hasStop,
  rememberSavedCourse,
  stopFromPlace,
} from "@/lib/course";
import { CuratedCourse } from "@/lib/curatedCourses";
import { StopInput } from "@/lib/courseRecord";
import { CATEGORY_LABELS } from "@/lib/constants";
import { useWalkRouteState } from "@/lib/useWalkRoute";
import { saveCourse } from "@/app/course/actions";
import KakaoMap from "./KakaoMap";
import PlaceList from "./PlaceList";
import Filters from "./Filters";
import CourseTray from "./CourseTray";
import CuratedCoursePicker from "./CuratedCoursePicker";
import MobileChrome from "./MobileChrome";
import LogoMark from "./LogoMark";

// 목록에 한 번에 그릴 카드 수. 400곳을 전부 그리면 카드 하나당 DOM 16개라
// 필터를 누를 때마다 7천 노드를 다시 그리게 되고, 그게 체감 렉의 대부분이었다.
const PAGE_SIZE = 40;

interface PlaceExplorerProps {
  places: PlaceWithReviewCount[];
  /** 첫 화면에 띄울 추천 코스. 관리자 작성 화면에서는 넘기지 않는다. */
  curatedCourses?: CuratedCourse[];
  /**
   * 넘기면 추천 코스 작성 모드가 된다 (관리자 전용 화면에서만 넘긴다).
   * 서버 액션을 여기서 직접 import하지 않고 prop으로 받는 이유는,
   * 첫 화면 번들에 관리자용 액션 참조가 실리지 않게 하려는 것이다.
   */
  registerCuratedAction?: (
    stops: StopInput[],
    title: string,
    subtitle: string,
  ) => Promise<{ id: string } | { error: string }>;
}

export default function PlaceExplorer({
  places,
  curatedCourses = [],
  registerCuratedAction,
}: PlaceExplorerProps) {
  // 코스를 짜는 화면 자체는 같고, 다 짠 코스를 어디에 저장하느냐만 다르다.
  const curating = Boolean(registerCuratedAction);
  // 필터 상태의 원본은 URL. 그래야 지금 보고 있는 화면을 그대로 링크로 보낼 수 있다.
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const { neighborhood, category, moodTags, priceTiers, firstMeetingOnly, query, cuisines, sort } =
    filters;

  // history API로 URL만 바꾼다. router.replace를 쓰면 force-dynamic인 페이지가
  // 필터 클릭마다 장소 전체를 다시 쿼리하게 된다.
  // pushState 대신 replaceState인 이유: 토글이 많아 히스토리가 금방 쌓이고,
  // 뒤로가기 한 번에 필터 하나씩 되돌아가면 페이지를 빠져나가기 어려워진다.
  const updateFilters = useCallback((patch: Partial<PlaceFilterState>) => {
    const query = toSearchParams({ ...parseFilters(new URLSearchParams(window.location.search)), ...patch }).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  // 식당 분류 칩은 실제로 있는 값만 보여준다. 많은 순으로 정렬해 자주 쓰는 게 앞에 오게 한다.
  const cuisineOptions = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((place) => {
      if (place.category !== "restaurant") return;
      const major = cuisineMajor(place.cuisine);
      if (major) counts.set(major, (counts.get(major) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([major]) => major);
  }, [places]);

  const filteredPlaces = useMemo(() => {
    const needle = normalizeForSearch(query);
    const filtered = places.filter((place) => {
      const matchesNeighborhood = neighborhood === "all" || place.neighborhood === neighborhood;
      const matchesCategory = category === "all" || place.category === category;
      const matchesMood = moodTags.length === 0 || moodTags.some((tag) => place.mood_tags.includes(tag));
      const matchesPrice =
        priceTiers.length === 0 || (place.price_tier !== null && priceTiers.includes(place.price_tier));
      const matchesFirstMeeting = !firstMeetingOnly || place.first_meeting_ok;
      // 분류는 식당에만 적용한다 (카페·바를 함께 보고 있을 때 그것들까지 걸러내지 않도록)
      const matchesCuisine =
        cuisines.length === 0 ||
        place.category !== "restaurant" ||
        cuisines.includes(cuisineMajor(place.cuisine) ?? "");
      // 이름으로 못 찾으면 주소로도 찾아준다 ("을지로3가"처럼 위치로 기억하는 경우)
      const matchesQuery =
        !needle ||
        normalizeForSearch(place.name).includes(needle) ||
        normalizeForSearch(place.address).includes(needle);
      return (
        matchesNeighborhood &&
        matchesCategory &&
        matchesMood &&
        matchesPrice &&
        matchesFirstMeeting &&
        matchesCuisine &&
        matchesQuery
      );
    });

    if (sort === "popular") {
      return [...filtered].sort((a, b) => b.review_count - a.review_count);
    }
    return filtered;
  }, [places, neighborhood, category, moodTags, priceTiers, firstMeetingOnly, cuisines, query, sort]);

  // 검색어는 입력칸이 원본이고 URL이 따라간다. URL을 원본으로 두면
  // 라우터 갱신이 한 박자 늦어 타이핑이 씹힌다.
  const [searchInput, setSearchInput] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    // 필터 초기화처럼 밖에서 URL이 바뀐 경우 입력칸도 맞춰준다
    setLastQuery(query);
    setSearchInput(query);
  }

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

  // 선택한 카드가 아직 안 그려진 페이지에 있으면 거기까지 펼친다.
  // 딱 그 카드까지만 펼치면 그게 마지막 카드가 돼서 맨 위로 스크롤할 여백이 없다.
  // 한 페이지를 더 그려서 위로 올릴 공간을 만든다.
  // effect에서 visibleCount를 올리면 렌더가 한 번 더 도니 파생값으로 계산한다.
  const effectiveCount =
    selectedIndex < 0
      ? visibleCount
      : Math.min(Math.max(visibleCount, selectedIndex + 1 + PAGE_SIZE), filteredPlaces.length);

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

  // 저장 전 코스는 localStorage에만 있다. React 바깥 저장소라 외부 스토어로 읽는다.
  // 관리자가 추천 코스를 짜는 동안 자기 코스가 덮이지 않도록 작업대를 나눠 쓴다.
  const draft = curating ? curatedDraft : courseDraft;
  const courseStops = useSyncExternalStore(
    draft.subscribe,
    draft.getSnapshot,
    draft.getServerSnapshot,
  );

  // 추천 코스를 불러오면 담아둔 코스를 덮어쓰므로, 한 번은 되돌릴 수 있게 들고 있는다.
  const [undoStops, setUndoStops] = useState<CourseStop[] | null>(null);
  // 코스가 통째로 바뀔 때만 지도 시야를 그 코스로 맞추기 위한 신호.
  const [courseFitKey, setCourseFitKey] = useState(0);
  const [loadedTitle, setLoadedTitle] = useState("");

  // 사용자가 코스를 직접 건드리면 되돌리기 제안은 사라진다.
  const updateCourse = useCallback(
    (stops: CourseStop[]) => {
      setUndoStops(null);
      draft.save(stops);
    },
    [draft],
  );

  const pickCuratedCourse = useCallback(
    (course: CuratedCourse) => {
      setUndoStops(courseStops.length > 0 ? courseStops : null);
      setLoadedTitle(course.title);
      setCourseFitKey((key) => key + 1);
      draft.save(course.stops);
    },
    [courseStops, draft],
  );

  const undoCuratedLoad = useCallback(() => {
    if (!undoStops) return;
    draft.save(undoStops);
    setUndoStops(null);
    setLoadedTitle("");
    setCourseFitKey((key) => key + 1);
  }, [undoStops, draft]);

  const {
    legs: walkLegs,
    loading: walkLoading,
    noPath: walkNoPath,
    noDistance: walkNoDistance,
    retry: retryWalk,
  } = useWalkRouteState(courseStops);

  const handleSaveCourse = useCallback(
    async (title: string, subtitle: string) => {
      const payload = courseStops.map((s) => ({
        placeId: s.placeId,
        label: s.label,
        lat: s.lat,
        lng: s.lng,
      }));

      if (registerCuratedAction) return registerCuratedAction(payload, title, subtitle);

      const result = await saveCourse(payload, title);
      if (!("error" in result)) {
        rememberSavedCourse({
          id: result.id,
          title: title || "데이트 코스",
          savedAt: new Date().toISOString(),
        });
      }
      return result;
    },
    [courseStops, registerCuratedAction],
  );

  // 선택된 카드를 목록 맨 위로 올린다.
  // 목록이 길어 수만 픽셀을 이동할 수 있으니 부드러운 스크롤 대신 바로 이동한다.
  useEffect(() => {
    if (selectedIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-place-id="${selectedPlaceId}"]`)
      ?.scrollIntoView({ block: "start" });
  }, [selectedPlaceId, selectedIndex, effectiveCount]);

  // 지도·목록·모바일 카드가 같은 선택 상태를 본다
  const selectedPlace = useMemo(
    () => filteredPlaces.find((p) => p.id === selectedPlaceId) ?? null,
    [filteredPlaces, selectedPlaceId],
  );

  const addPlaceToCourse = useCallback(
    (place: PlaceWithReviewCount) =>
      updateCourse(
        addStop(
          courseStops,
          stopFromPlace(
            place,
            place.cuisine
              ? `${place.cuisine} ${CATEGORY_LABELS[place.category]}`
              : CATEGORY_LABELS[place.category],
          ),
        ),
      ),
    [courseStops, updateCourse],
  );

  const isInCourse = useCallback(
    (place: PlaceWithReviewCount) => hasStop(courseStops, stopFromPlace(place)),
    [courseStops],
  );

  // 필터창 아이콘에 붙는 배지. 정렬은 필터가 아니므로 빼고 센다.
  const activeFilterCount = toSearchParams({ ...filters, sort: "latest" }).size;

  const showMore = () =>
    setVisibleCount(Math.min(effectiveCount + PAGE_SIZE, filteredPlaces.length));
  const changeSearch = (value: string) => {
    setSearchInput(value);
    updateFilters({ query: value });
  };

  const trayProps = {
    stops: courseStops,
    onChange: updateCourse,
    onSave: handleSaveCourse,
    mode: (curating ? "curate" : "save") as "curate" | "save",
    initialTitle: loadedTitle,
    walkLegs,
    walkLoading,
    walkNoPath,
    walkNoDistance,
    onRetryWalk: retryWalk,
  };

  return (
    // 100vh는 iOS 주소창 높이가 빠져 하단이 잘린다. dvh는 실제 보이는 높이를 쓴다.
    <div className="flex h-[100dvh] flex-col">
      <header className="hidden shrink-0 flex-wrap items-center gap-4 border-b border-stone-200 bg-[#fbf7ef] px-6 py-5 md:flex">
        <div className="flex shrink-0 items-center gap-2.5">
          <LogoMark className="h-9 w-9 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <h1 className="text-xl font-bold text-stone-900">
              {curating ? "추천 코스 짜기" : "오로지"}
            </h1>
            <p className="text-xs text-stone-500">
              {curating
                ? "평소처럼 코스를 담고, 아래에서 이름을 붙여 등록하세요"
                : "오늘 로맨틱한 지점 · 오로지 당신의 성공적인 만남을 위해"}
            </p>
          </div>

          {/* 필터가 아니라 화면을 여는 동작이라 필터 묶음 바깥에 둔다. */}
          {!curating && (
            <div className="ml-3">
              <CuratedCoursePicker courses={curatedCourses} onPick={pickCuratedCourse} />
            </div>
          )}
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
          cuisineOptions={cuisineOptions}
          cuisines={cuisines}
          onCuisinesChange={(v) => updateFilters({ cuisines: v })}
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
          {curating ? (
            <Link href="/review/curated" className="underline hover:text-stone-700">
              ← 추천 코스 목록
            </Link>
          ) : (
            <>
              <Link href="/submit-place" className="font-medium text-amber-700 underline hover:text-amber-900">
                장소 신청하기
              </Link>
              <Link href="/feedback" className="underline hover:text-stone-700">
                피드백 남기기
              </Link>
              <Link href="/course-suggestions" className="underline hover:text-stone-700">
                코스 추천하기
              </Link>
              <Link href="/business" className="underline hover:text-stone-700">
                비즈니스 협업
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/*
          지도는 한 벌만 만든다. 모바일에서는 이 칸이 화면 전체가 되고 그 위에
          MobileChrome이 떠 있고, 데스크탑에서는 오른쪽에 목록이 붙는다.
          모바일용·데스크탑용으로 두 번 그리면 지도 SDK 인스턴스와
          마커·보행경로 호출이 통째로 두 배가 된다.
        */}
        <div className="relative min-h-0 flex-1">
          <KakaoMap
            places={filteredPlaces}
            onPlaceClick={(place) => setSelectedPlaceId(place.id)}
            focusedPlaceId={selectedPlaceId}
            courseStops={courseStops}
            walkLegs={walkLegs}
            // 동네를 바꿀 때만 시야를 다시 맞춘다. 카테고리·분위기·가격은
            // 보이는 지역이 그대로라 시야를 유지하는 편이 훑어보기 좋다.
            fitBoundsKey={neighborhood}
            // 추천 코스를 불러왔을 때는 다른 동네를 보고 있어도 그 코스로 시야를 옮긴다.
            fitCourseKey={courseFitKey > 0 ? String(courseFitKey) : undefined}
          />

          {/* 되돌리기는 트레이 밖으로 뺐다. 모바일에서는 트레이가 창 안에 있어서
              안에 두면 창을 열기 전까지 코스가 덮인 걸 알 수 없다. */}
          {undoStops && (
            <div className="absolute inset-x-3 top-16 z-30 flex items-center justify-between gap-2 rounded-lg bg-stone-900/90 px-3 py-2 text-xs text-white shadow-lg md:inset-x-auto md:right-4 md:top-4 md:max-w-sm">
              추천 코스를 불러왔어요. 담아두셨던 코스는 사라졌어요.
              <button
                type="button"
                onClick={undoCuratedLoad}
                className="shrink-0 font-semibold underline"
              >
                되돌리기
              </button>
            </div>
          )}

          <MobileChrome
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
            cuisineOptions={cuisineOptions}
            cuisines={cuisines}
            onCuisinesChange={(v) => updateFilters({ cuisines: v })}
            activeFilterCount={activeFilterCount}
            onResetFilters={() => updateFilters(DEFAULT_FILTERS)}
            visiblePlaces={visiblePlaces}
            totalCount={filteredPlaces.length}
            remainingCount={Math.max(0, filteredPlaces.length - effectiveCount)}
            onShowMore={showMore}
            sentinelRef={sentinelRef}
            searchInput={searchInput}
            onSearchChange={changeSearch}
            sort={sort}
            onSortChange={(v) => updateFilters({ sort: v })}
            selectedPlace={selectedPlace}
            onSelectPlace={(place) => setSelectedPlaceId(place?.id ?? null)}
            inCourse={isInCourse}
            onAddToCourse={addPlaceToCourse}
            curatedCourses={curatedCourses}
            onPickCuratedCourse={pickCuratedCourse}
            courseStops={courseStops}
            trayProps={trayProps}
            walkLoading={walkLoading}
          />
        </div>

        <div
          ref={listRef}
          className="hidden w-[380px] shrink-0 flex-col overflow-y-auto border-l border-stone-200 bg-[#fbf7ef] md:flex"
        >
          <PlaceList
            visiblePlaces={visiblePlaces}
            totalCount={filteredPlaces.length}
            remainingCount={Math.max(0, filteredPlaces.length - effectiveCount)}
            onShowMore={showMore}
            sentinelRef={sentinelRef}
            searchInput={searchInput}
            onSearchChange={changeSearch}
            sort={sort}
            onSortChange={(v) => updateFilters({ sort: v })}
            hasFilters={hasActiveFilters(filters)}
            onResetFilters={() => updateFilters(DEFAULT_FILTERS)}
            firstMeetingOnly={firstMeetingOnly}
            selectedPlaceId={selectedPlaceId}
            inCourse={isInCourse}
            courseFull={courseStops.length >= MAX_STOPS}
            onAddToCourse={addPlaceToCourse}
            bottomPadding={courseStops.length > 0 ? "pb-52" : ""}
          />
        </div>
      </div>

      <CourseTray {...trayProps} />
    </div>
  );
}
