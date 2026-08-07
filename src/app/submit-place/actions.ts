"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { neighborhoodForCoords, seoulDistrict } from "@/lib/neighborhood";
import { PlaceCategory } from "@/types/place";

export interface SubmitState {
  error: string | null;
  done?: boolean;
}

const NOTE_MAX = 200;

/**
 * 카카오 업종 문자열을 우리 분류로 옮긴다.
 * "음식점 > 술집 > 와인바", "음식점 > 카페 > 커피전문점" 같은 형태다.
 * 먹고 마시는 곳이 아니면 null — 미용실·병원까지 검수 큐에 쌓이면 곤란하다.
 */
function toCategory(categoryName: string): PlaceCategory | null {
  if (categoryName.includes("술집")) return "bar";
  if (categoryName.includes("카페")) return "cafe";
  if (categoryName.startsWith("음식점")) return "restaurant";
  return null;
}

export async function submitPlace(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const kakaoPlaceId = String(formData.get("kakao_place_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const address = String(formData.get("address") ?? "").trim().slice(0, 200);
  const categoryName = String(formData.get("category_name") ?? "");
  const placeUrl = String(formData.get("place_url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, NOTE_MAX);
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!kakaoPlaceId || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "검색 결과에서 장소를 골라주세요." };
  }

  const category = toCategory(categoryName);
  if (!category) {
    return { error: "식당·카페·바만 신청할 수 있어요." };
  }

  // 다루는 6개 동네 밖이어도 서울이면 구 이름으로 받아둔다.
  // 동네를 넓힐 때 이미 쌓인 신청을 그대로 쓸 수 있다.
  const neighborhood = neighborhoodForCoords(lat, lng) ?? seoulDistrict(address);
  if (!neighborhood) {
    return { error: "지금은 서울 안의 장소만 받고 있어요." };
  }

  // 이미 있는 곳인지 본다. 발행·검수대기·제외 어디에 있든 다시 넣지 않는다.
  const { data: existing } = await supabaseAdmin
    .from("places")
    .select("status")
    .eq("kakao_place_id", kakaoPlaceId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "published") return { error: "이미 지도에 있는 곳이에요." };
    if (existing.status === "rejected") {
      return { error: "검토했지만 소개팅 자리로는 맞지 않아 뺀 곳이에요." };
    }
    return { error: "이미 신청돼서 검수를 기다리고 있어요." };
  }

  const { error } = await supabaseAdmin.from("places").insert({
    name,
    category,
    neighborhood,
    address,
    lat,
    lng,
    mood_tags: [],
    price_tier: null,
    status: "pending_review",
    kakao_place_id: kakaoPlaceId,
    kakao_map_url: placeUrl || null,
    naver_map_url: `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`,
    submitted_by_user: true,
    submission_note: note || null,
  });

  if (error) {
    console.error("submitPlace failed:", error.message);
    return { error: "신청에 실패했어요. 잠시 후 다시 시도해주세요." };
  }

  return { error: null, done: true };
}
