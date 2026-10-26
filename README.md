# IT302 Phase 1 MongoDB Assignment

## Phase 3: Create, Update, Delete comments

The MVC backend now supports POST, PUT, and DELETE at
`/api/v1/jrs239/comments`, using the separate `comments_jrs239` collection.
The organization collection and GET routes are preserved.

See [Phase 3 setup, API, testing, Postman screenshot instructions, and Render setup](PHASE3.md).
Import [the Phase 3 Postman collection](postman/Phase3-jrs239.postman_collection.json).
Run `npm test` from `backend` to verify against the real configured MongoDB database.
Deployment and Phase 3 screenshot capture require the manual steps in that guide.

Name: Jorge Sanchez  
UCID: jrs239  
Course: IT-302 Advanced Internet Applications  
Section: 451
Assignment: Phase 1 MongoDB Assignment  
Date: September 21, 2026  
Email: jrs239@njit.edu

## API

API Name: GitHub Organizations API

API Endpoint:
https://api.github.com/organizations?per_page=30

## MongoDB

Database: it302  
Collection: organizations_jrs239  

The collection contains 30 organization records imported from the public REST API.

## Phase 2: Read MongoDB Data using Node.js

The Express backend reads the original `it302.organizations_jrs239` collection.
It uses the MongoDB Node.js driver, dotenv, CORS, and an MVC structure.

See [backend setup and API documentation](backend/README.md).
Postman screenshots are in `IT302_Phase2_Postman_Screenshots/`.
The database export is in `database-export/organizations_jrs239.json`.

Create `backend/.env` locally using `backend/.env.example`. Set the local URI to
`mongodb://localhost:27017`, database to `it302`, collection to
`organizations_jrs239`, and port to `5000`. Never commit `.env`.

From `backend`, run `npm install` and `npm start`.
The endpoint is `http://localhost:5000/api/v1/jrs239/organizations`.
It supports `itemsPerPage`, zero-based `pageNumber`, and the `login` text filter.

The Phase 2 requests were verified against the real database with HTTP 200
and JSON responses. Phase 2 Postman screenshots are complete; the Phase2 tag exists.
