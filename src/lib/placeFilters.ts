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
  /** 가게 이름 검색어 */
  query: string;
  /** 식당 안에서의 분류 (한식·일식…). cuisine의 대분류만 쓴다. */
  cuisines: string[];
  sort: SortOption;
}

export const DEFAULT_FILTERS: PlaceFilterState = {
  neighborhood: "all",
  category: "all",
  moodTags: [],
  priceTiers: [],
  firstMeetingOnly: false,
  query: "",
  cuisines: [],
  sort: "latest",
};

/**
 * cuisine은 "한식", "일식-라멘"처럼 대분류 단독 또는 "대분류-세부" 형태의 자유 텍스트다.
 * 필터에는 대분류만 쓴다 — 세부까지 나누면 한 칸에 한두 곳뿐인 항목이 수십 개가 된다.
 */
export function cuisineMajor(cuisine: string | null): string | null {
  const major = cuisine?.split("-")[0].trim();
  return major || null;
}

/** 검색은 띄어쓰기를 무시한다 ("LP바"로 "LP 바"를 찾을 수 있게) */
export function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

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
    // 검색어와 분류는 값 목록을 미리 알 수 없어(자유 텍스트) 길이만 제한한다
    query: (params.get("q") ?? "").slice(0, 40),
    cuisines: (params.get("food") ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 12),
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
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.cuisines.length > 0) params.set("food", filters.cuisines.join(","));
  if (filters.sort !== "latest") params.set("sort", filters.sort);
  return params;
}

export function hasActiveFilters(filters: PlaceFilterState): boolean {
  return toSearchParams({ ...filters, sort: "latest" }).size > 0;
}
