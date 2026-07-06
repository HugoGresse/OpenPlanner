# YouTube thumbnails generator

Generates one YouTube thumbnail (1280x720 jpg) per session from an OpenPlanner public JSON url.

Each thumbnail contains:

-   the background image (event `backgroundUrl` or config override)
-   a dark gradient for readability
-   the event logo (top left)
-   the event date (top right)
-   the session title (center, auto-wrapped)
-   the speaker avatars as circles (bottom left, initials fallback when no photo) and their names
-   a magic theme: glowing gold frame, corner sparkles and scattered sparkle stars (deterministic per
    session, kept clear of the title). Toggle with `magicBorder` / `sparkles` in the config.

A default magic bokeh background ships in [assets/background-magic.jpg](assets/background-magic.jpg). Drop
your own image there (same file name) to replace it, or point `backgroundUrl` at any url / local path.

## Usage

```bash
cd scripts
npm install

npx tsx youtube-thumbnails/generateThumbnails.ts --json "https://storage.googleapis.com/.../<eventId>.json"
```

The JSON url is the `dataUrl` returned by `https://api.openplanner.fr/v1/<eventId>/event`.

Thumbnails are written to `youtube-thumbnails/output/<eventId>/<sessionId>.jpg`.

### Options

| Flag             | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `--json <url>`   | **Required.** OpenPlanner public JSON url                   |
| `--config <p>`   | Path to a JSON config file (see below)                      |
| `--out <dir>`    | Output directory                                            |
| `--session <id>` | Only generate one session (useful to iterate on the design) |
| `--only-video`   | Only sessions having a `videoLink`                          |
| `--concurrency`  | Parallel renders, default 5                                 |

## Reuse for another year / event

By default everything comes from the event JSON (`logoUrl`, `backgroundUrl`, `dateStart`, `color`,
`colorBackground`). To customize a given year, copy `config.example.json` and pass it with `--config`:

```bash
npx tsx youtube-thumbnails/generateThumbnails.ts --json "<url>" --config youtube-thumbnails/config-2026.json
```

All config fields are optional (`ThumbnailConfig` in [types.ts](types.ts)): `logoUrl` and `backgroundUrl`
accept urls or local file paths, `dateText` replaces the formatted date, `locale` changes the date
formatting, plus `colors` (title/text/accent/background), `overlayOpacity`, `titleFontSize`, and the magic
theme toggles `magicBorder` / `sparkles`. The sparkle/frame colour follows `colors.accent`.
