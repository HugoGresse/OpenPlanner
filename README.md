# OpenPlanner

A website to

-   schedule accepted talks from [ConferenceHall](https://conference-hall.io/): pick date & time
-   talks and speakers:
    -   manually add talks and speakers
    -   pick specific talks from ConferenceHall afterward
    -   edit talk or speaker, add profil picture, company logo, without editing data from ConferenceHall
-   a schedule calendar to arrange talks and duration
-   additionals fields:
    -   categories and formats for sessions
    -   private notes for speaker, email, phone
    -   tracks / rooms
-   manage sponsors & categories
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

-   Tow firebase projects. One for **`conference center`** and the other for **`conference hall`**.
-   Node.js **18+**
-   [Bun.js](https://bun.js.org/) as a build tool

### Installation

1. Create a **`.env`** with **`.env.example`** as a template.
2. Create a web app in your firebase project for **`conference hall`** and **`conference center`**. then copy the config and fill **`.env`** with it.

Inside conference center's firebase project:

1. Create a Cloud firestore database and copy path the rules from `firestore.rules` to the rules tab of your database.
2. Create an authentification provider (email/password) and enable it.

### Development

In order to run the project locally, you need to run the following commands:

```bash
npm ci     # install dependencies
npm start  # start the dev server
```

**Enjoy 🚀**

### Scripts

The repo contain few scripts useful for:

-   updating the YouTube metadata (title, desc, thumbnails, etc) of uploaded video: [scripts/youtubeBatchEdit.js](scripts/youtubeBatchEdit.js)
