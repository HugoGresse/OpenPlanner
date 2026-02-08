# OpenPlanner

A website to

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
-   manage sponsors & categories
-   manage team members
-   FAQ with admin and public or hidden pages
-   public schedule website builtin (and optin)
-   [API](https://api.openplanner.fr/) & webhooks

## Dev guidelines

Project use:

-   TypeScript everywhere
-   Google Firestore (native) database
-   React
-   Firebase Hosting & functions

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

-   One Firebase project for **`OpenPlanner`** on the Blaze plan.
-   Node.js **20+**
-   [Bun.js](https://bun.js.org/) as a build tool

### Installation

1. Create a `.env` from `.env.example`. Do the same for the `.env` files in `functions` .
2. In your Firebase project, create a **Web App** named `openplanner` associated with the default hosting to obtain the Firebase config. Copy the generated config and populate `.env`.
3. In your Firebase project, create the following **Web App** (replace `X` with your suffix):
    - API: Hosting site `apiopenplannerX`
    - ConferenceCenter: Hosting site `conferencecenterrX`
    - ServiceApi: Hosting site `serviceapiX`
4. Copy `.firebaserc.example` to `.firebaserc` and set your Firebase project values. Targets are resolved via `firebase target:apply`, no need to hardcode Hosting target name ids in `firebase.json`.
5. Install dependencies with Bun: `bun install`.

Inside OpenPlanner's firebase project:

1. Enable Authentication with email/password (Authentication > Sign-in method > Email/Password > Enable).
2. In Authentication settings, under User actions, disable “Protection against email enumeration (recommended)”.
3. Create Storage (use test or prod rules as needed).
4. Create a Firestore database (default mode).
5. Log in and select the Firebase project in your terminal:

```
firebase login
firebase use openplanner
```

6. Configure hosting targets with the Firebase CLI (replace X with your actual target suffix):

```
firebase target:apply hosting conferencecenterr conferencecenterrX
firebase target:apply hosting apiopenplanner apiopenplannerX
firebase target:apply hosting serviceapi serviceapiX
```

7. Deploy: `firebase deploy`.

8. Copy the URL of the created API function into the .env file.

9. Run frontend app: `npm run start`. Your app is available on `http://localhost:3000/`.

10. To sign in to the app, create a user in Firebase under Authentication > Users.

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
