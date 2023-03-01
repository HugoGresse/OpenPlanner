# Conference Center

This is currently in development.
This service should allow, when finished, users to:

-   schedule accepted talks from [ConferenceHall](https://conference-hall.io/): pick date & time
-   edit talk details and speakers details
-   manually add new talk or speakers manually
-   a manual sync button to synchronise a speaker or a talk from ConferenceHall
-   something to display the data within a Google Sheet (read only)
-   some APIs to use the service outside

Specs:

-   a database, probably Firestore
-   a way to connect to ConferenceHall Firestore
-   for the API: the idea would be to use statically generated file to serve the API rather than a severless API
-   Login & role management
-   mockups on [figma](https://www.figma.com/proto/3zfbwvOAP5GPVkOjxeiOlF/ConferenceCenter?node-id=1%3A189&scaling=scale-down&page-id=0%3A1&starting-point-node-id=1%3A189)

## Roadmap

- v1: basic conference-hall manual sync plus github hook and schedule edition/creation
- v2: other features listed above

## Dev guidelines

Project use:

-   TypeScript everywhere
-   Google Firestore (native) database
-   React
-   [React Query Firebase](https://react-query-firebase.invertase.dev/): handle all requests to the db, caching, etc
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
