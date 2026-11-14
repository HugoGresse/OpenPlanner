---
name: openplanner
description: Manage an OpenPlanner event (conference sessions, speakers, schedule, tracks, sponsors, job board, FAQ, files, exports, WhatsApp day-of tooling, AI assistant) through the `openplanner` CLI / REST API. Use when the user mentions OpenPlanner, api.openplanner.fr, an event id + API key, or asks to list/edit talks, speakers, sponsors or to publish ("update website") an event.
---

# OpenPlanner CLI

`openplanner` wraps the OpenPlanner REST API (`https://api.openplanner.fr`). Every command prints JSON on stdout; errors are JSON on stderr with exit code 1. Nothing is interactive.

## Setup

Credentials come from flags > env > config file:

```bash
openplanner config set -e <eventId> -k <key>        # stored in ~/.config/openplanner/config.json (mode 600)
export OPENPLANNER_EVENT_ID=… OPENPLANNER_API_KEY=…  # or per shell
openplanner -e <id> -k <key> sessions list           # or per call
```

The event id is in the admin URL (`/events/<eventId>/…`), the key on the event's **Integration & API** page. Several events: `config set -e … -k … -p <name>` then `-p <name>` on each call (or `OPENPLANNER_PROFILE`, or `config use <name>`). Self-hosted or local API: `--api-url http://localhost:3010`.

Check what is configured with `openplanner config show` (key masked). Never print or paste the API key in your answers; error output already masks it.

The same key opens the event's remote MCP server (`<api-url>/v1/<eventId>/mcp`, header `Authorization: Bearer <key>`), which serves the assistant's tools to AI clients that have no shell. In a terminal, prefer this CLI: it covers more.

## Saving tokens

-   `-f id,title,dates.start` keeps only those fields (dotted paths; applied to every item of a list; `sessions.length` gives a count, `sessions.0` the first item). Always use it on `sessions list` / `speakers list` / `event public`.
-   `-c` prints single-line JSON.
-   `openplanner openapi` lists every endpoint in one line each; `openplanner openapi --operation "PATCH /v1/{eventId}/sessions/{sessionId}"` prints the exact request/response schema. Use it before guessing a field name.

## Commands

| Area         | Commands                                                                                                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event        | `event get` (tracks, formats, categories, custom fields, dates, branding), `event update`, `event public` (the published JSON, as of the last deploy), `event usage`, `event files`, `event export-pdf`, `event pdf-metadata`                               |
| Publish      | `event deploy [--no-webhooks]` regenerates the public/private JSON + static website ("Update website")                                                                                                                                                      |
| Sessions     | `sessions list [--track --category --format --language --limit --offset]`, `get`, `update <id>`, `create`, `delete <id> --yes`, `check-media <urls…>`, `shortvid <id> -d @body.json`                                                                        |
| Speakers     | `speakers list [--include-private]`, `get`, `update <id>`, `create`, `delete <id> --yes`, `speakers pending-edits list/approve/reject`                                                                                                                      |
| Bulk         | `import -d @data.json` upserts `{"speakers":[…],"sessions":[…]}` (ConferenceHall-style; every item needs an `id`)                                                                                                                                           |
| Sponsors     | `sponsors list`, `sponsors add`, `sponsors delete <id> --yes`, `sponsors delete-category <id> --yes`, `sponsors generate-token`, `sponsors job-posts list/get/set-status/delete`                                                                            |
| Team         | `team list`, `team add` (name; role, team, bio, photoUrl, socials, order, teamOrder, id), `team update <id>`, `team delete <id> --yes`                                                                                                                      |
| FAQ / files  | `faq add`, `faq get <privateId>` (private categories; public FAQ is in `event public -f faq`), `faq delete-question <categoryId> <questionId> --yes`, `faq delete-category <id> --yes`, `files upload <paths…>` (max 5, 10 MB each), `files reupload <url>` |
| Day-of       | `whatsapp status/start/go/contacts/scheduled-tasks/cancel-task/send-test/configure-webhook`, `live transcription`, `live intermission`                                                                                                                      |
| Integrations | `bupher channels/scheduled-posts/draft-post/login`, `slack channels/config/install-url --return-to <url>`                                                                                                                                                   |
| AI           | `chat "<question>"` runs the event assistant (same agent as the in-app chat and the Slack bot); write proposals come back with an `applyCommand` and are **never applied automatically**                                                                    |
| Escape hatch | `api <METHOD> <path> [-d json] [-q k=v] [-H k:v] [--no-auth]` for any endpoint; `{eventId}` is substituted                                                                                                                                                  |

