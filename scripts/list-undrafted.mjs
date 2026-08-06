// AI 초안이 아직 안 된 pending_review 장소 목록을 JSON으로 뽑아준다.
// 실행: node --env-file=.env.local scripts/list-undrafted.mjs [limit] [outfile]
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const limit = Number(process.argv[2] || 100);
const outfile = process.argv[3];

const { data, error } = await supabase
  .from("places")
  .select("id,name,category,neighborhood,address,lat,lng")
  .eq("status", "pending_review")
  .eq("mood_tags", "{}")
  .order("created_at", { ascending: true })
  .limit(limit);

if (error) {
  console.error(error);
  process.exit(1);
}

if (outfile) {
  fs.writeFileSync(outfile, JSON.stringify(data, null, 2));
  console.error(`saved ${data.length} to ${outfile}`);
} else {
  console.log(JSON.stringify(data, null, 2));
}
