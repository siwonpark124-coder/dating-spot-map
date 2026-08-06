import { MoodTag, PlaceCategory } from "@/types/place";
import { MOOD_TAGS, NEIGHBORHOODS } from "./constants";

export type CategoryFilter = PlaceCategory | "all";
export type NeighborhoodFilter = (typeof NEIGHBORHOODS)[number] | "all";
export type SortOption = "latest" | "popular";
export type PriceTier = 1 | 2 | 3;

export interface PlaceFilterState {
  neighborhood: NeighborhoodFilter;
  category: CategoryFilter;
  moodTags: MoodTag[];
  priceTiers: PriceTier[];
  firstMeetingOnly: boolean;
  sort: SortOption;
}

export const DEFAULT_FILTERS: PlaceFilterState = {
  neighborhood: "all",
  category: "all",
  moodTags: [],
  priceTiers: [],
  firstMeetingOnly: false,
  sort: "latest",
};

const CATEGORIES: PlaceCategory[] = ["restaurant", "cafe", "bar"];
const PRICE_TIERS: PriceTier[] = [1, 2, 3];

// URL은 사용자가 직접 고칠 수 있으니 아는 값만 통과시키고 나머지는 기본값으로 떨어뜨린다.
function parseList<T>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const seen = raw.split(",").map((v) => v.trim());
  return allowed.filter((a) => seen.includes(String(a)));
}

export function parseFilters(params: URLSearchParams): PlaceFilterState {
  const hood = params.get("hood");
  const cat = params.get("cat");

  return {
    neighborhood: (NEIGHBORHOODS as readonly string[]).includes(hood ?? "")
      ? (hood as NeighborhoodFilter)
      : "all",
    category: (CATEGORIES as string[]).includes(cat ?? "") ? (cat as CategoryFilter) : "all",
    moodTags: parseList<MoodTag>(params.get("mood"), MOOD_TAGS),
    priceTiers: parseList<PriceTier>(params.get("price"), PRICE_TIERS),
    firstMeetingOnly: params.get("first") === "1",
    sort: params.get("sort") === "popular" ? "popular" : "latest",
  };
}

// 기본값인 항목은 아예 넣지 않는다 — 필터를 안 건드리면 URL도 깨끗하게 유지된다.
export function toSearchParams(filters: PlaceFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.neighborhood !== "all") params.set("hood", filters.neighborhood);
  if (filters.category !== "all") params.set("cat", filters.category);
  if (filters.moodTags.length > 0) params.set("mood", filters.moodTags.join(","));
  if (filters.priceTiers.length > 0) params.set("price", filters.priceTiers.join(","));
  if (filters.firstMeetingOnly) params.set("first", "1");
  if (filters.sort !== "latest") params.set("sort", filters.sort);
  return params;
}

export function hasActiveFilters(filters: PlaceFilterState): boolean {
  return toSearchParams({ ...filters, sort: "latest" }).size > 0;
}
