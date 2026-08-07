// 좌표 기준으로 동네 라벨을 다시 붙인다.
//
// fetch-places.mjs가 동네 중심에서 반경 1,200m로 수집하는데 종로(37.5704,126.9910)와
// 을지로(37.5663,126.9910) 중심이 456m밖에 안 떨어져 있어 두 반경이 거의 겹친다.
// 그래서 먼저 수집된 쪽이 장소를 가져가고, 을지로 한복판 가게가 종로로 남는다.
//
// 실행: node --env-file=.env.local scripts/reassign-neighborhoods.mjs [--dry-run]
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes("--dry-run");

// src/lib/constants.ts의 NEIGHBORHOOD_SEARCH_CENTERS와 같은 값
const CENTERS = {
  연남: { lat: 37.5615, lng: 126.9254 },
  종로: { lat: 37.5704, lng: 126.991 },
  을지로: { lat: 37.5663, lng: 126.991 },
  용산: { lat: 37.5298, lng: 126.9648 },
  성수: { lat: 37.5445, lng: 127.0559 },
  강남: { lat: 37.4979, lng: 127.0276 },
};

function meters(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(rad(a.lat)) * Math.cos(rad(b.lat));
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearest(place) {
  let best = null;
  let bestDist = Infinity;
  for (const [name, center] of Object.entries(CENTERS)) {
    const d = meters(place, center);
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return { name: best, distance: Math.round(bestDist) };
}

// 제외된 장소도 같이 고친다. 나중에 되살렸을 때 라벨이 틀어져 있으면 안 되니까.
const { data, error } = await supabase
  .from("places")
  .select("id,name,neighborhood,lat,lng,status");
if (error) {
  console.error(error.message);
  process.exit(1);
}

const changes = [];
for (const place of data) {
  const { name: correct, distance } = nearest(place);
  if (correct !== place.neighborhood) {
    const currentDist = Math.round(meters(place, CENTERS[place.neighborhood]));
    changes.push({ ...place, correct, distance, currentDist });
  }
}

console.log(`발행 ${data.length}곳 / 라벨 변경 대상 ${changes.length}곳\n`);
for (const c of changes) {
  console.log(
    `  ${c.neighborhood} → ${c.correct}  ${c.name}` +
      `  (${c.neighborhood} 중심 ${c.currentDist}m vs ${c.correct} 중심 ${c.distance}m)`,
  );
}

if (DRY) {
  console.log("\n--dry-run: DB 변경 없음");
  process.exit(0);
}

let ok = 0;
let fail = 0;
for (const c of changes) {
  const { error } = await supabase
    .from("places")
    .update({ neighborhood: c.correct })
    .eq("id", c.id);
  if (error) {
    fail++;
    console.error(`실패 ${c.name}: ${error.message}`);
  } else ok++;
}
console.log(`\n반영: ${ok}곳 (실패 ${fail})`);

const { data: after } = await supabase
  .from("places")
  .select("neighborhood")
  .eq("status", "published");
const counts = after.reduce((m, p) => ((m[p.neighborhood] = (m[p.neighborhood] || 0) + 1), m), {});
console.log(`동네별 발행 수: ${JSON.stringify(counts)}`);
