import { PassageError, fetchPassage, verseLabel, type Verse } from "./api";
import {
  GOSPELS,
  GOSPEL_BY_ID,
  PARTS,
  SECTIONS,
  referenceOf,
  type Gospel,
  type GospelId,
  type Section,
} from "./synopsis";

// ---- types -----------------------------------------------------------------

type Theme = "auto" | "dark" | "light";

interface Prefs {
  theme: Theme;
  visible: Record<GospelId, boolean>;
  fill: boolean;
  scale: 0 | 1 | 2;
  sectionId: string;
}

interface ColumnState {
  status: "loading" | "ready" | "error";
  verses: Verse[];
  error?: string;
}

// ---- dom -------------------------------------------------------------------

const $ = <T extends HTMLElement>(selector: string) => document.querySelector(selector) as T;

const content = $("#content");
const outline = $("#outline");
const outlineCount = $("#outline-count");
const searchInput = $<HTMLInputElement>("#search");
const crumbs = $("#crumbs");
const gospelToggles = $("#gospel-toggles");
const themeBtn = $<HTMLButtonElement>("#theme-btn");
const typeBtn = $<HTMLButtonElement>("#type-btn");
const fillBtn = $<HTMLButtonElement>("#fill-btn");
const statusLeft = $("#status-left");
const about = $("#about");
const aboutLink = $<HTMLButtonElement>("#about-link");
const aboutClose = $<HTMLButtonElement>("#about-close");
const attribution = $<HTMLButtonElement>("#attribution");
const menuBtn = $<HTMLButtonElement>("#menu-btn");
const scrim = $("#scrim");
const parallels = $("#parallels");

const phone = window.matchMedia("(max-width: 760px)");
const isPhone = () => phone.matches;

// ---- constants -------------------------------------------------------------

const STORAGE = "netstudy-synopsis/v1";
const VERSION = "1.1.2";

const ORDINAL = new Map(SECTIONS.map((s, i) => [s.id, i + 1]));
const PART_TITLE = new Map(PARTS.map((p) => [p.id, p.title]));
const PART_ORDER = PARTS.map((p) => p.id);

const STOPWORDS = new Set(
  `a an the and or but if then than so for because as of to in on at by with from into out up down over under
   is are was were be been being am do does did doing have has had having will would shall should may might must can could
   i you he she it we they me him her us them my your his its our their this that these those who whom which what when where why how
   not no nor all any both each few more most other some such only own same too very just also even still yet now here there
   said saying says say told tell answered replied asked came come went go goes going made make makes take took give gave
   one two three first last after before again against among between through during without within upon about above below
   himself themselves herself myself yourself ourselves itself yourselves one's`
    .split(/\s+/)
    .filter(Boolean),
);

// ---- state -----------------------------------------------------------------

function defaultPrefs(): Prefs {
  return {
    theme: "auto",
    visible: { matthew: true, mark: true, luke: true, john: true },
    fill: false,
    scale: 0,
    sectionId: SECTIONS[0].id,
  };
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    const base = defaultPrefs();
    return {
      theme: parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "auto" ? parsed.theme : base.theme,
      visible: { ...base.visible, ...(parsed.visible ?? {}) },
      fill: typeof parsed.fill === "boolean" ? parsed.fill : base.fill,
      scale: parsed.scale === 1 || parsed.scale === 2 ? parsed.scale : 0,
      sectionId: SECTIONS.some((s) => s.id === parsed.sectionId) ? (parsed.sectionId as string) : base.sectionId,
    };
  } catch {
    return defaultPrefs();
  }
}

let prefs = loadPrefs();
let current: Section = SECTIONS.find((s) => s.id === prefs.sectionId) ?? SECTIONS[0];
let filter = "";
let pinned: HTMLElement | null = null;
let loadToken = 0;

const cache = new Map<string, ColumnState>();
const tokensOfVerse = new WeakMap<HTMLElement, Set<string>>();

