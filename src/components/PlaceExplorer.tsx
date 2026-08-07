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
import PlaceCard from "./PlaceCard";
import Filters from "./Filters";
import CourseTray from "./CourseTray";
import CuratedCoursePicker from "./CuratedCoursePicker";
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

  return (
    <div className="flex h-screen flex-col">
      {/* 모바일은 '로고 줄 + 필터 한 줄'로 눌러둔다. 데스크탑은 기존처럼 한 줄에 펼친다. */}
      <header className="flex shrink-0 flex-col gap-2 border-b border-stone-200 bg-[#fbf7ef] px-4 py-3 md:flex-row md:flex-wrap md:items-center md:gap-4 md:px-6 md:py-5">
        <div className="flex shrink-0 items-center gap-2.5">
          <LogoMark className="h-8 w-8 shrink-0 md:h-9 md:w-9" />
          <div className="flex min-w-0 flex-col">
            <h1 className="text-lg font-bold text-stone-900 md:text-xl">
              {curating ? "추천 코스 짜기" : "오로지"}
            </h1>
            {/* 설명 문구는 모바일에서 자리만 차지한다 */}
            <p className="hidden text-xs text-stone-500 md:block">
              {curating
                ? "평소처럼 코스를 담고, 아래에서 이름을 붙여 등록하세요"
                : "오늘 로맨틱한 지점 · 오로지 당신의 성공적인 만남을 위해"}
            </p>
          </div>

          {/* 필터가 아니라 화면을 여는 동작이라 필터 묶음 바깥에 둔다.
              모바일에선 로고 줄 오른쪽 끝으로 밀어 한 줄을 아낀다. */}
          {!curating && (
            <div className="ml-auto md:ml-3">
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
        {/* 보조 링크는 모바일에서 목록 맨 아래로 내린다 (헤더 높이를 아끼려고) */}
        <div className="hidden shrink-0 items-center gap-3 text-sm text-stone-500 md:flex">
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

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* 모바일: 지도는 고정 높이, 남는 공간은 목록이 가져가 내부에서 스크롤한다.
            지도에 flex-1을 주면 목록이 늘어나면서 지도를 화면 밖으로 밀어낸다. */}
        <div className="h-[38vh] shrink-0 md:h-auto md:min-h-0 md:flex-1">
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
        </div>

        <div
          ref={listRef}
          className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto border-t border-stone-200 bg-[#fbf7ef] md:w-[380px] md:flex-none md:border-t-0 md:border-l"
        >
          <div className="relative shrink-0 border-b border-stone-200 p-3 pb-0">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                updateFilters({ query: e.target.value });
              }}
              maxLength={40}
              placeholder="가게 이름 검색"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
            />
          </div>

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

            {/* 헤더에서 내려온 초기화 버튼 (모바일 전용) */}
            {hasActiveFilters(filters) && (
              <button
                type="button"
                onClick={() => updateFilters(DEFAULT_FILTERS)}
                className="ml-auto self-center text-xs text-stone-500 underline md:hidden"
              >
                필터 초기화
              </button>
            )}
            <span
              className={`self-center text-xs text-stone-500 ${
                hasActiveFilters(filters) ? "ml-3 md:ml-auto" : "ml-auto"
              }`}
            >
              {filteredPlaces.length}곳
            </span>
          </div>

          {/* 코스 트레이가 화면 아래를 덮으므로 마지막 카드가 가리지 않게 여백을 준다 */}
          <div
            className={`flex flex-col gap-3 p-3 ${
              courseStops.length > 0 ? "pb-52 md:pb-3" : ""
            }`}
          >
            {filteredPlaces.length === 0 && (
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
                inCourse={hasStop(courseStops, stopFromPlace(place))}
                courseFull={courseStops.length >= MAX_STOPS}
                onAddToCourse={(p) =>
                  updateCourse(
                    addStop(
                      courseStops,
                      stopFromPlace(
                        p,
                        p.cuisine
                          ? `${p.cuisine} ${CATEGORY_LABELS[p.category]}`
                          : CATEGORY_LABELS[p.category],
                      ),
                    ),
                  )
                }
              />
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

            {/* 헤더에 두면 모바일에서 한 줄을 통째로 먹어서 목록 끝으로 내렸다 */}
            {!curating && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-xs text-stone-500 md:hidden">
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
        </div>
      </div>

      {/* 추천 코스를 새로 불러올 때마다 입력 중이던 이름·저장 결과를 초기화한다. */}
      <CourseTray
        key={`tray-${courseFitKey}`}
        stops={courseStops}
        onChange={updateCourse}
        onSave={handleSaveCourse}
        mode={curating ? "curate" : "save"}
        initialTitle={loadedTitle}
        onUndo={undoStops ? undoCuratedLoad : undefined}
        walkLegs={walkLegs}
        walkLoading={walkLoading}
        walkNoPath={walkNoPath}
        walkNoDistance={walkNoDistance}
        onRetryWalk={retryWalk}
      />
    </div>
  );
}
