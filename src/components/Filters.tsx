"use client";

import { MOOD_TAGS, CATEGORY_LABELS, PRICE_TIER_LABELS, NEIGHBORHOODS } from "@/lib/constants";
import { MoodTag } from "@/types/place";
import { CategoryFilter, NeighborhoodFilter } from "@/lib/placeFilters";

interface FiltersProps {
  neighborhood: NeighborhoodFilter;
  onNeighborhoodChange: (neighborhood: NeighborhoodFilter) => void;
  category: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  moodTags: MoodTag[];
  onMoodTagsChange: (tags: MoodTag[]) => void;
  priceTiers: (1 | 2 | 3)[];
  onPriceTiersChange: (tiers: (1 | 2 | 3)[]) => void;
  firstMeetingOnly: boolean;
  onFirstMeetingOnlyChange: (only: boolean) => void;
  /** 식당 분류(한식·일식…). 실제 데이터에 있는 것만 넘어온다. */
  cuisineOptions: string[];
  cuisines: string[];
  onCuisinesChange: (cuisines: string[]) => void;
}

const NEIGHBORHOOD_OPTIONS: NeighborhoodFilter[] = ["all", ...NEIGHBORHOODS];
const CATEGORY_OPTIONS: CategoryFilter[] = ["all", "restaurant", "cafe", "bar"];
const PRICE_TIER_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function Filters({
  neighborhood,
  onNeighborhoodChange,
  category,
  onCategoryChange,
  moodTags,
  onMoodTagsChange,
  priceTiers,
  onPriceTiersChange,
  firstMeetingOnly,
  onFirstMeetingOnlyChange,
  cuisineOptions,
  cuisines,
  onCuisinesChange,
}: FiltersProps) {
  // 분류는 식당을 볼 때만 뜻이 있다. 카페·바는 cuisine이 거의 비어 있다.
  const showCuisines = category === "restaurant" && cuisineOptions.length > 0;
  return (
    // 모바일에서는 줄바꿈 대신 가로 스크롤 한 줄로 둔다.
    // 칩이 19개라 그냥 감싸면 헤더가 화면의 절반을 먹고 지도가 사라진다.
    <div className="flex w-full flex-1 items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] md:w-auto md:flex-wrap md:overflow-x-visible md:pb-0">
      {/* 다른 필터와 성격이 달라(장소 성격 자체를 거르는 스위치) 맨 앞에 따로 둔다. */}
      <button
        type="button"
        aria-pressed={firstMeetingOnly}
        onClick={() => onFirstMeetingOnlyChange(!firstMeetingOnly)}
        title="시끌벅적하거나 냄새·손이 신경 쓰이는 곳을 빼고, 첫 만남에 무난한 곳만 봅니다"
        className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
          firstMeetingOnly
            ? "border-rose-700 bg-rose-700 text-white"
            : "border-rose-300 text-rose-800 hover:bg-rose-50"
        }`}
      >
        첫 만남
      </button>

      <div className="h-5 w-px shrink-0 bg-stone-300" />

      <div className="flex shrink-0 gap-1.5 md:flex-wrap">
        {NEIGHBORHOOD_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onNeighborhoodChange(option)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${
              neighborhood === option
                ? "bg-amber-800 text-white"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100"
            }`}
          >
            {option === "all" ? "전체 동네" : option}
          </button>
        ))}
      </div>

      <div className="h-5 w-px shrink-0 bg-stone-300" />

      <div className="flex shrink-0 gap-1.5 md:flex-wrap">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onCategoryChange(option)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${
              category === option
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {option === "all" ? "전체" : CATEGORY_LABELS[option]}
          </button>
        ))}
      </div>

      {showCuisines && (
        <>
          <div className="h-5 w-px shrink-0 bg-stone-300" />
          <div className="flex shrink-0 gap-1.5 md:flex-wrap">
            {cuisineOptions.map((option) => (
              <button
                key={option}
                onClick={() => onCuisinesChange(toggleValue(cuisines, option))}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors ${
                  cuisines.includes(option)
                    ? "border-orange-700 bg-orange-700 text-white"
                    : "border-orange-300 text-orange-900 hover:bg-orange-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="h-5 w-px shrink-0 bg-stone-300" />

      <div className="flex shrink-0 gap-1.5 md:flex-wrap">
        {MOOD_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => onMoodTagsChange(toggleValue(moodTags, tag))}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors ${
              moodTags.includes(tag)
                ? "border-stone-800 bg-stone-800 text-white"
                : "border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="h-5 w-px shrink-0 bg-stone-300" />

      <div className="flex shrink-0 gap-1.5 md:flex-wrap">
        {PRICE_TIER_OPTIONS.map((tier) => (
          <button
            key={tier}
            onClick={() => onPriceTiersChange(toggleValue(priceTiers, tier))}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-sm transition-colors ${
              priceTiers.includes(tier)
                ? "border-stone-800 bg-stone-800 text-white"
                : "border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            {PRICE_TIER_LABELS[tier]}
          </button>
        ))}
      </div>
    </div>
  );
}
