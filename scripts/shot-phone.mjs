// Phone-viewport test for the Synopsis: serves dist/, shims the Tauri bridge
// with live NET Bible text, and drives the mobile layout.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = "/Users/family/.local/share/vellum/assistants/vellum-spry-vole-7twl1m/.vellum/workspace/netstudysynopsis";
const DIST = path.join(ROOT, "dist");
const OUT = "/Users/family/.local/share/vellum/assistants/vellum-spry-vole-7twl1m/.vellum/workspace/scratch";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/__passage") {
        try {
          const verses = await passage(url.searchParams.get("ref"));
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(verses));
        } catch (e) {
          res.writeHead(500); res.end(String(e));
        }
        return;
      }
      let file = path.join(DIST, decodeURIComponent(url.pathname));
      if (url.pathname === "/" || !path.extname(file)) file = path.join(DIST, "index.html");
      if (!file.startsWith(DIST) || !fs.existsSync(file)) { res.writeHead(404); res.end("nope"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const cache = new Map();
async function passage(ref) {
  if (cache.has(ref)) return cache.get(ref);
  const res = await fetch(`https://labs.bible.org/api/?passage=${encodeURIComponent(ref)}&type=json&formatting=plain`);
  if (!res.ok) throw new Error(`bible.org ${res.status}`);
  const raw = await res.json();
  const verses = raw.map((v) => ({
    book: v.bookname, chapter: Number(v.chapter), verse: Number(v.verse),
    text: v.text.replace(/<[^>]+>/g, ""),
  }));
  cache.set(ref, verses);
  return verses;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (name, ok, extra = "") => { checks.push({ name, ok, extra }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` (${extra})` : ""}`); };

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));

await page.evaluateOnNewDocument(() => {
  const callbacks = new Map();
  let nextId = 1;
  window.__TAURI_INTERNALS__ = {
    transformCallback: (cb) => { const id = nextId++; callbacks.set(id, cb); return id; },
    unregisterCallback: (id) => callbacks.delete(id),
    convertFileSrc: (p) => p,
    invoke: async (cmd, args = {}) => {
      if (cmd === "passage") return window.__PASSAGE__(args.reference);
      throw new Error(`unexpected ${cmd}`);
    },
  };
  window.__PASSAGE__ = async (reference) => {
    const res = await fetch(`/__passage?ref=${encodeURIComponent(reference)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };
});

await page.goto(base, { waitUntil: "networkidle0" });
await page.waitForSelector(".verse");

await page.evaluate(() => document.querySelector("[data-section='baptism']").click());
await page.waitForFunction(() => document.querySelector("h1")?.textContent === "The Baptism of Jesus");
await page.waitForFunction(() => document.querySelectorAll(".column .verse").length >= 12);
await wait(600);

check("sidebar hidden off-canvas", await page.evaluate(() => document.querySelector("#sidebar").getBoundingClientRect().right <= 1));
check("gospel tabs rendered", (await page.$$(".mtab")).length === 4, `${(await page.$$(".mtab")).length} tabs`);
const strip = await page.evaluate(() => {
  const s = document.querySelector(".synopsis");
  return { overflowX: getComputedStyle(s).overflowX, width: s.clientWidth, cols: document.querySelectorAll(".column").length, colWidth: document.querySelector(".column").getBoundingClientRect().width };
});
check("synopsis is a swipe strip", strip.overflowX === "auto" && strip.cols === 4, JSON.stringify(strip));
check("one column per screen", Math.abs(strip.colWidth - (strip.width - 28)) < 2, `${strip.colWidth.toFixed(0)} vs ${strip.width - 28}`);

await page.screenshot({ path: path.join(OUT, "syn-phone-1-read.png") });

// drawer
await page.click("#menu-btn");
await wait(350);
check("drawer opens", await page.evaluate(() => document.body.classList.contains("drawer-open")));
check("scrim visible", await page.evaluate(() => !document.querySelector("#scrim").classList.contains("hidden")));
await page.screenshot({ path: path.join(OUT, "syn-phone-2-outline.png") });
await page.mouse.click(372, 400);
await wait(300);
check("scrim closes drawer", await page.evaluate(() => !document.body.classList.contains("drawer-open")));

// swipe to Mark via tab
const tabCount = await page.evaluate(() => document.querySelectorAll(".mtab").length);
console.log("tabs after drawer:", tabCount);
await page.evaluate(() => document.querySelectorAll(".mtab")[1]?.click());
await wait(700);
const tabState = await page.evaluate(() => {
  const st = document.querySelector(".synopsis");
  return { scroll: Math.round(st.scrollLeft), selected: Array.from(document.querySelectorAll(".mtab")).map((t) => t.getAttribute("aria-selected")) };
});
check("tab swipes to Mark", tabState.scroll > 100, JSON.stringify(tabState));
check("active tab follows swipe", tabState.selected.indexOf("true") === 1, tabState.selected.join(","));

// pin a verse -> parallel sheet
await page.evaluate(() => document.querySelectorAll(".column[data-gospel='matthew'] .verse")[3].click());
await wait(700);
const sheet = await page.evaluate(() => {
  const p = document.querySelector("#parallels");
  return { visible: !p.classList.contains("hidden"), hits: p.querySelectorAll(".par-hit").length, title: p.querySelector(".par-eyebrow")?.textContent ?? "" };
});
check("parallel sheet opens", sheet.visible, JSON.stringify(sheet));
await page.screenshot({ path: path.join(OUT, "syn-phone-3-parallels.png") });

if (sheet.hits > 0) {
  await page.evaluate(() => document.querySelector(".par-hit").click());
  await wait(800);
  const jumped = await page.evaluate(() => ({
    scroll: Math.round(document.querySelector(".synopsis").scrollLeft),
    pinned: document.querySelector(".verse.source")?.getAttribute("data-ref") ?? "",
  }));
  check("tapping a parallel jumps Gospels", jumped.scroll > 0, JSON.stringify(jumped));
  await page.screenshot({ path: path.join(OUT, "syn-phone-4-jump.png") });
}

// a two-Gospel section must still show one full column, not half of each
await page.evaluate(() => document.querySelector("[data-section='death-john']").click());
await page.waitForFunction(() => document.querySelector("h1")?.textContent === "The Death of John the Baptist");
await wait(600);
const pair = await page.evaluate(() => {
  const st = document.querySelector(".synopsis");
  const box = st.getBoundingClientRect();
  const cols = Array.from(st.querySelectorAll(".column")).map((c) => {
    const r = c.getBoundingClientRect();
    return { left: Math.round(r.left - box.left), width: Math.round(r.width), visible: Math.round(Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left))) };
  });
  return { justify: getComputedStyle(st).justifyContent, cols };
});
check("two-Gospel section shows one full column", pair.cols.length === 2 && pair.cols[0].visible >= pair.cols[0].width - 2 && pair.cols[1].visible <= 1, JSON.stringify(pair));
await page.screenshot({ path: path.join(OUT, "syn-phone-5-two-gospels.png") });

