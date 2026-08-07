"use client";

import { MOOD_TAGS, CATEGORY_LABELS, PRICE_TIER_LABELS, NEIGHBORHOODS } from "@/lib/constants";
import { MoodTag } from "@/types/place";
import { CategoryFilter, NeighborhoodFilter } from "@/lib/placeFilters";

export const NEIGHBORHOOD_OPTIONS: NeighborhoodFilter[] = ["all", ...NEIGHBORHOODS];
const CATEGORY_OPTIONS: CategoryFilter[] = ["all", "restaurant", "cafe", "bar"];
const PRICE_TIER_OPTIONS: (1 | 2 | 3)[] = [1, 2, 3];

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// 데스크탑 가로 바에서는 한 줄, 모바일 필터창에서는 줄바꿈해서 쌓는다.
const groupClass = (stacked: boolean) =>
  stacked ? "flex flex-wrap gap-1.5" : "flex shrink-0 gap-1.5 md:flex-wrap";

const chip = "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors";
const chipOutlined = `${chip} border`;

// ---------------------------------------------------------------------------
// 조각들. 데스크탑 바와 모바일 필터창이 같은 걸 쓴다.
// ---------------------------------------------------------------------------

export function FirstMeetingChip({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      title="시끌벅적하거나 냄새·손이 신경 쓰이는 곳을 빼고, 첫 만남에 무난한 곳만 봅니다"
      className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
        value
          ? "border-rose-700 bg-rose-700 text-white"
          : "border-rose-300 text-rose-800 hover:bg-rose-50"
      }`}
    >
      첫 만남
    </button>
  );
}

export function NeighborhoodChips({
  value,
  onChange,
  stacked = false,
}: {
  value: NeighborhoodFilter;
  onChange: (v: NeighborhoodFilter) => void;
  stacked?: boolean;
}) {
  return (
    <div className={groupClass(stacked)}>
      {NEIGHBORHOOD_OPTIONS.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`${chip} ${
            value === option
              ? "bg-amber-800 text-white"
              : "bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
        >
          {option === "all" ? "전체 동네" : option}
        </button>
      ))}
    </div>
  );
}

export function CategoryChips({
  value,
  onChange,
  stacked = false,
}: {
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
  stacked?: boolean;
}) {
  return (
    <div className={groupClass(stacked)}>
      {CATEGORY_OPTIONS.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`${chip} ${
            value === option
              ? "bg-stone-800 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          {option === "all" ? "전체" : CATEGORY_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

export function CuisineChips({
  options,
  value,
  onChange,
  stacked = false,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  stacked?: boolean;
}) {
  return (
    <div className={groupClass(stacked)}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(toggleValue(value, option))}
          className={`${chipOutlined} ${
            value.includes(option)
              ? "border-orange-700 bg-orange-700 text-white"
              : "border-orange-300 text-orange-900 hover:bg-orange-50"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function MoodChips({
  value,
  onChange,
  stacked = false,
}: {
  value: MoodTag[];
  onChange: (v: MoodTag[]) => void;
  stacked?: boolean;
}) {
  return (
    <div className={groupClass(stacked)}>
      {MOOD_TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => onChange(toggleValue(value, tag))}
          className={`${chipOutlined} ${
            value.includes(tag)
              ? "border-stone-800 bg-stone-800 text-white"
              : "border-stone-300 text-stone-700 hover:bg-stone-100"
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

export function PriceChips({
  value,
  onChange,
  stacked = false,
}: {
  value: (1 | 2 | 3)[];
  onChange: (v: (1 | 2 | 3)[]) => void;
  stacked?: boolean;
}) {
  return (
    <div className={groupClass(stacked)}>
      {PRICE_TIER_OPTIONS.map((tier) => (
        <button
          key={tier}
          onClick={() => onChange(toggleValue(value, tier))}
          className={`${chipOutlined} ${
            value.includes(tier)
              ? "border-stone-800 bg-stone-800 text-white"
              : "border-stone-300 text-stone-700 hover:bg-stone-100"
          }`}
        >
          {PRICE_TIER_LABELS[tier]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 데스크탑 헤더의 가로 필터 바
// ---------------------------------------------------------------------------

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
  cuisineOptions: string[];
  cuisines: string[];
  onCuisinesChange: (cuisines: string[]) => void;
}

const Divider = () => <div className="h-5 w-px shrink-0 bg-stone-300" />;

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
    <div className="flex flex-1 flex-wrap items-center gap-2">
      {/* 다른 필터와 성격이 달라(장소 성격 자체를 거르는 스위치) 맨 앞에 따로 둔다. */}
      <FirstMeetingChip value={firstMeetingOnly} onChange={onFirstMeetingOnlyChange} />
      <Divider />
      <NeighborhoodChips value={neighborhood} onChange={onNeighborhoodChange} />
      <Divider />
      <CategoryChips value={category} onChange={onCategoryChange} />
      {showCuisines && (
        <>
          <Divider />
          <CuisineChips options={cuisineOptions} value={cuisines} onChange={onCuisinesChange} />
        </>
      )}
      <Divider />
      <MoodChips value={moodTags} onChange={onMoodTagsChange} />
      <Divider />
      <PriceChips value={priceTiers} onChange={onPriceTiersChange} />
    </div>
  );
}
