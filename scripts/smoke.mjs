// Headless smoke test: serves the built frontend, shims the Tauri bridge with
// generated passage responses, and drives the real UI in Chrome.
//
//   npm run smoke

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      let file = path.join(DIST, decodeURIComponent(url.pathname));
      if (url.pathname === "/" || !path.extname(file)) file = path.join(DIST, "index.html");
      if (!file.startsWith(DIST) || !fs.existsSync(file)) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// A deterministic stand-in for the NET Bible API. Every verse shares enough
// vocabulary that the parallel-word highlighter has something to match.
function passageFixture(reference) {
  const numbers = (reference.match(/\d+/g) || []).map(Number);
  if (numbers.length < 2) throw new Error(`bad reference: ${reference}`);
  const book = reference.replace(/\s+\d.*$/, "");
  const [startChapter, startVerse, endChapter, endVerse] =
    numbers.length >= 4
      ? numbers.slice(0, 4)
      : numbers.length === 3
        ? [numbers[0], numbers[1], numbers[0], numbers[2]]
        : [numbers[0], numbers[1], numbers[0], numbers[1]];
  const verses = [];
  let chapter = startChapter;
  let verse = startVerse;
  let guard = 0;
  while (guard++ < 80) {
    verses.push({
      book,
      chapter,
      verse,
      text: "Jesus taught the crowd about the kingdom of heaven and the will of the Father, and they marveled at his authority in this place.",
    });
    if (chapter === endChapter && verse === endVerse) break;
    verse += 1;
    if (verse > 176) {
      verse = 1;
      chapter += 1;
    }
  }
  return verses;
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.evaluateOnNewDocument(() => {
    const callbacks = new Map();
    let nextId = 1;
    window.__TAURI_INTERNALS__ = {
      transformCallback: (cb) => {
        const id = nextId++;
        callbacks.set(id, cb);
        return id;
      },
      unregisterCallback: (id) => callbacks.delete(id),
      convertFileSrc: (p) => p,
      invoke: async (cmd, args = {}) => {
        if (cmd === "passage") {
          return window.__PASSAGE__(args.reference);
        }
        throw new Error(`unexpected command: ${cmd}`);
      },
    };
    window.__PASSAGE__ = (reference) => {
      const numbers = (reference.match(/\d+/g) || []).map(Number);
      if (numbers.length < 2) throw new Error(`bad reference: ${reference}`);
      const book = reference.replace(/\s+\d.*$/, "");
      const [sc, sv, ec, ev] =
        numbers.length >= 4
          ? numbers.slice(0, 4)
          : numbers.length === 3
            ? [numbers[0], numbers[1], numbers[0], numbers[2]]
            : [numbers[0], numbers[1], numbers[0], numbers[1]];
      const verses = [];
      let chapter = sc;
      let verse = sv;
      let guard = 0;
      while (guard++ < 80) {
        verses.push({
          book,
          chapter,
          verse,
          text: "Jesus taught the crowd about the kingdom of heaven and the will of the Father, and they marveled at his authority in this place.",
        });
        if (chapter === ec && verse === ev) break;
        verse += 1;
        if (verse > 176) {
          verse = 1;
          chapter += 1;
        }
      }
      return verses;
    };
  });

  // Keep the fixture helper honest.
  const sample = passageFixture("Matthew 5:3-12");
  if (sample.length !== 10) throw new Error(`fixture produced ${sample.length} verses`);

  const checks = [];
  const check = (name, condition, detail = "") => {
    checks.push({ name, ok: Boolean(condition), detail });
  };

  await page.goto(base, { waitUntil: "networkidle0" });
  await page.waitForSelector(".column[data-gospel='matthew'] .verse");

  const rowCount = await page.$$eval("#outline .row", (rows) => rows.length);
  check("outline lists all 253 pericopes", rowCount === 253, `got ${rowCount}`);

  const title = await page.$eval("h1", (el) => el.textContent.trim());
  check("opens at the Prologue", title === "Prologue", title);

  const columns = await page.$$eval(".column", (els) => els.map((el) => el.dataset.gospel));
  check("Prologue shows four columns", columns.length === 4 && columns.join(",") === "matthew,mark,luke,john", columns.join(","));

  const refs = await page.$$eval(".col-ref", (els) => els.map((el) => el.textContent.trim()));
  check("column headers carry references", refs[0] === "1:1" && refs[3] === "1:1-18", refs.join(" | "));

  const verseCounts = await page.$$eval(".col-body", (els) => els.map((el) => el.querySelectorAll(".verse").length));
  check("every column loads verses", verseCounts.every((n) => n > 0), verseCounts.join(","));

  // Hover comparison
  await page.click(".column[data-gospel='matthew'] .verse");
  const source = await page.$$eval(".verse.source", (els) => els.length);
  const matches = await page.$$eval(".column[data-gospel='mark'] .verse.match", (els) => els.length);
  check("clicking a verse pins it and finds parallels", source === 1 && matches > 0, `source=${source} matches=${matches}`);
  await page.keyboard.press("Escape");

  // Only-present columns, then fill all four
  await page.click("[data-section='john-promised']");
  await page.waitForFunction(() => document.querySelector("h1")?.textContent === "The Promise of John the Baptist");
  const single = await page.$$eval(".column", (els) => els.length);
  check("a solitary account renders one column", single === 1, `got ${single}`);

  await page.click("#fill-btn");
  const filled = await page.$$eval(".column", (els) => els.length);
  const silent = await page.$$eval(".column.empty .col-silent", (els) => els.length);
  check("fill-all shows silent columns", filled === 4 && silent === 3, `columns=${filled} silent=${silent}`);
  await page.click("#fill-btn");

  // Gospel toggle
  await page.click("[data-section='prologue']");
  await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Prologue");
  await page.click(".gchip[data-gospel='john']");
  const afterToggle = await page.$$eval(".column", (els) => els.length);
  check("gospel chip removes a column", afterToggle === 3, `got ${afterToggle}`);
  await page.click(".gchip[data-gospel='john']");

  // Search + Enter
  await page.click("#search");
  await page.type("#search", "beatitudes");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("h1")?.textContent === "The Beatitudes");
  const searchColumns = await page.$$eval(".column", (els) => els.length);
  check("search opens the matching pericope", searchColumns === 2, `columns=${searchColumns}`);

  // Arrow navigation
  await page.click("#content", { offset: { x: 30, y: 10 } });
  const before = await page.$eval("h1", (el) => el.textContent);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction((old) => document.querySelector("h1")?.textContent !== old, {}, before);
  const after = await page.$eval("h1", (el) => el.textContent);
  check("arrow keys step through pericopes", before === "The Beatitudes" && after !== before, `${before} -> ${after}`);

  // Text size and theme
  const scaleBefore = await page.evaluate(() => document.documentElement.dataset.scale);
  await page.click("#type-btn");
  const scaleAfter = await page.evaluate(() => document.documentElement.dataset.scale);
  check("text size cycles", scaleBefore !== scaleAfter, `${scaleBefore} -> ${scaleAfter}`);

  const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click("#theme-btn");
  const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme);
  check("theme toggles", themeBefore !== themeAfter, `${themeBefore} -> ${themeAfter}`);

  // Reference chip targets its column without error
  await page.click(".ref-chip");
  const chipColumn = await page.$$eval(".column", (els) => els.length);
  check("reference chip leaves the section intact", chipColumn > 0, `columns=${chipColumn}`);

  // About dialog
  await page.click("#about-link");
  const aboutOpen = await page.$eval("#about", (el) => !el.classList.contains("hidden"));
  await page.click("#about-close");
  const aboutClosed = await page.$eval("#about", (el) => el.classList.contains("hidden"));
  check("about dialog opens and closes", aboutOpen && aboutClosed);

  // Persistence
  const sectionId = await page.$$eval(".row.active", (rows) => rows[0]?.dataset.section);
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".verse");
  const restored = await page.$$eval(".row.active", (rows) => rows[0]?.dataset.section);
  check("active section survives a reload", sectionId === restored, `${sectionId} -> ${restored}`);

  check("no console errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  server.close();

  let failed = 0;
  for (const c of checks) {
    console.log(`${c.ok ? "  ok" : "FAIL"}  ${c.name}${c.ok || !c.detail ? "" : `  (${c.detail})`}`);
    if (!c.ok) failed += 1;
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