// About must describe touch, not a mouse and keyboard
await page.evaluate(() => document.querySelector("#about-link").click());
await wait(250);
const aboutPhone = await page.evaluate(() => {
  const about = document.querySelector("#about");
  const phone = about.querySelector(".only-phone");
  const keys = about.querySelector("dl.keys.only-wide");
  return {
    open: !about.classList.contains("hidden"),
    phoneVisible: phone ? getComputedStyle(phone).display !== "none" : false,
    keysHidden: keys ? getComputedStyle(keys).display === "none" : false,
    body: about.innerText ?? "",
  };
});
const aboutText = aboutPhone.body.replace(/\s+/g, " ");
check(
  "About speaks phone, not desktop",
  aboutPhone.open && aboutPhone.phoneVisible && aboutPhone.keysHidden && /Swipe sideways/.test(aboutText) && !/⌘/.test(aboutText),
  JSON.stringify({ open: aboutPhone.open, phoneVisible: aboutPhone.phoneVisible, keysHidden: aboutPhone.keysHidden, cmd: /⌘/.test(aboutText) }),
);
await page.screenshot({ path: path.join(OUT, "syn-phone-6-about.png") });
await page.evaluate(() => document.querySelector("#about-close").click());

// horizontal overflow accidentally created?
const overflow = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > window.innerWidth + 1) {
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") continue;
      if (el.closest(".synopsis") || el.closest(".ref-row") || el.closest(".outline")) continue;
      bad.push(el.className || el.id || el.tagName);
    }
  }
  return bad.slice(0, 6);
});
check("nothing sticks out sideways", overflow.length === 0, overflow.join(" | "));

await browser.close();
server.close();
const failed = checks.filter((c) => !c.ok).length;
console.log(failed ? `${failed} FAILED` : "all checks passed");
process.exit(failed ? 1 : 0);
