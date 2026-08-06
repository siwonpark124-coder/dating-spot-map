// AI가 리서치한 초안(mood_tags/price_tier/curation_note)을 Supabase에 반영한다.
// 입력 JSON은 [{id, mood_tags, price_tier, curation_note}, ...] 형태.
// status는 건드리지 않음 (여전히 pending_review로 남아 사람이 검수).
// 실행: node --env-file=.env.local scripts/apply-drafts.mjs <input.json>
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_MOOD_TAGS = new Set(["조용함", "캐주얼", "무드있는", "뷰맛집", "프라이빗"]);

const infile = process.argv[2];
if (!infile) {
  console.error("사용법: node scripts/apply-drafts.mjs <input.json>");
  process.exit(1);
}

const drafts = JSON.parse(fs.readFileSync(infile, "utf-8"));

let ok = 0;
let failed = 0;
const errors = [];

for (const d of drafts) {
  if (!d.id || !Array.isArray(d.mood_tags) || d.mood_tags.length === 0) {
    failed++;
    errors.push({ id: d.id, name: d.name, reason: "mood_tags 누락/빈 배열" });
    continue;
  }
  const badTags = d.mood_tags.filter((t) => !ALLOWED_MOOD_TAGS.has(t));
  if (badTags.length > 0) {
    failed++;
    errors.push({ id: d.id, name: d.name, reason: `허용되지 않은 mood_tags: ${badTags.join(",")}` });
    continue;
  }
  if (![1, 2, 3].includes(d.price_tier)) {
    failed++;
    errors.push({ id: d.id, name: d.name, reason: `price_tier 값 이상: ${d.price_tier}` });
    continue;
  }
  if (!d.curation_note || typeof d.curation_note !== "string" || d.curation_note.length < 5) {
    failed++;
    errors.push({ id: d.id, name: d.name, reason: "curation_note 누락/너무 짧음" });
    continue;
  }

  const { error } = await supabase
    .from("places")
    .update({
      mood_tags: d.mood_tags,
      price_tier: d.price_tier,
      curation_note: d.curation_note,
    })
    .eq("id", d.id)
    .eq("status", "pending_review");

  if (error) {
    failed++;
    errors.push({ id: d.id, name: d.name, reason: error.message });
  } else {
    ok++;
  }
}

console.log(`완료: ${ok}개 반영, ${failed}개 실패`);
if (errors.length > 0) {
  console.log("실패 목록:");
  for (const e of errors) console.log(`  - [${e.id}] ${e.name ?? ""}: ${e.reason}`);
}
