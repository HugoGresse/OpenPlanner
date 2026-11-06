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

## Saving tokens

-   `-f id,title,dates.start` keeps only those fields (dotted paths; applied to every item of a list; `sessions.length` gives a count, `sessions.0` the first item). Always use it on `sessions list` / `speakers list` / `event public`.
-   `-c` prints single-line JSON.
-   `openplanner openapi` lists every endpoint in one line each; `openplanner openapi --operation "PATCH /v1/{eventId}/sessions/{sessionId}"` prints the exact request/response schema. Use it before guessing a field name.

## Commands

| Area         | Commands                                                                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event        | `event get` (tracks, formats, categories, custom fields, dates, branding), `event update`, `event public` (the published JSON, as of the last deploy), `event usage`, `event files`, `event export-pdf`, `event pdf-metadata` |
| Publish      | `event deploy [--no-webhooks]` regenerates the public/private JSON + static website ("Update website")                                                                                                                        |
| Sessions     | `sessions list [--track --category --format --language --limit --offset]`, `get`, `update <id>`, `create`, `check-media <urls…>`, `shortvid <id> -d @body.json`                                                               |
| Speakers     | `speakers list [--include-private]`, `get`, `update <id>`, `create`, `delete <id> --yes`, `speakers pending-edits list/approve/reject`                                                                                        |
| Bulk         | `import -d @data.json` upserts `{"speakers":[…],"sessions":[…]}` (ConferenceHall-style; every item needs an `id`)                                                                                                             |
| Sponsors     | `sponsors list`, `sponsors add`, `sponsors generate-token`, `sponsors job-posts list/get/set-status/delete`                                                                                                                   |
| FAQ / files  | `faq add`, `faq get <privateId>` (private categories; public FAQ is in `event public -f faq`), `files upload <paths…>` (max 5, 10 MB each), `files reupload <url>`                                                            |
| Day-of       | `whatsapp status/start/go/contacts/scheduled-tasks/cancel-task/send-test/configure-webhook`, `live transcription`, `live intermission`                                                                                        |
| Integrations | `bupher channels/scheduled-posts/draft-post/login`, `slack channels/config/install-url --return-to <url>`                                                                                                                     |
| AI           | `chat "<question>"` runs the event assistant; write proposals come back with an `applyCommand` and are **never applied automatically**                                                                                        |
| Escape hatch | `api <METHOD> <path> [-d json] [-q k=v] [-H k:v] [--no-auth]` for any endpoint; `{eventId}` is substituted                                                                                                                    |

Bodies: `-d '<json>'`, `-d @file.json`, `-d -` (stdin), and/or one `-s key=value` per field (values are parsed as JSON when they parse, otherwise kept as strings: `-s durationMinutes=45 -s tags='["ai"]' -s dates.start=2026-06-01T09:00:00Z -s note=@handle`). `-s` overrides the matching leaf of `-d`, nested objects are merged. Put options after the positional id: `sessions update <id> -s title=…`.

## Data model essentials

-   Ids are strings. A session references `trackId`, `format` (format id), `category` (category id) and `speakers` (speaker ids). Read the valid ids first: `openplanner event get -f tracks,formats,categories`.
-   `sessions create` accepts those names (and `dates.start`/`dates.end`) and translates them for the bulk endpoint; `import` only speaks the bulk vocabulary: `speakerIds`, `formatId`, `categoryId`, `dateStart`, `dateEnd`. Both accept `trackName`/`formatName`/`categoryName`: an unknown name is created on the event when an id is given alongside. `sessions create` / `speakers create` reject unknown field names; omit `id` to get a UUID, pass an existing id to upsert.
-   Dates are ISO 8601 strings; the event `timezone` is in `event get`.
-   `event update` **replaces** array fields (`tracks`, `formats`, `categories`, custom fields): read them with `event get`, edit, send the full list back.
-   `speakers list` hides `email`, `phone`, `note` and private custom fields unless `--include-private`.
-   Public FAQ, team, sponsors and the full schedule are all in `event public` (as last deployed).

## Workflows

Rename a session and fix its slot:

```bash
openplanner sessions list -f id,title,dates.start,trackId
openplanner sessions update <sessionId> -s title="New title" -s dates.start=2026-06-12T10:00:00+02:00 -s dates.end=2026-06-12T10:45:00+02:00
openplanner sessions get <sessionId> -f title,dates      # verify: unknown fields are dropped silently, not rejected
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

## Rules

1. Read before writing: list or get the document, then send a minimal partial body.
2. Deleting (`speakers delete`, `job-posts delete`) is irreversible: confirm with the user first; the `--yes` flag is the confirmation.
3. After content changes meant for the public site, ask whether to run `event deploy`; it also calls the event webhooks unless `--no-webhooks`.
4. There is no API to delete a session, a sponsor, a team member or a FAQ item; tell the user to use the web admin for those.
5. Most PATCH endpoints **drop unknown fields silently** (200 with nothing changed). After an update, re-read the document with `-f` to confirm, and check `openplanner openapi --operation …` when a field seems ignored.
6. Secrets never go on the command line: `bupher login` reads the password from `--password-stdin` or `OPENPLANNER_BUPHER_PASSWORD`; screen passwords can come from `OPENPLANNER_SCREEN_PASSWORD`.
