// 기존 식당(category='restaurant')들의 이름/추천 이유 텍스트에서 키워드로 음식 종류(cuisine)를 추론해 채운다.
// 이미 연남동 41곳에 "한식-감자탕" / "일식-라멘" / "이자카야" / "베이커리"처럼
// "대분류" 단독 또는 "대분류-세부" 형태로 채워져 있던 기존 관행을 그대로 따른다.
// 확실히 판단되는 경우만 채우고, 애매하면 비워둬서(null) 사람이 검수 화면에서 직접 고르게 한다.
// 실행: node --env-file=.env.local scripts/backfill-cuisine.mjs [--dry-run]
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const dryRun = process.argv.includes("--dry-run");

// 순서대로 검사해서 먼저 걸리는 것을 채택 (구체적인 것 → 넓은 것 순서)
const SPECIFIC_RULES = [
  ["일식-스시", ["스시", "초밥", "회전초밥", "사시미"]],
  ["일식-라멘", ["라멘", "소바", "우동"]],
  ["일식-돈카츠", ["돈카츠", "규카츠", "가츠"]],
  ["이자카야", ["이자카야", "야키토리", "오뎅바", "사케"]],
  ["일식", ["일식", "일본식", "일본가정식", "오마카세", "텐동", "낫토", "돈부리", "덮밥"]],

  ["중식-훠궈", ["훠궈"]],
  ["중식-딤섬/만두", ["딤섬", "소룡포"]],
  ["중식-마라/양꼬치", ["마라탕", "마라", "양꼬치"]],
  ["중식", ["중식", "짜장", "짬뽕", "탕수육", "중국요리", "중국집", "우육면", "꿔바로우", "만두"]],

  ["한식-감자탕", ["감자탕", "뼈해장국"]],
  ["한식-국밥/해장국", ["국밥", "해장국", "순대국", "설렁탕", "곰탕"]],
  ["한식-냉면", ["냉면"]],
  ["한식-족발보쌈", ["족발", "보쌈"]],
  ["한식-고깃집", ["삼겹살", "갈비", "곱창", "막창", "숯불구이", "고깃집", "육회", "등심", "갈매기살"]],
  ["한식-닭요리", ["닭갈비", "닭한마리", "닭볶음탕", "닭발", "삼계탕"]],
  ["한식", [
    "한식", "한정식", "백반", "비빔밥", "청국장", "조개찜", "아귀", "전골", "떡볶이",
    "골뱅이", "칼국수", "메밀", "국수", "김치", "안주",
  ]],

  ["태국음식", ["태국", "팟타이", "똠얌", "나시고랭", "쌀국수", "반미", "베트남"]],
  ["멕시칸", ["멕시칸", "타코", "부리또", "멕시코"]],
  ["양식-이탈리안", ["이탈리안", "파스타", "리조또"]],
  ["양식-피자", ["피자"]],
  ["양식-스테이크", ["스테이크", "그릴", "프라임립", "립"]],
  ["양식-스페인", ["스페인", "타파스"]],
  ["양식-브런치", ["브런치"]],
  ["양식", ["양식", "프렌치", "버거", "와인바"]],

  ["베이커리", ["베이커리", "빵집", "제과"]],
  ["디저트", ["디저트", "케이크", "베이글"]],
];

function inferCuisine(text) {
  for (const [value, keywords] of SPECIFIC_RULES) {
    if (keywords.some((kw) => text.includes(kw))) return value;
  }
  return null;
}

const { data: restaurants, error } = await supabase
  .from("places")
  .select("id,name,curation_note,cuisine")
  .eq("category", "restaurant")
  .is("cuisine", null);

if (error) {
  console.error(error);
  process.exit(1);
}

let matched = 0;
let unmatched = 0;
const unmatchedNames = [];
const tally = {};

for (const p of restaurants) {
  const text = `${p.name} ${p.curation_note ?? ""}`;
  const cuisine = inferCuisine(text);
  if (!cuisine) {
    unmatched++;
    unmatchedNames.push(p.name);
    continue;
  }
  matched++;
  tally[cuisine] = (tally[cuisine] ?? 0) + 1;
  if (!dryRun) {
    const { error: updateError } = await supabase.from("places").update({ cuisine }).eq("id", p.id);
    if (updateError) console.error(`업데이트 실패 [${p.name}]:`, updateError.message);
  }
}

console.log(`대상 ${restaurants.length}개 중 ${matched}개 매칭${dryRun ? " (dry-run, 실제 반영 안 함)" : " 반영"}, ${unmatched}개 미매칭(검수 화면에서 직접 선택 필요)`);
console.log("분류 결과:", tally);
if (unmatched > 0) {
  console.log("미매칭 목록:", unmatchedNames.join(", "));
}
