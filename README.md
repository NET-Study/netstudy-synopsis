# NET Study Synopsis

The four Gospels side by side. Not a harmony that melts the accounts into one
narrative, but a synopsis: one pericope at a time, each Evangelist in his own
column, in his own order.

A Tauri 2 app with releases for macOS and Windows, built to sit beside NET Study and NET Study Sermons.

## What it does

- **253 pericopes in eight parts**, from the Prologue to the Ascension, following
  the standard synopsis sequence (after Aland's *Synopsis Quattuor Evangeliorum*).
- **Four parallel columns**, one per Gospel, with the reference, verse count and
  full passage. Gospels that do not tell a pericope are omitted, or shown as
  silent columns with *Fill all four*.
- **Parallel wording highlight.** Hover any verse to light up its verbal echoes
  in the other Gospels; click to pin the comparison. Matching is by shared
  vocabulary (Dice coefficient over content words), not by a critical edition's
  alignment, so it is a reading aid rather than a claim about sources.
- **Search** over event titles, Gospel names and references (`⌘K`).
- **Keyboard navigation**: `←`/`→` step through pericopes, `1`–`4` toggle a
  Gospel, `⌘+`/`⌘−` change text size.
- **Notes** where the Gospels order or locate an event differently (the temple
  cleansing, the centurion, the anointings, Peter's denials, and so on).
- Dark and light themes, text sizes, and the active pericope persisted locally.
- Passages are cached on disk after first fetch, so rereading works offline.

## Text

Scripture quotations are from the NET Bible®, copyright ©1996–2017 by Biblical
Studies Press, L.L.C., [netbible.com](https://netbible.com). All rights reserved.
Quoted by permission.

Passage text is fetched through `labs.bible.org/api` by the Rust side and stored
in the app data directory under `passages/`. One request per passage; the cache is
never expired because the text does not change.

## Build

```sh
npm install
npm run smoke          # headless UI checks against a shimmed bridge
npm run tauri build    # .app and .dmg in src-tauri/target/release/bundle
```

The macOS bundle is ad-hoc signed and not notarized, like the other NET Study
apps. A downloaded copy needs right-click → Open, or:

```sh
xattr -dr com.apple.quarantine "/Applications/NET Study Synopsis.app"
```

## Layout

```
src/synopsis.ts     the pericope table: parts, sections, references, notes
src/api.ts          Tauri bridge, passage fetch, verse helpers
src/main.ts         outline, columns, search, comparison highlighting
src/styles.css      plum and gold, serif reading text
src-tauri/src/lib.rs  NET Bible client, entity/tag cleanup, disk cache
scripts/smoke.mjs   Puppeteer smoke test with generated passages
```

## Credits

Outline after Kurt Aland, *Synopsis Quattuor Evangeliorum*, 13th ed. (1985), in
the standard continuous-reference form. NET Bible text used by permission of
Biblical Studies Press. Built with Tauri 2, Vite and TypeScript.