const searchHaystack = new Map<string, string>(
  SECTIONS.map((section) => {
    const refs = GOSPELS.map((g) => {
      const ref = section.passages[g.id];
      return ref ? `${g.name} ${ref} ${g.short} ${ref} ${g.abbr} ${ref}` : "";
    }).join(" ");
    return [section.id, `${section.title} ${PART_TITLE.get(section.part) ?? ""} ${refs}`.toLowerCase()];
  }),
);

// ---- preferences -----------------------------------------------------------

function savePrefs() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(prefs));
  } catch {
    /* storage may be unavailable; the app still works for this session */
  }
}

function applyTheme() {
  const resolved =
    prefs.theme === "auto"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : prefs.theme;
  document.documentElement.dataset.theme = resolved;
  themeBtn.textContent = prefs.theme === "auto" ? "◐" : resolved === "dark" ? "☾" : "☀";
  themeBtn.title = `Appearance: ${prefs.theme}`;
}

function applyScale() {
  document.documentElement.dataset.scale = String(prefs.scale);
  typeBtn.title = `Text size: ${["Small", "Medium", "Large"][prefs.scale]}`;
  typeBtn.style.fontSize = ["13px", "14.5px", "16px"][prefs.scale];
}

function applyFill() {
  fillBtn.setAttribute("aria-pressed", String(prefs.fill));
  fillBtn.title = prefs.fill ? "Only Gospels with an account" : "Fill all four columns";
}

// ---- small helpers ---------------------------------------------------------

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function versesFor(section: Section, gospel: Gospel): string {
  return referenceOf(section, gospel);
}

function cacheKey(section: Section, gospel: Gospel): string {
  return `${section.id}:${gospel.id}`;
}

