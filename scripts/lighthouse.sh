#!/usr/bin/env bash
# Lighthouse, desktop + mobile, 3 runs each; the median-performance run is kept (as Lighthouse CI does).
# Usage: npm run build && npm run serve   (other terminal)   then   bash scripts/lighthouse.sh
set -euo pipefail
BASE="${BASE_URL:-http://localhost:4173}"
RUNS="${RUNS:-3}"
export CHROME_PATH="${CHROME_PATH:-/opt/pw-browsers/chromium}"
OUT=docs/reports/lighthouse
mkdir -p "$OUT/runs"
PAGES="${PAGES:-home u/dhruv-goyal create design-system}"
for page in $PAGES; do
  [ "$page" = home ] && page=""
  name="$(echo "${page:-home}" | tr / -)"
  for form in desktop mobile; do
    flag=""; [ "$form" = desktop ] && flag="--preset=desktop"
    for i in $(seq 1 "$RUNS"); do
      npx lighthouse "$BASE/$page?noboot" $flag --quiet --chrome-flags="--headless=new --no-sandbox" \
        --output=json --output=html --output-path="$OUT/runs/$name-$form-$i" >/dev/null 2>&1
    done
    # keep the median run by performance score
    best=$(node -e '
      const fs=require("fs");const [dir,stem,n]=process.argv.slice(1);
      const runs=[...Array(+n).keys()].map(i=>{const f=`${dir}/${stem}-${i+1}.report.json`;return {f,s:JSON.parse(fs.readFileSync(f)).categories.performance.score}}).sort((a,b)=>a.s-b.s);
      console.log(runs[Math.floor(runs.length/2)].f.replace(".report.json",""))' "$OUT/runs" "$name-$form" "$RUNS")
    cp "$best.report.json" "$OUT/$name-$form.report.json"
    cp "$best.report.html" "$OUT/$name-$form.report.html"
  done
done
node -e '
const fs=require("fs");const dir="docs/reports/lighthouse";const rows=[];
for (const f of fs.readdirSync(dir).filter(f=>f.endsWith(".report.json"))) {
  const d=JSON.parse(fs.readFileSync(dir+"/"+f));const a=d.audits,c=d.categories;
  const all=fs.readdirSync(dir+"/runs").filter(x=>x.startsWith(f.replace(".report.json",""))&&x.endsWith(".json")).map(x=>Math.round(JSON.parse(fs.readFileSync(dir+"/runs/"+x)).categories.performance.score*100));
  rows.push({run:f.replace(".report.json",""),perf:Math.round(c.performance.score*100),"perf runs":all.join("/"),a11y:Math.round(c.accessibility.score*100),bp:Math.round(c["best-practices"].score*100),seo:Math.round(c.seo.score*100),FCP:a["first-contentful-paint"].displayValue,LCP:a["largest-contentful-paint"].displayValue,TBT:a["total-blocking-time"].displayValue,CLS:a["cumulative-layout-shift"].displayValue,weight:Math.round(a["total-byte-weight"].numericValue/1024)+" KiB"});
}
console.table(rows);fs.writeFileSync(dir+"/summary.json",JSON.stringify(rows,null,2));'
