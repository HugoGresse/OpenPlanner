# OpenPlanner — Claude Code guide

OpenPlanner is a React-based application for managing events, sessions, speakers, and sponsors. A Firebase Cloud Functions backend (`functions/`) powers parts of the admin UI and most of the public-facing pages.

## Project overview

-   [src/](src/) — Main source code (React + Vite + TypeScript)
-   [src/events/](src/events/) — Event management functionality
-   [src/components/](src/components/) — Reusable UI components
-   [src/services/](src/services/) — Data access, hooks, Firebase wiring
-   [src/types.ts](src/types.ts) — TypeScript type definitions, shared across the app
-   [functions/](functions/) — Backend API. Used for admin features that need privileged operations and for public-facing flows that cannot run in the browser

## Code organisation

The codebase follows a feature-based organisation pattern.

### Top-level directories under `src/`

-   [src/auth/](src/auth/) — Authentication components
-   [src/components/](src/components/) — Shared UI components
-   [src/context/](src/context/) — React context providers
-   [src/events/](src/events/) — Event management features
-   [src/hooks/](src/hooks/) — Custom React hooks
-   [src/public/](src/public/) — Public-facing components (no auth)
-   [src/services/](src/services/) — Service integrations to retrieve or write data
-   [src/utils/](src/utils/) — Utility functions

### Event structure

Events are a core concept with subdirectories for:

-   [src/events/actions/](src/events/actions/) — Event-related actions (Firestore writes)
-   [src/events/admin/](src/events/admin/) — Admin interfaces. The most important surface of the project
-   [src/events/page/](src/events/page/) — Event page components

### Backend

-   [functions/src/](functions/src/) — Cloud Functions source
-   [functions/src/api/](functions/src/api/) — Fastify-backed API (routes, DAOs, plugins)

## Backend structure

Firebase + Cloud Functions for server-side logic. The API uses **Fastify**, TypeScript, and **TypeBox** for runtime + compile-time schema typing.

### Firebase configuration

-   [firebase.json](firebase.json) — Firebase project configuration
-   [firestore.rules](firestore.rules) — Firestore security rules
-   [firebase.storage.rules](firebase.storage.rules) — Firebase Storage rules

### Cloud Functions

-   [functions/src/](functions/src/) — Source code for Cloud Functions
-   [functions/src/api/dao/](functions/src/api/dao/) — Data Access Objects
-   [functions/src/api/routes/](functions/src/api/routes/) — API route definitions

### Key API routes

-   [functions/src/api/routes/event/](functions/src/api/routes/event/) — Event-related endpoints
-   [functions/src/api/routes/sessions/](functions/src/api/routes/sessions/) — Session-related endpoints
-   [functions/src/api/routes/speakers/](functions/src/api/routes/speakers/) — Speaker-related endpoints
-   [functions/src/api/routes/sponsors/](functions/src/api/routes/sponsors/) — Sponsor-related endpoints
-   [functions/src/api/routes/transcription/](functions/src/api/routes/transcription/) — Transcription-related endpoints

### Type sharing

Common data types live in [src/types.ts](src/types.ts) and are used throughout the application. The backend type file at `functions/src/types.ts` imports a few large interfaces (currently `Event`) from there so the canonical shapes are not duplicated, but most other backend types (e.g. `Track`, `Webhooks`, `Speaker`, `Session`, `Social`, `Category`, `Format`, `TeasingPosts`, `EventFiles`, `SponsorResponse`, `SponsorCategory`, `TeamMember`) are redeclared on the backend side today. When adding a new shared type, prefer importing from the frontend file rather than re-declaring. The API uses Fastify + TypeBox for runtime schema validation on top of these TypeScript types.

## Events and sessions

The application manages events and their sessions, with features for filtering, exporting, and generating content.

### Key components

-   [src/events/page/sessions/list/EventSessions.tsx](src/events/page/sessions/list/EventSessions.tsx) — Main component for displaying and managing event sessions
-   [src/events/page/sessions/list/filterSessions.ts](src/events/page/sessions/list/filterSessions.ts) — Session filtering logic
-   [src/events/page/sessions/list/actions/exportSessionsActions.ts](src/events/page/sessions/list/actions/exportSessionsActions.ts) — Functions for exporting sessions

### Session-related code

-   [src/events/page/sessions/components/](src/events/page/sessions/components/) — Session UI components
-   [src/events/actions/sessions/](src/events/actions/sessions/) — Actions for session management
-   [src/events/page/sessions/list/](src/events/page/sessions/list/) — Session listing and filtering

### Data flow

1. Sessions are fetched using the `useSessions` hook in [src/services/hooks/useSessions.ts](src/services/hooks/useSessions.ts)
2. Filtering is applied based on user selections
3. Displayed sessions can be exported or used to generate content

## UI components

Material UI (MUI) is the component library.

### Component organisation

-   [src/components/](src/components/) — Main components directory
-   [src/components/form/](src/components/form/) — Form-related components
-   [src/components/icons/](src/components/icons/) — Custom icons
-   [src/components/sidepanel/](src/components/sidepanel/) — Sidepanel components

### Feature-specific components

Components are also organised by feature:

-   [src/events/page/faq/components/](src/events/page/faq/components/) — FAQ components
-   [src/events/page/schedule/components/](src/events/page/schedule/components/) — Schedule components
-   [src/events/page/sessions/components/](src/events/page/sessions/components/) — Session components
-   [src/events/page/speakers/components/](src/events/page/speakers/components/) — Speaker components
-   [src/events/page/sponsors/components/](src/events/page/sponsors/components/) — Sponsor components

### Component conventions

-   Components use TypeScript and Material UI
-   Props are defined using TypeScript interfaces
-   Components are generally organised by feature rather than by component type
-   Files / components should be short. Push logic into smaller components or custom hooks rather than letting any single file grow large
