import { NextRequest } from "next/server";

// 코스에 직접 넣을 지점(전시회·공원 등)을 찾기 위한 카카오 장소 검색 프록시.
// KAKAO_REST_API_KEY는 서버 전용이라 브라우저에서 직접 부를 수 없다.

const MAX_RESULTS = 8;
/** 서울 중심. 검색 결과를 서울 근처부터 보여주기 위한 기준점일 뿐 범위 제한은 아니다. */
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "검색 기능이 설정되지 않았어요." }, { status: 503 });
  }

  const params = new URLSearchParams({
    query,
    x: String(SEOUL_CENTER.lng),
    y: String(SEOUL_CENTER.lat),
    sort: "accuracy",
    size: String(MAX_RESULTS),
  });

  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      // 검색어별로 결과가 잘 안 바뀌므로 잠깐 캐싱해 호출 수를 줄인다
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error("Kakao place search failed:", res.status, await res.text());
      return Response.json({ error: "검색에 실패했어요." }, { status: 502 });
    }

    const data = await res.json();
    const results = (data.documents ?? []).map(
      (doc: {
        place_name: string;
        category_name?: string;
        road_address_name?: string;
        address_name?: string;
        x: string;
        y: string;
      }) => ({
        label: doc.place_name,
        // "음식점 > 카페 > 커피전문점" 형태라 마지막 조각만 쓴다
        category: doc.category_name?.split(">").pop()?.trim() ?? "",
        address: doc.road_address_name || doc.address_name || "",
        lat: Number(doc.y),
        lng: Number(doc.x),
      }),
    );

    return Response.json({ results });
  } catch (error) {
    console.error("Kakao place search error:", error);
    return Response.json({ error: "검색에 실패했어요." }, { status: 502 });
  }
}
