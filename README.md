# Conference Center

This is currently in development.
This service should allow, when finished, users to:

-   schedule accepted talks from [ConferenceHall](https://conference-hall.io/): pick date & time
-   edit talk details and speakers details
-   manually add new talk or speakers manually
-   a manual sync button to synchronise a speaker or a talk from ConferenceHall
-   something to display the data within a Google Sheet (read only)
-   some APIs to use the service outside:
    -   list speakers
    -   list talks

Specs:

-   a database, probably Firestore
-   a way to connect to ConferenceHall Firestore
-   for the API: the idea would be to use statically generated file to serve the API rather than a severless API
-   Login & role management

## POC

A basic poc a been validated [here](https://github.com/HugoGresse/ConferenceCenter/tree/58419d8a16e1b334a9c8589f90bc517aace8cde2)
It can:

-   login to ConferenceHall and get events using a second Firebase JS project (not the default one)
-   that's all, let's move from the POC to a real project

## Dev guidelines

Project use:

-   TypeScript everywhere
-   Google Firestore (native) database
-   React
-   [React Query Firebase](https://react-query-firebase.invertase.dev/): handle all requests to the db, caching, etc
-   Firebase Hosting & functions

Core concepts:

-   write clear and readable codes without too much abstractions to be read by as many as possible.
-   use any library necessary to speed up devs
-   have fun
