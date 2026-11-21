// Marketing screenshot: serves the built frontend, shims the Tauri bridge with
// real NET Bible text, opens one pericope and captures the window.
//
//   node scripts/shot.mjs /path/to/net.png

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = process.argv[2] || path.join(ROOT, "shot.png");

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
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/__passage") {
        try {
          const verses = await passage(url.searchParams.get("ref"));
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(verses));
        } catch (error) {
          res.writeHead(500);
          res.end(String(error));
        }
        return;
      }
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

const cache = new Map();
async function passage(reference) {
  if (cache.has(reference)) return cache.get(reference);
  const url = `https://labs.bible.org/api/?passage=${encodeURIComponent(reference)}&type=json&formatting=plain`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`bible.org ${res.status} for ${reference}`);
  const raw = await res.json();
  const verses = raw.map((v) => ({
    book: v.bookname,
    chapter: Number(v.chapter),
    verse: Number(v.verse),
    text: v.text.replace(/<[^>]+>/g, ""),
  }));
  cache.set(reference, verses);
  return verses;
}

async function main() {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--force-device-scale-factor=2"],
    defaultViewport: { width: 1380, height: 880, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
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
        if (cmd === "passage") return window.__PASSAGE__(args.reference);
        throw new Error(`unexpected command: ${cmd}`);
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

  await page.click("[data-section='baptism']");
  await page.waitForFunction(
    () => document.querySelector("h1")?.textContent === "The Baptism of Jesus",
  );
  await page.waitForFunction(
    () => document.querySelectorAll(".column .verse").length >= 12,
  );
  await new Promise((r) => setTimeout(r, 500));

  // Pin a Matthean verse to light up the shared wording in the other columns.
  const verses = await page.$$(".column[data-gospel='matthew'] .verse");
  if (verses[3]) await verses[3].click();
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({ path: OUT });
  await browser.close();
  server.close();
  console.log(`wrote ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