function tokensFor(element: HTMLElement): Set<string> {
  let set = tokensOfVerse.get(element);
  if (set) return set;
  const text = element.querySelector(".vtext")?.textContent ?? element.textContent ?? "";
  set = new Set(
    (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
  tokensOfVerse.set(element, set);
  return set;
}

// ---- sidebar ---------------------------------------------------------------

function matchesFilter(section: Section): boolean {
  if (!filter) return true;
  const hay = searchHaystack.get(section.id) ?? "";
  return filter
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

function sectionRow(section: Section): string {
  const active = section.id === current.id ? " active" : "";
  const part = PART_TITLE.get(section.part) ?? "";
  const dots = GOSPELS.map((g) => {
    const on = Boolean(section.passages[g.id]);
    return `<span class="dot${on ? " on" : ""}" style="color:${g.hue}" title="${g.name}${on ? "" : ": no parallel"}"></span>`;
  }).join("");
  return `<button class="row${active}" type="button" data-section="${section.id}" title="${escapeHTML(part)}">
    <span class="row-ord">${ORDINAL.get(section.id)}</span>
    <span class="row-main">
      <span class="row-title">${escapeHTML(section.title)}</span>
      <span class="row-dots">${dots}</span>
    </span>
  </button>`;
}

function renderOutline() {
  let shown = 0;
  const parts: string[] = [];

  for (const partId of PART_ORDER) {
    const items = SECTIONS.filter((s) => s.part === partId && matchesFilter(s));
    if (items.length === 0) continue;
    shown += items.length;
    parts.push(
      `<div class="part">
        <div class="part-head"><span>${escapeHTML(PART_TITLE.get(partId) ?? "")}</span><span class="part-n">${items.length}</span></div>
        ${items.map(sectionRow).join("")}
      </div>`,
    );
  }

  outline.innerHTML =
    parts.join("") ||
    `<div class="empty-state" style="margin:44px 12px">
       <h2>No match</h2>
       <p>Nothing in the outline fits “${escapeHTML(filter)}”. Try an event, a Gospel, or a reference like “5:3”.</p>
     </div>`;

  outlineCount.textContent = filter ? `${shown} of ${SECTIONS.length}` : `${SECTIONS.length} pericopes`;
}

function markActive() {
  for (const row of outline.querySelectorAll<HTMLElement>(".row")) {
    const active = row.dataset.section === current.id;
    row.classList.toggle("active", active);
    if (active && row.offsetParent !== null) {
      // Scroll only the outline. scrollIntoView also moves ancestors, which
      // shifts the whole window when the active row is far down the list.
      const r = row.getBoundingClientRect();
      const box = outline.getBoundingClientRect();
      if (r.top < box.top + 34) outline.scrollTop += r.top - box.top - 34;
      else if (r.bottom > box.bottom - 10) outline.scrollTop += r.bottom - box.bottom + 10;
    }
  }
}

// ---- section render --------------------------------------------------------

function columnHTML(section: Section, gospel: Gospel): string {
  const reference = versesFor(section, gospel);
  if (!reference) {
    return `<article class="column empty" data-gospel="${gospel.id}" style="--hue:${gospel.hue}">
      <header class="col-head">
        <div class="col-name"><span class="gdot"></span>${gospel.name}</div>
        <div class="col-ref">no parallel</div>
        <span class="col-count">—</span>
      </header>
      <div class="col-body"><p class="col-silent">This Gospel does not tell this pericope.</p></div>
    </article>`;
  }

  const state = cache.get(cacheKey(section, gospel));
  let body: string;
  let count = "—";

  if (state?.status === "ready") {
    body = versesHTML(state.verses, gospel);
    count = `${state.verses.length} vv`;
  } else if (state?.status === "error") {
    body = errorHTML(gospel, state.error ?? "Couldn't load this passage.");
  } else {
    body = `<div class="skeleton" aria-hidden="true">${'<div class="sk-line"></div>'.repeat(6)}</div>`;
  }

  return `<article class="column" data-gospel="${gospel.id}" style="--hue:${gospel.hue}">
    <header class="col-head">
      <div class="col-name"><span class="gdot"></span>${gospel.name}</div>
      <div class="col-ref">${escapeHTML(section.passages[gospel.id] ?? "")}</div>
      <span class="col-count" id="count-${gospel.id}">${count}</span>
    </header>
    <div class="col-body" id="body-${gospel.id}">${body}</div>
  </article>`;
}

function versesHTML(verses: Verse[], gospel: Gospel): string {
  return verses
    .map(
      (v) =>
        `<span class="verse" data-gospel="${gospel.id}" data-ref="${escapeHTML(verseLabel(v.book, v.chapter, v.verse))}"><span class="vnum">${v.verse}</span><span class="vtext">${escapeHTML(v.text)} </span></span>`,
    )
    .join("");
}

function errorHTML(gospel: Gospel, message: string): string {
  return `<div class="col-error">
    <span>${escapeHTML(message)}</span>
    <button class="retry" type="button" data-retry="${gospel.id}">Try again</button>
  </div>`;
}

function sectionHTML(section: Section): string {
  const ordinal = ORDINAL.get(section.id) ?? 0;
  const prev = SECTIONS[ordinal - 2];
  const next = SECTIONS[ordinal];
  const part = PART_TITLE.get(section.part) ?? "";

  const selected = GOSPELS.filter((g) => prefs.visible[g.id] && (prefs.fill || section.passages[g.id]));
  const columns = selected.map((g) => columnHTML(section, g));
  const chips = GOSPELS.filter((g) => section.passages[g.id])
    .map(
      (g) =>
        `<button class="ref-chip" type="button" data-jump="${g.id}" style="--hue:${g.hue}" title="Jump to ${g.name}">
          <span class="gdot"></span><span class="abbr">${g.abbr}</span>${escapeHTML(section.passages[g.id] ?? "")}
        </button>`,
    )
    .join("");

  const body =
    columns.length > 0
      ? `<div class="synopsis" data-cols="${columns.length}" style="--cols:${columns.length}">${columns.join("")}</div>`
      : `<div class="empty-state">
           <h2>No Gospels shown</h2>
           <p>Every column is switched off. Turn one back on in the toolbar, or show all four.</p>
           <button class="retry" type="button" data-show-all>Show all four</button>
         </div>`;

  const note = section.note ? `<p class="section-note">${escapeHTML(section.note)}</p>` : "";

  const tabs =
    selected.length > 1
      ? `<div class="mtabs" role="tablist" aria-label="Gospel">${selected
          .map(
            (g, i) =>
              `<button class="mtab" type="button" role="tab" data-goto="${g.id}" aria-selected="${i === 0}" style="--hue:${g.hue}"><span class="gdot"></span>${g.abbr}</button>`,
          )
          .join("")}</div>`
      : "";

  return `<header class="section-head">
    <div class="section-eyebrow">
      <span class="ord">Section ${ordinal}</span><span class="sep">·</span><span>${escapeHTML(part)}</span>
    </div>
    <div class="title-row">
      <h1>${escapeHTML(section.title)}</h1>
      <div class="nav-pair">
        <button class="icon-btn" type="button" id="prev-section" title="Previous pericope" ${prev ? "" : "disabled"}>‹</button>
        <span class="pos">${ordinal} / ${SECTIONS.length}</span>
        <button class="icon-btn" type="button" id="next-section" title="Next pericope" ${next ? "" : "disabled"}>›</button>
      </div>
    </div>
    <div class="ref-row">${chips}</div>
    ${note}
  </header>
  ${tabs}
  ${body}`;
}

function renderSection(section: Section, resetScroll: boolean) {
  current = section;
  prefs.sectionId = section.id;
  savePrefs();

  content.innerHTML = sectionHTML(section);
  if (resetScroll) content.scrollTop = 0;

  document.title = `${section.title} — NET Study Synopsis`;
  const part = PART_TITLE.get(section.part) ?? "";
  crumbs.innerHTML = `<strong>${escapeHTML(part)}</strong><span style="opacity:.5"> · </span>Section ${ORDINAL.get(section.id)}`;
  statusLeft.textContent = "";

  markActive();
  pinned = null;
  hideParallels();
  closeDrawer();
  wireTabs();
  hydrate(section);
  updateStatus(section);
}

// ---- phone: gospel tabs, drawer, parallel sheet ----------------------------

function openDrawer() {
  document.body.classList.add("drawer-open");
  scrim.classList.remove("hidden");
}

function closeDrawer() {
  document.body.classList.remove("drawer-open");
  scrim.classList.add("hidden");
}

function hideParallels() {
  parallels.classList.add("hidden");
  parallels.innerHTML = "";
}

function columnOf(id: string): HTMLElement | null {
  return content.querySelector<HTMLElement>(`.column[data-gospel="${id}"]`);
}

function scrollToGospel(id: string, behavior: ScrollBehavior = "smooth") {
  const strip = content.querySelector<HTMLElement>(".synopsis");
  const column = columnOf(id);
  if (!strip || !column) return;
  const first = strip.querySelector<HTMLElement>(".column");
  strip.scrollTo({ left: column.offsetLeft - (first?.offsetLeft ?? 0), behavior });
}

function wireTabs() {
  const strip = content.querySelector<HTMLElement>(".synopsis");
  if (!strip) return;
  const columns = Array.from(strip.querySelectorAll<HTMLElement>(".column"));
  const tabs = Array.from(content.querySelectorAll<HTMLElement>(".mtab"));
  if (columns.length === 0) return;
  const base = columns[0].offsetLeft;

  const update = () => {
    const x = strip.scrollLeft;
    let best = 0;
    let distance = Number.POSITIVE_INFINITY;
    columns.forEach((column, index) => {
      const d = Math.abs(column.offsetLeft - base - x);
      if (d < distance) {
        distance = d;
        best = index;
      }
    });
    tabs.forEach((tab, index) => tab.setAttribute("aria-selected", String(index === best)));
  };

  strip.addEventListener("scroll", () => window.requestAnimationFrame(update), { passive: true });
  update();
}

interface ParallelHit {
  element: HTMLElement;
  gospel: Gospel;
  score: number;
}

function parallelHits(source: HTMLElement): ParallelHit[] {
  const a = tokensFor(source);
  const from = source.dataset.gospel;
  const hits: ParallelHit[] = [];
  if (a.size === 0) return hits;

  for (const element of content.querySelectorAll<HTMLElement>(".verse")) {
    if (element === source || element.dataset.gospel === from) continue;
    const b = tokensFor(element);
    if (b.size === 0) continue;
    let shared = 0;
    for (const word of a) if (b.has(word)) shared += 1;
    const dice = (2 * shared) / (a.size + b.size);
    if (dice >= 0.3) {
      hits.push({ element, gospel: GOSPEL_BY_ID[element.dataset.gospel as GospelId], score: dice });
    }
  }

  hits.sort((left, right) => right.score - left.score);
  return hits.slice(0, 3);
}

function showParallels(source: HTMLElement) {
  if (!isPhone()) return;
  const hits = parallelHits(source);
  const ref = source.dataset.ref ?? "";
  const label = hits.length === 1 ? "1 close parallel" : `${hits.length} close parallels`;

  const rows = hits.length
    ? hits
        .map((hit) => {
          const text = hit.element.querySelector(".vtext")?.textContent?.trim() ?? "";
          const snippet = text.length > 98 ? `${text.slice(0, 98).trimEnd()}…` : text;
          return `<button class="par-hit" type="button" data-par-gospel="${hit.gospel.id}" data-par-ref="${escapeHTML(hit.element.dataset.ref ?? "")}" style="--hue:${hit.gospel.hue}">
            <span class="gdot"></span>
            <span class="par-main">
              <span class="par-ref">${escapeHTML(hit.element.dataset.ref ?? "")}</span>
              <span class="par-snip">${escapeHTML(snippet)}</span>
            </span>
          </button>`;
        })
        .join("")
    : `<p class="par-none">No close wording in the other Gospels for this verse.</p>`;

  parallels.innerHTML = `<div class="par-grab" aria-hidden="true"></div>
    <div class="par-head">
      <div>
        <span class="par-eyebrow">Pinned · ${escapeHTML(ref)}</span>
        <span class="par-sub">${hits.length ? label : "No parallel"}</span>
      </div>
      <button class="icon-btn" type="button" data-par-close aria-label="Close">✕</button>
    </div>
    ${rows}`;
  parallels.classList.remove("hidden");
}

async function hydrate(section: Section) {
  const token = ++loadToken;
  const desires = GOSPELS.filter((g) => prefs.visible[g.id] || prefs.fill).filter(
    (g) => prefs.fill || section.passages[g.id],
  );

  await Promise.all(
    desires
      .filter((gospel) => section.passages[gospel.id])
      .map((gospel) => loadColumn(section, gospel, token)),
  );
}

async function loadColumn(section: Section, gospel: Gospel, token: number) {
  const key = cacheKey(section, gospel);
  const existing = cache.get(key);
  if (existing?.status === "ready") return;

  const reference = versesFor(section, gospel);
  if (!reference) return;

  const body = document.getElementById(`body-${gospel.id}`);
  if (!body) return;

  if (existing?.status === "loading") return;

  cache.set(key, { status: "loading", verses: [] });
  body.innerHTML = `<div class="skeleton" aria-hidden="true">${'<div class="sk-line"></div>'.repeat(6)}</div>`;

  try {
    const verses = await fetchPassage(reference);
    cache.set(key, { status: "ready", verses });

    if (token !== loadToken || current.id !== section.id) return;
    const target = document.getElementById(`body-${gospel.id}`);
    if (!target) return;
    target.innerHTML = versesHTML(verses, gospel);
    const count = document.getElementById(`count-${gospel.id}`);
    if (count) count.textContent = `${verses.length} vv`;
    updateStatus(section);
  } catch (error) {
    const message = error instanceof PassageError ? error.message : "Couldn't load this passage.";
    cache.set(key, { status: "error", verses: [], error: message });

    if (token !== loadToken || current.id !== section.id) return;
    const target = document.getElementById(`body-${gospel.id}`);
    if (!target) return;
    target.innerHTML = errorHTML(gospel, message);
    updateStatus(section);
  }
}

function updateStatus(section: Section) {
  const shown = GOSPELS.filter((g) => prefs.visible[g.id] && section.passages[g.id]);
  let loaded = 0;
  let verses = 0;
  for (const gospel of shown) {
    const state = cache.get(cacheKey(section, gospel));
    if (state?.status === "ready") {
      loaded += 1;
      verses += state.verses.length;
    }
  }
  if (loaded === 0) {
    statusLeft.textContent = `${shown.length} ${shown.length === 1 ? "column" : "columns"} · NET Bible text`;
    return;
  }
  statusLeft.textContent = `${loaded} of ${shown.length} ${shown.length === 1 ? "Gospel" : "Gospels"} loaded · ${verses} verses · click a verse to compare`;
}

// ---- navigation ------------------------------------------------------------

function showSection(id: string, options: { keepScroll?: boolean } = {}) {
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) return;
  if (section.id === current.id) {
    content.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  renderSection(section, !options.keepScroll);
}

function step(delta: number) {
  const index = SECTIONS.findIndex((s) => s.id === current.id);
  const next = SECTIONS[index + delta];
  if (!next) return;
  if (filter) {
    searchInput.value = "";
    filter = "";
    renderOutline();
  }
  showSection(next.id);
}

function toggleGospel(id: GospelId) {
  prefs.visible[id] = !prefs.visible[id];
  savePrefs();
  syncGospelChips();
  renderSection(current, false);
}

function syncGospelChips() {
  for (const chip of gospelToggles.querySelectorAll<HTMLButtonElement>(".gchip")) {
    const id = chip.dataset.gospel as GospelId;
    chip.setAttribute("aria-pressed", String(prefs.visible[id]));
  }
  applyFill();
}

// ---- verse comparison ------------------------------------------------------

function clearHighlights() {
  for (const el of content.querySelectorAll(".verse.source, .verse.match")) {
    el.classList.remove("source", "match");
  }
}

function highlightFrom(source: HTMLElement) {
  clearHighlights();
  source.classList.add("source");
  const sourceGospel = source.dataset.gospel;
  const a = tokensFor(source);
  if (a.size === 0) return;

  for (const element of content.querySelectorAll<HTMLElement>(".verse")) {
    if (element === source || element.dataset.gospel === sourceGospel) continue;
    const b = tokensFor(element);
    if (b.size === 0) continue;
    let shared = 0;
    for (const word of a) if (b.has(word)) shared += 1;
    const dice = (2 * shared) / (a.size + b.size);
    if (dice >= 0.34) element.classList.add("match");
  }
}

function restoreHighlight() {
  if (pinned && pinned.isConnected) highlightFrom(pinned);
  else clearHighlights();
}

// ---- wiring ----------------------------------------------------------------

function buildGospelChips() {
  gospelToggles.innerHTML = GOSPELS.map(
    (g) =>
      `<button class="gchip" type="button" data-gospel="${g.id}" style="--hue:${g.hue}" aria-pressed="${prefs.visible[g.id]}" title="${g.name}"> <span class="gdot"></span>${g.abbr}</button>`,
  ).join("");

  gospelToggles.addEventListener("click", (event) => {
    const chip = (event.target as HTMLElement).closest<HTMLElement>(".gchip");
    if (!chip) return;
    toggleGospel(chip.dataset.gospel as GospelId);
  });
}

outline.addEventListener("click", (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>(".row");
  if (!row) return;
  showSection(row.dataset.section ?? "");
});

outline.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = (event.target as HTMLElement).closest<HTMLElement>(".row");
  if (!row) return;
  event.preventDefault();
  showSection(row.dataset.section ?? "");
});

content.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  const retry = target.closest<HTMLElement>("[data-retry]");
  if (retry) {
    const gospel = GOSPEL_BY_ID[retry.dataset.retry as GospelId];
    if (gospel) {
      const key = cacheKey(current, gospel);
      cache.delete(key);
      const body = document.getElementById(`body-${gospel.id}`);
      if (body) body.innerHTML = `<div class="skeleton" aria-hidden="true">${'<div class="sk-line"></div>'.repeat(6)}</div>`;
      loadToken += 1;
      void loadColumn(current, gospel, loadToken);
    }
    return;
  }

  const jump = target.closest<HTMLElement>("[data-jump]");
  if (jump) {
    const id = jump.dataset.jump ?? "";
    if (isPhone()) {
      scrollToGospel(id);
      const column = columnOf(id);
      if (column) {
        column.animate(
          [{ boxShadow: "0 0 0 0 rgba(230,190,73,0)" }, { boxShadow: "0 0 0 3px rgba(230,190,73,0.38)" }, { boxShadow: "0 0 0 0 rgba(230,190,73,0)" }],
          { duration: 900, easing: "ease-out" },
        );
      }
      return;
    }
    const column = content.querySelector<HTMLElement>(`.column[data-gospel="${id}"]`);
    if (column) {
      content.scrollTo({ left: 0, top: Math.max(0, column.offsetTop - 8), behavior: "smooth" });
      column.animate(
        [{ boxShadow: "0 0 0 0 rgba(230,190,73,0)" }, { boxShadow: "0 0 0 3px rgba(230,190,73,0.38)" }, { boxShadow: "0 0 0 0 rgba(230,190,73,0)" }],
        { duration: 900, easing: "ease-out" },
      );
    }
    return;
  }

  const goto = target.closest<HTMLElement>("[data-goto]");
  if (goto) {
    scrollToGospel(goto.dataset.goto ?? "");
    return;
  }

  if (target.closest("[data-show-all]")) {
    prefs.visible = { matthew: true, mark: true, luke: true, john: true };
    savePrefs();
    syncGospelChips();
    renderSection(current, false);
    return;
  }

  const verse = target.closest<HTMLElement>(".verse");
  if (verse) {
    if (pinned === verse) {
      pinned = null;
      clearHighlights();
      hideParallels();
    } else {
      pinned = verse;
      highlightFrom(verse);
      showParallels(verse);
    }
  }
});