Bodies: `-d '<json>'`, `-d @file.json`, `-d -` (stdin), and/or one `-s key=value` per field (values are parsed as JSON when they parse, otherwise kept as strings: `-s durationMinutes=45 -s tags='["ai"]' -s dates.start=2026-06-01T09:00:00Z -s note=@handle`). `-s` overrides the matching leaf of `-d`, nested objects are merged. Put options after the positional id: `sessions update <id> -s title=…`.

## Data model essentials

-   Ids are strings. A session references `trackId`, `format` (format id), `category` (category id) and `speakers` (speaker ids). Read the valid ids first: `openplanner event get -f tracks,formats,categories`.
-   `sessions create` / `speakers create` take the same field names as `update` (`speakers`, `format`, `category`, `trackId`, `dates.start`/`dates.end`), reject unknown fields (the 400 names the field) and answer 409 when the given `id` exists; omit `id` to get a UUID. `sessions create` also checks `trackId`/`format`/`category` (the 400 lists the valid ids) and `speakers` (the 400 lists the unknown ids), needs both `dates.start` and `dates.end` or neither, and sets `showInFeedback` to true like the admin. `speakers create` checks nothing else. `import` is the bulk upsert and speaks its own vocabulary: `speakerIds`, `formatId`, `categoryId`, `dateStart`, `dateEnd`, plus `trackName`/`formatName`/`categoryName` (an unknown name is created on the event when an id is given alongside).
-   Dates are ISO 8601 strings; the event `timezone` is in `event get`.
-   `event update` **replaces** array fields (`tracks`, `formats`, `categories`, custom fields): read them with `event get`, edit, send the full list back.
-   `speakers list` hides `email`, `phone`, `note` and private custom fields unless `--include-private`.
-   Team members: `team list` (ids are slugified names, e.g. `ada-lovelace`); `team add` creates them, `team update <id>` patches them (unknown fields rejected, the id never changes), the `team` field groups them. FAQ question ids are in `faq get <privateId>` / `event public -f faq`, sponsor ids in `sponsors list`.
-   Public FAQ, team, sponsors and the full schedule are all in `event public` (as last deployed).

## Workflows

Rename a session and fix its slot:

```bash
openplanner sessions list -f id,title,dates.start,trackId
openplanner sessions update <sessionId> -s title="New title" -s dates.start=2026-06-12T10:00:00+02:00 -s dates.end=2026-06-12T10:45:00+02:00
openplanner sessions get <sessionId> -f title,dates      # verify
```

Add a talk with a new speaker:

```bash
openplanner speakers create -s name="Ada Lovelace" -s company="Analytical Engines" -s bio="…"     # prints the new id
openplanner sessions create -s title="Computing the future" -s speakers='["<speakerId>"]' -s trackId=<trackId> -s format=<formatId> -s durationMinutes=45
```

Publish after edits (the public website / JSON only change on deploy):

```bash
openplanner event deploy
openplanner event public -f sessions.length,speakers.length   # verify
```

Moderate the job board:

```bash
openplanner sponsors job-posts list --status pending -f id,title,sponsorId
openplanner sponsors job-posts set-status <jobPostId> approved
```

Ask the assistant and apply one of its proposals:

```bash
openplanner chat "Which sessions have no speaker?"
openplanner chat "Set the level of every workshop to intermediate" -f proposals.summary,proposals.applyCommand
# review, then run the printed applyCommand(s)
```

## Assistant and gaps

The event assistant (`openplanner chat`, the in-app chat and the Slack bot run the same agent) reads with tools and writes only through proposals: each one carries the exact REST call (`endpoint`, `applyCommand`) that a human applies. Deletes are flagged as irreversible, approving or rejecting a speaker edit emails the speaker, and the deploy proposal publishes the website. What it cannot do is listed below and in its system prompt; for those, use the CLI command of the matrix or the web admin.

<!-- capabilities:start (generated by `npm run capabilities:docs` in functions/, do not edit) -->

### Not available yet

-   Create or delete an event, manage its admins, API key, webhooks and integrations settings (event): no API route; web admin only.
-   Edit a sponsor or a sponsor category (sponsors): no API route; web admin only.
-   List every FAQ category with its questions (faq): no API route; the assistant (`getFaq`) and the web admin.
-   Rename, reorder, share or make private a FAQ category (faq): no API route; web admin only.

