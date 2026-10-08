/**
 * Design rules shared by `scripts/audit-design.mjs` and `e2e/design.spec.ts`. The function runs
 * inside the page (page.evaluate), so it must stay self-contained.
 * Sources: Vercel Web Interface Guidelines, Anthropic frontend-design, Impeccable detector ideas.
 */
/** Runs in the page. Returns { fails: [...], tells: {...} }. */
export function audit(mobile) {
  const fails = [];
  const push = (rule, el, detail) => fails.push({ rule, where: describe(el), detail });
  function describe(el) {
    if (!el) return "";
    const id = el.id ? `#${el.id}` : "";
    const tid = el.getAttribute?.("data-testid") ? `[data-testid=${el.getAttribute("data-testid")}]` : "";
    const txt = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${tid} “${txt}”`;
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[aria-hidden=true]");
  };

  // 1. Inputs ≥ 16px on phones, or iOS Safari zooms the page on focus (WIG: mobile input size)
  if (mobile)
    for (const el of document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select"))
      if (visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16) push("input-font-16", el, getComputedStyle(el).fontSize);

  // 2. Typography: real ellipsis and no three-dot runs in visible text (WIG: use the ellipsis character)
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (!p || p.closest("script,style,code,pre,[aria-hidden=true]") || !visible(p)) continue;
    if (/\.\.\.(?!\.)/.test(n.nodeValue)) push("ellipsis-char", p, n.nodeValue.trim().slice(0, 50));
  }
  for (const el of document.querySelectorAll("input[placeholder], textarea[placeholder]"))
    if (/\.\.\./.test(el.placeholder)) push("ellipsis-char", el, el.placeholder);

  // 3. Never `transition: all` (WIG: list the properties you animate)
  for (const el of document.querySelectorAll("body *")) {
    const t = getComputedStyle(el).transitionProperty;
    if (t === "all" && getComputedStyle(el).transitionDuration !== "0s") push("transition-all", el, t);
  }

  // 4. Hit targets: ≥ 24px everywhere, ≥ 40px on phones for standalone controls (WIG: match visual & hit targets)
  for (const el of document.querySelectorAll("button, [role=button], [role=tab], [role=radio], a.btn, nav a")) {
    if (!visible(el) || el.closest("p, li > p")) continue;
    const r = el.getBoundingClientRect();
    const min = mobile ? 40 : 24;
    if (Math.min(r.width, r.height) < min - 0.5) push("hit-target", el, `${Math.round(r.width)}×${Math.round(r.height)} < ${min}`);
  }

  // 5. Icon-only controls are named (WIG: icon-only buttons are named)
  for (const el of document.querySelectorAll("button, a")) {
    if (!visible(el)) continue;
    const name = (el.getAttribute("aria-label") ?? "") + (el.textContent ?? "").trim() + (el.getAttribute("title") ?? "");
    if (!name.trim()) push("unnamed-control", el, "");
  }

  // 6. Section anchors clear the sticky nav (WIG: anchored headings → scroll-margin-top)
  if (document.querySelector('nav[aria-label="Chapters"]'))
    for (const s of document.querySelectorAll("main section[id]"))
      if (s.id !== "launch" && parseFloat(getComputedStyle(s).scrollMarginTop) < 40) push("scroll-margin", s, getComputedStyle(s).scrollMarginTop);

  // 7. Figures meant for comparison use tabular numbers (WIG: tabular numbers for comparisons)
  for (const el of document.querySelectorAll('[data-testid=kpi] .display, [data-testid=kpi] .tabular-nums'))
    if (visible(el) && !getComputedStyle(el).fontVariantNumeric.includes("tabular")) push("tabular-nums", el, getComputedStyle(el).fontVariantNumeric);

  // 8. Vague action labels (frontend-design: a CTA says exactly what happens)
  for (const el of document.querySelectorAll("button, a.btn"))
    if (visible(el) && /^(submit|click here|learn more|go|ok|continue)$/i.test((el.textContent ?? "").trim())) push("vague-cta", el, "");

  // Tells: generated-looking defaults (counted, not failed — they can be deliberate in a template)
  const caps = [...document.querySelectorAll("body *")].filter((el) => visible(el) && el.children.length === 0 && getComputedStyle(el).textTransform === "uppercase" && (el.textContent ?? "").trim().length > 2).length;
  const arrows = [...document.querySelectorAll("a, button")].filter((el) => visible(el) && /[→↗]\s*$/.test((el.textContent ?? "").trim())).length;
  const dots = [...document.querySelectorAll("body *")].filter((el) => visible(el) && el.children.length === 0 && / · .* · /.test(el.textContent ?? "")).length;
  return { fails, tells: { allCapsLabels: caps, arrowLinks: arrows, middleDotStrings: dots } };
}

