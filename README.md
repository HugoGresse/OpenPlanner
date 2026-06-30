# OpenPlanner

An all-in-one platform to plan a conference and run the live show: talks, speakers, sponsors, schedule, and day-of tooling.

### Talks, speakers & schedule

-   schedule accepted talks from [ConferenceHall](https://conference-hall.io/): pick date & time
-   talks and speakers:
    -   manually add talks and speakers
    -   pick specific talks from ConferenceHall afterward
    -   edit talk or speaker, add profil picture, company logo, without editing data from ConferenceHall
-   a schedule calendar to arrange talks and duration
-   additional fields:
    -   categories and formats for sessions
    -   private notes for speaker, email, phone
    -   tracks / rooms
-   speaker self-edit via a magic link, with admin approval

### Sponsors, team & content

-   manage sponsors & categories
-   manage team members
-   FAQ with admin and public or hidden pages
-   AI-assisted content generation for sessions and social posts
-   schedule social media posts
-   public job board: collect and manage job offers from sponsors

### Day-of / live show

-   WhatsApp track management ([GreenAPI](https://green-api.com/)): poll each track "ready?", broadcast the GO, and auto-schedule timing reminders
-   live transcription & on-screen subtitles for talks (powered by [Gladia](https://www.gladia.io/) live v2)
-   intermission / between-talks screen

### Public & integrations

-   public schedule website builtin (and optin)
-   [API](https://api.openplanner.fr/) & webhooks

## Dev guidelines

Project use:

-   TypeScript everywhere
-   Google Firestore (native) database
-   React (frontend) + Material UI
-   Firebase Hosting & functions
-   API: [Fastify](https://fastify.dev/) + [TypeBox](https://github.com/sinclairzx81/typebox) (runtime + compile-time schemas)
-   Integrations: ConferenceHall, [Gladia](https://www.gladia.io/) (live transcription), [GreenAPI](https://green-api.com/) (WhatsApp), Bupher (social posts)

Core concepts:

-   write clear and readable codes without too much abstractions to be read by as many as possible.
-   use any library necessary to speed up devs BUT
-   try to minimize bundle size at all cost: prefer lightweight dependencies rather than big one, prefer tree-shaking js libs
-   have fun!

React guidelines:

-   only named export: `export const MyFunctionOrComponent`
-   form: [react-hook-form](https://react-hook-form.com/) & [yup](https://github.com/jquense/yup) & [react-hook-form-mui](https://github.com/dohomi/react-hook-form-mui)
-   routing: [wouter](https://github.com/molefrog/wouter) which mimics base feature of react-router with 10% of it's size

## Getting started

### Requirements

-   One firebase project for **`open planner`**.
-   Node.js **20+**
-   [Bun.js](https://bun.js.org/) as a build tool

### Installation

1. Create a **`.env`** with **`.env.example`** as a template.
2. Create a web app in your firebase project for **`conference hall`** and **`open planner`**. then copy the config and fill **`.env`** with it.
3. Use [bun.sh](https://bun.sh/) to install dependencies and build the project: `bun install`

Inside OpenPlanner's firebase project:

1. Enable Authentication with email/pwd in console.firebase.google.com
2. In the Authentication parameters, "User actions", disable the "Protection against enumeration of e-mail addresses (recommended)" option
3. Enable Storage, with rules in test or prod (whatever)
4. Set the hosting config for the website using the firebase CLI: `firebase target:apply hosting conferencecenterr dist`
5. Set the hosting config for the API (swagger) `firebase target:apply hosting apiopenplanner api-swagger`

### Development

In order to run the project locally, you need to run the following commands:

```bash
bun install # install dependencies
bun start   # start the dev server
```

Then, some features on the frontend use OpenPlanner API, which can be started with:

1. `cd functions/`
2. `npm i`
3. `npm run build:watch` to start the compiler in watch mode for auto rebuild
4. `npm run serve` to start the API itself which will use Firestore on GCP.

**Enjoy 🚀**

### Scripts

The repo contain few scripts useful for:

-   updating the YouTube metadata (title, desc, thumbnails, etc) of uploaded video: [scripts/youtubeBatchEdit.js](scripts/youtubeBatchEdit.js)

### Deploy

#### Image Processing and CORS Issues

When working with images, especially with image cropping and canvas operations, you might encounter Cross-Origin Resource Sharing (CORS) issues. These occur when trying to process images from different domains. The project includes utilities to handle these issues:

-   For images loaded from different origins, make sure to set the `crossOrigin="anonymous"` attribute on the image elements before setting the `src` attribute.
-   The `loadImageWithCORS` utility in `src/utils/images/loadImageWithCORS.ts` helps load images with proper CORS settings.
-   If you're hosting images on your own server, ensure it returns the appropriate CORS headers, especially:
    ```
    Access-Control-Allow-Origin: *
    ```
    Or more restrictively:
    ```
    Access-Control-Allow-Origin: https://your-domain.com
    ```

For Firebase Storage specifically, you can configure CORS by:

1. Creating a `cors.json` file with:
    ```json
    [
        {
            "origin": ["*"],
            "method": ["GET"],
            "maxAgeSeconds": 3600
        }
    ]
    ```
2. Uploading it with `gsutil`:
    ```bash
    gsutil cors set cors.json gs://your-firebase-bucket
    ```