### Not available in the assistant

-   Read the published public JSON: The assistant reads live data; the published JSON only changes on deploy. CLI: `openplanner event public`.
-   Storage and network usage: Not in the assistant yet; use the CLI command or the web admin. CLI: `openplanner event usage`.
-   Create or delete an event, manage its admins, API key, webhooks and integrations settings: Only in the web admin, there is no API route for it yet.
-   Storage paths of the exported files: Not in the assistant yet; use the CLI command or the web admin. CLI: `openplanner event files`.
-   Render the schedule as a PDF: Long-running render; use the CLI or the web admin. CLI: `openplanner event export-pdf`.
-   Last generated schedule PDF: Not in the assistant yet; use the CLI command or the web admin. CLI: `openplanner event pdf-metadata`.
-   Check that media URLs are reachable: Not in the assistant yet; use the CLI command or the web admin. CLI: `openplanner sessions check-media`.
-   Generate the session announcement video (shortvid.io): Video generation needs the full render settings; use the CLI or the web admin. CLI: `openplanner sessions shortvid`.
-   Bulk upsert sessions and speakers: Bulk import takes a JSON file; use the CLI. CLI: `openplanner import`.
-   Edit a sponsor or a sponsor category: Only in the web admin, there is no API route for it yet.
-   Generate the job-board token of a sponsor: It creates a secret token; use the CLI or the web admin. CLI: `openplanner sponsors generate-token`.
-   Read one private FAQ category by its private link id: The assistant never sees private FAQ links nor their answers; use the CLI or the web admin. CLI: `openplanner faq get`.
-   Rename, reorder, share or make private a FAQ category: Only in the web admin, there is no API route for it yet.
-   Upload files to the event storage: The assistant cannot receive files; use the CLI or the web admin. CLI: `openplanner files upload`.
-   Re-host a remote image on the event storage: Not in the assistant yet; use the CLI command or the web admin. CLI: `openplanner files reupload`.
-   Transcription screen data; Intermission screen data: Day-of screens are not exposed to the assistant. CLI: `openplanner live transcription|intermission`.
-   whatsapp (8 operations): WhatsApp tooling is CLI / web admin only. CLI: `openplanner whatsapp status|start|go|contacts|scheduled-tasks|cancel-task|send-test|configure-webhook`.
-   Log in to Bupher: Needs a password; Bupher is CLI / web admin only. CLI: `openplanner bupher login`.
-   List Bupher channels; List scheduled Bupher posts; Draft a Bupher social post: Bupher is CLI / web admin only. CLI: `openplanner bupher channels|scheduled-posts|draft-post`.
-   List Slack channels of the installed app; Install the official Slack app; Official Slack app configuration: Slack setup is CLI / web admin only. CLI: `openplanner slack channels|install-url|config`.

Every capability per surface (REST route, CLI command, assistant tool): [capabilities.md](capabilities.md).

<!-- capabilities:end -->

## Rules

1. Read before writing: list or get the document, then send a minimal partial body.
2. Every `delete` / `delete-question` / `delete-category` command is irreversible: confirm with the user first; the `--yes` flag is the confirmation. Deleting a session keeps its speakers; deleting a sponsor or FAQ category deletes everything inside it.
3. After content changes meant for the public site, ask whether to run `event deploy`; it also calls the event webhooks unless `--no-webhooks`.
4. `sessions`/`speakers`/`event` `update`, every `create`, `team add` and `team update` **reject unknown fields** (the 400 names the field), keep an explicit `null` as null (it clears the field) and do not coerce types (`"45"` is not a number). `sessions update` also checks `trackId`/`format`/`category`/`speakers` like `create`. `event update` applies the same rule inside each `tracks` / `formats` / `categories` / custom-field item. `sponsors add` and `faq add` still drop unknown fields silently, and `import` ignores unknown session fields but **stores unknown speaker fields as-is**: check field names before those, re-read the document with `-f` after, and use `openplanner openapi --operation …` when a field seems ignored.
5. Secrets never go on the command line: `bupher login` reads the password from `--password-stdin` or `OPENPLANNER_BUPHER_PASSWORD`; screen passwords can come from `OPENPLANNER_SCREEN_PASSWORD`.
