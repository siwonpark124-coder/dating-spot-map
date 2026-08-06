// 1차(첫 만남) 소개팅 자리로는 부적합한 발행 장소에 first_meeting_ok=false를 세팅한다.
// 장소 자체는 유효하므로 발행은 유지하고, 첫만남 필터에서만 빠진다.
// 선행 조건: supabase/migrations/0008_add_first_meeting_ok.sql 적용
// 실행: node --env-file=.env.local scripts/set-first-meeting-flags.mjs [--dry-run]
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes("--dry-run");

// 검수 노트가 "조용한 대화보다는 캐주얼한 자리에 어울린다"고 판정한 곳들.
// 왁자지껄/무한리필/테이크아웃 위주/프라이버시 부족이 주된 사유.
const NOT_FIRST_MEETING = [
  "현선이네 용산본점", "주식", "948키친 용산아이파크몰점", "오설록티하우스 오설록1979",
  "차지 용산아이파크몰점", "머큐리에스프레소바", "갓잇 성수점", "달맞이광장바베큐 성수점",
  "강남진해장", "용가회전훠궈 강남점", "비어룸", "뽕족 강남역본점",
  "섬집", "오근내2닭갈비", "능동미나리 신용산점",
  "대가", "레뽀드라라 신용산점", "로우커피스탠드", "한정선 성수본점",
  "신동궁감자탕뼈숯불구이 역삼직영점", "고메램 강남점", "이가네양꼬치 성수직영점",
  "ETF베이커리 성수", "마망젤라또 성수점",
];

const probe = await supabase.from("places").select("first_meeting_ok").limit(1);
if (probe.error) {
  console.error("first_meeting_ok 컬럼이 없습니다. 0008 마이그레이션을 먼저 적용하세요.");
  console.error(probe.error.message);
  process.exit(1);
}

const { data, error } = await supabase
  .from("places")
  .select("id,name,category,neighborhood,first_meeting_ok")
  .eq("status", "published")
  .in("name", NOT_FIRST_MEETING);
if (error) { console.error(error.message); process.exit(1); }

const missing = NOT_FIRST_MEETING.filter((n) => !data.some((p) => p.name === n));
console.log(`대상 ${data.length}/${NOT_FIRST_MEETING.length}곳`);
if (missing.length) console.log(`미매칭(이름 변경/제외됨): ${missing.join(", ")}`);

const todo = data.filter((p) => p.first_meeting_ok !== false);
console.log(`이미 처리됨: ${data.length - todo.length}곳 / 변경 필요: ${todo.length}곳\n`);
todo.forEach((p) => console.log(`  [${p.category}/${p.neighborhood}] ${p.name}`));

if (DRY) { console.log("\n--dry-run: DB 변경 없음"); process.exit(0); }

let ok = 0, fail = 0;
for (const p of todo) {
  const { error } = await supabase.from("places").update({ first_meeting_ok: false }).eq("id", p.id);
  if (error) { fail++; console.error(`실패 ${p.name}: ${error.message}`); } else ok++;
}
console.log(`\nfirst_meeting_ok=false 설정: ${ok}곳 (실패 ${fail})`);