content.addEventListener("pointerover", (event) => {
  if (isPhone()) return;
  const verse = (event.target as HTMLElement).closest<HTMLElement>(".verse");
  if (!verse) return;
  highlightFrom(verse);
});

content.addEventListener("pointerout", (event) => {
  if (isPhone()) return;
  const verse = (event.target as HTMLElement).closest<HTMLElement>(".verse");
  if (!verse) return;
  const next = event.relatedTarget as HTMLElement | null;
  if (next && verse.contains(next)) return;
  restoreHighlight();
});

content.addEventListener("click", (event) => {
  const id = (event.target as HTMLElement).closest<HTMLElement>("#prev-section, #next-section")?.id;
  if (id === "prev-section") step(-1);
  if (id === "next-section") step(1);
});

searchInput.addEventListener("input", () => {
  filter = searchInput.value.trim().toLowerCase();
  renderOutline();
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    filter = "";
    renderOutline();
    searchInput.blur();
    return;
  }
  if (event.key !== "Enter") return;
  const first = SECTIONS.find((s) => matchesFilter(s));
  if (first) {
    searchInput.value = "";
    filter = "";
    renderOutline();
    showSection(first.id);
    searchInput.blur();
  }
});

themeBtn.addEventListener("click", () => {
  prefs.theme = prefs.theme === "auto" ? "dark" : prefs.theme === "dark" ? "light" : "auto";
  savePrefs();
  applyTheme();
});

