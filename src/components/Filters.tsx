"use client";

import { MOOD_TAGS, CATEGORY_LABELS, PRICE_TIER_LABELS, NEIGHBORHOODS } from "@/lib/constants";
import { MoodTag, PlaceCategory } from "@/types/place";

export type CategoryFilter = PlaceCategory | "all";
export type NeighborhoodFilter = (typeof NEIGHBORHOODS)[number] | "all";

interface FiltersProps {
  neighborhood: NeighborhoodFilter;
  onNeighborhoodChange: (neighborhood: NeighborhoodFilter) => void;
  category: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  moodTags: MoodTag[];
  onMoodTagsChange: (tags: MoodTag[]) => void;
  priceTiers: (1 | 2 | 3)[];
  onPriceTiersChange: (tiers: (1 | 2 | 3)[]) => void;
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
}: FiltersProps) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {NEIGHBORHOOD_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onNeighborhoodChange(option)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
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

      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onCategoryChange(option)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              category === option
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {option === "all" ? "전체" : CATEGORY_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="h-5 w-px shrink-0 bg-stone-300" />

      <div className="flex flex-wrap gap-1.5">
        {MOOD_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => onMoodTagsChange(toggleValue(moodTags, tag))}
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

      <div className="h-5 w-px shrink-0 bg-stone-300" />

      <div className="flex flex-wrap gap-1.5">
        {PRICE_TIER_OPTIONS.map((tier) => (
          <button
            key={tier}
            onClick={() => onPriceTiersChange(toggleValue(priceTiers, tier))}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
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
