import fs from "fs";
import path from "path";

const dir = process.argv[2];
const out = process.argv[3];

let all = [];
for (let i = 0; i < 10; i++) {
  const f = path.join(dir, `draft_batch_${i}.json`);
  if (!fs.existsSync(f)) {
    console.error("MISSING FILE", f);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(f, "utf-8"));
  console.log("batch", i, "count", data.length);
  all = all.concat(data);
}
console.log("TOTAL", all.length);
fs.writeFileSync(out, JSON.stringify(all, null, 2));
