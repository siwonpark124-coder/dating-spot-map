import { NEIGHBORHOODS, NEIGHBORHOOD_SEARCH_CENTERS } from "./constants";

/**
 * 동네 중심에서 이 거리 안이면 그 동네로 본다. 수집 스크립트의 검색 반경과 맞췄다.
 * 넉넉하게 잡으면 남가좌동 가게가 '연남'으로 붙는다 — 도보로 코스를 잇는 앱에서
 * 그건 거짓말이 된다. 여기서 벗어난 서울 장소는 구 이름으로 받으면 되므로
 * 상한을 좁혀도 신청이 튕기지 않는다.
 */
const MAX_DISTANCE_METERS = 1200;

function meters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(rad(a.lat)) * Math.cos(rad(b.lat));
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 좌표가 속한 동네. 6개 동네 어디에서도 멀면 null.
 *
 * 수집 스크립트는 "가장 가까운 동네"를 무조건 고르지만(검색 자체가 동네 반경에서
 * 이뤄지므로 안전하다), 사용자 신청은 전국 어디든 들어올 수 있어서
 * 거리 상한이 없으면 부산 가게가 강남으로 붙는다.
 */
export function neighborhoodForCoords(lat: number, lng: number): string | null {
  let best: { name: string; distance: number } | null = null;

  for (const name of NEIGHBORHOODS) {
    const distance = meters({ lat, lng }, NEIGHBORHOOD_SEARCH_CENTERS[name]);
    if (!best || distance < best.distance) best = { name, distance };
  }

  if (!best || best.distance > MAX_DISTANCE_METERS) return null;
  return best.name;
}

/**
 * "서울 성동구 왕십리로 50" → "성동". 서울이 아니면 null.
 *
 * 다루는 동네 밖이어도 서울이면 받아두고 구 이름으로 라벨을 단다.
 * 나중에 그 동네를 열 때 이미 쌓인 신청을 그대로 쓸 수 있다.
 * 이 라벨은 NEIGHBORHOODS에 없으므로 동네 필터에는 안 잡히고
 * '전체 동네'에서만 보인다 — 발행 여부는 검수에서 정한다.
 */
export function seoulDistrict(address: string): string | null {
  const match = address.match(/^서울(?:특별시)?\s+(\S+?)구(?:\s|$)/);
  return match ? match[1] : null;
}
