# OpenPlanner CLI

Command-line client for the [OpenPlanner API](https://api.openplanner.fr/), designed to be driven by humans and by coding agents (Claude Code, Codex). Every command prints JSON on stdout and JSON errors on stderr with exit code 1, so it composes with `jq` and with agents.

## Install

```bash
npm install -g @openplanner/cli      # or: npx @openplanner/cli --help
openplanner config set -e <eventId> -k <apiKey>
openplanner sessions list -f id,title
```

From this repository:

```bash
cd cli && npm install && npm run build && npm link
```

Credentials resolve from flags (`--event`, `--api-key`, `--api-url`, `--profile`), then env (`OPENPLANNER_EVENT_ID`, `OPENPLANNER_API_KEY`, `OPENPLANNER_API_URL`, `OPENPLANNER_PROFILE`), then `~/.config/openplanner/config.json` (profiles, one per event).

## Agent skill

The package ships a [SKILL.md](skills/openplanner/SKILL.md) that teaches an agent the commands, the data model and the safety rules:

```bash
openplanner skill install            # ~/.claude/skills/openplanner + ~/.agents/skills/openplanner (Codex)
openplanner skill install --project  # ./.claude/skills + ./.agents/skills of the current repo
openplanner skill print
```

In this repository the skill is already linked from `.claude/skills/openplanner` and `.agents/skills/openplanner` (git symlinks; on Windows enable `git config core.symlinks true` before cloning, or run `openplanner skill install --project`).

## Commands

Run `openplanner --help` or `openplanner <group> --help`. Groups: `event`, `sessions`, `speakers`, `sponsors`, `faq`, `files`, `import`, `live`, `whatsapp`, `bupher`, `slack`, `chat`, `api` (any endpoint), `openapi` (discovery), `config`, `skill`.

Useful flags on every command: `-f a,b.c` keeps only some fields (`list.length`, `list.0` address a list), `-c` prints compact JSON. Errors never print the API key.

## Local development

```bash
npm run dev -- --api-url http://localhost:3010 --event <id> --api-key <key> event get
npm test
```

Point `--api-url` at the API dev server (`cd functions && npm run dev:emulator`) to work against the Firebase emulators.
