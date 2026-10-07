# Phase 2: Read MongoDB Data using Node.js

Jorge Sanchez | UCID: jrs239 | IT-302 | Section 451 | jrs239@njit.edu

## Phase 1 dataset

GitHub organizations, stored in the real local MongoDB database `it302`,
collection `organizations_jrs239`. Verified collection count: 30 documents.
The name filter is `login`, which is unique across these documents.

Fields: `_id`, `login`, `id`, `node_id`, `url`, `repos_url`, `events_url`,
`hooks_url`, `issues_url`, `members_url`, `public_members_url`, `avatar_url`,
`description`, `image`, `lastUpdated`.

## Start

Run `npm install`, then `npm start` from the `backend` directory.
The local `.env` is configured for MongoDB at `localhost:27017`, database
`it302`, collection `organizations_jrs239`, and HTTP port `5000`.
The startup message appears after MongoDB connects and the DAO initializes.

Do not commit `.env`. The root `.gitignore` excludes `.env`, dependencies,
and logs. `.env.example` is a safe, blank configuration template.

## MVC structure

- `index.js`: configuration, MongoDB connection, DAO initialization, server startup.
- `server.js`: Express, CORS, API routing, error responses.
- `api/organizations.route.js`: GET route.
- `api/organizations.controller.js`: pagination/filter validation and JSON response.
- `dao/organizationsDAO.js`: model/data access using `find()`, `sort()`, `skip()`,
  `limit()`, and `countDocuments()`.

Runtime dependencies: `dotenv`, `mongodb`, `express`, `cors`.
Temporary database tests and their dependency have been removed.

## Query parameters

| Parameter | Default | Meaning |
| --- | --- | --- |
| `itemsPerPage` | 20 | Integer from 1 to 100 |
| `pageNumber` | 0 | Zero-based page index |
| `login` | omitted | Case-insensitive literal substring of the organization's login |

JSON includes `organizations`, `pageNumber`, `itemsPerPage`, `filters`,
and `totalResults`. The count is computed before pagination.

## Required Postman screenshots

Use GET with no body:

```text
http://localhost:5000/api/v1/jrs239/organizations
http://localhost:5000/api/v1/jrs239/organizations?itemsPerPage=5&pageNumber=0
http://localhost:5000/api/v1/jrs239/organizations?itemsPerPage=5&pageNumber=1
http://localhost:5000/api/v1/jrs239/organizations?login=engineyard
```

Capture the complete URL, HTTP 200 status, and JSON response.
The default request returns 20 real documents with `totalResults: 30`.
To display all 30 documents in one response, use this additional verified URL:

```text
http://localhost:5000/api/v1/jrs239/organizations?itemsPerPage=100&pageNumber=0
```

## Verification against the real database

`npm start` successfully connected to `it302.organizations_jrs239`.
All four required requests and the additional all-records request returned
HTTP 200 with `application/json`. Full returned document contents were compared
with direct MongoDB reads and matched.

- First page of five: engineyard, ministrycentered, collectiveidea, ogc, sevenwire.
- Second page of five: entryway, merb, moneyspyder, sproutit, wrenchlabs.
- Name filter: one document, engineyard.

Verification used read operations only; the Phase 1 data was not modified.

## Submission status

Postman screenshots are complete and included in the repository.
GitHub repository: https://github.com/yungjorge/IT302-jrs239-ProjectBackend

The real Phase 1 database was verified using read operations only.
The local `.env` is excluded by the root `.gitignore` and must not be committed.
The final Phase2 tag remains deferred until explicitly requested.
Check the professor's handout for any additional submission requirements.