typeBtn.addEventListener("click", () => {
  prefs.scale = ((prefs.scale + 1) % 3) as 0 | 1 | 2;
  savePrefs();
  applyScale();
});

fillBtn.addEventListener("click", () => {
  prefs.fill = !prefs.fill;
  savePrefs();
  applyFill();
  renderSection(current, false);
});

const openAbout = () => {
  about.classList.remove("hidden");
  aboutClose.focus();
};

const closeAbout = () => {
  about.classList.add("hidden");
  aboutLink.focus();
};

aboutLink.addEventListener("click", openAbout);
attribution.addEventListener("click", openAbout);
aboutClose.addEventListener("click", closeAbout);
about.addEventListener("click", (event) => {
  if (event.target === about) closeAbout();
});

menuBtn.addEventListener("click", () => {
  if (document.body.classList.contains("drawer-open")) closeDrawer();
  else openDrawer();
});

scrim.addEventListener("click", closeDrawer);

// Tap a parallel in the sheet: swipe to that Gospel and pin the verse there.
parallels.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  if (target.closest("[data-par-close]")) {
    hideParallels();
    return;
  }

  const hit = target.closest<HTMLElement>(".par-hit");
  if (!hit) return;

  const gospelId = hit.dataset.parGospel ?? "";
  const ref = hit.dataset.parRef ?? "";
  const element = Array.from(content.querySelectorAll<HTMLElement>(".verse")).find(
    (verse) => verse.dataset.gospel === gospelId && verse.dataset.ref === ref,
  );
  if (!element) return;

  pinned = element;
  highlightFrom(element);
  scrollToGospel(gospelId);
  showParallels(element);
  element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
});

