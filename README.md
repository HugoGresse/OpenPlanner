# Conference Center

This is currently in development. 
This service should allow, when finished, users to: 
- schedule accepted talks from [ConferenceHall](https://conference-hall.io/): pick date & time
- edit talk details and speakers details
- manually add new talk or speakers manually
- a manual sync button to synchronise a speaker or a talk from ConferenceHall
- something to display the data within a Google Sheet (read only)
- some APIs to use the service outside:
  - list speakers
  - list talks

Specs:
- a database, probably Firestore
- a way to connect to ConferenceHall Firestore 
- for the API: the idea would be to use statically generated file to serve the API rather than a severless API
- Login & role management

