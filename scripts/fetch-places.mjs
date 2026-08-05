// 카카오 로컬 API로 실제 장소를 검색해서 Supabase에 status='pending_review'로 채워 넣는 스크립트.
// mood_tags/price_tier/curation_note는 자동으로 판단할 수 없어서 비워두고, 사람이 검수 후 published로 바꿔야 함.
//
// 실행: node --env-file=.env.local scripts/fetch-places.mjs

import { createClient } from "@supabase/supabase-js";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!KAKAO_REST_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "필요한 환경변수가 없어요: KAKAO_REST_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 .env.local에 넣어주세요."
  );
  process.exit(1);
}

const NEIGHBORHOOD_SEARCH_CENTERS = {
  연남: { lat: 37.5615, lng: 126.9254 },
  종로: { lat: 37.5704, lng: 126.991 },
  을지로: { lat: 37.5663, lng: 126.991 },
  용산: { lat: 37.5298, lng: 126.9648 },
  성수: { lat: 37.5445, lng: 127.0559 },
  강남: { lat: 37.4979, lng: 127.0276 },
};

const RADIUS_METERS = 1200;
const MAX_PAGES = 3; // 카카오 로컬 API는 검색당 최대 45건(15건 x 3페이지)까지만 제공
const PAGE_SIZE = 15;
const REQUEST_DELAY_MS = 150;

const CATEGORY_SEARCHES = [
  { ourCategory: "restaurant", type: "category", categoryGroupCode: "FD6" },
  { ourCategory: "cafe", type: "category", categoryGroupCode: "CE7" },
  { ourCategory: "bar", type: "keyword", query: "바" },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchKakaoPage({ type, categoryGroupCode, query, x, y, page }) {
  const params = new URLSearchParams({
    x: String(x),
    y: String(y),
    radius: String(RADIUS_METERS),
    size: String(PAGE_SIZE),
    page: String(page),
    sort: "accuracy",
  });
  if (type === "category") {
    params.set("category_group_code", categoryGroupCode);
  } else {
    params.set("query", query);
  }

  const endpoint = type === "category" ? "category" : "keyword";
  const res = await fetch(`https://dapi.kakao.com/v2/local/search/${endpoint}.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kakao API ${res.status}: ${body}`);
  }
  return res.json();
}

async function fetchAllForSearch(searchDef, center) {
  const results = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchKakaoPage({ ...searchDef, x: center.lng, y: center.lat, page });
    results.push(...data.documents);
    await sleep(REQUEST_DELAY_MS);
    if (data.meta.is_end) break;
  }
  return results;
}

function buildNaverSearchUrl(name, address) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`)}`;
}

async function main() {
  let totalFetched = 0;
  let totalInserted = 0;

  for (const [neighborhood, center] of Object.entries(NEIGHBORHOOD_SEARCH_CENTERS)) {
    for (const searchDef of CATEGORY_SEARCHES) {
      const documents = await fetchAllForSearch(searchDef, center);
      totalFetched += documents.length;

      const rows = documents.map((doc) => ({
        name: doc.place_name,
        category: searchDef.ourCategory,
        neighborhood,
        address: doc.road_address_name || doc.address_name,
        lat: Number(doc.y),
        lng: Number(doc.x),
        mood_tags: [],
        price_tier: null,
        curation_note: null,
        business_hours: null,
        kakao_map_url: doc.place_url,
        naver_map_url: buildNaverSearchUrl(doc.place_name, doc.road_address_name || doc.address_name),
        naver_place_url: null,
        reservation_url: null,
        status: "pending_review",
        kakao_place_id: doc.id,
      }));

      if (rows.length === 0) continue;

      const { data, error } = await supabase
        .from("places")
        .upsert(rows, { onConflict: "kakao_place_id", ignoreDuplicates: true })
        .select("id");

      if (error) {
        console.error(`[${neighborhood}/${searchDef.ourCategory}] 삽입 실패:`, error.message);
        continue;
      }

      totalInserted += data.length;
      console.log(
        `[${neighborhood}/${searchDef.ourCategory}] 검색 ${documents.length}건 중 신규 ${data.length}건 삽입 (나머지는 이미 있음)`
      );
    }
  }

  console.log(`\n완료: 총 검색 ${totalFetched}건, 신규 삽입 ${totalInserted}건 (status=pending_review)`);
  console.log("Supabase Table Editor에서 mood_tags / price_tier / curation_note를 채우고 status를 published로 바꿔주세요.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