// Leaving the phone layout should never leave the drawer or sheet stranded.
phone.addEventListener("change", () => {
  if (!isPhone()) {
    closeDrawer();
    hideParallels();
  }
});

document.addEventListener("keydown", (event) => {
  const inField = document.activeElement instanceof HTMLInputElement;
  const modalOpen = !about.classList.contains("hidden");
  const meta = event.metaKey || event.ctrlKey;

  if (meta && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }

  if (event.key === "Escape") {
    if (document.body.classList.contains("drawer-open")) {
      closeDrawer();
      return;
    }
    if (modalOpen) {
      closeAbout();
      return;
    }
    if (inField) {
      searchInput.value = "";
      filter = "";
      renderOutline();
      searchInput.blur();
      return;
    }
    if (pinned) {
      pinned = null;
      clearHighlights();
      hideParallels();
      return;
    }
    return;
  }

  if (modalOpen || inField) return;

  if (meta && (event.key === "+" || event.key === "=")) {
    event.preventDefault();
    prefs.scale = Math.min(2, prefs.scale + 1) as 0 | 1 | 2;
    savePrefs();
    applyScale();
    return;
  }

  if (meta && event.key === "-") {
    event.preventDefault();
    prefs.scale = Math.max(0, prefs.scale - 1) as 0 | 1 | 2;
    savePrefs();
    applyScale();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    step(1);
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    step(-1);
    return;
  }

  if (/^[1-4]$/.test(event.key) && !meta && !event.altKey) {
    const gospel = GOSPELS[Number(event.key) - 1];
    if (gospel) toggleGospel(gospel.id);
  }
});

// Keep "auto" honest when the system appearance changes mid-session.
window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
  if (prefs.theme === "auto") applyTheme();
});

// ---- boot ------------------------------------------------------------------

function boot() {
  applyTheme();
  applyScale();
  applyFill();
  buildGospelChips();
  renderOutline();
  renderSection(current, true);

  const versionLine = document.getElementById("version-line");
  if (versionLine) versionLine.textContent = `Version ${VERSION}`;
}

boot();
